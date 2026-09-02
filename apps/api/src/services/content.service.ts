import { getDatabaseClient, schema, eq, and, desc, asc, isNull, sql } from '@sobatweb/database';
import { AppError } from '../middleware/error.js';
import { sanitizeRichTextHtml } from '@sobatweb/template-engine';
import { logAuditEvent } from './audit.service.js';
import type { ContentEntryInput, ReorderInput, ContentType } from '@sobatweb/contracts';

export async function listContentEntries(siteId: string, type?: string, includeDeleted = false) {
  const db = getDatabaseClient();

  const conditions = [eq(schema.contentEntries.siteId, siteId)];
  if (type) {
    conditions.push(eq(schema.contentEntries.type, type));
  }
  if (!includeDeleted) {
    conditions.push(isNull(schema.contentEntries.deletedAt));
  }

  const entries = await db
    .select()
    .from(schema.contentEntries)
    .where(and(...conditions))
    .orderBy(asc(schema.contentEntries.sortOrder), desc(schema.contentEntries.createdAt));

  return entries;
}

export async function getContentEntryById(siteId: string, entryId: string) {
  const db = getDatabaseClient();
  const [entry] = await db
    .select()
    .from(schema.contentEntries)
    .where(and(
      eq(schema.contentEntries.id, entryId),
      eq(schema.contentEntries.siteId, siteId),
      isNull(schema.contentEntries.deletedAt)
    ))
    .limit(1);

  if (!entry) {
    throw new AppError('Konten tidak ditemukan.', 'CONTENT_NOT_FOUND', 404);
  }

  return entry;
}

export async function getContentEntryByKey(siteId: string, type: string, entryKey: string) {
  const db = getDatabaseClient();
  const [entry] = await db
    .select()
    .from(schema.contentEntries)
    .where(and(
      eq(schema.contentEntries.siteId, siteId),
      eq(schema.contentEntries.type, type),
      eq(schema.contentEntries.entryKey, entryKey),
      isNull(schema.contentEntries.deletedAt)
    ))
    .limit(1);

  return entry || null;
}

export async function createOrUpdateContentEntry(siteId: string, input: ContentEntryInput, userId: string, schoolId: string) {
  const db = getDatabaseClient();

  // If payload contains rich text HTML, sanitize it
  const sanitizedPayload = { ...input.payload };
  if (sanitizedPayload.contentHtml) {
    sanitizedPayload.contentHtml = sanitizeRichTextHtml(sanitizedPayload.contentHtml);
  }

  // Handle singleton entries (like vision_mission or ppdb if keyed)
  if (input.entryKey) {
    let existing = await getContentEntryByKey(siteId, input.type, input.entryKey);
    // Backwards compatibility: legacy singleton rows were created without entry_key.
    if (!existing && ['vision_mission', 'history_statistic', 'ppdb', 'video_profile'].includes(input.type)) {
      [existing] = await listContentEntries(siteId, input.type);
    }
    if (existing) {
      return updateContentEntry(siteId, existing.id, input, userId, schoolId);
    }
  }

  if (input.type === 'news' && !input.slug) {
    input.slug = slugify(input.title);
  }

  // If new slug provided, ensure unique per (siteId, type, slug)
  if (input.slug) {
    const [existingSlug] = await db
      .select()
      .from(schema.contentEntries)
      .where(and(
        eq(schema.contentEntries.siteId, siteId),
        eq(schema.contentEntries.type, input.type),
        eq(schema.contentEntries.slug, input.slug),
        isNull(schema.contentEntries.deletedAt)
      ))
      .limit(1);

    if (existingSlug) {
      input.slug = await createUniqueSlug(siteId, input.type, input.slug);
    }
  }

  const [entry] = await db.insert(schema.contentEntries).values({
    siteId,
    type: input.type,
    entryKey: input.entryKey || null,
    title: input.title.trim(),
    slug: input.slug || null,
    payload: sanitizedPayload,
    status: input.status || 'DRAFT',
    sortOrder: input.sortOrder || 0,
    publishedAt: input.status === 'PUBLISHED' ? new Date() : null
  }).returning();

  // Save initial version snapshot
  await db.insert(schema.contentVersions).values({
    entryId: entry.id,
    versionNumber: 1,
    snapshot: sanitizedPayload,
    createdBy: userId
  });

  await logAuditEvent({
    actorUserId: userId,
    schoolId,
    action: 'CONTENT_CREATED',
    targetType: `content:${input.type}`,
    targetId: entry.id,
    afterData: entry
  });

  return entry;
}

export async function updateContentEntry(siteId: string, entryId: string, input: Partial<ContentEntryInput>, userId: string, schoolId: string) {
  const db = getDatabaseClient();
  const existing = await getContentEntryById(siteId, entryId);

  const sanitizedPayload = input.payload ? { ...((existing.payload as Record<string, any>) || {}), ...input.payload } : (existing.payload as Record<string, any>);
  if (sanitizedPayload?.contentHtml) {
    sanitizedPayload.contentHtml = sanitizeRichTextHtml(sanitizedPayload.contentHtml);
  }

  let nextSlug = input.slug !== undefined ? input.slug : existing.slug;
  if (existing.type === 'news' && !nextSlug) nextSlug = slugify(input.title || existing.title);
  if (nextSlug && nextSlug !== existing.slug) {
    nextSlug = await createUniqueSlug(siteId, existing.type, nextSlug, entryId);
  }

  const [updated] = await db.update(schema.contentEntries)
    .set({
      title: input.title ? input.title.trim() : existing.title,
      entryKey: input.entryKey !== undefined ? input.entryKey : existing.entryKey,
      slug: nextSlug,
      payload: sanitizedPayload,
      status: input.status || existing.status,
      sortOrder: input.sortOrder !== undefined ? input.sortOrder : existing.sortOrder,
      updatedAt: new Date()
    })
    .where(eq(schema.contentEntries.id, entryId))
    .returning();

  // Record version history
  const versions = await db.select().from(schema.contentVersions).where(eq(schema.contentVersions.entryId, entryId));
  const nextVer = versions.length + 1;

  await db.insert(schema.contentVersions).values({
    entryId,
    versionNumber: nextVer,
    snapshot: sanitizedPayload,
    createdBy: userId
  });

  await logAuditEvent({
    actorUserId: userId,
    schoolId,
    action: 'CONTENT_UPDATED',
    targetType: `content:${existing.type}`,
    targetId: entryId,
    beforeData: existing,
    afterData: updated
  });

  return updated;
}

function slugify(value: string) {
  return value.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 180) || 'berita';
}

async function createUniqueSlug(siteId: string, type: string, desired: string, excludeId?: string) {
  const db = getDatabaseClient();
  const base = slugify(desired);
  let candidate = base;
  let counter = 2;
  while (true) {
    const rows = await db.select({ id: schema.contentEntries.id }).from(schema.contentEntries).where(and(
      eq(schema.contentEntries.siteId, siteId),
      eq(schema.contentEntries.type, type),
      eq(schema.contentEntries.slug, candidate),
      isNull(schema.contentEntries.deletedAt)
    )).limit(1);
    if (!rows[0] || rows[0].id === excludeId) return candidate;
    candidate = `${base}-${counter++}`;
  }
}

export async function deleteContentEntry(siteId: string, entryId: string, userId: string, schoolId: string) {
  const db = getDatabaseClient();
  const existing = await getContentEntryById(siteId, entryId);

  await db.update(schema.contentEntries)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(eq(schema.contentEntries.id, entryId));

  await logAuditEvent({
    actorUserId: userId,
    schoolId,
    action: 'CONTENT_DELETED',
    targetType: `content:${existing.type}`,
    targetId: entryId,
    beforeData: existing
  });

  return { success: true, message: 'Konten berhasil dihapus.' };
}

export async function reorderContentEntries(siteId: string, input: ReorderInput, userId: string, schoolId: string) {
  const db = getDatabaseClient();

  for (const item of input.items) {
    await db.update(schema.contentEntries)
      .set({ sortOrder: item.sortOrder })
      .where(and(
        eq(schema.contentEntries.id, item.id),
        eq(schema.contentEntries.siteId, siteId)
      ));
  }

  await logAuditEvent({
    actorUserId: userId,
    schoolId,
    action: 'CONTENT_REORDERED',
    targetType: 'content_list',
    afterData: input.items
  });

  return { success: true };
}
