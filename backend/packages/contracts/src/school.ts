import { z } from 'zod';
import { SlugValidationSchema } from './slug.js';

export const EducationLevelEnum = z.enum(['SD', 'SMP', 'SMA', 'SMK', 'MADRASAH', 'PESANTREN', 'OTHER']);
export type EducationLevel = z.infer<typeof EducationLevelEnum>;

export const SchoolTypeEnum = z.enum(['NEGERI', 'SWASTA']);
export type SchoolType = z.infer<typeof SchoolTypeEnum>;

export const SchoolStatusEnum = z.enum(['ACTIVE', 'SUSPENDED', 'PENDING_SETUP']);
export type SchoolStatus = z.infer<typeof SchoolStatusEnum>;

export const SchoolMemberRoleEnum = z.enum(['SCHOOL_ADMIN', 'SCHOOL_EDITOR']);
export type SchoolMemberRole = z.infer<typeof SchoolMemberRoleEnum>;

export const CreateSchoolInputSchema = z.object({
  officialName: z.string().min(3, 'Nama resmi sekolah minimal 3 karakter').max(150),
  npsn: z.string().max(20).optional().nullable(),
  educationLevel: EducationLevelEnum,
  schoolType: SchoolTypeEnum,
  province: z.string().min(2, 'Provinsi wajib diisi'),
  city: z.string().min(2, 'Kota/Kabupaten wajib diisi'),
  address: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().email('Format email tidak valid').optional().nullable()
});
export type CreateSchoolInput = z.infer<typeof CreateSchoolInputSchema>;

export const UpdateSchoolProfileSchema = CreateSchoolInputSchema.partial();
export type UpdateSchoolProfile = z.infer<typeof UpdateSchoolProfileSchema>;

export const CheckSubdomainInputSchema = z.object({
  slug: z.string()
});
export type CheckSubdomainInput = z.infer<typeof CheckSubdomainInputSchema>;

export const ReserveSubdomainInputSchema = z.object({
  slug: SlugValidationSchema
});
export type ReserveSubdomainInput = z.infer<typeof ReserveSubdomainInputSchema>;

export const SelectTemplateInputSchema = z.object({
  templateVersionId: z.string().uuid()
});
export type SelectTemplateInput = z.infer<typeof SelectTemplateInputSchema>;

export const OnboardingProgressSchema = z.object({
  step: z.enum(['PROFILE', 'SUBDOMAIN', 'TEMPLATE', 'CMS', 'PUBLISHED']),
  schoolId: z.string().uuid(),
  schoolName: z.string(),
  slug: z.string().nullable().optional(),
  templateKey: z.string().nullable().optional(),
  siteId: z.string().uuid().nullable().optional(),
  isPublished: z.boolean(),
  checklist: z.object({
    hasProfile: z.boolean(),
    hasSubdomain: z.boolean(),
    hasTemplate: z.boolean(),
    hasLogo: z.boolean(),
    hasContact: z.boolean(),
    hasHero: z.boolean(),
    hasVisionMission: z.boolean(),
    hasMenuItems: z.boolean()
  })
});
export type OnboardingProgress = z.infer<typeof OnboardingProgressSchema>;
