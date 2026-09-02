import { pgTable, uuid, jsonb, timestamp } from 'drizzle-orm/pg-core';
import { schoolSites } from './schools.js';

export const siteSettings = pgTable('site_settings', {
  id: uuid('id').defaultRandom().primaryKey(),
  siteId: uuid('site_id').references(() => schoolSites.id, { onDelete: 'cascade' }).notNull().unique(),
  settings: jsonb('settings').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
});
