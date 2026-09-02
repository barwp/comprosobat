import { getDatabaseClient, schema, eq, and, sql } from '@sobatweb/database';
import { AppError } from '../middleware/error.js';
import { sanitizeSlug, isReservedSlug } from '@sobatweb/contracts';
import { logAuditEvent } from './audit.service.js';
import type {
  CreateSchoolInput,
  UpdateSchoolProfile,
  ReserveSubdomainInput,
  SelectTemplateInput,
  OnboardingProgress
} from '@sobatweb/contracts';

export async function createSchool(userId: string, input: CreateSchoolInput) {
  const db = getDatabaseClient();

  const [school] = await db.insert(schema.schools).values({
    officialName: input.officialName.trim(),
    npsn: input.npsn?.trim() || null,
    educationLevel: input.educationLevel,
    schoolType: input.schoolType,
    province: input.province.trim(),
    city: input.city.trim(),
    address: input.address?.trim() || null,
    phone: input.phone?.trim() || null,
    email: input.email?.trim() || null,
    status: 'ACTIVE'
  }).returning();

  // Create membership
  await db.insert(schema.schoolMembers).values({
    schoolId: school.id,
    userId: userId,
    role: 'SCHOOL_ADMIN'
  });

  await logAuditEvent({
    actorUserId: userId,
    schoolId: school.id,
    action: 'SCHOOL_CREATED',
    targetType: 'school',
    targetId: school.id
  });

  // Calculate recommended slug
  const baseSlug = sanitizeSlug(school.officialName);
  const check = await checkSubdomainAvailability(baseSlug);

  return {
    school,
    suggestedSlug: check.isAvailable ? baseSlug : check.suggestions[0] || `${baseSlug}-2`
  };
}

export async function checkSubdomainAvailability(rawSlug: string) {
  const slug = sanitizeSlug(rawSlug);

  if (slug.length < 3) {
    return {
      slug,
      isAvailable: false,
      reason: 'Subdomain minimal 3 karakter.',
      suggestions: []
    };
  }

  if (isReservedSlug(slug)) {
    return {
      slug,
      isAvailable: false,
      reason: 'Subdomain ini dicadangkan untuk sistem.',
      suggestions: [`${slug}-sch`, `${slug}-school`, `${slug}-id`]
    };
  }

  const db = getDatabaseClient();
  const existing = await db.select().from(schema.siteDomains).where(eq(schema.siteDomains.slug, slug)).limit(1);

  if (existing.length === 0) {
    return {
      slug,
      isAvailable: true,
      suggestions: []
    };
  }

  // Generate suggestions
  const suggestions: string[] = [];
  for (let i = 2; i <= 6; i++) {
    const candidate = `${slug}-${i}`;
    const checkCandidate = await db.select().from(schema.siteDomains).where(eq(schema.siteDomains.slug, candidate)).limit(1);
    if (checkCandidate.length === 0 && !isReservedSlug(candidate)) {
      suggestions.push(candidate);
      if (suggestions.length >= 3) break;
    }
  }

  return {
    slug,
    isAvailable: false,
    reason: 'Subdomain sudah digunakan.',
    suggestions
  };
}

export async function reserveSubdomain(schoolId: string, input: ReserveSubdomainInput, userId: string) {
  const db = getDatabaseClient();
  const slug = sanitizeSlug(input.slug);

  const check = await checkSubdomainAvailability(slug);
  if (!check.isAvailable) {
    throw new AppError(check.reason || 'Subdomain tidak tersedia.', 'SUBDOMAIN_NOT_AVAILABLE', 400, {
      slug: check.reason || 'Subdomain sudah digunakan.'
    });
  }

  // Check if school already has a site
  let [site] = await db.select().from(schema.schoolSites).where(eq(schema.schoolSites.schoolId, schoolId)).limit(1);

  if (!site) {
    // Get default active template version
    const [defaultTplVer] = await db.select().from(schema.templateVersions).where(eq(schema.templateVersions.isActive, true)).limit(1);
    if (!defaultTplVer) {
      throw new AppError('Belum ada template aktif di sistem.', 'NO_ACTIVE_TEMPLATE', 500);
    }

    [site] = await db.insert(schema.schoolSites).values({
      schoolId,
      templateVersionId: defaultTplVer.id,
      status: 'DRAFT'
    }).returning();
  }

  const hostname = `${slug}.${process.env.BASE_DOMAIN || 'localhost:3000'}`;

  // Upsert or update site_domains
  let [domain] = await db.select().from(schema.siteDomains).where(eq(schema.siteDomains.siteId, site.id)).limit(1);

  if (domain) {
    [domain] = await db.update(schema.siteDomains).set({
      slug,
      hostname,
      updatedAt: new Date()
    }).where(eq(schema.siteDomains.id, domain.id)).returning();
  } else {
    [domain] = await db.insert(schema.siteDomains).values({
      siteId: site.id,
      slug,
      hostname,
      type: 'SUBDOMAIN',
      status: 'ACTIVE',
      isPrimary: true
    }).returning();
  }

  await logAuditEvent({
    actorUserId: userId,
    schoolId,
    action: 'SUBDOMAIN_RESERVED',
    targetType: 'site_domain',
    targetId: domain.id,
    afterData: { slug, hostname }
  });

  return { domain, siteId: site.id };
}

export async function selectTemplate(schoolId: string, input: SelectTemplateInput, userId: string) {
  const db = getDatabaseClient();

  const [tplVer] = await db.select().from(schema.templateVersions).where(eq(schema.templateVersions.id, input.templateVersionId)).limit(1);
  if (!tplVer || !tplVer.isActive) {
    throw new AppError('Versi template yang dipilih tidak tersedia.', 'TEMPLATE_NOT_FOUND', 404);
  }

  let [site] = await db.select().from(schema.schoolSites).where(eq(schema.schoolSites.schoolId, schoolId)).limit(1);

  if (site) {
    [site] = await db.update(schema.schoolSites).set({
      templateVersionId: tplVer.id,
      updatedAt: new Date()
    }).where(eq(schema.schoolSites.id, site.id)).returning();
  } else {
    [site] = await db.insert(schema.schoolSites).values({
      schoolId,
      templateVersionId: tplVer.id,
      status: 'DRAFT'
    }).returning();
  }

  await logAuditEvent({
    actorUserId: userId,
    schoolId,
    action: 'TEMPLATE_SELECTED',
    targetType: 'school_site',
    targetId: site.id,
    afterData: { templateVersionId: tplVer.id }
  });

  return { site, templateVersion: tplVer };
}

export async function completeOnboarding(schoolId: string, userId: string) {
  const db = getDatabaseClient();

  const [school] = await db.select().from(schema.schools).where(eq(schema.schools.id, schoolId)).limit(1);
  if (!school) {
    throw new AppError('Sekolah tidak ditemukan.', 'SCHOOL_NOT_FOUND', 404);
  }

  let [site] = await db.select().from(schema.schoolSites).where(eq(schema.schoolSites.schoolId, schoolId)).limit(1);
  if (!site) {
    throw new AppError('Situs sekolah belum diinisialisasi. Silakan pilih subdomain dan template.', 'SITE_NOT_INITIALIZED', 400);
  }

  // Ensure site settings exist
  let [settings] = await db.select().from(schema.siteSettings).where(eq(schema.siteSettings.siteId, site.id)).limit(1);
  if (!settings) {
    await db.insert(schema.siteSettings).values({
      siteId: site.id,
      settings: {
        siteName: school.officialName,
        tagline: 'Unggul dalam Prestasi, Berkarakter, dan Berdaya Saing Global',
        description: `Website resmi ${school.officialName}.`,
        address: school.address || '',
        phone: school.phone || '',
        email: school.email || '',
        primaryColor: '#087F5B',
        secondaryColor: '#0CA678',
        fontFamily: 'Inter',
        seoTitle: `${school.officialName} - Website Resmi`,
        seoDescription: `Selamat datang di website resmi ${school.officialName}.`
      }
    });
  }

  // Ensure basic starter content entries if empty
  const existingEntries = await db.select().from(schema.contentEntries).where(eq(schema.contentEntries.siteId, site.id)).limit(1);
  if (existingEntries.length === 0) {
    await db.insert(schema.contentEntries).values([
      {
        siteId: site.id,
        type: 'hero_slide',
        title: `Selamat Datang di ${school.officialName}`,
        slug: 'slide-utama',
        sortOrder: 1,
        status: 'PUBLISHED',
        payload: {
          title: `Selamat Datang di ${school.officialName}`,
          subtitle: 'Membina Generasi Unggul, Cerdas, Berakhlak Mulia, dan Siap Menghadapi Masa Depan.',
          imageUrl: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=1600&h=800&fit=crop',
          ctaText: 'Daftar PPDB',
          ctaUrl: '#ppdb',
          isActive: true
        }
      },
      {
        siteId: site.id,
        type: 'vision_mission',
        entryKey: 'vision_mission',
        title: 'Visi dan Misi',
        status: 'PUBLISHED',
        payload: {
          visionTitle: 'Visi Sekolah',
          visionContent: `Terwujudnya ${school.officialName} sebagai lembaga pendidikan unggul yang mencetak lulusan berakhlak mulia dan berwawasan global.`,
          missionTitle: 'Misi Sekolah',
          missionItems: [
            'Menyelenggarakan pembelajaran aktif, inovatif, dan berpusat pada siswa.',
            'Menumbuhkan nilai-nilai budi pekerti, disiplin, dan religiusitas.',
            'Mengoptimalkan sarana dan prasarana penunjang kegiatan akademik dan non-akademik.'
          ]
        }
      }
    ]);
  }

  // Ensure default menu items if empty
  const existingMenus = await db.select().from(schema.menuItems).where(eq(schema.menuItems.siteId, site.id)).limit(1);
  if (existingMenus.length === 0) {
    await db.insert(schema.menuItems).values([
      { siteId: site.id, label: 'Beranda', linkType: 'section', target: '#hero', sortOrder: 1, location: 'header' },
      { siteId: site.id, label: 'Visi & Misi', linkType: 'section', target: '#vision', sortOrder: 2, location: 'header' },
      { siteId: site.id, label: 'Program', linkType: 'section', target: '#programs', sortOrder: 3, location: 'header' },
      { siteId: site.id, label: 'Kontak', linkType: 'section', target: '#contact', sortOrder: 4, location: 'header' }
    ]);
  }

  await logAuditEvent({
    actorUserId: userId,
    schoolId,
    action: 'ONBOARDING_COMPLETED',
    targetType: 'school',
    targetId: school.id
  });

  return { success: true, siteId: site.id };
}

export async function getOnboardingProgress(schoolId: string): Promise<OnboardingProgress> {
  const db = getDatabaseClient();

  const [school] = await db.select().from(schema.schools).where(eq(schema.schools.id, schoolId)).limit(1);
  if (!school) {
    throw new AppError('Sekolah tidak ditemukan.', 'SCHOOL_NOT_FOUND', 404);
  }

  const [site] = await db.select().from(schema.schoolSites).where(eq(schema.schoolSites.schoolId, schoolId)).limit(1);
  const [domain] = site ? await db.select().from(schema.siteDomains).where(eq(schema.siteDomains.siteId, site.id)).limit(1) : [null];
  const [settings] = site ? await db.select().from(schema.siteSettings).where(eq(schema.siteSettings.siteId, site.id)).limit(1) : [null];
  const entries = site ? await db.select().from(schema.contentEntries).where(eq(schema.contentEntries.siteId, site.id)) : [];
  const menus = site ? await db.select().from(schema.menuItems).where(eq(schema.menuItems.siteId, site.id)) : [];

  const hasProfile = Boolean(school.officialName && school.province && school.city);
  const hasSubdomain = Boolean(domain?.slug);
  const hasTemplate = Boolean(site?.templateVersionId);
  const hasLogo = Boolean((settings?.settings as any)?.logoUrl);
  const hasContact = Boolean((settings?.settings as any)?.phone || (settings?.settings as any)?.email);
  const hasHero = entries.some(e => e.type === 'hero_slide');
  const hasVisionMission = entries.some(e => e.type === 'vision_mission');
  const hasMenuItems = menus.length > 0;

  let step: 'PROFILE' | 'SUBDOMAIN' | 'TEMPLATE' | 'CMS' | 'PUBLISHED' = 'PROFILE';
  if (site?.status === 'PUBLISHED') {
    step = 'PUBLISHED';
  } else if (hasProfile && hasSubdomain && hasTemplate) {
    step = 'CMS';
  } else if (hasProfile && hasSubdomain) {
    step = 'TEMPLATE';
  } else if (hasProfile) {
    step = 'SUBDOMAIN';
  }

  return {
    step,
    schoolId: school.id,
    schoolName: school.officialName,
    slug: domain?.slug || null,
    siteId: site?.id || null,
    isPublished: site?.status === 'PUBLISHED',
    checklist: {
      hasProfile,
      hasSubdomain,
      hasTemplate,
      hasLogo,
      hasContact,
      hasHero,
      hasVisionMission,
      hasMenuItems
    }
  };
}

export async function getSiteActiveTemplate(siteId: string) {
  const db = getDatabaseClient();

  const [site] = await db
    .select({
      siteId: schema.schoolSites.id,
      schoolId: schema.schoolSites.schoolId,
      templateVersionId: schema.schoolSites.templateVersionId
    })
    .from(schema.schoolSites)
    .where(eq(schema.schoolSites.id, siteId))
    .limit(1);

  if (!site) {
    throw new AppError('Situs sekolah tidak ditemukan.', 'SITE_NOT_FOUND', 404);
  }

  const [templateVer] = await db
    .select({
      versionId: schema.templateVersions.id,
      templateId: schema.templates.id,
      templateKey: schema.templates.key,
      name: schema.templates.name,
      category: schema.templates.category,
      version: schema.templateVersions.version,
      manifest: schema.templateVersions.manifest
    })
    .from(schema.templateVersions)
    .innerJoin(schema.templates, eq(schema.templates.id, schema.templateVersions.templateId))
    .where(eq(schema.templateVersions.id, site.templateVersionId))
    .limit(1);

  if (!templateVer) {
    throw new AppError('Template situs tidak ditemukan atau belum dipilih.', 'TEMPLATE_NOT_FOUND', 404);
  }

  let manifest = templateVer.manifest as any;
  if (typeof manifest === 'string') {
    try {
      manifest = JSON.parse(manifest);
    } catch {
      manifest = {};
    }
  }

  // Fallback: If manifest.sections is empty, generate from supportedModules or filesystem manifest
  let sections = Array.isArray(manifest?.sections) && manifest.sections.length > 0 ? manifest.sections : [];
  if (sections.length === 0) {
    try {
      const fs = await import('node:fs');
      const path = await import('node:path');
      let rootDir = process.cwd();
      while (rootDir && rootDir !== path.dirname(rootDir)) {
        if (fs.existsSync(path.join(rootDir, 'pnpm-workspace.yaml'))) break;
        rootDir = path.dirname(rootDir);
      }
      const manifestFile = path.resolve(rootDir, 'templates', templateVer.templateKey, 'manifest.json');
      if (fs.existsSync(manifestFile)) {
        const fileContent = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
        if (Array.isArray(fileContent.sections)) {
          sections = fileContent.sections;
          manifest.sections = fileContent.sections;
        }
      }
    } catch {
      // Ignore file fallback error
    }
  }

  return {
    siteId: site.siteId,
    schoolId: site.schoolId,
    templateId: templateVer.templateId,
    templateVersionId: templateVer.versionId,
    templateKey: templateVer.templateKey,
    templateName: templateVer.name,
    category: templateVer.category,
    version: templateVer.version,
    manifest,
    sections,
    supportedModules: manifest?.supportedModules || [],
    themeFields: manifest?.themeFields || []
  };
}
