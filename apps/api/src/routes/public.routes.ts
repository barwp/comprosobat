import { Hono } from 'hono';
import * as path from 'node:path';
import * as fs from 'node:fs';
import { config } from '../config.js';
import { renderTemplate } from '@sobatweb/template-engine';
import {
  resolvePublicSiteByHostOrSlug,
  resolvePreviewSiteData,
  buildTemplateContextFromSnapshot
} from '../services/resolver.service.js';
import { verifyPreviewToken } from '../services/release.service.js';
import { PPDBSubmissionInputSchema } from '@sobatweb/contracts';
import { getDatabaseClient, schema, eq } from '@sobatweb/database';

export const publicRoutes = new Hono();

// Resolve tenant published data by hostname or slug
publicRoutes.get('/resolve', async (c) => {
  const host = c.req.query('host') || c.req.header('host') || '';
  const slug = c.req.query('slug');
  const identifier = slug || host;

  const resolved = await resolvePublicSiteByHostOrSlug(identifier);
  return c.json({ success: true, data: resolved });
});

publicRoutes.get('/template-assets/:templateKey/:version/:filename', (c) => {
  const filePath = path.resolve(process.cwd(), config.storageLocalPath, 'templates', c.req.param('templateKey'), c.req.param('version'), 'assets', c.req.param('filename'));
  const root = path.resolve(process.cwd(), config.storageLocalPath, 'templates');
  if (!filePath.startsWith(root + path.sep) || !fs.existsSync(filePath)) return c.text('Template image not found', 404);
  const ext = path.extname(filePath).toLowerCase();
  const mime: Record<string, string> = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.gif': 'image/gif' };
  c.header('Content-Type', mime[ext] || 'application/octet-stream');
  c.header('Cache-Control', 'public, max-age=31536000, immutable');
  return c.body(fs.readFileSync(filePath));
});

publicRoutes.get('/news/:slug', async (c) => {
  const siteSlug = c.req.query('site') || 'man5sleman';
  const resolved = await resolvePublicSiteByHostOrSlug(siteSlug);
  const entries = (resolved.release as any)?.contentEntries || [];
  const entry = entries.find((item: any) => item.type === 'news' && !item.deletedAt && item.slug === c.req.param('slug'));
  if (entry) return c.json({ success: true, data: { ...entry.payload, title: entry.payload?.title || entry.title, slug: entry.slug } });
  const legacyNews = ((resolved.release as any)?.modules?.news || []).find((item: any) => legacySlug(item.title || '') === c.req.param('slug'));
  if (!legacyNews) return c.json({ success: false, error: { code: 'NEWS_NOT_FOUND', message: 'Berita tidak ditemukan.' } }, 404);
  return c.json({ success: true, data: { ...legacyNews, slug: c.req.param('slug'), contentHtml: legacyNews.contentHtml || `<p>${legacyNews.summary || ''}</p>` } });
});

function legacySlug(value: string) {
  return value.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 180) || 'berita';
}

publicRoutes.post('/ppdb/:siteId/submissions', async (c) => {
  const siteId = c.req.param('siteId');
  const input = PPDBSubmissionInputSchema.parse(await c.req.json());
  const db = getDatabaseClient();
  const [site] = await db.select({ activeReleaseId: schema.schoolSites.activeReleaseId })
    .from(schema.schoolSites).where(eq(schema.schoolSites.id, siteId)).limit(1);
  if (!site?.activeReleaseId) return c.json({ success: false, error: { code: 'PPDB_UNAVAILABLE', message: 'PPDB belum tersedia.' } }, 409);
  const [release] = await db.select({ snapshot: schema.publicationReleases.snapshotManifest })
    .from(schema.publicationReleases).where(eq(schema.publicationReleases.id, site.activeReleaseId)).limit(1);
  const entries = ((release?.snapshot as any)?.contentEntries || []);
  const ppdb = entries.find((item: any) => item.type === 'ppdb' && !item.deletedAt)?.payload;
  if (!ppdb || ppdb.isActive === false || ppdb.formMode !== 'internal') {
    return c.json({ success: false, error: { code: 'PPDB_UNAVAILABLE', message: 'Formulir PPDB internal sedang tidak aktif.' } }, 409);
  }
  const [submission] = await db.insert(schema.ppdbSubmissions).values({ siteId, ...input }).returning();
  return c.json({ success: true, data: { id: submission.id, message: 'Formulir berhasil dikirim. Panitia akan menghubungi Anda.' } }, 201);
});

// Resolve draft preview data by preview token
publicRoutes.get('/preview', async (c) => {
  const token = c.req.query('token');
  if (!token) {
    return c.json({ success: false, error: { code: 'TOKEN_REQUIRED', message: 'Preview token diperlukan.' } }, 400);
  }

  const { siteId } = verifyPreviewToken(token);
  const resolved = await resolvePreviewSiteData(siteId);
  return c.json({ success: true, data: resolved });
});

// Render complete HTML for SSR or iframe preview
publicRoutes.get('/render', async (c) => {
  const host = c.req.query('host') || c.req.header('host') || '';
  const slug = c.req.query('slug');
  const previewToken = c.req.query('token');

  let templateKey = 'man5-sleman';
  let contextData: any = {};

  try {
    if (previewToken) {
      const { siteId } = verifyPreviewToken(previewToken);
      const resolved = await resolvePreviewSiteData(siteId);
      templateKey = resolved.preview.templateKey;
      contextData = buildTemplateContextFromSnapshot({
        settings: resolved.preview.settings,
        contentEntries: resolved.preview.contentEntries,
        menuItems: resolved.preview.menuItems,
        mediaAssets: resolved.preview.mediaAssets
      });
      contextData.meta = { isPreview: true, previewToken, siteId: resolved.tenant.siteId };
    } else {
      const identifier = slug || host;
      const resolved = await resolvePublicSiteByHostOrSlug(identifier);
      templateKey = (resolved as any).templateKey || (resolved.release as any)?.templateKey || 'man5-sleman';
      contextData = buildTemplateContextFromSnapshot(resolved.release);
      contextData.meta = { isPreview: false, siteId: resolved.tenant.siteId, slug: resolved.tenant.slug };
      contextData.modules.news = (contextData.modules.news || []).map((item: any) => ({
        ...item, url: `/berita/${item.slug}?site=${encodeURIComponent(resolved.tenant.slug)}`
      }));
    }

    // Find monorepo root
    let rootDir = process.cwd();
    while (rootDir && rootDir !== path.dirname(rootDir)) {
      if (fs.existsSync(path.join(rootDir, 'pnpm-workspace.yaml'))) {
        break;
      }
      rootDir = path.dirname(rootDir);
    }

    // Load template HTML file
    let templateHtml = '';
    const possiblePaths = [
      path.resolve(rootDir, 'templates', templateKey, 'index.html'),
      path.resolve(rootDir, 'storage', 'templates', templateKey, '1.0.0', 'index.html'),
      path.resolve(process.cwd(), 'templates', templateKey, 'index.html'),
      path.resolve(process.cwd(), '../../templates', templateKey, 'index.html'),
      path.resolve(process.cwd(), config.storageLocalPath, 'templates', templateKey, '1.0.0', 'index.html')
    ];

    let resolvedPath = possiblePaths.find(p => fs.existsSync(p));
    if (resolvedPath) {
      templateHtml = fs.readFileSync(resolvedPath, 'utf-8');
    } else {
      // Search any template index.html under templates/ directory
      const templatesDir = path.resolve(rootDir, 'templates');
      if (fs.existsSync(templatesDir)) {
        const dirs = fs.readdirSync(templatesDir);
        for (const d of dirs) {
          const candidate = path.join(templatesDir, d, 'index.html');
          if (fs.existsSync(candidate)) {
            templateHtml = fs.readFileSync(candidate, 'utf-8');
            break;
          }
        }
      }
    }

    if (!templateHtml) {
      throw new Error(`Template '${templateKey}' tidak ditemukan di filesystem.`);
    }

    const renderedHtml = renderTemplate(templateHtml, contextData);
    return c.html(renderedHtml);
  } catch (err: any) {
    const requestId = `req_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const errorHtml = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Diagnostik Render Template - SobatWeb</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-950 text-slate-100 min-h-screen flex items-center justify-center p-6">
  <div class="max-w-lg w-full bg-slate-900 border border-rose-900/50 rounded-3xl p-8 shadow-2xl space-y-5">
    <div class="flex items-center gap-3">
      <div class="w-10 h-10 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center text-xl font-bold">⚠️</div>
      <div>
        <h2 class="text-lg font-bold text-white leading-tight">Gagal Merender Halaman</h2>
        <p class="text-xs text-rose-300">Terjadi kesalahan pada saat kompilasi template</p>
      </div>
    </div>
    <div class="bg-slate-950/80 p-4 rounded-2xl border border-slate-800 space-y-2 text-xs">
      <div><span class="text-slate-400">Template Aktif:</span> <strong class="text-emerald-400 font-mono">${templateKey}</strong></div>
      <div><span class="text-slate-400">Request ID:</span> <span class="text-slate-300 font-mono">${requestId}</span></div>
      <div><span class="text-slate-400">Pesan Kesalahan:</span> <p class="text-rose-300 font-mono mt-1">${err.message || 'Unknown render error'}</p></div>
    </div>
    <p class="text-xs text-slate-400 leading-relaxed">
      Silakan periksa kembali kelengkapan data di CMS atau pastikan template yang dipilih memiliki file <code>index.html</code> yang valid.
    </p>
    <div class="pt-2">
      <button onclick="window.location.reload()" class="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-3 rounded-xl transition">
        🔄 Coba Muat Ulang
      </button>
    </div>
  </div>
</body>
</html>`;
    return c.html(errorHtml, 500);
  }
});

// Static media file streaming
publicRoutes.get('/media/:siteId/:filename', (c) => {
  const siteId = c.req.param('siteId');
  const filename = c.req.param('filename');

  const filePath = path.resolve(process.cwd(), config.storageLocalPath, 'uploads', siteId, filename);
  if (!fs.existsSync(filePath)) {
    return c.text('Media not found', 404);
  }

  const ext = path.extname(filename).toLowerCase();
  const mimeTypes: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.gif': 'image/gif',
    '.pdf': 'application/pdf'
  };

  const contentType = mimeTypes[ext] || 'application/octet-stream';
  const fileBuffer = fs.readFileSync(filePath);

  c.header('Content-Type', contentType);
  c.header('Cache-Control', 'public, max-age=31536000, immutable');
  return c.body(fileBuffer);
});
