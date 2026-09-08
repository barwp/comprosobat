import { z } from 'zod';

export const PlatformRoleEnum = z.enum(['SUPER_ADMIN', 'SCHOOL_ADMIN', 'SCHOOL_EDITOR', 'PUBLIC_VISITOR']);
export type PlatformRole = z.infer<typeof PlatformRoleEnum>;

export const UserStatusEnum = z.enum(['ACTIVE', 'SUSPENDED', 'PENDING_VERIFICATION']);
export type UserStatus = z.infer<typeof UserStatusEnum>;

export const RegisterInputSchema = z.object({
  name: z.string().min(2, 'Nama minimal 2 karakter').max(100, 'Nama maksimal 100 karakter'),
  email: z.string().email('Format email tidak valid').toLowerCase(),
  password: z.string().min(8, 'Password minimal 8 karakter'),
  whatsappNumber: z.string().optional(),
  agreeTerms: z.boolean().refine((val) => val === true, 'Anda harus menyetujui syarat & ketentuan')
});
export type RegisterInput = z.infer<typeof RegisterInputSchema>;

export const LoginInputSchema = z.object({
  email: z.string().email('Format email tidak valid').toLowerCase(),
  password: z.string().min(1, 'Password wajib diisi')
});
export type LoginInput = z.infer<typeof LoginInputSchema>;

export const VerifyEmailInputSchema = z.object({
  token: z.string().min(1, 'Token verifikasi wajib diisi')
});
export type VerifyEmailInput = z.infer<typeof VerifyEmailInputSchema>;

export const ForgotPasswordInputSchema = z.object({
  email: z.string().email('Format email tidak valid').toLowerCase()
});
export type ForgotPasswordInput = z.infer<typeof ForgotPasswordInputSchema>;

export const ResetPasswordInputSchema = z.object({
  token: z.string().min(1, 'Token reset password wajib diisi'),
  newPassword: z.string().min(8, 'Password minimal 8 karakter')
});
export type ResetPasswordInput = z.infer<typeof ResetPasswordInputSchema>;

export const UserProfileSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  email: z.string().email(),
  role: PlatformRoleEnum,
  status: UserStatusEnum,
  emailVerifiedAt: z.string().nullable().optional(),
  createdAt: z.string()
});
export type UserProfile = z.infer<typeof UserProfileSchema>;
