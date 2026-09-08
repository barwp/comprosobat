import { z } from 'zod';

export const SupportedModuleEnum = z.enum([
  'site_settings',
  'hero_slides',
  'programs',
  'facilities',
  'news',
  'vision_mission',
  'mission_values',
  'statistics',
  'staff',
  'student_organizations',
  'testimonials',
  'ppdb',
  'video_profile',
  'contact',
  'navigation',
  'media'
]);
export type SupportedModule = z.infer<typeof SupportedModuleEnum>;

export const ThemeFieldTypeEnum = z.enum(['color', 'select', 'text', 'font']);

export const ThemeFieldSchema = z.object({
  key: z.string(),
  label: z.string().optional(),
  type: ThemeFieldTypeEnum,
  default: z.string().optional(),
  defaultValue: z.string().optional(),
  options: z.array(z.string()).optional()
});
export type ThemeField = z.infer<typeof ThemeFieldSchema>;

export const TemplateSectionFieldTypeEnum = z.enum([
  'text',
  'textarea',
  'richtext',
  'image',
  'gallery',
  'url',
  'color',
  'select',
  'date',
  'number',
  'list',
  'toggle'
]);

export const TemplateSectionFieldSchema = z.object({
  key: z.string(),
  label: z.string().optional(),
  type: TemplateSectionFieldTypeEnum,
  required: z.boolean().default(false),
  defaultValue: z.any().optional(),
  maxLength: z.number().optional(),
  options: z.array(z.string()).optional(),
  description: z.string().optional()
});
export type TemplateSectionField = z.infer<typeof TemplateSectionFieldSchema>;

export const TemplateSectionSchema = z.object({
  key: z.string(),
  module: SupportedModuleEnum,
  label: z.string(),
  icon: z.string().optional(),
  path: z.string().optional(),
  description: z.string().optional(),
  order: z.number().default(0),
  fields: z.array(TemplateSectionFieldSchema).default([])
});
export type TemplateSection = z.infer<typeof TemplateSectionSchema>;

export const TemplateManifestSchema = z.object({
  schemaVersion: z.string().default('1.0'),
  templateKey: z.string().regex(/^[a-z0-9-]+$/, 'templateKey harus lowercase dan alphanumeric hyphen'),
  name: z.string().min(2),
  version: z.string().regex(/^\d+\.\d+\.\d+$/, 'Version harus format semver e.g. 1.0.0'),
  category: z.string().default('Umum'),
  description: z.string().optional(),
  author: z.string().optional(),
  entry: z.string().default('index.html'),
  preview: z.string().default('assets/preview.webp'),
  supportedModules: z.array(SupportedModuleEnum),
  sections: z.array(TemplateSectionSchema).default([]),
  themeFields: z.array(ThemeFieldSchema).default([])
});
export type TemplateManifest = z.infer<typeof TemplateManifestSchema>;

export const TemplateValidationResultSchema = z.object({
  isValid: z.boolean(),
  errors: z.array(z.object({
    file: z.string().optional(),
    field: z.string().optional(),
    message: z.string()
  })),
  warnings: z.array(z.object({
    file: z.string().optional(),
    message: z.string()
  })),
  manifest: TemplateManifestSchema.optional(),
  extractedFilesCount: z.number().optional(),
  totalSizeBytes: z.number().optional()
});
export type TemplateValidationResult = z.infer<typeof TemplateValidationResultSchema>;
