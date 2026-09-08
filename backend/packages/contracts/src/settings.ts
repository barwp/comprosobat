import { z } from 'zod';

export const SiteSettingsSchema = z.object({
  siteName: z.string().min(2, 'Nama situs minimal 2 karakter').default('Website Sekolah'),
  tagline: z.string().default('Mencerdaskan Generasi Bangsa'),
  description: z.string().default('Website resmi profil sekolah.'),
  logoUrl: z.string().nullable().default(null),
  logoAlt: z.string().default('Logo Sekolah'),
  faviconUrl: z.string().nullable().default(null),
  primaryColor: z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'Format hex color tidak valid').default('#087F5B'),
  secondaryColor: z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'Format hex color tidak valid').default('#0CA678'),
  fontFamily: z.string().default('Inter'),
  language: z.string().default('id'),
  timezone: z.string().default('Asia/Jakarta'),
  dateFormat: z.string().default('DD MMMM YYYY'),
  
  // SEO Default
  seoTitle: z.string().default('Website Resmi Sekolah'),
  seoDescription: z.string().default('Selamat datang di website resmi sekolah kami.'),
  seoKeywords: z.array(z.string()).default(['sekolah', 'pendidikan', 'profil sekolah']),
  socialImage: z.string().nullable().default(null),

  // Contact info
  address: z.string().default(''),
  email: z.string().email().or(z.literal('')).default(''),
  phone: z.string().default(''),
  whatsapp: z.string().default(''),
  operationalHours: z.string().default('Senin - Jumat: 07:00 - 15:30 WIB'),
  googleMapsUrl: z.string().default(''),
  googleMapsEmbedUrl: z.string().default(''),
  latitude: z.number().nullable().default(null),
  longitude: z.number().nullable().default(null),

  // Social media
  socialLinks: z.object({
    instagram: z.string().default(''),
    facebook: z.string().default(''),
    youtube: z.string().default(''),
    tiktok: z.string().default(''),
    twitter: z.string().default('')
  }).default({}),

  // Section Headlines & Subheadings
  sectionHeadlines: z.record(z.string(), z.object({
    badge: z.string().default(''),
    title: z.string().default(''),
    description: z.string().default('')
  })).default({})
});

export type SiteSettings = z.infer<typeof SiteSettingsSchema>;
export const UpdateSiteSettingsSchema = SiteSettingsSchema.partial();
export type UpdateSiteSettings = z.infer<typeof UpdateSiteSettingsSchema>;
