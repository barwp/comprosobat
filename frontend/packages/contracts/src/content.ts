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
  subtitle: z.string().default(''),
  imageUrl: z.string().min(1, 'Gambar slide wajib diisi'),
  imageAlt: z.string().default('Slide image'),
  ctaText: z.string().default('Pelajari Lebih Lanjut'),
  ctaUrl: z.string().default('#programs'),
  ctaSecondaryText: z.string().default(''),
  ctaSecondaryUrl: z.string().default(''),
  isActive: z.boolean().default(true),
  sortOrder: z.number().default(0)
});
export type HeroSlidePayload = z.infer<typeof HeroSlidePayloadSchema>;

// 2. Featured Program Payload
export const ProgramPayloadSchema = z.object({
  title: z.string().min(1, 'Nama program wajib diisi'),
  description: z.string().default(''),
  icon: z.string().default('GraduationCap'),
  imageUrl: z.string().nullable().default(null),
  url: z.string().default(''),
  sortOrder: z.number().default(0),
  isActive: z.boolean().default(true)
});
export type ProgramPayload = z.infer<typeof ProgramPayloadSchema>;

// 3. Facility Payload
export const FacilityPayloadSchema = z.object({
  name: z.string().min(1, 'Nama fasilitas wajib diisi'),
  description: z.string().default(''),
  thumbnailUrl: z.string().min(1, 'Thumbnail fasilitas wajib diisi'),
  galleryUrls: z.array(z.string()).default([]),
  category: z.string().default('Akademik'),
  sortOrder: z.number().default(0),
  isActive: z.boolean().default(true)
});
export type FacilityPayload = z.infer<typeof FacilityPayloadSchema>;

// 4. News & Announcement Payload
export const NewsPayloadSchema = z.object({
  title: z.string().min(1, 'Judul berita wajib diisi'),
  slug: z.string().default(''),
  summary: z.string().default(''),
  contentHtml: z.string().min(1, 'Konten berita wajib diisi'),
  coverImageUrl: z.string().nullable().default(null),
  category: z.string().default('Berita'),
  author: z.string().default('Admin Sekolah'),
  publishedAt: z.string().nullable().default(null),
  isFeatured: z.boolean().default(false),
  tags: z.array(z.string()).default([]),
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional()
});
export type NewsPayload = z.infer<typeof NewsPayloadSchema>;

// 5. Vision & Mission Payload
export const VisionMissionPayloadSchema = z.object({
  visionTitle: z.string().default('Visi Sekolah'),
  visionContent: z.string().min(1, 'Isi visi wajib diisi'),
  missionTitle: z.string().default('Misi Sekolah'),
  missionItems: z.array(z.string()).min(1, 'Minimal satu poin misi')
});
export type VisionMissionPayload = z.infer<typeof VisionMissionPayloadSchema>;

// 6. Mission Value / School Values Payload
export const MissionValuePayloadSchema = z.object({
  title: z.string().min(1, 'Nilai sekolah wajib diisi'),
  description: z.string().default(''),
  icon: z.string().default('Sparkles'),
  sortOrder: z.number().default(0),
  isActive: z.boolean().default(true)
});
export type MissionValuePayload = z.infer<typeof MissionValuePayloadSchema>;

// 7. History & Statistics Payload
export const HistoryStatisticPayloadSchema = z.object({
  historyTitle: z.string().default('Sejarah Singkat'),
  establishmentYear: z.number().int().default(1990),
  historySummary: z.string().default(''),
  historyImageUrl: z.string().nullable().default(null),
  accreditation: z.string().default(''),
  
  // Clean raw numerical values stored separately from suffixes and labels
  stats: z.array(z.object({
    key: z.string(),
    label: z.string(),
    rawValue: z.number(),
    suffix: z.string().default('+'),
    icon: z.string().default('Users'),
    sortOrder: z.number().int().min(0).default(0),
    isActive: z.boolean().default(true)
  })).default([
    { key: 'active_students', label: 'Siswa Aktif', rawValue: 1200, suffix: '+', icon: 'Users' },
    { key: 'teachers', label: 'Tenaga Pendidik', rawValue: 75, suffix: '+', icon: 'Award' },
    { key: 'alumni', label: 'Alumni Sukses', rawValue: 5000, suffix: '+', icon: 'GraduationCap' },
    { key: 'achievements', label: 'Prestasi Nasional', rawValue: 120, suffix: '+', icon: 'Trophy' }
  ])
});
export type HistoryStatisticPayload = z.infer<typeof HistoryStatisticPayloadSchema>;

// 8. Staff / Teacher Payload
export const StaffPayloadSchema = z.object({
  name: z.string().min(1, 'Nama guru/staf wajib diisi'),
  position: z.string().min(1, 'Jabatan wajib diisi'),
  photoUrl: z.string().nullable().default(null),
  bio: z.string().default(''),
  contactEmail: z.string().email().or(z.literal('')).default(''),
  sortOrder: z.number().default(0),
  isActive: z.boolean().default(true)
});
export type StaffPayload = z.infer<typeof StaffPayloadSchema>;

// 9. Student Organization / Extracurricular Payload
export const StudentOrgPayloadSchema = z.object({
  name: z.string().min(1, 'Nama organisasi/ekskul wajib diisi'),
  iconUrl: z.string().nullable().default(null),
  description: z.string().default(''),
  supervisor: z.string().default(''),
  schedule: z.string().default(''),
  url: z.string().default(''),
  sortOrder: z.number().default(0),
  isActive: z.boolean().default(true)
});
export type StudentOrgPayload = z.infer<typeof StudentOrgPayloadSchema>;

// 10. Alumni Testimonial Payload
export const TestimonialPayloadSchema = z.object({
  name: z.string().min(1, 'Nama alumni wajib diisi'),
  graduationYear: z.string().default(''),
  currentRole: z.string().default(''),
  rating: z.number().min(1).max(5).default(5),
  photoUrl: z.string().nullable().default(null),
  quote: z.string().min(1, 'Isi testimoni wajib diisi'),
  sortOrder: z.number().default(0),
  isActive: z.boolean().default(true)
});
export type TestimonialPayload = z.infer<typeof TestimonialPayloadSchema>;

// 11. PPDB Registration Payload
export const PPDBPayloadSchema = z.object({
  isActive: z.boolean().default(false),
  title: z.string().default('Penerimaan Peserta Didik Baru (PPDB)'),
  academicYear: z.string().default('2026/2027'),
  quota: z.number().int().default(300),
  startDate: z.string().nullable().default(null),
  endDate: z.string().nullable().default(null), // timestamp for countdown
  announcementDate: z.string().nullable().default(null),
  bannerImageUrl: z.string().nullable().default(null),
  description: z.string().default(''),
  ctaText: z.string().default('Daftar PPDB Sekarang'),
  ctaUrl: z.string().default(''),
  whatsappNumber: z.string().default(''),
  formMode: z.enum(['external', 'whatsapp', 'internal']).default('external'),
  registrationPaths: z.array(z.object({
    title: z.string().min(1, 'Nama jalur wajib diisi'),
    description: z.string().default(''),
    isActive: z.boolean().default(true),
    sortOrder: z.number().int().min(0).default(0)
  })).default([]),
  requirements: z.array(z.string()).default([]),
  costs: z.string().default(''),
  registrationSteps: z.array(z.object({
    stepNumber: z.number(),
    title: z.string(),
    description: z.string(),
    url: z.string().default('')
  })).default([])
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
  title: z.string().default('Video Profil Sekolah'),
  videoUrl: z.string().url('URL video harus valid').or(z.literal('')).default(''),
  thumbnailUrl: z.string().nullable().default(null),
  description: z.string().default(''),
  highlightPoints: z.array(z.string()).default([]),
  isActive: z.boolean().default(true)
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
  sortOrder: z.number().default(0)
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
