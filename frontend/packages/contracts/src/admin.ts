import { z } from 'zod';
import { PlatformRoleEnum, UserStatusEnum } from './auth.js';
import { SchoolStatusEnum } from './school.js';

export const PlatformDashboardStatsSchema = z.object({
  totalSchools: z.number(),
  activeSchools: z.number(),
  draftSchools: z.number(),
  suspendedSchools: z.number(),
  totalUsers: z.number(),
  activeTemplates: z.number(),
  totalStorageBytes: z.number(),
  recentReleasesCount: z.number(),
  recentAuditLogsCount: z.number()
});
export type PlatformDashboardStats = z.infer<typeof PlatformDashboardStatsSchema>;

export const UpdateSchoolStatusInputSchema = z.object({
  status: SchoolStatusEnum,
  reason: z.string().optional()
});
export type UpdateSchoolStatusInput = z.infer<typeof UpdateSchoolStatusInputSchema>;

export const UpdateUserStatusInputSchema = z.object({
  status: UserStatusEnum,
  role: PlatformRoleEnum.optional()
});
export type UpdateUserStatusInput = z.infer<typeof UpdateUserStatusInputSchema>;
