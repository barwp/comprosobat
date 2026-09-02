import { z } from 'zod';
import { SiteSettingsSchema } from './settings.js';

export const ReleaseStatusEnum = z.enum(['ACTIVE', 'SUPERSEDED', 'ROLLED_BACK']);
export type ReleaseStatus = z.infer<typeof ReleaseStatusEnum>;

export const PublishSnapshotManifestSchema = z.object({
  templateVersionId: z.string().uuid(),
  templateKey: z.string(),
  templateVersion: z.string(),
  settings: SiteSettingsSchema,
  contentEntries: z.array(z.object({
    id: z.string().uuid(),
    type: z.string(),
    entryKey: z.string().nullable().optional(),
    title: z.string(),
    slug: z.string().nullable().optional(),
    payload: z.record(z.any()),
    sortOrder: z.number()
  })),
  menuItems: z.array(z.object({
    id: z.string().uuid(),
    parentId: z.string().uuid().nullable().optional(),
    location: z.string(),
    label: z.string(),
    linkType: z.string(),
    target: z.string(),
    sortOrder: z.number(),
    isActive: z.boolean()
  })),
  mediaAssets: z.array(z.object({
    id: z.string().uuid(),
    storageKey: z.string(),
    filename: z.string(),
    mimeType: z.string(),
    sizeBytes: z.number(),
    altText: z.string(),
    createdAt: z.union([z.string(), z.date()]).optional()
  })).default([]),
  publishedAt: z.string(),
  summary: z.string().optional()
});
export type PublishSnapshotManifest = z.infer<typeof PublishSnapshotManifestSchema>;

export const PublishInputSchema = z.object({
  summary: z.string().max(250).optional()
});
export type PublishInput = z.infer<typeof PublishInputSchema>;

export const RollbackInputSchema = z.object({
  releaseId: z.string().uuid()
});
export type RollbackInput = z.infer<typeof RollbackInputSchema>;
