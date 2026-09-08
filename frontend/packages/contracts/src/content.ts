import { z } from 'zod';

export const ContentTypeEnum = z.enum([
  'hero_slide',
  'program',
  'facility',
  'news',
  'vision_mission',
  'mission_value',
  'history_statistic',
  'staff',
  'student_org',
  'testimonial',
  'ppdb',
  'video_profile'
]);
export type ContentType = z.infer<typeof ContentTypeEnum>;

export const ContentStatusEnum = z.enum(['DRAFT', 'PUBLISHED', 'SCHEDULED', 'ARCHIVED']);
export type ContentStatus = z.infer<typeof ContentStatusEnum>;

// 1. Hero Slide Payload
export const HeroSlidePayloadSchema = z.object({
  title: z.string().min(1, 'Judul slide wajib diisi'),
  subtitle: z.string().optional().default(''),
  badge: z.string().optional().default(''),
  imageUrl: z.string().min(1, 'Gambar slide wajib diisi'),
  imageAlt: z.string().optional().default('Slide image'),
  ctaText: z.string().optional().default('Pelajari Lebih Lanjut'),
  ctaUrl: z.string().optional().default('#programs'),
  ctaSecondaryText: z.string().optional().default(''),
  ctaSecondaryUrl: z.string().optional().default(''),
  isActive: z.boolean().optional().default(true),
  sortOrder: z.coerce.number().default(0)
});
export type HeroSlidePayload = z.infer<typeof HeroSlidePayloadSchema>;

// 2. Featured Program Payload
export const ProgramPayloadSchema = z.object({
  title: z.string().min(1, 'Nama program wajib diisi'),
  description: z.string().optional().default(''),
  category: z.string().optional().default(''),
  icon: z.string().optional().default('GraduationCap'),
  imageUrl: z.string().nullable().optional().or(z.literal('')).default(null),
  url: z.string().optional().default(''),
  sortOrder: z.coerce.number().default(0),
  isActive: z.boolean().optional().default(true)
});
export type ProgramPayload = z.infer<typeof ProgramPayloadSchema>;

// 3. Facility Payload
export const FacilityPayloadSchema = z.object({
  name: z.string().min(1, 'Nama fasilitas wajib diisi'),
  description: z.string().optional().default(''),
  thumbnailUrl: z.string().nullable().optional().or(z.literal('')).default(''),
  imageUrl: z.string().nullable().optional().or(z.literal('')).default(''),
  galleryUrls: z.array(z.string()).optional().default([]),
  category: z.string().optional().default('Akademik'),
  sortOrder: z.coerce.number().default(0),
  isActive: z.boolean().optional().default(true)
});
export type FacilityPayload = z.infer<typeof FacilityPayloadSchema>;

// 4. News & Announcement Payload
export const NewsPayloadSchema = z.object({
  title: z.string().min(1, 'Judul berita wajib diisi'),
  slug: z.string().optional().default(''),
  summary: z.string().optional().default(''),
  contentHtml: z.string().optional().default(''),
  coverImageUrl: z.string().nullable().optional().or(z.literal('')).default(null),
  category: z.string().optional().default('Berita'),
  author: z.string().optional().default('Admin Sekolah'),
  publishedAt: z.string().nullable().optional().default(null),
  isFeatured: z.boolean().optional().default(false),
  tags: z.array(z.string()).optional().default([]),
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional()
});
export type NewsPayload = z.infer<typeof NewsPayloadSchema>;

// 5. Vision & Mission Payload
export const VisionMissionPayloadSchema = z.object({
  visionTitle: z.string().optional().default('Visi Sekolah'),
  visionContent: z.string().optional().default(''),
  vision: z.string().optional(),
  missionTitle: z.string().optional().default('Misi Sekolah'),
  missionItems: z.array(z.string()).optional().default([]),
  missions: z.array(z.string()).optional(),
  coverImageUrl: z.string().nullable().optional().or(z.literal('')).default(null)
});
export type VisionMissionPayload = z.infer<typeof VisionMissionPayloadSchema>;

// 6. Mission Value / School Values Payload
export const MissionValuePayloadSchema = z.object({
  title: z.string().min(1, 'Nilai sekolah wajib diisi'),
  description: z.string().optional().default(''),
  icon: z.string().optional().default('Sparkles'),
  sortOrder: z.coerce.number().default(0),
  isActive: z.boolean().optional().default(true)
});
export type MissionValuePayload = z.infer<typeof MissionValuePayloadSchema>;

// 7. History & Statistics Payload
export const HistoryStatisticPayloadSchema = z.object({
  historyTitle: z.string().optional().default('Sejarah Singkat'),
  establishmentYear: z.union([z.number(), z.string()]).optional().default(1990),
  historySummary: z.string().optional().default(''),
  historyImageUrl: z.string().nullable().optional().or(z.literal('')).default(null),
  accreditation: z.string().optional().default(''),
  stats: z.array(z.object({
    key: z.string().optional().default(''),
    label: z.string().optional().default(''),
    rawValue: z.union([z.number(), z.string()]).optional(),
    value: z.string().optional(),
    suffix: z.string().optional().default(''),
    icon: z.string().optional().default('Users'),
    sortOrder: z.coerce.number().default(0),
    isActive: z.boolean().optional().default(true)
  })).optional().default([])
});
export type HistoryStatisticPayload = z.infer<typeof HistoryStatisticPayloadSchema>;

// 8. Staff / Teacher Payload
export const StaffPayloadSchema = z.object({
  name: z.string().min(1, 'Nama guru/staf wajib diisi'),
  position: z.string().optional().default(''),
  role: z.string().optional(),
  subject: z.string().optional(),
  photoUrl: z.string().nullable().optional().or(z.literal('')).default(null),
  bio: z.string().optional().default(''),
  contactEmail: z.string().optional().default(''),
  sortOrder: z.coerce.number().default(0),
  isActive: z.boolean().optional().default(true)
});
export type StaffPayload = z.infer<typeof StaffPayloadSchema>;

// 9. Student Organization / Extracurricular Payload
export const StudentOrgPayloadSchema = z.object({
  name: z.string().min(1, 'Nama organisasi/ekskul wajib diisi'),
  title: z.string().optional(),
  iconUrl: z.string().nullable().optional().or(z.literal('')).default(null),
  imageUrl: z.string().nullable().optional().or(z.literal('')).default(null),
  logoUrl: z.string().nullable().optional().or(z.literal('')).default(null),
  icon: z.string().optional(),
  category: z.string().optional().default('Organisasi Siswa'),
  description: z.string().optional().default(''),
  supervisor: z.string().optional().default(''),
  schedule: z.string().optional().default(''),
  url: z.string().optional().default(''),
  sortOrder: z.coerce.number().default(0),
  isActive: z.boolean().optional().default(true)
});
export type StudentOrgPayload = z.infer<typeof StudentOrgPayloadSchema>;

// 10. Alumni Testimonial Payload
export const TestimonialPayloadSchema = z.object({
  name: z.string().min(1, 'Nama alumni wajib diisi'),
  alumniName: z.string().optional(),
  graduationYear: z.string().optional().default(''),
  currentRole: z.string().optional().default(''),
  role: z.string().optional(),
  rating: z.coerce.number().min(1).max(5).default(5),
  photoUrl: z.string().nullable().optional().or(z.literal('')).default(null),
  quote: z.string().optional().default(''),
  content: z.string().optional(),
  sortOrder: z.coerce.number().default(0),
  isActive: z.boolean().optional().default(true)
});
export type TestimonialPayload = z.infer<typeof TestimonialPayloadSchema>;

// 11. PPDB Registration Payload
export const PPDBPayloadSchema = z.object({
  isActive: z.boolean().optional().default(true),
  title: z.string().optional().default('Penerimaan Peserta Didik Baru (PPDB)'),
  academicYear: z.string().optional().default('2026/2027'),
  quota: z.coerce.number().optional().default(300),
  startDate: z.string().nullable().optional().default(null),
  endDate: z.string().nullable().optional().default(null),
  announcementDate: z.string().nullable().optional().default(null),
  bannerImageUrl: z.string().nullable().optional().or(z.literal('')).default(null),
  description: z.string().optional().default(''),
  ctaText: z.string().optional().default('Daftar PPDB Sekarang'),
  ctaUrl: z.string().optional().default(''),
  whatsappNumber: z.string().optional().default(''),
  formMode: z.enum(['external', 'whatsapp', 'internal']).optional().default('external'),
  registrationPaths: z.array(z.object({
    title: z.string().optional().default(''),
    description: z.string().optional().default(''),
    isActive: z.boolean().optional().default(true),
    sortOrder: z.coerce.number().default(0)
  })).optional().default([]),
  requirements: z.array(z.string()).optional().default([]),
  costs: z.string().optional().default(''),
  registrationSteps: z.array(z.object({
    stepNumber: z.coerce.number().optional().default(1),
    title: z.string().optional().default(''),
    description: z.string().optional().default(''),
    url: z.string().optional().default('')
  })).optional().default([])
});
export type PPDBPayload = z.infer<typeof PPDBPayloadSchema>;

export const PPDBSubmissionInputSchema = z.object({
  studentName: z.string().min(2, 'Nama calon siswa wajib diisi').max(150),
  nisn: z.string().regex(/^\d{10}$/, 'NISN harus terdiri dari 10 digit'),
  whatsapp: z.string().min(9, 'Nomor WhatsApp tidak valid').max(20)
});
export type PPDBSubmissionInput = z.infer<typeof PPDBSubmissionInputSchema>;

// 12. Video Profile Payload
export const VideoProfilePayloadSchema = z.object({
  title: z.string().optional().default('Video Profil Sekolah'),
  videoUrl: z.string().optional().default(''),
  thumbnailUrl: z.string().nullable().optional().or(z.literal('')).default(null),
  description: z.string().optional().default(''),
  highlightPoints: z.array(z.string()).optional().default([]),
  isActive: z.boolean().optional().default(true)
});
export type VideoProfilePayload = z.infer<typeof VideoProfilePayloadSchema>;

// Generic Content Entry Schema
export const ContentEntryInputSchema = z.object({
  type: ContentTypeEnum,
  entryKey: z.string().optional(),
  title: z.string().min(1),
  slug: z.string().optional(),
  payload: z.record(z.any()),
  status: ContentStatusEnum.default('DRAFT'),
  sortOrder: z.coerce.number().default(0)
});
export type ContentEntryInput = z.infer<typeof ContentEntryInputSchema>;

export const ContentEntryUpdateSchema = ContentEntryInputSchema.partial().omit({ type: true }).extend({
  type: ContentTypeEnum.optional()
});
export type ContentEntryUpdate = z.infer<typeof ContentEntryUpdateSchema>;

export const ContentPayloadSchemas: Record<ContentType, z.ZodTypeAny> = {
  hero_slide: HeroSlidePayloadSchema,
  program: ProgramPayloadSchema,
  facility: FacilityPayloadSchema,
  news: NewsPayloadSchema,
  vision_mission: VisionMissionPayloadSchema,
  mission_value: MissionValuePayloadSchema,
  history_statistic: HistoryStatisticPayloadSchema,
  staff: StaffPayloadSchema,
  student_org: StudentOrgPayloadSchema,
  testimonial: TestimonialPayloadSchema,
  ppdb: PPDBPayloadSchema,
  video_profile: VideoProfilePayloadSchema
};

export function parseContentPayload(type: ContentType, payload: unknown) {
  return ContentPayloadSchemas[type].parse(payload);
}

export const ReorderItemSchema = z.object({
  id: z.string().uuid(),
  sortOrder: z.number().int().min(0)
});
export const ReorderInputSchema = z.object({
  items: z.array(ReorderItemSchema)
});
export type ReorderInput = z.infer<typeof ReorderInputSchema>;
