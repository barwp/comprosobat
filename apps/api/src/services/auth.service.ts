import * as argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import { getDatabaseClient, schema, eq } from '@sobatweb/database';
import { config } from '../config.js';
import { AppError } from '../middleware/error.js';
import { logAuditEvent } from './audit.service.js';
import type { RegisterInput, LoginInput, VerifyEmailInput, ResetPasswordInput, ForgotPasswordInput } from '@sobatweb/contracts';

export function generateToken(userId: string): string {
  return jwt.sign({ userId }, config.jwtSecret, { expiresIn: config.tokenExpiresInSec });
}

export async function registerUser(input: RegisterInput, ip?: string, userAgent?: string) {
  const db = getDatabaseClient();
  const normalizedEmail = input.email.toLowerCase().trim();

  const [existing] = await db.select().from(schema.users).where(eq(schema.users.email, normalizedEmail)).limit(1);
  if (existing) {
    throw new AppError('Email sudah terdaftar. Silakan gunakan email lain atau login.', 'EMAIL_ALREADY_EXISTS', 400, { email: 'Email sudah terdaftar.' });
  }

  const passwordHash = await argon2.hash(input.password);
  const verificationToken = `v_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;

  const [user] = await db.insert(schema.users).values({
    name: input.name.trim(),
    email: normalizedEmail,
    passwordHash,
    platformRole: 'SCHOOL_ADMIN',
    status: 'PENDING_VERIFICATION',
    verificationToken
  }).returning();

  await logAuditEvent({
    actorUserId: user.id,
    action: 'USER_REGISTERED',
    targetType: 'user',
    targetId: user.id,
    ipAddress: ip,
    userAgent
  });

  const token = generateToken(user.id);

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.platformRole,
      status: user.status,
      emailVerifiedAt: user.emailVerifiedAt
    },
    token,
    verificationToken // returned in dev/demo mode for seamless onboarding
  };
}

export async function verifyUserEmail(input: VerifyEmailInput, ip?: string) {
  const db = getDatabaseClient();
  const [user] = await db.select().from(schema.users).where(eq(schema.users.verificationToken, input.token)).limit(1);

  if (!user) {
    throw new AppError('Token verifikasi email tidak valid atau sudah kadaluarsa.', 'INVALID_TOKEN', 400);
  }

  const [updated] = await db.update(schema.users)
    .set({
      status: 'ACTIVE',
      emailVerifiedAt: new Date(),
      verificationToken: null,
      updatedAt: new Date()
    })
    .where(eq(schema.users.id, user.id))
    .returning();

  await logAuditEvent({
    actorUserId: user.id,
    action: 'EMAIL_VERIFIED',
    targetType: 'user',
    targetId: user.id,
    ipAddress: ip
  });

  const token = generateToken(user.id);

  return {
    user: {
      id: updated.id,
      name: updated.name,
      email: updated.email,
      platformRole: updated.platformRole,
      role: updated.platformRole,
      status: updated.status,
      emailVerifiedAt: updated.emailVerifiedAt
    },
    token
  };
}

export async function loginUser(input: LoginInput, ip?: string, userAgent?: string) {
  const db = getDatabaseClient();
  const normalizedEmail = input.email.toLowerCase().trim();

  const [user] = await db.select().from(schema.users).where(eq(schema.users.email, normalizedEmail)).limit(1);
  if (!user) {
    throw new AppError('Email atau password tidak sesuai.', 'INVALID_CREDENTIALS', 401);
  }

  if (user.status === 'SUSPENDED') {
    throw new AppError('Akun Anda telah dinonaktifkan. Silakan hubungi Super Admin.', 'ACCOUNT_SUSPENDED', 403);
  }

  const isValidPassword = await argon2.verify(user.passwordHash, input.password);
  if (!isValidPassword) {
    throw new AppError('Email atau password tidak sesuai.', 'INVALID_CREDENTIALS', 401);
  }

  const token = generateToken(user.id);

  // Fetch school membership if exists
  const [membership] = await db
    .select({
      schoolId: schema.schoolMembers.schoolId,
      role: schema.schoolMembers.role,
      schoolName: schema.schools.officialName
    })
    .from(schema.schoolMembers)
    .innerJoin(schema.schools, eq(schema.schools.id, schema.schoolMembers.schoolId))
    .where(eq(schema.schoolMembers.userId, user.id))
    .limit(1);

  await logAuditEvent({
    actorUserId: user.id,
    schoolId: membership?.schoolId || null,
    action: 'USER_LOGIN',
    targetType: 'user',
    targetId: user.id,
    ipAddress: ip,
    userAgent
  });

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      platformRole: user.platformRole,
      role: user.platformRole,
      status: user.status,
      emailVerifiedAt: user.emailVerifiedAt,
      school: membership ? {
        id: membership.schoolId,
        name: membership.schoolName,
        role: membership.role
      } : null
    },
    token
  };
}

export async function forgotPassword(input: ForgotPasswordInput) {
  const db = getDatabaseClient();
  const [user] = await db.select().from(schema.users).where(eq(schema.users.email, input.email.toLowerCase())).limit(1);
  if (!user) {
    // Return success to avoid email enumeration
    return { message: 'Jika email terdaftar, tautan reset password telah dikirimkan.' };
  }

  const resetToken = `rst_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await db.update(schema.users).set({
    resetPasswordToken: resetToken,
    resetPasswordExpiresAt: expiresAt
  }).where(eq(schema.users.id, user.id));

  return {
    message: 'Tautan reset password telah dikirimkan ke email Anda.',
    resetToken // returned for development/demo ease
  };
}

export async function resetPassword(input: ResetPasswordInput) {
  const db = getDatabaseClient();
  const [user] = await db.select().from(schema.users).where(eq(schema.users.resetPasswordToken, input.token)).limit(1);

  if (!user || !user.resetPasswordExpiresAt || user.resetPasswordExpiresAt < new Date()) {
    throw new AppError('Token reset password tidak valid atau sudah kedaluwarsa.', 'INVALID_TOKEN', 400);
  }

  const newHash = await argon2.hash(input.newPassword);
  await db.update(schema.users).set({
    passwordHash: newHash,
    resetPasswordToken: null,
    resetPasswordExpiresAt: null,
    updatedAt: new Date()
  }).where(eq(schema.users.id, user.id));

  return { message: 'Password berhasil diubah. Silakan login kembali.' };
}
