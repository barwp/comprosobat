import { getDatabaseClient, schema, eq, and, inArray, isNull } from '@sobatweb/database';
import { AppError } from '../middleware/error.js';
import { renderTemplate } from '@sobatweb/template-engine';
import { verifyPreviewToken } from './release.service.js';
import * as fs from 'node:fs';
import * as path from 'node:path';

export async function resolvePublicSiteByHostOrSlug(hostOrSlug: string) {
  const db = getDatabaseClient();

  // Normalize host / slug
  let cleanIdentifier = hostOrSlug.toLowerCase().trim().split(':')[0]; // strip port

  // If incoming full hostname like sman1.localhost or sman1.sobat.com
  const slugCandidate = cleanIdentifier.includes('.') ? cleanIdentifier.split('.')[0] : cleanIdentifier;

  // 1. Find domain record
  let domain = await db
    .select({
      id: schema.siteDomains.id,
      siteId: schema.siteDomains.siteId,
      slug: schema.siteDomains.slug,
      hostname: schema.siteDomains.hostname,
      status: schema.siteDomains.status,
      schoolId: schema.schoolSites.schoolId,
      siteStatus: schema.schoolSites.status,
      activeReleaseId: schema.schoolSites.activeReleaseId,
      templateVersionId: schema.schoolSites.templateVersionId,
      schoolName: schema.schools.officialName,
      schoolStatus: schema.schools.status
    })
    .from(schema.siteDomains)
    .innerJoin(schema.schoolSites, eq(schema.schoolSites.id, schema.siteDomains.siteId))
    .innerJoin(schema.schools, eq(schema.schools.id, schema.schoolSites.schoolId))
    .where(eq(schema.siteDomains.slug, slugCandidate))
    .limit(1);

  if (domain.length === 0) {
    // Try matching full hostname
    domain = await db
      .select({
        id: schema.siteDomains.id,
        siteId: schema.siteDomains.siteId,
        slug: schema.siteDomains.slug,
        hostname: schema.siteDomains.hostname,
        status: schema.siteDomains.status,
        schoolId: schema.schoolSites.schoolId,
        siteStatus: schema.schoolSites.status,
        activeReleaseId: schema.schoolSites.activeReleaseId,
        templateVersionId: schema.schoolSites.templateVersionId,
        schoolName: schema.schools.officialName,
        schoolStatus: schema.schools.status
      })
      .from(schema.siteDomains)
      .innerJoin(schema.schoolSites, eq(schema.schoolSites.id, schema.siteDomains.siteId))
      .innerJoin(schema.schools, eq(schema.schools.id, schema.schoolSites.schoolId))
      .where(eq(schema.siteDomains.hostname, cleanIdentifier))
      .limit(1);
  }

  if (domain.length === 0) {
    throw new AppError('Website sekolah tidak ditemukan.', 'TENANT_NOT_FOUND', 404);
  }

  const tenant = domain[0];

  if (tenant.schoolStatus === 'SUSPENDED') {
    throw new AppError('Akses website sekolah ini sedang ditangguhkan oleh Super Admin.', 'SCHOOL_SUSPENDED', 403);
  }

  if (tenant.siteStatus === 'DRAFT' || !tenant.activeReleaseId) {
    throw new AppError('Website sekolah ini belum dipublikasikan.', 'SITE_NOT_PUBLISHED', 404);
  }

  // Fetch active release snapshot with template details
  const [release] = await db
    .select({
      id: schema.publicationReleases.id,
      snapshotManifest: schema.publicationReleases.snapshotManifest,
      templateVersionId: schema.publicationReleases.templateVersionId,
      templateKey: schema.templates.key,
      version: schema.templateVersions.version
    })
    .from(schema.publicationReleases)
    .innerJoin(schema.templateVersions, eq(schema.templateVersions.id, schema.publicationReleases.templateVersionId))
    .innerJoin(schema.templates, eq(schema.templates.id, schema.templateVersions.templateId))
    .where(eq(schema.publicationReleases.id, tenant.activeReleaseId))
    .limit(1);

  if (!release) {
    throw new AppError('Data rilis aktif tidak ditemukan.', 'RELEASE_NOT_FOUND', 404);
  }

  return {
    tenant: {
      siteId: tenant.siteId,
      schoolId: tenant.schoolId,
      schoolName: tenant.schoolName,
      slug: tenant.slug
    },
    templateKey: release.templateKey,
    templateVersion: release.version,
    release: release.snapshotManifest as any
  };
}

export async function resolvePreviewSiteData(siteId: string) {
  const db = getDatabaseClient();

  const [site] = await db
    .select({
      siteId: schema.schoolSites.id,
      schoolId: schema.schoolSites.schoolId,
      templateVersionId: schema.schoolSites.templateVersionId,
      schoolName: schema.schools.officialName
    })
    .from(schema.schoolSites)
    .innerJoin(schema.schools, eq(schema.schools.id, schema.schoolSites.schoolId))
    .where(eq(schema.schoolSites.id, siteId))
    .limit(1);

  if (!site) {
    throw new AppError('Situs tidak ditemukan.', 'SITE_NOT_FOUND', 404);
  }

  const [templateVer] = await db
    .select({
      versionId: schema.templateVersions.id,
      templateKey: schema.templates.key,
      version: schema.templateVersions.version
    })
    .from(schema.templateVersions)
    .innerJoin(schema.templates, eq(schema.templates.id, schema.templateVersions.templateId))
    .where(eq(schema.templateVersions.id, site.templateVersionId))
    .limit(1);

  const [settingsRow] = await db.select().from(schema.siteSettings).where(eq(schema.siteSettings.siteId, siteId)).limit(1);
  const settings = settingsRow ? settingsRow.settings : {};

  const contentEntries = await db
    .select()
    .from(schema.contentEntries)
    .where(and(
      eq(schema.contentEntries.siteId, siteId),
      inArray(schema.contentEntries.status, ['DRAFT', 'PUBLISHED']),
      isNull(schema.contentEntries.deletedAt)
    ));

  const menuItems = await db
    .select()
    .from(schema.menuItems)
    .where(and(
      eq(schema.menuItems.siteId, siteId),
      eq(schema.menuItems.isActive, true)
    ));

  const mediaAssets = await db
    .select()
    .from(schema.mediaAssets)
    .where(and(
      eq(schema.mediaAssets.siteId, siteId),
      isNull(schema.mediaAssets.deletedAt)
    ));

  return {
    tenant: {
      siteId: site.siteId,
      schoolId: site.schoolId,
      schoolName: site.schoolName
    },
    preview: {
      templateKey: templateVer?.templateKey || 'man5-sleman',
      templateVersion: templateVer?.version || '1.0.0',
      settings,
      contentEntries,
      menuItems,
      mediaAssets
    }
  };
}

export function buildTemplateContextFromSnapshot(snapshot: any) {
  const settings = snapshot.settings || {};
  const entries: any[] = snapshot.contentEntries || [];
  const activeEntries = entries.filter(e => !e.deletedAt && e.status !== 'ARCHIVED');
  const menus: any[] = snapshot.menuItems || [];
  const mediaAssets: any[] = snapshot.mediaAssets || [];

  // Group modules from entries or directly from snapshot.modules
  const heroSlidesSource = (snapshot.modules?.hero_slides || activeEntries.filter(e => e.type === 'hero_slide').map(e => ({
    ...e.payload,
    title: e.payload?.title || e.title,
    sortOrder: e.sortOrder ?? e.payload?.sortOrder ?? 0
  })));
  const rawHeroList = Array.isArray(heroSlidesSource) ? heroSlidesSource : [heroSlidesSource];
  const normalizedHeroList = rawHeroList
    .filter((item: any) => item && item.isActive !== false)
    .sort((a: any, b: any) => (a.sortOrder || 0) - (b.sortOrder || 0))
    .map((item: any) => ({
      badge: item.badge || settings.sectionHeadlines?.hero?.badge || 'Sekolah Unggulan',
      title: item.title || settings.sectionHeadlines?.hero?.title || settings.siteName || 'Selamat Datang di Sekolah Kami',
      subtitle: item.subtitle || settings.sectionHeadlines?.hero?.subtitle || settings.tagline || settings.description || '',
      imageUrl: item.imageUrl || 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=1600&h=900&fit=crop',
      ctaText: item.ctaText || 'Daftar Sekarang',
      ctaUrl: item.ctaUrl || '#ppdb',
      ctaSecondaryText: item.ctaSecondaryText || 'Lihat Profil',
      ctaSecondaryUrl: item.ctaSecondaryUrl || '#profil',
      ...item
    }));

  const heroSlides = normalizedHeroList.length > 0 ? normalizedHeroList : [{
    badge: settings.sectionHeadlines?.hero?.badge || 'Sekolah Unggulan',
    title: settings.sectionHeadlines?.hero?.title || settings.siteName || 'Selamat Datang di Sekolah Kami',
    subtitle: settings.sectionHeadlines?.hero?.subtitle || settings.tagline || settings.description || 'Membentuk generasi cerdas, berakhlak mulia, dan berdaya saing global.',
    imageUrl: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=1600&h=900&fit=crop',
    ctaText: 'Daftar Sekarang',
    ctaUrl: '#ppdb',
    ctaSecondaryText: 'Lihat Profil',
    ctaSecondaryUrl: '#profil'
  }];
  const programs = snapshot.modules?.programs || entries.filter(e => e.type === 'program').map(e => e.payload);
  const facilitiesSource = snapshot.modules?.facilities || activeEntries.filter(e => e.type === 'facility').map(e => e.payload);
  const facilities = facilitiesSource.filter((item: any) => item.isActive !== false).map((item: any) => ({
    ...item,
    imageUrl: item.thumbnailUrl || item.imageUrl || '',
    thumbnailUrl: item.thumbnailUrl || item.imageUrl || ''
  }));
  const newsSource = snapshot.modules?.news || activeEntries.filter(e => e.type === 'news').map(e => ({
    ...e.payload,
    title: e.payload?.title || e.title,
    slug: e.slug || e.payload?.slug || ''
  }));
  const news = newsSource.filter((item: any) => item.isActive !== false).map((item: any) => ({
    ...item,
    slug: item.slug || slugify(item.title || 'berita'),
    url: `/berita/${item.slug || slugify(item.title || 'berita')}`,
    publishedAt: item.publishedAt || 'Draft terbaru'
  }));
  const visionMissionEntry = snapshot.modules?.vision_mission
    ? { payload: snapshot.modules.vision_mission }
    : activeEntries.filter(e => e.type === 'vision_mission').sort((a, b) => +new Date(b.updatedAt || b.createdAt) - +new Date(a.updatedAt || a.createdAt))[0];
  const statsEntry = snapshot.modules?.statistics ? { payload: snapshot.modules.statistics } : entries.find(e => e.type === 'history_statistic');
  const staffSource = snapshot.modules?.staff || activeEntries.filter(e => e.type === 'staff').map(e => e.payload);
  const staff = staffSource.filter((item: any) => item.isActive !== false)
    .sort((a: any, b: any) => (a.sortOrder || 0) - (b.sortOrder || 0))
    .map((item: any) => ({
      ...item,
      initials: String(item.name || 'G').split(/\s+/).slice(0, 2).map((part: string) => part[0]).join(''),
      photoUrl: item.photoUrl || ''
    }));
  const testimonialsSource = snapshot.modules?.testimonials || activeEntries.filter(e => e.type === 'testimonial').map(e => e.payload);
  const testimonials = testimonialsSource.filter((item: any) => item.isActive !== false).map((item: any) => ({
    ...item,
    name: item.name || item.alumniName || '',
    alumniName: item.alumniName || item.name || '',
    initials: String(item.name || item.alumniName || 'A').split(/\s+/).slice(0, 2).map((part: string) => part[0]).join(''),
    role: item.currentRole || item.role || 'Alumni',
    quote: item.quote || item.content || '',
    content: item.content || item.quote || '',
    photoUrl: item.photoUrl || ''
  }));
  const ppdbEntry = snapshot.modules?.ppdb ? { payload: snapshot.modules.ppdb } : entries.find(e => e.type === 'ppdb');
  const videoEntry = snapshot.modules?.video_profile ? { payload: snapshot.modules.video_profile } : entries.find(e => e.type === 'video_profile');
  const videoProfile = normalizeVideoProfile(videoEntry?.payload || {});
  const studentOrgsSource = snapshot.modules?.student_organizations || activeEntries.filter(e => e.type === 'student_organization' || e.type === 'student_orgs').map(e => e.payload);
  const student_organizations = studentOrgsSource.filter((item: any) => item.isActive !== false)
    .sort((a: any, b: any) => (a.sortOrder || 0) - (b.sortOrder || 0))
    .map((item: any) => ({
      ...item,
      name: item.name || item.title || '',
      category: item.category || 'Organisasi Siswa',
      description: item.description || '',
      logoUrl: item.logoUrl || item.imageUrl || '',
      badge: item.badge || item.category || 'Ekskul'
    }));
  const media = mediaAssets
    .filter((asset: any) => String(asset.mimeType || '').startsWith('image/'))
    .map((asset: any) => ({
      ...asset,
      url: `/api/v1/public/media/${asset.storageKey}`,
      alt: asset.altText || asset.filename || 'Galeri sekolah'
    }));
  const sortedMenus = [...menus].filter((item: any) => item.isActive !== false)
    .sort((a: any, b: any) => (a.sortOrder || 0) - (b.sortOrder || 0));

  const modules = {
      hero_slides: heroSlides,
      programs,
      facilities,
      news,
      vision_mission: normalizeVisionMission(visionMissionEntry?.payload || {}),
      statistics: normalizeHistoryStatistics(statsEntry?.payload || {}),
      staff,
      student_organizations,
      testimonials,
      ppdb: normalizePpdb(ppdbEntry?.payload || {}),
      video_profile: videoProfile,
      media
    };

    const rawHeadlines = (settings.sectionHeadlines || {}) as Record<string, any>;
    const defaultHeadlines: Record<string, { badge: string; title: string; description: string }> = {
      hero: { badge: 'Selamat Datang', title: 'Selamat Datang di Website Resmi', description: '' },
      programs: { badge: 'Pendidikan Unggulan', title: 'Program & Jurusan Unggulan', description: 'Program pendidikan berkualitas untuk mencetak lulusan berprestasi.' },
      facilities: { badge: 'Sarana Belajar', title: 'Fasilitas Kampus', description: 'Sarana dan prasarana modern untuk mendukung proses belajar mengajar.' },
      news: { badge: 'Informasi Terkini', title: 'Berita & Kegiatan', description: 'Kumpulan berita, kegiatan, dan pengumuman terbaru dari sekolah kami.' },
      vision_mission: { badge: 'Visi & Misi', title: 'Visi, Misi & Tujuan', description: 'Landasan dan arah perjuangan dalam membina generasi bangsa.' },
      staff: { badge: 'Tenaga Pendidik', title: 'Guru & Tenaga Kependidikan', description: 'Didukung oleh pendidik profesional dan berdedikasi tinggi.' },
      testimonials: { badge: 'Kata Alumni', title: 'Testimoni & Kisah Sukses', description: 'Apa kata para alumni mengenai pengalaman berharga mereka.' },
      student_orgs: { badge: 'Pengembangan Diri', title: 'Organisasi & Ekstrakurikuler', description: 'Wadah mengasah bakat, kepemimpinan, dan kreativitas siswa.' },
      statistics: { badge: 'Capaian Prestasi', title: 'Statistik & Prestasi Sekolah', description: 'Bukti dedikasi dan kualitas mutu pendidikan kami.' },
      ppdb: { badge: 'Penerimaan Siswa Baru', title: 'Pendaftaran PPDB Online', description: 'Bergabunglah bersama keluarga besar kami dan raih masa depan gemilang.' },
      contact: { badge: 'Hubungi Kami', title: 'Kontak & Lokasi Kampus', description: 'Kunjungi kampus kami atau hubungi kami melalui saluran resmi.' },
      video_profile: { badge: 'Video Profil', title: 'Mengenal Lebih Dekat', description: 'Tayangan profil singkat seputar lingkungan dan kegiatan sekolah.' }
    };

    const sectionHeadlines: Record<string, { badge: string; title: string; description: string }> = {};
    for (const [secKey, defVal] of Object.entries(defaultHeadlines)) {
      const userVal = rawHeadlines[secKey] || {};
      sectionHeadlines[secKey] = {
        badge: userVal.badge || defVal.badge,
        title: userVal.title || defVal.title,
        description: userVal.description || defVal.description
      };
    }
  const defaultNavMenus = [
    { label: 'Beranda', target: '#beranda', location: 'header', sortOrder: 1 },
    { label: 'Profil Sekolah', target: '#profil', location: 'header', sortOrder: 2 },
    { label: 'Program Unggulan', target: '#program', location: 'header', sortOrder: 3 },
    { label: 'Fasilitas', target: '#fasilitas', location: 'header', sortOrder: 4 },
    { label: 'Berita', target: '#berita', location: 'header', sortOrder: 5 },
    { label: 'Pendaftaran PPDB', target: '#ppdb', location: 'header', sortOrder: 6 },
    { label: 'Kontak', target: '#kontak', location: 'header', sortOrder: 7 }
  ];

  const rawHeader = sortedMenus.filter(m => m.location === 'header');
  const rawFooter = sortedMenus.filter(m => m.location === 'footer');

  return {
    site: {
      name: settings.siteName || 'Website Sekolah',
      tagline: settings.tagline || '',
      description: settings.description || '',
      logo: { url: settings.logoUrl || '', alt: settings.logoAlt || 'Logo Sekolah' },
      favicon: settings.faviconUrl || '',
      primaryColor: settings.primaryColor || '#1a6b2f',
      secondaryColor: settings.secondaryColor || '#c9a227',
      fontFamily: settings.fontFamily || 'Plus Jakarta Sans',
      contact: {
        address: settings.address || '',
        email: settings.email || '',
        phone: settings.phone || '',
        whatsapp: settings.whatsapp || '',
        whatsappUrl: settings.whatsapp ? `https://wa.me/${String(settings.whatsapp).replace(/\D/g, '').replace(/^0/, '62')}` : '',
        operationalHours: settings.operationalHours || 'Senin - Jumat: 07.00 - 15.30 WIB',
        googleMapsUrl: settings.googleMapsUrl || '',
        hasContent: Boolean(settings.address || settings.email || settings.phone || settings.whatsapp || settings.googleMapsUrl || settings.operationalHours)
      },
      social: settings.socialLinks || settings.social || {}
    },
    modules,
    sections: sectionHeadlines,
    // Backwards-compatible aliases for official templates using the old root paths.
    hero_slides: modules.hero_slides,
    programs: modules.programs,
    facilities: modules.facilities,
    news: modules.news,
    vision_mission: modules.vision_mission,
    statistics: modules.statistics,
    staff: modules.staff,
    student_organizations: modules.student_organizations,
    student_orgs: modules.student_organizations,
    testimonials: modules.testimonials,
    ppdb: modules.ppdb,
    video_profile: modules.video_profile,
    media: modules.media,
    navigation: {
      header: rawHeader.length > 0 ? rawHeader : defaultNavMenus,
      footer: rawFooter.length > 0 ? rawFooter : (rawHeader.length > 0 ? rawHeader : defaultNavMenus)
    },
    seo: {
      title: settings.seoTitle || settings.siteName,
      description: settings.seoDescription || settings.tagline,
      socialImage: settings.socialImage || settings.logoUrl
    }
  };
}

function normalizeVideoProfile(payload: any) {
  const videoUrl = String(payload.videoUrl || '').trim();
  return {
    ...payload,
    title: payload.title || 'Video Profil Sekolah',
    description: payload.description || '',
    videoUrl,
    embedUrl: toVideoEmbedUrl(videoUrl),
    hasVideo: payload.isActive !== false && Boolean(videoUrl)
  };
}

function toVideoEmbedUrl(value: string) {
  if (!value) return '';
  try {
    const url = new URL(value);
    if (url.hostname === 'youtu.be') return `https://www.youtube-nocookie.com/embed/${url.pathname.slice(1)}`;
    if (url.hostname.includes('youtube.com')) {
      const id = url.searchParams.get('v') || url.pathname.match(/\/(?:embed|shorts)\/([^/?]+)/)?.[1];
      return id ? `https://www.youtube-nocookie.com/embed/${id}` : '';
    }
    if (url.hostname.includes('vimeo.com')) {
      const id = url.pathname.match(/\/(\d+)/)?.[1];
      return id ? `https://player.vimeo.com/video/${id}` : '';
    }
  } catch {}
  return '';
}

function normalizeVisionMission(payload: any) {
  return {
    ...payload,
    visionTitle: payload.visionTitle || 'Visi Madrasah',
    visionContent: payload.visionContent || payload.vision || '',
    missionTitle: payload.missionTitle || 'Misi Utama',
    missionItems: payload.missionItems || payload.missions || []
  };
}

function normalizeHistoryStatistics(payload: any) {
  const defaultIcons = ['award', 'users', 'graduation-cap', 'trophy', 'book-open', 'check-circle'];
  const stats = (payload.stats || []).filter((item: any) => item.isActive !== false)
    .sort((a: any, b: any) => (a.sortOrder || 0) - (b.sortOrder || 0))
    .map((item: any, idx: number) => ({
      ...item,
      icon: item.icon || defaultIcons[idx % defaultIcons.length],
      value: `${item.rawValue ?? item.value ?? ''}${item.suffix || ''}`
    }));
  return { ...payload, stats };
}

function normalizePpdb(payload: any) {
  let resolvedCtaUrl = payload.ctaUrl || '';
  if (payload.formMode === 'whatsapp' && payload.whatsappNumber) {
    resolvedCtaUrl = `https://wa.me/${String(payload.whatsappNumber).replace(/\D/g, '').replace(/^0/, '62')}`;
  } else if (payload.formMode === 'internal' && !resolvedCtaUrl) {
    resolvedCtaUrl = '#ppdb-form';
  }
  return {
    ...payload,
    isActive: Object.keys(payload).length > 0 && payload.isActive !== false,
    ctaUrl: resolvedCtaUrl || '#ppdb-form',
    registrationPaths: (payload.registrationPaths || []).filter((item: any) => item.isActive !== false),
    requirements: payload.requirements || [],
    registrationSteps: payload.registrationSteps || [],
    showInternalForm: payload.formMode === 'internal',
    showExternalCta: payload.formMode !== 'internal'
  };
}

function slugify(value: string) {
  return value.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 180) || 'berita';
}
