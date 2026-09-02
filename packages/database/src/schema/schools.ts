import { pgTable, uuid, varchar, timestamp, pgEnum, boolean, unique, index } from 'drizzle-orm/pg-core';
import { users } from './users.js';
import { templateVersions } from './templates.js';

export const educationLevelEnum = pgEnum('education_level', ['SD', 'SMP', 'SMA', 'SMK', 'MADRASAH', 'PESANTREN', 'OTHER']);
export const schoolTypeEnum = pgEnum('school_type', ['NEGERI', 'SWASTA']);
export const schoolStatusEnum = pgEnum('school_status', ['ACTIVE', 'SUSPENDED', 'PENDING_SETUP']);
export const schoolMemberRoleEnum = pgEnum('school_member_role', ['SCHOOL_ADMIN', 'SCHOOL_EDITOR']);
export const siteStatusEnum = pgEnum('site_status', ['DRAFT', 'PUBLISHED', 'SUSPENDED']);
export const domainTypeEnum = pgEnum('domain_type', ['SUBDOMAIN', 'CUSTOM']);
export const domainStatusEnum = pgEnum('domain_status', ['ACTIVE', 'PENDING_VERIFICATION', 'INACTIVE']);

export const schools = pgTable('schools', {
  id: uuid('id').defaultRandom().primaryKey(),
  officialName: varchar('official_name', { length: 150 }).notNull(),
  npsn: varchar('npsn', { length: 20 }),
  educationLevel: educationLevelEnum('education_level').default('SMA').notNull(),
  schoolType: schoolTypeEnum('school_type').default('NEGERI').notNull(),
  province: varchar('province', { length: 100 }).notNull(),
  city: varchar('city', { length: 100 }).notNull(),
  address: varchar('address', { length: 255 }),
  phone: varchar('phone', { length: 50 }),
  email: varchar('email', { length: 255 }),
  status: schoolStatusEnum('status').default('ACTIVE').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
});

export const schoolMembers = pgTable('school_members', {
  id: uuid('id').defaultRandom().primaryKey(),
  schoolId: uuid('school_id').references(() => schools.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  role: schoolMemberRoleEnum('role').default('SCHOOL_ADMIN').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
}, (table) => [
  unique('school_user_unique').on(table.schoolId, table.userId),
  index('school_member_school_idx').on(table.schoolId),
  index('school_member_user_idx').on(table.userId)
]);

export const schoolSites = pgTable('school_sites', {
  id: uuid('id').defaultRandom().primaryKey(),
  schoolId: uuid('school_id').references(() => schools.id, { onDelete: 'cascade' }).notNull().unique(),
  templateVersionId: uuid('template_version_id').references(() => templateVersions.id).notNull(),
  status: siteStatusEnum('status').default('DRAFT').notNull(),
  activeReleaseId: uuid('active_release_id'),
  publishedAt: timestamp('published_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
}, (table) => [
  index('school_site_school_idx').on(table.schoolId),
  index('school_site_status_idx').on(table.status)
]);

export const siteDomains = pgTable('site_domains', {
  id: uuid('id').defaultRandom().primaryKey(),
  siteId: uuid('site_id').references(() => schoolSites.id, { onDelete: 'cascade' }).notNull(),
  hostname: varchar('hostname', { length: 255 }).notNull().unique(),
  slug: varchar('slug', { length: 64 }).notNull().unique(),
  type: domainTypeEnum('type').default('SUBDOMAIN').notNull(),
  status: domainStatusEnum('status').default('ACTIVE').notNull(),
  isPrimary: boolean('is_primary').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
}, (table) => [
  index('site_domain_hostname_idx').on(table.hostname),
  index('site_domain_slug_idx').on(table.slug),
  index('site_domain_site_idx').on(table.siteId)
]);
