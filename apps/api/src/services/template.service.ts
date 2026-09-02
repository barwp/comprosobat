import * as fs from 'node:fs';
import * as path from 'node:path';
import * as crypto from 'node:crypto';
import unzipper from 'unzipper';
import { getDatabaseClient, schema, eq, and } from '@sobatweb/database';
import { AppError } from '../middleware/error.js';
import { config } from '../config.js';
import { validateTemplateFiles, sanitizeHtml, type FileEntry } from '@sobatweb/template-engine';
import { logAuditEvent } from './audit.service.js';

export async function listActiveTemplates() {
  const db = getDatabaseClient();
  const versions = await db
    .select({
      versionId: schema.templateVersions.id,
      templateId: schema.templates.id,
      key: schema.templates.key,
      name: schema.templates.name,
      category: schema.templates.category,
      version: schema.templateVersions.version,
      manifest: schema.templateVersions.manifest,
      isActive: schema.templateVersions.isActive,
      validationStatus: schema.templateVersions.validationStatus
    })
    .from(schema.templateVersions)
    .innerJoin(schema.templates, eq(schema.templates.id, schema.templateVersions.templateId))
    .where(and(
      eq(schema.templates.status, 'ACTIVE'),
      eq(schema.templateVersions.isActive, true)
    ));

  return versions.map((item: any) => ({
    ...item,
    previewUrl: (item.manifest as any)?.preview
      ? `/api/v1/public/template-assets/${item.key}/${item.version}/${(item.manifest as any).preview.replace(/^assets\//, '')}`
      : null
  }));
}

export async function saveTemplatePreviewImage(versionId: string, fileName: string, fileBuffer: Buffer, userId: string) {
  const db = getDatabaseClient();
  const [record] = await db.select({ versionId: schema.templateVersions.id, templateKey: schema.templates.key, version: schema.templateVersions.version, manifest: schema.templateVersions.manifest })
    .from(schema.templateVersions).innerJoin(schema.templates, eq(schema.templates.id, schema.templateVersions.templateId))
    .where(eq(schema.templateVersions.id, versionId)).limit(1);
  if (!record) throw new AppError('Versi template tidak ditemukan.', 'TEMPLATE_NOT_FOUND', 404);
  const ext = path.extname(fileName).toLowerCase();
  const allowed = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
  if (!allowed.includes(ext)) throw new AppError('Gambar harus berformat JPG, PNG, WEBP, atau GIF.', 'INVALID_IMAGE', 400);
  if (fileBuffer.length > 8 * 1024 * 1024) throw new AppError('Ukuran gambar maksimal 8 MB.', 'IMAGE_TOO_LARGE', 400);
  const dir = path.resolve(process.cwd(), config.storageLocalPath, 'templates', record.templateKey, record.version, 'assets');
  fs.mkdirSync(dir, { recursive: true });
  const target = path.join(dir, `preview${ext}`);
  fs.writeFileSync(target, fileBuffer);
  const manifest = { ...(record.manifest as any || {}), preview: `assets/preview${ext}` };
  await db.update(schema.templateVersions).set({ manifest }).where(eq(schema.templateVersions.id, versionId));
  return { previewUrl: `/api/v1/public/template-assets/${record.templateKey}/${record.version}/preview${ext}` };
}

export async function listAllTemplatesForAdmin() {
  const db = getDatabaseClient();
  const allTemplates = await db.select().from(schema.templates);
  const allVersions = await db.select().from(schema.templateVersions);

  return allTemplates.map(tpl => ({
    ...tpl,
    versions: allVersions.filter(v => v.templateId === tpl.id)
  }));
}

export async function getTemplateVersionPreview(versionId: string) {
  const db = getDatabaseClient();
  const [record] = await db.select({
    versionId: schema.templateVersions.id,
    version: schema.templateVersions.version,
    storagePath: schema.templateVersions.storagePath,
    manifest: schema.templateVersions.manifest,
    templateKey: schema.templates.key,
    templateName: schema.templates.name
  })
    .from(schema.templateVersions)
    .innerJoin(schema.templates, eq(schema.templates.id, schema.templateVersions.templateId))
    .where(eq(schema.templateVersions.id, versionId))
    .limit(1);

  if (!record) throw new AppError('Versi template tidak ditemukan.', 'TEMPLATE_NOT_FOUND', 404);

  let repoRoot = process.cwd();
  while (repoRoot !== path.dirname(repoRoot) && !fs.existsSync(path.join(repoRoot, 'pnpm-workspace.yaml'))) {
    repoRoot = path.dirname(repoRoot);
  }
  const storageRoot = path.resolve(process.cwd(), config.storageLocalPath);
  const manifest = record.manifest as { entry?: string } | null;
  const entryPath = normalizeTemplateRelativePath(manifest?.entry || 'index.html');
  const previewPath = path.join(path.dirname(entryPath), '__sobatweb_preview.html');
  const candidates = [
    path.resolve(storageRoot, record.storagePath, previewPath),
    path.resolve(repoRoot, record.storagePath, previewPath),
    path.resolve(storageRoot, record.storagePath, entryPath),
    path.resolve(repoRoot, record.storagePath, entryPath),
    path.resolve(repoRoot, 'templates', record.templateKey, entryPath)
  ];
  const indexFile = candidates.find(candidate => fs.existsSync(candidate));
  if (!indexFile) throw new AppError('File index.html template tidak ditemukan.', 'TEMPLATE_FILE_NOT_FOUND', 404);

  return {
    versionId: record.versionId,
    version: record.version,
    templateKey: record.templateKey,
    templateName: record.templateName,
    html: inlineTemplateAssets(indexFile)
  };
}

function inlineTemplateAssets(indexFile: string) {
  const root = path.dirname(indexFile);
  let html = fs.readFileSync(indexFile, 'utf8');

  html = html.replace(/<link\b([^>]*?)href=["']([^"']+\.css(?:\?[^"']*)?)["']([^>]*)>/gi, (full, _before, ref) => {
    const cssFile = resolveTemplateAsset(root, root, ref);
    if (!cssFile) return full;
    let css = fs.readFileSync(cssFile, 'utf8');
    css = css.replace(/url\(\s*(["']?)([^"')]+)\1\s*\)/gi, (match, _quote, assetRef) => {
      const asset = resolveTemplateAsset(root, path.dirname(cssFile), assetRef);
      return asset ? `url("${toDataUri(asset)}")` : match;
    }).replace(/<\/style/gi, '<\\/style');
    return `<style data-preview-source="${escapeAttribute(ref)}">${css}</style>`;
  });

  html = html.replace(/<script\b([^>]*?)src=["']([^"']+\.js(?:\?[^"']*)?)["']([^>]*)><\/script>/gi, (full, before, ref, after) => {
    const jsFile = resolveTemplateAsset(root, root, ref);
    if (!jsFile) return full;
    let js = fs.readFileSync(jsFile, 'utf8');
    js = replaceBinaryAssetReferences(js, root, path.dirname(jsFile)).replace(/<\/script/gi, '<\\/script');
    const attrs = `${before} ${after}`.replace(/\s*(?:src|crossorigin)(?:=["'][^"']*["'])?/gi, '').trim();
    return `<script ${attrs} data-preview-source="${escapeAttribute(ref)}">${js}</script>`;
  });

  html = html.replace(/\b(src|href)=["']([^"']+)["']/gi, (full, attr, ref) => {
    const asset = resolveTemplateAsset(root, root, ref);
    return asset && isBinaryAsset(asset) ? `${attr}="${toDataUri(asset)}"` : full;
  });
  return html;
}

function replaceBinaryAssetReferences(text: string, root: string, relativeTo: string) {
  return text.replace(/(["'(])((?:\/?assets\/|\.\.?\/)[^"')\s]+)(["')])/g, (full, open, ref, close) => {
    const asset = resolveTemplateAsset(root, relativeTo, ref);
    return asset && isBinaryAsset(asset) ? `${open}${toDataUri(asset)}${close}` : full;
  });
}

function resolveTemplateAsset(root: string, relativeTo: string, reference: string) {
  if (!reference || /^(?:[a-z]+:|#|data:|\/\/)/i.test(reference)) return null;
  const clean = reference.split(/[?#]/)[0].replace(/^\//, '');
  const candidates = [path.resolve(relativeTo, clean), path.resolve(root, clean)];
  const resolved = candidates.find(candidate => candidate.startsWith(root + path.sep) && fs.existsSync(candidate) && fs.statSync(candidate).isFile());
  return resolved || null;
}

function isBinaryAsset(file: string) {
  return !['.html', '.htm', '.css', '.js', '.mjs'].includes(path.extname(file).toLowerCase());
}

function toDataUri(file: string) {
  const mime: Record<string, string> = {
    '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif',
    '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf',
    '.mp4': 'video/mp4', '.webm': 'video/webm'
  };
  return `data:${mime[path.extname(file).toLowerCase()] || 'application/octet-stream'};base64,${fs.readFileSync(file).toString('base64')}`;
}

function escapeAttribute(value: string) {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

export async function processUploadedTemplate(fileName: string, fileBuffer: Buffer, superAdminId: string) {
  const isHtml = fileName.toLowerCase().endsWith('.html') || fileName.toLowerCase().endsWith('.htm');
  const isZip = fileName.toLowerCase().endsWith('.zip');

  if (!isHtml && !isZip) {
    throw new AppError('Hanya file .zip atau .html yang diperbolehkan.', 'UNSUPPORTED_FILE_TYPE', 400);
  }

  const db = getDatabaseClient();
  const fileEntries: FileEntry[] = [];
  const originalHtmlEntries = new Map<string, string>();

  if (isHtml) {
    const rawHtml = fileBuffer.toString('utf-8');
    originalHtmlEntries.set('index.html', rawHtml);
    
    // Extract title from HTML tag or file name
    const titleMatch = rawHtml.match(/<title[^>]*>([^<]+)<\/title>/i);
    const baseName = fileName.replace(/\.html?$/i, '').trim();
    const displayName = titleMatch ? titleMatch[1].trim() : baseName.replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    
    // Generate clean template key
    let templateKey = baseName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    if (!templateKey || templateKey.length < 3) {
      templateKey = `template-${Date.now().toString(36)}`;
    }

    const manifestObj = {
      templateKey,
      name: displayName || 'Template HTML Kustom',
      description: 'Template HTML mandiri diunggah oleh Super Admin',
      version: '1.0.0',
      schemaVersion: '1.0.0',
      author: 'Super Admin',
      supportedModules: [
        'hero_slides',
        'programs',
        'facilities',
        'news',
        'vision_mission',
        'statistics',
        'staff',
        'student_organizations',
        'testimonials',
        'ppdb',
        'contact',
        'navigation'
      ],
      theme: {
        primaryColor: '#087F5B',
        secondaryColor: '#0CA678',
        fontFamily: 'Inter'
      }
    };

    // Auto-sanitize HTML content to strip inline event handlers and unsafe scripts safely
    const cleanHtml = sanitizeHtml(rawHtml);

    fileEntries.push({
      relativePath: 'index.html',
      sizeBytes: Buffer.byteLength(cleanHtml),
      content: cleanHtml
    });

    fileEntries.push({
      relativePath: 'manifest.json',
      sizeBytes: Buffer.byteLength(JSON.stringify(manifestObj, null, 2)),
      content: JSON.stringify(manifestObj, null, 2)
    });
  } else {
    // Extract in-memory with unzipper
    try {
      const directory = await unzipper.Open.buffer(fileBuffer);
      for (const entry of directory.files) {
        if (entry.type === 'File') {
          const content = await entry.buffer();
          let contentStr = content.toString('utf-8');
          const relativePath = entry.path.replace(/\\/g, '/');
          if (relativePath.endsWith('.html') || relativePath.endsWith('.htm')) {
            originalHtmlEntries.set(relativePath, contentStr);
            contentStr = sanitizeHtml(contentStr);
          }
          fileEntries.push({
            relativePath,
            sizeBytes: Buffer.byteLength(contentStr),
            content: contentStr
          });
        }
      }
    } catch (err: any) {
      throw new AppError(`Gagal membaca file ZIP: ${err.message}`, 'INVALID_ZIP_ARCHIVE', 400);
    }
  }

  // Run security scanner and AST validator
  const validation = await validateTemplateFiles(fileEntries);

  if (!validation.isValid || !validation.manifest) {
    return {
      isValid: false,
      errors: validation.errors,
      warnings: validation.warnings
    };
  }

  const manifest = validation.manifest;
  const checksum = crypto.createHash('sha256').update(fileBuffer).digest('hex');

  // Save files to templates storage
  const templateDir = path.resolve(process.cwd(), config.storageLocalPath, 'templates', manifest.templateKey, manifest.version);
  if (!fs.existsSync(templateDir)) {
    fs.mkdirSync(templateDir, { recursive: true });
  }

  for (const f of fileEntries) {
    const filePath = path.join(templateDir, f.relativePath);
    const parent = path.dirname(filePath);
    if (!fs.existsSync(parent)) fs.mkdirSync(parent, { recursive: true });
    fs.writeFileSync(filePath, f.content || '');
  }

  // Keep the original application entry exclusively for the sandboxed Super Admin
  // preview. The public/renderable index remains sanitized and script-free.
  const entryPath = normalizeTemplateRelativePath(manifest.entry || 'index.html');
  const originalEntry = originalHtmlEntries.get(entryPath)
    || [...originalHtmlEntries.entries()].find(([relativePath]) => relativePath.endsWith(`/${entryPath}`))?.[1];
  if (originalEntry) {
    const previewFile = path.resolve(templateDir, path.dirname(entryPath), '__sobatweb_preview.html');
    if (previewFile.startsWith(templateDir + path.sep)) {
      fs.mkdirSync(path.dirname(previewFile), { recursive: true });
      fs.writeFileSync(previewFile, originalEntry, 'utf8');
    }
  }

  // Database upsert
  let [tpl] = await db.select().from(schema.templates).where(eq(schema.templates.key, manifest.templateKey)).limit(1);
  if (!tpl) {
    [tpl] = await db.insert(schema.templates).values({
      key: manifest.templateKey,
      name: manifest.name,
      category: manifest.category || 'Umum',
      status: 'ACTIVE'
    }).returning();
  }

  // If this version already exists, update it, otherwise insert new version
  let [version] = await db.select().from(schema.templateVersions).where(and(
    eq(schema.templateVersions.templateId, tpl.id),
    eq(schema.templateVersions.version, manifest.version)
  )).limit(1);

  if (version) {
    [version] = await db.update(schema.templateVersions).set({
      manifest: manifest as any,
      checksum,
      validationStatus: 'VALID',
      isActive: true
    }).where(eq(schema.templateVersions.id, version.id)).returning();
  } else {
    [version] = await db.insert(schema.templateVersions).values({
      templateId: tpl.id,
      version: manifest.version,
      schemaVersion: manifest.schemaVersion,
      manifest: manifest as any,
      storagePath: `templates/${manifest.templateKey}/${manifest.version}`,
      checksum,
      validationStatus: 'VALID',
      isActive: true
    }).returning();
  }

  await logAuditEvent({
    actorUserId: superAdminId,
    action: 'TEMPLATE_VERSION_UPLOADED',
    targetType: 'template_version',
    targetId: version.id,
    afterData: { templateKey: manifest.templateKey, version: manifest.version, isHtmlDirect: isHtml }
  });

  return {
    isValid: true,
    template: tpl,
    templateVersion: version,
    manifest
  };
}

function normalizeTemplateRelativePath(value: string) {
  const normalized = path.posix.normalize(value.replace(/\\/g, '/')).replace(/^\.\//, '');
  if (!normalized || normalized === '..' || normalized.startsWith('../') || path.posix.isAbsolute(normalized)) {
    throw new AppError('Path entry template tidak aman.', 'UNSAFE_TEMPLATE_PATH', 400);
  }
  return normalized;
}

export async function processUploadedTemplateZip(zipBuffer: Buffer, superAdminId: string) {
  return processUploadedTemplate('template.zip', zipBuffer, superAdminId);
}

export async function toggleTemplateVersionStatus(versionId: string, isActive: boolean, superAdminId: string) {
  const db = getDatabaseClient();
  const [updated] = await db.update(schema.templateVersions)
    .set({ isActive })
    .where(eq(schema.templateVersions.id, versionId))
    .returning();

  if (!updated) {
    throw new AppError('Versi template tidak ditemukan.', 'TEMPLATE_NOT_FOUND', 404);
  }

  await logAuditEvent({
    actorUserId: superAdminId,
    action: isActive ? 'TEMPLATE_VERSION_ACTIVATED' : 'TEMPLATE_VERSION_DEPRECATED',
    targetType: 'template_version',
    targetId: versionId,
    afterData: { isActive }
  });

  return updated;
}
