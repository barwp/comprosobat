import { pgTable, uuid, varchar, text, jsonb, boolean, timestamp, pgEnum, unique } from 'drizzle-orm/pg-core';

export const templateStatusEnum = pgEnum('template_status', ['DRAFT', 'ACTIVE', 'DEPRECATED']);
export const validationStatusEnum = pgEnum('validation_status', ['VALID', 'INVALID', 'PENDING']);

export const templates = pgTable('templates', {
  id: uuid('id').defaultRandom().primaryKey(),
  key: varchar('key', { length: 64 }).notNull().unique(),
  name: varchar('name', { length: 150 }).notNull(),
  category: varchar('category', { length: 64 }).default('Umum').notNull(),
  status: templateStatusEnum('status').default('ACTIVE').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
});

export const templateVersions = pgTable('template_versions', {
  id: uuid('id').defaultRandom().primaryKey(),
  templateId: uuid('template_id').references(() => templates.id, { onDelete: 'cascade' }).notNull(),
  version: varchar('version', { length: 32 }).notNull(),
  schemaVersion: varchar('schema_version', { length: 16 }).default('1.0').notNull(),
  manifest: jsonb('manifest').notNull(),
  storagePath: text('storage_path').notNull(),
  checksum: varchar('checksum', { length: 64 }).notNull(),
  validationStatus: validationStatusEnum('validation_status').default('VALID').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
}, (table) => [
  unique('template_version_unique').on(table.templateId, table.version)
]);
