import { getDatabaseClient, schema } from '@sobatweb/database';

export interface LogAuditParams {
  actorUserId?: string | null;
  schoolId?: string | null;
  action: string;
  targetType: string;
  targetId?: string | null;
  beforeData?: any;
  afterData?: any;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export async function logAuditEvent(params: LogAuditParams) {
  try {
    const db = getDatabaseClient();
    await db.insert(schema.auditLogs).values({
      actorUserId: params.actorUserId || null,
      schoolId: params.schoolId || null,
      action: params.action,
      targetType: params.targetType,
      targetId: params.targetId || null,
      beforeData: params.beforeData || null,
      afterData: params.afterData || null,
      ipAddress: params.ipAddress || null,
      userAgent: params.userAgent || null
    });
  } catch (err) {
    console.error('Failed to write audit log:', err);
  }
}
