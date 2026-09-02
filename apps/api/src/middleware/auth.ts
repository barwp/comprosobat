import type { Context, Next } from 'hono';
import { getCookie } from 'hono/cookie';
import jwt from 'jsonwebtoken';
import { getDatabaseClient, schema, eq } from '@sobatweb/database';
import { config } from '../config.js';
import { AppError } from './error.js';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  platformRole: 'SUPER_ADMIN' | 'SCHOOL_ADMIN' | 'SCHOOL_EDITOR' | 'PUBLIC_VISITOR';
  status: 'ACTIVE' | 'SUSPENDED' | 'PENDING_VERIFICATION';
}

export async function authMiddleware(c: Context, next: Next) {
  let token: string | undefined;

  // 1. Check HTTP-only cookie first
  token = getCookie(c, config.sessionCookieName);

  // 2. Check Authorization Bearer header fallback
  if (!token) {
    const authHeader = c.req.header('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }
  }

  if (!token) {
    throw new AppError('Sesi tidak ditemukan. Silakan login terlebih dahulu.', 'UNAUTHORIZED', 401);
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret) as { userId: string };
    const db = getDatabaseClient();
    const [user] = await db.select().from(schema.users).where(eq(schema.users.id, decoded.userId)).limit(1);

    if (!user) {
      throw new AppError('Pengguna tidak ditemukan.', 'USER_NOT_FOUND', 401);
    }

    if (user.status === 'SUSPENDED') {
      throw new AppError('Akun Anda telah dinonaktifkan. Silakan hubungi Super Admin.', 'ACCOUNT_SUSPENDED', 403);
    }

    c.set('user', {
      id: user.id,
      name: user.name,
      email: user.email,
      platformRole: user.platformRole,
      status: user.status
    } as AuthUser);

    await next();
  } catch (err: any) {
    if (err instanceof AppError) throw err;
    throw new AppError('Sesi kadaluarsa atau tidak valid. Silakan login kembali.', 'INVALID_SESSION', 401);
  }
}

export function requireRole(...roles: string[]) {
  return async (c: Context, next: Next) => {
    const user = c.get('user') as AuthUser | undefined;
    if (!user) {
      throw new AppError('Autentikasi diperlukan.', 'UNAUTHORIZED', 401);
    }
    if (!roles.includes(user.platformRole)) {
      throw new AppError('Anda tidak memiliki hak akses untuk tindakan ini.', 'FORBIDDEN', 403);
    }
    await next();
  };
}
