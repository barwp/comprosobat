import { z } from 'zod';

export const RESERVED_SLUGS = [
  'www',
  'admin',
  'superadmin',
  'api',
  'app',
  'cdn',
  'mail',
  'support',
  'status',
  'static',
  'assets',
  'dashboard',
  'auth',
  'login',
  'register',
  'sobat',
  'help',
  'docs',
  'billing',
  'root'
] as const;

export function sanitizeSlug(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove accents
    .replace(/[^a-z0-9-]/g, '-')     // replace non-alphanumeric with hyphen
    .replace(/-+/g, '-')             // collapse duplicate hyphens
    .replace(/^-+|-+$/g, '')         // trim hyphens from ends
    .substring(0, 48);               // max 48 chars
}

export function isReservedSlug(slug: string): boolean {
  return (RESERVED_SLUGS as readonly string[]).includes(slug.toLowerCase());
}

export const SlugValidationSchema = z
  .string()
  .min(3, 'Slug minimal 3 karakter')
  .max(48, 'Slug maksimal 48 karakter')
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug hanya boleh berisi huruf kecil, angka, dan tanda hubung tanpa awalan/akhiran tanda hubung')
  .refine((slug) => !isReservedSlug(slug), {
    message: 'Subdomain ini dicadangkan untuk sistem dan tidak dapat digunakan'
  });
