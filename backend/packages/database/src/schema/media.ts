import { pgTable, uuid, varchar, text, integer, jsonb, timestamp, index } from 'drizzle-orm/pg-core';
import { schoolSites } from './schools.js';
import { users } from './users.js';

export const mediaAssets = pgTable('media_assets', {
  id: uuid('id').defaultRandom().primaryKey(),
  siteId: uuid('site_id').references(() => schoolSites.id, { onDelete: 'cascade' }).notNull(),
  storageKey: text('storage_key').notNull(),
  filename: varchar('filename', { length: 255 }).notNull(),
  mimeType: varchar('mime_type', { length: 100 }).notNull(),
  sizeBytes: integer('size_bytes').notNull(),
  altText: varchar('alt_text', { length: 255 }).default('').notNull(),
  variants: jsonb('variants'),
  usageCount: integer('usage_count').default(0).notNull(),
  uploadedBy: uuid('uploaded_by').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true })
}, (table) => [
  index('media_asset_site_idx').on(table.siteId),
  index('media_asset_storage_key_idx').on(table.storageKey)
]);
