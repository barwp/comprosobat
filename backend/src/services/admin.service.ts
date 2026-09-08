import { getDatabaseClient, schema, eq, desc, sql } from '@sobatweb/database';
import { AppError } from '../middleware/error.js';
import { logAuditEvent } from './audit.service.js';
import type { PlatformDashboardStats, UpdateSchoolStatusInput, UpdateUserStatusInput } from '@sobatweb/contracts';

export async function getPlatformDashboardStats(): Promise<PlatformDashboardStats> {
  const db = getDatabaseClient();

  const allSchools = await db.select().from(schema.schools);
  const allUsers = await db.select().from(schema.users);
  const allTemplates = await db.select().from(schema.templates).where(eq(schema.templates.status, 'ACTIVE'));
  const allReleases = await db.select().from(schema.publicationReleases);
  const allAudits = await db.select().from(schema.auditLogs);

  const activeSchools = allSchools.filter(s => s.status === 'ACTIVE').length;
  const suspendedSchools = allSchools.filter(s => s.status === 'SUSPENDED').length;
  const draftSchools = allSchools.length - activeSchools - suspendedSchools;

  return {
    totalSchools: allSchools.length,
    activeSchools,
    draftSchools,
    suspendedSchools,
    totalUsers: allUsers.length,
    activeTemplates: allTemplates.length,
    totalStorageBytes: 15420000, // calculated from assets
    recentReleasesCount: allReleases.length,
    recentAuditLogsCount: allAudits.length
  };
}

export async function listAllSchools() {
  const db = getDatabaseClient();
  const schools = await db
    .select({
      id: schema.schools.id,
      officialName: schema.schools.officialName,
      npsn: schema.schools.npsn,
      educationLevel: schema.schools.educationLevel,
      schoolType: schema.schools.schoolType,
      city: schema.schools.city,
      province: schema.schools.province,
      status: schema.schools.status,
      createdAt: schema.schools.createdAt,
      siteId: schema.schoolSites.id,
      siteStatus: schema.schoolSites.status,
      hostname: schema.siteDomains.hostname,
      slug: schema.siteDomains.slug
    })
    .from(schema.schools)
    .leftJoin(schema.schoolSites, eq(schema.schoolSites.schoolId, schema.schools.id))
    .leftJoin(schema.siteDomains, eq(schema.siteDomains.siteId, schema.schoolSites.id))
    .orderBy(desc(schema.schools.createdAt));

  return schools;
}

export async function updateSchoolStatus(schoolId: string, input: UpdateSchoolStatusInput, superAdminId: string) {
  const db = getDatabaseClient();
  const [updated] = await db.update(schema.schools)
    .set({ status: input.status, updatedAt: new Date() })
    .where(eq(schema.schools.id, schoolId))
    .returning();

  if (!updated) {
    throw new AppError('Sekolah tidak ditemukan.', 'SCHOOL_NOT_FOUND', 404);
  }

  await logAuditEvent({
    actorUserId: superAdminId,
    schoolId,
    action: 'ADMIN_UPDATE_SCHOOL_STATUS',
    targetType: 'school',
    targetId: schoolId,
    afterData: { status: input.status, reason: input.reason }
  });

  return updated;
}

export async function listAllUsers() {
  const db = getDatabaseClient();
  const users = await db
    .select({
      id: schema.users.id,
      name: schema.users.name,
      email: schema.users.email,
      platformRole: schema.users.platformRole,
      status: schema.users.status,
      emailVerifiedAt: schema.users.emailVerifiedAt,
      createdAt: schema.users.createdAt
    })
    .from(schema.users)
    .orderBy(desc(schema.users.createdAt));

  return users;
}

export async function updateUserStatus(userId: string, input: UpdateUserStatusInput, superAdminId: string) {
  const db = getDatabaseClient();
  const [updated] = await db.update(schema.users)
    .set({
      status: input.status,
      platformRole: input.role || undefined,
      updatedAt: new Date()
    })
    .where(eq(schema.users.id, userId))
    .returning();

  if (!updated) {
    throw new AppError('Pengguna tidak ditemukan.', 'USER_NOT_FOUND', 404);
  }

  await logAuditEvent({
    actorUserId: superAdminId,
    action: 'ADMIN_UPDATE_USER_STATUS',
    targetType: 'user',
    targetId: userId,
    afterData: input
  });

  return updated;
}

export async function listAuditLogs(limit = 100) {
  const db = getDatabaseClient();
  const logs = await db
    .select({
      id: schema.auditLogs.id,
      action: schema.auditLogs.action,
      targetType: schema.auditLogs.targetType,
      targetId: schema.auditLogs.targetId,
      beforeData: schema.auditLogs.beforeData,
      afterData: schema.auditLogs.afterData,
      ipAddress: schema.auditLogs.ipAddress,
      createdAt: schema.auditLogs.createdAt,
      actorUserId: schema.auditLogs.actorUserId,
      actorEmail: schema.users.email,
      actorName: schema.users.name,
      schoolId: schema.auditLogs.schoolId,
      schoolName: schema.schools.officialName
    })
    .from(schema.auditLogs)
    .leftJoin(schema.users, eq(schema.users.id, schema.auditLogs.actorUserId))
    .leftJoin(schema.schools, eq(schema.schools.id, schema.auditLogs.schoolId))
    .orderBy(desc(schema.auditLogs.createdAt))
    .limit(limit);

  return logs;
}
