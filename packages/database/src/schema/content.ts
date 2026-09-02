import { pgTable, uuid, varchar, jsonb, integer, timestamp, pgEnum, unique, index } from 'drizzle-orm/pg-core';
import { schoolSites } from './schools.js';
import { users } from './users.js';

export const contentStatusEnum = pgEnum('content_status', ['DRAFT', 'PUBLISHED', 'SCHEDULED', 'ARCHIVED']);

export const contentEntries = pgTable('content_entries', {
  id: uuid('id').defaultRandom().primaryKey(),
  siteId: uuid('site_id').references(() => schoolSites.id, { onDelete: 'cascade' }).notNull(),
  type: varchar('type', { length: 64 }).notNull(), // e.g. hero_slide, news, facility, etc.
  entryKey: varchar('entry_key', { length: 64 }),   // optional key for singleton items like 'vision_mission'
  title: varchar('title', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }),
  payload: jsonb('payload').notNull(),
  status: contentStatusEnum('status').default('PUBLISHED').notNull(),
  sortOrder: integer('sort_order').default(0).notNull(),
  publishedAt: timestamp('published_at', { withTimezone: true }),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
}, (table) => [
  unique('site_type_slug_unique').on(table.siteId, table.type, table.slug),
  index('content_site_type_idx').on(table.siteId, table.type),
  index('content_site_status_idx').on(table.siteId, table.status),
  index('content_sort_order_idx').on(table.siteId, table.type, table.sortOrder)
]);

export const contentVersions = pgTable('content_versions', {
  id: uuid('id').defaultRandom().primaryKey(),
  entryId: uuid('entry_id').references(() => contentEntries.id, { onDelete: 'cascade' }).notNull(),
  versionNumber: integer('version_number').notNull(),
  snapshot: jsonb('snapshot').notNull(),
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
}, (table) => [
  unique('entry_version_unique').on(table.entryId, table.versionNumber),
  index('content_version_entry_idx').on(table.entryId)
]);
