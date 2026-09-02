import type { Context, Next } from 'hono';
import { getDatabaseClient, schema, eq, and } from '@sobatweb/database';
import { AppError } from './error.js';
import type { AuthUser } from './auth.js';

/**
 * Validates that the logged-in user has permission to access the school specified in :schoolId
 */
export async function requireSchoolAccess(c: Context, next: Next) {
  const user = c.get('user') as AuthUser;
  const schoolId = c.req.param('schoolId');

  if (!schoolId) {
    throw new AppError('schoolId diperlukan.', 'BAD_REQUEST', 400);
  }

  // Super Admin has platform-wide access
  if (user.platformRole === 'SUPER_ADMIN') {
    c.set('schoolId', schoolId);
    return next();
  }

  const db = getDatabaseClient();
  const [membership] = await db
    .select()
    .from(schema.schoolMembers)
    .where(and(
      eq(schema.schoolMembers.schoolId, schoolId),
      eq(schema.schoolMembers.userId, user.id)
    ))
    .limit(1);

  if (!membership) {
    throw new AppError('Anda tidak memiliki akses ke sekolah ini.', 'FORBIDDEN', 403);
  }

  c.set('schoolId', schoolId);
  c.set('memberRole', membership.role);
  await next();
}

/**
 * Validates that the logged-in user has permission to access the site specified in :siteId
 */
export async function requireSiteAccess(c: Context, next: Next) {
  const user = c.get('user') as AuthUser;
  const siteId = c.req.param('siteId');

  if (!siteId) {
    throw new AppError('siteId diperlukan.', 'BAD_REQUEST', 400);
  }

  const db = getDatabaseClient();
  const [site] = await db
    .select()
    .from(schema.schoolSites)
    .where(eq(schema.schoolSites.id, siteId))
    .limit(1);

  if (!site) {
    throw new AppError('Situs sekolah tidak ditemukan.', 'SITE_NOT_FOUND', 404);
  }

  if (user.platformRole === 'SUPER_ADMIN') {
    c.set('siteId', site.id);
    c.set('schoolId', site.schoolId);
    return next();
  }

  const [membership] = await db
    .select()
    .from(schema.schoolMembers)
    .where(and(
      eq(schema.schoolMembers.schoolId, site.schoolId),
      eq(schema.schoolMembers.userId, user.id)
    ))
    .limit(1);

  if (!membership) {
    throw new AppError('Anda tidak memiliki akses ke data situs sekolah ini.', 'FORBIDDEN', 403);
  }

  c.set('siteId', site.id);
  c.set('schoolId', site.schoolId);
  c.set('memberRole', membership.role);
  await next();
}
