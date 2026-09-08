import { Hono } from 'hono';
import {
  UpdateSiteSettingsSchema,
  ContentEntryInputSchema,
  ContentEntryUpdateSchema,
  parseContentPayload,
  ReorderInputSchema,
  MenuItemInputSchema,
  PublishInputSchema,
  RollbackInputSchema
} from '@sobatweb/contracts';
import { authMiddleware, type AuthUser } from '../middleware/auth.js';
import { requireSiteAccess } from '../middleware/tenant.js';
import * as settingsService from '../services/settings.service.js';
import * as contentService from '../services/content.service.js';
import * as menuService from '../services/menu.service.js';
import * as mediaService from '../services/media.service.js';
import * as releaseService from '../services/release.service.js';
import * as schoolService from '../services/school.service.js';

export const sitesRoutes = new Hono<{
  Variables: {
    user: AuthUser;
    schoolId: string;
    siteId: string;
  };
}>();

// Auth and site access check
sitesRoutes.use('*', authMiddleware);

// --- 0. Active Template & Manifest ---
sitesRoutes.get('/:siteId/template', requireSiteAccess, async (c) => {
  const siteId = c.req.param('siteId')!;
  const templateInfo = await schoolService.getSiteActiveTemplate(siteId);
  return c.json({ success: true, data: templateInfo });
});

// --- 1. Settings ---
sitesRoutes.get('/:siteId/settings', requireSiteAccess, async (c) => {
  const siteId = c.req.param('siteId')!;
  const settings = await settingsService.getSiteSettings(siteId);
  return c.json({ success: true, data: settings });
});

sitesRoutes.patch('/:siteId/settings', requireSiteAccess, async (c) => {
  const siteId = c.req.param('siteId')!;
  const user = c.get('user') as AuthUser;
  const schoolId = c.get('schoolId') as string;
  const body = await c.req.json();
  const input = UpdateSiteSettingsSchema.parse(body);

  const updated = await settingsService.updateSiteSettings(siteId, input, user.id, schoolId);
  return c.json({ success: true, data: updated });
});

// --- 2. CMS Content Entries ---
sitesRoutes.get('/:siteId/content', requireSiteAccess, async (c) => {
  const siteId = c.req.param('siteId')!;
  const type = c.req.query('type');
  const entries = await contentService.listContentEntries(siteId, type);
  return c.json({ success: true, data: entries });
});

sitesRoutes.post('/:siteId/content', requireSiteAccess, async (c) => {
  const siteId = c.req.param('siteId')!;
  const user = c.get('user') as AuthUser;
  const schoolId = c.get('schoolId') as string;
  const body = await c.req.json();
  const input = ContentEntryInputSchema.parse(body);
  input.payload = parseContentPayload(input.type, input.payload);

  const created = await contentService.createOrUpdateContentEntry(siteId, input, user.id, schoolId);
  return c.json({ success: true, data: created });
});

sitesRoutes.get('/:siteId/content/:entryId', requireSiteAccess, async (c) => {
  const siteId = c.req.param('siteId')!;
  const entryId = c.req.param('entryId')!;
  const entry = await contentService.getContentEntryById(siteId, entryId);
  return c.json({ success: true, data: entry });
});

sitesRoutes.patch('/:siteId/content/:entryId', requireSiteAccess, async (c) => {
  const siteId = c.req.param('siteId')!;
  const entryId = c.req.param('entryId')!;
  const user = c.get('user') as AuthUser;
  const schoolId = c.get('schoolId') as string;
  const body = await c.req.json();
  const input = ContentEntryUpdateSchema.parse(body);
  const existing = await contentService.getContentEntryById(siteId, entryId);
  if (input.payload) {
    input.payload = parseContentPayload(existing.type as any, {
      ...(existing.payload as Record<string, unknown>),
      ...input.payload
    });
  }

  const updated = await contentService.updateContentEntry(siteId, entryId, input, user.id, schoolId);
  return c.json({ success: true, data: updated });
});

sitesRoutes.delete('/:siteId/content/:entryId', requireSiteAccess, async (c) => {
  const siteId = c.req.param('siteId')!;
  const entryId = c.req.param('entryId')!;
  const user = c.get('user') as AuthUser;
  const schoolId = c.get('schoolId') as string;

  const result = await contentService.deleteContentEntry(siteId, entryId, user.id, schoolId);
  return c.json({ success: true, data: result });
});

sitesRoutes.patch('/:siteId/content-reorder', requireSiteAccess, async (c) => {
  const siteId = c.req.param('siteId')!;
  const user = c.get('user') as AuthUser;
  const schoolId = c.get('schoolId') as string;
  const body = await c.req.json();
  const input = ReorderInputSchema.parse(body);

  const result = await contentService.reorderContentEntries(siteId, input, user.id, schoolId);
  return c.json({ success: true, data: result });
});

// --- 3. Navigation Menus ---
sitesRoutes.get('/:siteId/menu-items', requireSiteAccess, async (c) => {
  const siteId = c.req.param('siteId')!;
  const result = await menuService.listMenuItems(siteId);
  return c.json({ success: true, data: result });
});

sitesRoutes.post('/:siteId/menu-items', requireSiteAccess, async (c) => {
  const siteId = c.req.param('siteId')!;
  const user = c.get('user') as AuthUser;
  const schoolId = c.get('schoolId') as string;
  const body = await c.req.json();
  const input = MenuItemInputSchema.parse(body);

  const created = await menuService.createMenuItem(siteId, input, user.id, schoolId);
  return c.json({ success: true, data: created });
});

sitesRoutes.patch('/:siteId/menu-items/:itemId', requireSiteAccess, async (c) => {
  const siteId = c.req.param('siteId')!;
  const itemId = c.req.param('itemId')!;
  const user = c.get('user') as AuthUser;
  const schoolId = c.get('schoolId') as string;
  const body = await c.req.json();

  const updated = await menuService.updateMenuItem(siteId, itemId, body, user.id, schoolId);
  return c.json({ success: true, data: updated });
});

sitesRoutes.delete('/:siteId/menu-items/:itemId', requireSiteAccess, async (c) => {
  const siteId = c.req.param('siteId')!;
  const itemId = c.req.param('itemId')!;
  const user = c.get('user') as AuthUser;
  const schoolId = c.get('schoolId') as string;

  const result = await menuService.deleteMenuItem(siteId, itemId, user.id, schoolId);
  return c.json({ success: true, data: result });
});

// --- 4. Media Library ---
sitesRoutes.get('/:siteId/media', requireSiteAccess, async (c) => {
  const siteId = c.req.param('siteId')!;
  const assets = await mediaService.listMediaAssets(siteId);
  return c.json({ success: true, data: assets });
});

sitesRoutes.post('/:siteId/media/upload', requireSiteAccess, async (c) => {
  const siteId = c.req.param('siteId')!;
  const user = c.get('user') as AuthUser;
  const schoolId = c.get('schoolId') as string;

  const body = await c.req.parseBody();
  const file = body['file'];
  const altText = (body['altText'] as string) || '';

  if (!file || typeof file === 'string') {
    return c.json({ success: false, error: { code: 'NO_FILE_UPLOADED', message: 'File wajib diunggah.' } }, 400);
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const result = await mediaService.saveMediaAsset(siteId, user.id, schoolId, file.name, file.type, buffer, altText);
  return c.json({ success: true, data: result });
});

sitesRoutes.delete('/:siteId/media/:assetId', requireSiteAccess, async (c) => {
  const siteId = c.req.param('siteId')!;
  const assetId = c.req.param('assetId')!;
  const user = c.get('user') as AuthUser;
  const schoolId = c.get('schoolId') as string;
  const force = c.req.query('force') === 'true';

  const result = await mediaService.deleteMediaAsset(siteId, assetId, user.id, schoolId, force);
  return c.json({ success: true, data: result });
});

// --- 5. Draft Preview, Publish & Rollback ---
sitesRoutes.post('/:siteId/preview-token', requireSiteAccess, async (c) => {
  const siteId = c.req.param('siteId')!;
  const schoolId = c.get('schoolId') as string;

  const token = releaseService.generatePreviewToken(siteId, schoolId);
  return c.json({ success: true, data: { token, previewUrl: `/preview?token=${token}` } });
});

sitesRoutes.post('/:siteId/publish', requireSiteAccess, async (c) => {
  const siteId = c.req.param('siteId')!;
  const user = c.get('user') as AuthUser;
  const schoolId = c.get('schoolId') as string;
  const body = await c.req.json().catch(() => ({}));
  const input = PublishInputSchema.parse(body);

  const result = await releaseService.publishSiteRelease(siteId, input, user.id, schoolId);
  return c.json({ success: true, data: result });
});

sitesRoutes.get('/:siteId/releases', requireSiteAccess, async (c) => {
  const siteId = c.req.param('siteId')!;
  const releases = await releaseService.listReleases(siteId);
  return c.json({ success: true, data: releases });
});

sitesRoutes.get('/:siteId/publication-status', requireSiteAccess, async (c) => {
  const siteId = c.req.param('siteId')!;
  return c.json({ success: true, data: await releaseService.getPublicationStatus(siteId) });
});

sitesRoutes.post('/:siteId/releases/:releaseId/rollback', requireSiteAccess, async (c) => {
  const siteId = c.req.param('siteId')!;
  const releaseId = c.req.param('releaseId')!;
  const user = c.get('user') as AuthUser;
  const schoolId = c.get('schoolId') as string;

  const result = await releaseService.rollbackRelease(siteId, { releaseId }, user.id, schoolId);
  return c.json({ success: true, data: result });
});
