import { pgTable, uuid, varchar, text, integer, jsonb, timestamp, pgEnum, unique, index } from 'drizzle-orm/pg-core';
import { schoolSites } from './schools.js';
import { templateVersions } from './templates.js';
import { users } from './users.js';

export const releaseStatusEnum = pgEnum('release_status', ['ACTIVE', 'SUPERSEDED', 'ROLLED_BACK']);

export const publicationReleases = pgTable('publication_releases', {
  id: uuid('id').defaultRandom().primaryKey(),
  siteId: uuid('site_id').references(() => schoolSites.id, { onDelete: 'cascade' }).notNull(),
  templateVersionId: uuid('template_version_id').references(() => templateVersions.id).notNull(),
  versionNumber: integer('version_number').notNull(),
  status: releaseStatusEnum('status').default('ACTIVE').notNull(),
  summary: text('summary'),
  snapshotManifest: jsonb('snapshot_manifest').notNull(), // Complete frozen JSON state
  createdBy: uuid('created_by').references(() => users.id),
  publishedAt: timestamp('published_at', { withTimezone: true }).defaultNow().notNull()
}, (table) => [
  unique('site_release_version_unique').on(table.siteId, table.versionNumber),
  index('release_site_idx').on(table.siteId),
  index('release_status_idx').on(table.status)
]);

export const releaseItems = pgTable('release_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  releaseId: uuid('release_id').references(() => publicationReleases.id, { onDelete: 'cascade' }).notNull(),
  itemType: varchar('item_type', { length: 64 }).notNull(),
  sourceId: uuid('source_id'),
  snapshot: jsonb('snapshot').notNull()
}, (table) => [
  index('release_item_release_idx').on(table.releaseId)
]);
