import { pgTable, uuid, varchar, text, jsonb, timestamp, index } from 'drizzle-orm/pg-core';
import { users } from './users.js';
import { schools } from './schools.js';

export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  actorUserId: uuid('actor_user_id').references(() => users.id),
  schoolId: uuid('school_id').references(() => schools.id),
  action: varchar('action', { length: 100 }).notNull(),
  targetType: varchar('target_type', { length: 100 }).notNull(),
  targetId: uuid('target_id'),
  beforeData: jsonb('before_data'),
  afterData: jsonb('after_data'),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
}, (table) => [
  index('audit_log_school_idx').on(table.schoolId),
  index('audit_log_actor_idx').on(table.actorUserId),
  index('audit_log_action_idx').on(table.action),
  index('audit_log_created_idx').on(table.createdAt)
]);
