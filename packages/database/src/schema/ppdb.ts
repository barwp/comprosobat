import { index, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { schoolSites } from './schools.js';

export const ppdbSubmissions = pgTable('ppdb_submissions', {
  id: uuid('id').defaultRandom().primaryKey(),
  siteId: uuid('site_id').references(() => schoolSites.id, { onDelete: 'cascade' }).notNull(),
  studentName: varchar('student_name', { length: 150 }).notNull(),
  nisn: varchar('nisn', { length: 10 }).notNull(),
  whatsapp: varchar('whatsapp', { length: 20 }).notNull(),
  status: varchar('status', { length: 30 }).default('NEW').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
}, (table) => [index('ppdb_submission_site_idx').on(table.siteId)]);
