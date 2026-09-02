import { z } from 'zod';

export const AuditLogSchema = z.object({
  id: z.string().uuid(),
  actorUserId: z.string().uuid().nullable().optional(),
  actorEmail: z.string().optional(),
  schoolId: z.string().uuid().nullable().optional(),
  schoolName: z.string().optional(),
  action: z.string(),
  targetType: z.string(),
  targetId: z.string().nullable().optional(),
  beforeData: z.record(z.any()).nullable().optional(),
  afterData: z.record(z.any()).nullable().optional(),
  ipAddress: z.string().nullable().optional(),
  userAgent: z.string().nullable().optional(),
  createdAt: z.string()
});
export type AuditLog = z.infer<typeof AuditLogSchema>;
