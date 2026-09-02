import { z } from 'zod';

export const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/svg+xml',
  'image/gif',
  'application/pdf'
] as const;

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

export const PresignUploadInputSchema = z.object({
  filename: z.string().min(1),
  mimeType: z.enum(ALLOWED_MIME_TYPES, {
    errorMap: () => ({ message: 'Tipe file tidak didukung. Gunakan JPG, PNG, WEBP, SVG, atau GIF.' })
  }),
  sizeBytes: z.number().max(MAX_FILE_SIZE_BYTES, 'Ukuran file melebihi batas maksimal (10MB)')
});
export type PresignUploadInput = z.infer<typeof PresignUploadInputSchema>;

export const CompleteUploadInputSchema = z.object({
  storageKey: z.string().min(1),
  filename: z.string().min(1),
  mimeType: z.string(),
  sizeBytes: z.number(),
  altText: z.string().default('')
});
export type CompleteUploadInput = z.infer<typeof CompleteUploadInputSchema>;

export const MediaAssetSchema = z.object({
  id: z.string().uuid(),
  siteId: z.string().uuid(),
  storageKey: z.string(),
  url: z.string(),
  filename: z.string(),
  mimeType: z.string(),
  sizeBytes: z.number(),
  altText: z.string(),
  variants: z.record(z.any()).optional(),
  usageCount: z.number().default(0),
  createdAt: z.string()
});
export type MediaAsset = z.infer<typeof MediaAssetSchema>;
