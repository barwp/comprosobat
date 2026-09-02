import * as fs from 'node:fs';
import * as path from 'node:path';
import { getDatabaseClient, schema, eq, and, isNull } from '@sobatweb/database';
import { AppError } from '../middleware/error.js';
import { config } from '../config.js';
import { logAuditEvent } from './audit.service.js';
import type { PresignUploadInput, CompleteUploadInput } from '@sobatweb/contracts';

export async function listMediaAssets(siteId: string) {
  const db = getDatabaseClient();
  const assets = await db
    .select()
    .from(schema.mediaAssets)
    .where(and(
      eq(schema.mediaAssets.siteId, siteId),
      isNull(schema.mediaAssets.deletedAt)
    ))
    .orderBy(schema.mediaAssets.createdAt);

  return assets.map(a => ({
    ...a,
    url: `/api/v1/public/media/${a.storageKey}`
  }));
}

export async function saveMediaAsset(
  siteId: string,
  userId: string,
  schoolId: string,
  filename: string,
  mimeType: string,
  buffer: Buffer,
  altText = ''
) {
  const db = getDatabaseClient();

  const ext = path.extname(filename).toLowerCase() || '.webp';
  const storageKey = `${siteId}/${Date.now()}_${Math.random().toString(36).substring(2, 8)}${ext}`;
  const localDir = path.resolve(process.cwd(), config.storageLocalPath, 'uploads', siteId);

  if (!fs.existsSync(localDir)) {
    fs.mkdirSync(localDir, { recursive: true });
  }

  const filePath = path.resolve(process.cwd(), config.storageLocalPath, 'uploads', storageKey);
  fs.writeFileSync(filePath, buffer);

  const [asset] = await db.insert(schema.mediaAssets).values({
    siteId,
    storageKey,
    filename: path.basename(filename),
    mimeType,
    sizeBytes: buffer.length,
    altText,
    uploadedBy: userId
  }).returning();

  await logAuditEvent({
    actorUserId: userId,
    schoolId,
    action: 'MEDIA_UPLOADED',
    targetType: 'media_asset',
    targetId: asset.id,
    afterData: { storageKey, filename, sizeBytes: buffer.length }
  });

  return {
    ...asset,
    url: `/api/v1/public/media/${asset.storageKey}`
  };
}

export async function deleteMediaAsset(siteId: string, assetId: string, userId: string, schoolId: string, force = false) {
  const db = getDatabaseClient();

  const [asset] = await db.select().from(schema.mediaAssets).where(and(
    eq(schema.mediaAssets.id, assetId),
    eq(schema.mediaAssets.siteId, siteId),
    isNull(schema.mediaAssets.deletedAt)
  )).limit(1);

  if (!asset) {
    throw new AppError('File media tidak ditemukan.', 'MEDIA_NOT_FOUND', 404);
  }

  // Check usage count in content / settings
  if (asset.usageCount > 0 && !force) {
    throw new AppError(
      `File ini sedang digunakan pada ${asset.usageCount} konten. Hapus atau ganti penggunaannya terlebih dahulu atau gunakan parameter konfirmasi.`,
      'MEDIA_IN_USE',
      409
    );
  }

  await db.update(schema.mediaAssets)
    .set({ deletedAt: new Date() })
    .where(eq(schema.mediaAssets.id, assetId));

  await logAuditEvent({
    actorUserId: userId,
    schoolId,
    action: 'MEDIA_DELETED',
    targetType: 'media_asset',
    targetId: assetId
  });

  return { success: true, message: 'File media berhasil dihapus.' };
}
