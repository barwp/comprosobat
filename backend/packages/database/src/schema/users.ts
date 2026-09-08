import { pgTable, uuid, varchar, text, timestamp, pgEnum } from 'drizzle-orm/pg-core';

export const platformRoleEnum = pgEnum('platform_role', ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'SCHOOL_EDITOR', 'PUBLIC_VISITOR']);
export const userStatusEnum = pgEnum('user_status', ['ACTIVE', 'SUSPENDED', 'PENDING_VERIFICATION']);

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 150 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  platformRole: platformRoleEnum('platform_role').default('SCHOOL_ADMIN').notNull(),
  status: userStatusEnum('status').default('PENDING_VERIFICATION').notNull(),
  emailVerifiedAt: timestamp('email_verified_at', { withTimezone: true }),
  verificationToken: varchar('verification_token', { length: 255 }),
  resetPasswordToken: varchar('reset_password_token', { length: 255 }),
  resetPasswordExpiresAt: timestamp('reset_password_expires_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
});

export const authSessions = pgTable('auth_sessions', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  tokenHash: text('token_hash').notNull(),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
});
