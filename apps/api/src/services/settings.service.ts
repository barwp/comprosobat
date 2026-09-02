import { getDatabaseClient, schema, eq } from '@sobatweb/database';
import { AppError } from '../middleware/error.js';
import { logAuditEvent } from './audit.service.js';
import type { UpdateSiteSettings } from '@sobatweb/contracts';

export async function getSiteSettings(siteId: string) {
  const db = getDatabaseClient();
  const [row] = await db.select().from(schema.siteSettings).where(eq(schema.siteSettings.siteId, siteId)).limit(1);

  if (!row) {
    return {
      siteName: 'Website Sekolah',
      tagline: 'Mencerdaskan Generasi Bangsa',
      description: 'Website resmi profil sekolah.',
      primaryColor: '#087F5B',
      secondaryColor: '#0CA678',
      fontFamily: 'Inter',
      language: 'id',
      timezone: 'Asia/Jakarta',
      dateFormat: 'DD MMMM YYYY',
      seoTitle: 'Website Resmi Sekolah',
      seoDescription: 'Selamat datang di website resmi sekolah kami.',
      seoKeywords: ['sekolah', 'pendidikan', 'profil sekolah'],
      address: '',
      email: '',
      phone: '',
      whatsapp: '',
      operationalHours: 'Senin - Jumat: 07:00 - 15:30 WIB',
      googleMapsUrl: '',
      socialLinks: {}
    };
  }

  return row.settings;
}

export async function updateSiteSettings(siteId: string, input: UpdateSiteSettings, userId: string, schoolId: string) {
  const db = getDatabaseClient();
  const current = (await getSiteSettings(siteId)) as Record<string, any>;

  const updatedSettings = {
    ...current,
    ...input,
    socialLinks: {
      ...((current.socialLinks as Record<string, any>) || {}),
      ...(input.socialLinks || {})
    }
  };

  let [row] = await db.select().from(schema.siteSettings).where(eq(schema.siteSettings.siteId, siteId)).limit(1);

  if (row) {
    [row] = await db.update(schema.siteSettings).set({
      settings: updatedSettings,
      updatedAt: new Date()
    }).where(eq(schema.siteSettings.siteId, siteId)).returning();
  } else {
    [row] = await db.insert(schema.siteSettings).values({
      siteId,
      settings: updatedSettings
    }).returning();
  }

  await logAuditEvent({
    actorUserId: userId,
    schoolId,
    action: 'SETTINGS_UPDATED',
    targetType: 'site_settings',
    targetId: siteId,
    beforeData: current,
    afterData: updatedSettings
  });

  return row.settings;
}
