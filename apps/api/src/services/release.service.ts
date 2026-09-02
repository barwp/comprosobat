import jwt from 'jsonwebtoken';
import { getDatabaseClient, schema, eq, and, desc, inArray, isNull } from '@sobatweb/database';
import { AppError } from '../middleware/error.js';
import { config } from '../config.js';
import { logAuditEvent } from './audit.service.js';
import type { PublishInput, RollbackInput, PublishSnapshotManifest } from '@sobatweb/contracts';

export function generatePreviewToken(siteId: string, schoolId: string): string {
  return jwt.sign(
    { siteId, schoolId, isPreview: true },
    config.jwtSecret,
    { expiresIn: 60 * 60 } // 1 hour token
  );
}

export function verifyPreviewToken(token: string): { siteId: string; schoolId: string } {
  try {
    const decoded = jwt.verify(token, config.jwtSecret) as any;
    if (!decoded.isPreview || !decoded.siteId) {
      throw new Error('Invalid preview payload');
    }
    return { siteId: decoded.siteId, schoolId: decoded.schoolId };
  } catch (e) {
    throw new AppError('Token preview tidak valid atau sudah kedaluwarsa.', 'INVALID_PREVIEW_TOKEN', 401);
  }
}

export async function publishSiteRelease(siteId: string, input: PublishInput, userId: string, schoolId: string) {
  const db = getDatabaseClient();

  const [site] = await db.select().from(schema.schoolSites).where(eq(schema.schoolSites.id, siteId)).limit(1);
  if (!site) {
    throw new AppError('Situs sekolah tidak ditemukan.', 'SITE_NOT_FOUND', 404);
  }

  // Get active template version
  const [templateVer] = await db
    .select({
      id: schema.templateVersions.id,
      version: schema.templateVersions.version,
      manifest: schema.templateVersions.manifest,
      templateKey: schema.templates.key
    })
    .from(schema.templateVersions)
    .innerJoin(schema.templates, eq(schema.templates.id, schema.templateVersions.templateId))
    .where(eq(schema.templateVersions.id, site.templateVersionId))
    .limit(1);

  if (!templateVer) {
    throw new AppError('Template yang dipilih untuk situs tidak valid.', 'INVALID_TEMPLATE', 400);
  }

  // Fetch settings, content entries, and menus for freezing
  const [settingsRow] = await db.select().from(schema.siteSettings).where(eq(schema.siteSettings.siteId, siteId)).limit(1);
  const settings = settingsRow ? settingsRow.settings : {};

  const contentEntries = await db
    .select()
    .from(schema.contentEntries)
    .where(and(
      eq(schema.contentEntries.siteId, siteId),
      inArray(schema.contentEntries.status, ['DRAFT', 'PUBLISHED']),
      isNull(schema.contentEntries.deletedAt)
    ));

  const menuItems = await db
    .select()
    .from(schema.menuItems)
    .where(and(
      eq(schema.menuItems.siteId, siteId),
      eq(schema.menuItems.isActive, true)
    ));

  const mediaAssets = await db
    .select()
    .from(schema.mediaAssets)
    .where(and(
      eq(schema.mediaAssets.siteId, siteId),
      isNull(schema.mediaAssets.deletedAt)
    ));

  // Determine next version number
  const existingReleases = await db
    .select()
    .from(schema.publicationReleases)
    .where(eq(schema.publicationReleases.siteId, siteId))
    .orderBy(desc(schema.publicationReleases.versionNumber));

  const nextVersionNumber = (existingReleases[0]?.versionNumber || 0) + 1;

  const snapshotManifest: PublishSnapshotManifest = {
    templateVersionId: templateVer.id,
    templateKey: templateVer.templateKey,
    templateVersion: templateVer.version,
    settings: settings as any,
    contentEntries: contentEntries as any,
    menuItems: menuItems as any,
    mediaAssets: mediaAssets as any,
    publishedAt: new Date().toISOString(),
    summary: input.summary || `Publikasi Rilis v${nextVersionNumber}`
  };

  // Smoke test render verification: Ensure the generated snapshot actually renders valid HTML
  try {
    const { buildTemplateContextFromSnapshot } = await import('./resolver.service.js');
    const { renderTemplate } = await import('@sobatweb/template-engine');
    const fs = await import('node:fs');
    const path = await import('node:path');

    let repoRoot = process.cwd();
    while (repoRoot !== path.dirname(repoRoot) && !fs.existsSync(path.join(repoRoot, 'pnpm-workspace.yaml'))) {
      repoRoot = path.dirname(repoRoot);
    }
    const templateCandidates = [
      path.resolve(repoRoot, 'templates', templateVer.templateKey, 'index.html'),
      path.resolve(process.cwd(), 'templates', templateVer.templateKey, 'index.html'),
      path.resolve(process.cwd(), config.storageLocalPath, 'templates', templateVer.templateKey, 'index.html')
    ];
    const templatePath = templateCandidates.find(p => fs.existsSync(p));
    if (templatePath) {
      const templateHtml = fs.readFileSync(templatePath, 'utf8');
      const testContext = buildTemplateContextFromSnapshot(snapshotManifest);
      const renderedHtml = renderTemplate(templateHtml, testContext);
      if (!renderedHtml || renderedHtml.trim().length < 100) {
        throw new Error('Hasil render website kosong.');
      }
    }
  } catch (err: any) {
    throw new AppError(
      `Gagal mempublikasikan: Validasi rendering template gagal (${err.message}). Live release sebelumnya dipertahankan.`,
      'PUBLISH_SMOKE_TEST_FAILED',
      422
    );
  }

  // Mark prior releases as SUPERSEDED only after smoke test passes
  if (existingReleases.length > 0) {
    await db.update(schema.publicationReleases)
      .set({ status: 'SUPERSEDED' })
      .where(and(
        eq(schema.publicationReleases.siteId, siteId),
        eq(schema.publicationReleases.status, 'ACTIVE')
      ));
  }

  const [release] = await db.insert(schema.publicationReleases).values({
    siteId,
    templateVersionId: templateVer.id,
    versionNumber: nextVersionNumber,
    status: 'ACTIVE',
    summary: input.summary || `Publikasi Rilis v${nextVersionNumber}`,
    snapshotManifest: snapshotManifest as any,
    createdBy: userId
  }).returning();

  // Atomically update school_sites
  await db.update(schema.schoolSites)
    .set({
      activeReleaseId: release.id,
      status: 'PUBLISHED',
      publishedAt: new Date(),
      updatedAt: new Date()
    })
    .where(eq(schema.schoolSites.id, siteId));

  await logAuditEvent({
    actorUserId: userId,
    schoolId,
    action: 'SITE_PUBLISHED',
    targetType: 'publication_release',
    targetId: release.id,
    afterData: { versionNumber: nextVersionNumber, summary: release.summary }
  });

  return {
    release,
    message: `Website berhasil dipublikasikan (Versi ${nextVersionNumber}).`
  };
}

export async function listReleases(siteId: string) {
  const db = getDatabaseClient();
  const releases = await db
    .select({
      id: schema.publicationReleases.id,
      versionNumber: schema.publicationReleases.versionNumber,
      status: schema.publicationReleases.status,
      summary: schema.publicationReleases.summary,
      publishedAt: schema.publicationReleases.publishedAt,
      templateVersionId: schema.publicationReleases.templateVersionId
    })
    .from(schema.publicationReleases)
    .where(eq(schema.publicationReleases.siteId, siteId))
    .orderBy(desc(schema.publicationReleases.versionNumber));

  return releases;
}

export async function getPublicationStatus(siteId: string) {
  const db = getDatabaseClient();
  const [active] = await db.select({
    id: schema.publicationReleases.id,
    versionNumber: schema.publicationReleases.versionNumber,
    publishedAt: schema.publicationReleases.publishedAt
  }).from(schema.publicationReleases).where(and(
    eq(schema.publicationReleases.siteId, siteId),
    eq(schema.publicationReleases.status, 'ACTIVE')
  )).limit(1);
  const [latestContent] = await db.select({ updatedAt: schema.contentEntries.updatedAt })
    .from(schema.contentEntries).where(eq(schema.contentEntries.siteId, siteId))
    .orderBy(desc(schema.contentEntries.updatedAt)).limit(1);
  const [settings] = await db.select({ updatedAt: schema.siteSettings.updatedAt })
    .from(schema.siteSettings).where(eq(schema.siteSettings.siteId, siteId)).limit(1);
  const latestDraftAt = [latestContent?.updatedAt, settings?.updatedAt].filter(Boolean)
    .sort((a: any, b: any) => b.getTime() - a.getTime())[0] as Date | undefined;
  return {
    hasUnpublishedChanges: !active || Boolean(latestDraftAt && latestDraftAt > active.publishedAt),
    latestDraftAt: latestDraftAt?.toISOString() || null,
    activeRelease: active ? { ...active, publishedAt: active.publishedAt.toISOString() } : null
  };
}

export async function rollbackRelease(siteId: string, input: RollbackInput, userId: string, schoolId: string) {
  const db = getDatabaseClient();

  const [targetRelease] = await db
    .select()
    .from(schema.publicationReleases)
    .where(and(
      eq(schema.publicationReleases.id, input.releaseId),
      eq(schema.publicationReleases.siteId, siteId)
    ))
    .limit(1);

  if (!targetRelease) {
    throw new AppError('Rilis target tidak ditemukan.', 'RELEASE_NOT_FOUND', 404);
  }

  // Update releases statuses
  await db.update(schema.publicationReleases)
    .set({ status: 'SUPERSEDED' })
    .where(and(
      eq(schema.publicationReleases.siteId, siteId),
      eq(schema.publicationReleases.status, 'ACTIVE')
    ));

  await db.update(schema.publicationReleases)
    .set({ status: 'ACTIVE' })
    .where(eq(schema.publicationReleases.id, targetRelease.id));

  // Point site to rolled back release
  await db.update(schema.schoolSites)
    .set({
      activeReleaseId: targetRelease.id,
      templateVersionId: targetRelease.templateVersionId,
      status: 'PUBLISHED',
      publishedAt: new Date(),
      updatedAt: new Date()
    })
    .where(eq(schema.schoolSites.id, siteId));

  await logAuditEvent({
    actorUserId: userId,
    schoolId,
    action: 'SITE_ROLLED_BACK',
    targetType: 'publication_release',
    targetId: targetRelease.id,
    afterData: { rolledBackToVersion: targetRelease.versionNumber }
  });

  return {
    success: true,
    message: `Website berhasil di-rollback ke Rilis v${targetRelease.versionNumber}.`,
    activeReleaseId: targetRelease.id
  };
}
