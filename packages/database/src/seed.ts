import * as argon2 from 'argon2';
import { getDatabaseClient, getPgliteInstance } from './client.js';
import { runMigrations } from './migrate.js';
import * as schema from './schema/index.js';
import { eq } from 'drizzle-orm';

export async function runSeed() {
  console.log('🌱 Starting database seeding for multi-template demo & dummy accounts...');
  const pglite = getPgliteInstance();
  if (pglite?.waitReady) {
    await pglite.waitReady;
  }

  await runMigrations();

  const db = getDatabaseClient();

  // Clear existing content to ensure clean seed state
  try {
    await db.delete(schema.auditLogs);
    await db.delete(schema.releaseItems);
    await db.delete(schema.publicationReleases);
    await db.delete(schema.contentEntries);
    await db.delete(schema.menuItems);
    await db.delete(schema.siteSettings);
    await db.delete(schema.siteDomains);
    await db.delete(schema.schoolSites);
    await db.delete(schema.schoolMembers);
    await db.delete(schema.schools);
    await db.delete(schema.templateVersions);
    await db.delete(schema.templates);
    await db.delete(schema.users);
  } catch (err) {
    console.warn('⚠️ Warning during table cleanup:', err);
  }

  // 1. Seed Super Admin
  const superAdminEmail = process.env.SUPERADMIN_EMAIL || 'superadmin@sobat.com';
  const superAdminPassword = process.env.SUPERADMIN_PASSWORD || 'SuperAdminPassword123!';
  const superAdminHash = await argon2.hash(superAdminPassword);
  const commonSchoolPasswordHash = await argon2.hash('SchoolAdmin123!');

  await db.insert(schema.users).values({
    name: process.env.SUPERADMIN_NAME || 'Super Administrator',
    email: superAdminEmail,
    passwordHash: superAdminHash,
    platformRole: 'SUPER_ADMIN',
    status: 'ACTIVE',
    emailVerifiedAt: new Date()
  });
  console.log(`✅ Created Super Admin (${superAdminEmail})`);

  // 2. Seed Template 1: MAN 5 Sleman (Madrasah / Islamic)
  const man5Manifest = {
    schemaVersion: '1.0.0',
    templateKey: 'man5-sleman',
    name: 'Template Unggulan MAN 5 Sleman',
    version: '1.0.0',
    category: 'Madrasah / MA',
    entry: 'index.html',
    preview: 'assets/preview.webp',
    description: 'Template profil madrasah unggulan dengan nuansa hijau botol islami, aksen emas royal, dan integrasi penuh 13 modul CMS SobatWeb.',
    supportedModules: [
      'site_settings', 'hero_slides', 'programs', 'facilities', 'news', 'vision_mission',
      'statistics', 'staff', 'student_organizations', 'testimonials', 'ppdb', 'contact', 'navigation'
    ],
    sections: [
      { key: 'settings', module: 'site_settings', label: 'Pengaturan Situs & SEO', icon: '⚙️', path: '/dashboard/settings', order: 1 },
      { key: 'hero', module: 'hero_slides', label: 'Slide Beranda (Hero)', icon: '🖼️', path: '/dashboard/hero', order: 2 },
      { key: 'vision_mission', module: 'vision_mission', label: 'Visi, Misi & Nilai', icon: '🎯', path: '/dashboard/vision-mission', order: 3 },
      { key: 'statistics', module: 'statistics', label: 'Statistik & Prestasi', icon: '📈', path: '/dashboard/statistics', order: 4 },
      { key: 'programs', module: 'programs', label: 'Program Unggulan', icon: '🎓', path: '/dashboard/programs', order: 5 },
      { key: 'facilities', module: 'facilities', label: 'Fasilitas & Sarana', icon: '🏢', path: '/dashboard/facilities', order: 6 },
      { key: 'news', module: 'news', label: 'Berita & Pengumuman', icon: '📰', path: '/dashboard/news', order: 7 },
      { key: 'staff', module: 'staff', label: 'Guru & Staf Pendidik', icon: '👨‍🏫', path: '/dashboard/staff', order: 8 },
      { key: 'student_organizations', module: 'student_organizations', label: 'Organisasi & Ekskul', icon: '👥', path: '/dashboard/student-orgs', order: 9 },
      { key: 'testimonials', module: 'testimonials', label: 'Testimoni Alumni', icon: '💬', path: '/dashboard/testimonials', order: 10 },
      { key: 'ppdb', module: 'ppdb', label: 'Pendaftaran PPDB', icon: '📝', path: '/dashboard/ppdb', order: 11 },
      { key: 'contact', module: 'contact', label: 'Kontak & Alamat', icon: '📍', path: '/dashboard/contact', order: 12 },
      { key: 'navigation', module: 'navigation', label: 'Menu & Navigasi', icon: '🧭', path: '/dashboard/navigation', order: 13 }
    ],
    themeFields: [
      { key: 'primaryColor', label: 'Warna Primer', type: 'color', defaultValue: '#1a6b2f' },
      { key: 'secondaryColor', label: 'Warna Sekunder', type: 'color', defaultValue: '#c9a227' },
      { key: 'fontFamily', label: 'Font Utama', type: 'font', defaultValue: 'Plus Jakarta Sans' }
    ]
  };

  const [tplMan5] = await db.insert(schema.templates).values({
    key: 'man5-sleman',
    name: 'Template Unggulan MAN 5 Sleman',
    category: 'Madrasah / MA',
    status: 'ACTIVE'
  }).returning();

  const [tplMan5Ver] = await db.insert(schema.templateVersions).values({
    templateId: tplMan5.id,
    version: '1.0.0',
    schemaVersion: '1.0.0',
    manifest: man5Manifest,
    storagePath: 'templates/man5-sleman',
    checksum: 'sha256-man5-sleman-v1-official-template',
    validationStatus: 'VALID',
    isActive: true
  }).returning();

  // 3. Seed Template 2: School Modern (SMA / SMK Modern)
  const [tplModern] = await db.insert(schema.templates).values({
    key: 'school-modern',
    name: 'Template Modern SMA/SMK',
    category: 'SMA/SMK',
    status: 'ACTIVE'
  }).returning();

  const [tplModernVer] = await db.insert(schema.templateVersions).values({
    templateId: tplModern.id,
    version: '1.0.0',
    schemaVersion: '1.0.0',
    manifest: {
      templateKey: 'school-modern',
      name: 'Template Modern SMA/SMK',
      version: '1.0.0',
      category: 'SMA/SMK',
      description: 'Template modern dinamis dengan tata letak visual elegan, gradien kontemporer, dan dukungan penuh modul CMS SobatWeb.',
      entry: 'index.html',
      preview: 'assets/preview.webp',
      supportedModules: ['site_settings', 'hero_slides', 'programs', 'facilities', 'news', 'vision_mission', 'statistics', 'staff', 'student_organizations', 'testimonials', 'ppdb', 'contact', 'navigation', 'media'],
      sections: [
        { key: 'settings', module: 'site_settings', label: 'Pengaturan Situs & SEO', icon: '⚙️', path: '/dashboard/settings', order: 1 },
        { key: 'hero', module: 'hero_slides', label: 'Slide Beranda (Hero)', icon: '🖼️', path: '/dashboard/hero', order: 2 },
        { key: 'vision_mission', module: 'vision_mission', label: 'Visi & Misi Sekolah', icon: '🎯', path: '/dashboard/vision-mission', order: 3 },
        { key: 'programs', module: 'programs', label: 'Jurusan & Program Unggulan', icon: '🎓', path: '/dashboard/programs', order: 4 },
        { key: 'facilities', module: 'facilities', label: 'Fasilitas & Lab Sekolah', icon: '🏢', path: '/dashboard/facilities', order: 5 },
        { key: 'news', module: 'news', label: 'Berita & Pengumuman', icon: '📰', path: '/dashboard/news', order: 6 },
        { key: 'staff', module: 'staff', label: 'Guru & Tenaga Pendidik', icon: '👨‍🏫', path: '/dashboard/staff', order: 7 },
        { key: 'testimonials', module: 'testimonials', label: 'Testimoni & Prestasi Alumni', icon: '💬', path: '/dashboard/testimonials', order: 8 },
        { key: 'ppdb', module: 'ppdb', label: 'Informasi PPDB Online', icon: '📝', path: '/dashboard/ppdb', order: 9 },
        { key: 'contact', module: 'contact', label: 'Kontak & Lokasi Kampus', icon: '📍', path: '/dashboard/contact', order: 10 },
        { key: 'navigation', module: 'navigation', label: 'Menu & Navigasi', icon: '🧭', path: '/dashboard/navigation', order: 11 }
      ],
      themeFields: [
        { key: 'primaryColor', label: 'Warna Primer', type: 'color', defaultValue: '#087F5B' },
        { key: 'secondaryColor', label: 'Warna Sekunder', type: 'color', defaultValue: '#0CA678' },
        { key: 'fontFamily', label: 'Font Utama', type: 'font', defaultValue: 'Inter' }
      ]
    },
    storagePath: 'templates/school-modern',
    checksum: 'sha256-school-modern-v1-official-template',
    validationStatus: 'VALID',
    isActive: true
  }).returning();

  // 4. Seed Template 3: School Classic (Akademik Klasik)
  const [tplClassic] = await db.insert(schema.templates).values({
    key: 'school-classic',
    name: 'Template Klasik Akademik',
    category: 'Akademik & Tradisional',
    status: 'ACTIVE'
  }).returning();

  const [tplClassicVer] = await db.insert(schema.templateVersions).values({
    templateId: tplClassic.id,
    version: '1.0.0',
    schemaVersion: '1.0.0',
    manifest: {
      templateKey: 'school-classic',
      name: 'Template Klasik Akademik',
      version: '1.0.0',
      category: 'Akademik & Tradisional',
      description: 'Template bernuansa akademik klasik dengan warna navy wibawa, kartu staf terstruktur, dan tata letak institusional resmi.',
      entry: 'index.html',
      preview: 'assets/preview.webp',
      supportedModules: ['site_settings', 'hero_slides', 'programs', 'facilities', 'news', 'vision_mission', 'statistics', 'staff', 'testimonials', 'contact', 'navigation', 'media'],
      sections: [
        { key: 'settings', module: 'site_settings', label: 'Pengaturan Situs & SEO', icon: '⚙️', path: '/dashboard/settings', order: 1 },
        { key: 'hero', module: 'hero_slides', label: 'Slide Beranda (Hero)', icon: '🖼️', path: '/dashboard/hero', order: 2 },
        { key: 'vision_mission', module: 'vision_mission', label: 'Visi, Misi & Sejarah', icon: '🎯', path: '/dashboard/vision-mission', order: 3 },
        { key: 'programs', module: 'programs', label: 'Program Akademik', icon: '🎓', path: '/dashboard/programs', order: 4 },
        { key: 'facilities', module: 'facilities', label: 'Fasilitas Kampus', icon: '🏢', path: '/dashboard/facilities', order: 5 },
        { key: 'news', module: 'news', label: 'Warta Akademik', icon: '📰', path: '/dashboard/news', order: 6 },
        { key: 'staff', module: 'staff', label: 'Dewan Guru & Pendidik', icon: '👨‍🏫', path: '/dashboard/staff', order: 7 },
        { key: 'testimonials', module: 'testimonials', label: 'Alumni Berprestasi', icon: '💬', path: '/dashboard/testimonials', order: 8 },
        { key: 'contact', module: 'contact', label: 'Kontak & Sekretariat', icon: '📍', path: '/dashboard/contact', order: 9 },
        { key: 'navigation', module: 'navigation', label: 'Menu & Navigasi', icon: '🧭', path: '/dashboard/navigation', order: 10 }
      ],
      themeFields: [
        { key: 'primaryColor', label: 'Warna Primer (Navy)', type: 'color', defaultValue: '#1E3A8A' },
        { key: 'secondaryColor', label: 'Warna Sekunder (Biru)', type: 'color', defaultValue: '#3B82F6' },
        { key: 'fontFamily', label: 'Font Utama', type: 'font', defaultValue: 'Poppins' }
      ]
    },
    storagePath: 'templates/school-classic',
    checksum: 'sha256-school-classic-v1-official-template',
    validationStatus: 'VALID',
    isActive: true
  }).returning();

  // 5. Seed Template 4: School Vocational (SMK Vokasi & Kejuruan)
  const [tplVocational] = await db.insert(schema.templates).values({
    key: 'school-vocational',
    name: 'Template SMK Vokasi & Kejuruan',
    category: 'SMK / Vokasi',
    status: 'ACTIVE'
  }).returning();

  const [tplVocationalVer] = await db.insert(schema.templateVersions).values({
    templateId: tplVocational.id,
    version: '1.0.0',
    schemaVersion: '1.0.0',
    manifest: {
      templateKey: 'school-vocational',
      name: 'Template SMK Vokasi & Kejuruan',
      version: '1.0.0',
      category: 'SMK / Vokasi',
      description: 'Template modern kejuruan dengan aksen amber/indigo berenergi tinggi, fokus pada program keahlian, teaching factory, dan sertifikasi industri.',
      entry: 'index.html',
      preview: 'assets/preview.webp',
      supportedModules: ['site_settings', 'hero_slides', 'programs', 'facilities', 'news', 'vision_mission', 'statistics', 'staff', 'student_organizations', 'testimonials', 'ppdb', 'video_profile', 'contact', 'navigation', 'media'],
      sections: [
        { key: 'settings', module: 'site_settings', label: 'Pengaturan Situs & SEO', icon: '⚙️', path: '/dashboard/settings', order: 1 },
        { key: 'hero', module: 'hero_slides', label: 'Slide Beranda (Hero)', icon: '🖼️', path: '/dashboard/hero', order: 2 },
        { key: 'vision_mission', module: 'vision_mission', label: 'Visi, Misi & Sasaran Mutu', icon: '🎯', path: '/dashboard/vision-mission', order: 3 },
        { key: 'statistics', module: 'statistics', label: 'Statistik & Capaian Lulusan', icon: '📈', path: '/dashboard/statistics', order: 4 },
        { key: 'programs', module: 'programs', label: 'Konsentrasi & Kompetensi Keahlian', icon: '🎓', path: '/dashboard/programs', order: 5 },
        { key: 'facilities', module: 'facilities', label: 'Bengkel & Laboratorium Praktik', icon: '🏢', path: '/dashboard/facilities', order: 6 },
        { key: 'news', module: 'news', label: 'Berita & Info Industri', icon: '📰', path: '/dashboard/news', order: 7 },
        { key: 'staff', module: 'staff', label: 'Instruktur & Guru Kejuruan', icon: '👨‍🏫', path: '/dashboard/staff', order: 8 },
        { key: 'student_organizations', module: 'student_organizations', label: 'Unit Kegiatan & Komunitas', icon: '👥', path: '/dashboard/student-orgs', order: 9 },
        { key: 'testimonials', module: 'testimonials', label: 'Alumni Sukses & Mitra Industri', icon: '💬', path: '/dashboard/testimonials', order: 10 },
        { key: 'ppdb', module: 'ppdb', label: 'Penerimaan Siswa Baru (PPDB)', icon: '📝', path: '/dashboard/ppdb', order: 11 },
        { key: 'video_profile', module: 'video_profile', label: 'Video Teaching Factory', icon: '🎬', path: '/dashboard/contact', order: 12 },
        { key: 'contact', module: 'contact', label: 'Kontak & BKK Sekolah', icon: '📍', path: '/dashboard/contact', order: 13 },
        { key: 'navigation', module: 'navigation', label: 'Menu & Navigasi', icon: '🧭', path: '/dashboard/navigation', order: 14 }
      ],
      themeFields: [
        { key: 'primaryColor', label: 'Warna Primer (Amber)', type: 'color', defaultValue: '#d97706' },
        { key: 'secondaryColor', label: 'Warna Sekunder (Indigo)', type: 'color', defaultValue: '#4f46e5' },
        { key: 'fontFamily', label: 'Font Utama', type: 'font', defaultValue: 'Plus Jakarta Sans' }
      ]
    },
    storagePath: 'templates/school-vocational',
    checksum: 'sha256-school-vocational-v1-official-template',
    validationStatus: 'VALID',
    isActive: true
  }).returning();

  // 6. Seed Template 5: School Pesantren (Pesantren & Islamic Boarding)
  const [tplPesantren] = await db.insert(schema.templates).values({
    key: 'school-pesantren',
    name: 'Template Pesantren & Islamic Boarding',
    category: 'Pesantren / Boarding School',
    status: 'ACTIVE'
  }).returning();

  const [tplPesantrenVer] = await db.insert(schema.templateVersions).values({
    templateId: tplPesantren.id,
    version: '1.0.0',
    schemaVersion: '1.0.0',
    manifest: {
      templateKey: 'school-pesantren',
      name: 'Template Pesantren & Islamic Boarding',
      version: '1.0.0',
      category: 'Pesantren / Boarding School',
      description: 'Template elegan bernuansa islami pesantren modern dengan palet deep teal & bronze, fokus pada pembinaan santri, kepesantrenan, tahfidz, dan bahasa.',
      entry: 'index.html',
      preview: 'assets/preview.webp',
      supportedModules: ['site_settings', 'hero_slides', 'programs', 'facilities', 'news', 'vision_mission', 'statistics', 'staff', 'student_organizations', 'testimonials', 'ppdb', 'video_profile', 'contact', 'navigation', 'media'],
      sections: [
        { key: 'settings', module: 'site_settings', label: 'Pengaturan Situs & SEO', icon: '⚙️', path: '/dashboard/settings', order: 1 },
        { key: 'hero', module: 'hero_slides', label: 'Slide Beranda (Hero)', icon: '🖼️', path: '/dashboard/hero', order: 2 },
        { key: 'vision_mission', module: 'vision_mission', label: 'Visi, Misi & Panca Jiwa', icon: '🎯', path: '/dashboard/vision-mission', order: 3 },
        { key: 'statistics', module: 'statistics', label: 'Statistik Santri & Prestasi', icon: '📈', path: '/dashboard/statistics', order: 4 },
        { key: 'programs', module: 'programs', label: 'Program Unggulan & Kepesantrenan', icon: '🎓', path: '/dashboard/programs', order: 5 },
        { key: 'facilities', module: 'facilities', label: 'Sarana Asrama & Kampus', icon: '🏢', path: '/dashboard/facilities', order: 6 },
        { key: 'news', module: 'news', label: 'Warta Pesantren & Kegiatan', icon: '📰', path: '/dashboard/news', order: 7 },
        { key: 'staff', module: 'staff', label: 'Masyayikh & Asatidz', icon: '👨‍🏫', path: '/dashboard/staff', order: 8 },
        { key: 'student_organizations', module: 'student_organizations', label: 'Organisasi Santri (OPPM/OSIS)', icon: '👥', path: '/dashboard/student-orgs', order: 9 },
        { key: 'testimonials', module: 'testimonials', label: 'Kisah Alumni & Kiprah Santri', icon: '💬', path: '/dashboard/testimonials', order: 10 },
        { key: 'ppdb', module: 'ppdb', label: 'Pendaftaran Santri Baru (PSB)', icon: '📝', path: '/dashboard/ppdb', order: 11 },
        { key: 'video_profile', module: 'video_profile', label: 'Video Dokumenter Pesantren', icon: '🎬', path: '/dashboard/contact', order: 12 },
        { key: 'contact', module: 'contact', label: 'Kontak & Sekretariat PSB', icon: '📍', path: '/dashboard/contact', order: 13 },
        { key: 'navigation', module: 'navigation', label: 'Menu & Navigasi', icon: '🧭', path: '/dashboard/navigation', order: 14 }
      ],
      themeFields: [
        { key: 'primaryColor', label: 'Warna Primer (Deep Teal)', type: 'color', defaultValue: '#0f766e' },
        { key: 'secondaryColor', label: 'Warna Sekunder (Bronze)', type: 'color', defaultValue: '#d97706' },
        { key: 'fontFamily', label: 'Font Utama', type: 'font', defaultValue: 'Plus Jakarta Sans' }
      ]
    },
    storagePath: 'templates/school-pesantren',
    checksum: 'sha256-school-pesantren-v1-official-template',
    validationStatus: 'VALID',
    isActive: true
  }).returning();

  console.log('✅ All 5 Official Templates seeded (man5-sleman, school-modern, school-classic, school-vocational, school-pesantren)');

  const baseDomain = process.env.BASE_DOMAIN || 'localhost:3005';

  // =========================================================================
  // HELPER FUNCTION: Seed Populated School
  // =========================================================================
  async function seedPopulatedSchool(opts: {
    adminName: string;
    adminEmail: string;
    schoolName: string;
    npsn: string;
    level: 'MADRASAH' | 'SMA' | 'SMK';
    province: string;
    city: string;
    address: string;
    phone: string;
    email: string;
    slug: string;
    templateVerId: string;
    settings: any;
    hero: any;
    vision: any;
    programs: any[];
    facilities: any[];
    news: any[];
    staff: any[];
    testimonials: any[];
    ppdb?: any;
    statistics?: any;
    videoProfile?: any;
    studentOrgs?: any[];
    releaseSummary: string;
  }) {
    const [user] = await db.insert(schema.users).values({
      name: opts.adminName,
      email: opts.adminEmail,
      passwordHash: commonSchoolPasswordHash,
      platformRole: 'SCHOOL_ADMIN',
      status: 'ACTIVE',
      emailVerifiedAt: new Date()
    }).returning();

    const [school] = await db.insert(schema.schools).values({
      officialName: opts.schoolName,
      npsn: opts.npsn,
      educationLevel: opts.level,
      schoolType: 'NEGERI',
      province: opts.province,
      city: opts.city,
      address: opts.address,
      phone: opts.phone,
      email: opts.email,
      status: 'ACTIVE'
    }).returning();

    await db.insert(schema.schoolMembers).values({
      schoolId: school.id,
      userId: user.id,
      role: 'SCHOOL_ADMIN'
    });

    const [site] = await db.insert(schema.schoolSites).values({
      schoolId: school.id,
      templateVersionId: opts.templateVerId,
      status: 'PUBLISHED',
      publishedAt: new Date()
    }).returning();

    await db.insert(schema.siteDomains).values({
      siteId: site.id,
      type: 'SUBDOMAIN',
      slug: opts.slug,
      hostname: `${opts.slug}.${baseDomain}`,
      isPrimary: true,
      status: 'ACTIVE'
    });

    await db.insert(schema.siteSettings).values({
      siteId: site.id,
      settings: opts.settings
    });

    // Hero
    await db.insert(schema.contentEntries).values({
      siteId: site.id,
      type: 'hero_slide',
      title: opts.hero.title,
      slug: `hero-${opts.slug}`,
      status: 'PUBLISHED',
      sortOrder: 1,
      payload: opts.hero
    });

    // Vision Mission
    await db.insert(schema.contentEntries).values({
      siteId: site.id,
      type: 'vision_mission',
      title: 'Visi & Misi',
      slug: `visi-misi-${opts.slug}`,
      status: 'PUBLISHED',
      payload: opts.vision
    });

    // Programs
    for (let i = 0; i < opts.programs.length; i++) {
      await db.insert(schema.contentEntries).values({
        siteId: site.id,
        type: 'program',
        title: opts.programs[i].title,
        slug: `program-${i + 1}`,
        status: 'PUBLISHED',
        sortOrder: i + 1,
        payload: opts.programs[i]
      });
    }

    // Facilities
    for (let i = 0; i < opts.facilities.length; i++) {
      await db.insert(schema.contentEntries).values({
        siteId: site.id,
        type: 'facility',
        title: opts.facilities[i].name,
        slug: `fasilitas-${i + 1}`,
        status: 'PUBLISHED',
        sortOrder: i + 1,
        payload: opts.facilities[i]
      });
    }

    // News
    for (let i = 0; i < opts.news.length; i++) {
      await db.insert(schema.contentEntries).values({
        siteId: site.id,
        type: 'news',
        title: opts.news[i].title,
        slug: opts.news[i].slug,
        status: 'PUBLISHED',
        sortOrder: i + 1,
        payload: opts.news[i]
      });
    }

    // Staff
    for (let i = 0; i < opts.staff.length; i++) {
      await db.insert(schema.contentEntries).values({
        siteId: site.id,
        type: 'staff',
        title: opts.staff[i].name,
        slug: `staff-${i + 1}`,
        status: 'PUBLISHED',
        sortOrder: i + 1,
        payload: opts.staff[i]
      });
    }

    // Testimonials
    for (let i = 0; i < opts.testimonials.length; i++) {
      await db.insert(schema.contentEntries).values({
        siteId: site.id,
        type: 'testimonial',
        title: opts.testimonials[i].alumniName || opts.testimonials[i].name,
        slug: `testimoni-${i + 1}`,
        status: 'PUBLISHED',
        sortOrder: i + 1,
        payload: opts.testimonials[i]
      });
    }

    // PPDB
    if (opts.ppdb) {
      await db.insert(schema.contentEntries).values({
        siteId: site.id,
        type: 'ppdb',
        title: 'Informasi PPDB Online',
        slug: 'ppdb-info',
        status: 'PUBLISHED',
        payload: opts.ppdb
      });
    }

    // Statistics
    const statsData = opts.statistics || {
      establishmentYear: '1985',
      historyTitle: `Sejarah & Perjalanan ${opts.schoolName}`,
      historySummary: `Didirikan dengan komitmen memberikan pendidikan unggul dan berkarakter, ${opts.schoolName} telah berkembang menjadi salah satu institusi pendidikan terpercaya dan berprestasi di tingkat nasional.`,
      accreditation: 'A (Unggul)',
      stats: [
        { label: 'Siswa Aktif', value: '1.250+', sortOrder: 1 },
        { label: 'Guru & Pendidik', value: '72+', sortOrder: 2 },
        { label: 'Kelulusan PTN/Karir', value: '98.5%', sortOrder: 3 },
        { label: 'Piala Prestasi', value: '150+', sortOrder: 4 }
      ]
    };
    await db.insert(schema.contentEntries).values({
      siteId: site.id,
      type: 'history_statistic',
      title: 'Statistik & Sejarah Sekolah',
      slug: 'statistik-sejarah',
      status: 'PUBLISHED',
      payload: statsData
    });

    // Video Profile
    const videoData = opts.videoProfile || {
      title: `Profil Singkat ${opts.schoolName}`,
      description: 'Kenali lingkungan belajar, fasilitas modern, serta budaya prestasi kami melalui tayangan profil resmi.',
      videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
    };
    await db.insert(schema.contentEntries).values({
      siteId: site.id,
      type: 'video_profile',
      title: 'Video Profil Sekolah',
      slug: 'video-profil',
      status: 'PUBLISHED',
      payload: videoData
    });

    // Student Organizations
    const studentOrgsData = opts.studentOrgs || [
      { name: 'OSIS / MPK', category: 'Organisasi Siswa', description: 'Wadah kepemimpinan, musyawarah, dan koordinasi seluruh aktivitas siswa di sekolah.' },
      { name: 'Pramuka & PMR', category: 'Kepanduan & Kemanusiaan', description: 'Pembinaan karakter disiplin, kemandirian, kepemimpinan lapangan, dan pertolongan pertama.' },
      { name: 'Klub Robotika & IT', category: 'Sains & Teknologi', description: 'Pengembangan skill programming, robotika, IoT, dan kompetisi inovasi digital.' },
      { name: 'KIR & Jurnalistik', category: 'Literasi & Riset', description: 'Wadah karya tulis ilmiah, majalah sekolah, fotografi, dan peliputan kegiatan.' }
    ];
    for (let i = 0; i < studentOrgsData.length; i++) {
      await db.insert(schema.contentEntries).values({
        siteId: site.id,
        type: 'student_organization',
        title: studentOrgsData[i].name,
        slug: `organisasi-${i + 1}`,
        status: 'PUBLISHED',
        sortOrder: i + 1,
        payload: studentOrgsData[i]
      });
    }

    // Navigation Menus
    const headerMenus = [
      { label: 'Beranda', target: '#hero', location: 'header' as const, sortOrder: 1, linkType: 'section' as const },
      { label: 'Visi & Misi', target: '#profil', location: 'header' as const, sortOrder: 2, linkType: 'section' as const },
      { label: 'Program', target: '#jurusan', location: 'header' as const, sortOrder: 3, linkType: 'section' as const },
      { label: 'Fasilitas', target: '#fasilitas', location: 'header' as const, sortOrder: 4, linkType: 'section' as const },
      { label: 'Berita', target: '#berita', location: 'header' as const, sortOrder: 5, linkType: 'section' as const },
      { label: 'Guru & Staf', target: '#guru', location: 'header' as const, sortOrder: 6, linkType: 'section' as const },
      { label: 'Ekskul', target: '#ekskul', location: 'header' as const, sortOrder: 7, linkType: 'section' as const },
      { label: 'Kontak', target: '#kontak', location: 'header' as const, sortOrder: 8, linkType: 'section' as const }
    ];
    for (const m of headerMenus) {
      await db.insert(schema.menuItems).values({
        siteId: site.id,
        label: m.label,
        target: m.target,
        linkType: m.linkType,
        location: m.location,
        sortOrder: m.sortOrder,
        isActive: true
      });
    }

    const footerMenus = [
      { label: 'Beranda Utama', target: '#hero', location: 'footer' as const, sortOrder: 1, linkType: 'section' as const },
      { label: 'Visi Misi Sekolah', target: '#profil', location: 'footer' as const, sortOrder: 2, linkType: 'section' as const },
      { label: 'Program Unggulan', target: '#jurusan', location: 'footer' as const, sortOrder: 3, linkType: 'section' as const },
      { label: 'Fasilitas Kampus', target: '#fasilitas', location: 'footer' as const, sortOrder: 4, linkType: 'section' as const },
      { label: 'Pendaftaran PPDB', target: '#ppdb', location: 'footer' as const, sortOrder: 5, linkType: 'section' as const }
    ];
    for (const m of footerMenus) {
      await db.insert(schema.menuItems).values({
        siteId: site.id,
        label: m.label,
        target: m.target,
        linkType: m.linkType,
        location: m.location,
        sortOrder: m.sortOrder,
        isActive: true
      });
    }

    // Snapshot Manifest
    const snapshotManifest = {
      settings: opts.settings,
      modules: {
        hero_slides: [opts.hero],
        vision_mission: opts.vision,
        statistics: statsData,
        programs: opts.programs,
        facilities: opts.facilities,
        news: opts.news,
        staff: opts.staff,
        student_organizations: studentOrgsData,
        testimonials: opts.testimonials,
        ppdb: opts.ppdb || { isOpen: true, title: 'PPDB Online' },
        video_profile: videoData
      },
      navigation: { header: headerMenus, footer: footerMenus }
    };

    const [rel] = await db.insert(schema.publicationReleases).values({
      siteId: site.id,
      templateVersionId: opts.templateVerId,
      versionNumber: 1,
      status: 'ACTIVE',
      summary: opts.releaseSummary,
      snapshotManifest,
      createdBy: user.id
    }).returning();

    await db.update(schema.schoolSites).set({
      activeReleaseId: rel.id
    }).where(eq(schema.schoolSites.id, site.id));

    console.log(`✅ [Populated] Seeded ${opts.schoolName} (${opts.adminEmail}) -> http://localhost:3005/?slug=${opts.slug}`);
  }

  // =========================================================================
  // HELPER FUNCTION: Seed Fresh / Empty School
  // =========================================================================
  async function seedEmptySchool(opts: {
    adminName: string;
    adminEmail: string;
    schoolName: string;
    npsn: string;
    level: 'MADRASAH' | 'SMA' | 'SMK';
    province: string;
    city: string;
    address: string;
    phone: string;
    email: string;
    slug: string;
    templateVerId: string;
    siteName: string;
    tagline: string;
    primaryColor: string;
    secondaryColor: string;
  }) {
    const [user] = await db.insert(schema.users).values({
      name: opts.adminName,
      email: opts.adminEmail,
      passwordHash: commonSchoolPasswordHash,
      platformRole: 'SCHOOL_ADMIN',
      status: 'ACTIVE',
      emailVerifiedAt: new Date()
    }).returning();

    const [school] = await db.insert(schema.schools).values({
      officialName: opts.schoolName,
      npsn: opts.npsn,
      educationLevel: opts.level,
      schoolType: 'SWASTA',
      province: opts.province,
      city: opts.city,
      address: opts.address,
      phone: opts.phone,
      email: opts.email,
      status: 'ACTIVE'
    }).returning();

    await db.insert(schema.schoolMembers).values({
      schoolId: school.id,
      userId: user.id,
      role: 'SCHOOL_ADMIN'
    });

    const [site] = await db.insert(schema.schoolSites).values({
      schoolId: school.id,
      templateVersionId: opts.templateVerId,
      status: 'DRAFT'
    }).returning();

    await db.insert(schema.siteDomains).values({
      siteId: site.id,
      type: 'SUBDOMAIN',
      slug: opts.slug,
      hostname: `${opts.slug}.${baseDomain}`,
      isPrimary: true,
      status: 'ACTIVE'
    });

    await db.insert(schema.siteSettings).values({
      siteId: site.id,
      settings: {
        siteName: opts.siteName,
        tagline: opts.tagline,
        description: `Website profil resmi ${opts.schoolName}.`,
        primaryColor: opts.primaryColor,
        secondaryColor: opts.secondaryColor,
        address: opts.address,
        phone: opts.phone,
        email: opts.email,
        operationalHours: 'Senin - Jumat: 07:00 - 15:30 WIB'
      }
    });

    console.log(`✅ [Fresh/Empty] Seeded ${opts.schoolName} (${opts.adminEmail}) -> Dashboard Draft`);
  }

  // =========================================================================
  // 1. MAN 5 SLEMAN (Template: man5-sleman)
  // =========================================================================
  await seedPopulatedSchool({
    adminName: 'Drs. H. Ahmad Fauzi, M.Pd.',
    adminEmail: 'admin.man5sleman@sobat.com',
    schoolName: 'MAN 5 Sleman',
    npsn: '20401122',
    level: 'MADRASAH',
    province: 'D.I. Yogyakarta',
    city: 'Kab. Sleman',
    address: 'Gendol, Sumberejo, Tempel, Kabupaten Sleman, Daerah Istimewa Yogyakarta 55552',
    phone: '(0274) 868423',
    email: 'info@man5sleman.sch.id',
    slug: 'man5sleman',
    templateVerId: tplMan5Ver.id,
    releaseSummary: 'Rilis Perdana Website Resmi MAN 5 Sleman',
    settings: {
      siteName: 'MAN 5 Sleman',
      tagline: 'Madrasah Aliyah Negeri Unggul - Ikhlas Beramal',
      description: 'Website Resmi Madrasah Aliyah Negeri 5 Sleman - Unggul dalam Ilmu, Mulia dalam Akhlak, Kompetitif di Dunia Global.',
      logoUrl: 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=200&h=200&fit=crop',
      faviconUrl: 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=64&h=64&fit=crop',
      primaryColor: '#1a6b2f',
      secondaryColor: '#c9a227',
      fontFamily: 'Plus Jakarta Sans',
      address: 'Gendol, Sumberejo, Tempel, Kabupaten Sleman, Daerah Istimewa Yogyakarta 55552',
      phone: '(0274) 868423 / +62 812-3456-7890',
      email: 'info@man5sleman.sch.id',
      operationalHours: 'Senin - Jumat: 07.00 - 15.30 WIB',
      sectionHeadlines: {
        hero: { badge: 'Selamat Datang', title: "Mencetak Generasi Qur'ani, Berakhlak & Berprestasi" },
        facilities: { badge: 'Infrastruktur Madrasah', title: 'Galeri Fasilitas Madrasah' },
        news: { badge: 'Informasi Terkini', title: 'Berita, Prestasi & Pengumuman' },
        programs: { badge: 'Program Madrasah', title: 'Program & Jurusan Unggulan' },
        vision_mission: { badge: 'Visi & Misi', title: 'Komitmen & Visi Madrasah' }
      }
    },
    hero: {
      title: "Mencetak Generasi Qur'ani, Berakhlak & Berprestasi",
      subtitle: 'Selamat datang di website resmi MAN 5 Sleman — memadukan keunggulan sains teknologi, bahasa, dan nilai-nilai keislaman untuk mencetak kader pemimpin masa depan yang berdaya saing global.',
      imageUrl: 'https://images.unsplash.com/photo-1742549586702-c23994895082?w=1600&h=900&fit=crop',
      ctaText: 'Daftar PPDB 2026/2027',
      ctaUrl: '#ppdb'
    },
    vision: {
      vision: "Menjadi Madrasah Unggul, Kompetitif, dan Berwawasan Lingkungan yang Mampu Mencetak Generasi Qur'ani, Berakhlak Mulia, serta Berprestasi di Tingkat Nasional dan Internasional."
    },
    programs: [
      { title: "Tahfidz Al-Qur'an", category: "Spiritual & Qur'ani", description: "Program intensif hafalan Al-Qur'an 30 Juz dengan sanad bersertifikasi dan muroja'ah berkala." },
      { title: 'Madrasah Riset & Sains', category: 'Sains & Inovasi', description: 'Laboratorium riset terpadu membimbing karya ilmiah remaja (KIR) dan olimpiade KSM/OSN.' },
      { title: 'Kelas Bahasa & Diplomasi', category: 'Komunikasi Global', description: 'Penguasaan aktif Bahasa Arab dan Bahasa Inggris melalui Arabic/English Day dan debat internasional.' },
      { title: 'Teknologi & Multimedia', category: 'Skill & Karir', description: 'Pengembangan keterampilan coding, desain grafis, editing video, dan kewirausahaan digital.' }
    ],
    facilities: [
      { name: 'Laboratorium Sains & Komputer', category: 'Akademik', description: 'Dilengkapi perangkat PC spesifikasi tinggi, internet cepat fiber optic, dan mikroskop elektron.', imageUrl: 'https://images.unsplash.com/photo-1562774053-701939374585?w=800&h=500&fit=crop' },
      { name: 'Perpustakaan Digital Nurul Ilmi', category: 'Literasi', description: 'Koleksi ribuan buku fisik dan e-book interaktif dengan ruang baca nyaman ber-AC.', imageUrl: 'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?w=800&h=500&fit=crop' },
      { name: 'Masjid & Pusat Studi Islam', category: 'Ibadah', description: 'Pusat pembinaan ibadah sholat dhuha berjamaah, mentoring tahfidz, dan kajian keislaman harian.', imageUrl: 'https://images.unsplash.com/photo-1542816417-0983c9c9ad53?w=800&h=500&fit=crop' }
    ],
    news: [
      { title: 'Siswa MAN 5 Sleman Raih Medali Emas Olimpiade Sains Nasional 2026', slug: 'medali-emas-osn-2026', category: 'Prestasi', summary: 'Prestasi gemilang dipersembahkan oleh ananda Muhammad Ihsan pada bidang Biologi Terapan.', coverImageUrl: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=800&h=500&fit=crop', publishedAt: '01 September 2026' },
      { title: 'Pembukaan Pendaftaran PPDB Jalur Prestasi dan Tahfidz Tahun Ajaran Baru', slug: 'pembukaan-ppdb-2026', category: 'Pengumuman', summary: 'MAN 5 Sleman resmi membuka penerimaan peserta didik baru dengan kuota beasiswa penuh.', coverImageUrl: 'https://images.unsplash.com/photo-1577896851231-70ef18881754?w=800&h=500&fit=crop', publishedAt: '28 Agustus 2026' }
    ],
    staff: [
      { name: 'Drs. H. Ahmad Fauzi, M.Pd.', role: 'Kepala Madrasah', subject: 'Manajemen Pendidikan', photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=400&fit=crop' },
      { name: 'Dra. Siti Aminah, M.Si.', role: 'Waka Kurikulum', subject: 'Biologi & Riset', photoUrl: 'https://images.unsplash.com/photo-1580894732483-363495d4f1eb?w=400&h=400&fit=crop' }
    ],
    testimonials: [
      { alumniName: 'Fatimah Az-Zahra, S.Ked.', graduationYear: '2020', content: 'Program Riset dan Tahfidz di MAN 5 Sleman membentuk kedisiplinan dan rasa percaya diri saya hingga tembus Fakultas Kedokteran.' },
      { alumniName: 'Rifqi Pratama, S.T.', graduationYear: '2019', content: 'Bimbingan para guru sangat tulus. Fasilitas lab komputer dan dukungan robotika memberi pondasi teknik yang sangat kuat.' }
    ],
    ppdb: {
      isOpen: true,
      title: 'Penerimaan Peserta Didik Baru (PPDB) 2026/2027',
      startDate: '2026-05-01',
      endDate: '2026-07-15'
    }
  });

  // Empty Account Template 1: MA Al-Hikmah
  await seedEmptySchool({
    adminName: 'Admin MA Al-Hikmah',
    adminEmail: 'admin.alhikmah@sobat.com',
    schoolName: 'Madrasah Aliyah Al-Hikmah',
    npsn: '20409988',
    level: 'MADRASAH',
    province: 'Jawa Tengah',
    city: 'Kab. Magelang',
    address: 'Jl. Pemuda No. 12, Magelang',
    phone: '(0293) 362100',
    email: 'kontak@maalhikmah.sch.id',
    slug: 'ma-alhikmah',
    templateVerId: tplMan5Ver.id,
    siteName: 'MA Al-Hikmah Magelang',
    tagline: 'Berilmu, Beriman, Berakhlakul Karimah',
    primaryColor: '#1a6b2f',
    secondaryColor: '#c9a227'
  });

  // =========================================================================
  // 2. SMK TELKOM DIGITAL (Template: school-modern)
  // =========================================================================
  await seedPopulatedSchool({
    adminName: 'Budi Santoso, S.Kom., M.T.',
    adminEmail: 'admin.smktelkom@sobat.com',
    schoolName: 'SMK Telkom Digital Nusantara',
    npsn: '20405566',
    level: 'SMK',
    province: 'Jawa Barat',
    city: 'Kota Bandung',
    address: 'Jl. Telekomunikasi No. 01, Terusan Buahbatu, Bandung 40257',
    phone: '(022) 7564108',
    email: 'info@smktelkom-digital.sch.id',
    slug: 'smk-telkom',
    templateVerId: tplModernVer.id,
    releaseSummary: 'Peluncuran Website Resmi SMK Telkom Digital',
    settings: {
      siteName: 'SMK Telkom Digital',
      tagline: 'Center of Digital Excellence & Technology Innovators',
      description: 'SMK Pusat Keunggulan Bidang Rekayasa Perangkat Lunak, Cyber Security, Cloud Computing, dan Animasi 3D berstandar industri internasional.',
      primaryColor: '#087F5B',
      secondaryColor: '#0CA678',
      fontFamily: 'Inter',
      address: 'Jl. Telekomunikasi No. 01, Terusan Buahbatu, Bandung 40257',
      phone: '(022) 7564108 / +62 813-9876-5432',
      email: 'info@smktelkom-digital.sch.id',
      operationalHours: 'Senin - Jumat: 07.30 - 16.30 WIB',
      sectionHeadlines: {
        hero: { badge: 'SMK Pusat Keunggulan', title: 'Mencetak Talenta Digital Siap Kerja & Berdaya Saing Global' },
        facilities: { badge: 'Sarana Belajar & Lab', title: 'Fasilitas Lab Industri Modern' },
        news: { badge: 'Kabar & Prestasi', title: 'Warta Inovasi & Berita Teknologi' },
        programs: { badge: 'Konsentrasi Keahlian', title: 'Jurusan & Program Unggulan' },
        vision_mission: { badge: 'Visi Masa Depan', title: 'Visi & Misi Kejuruan Modern' },
        staff: { badge: 'Praktisi & Pendidik', title: 'Instruktur & Guru Profesional' },
        testimonials: { badge: 'Jejak Alumni Tech', title: 'Kisah Sukses Alumni di Startup & Unicorn' }
      }
    },
    hero: {
      title: 'Mencetak Talenta Digital Siap Kerja & Berdaya Saing Global',
      subtitle: 'SMK Telkom Digital Nusantara menghadirkan kurikulum berbasis industri teknologi terkini, sertifikasi internasional Cisco & AWS, serta jaminan penyaluran kerja di ekosistem digital terkemuka.',
      imageUrl: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?w=1600&h=900&fit=crop',
      ctaText: 'Daftar Online PPDB',
      ctaUrl: '#ppdb'
    },
    vision: {
      vision: 'Menjadi institusi pendidikan vokasi teknologi digital terdepan di Asia Tenggara yang melahirkan lulusan berkompetensi tinggi, berjiwa technopreneur, dan adaptif terhadap revolusi industri.'
    },
    programs: [
      { title: 'Software Engineering (RPL)', category: 'Teknologi Informasi', description: 'Fokus pengembangan Web Fullstack, Mobile Apps (Flutter/React Native), DevOps, dan Microservices Architecture.' },
      { title: 'Cyber Security & Network', category: 'Keamanan Jaringan', description: 'Penguasaan Network Infrastructure, Ethical Hacking, Cloud Security, dan Sertifikasi Cisco CCNA.' },
      { title: '3D Animation & Game Dev', category: 'Kreatif & Game', description: 'Pelatihan 3D Modeling (Blender/Maya), Unreal Engine, Game Design, dan pipeline produksi animasi komersial.' },
      { title: 'Digital Business & Marketing', category: 'E-Commerce', description: 'Strategi Growth Marketing, Data Analytics, SEO/SEM, UI/UX Research, dan Manajemen Toko Daring.' }
    ],
    facilities: [
      { name: 'Apple iOS & Flutter Dev Lab', category: 'Laboratorium', description: '40 unit iMac M3 dengan lingkungan pengembangan Xcode resmi dan server pengujian cloud internal.', imageUrl: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800&h=500&fit=crop' },
      { name: 'Cyber Defense & NOC Center', category: 'Security Center', description: 'Pusat monitoring simulator jaringan pertahanan siber berstandar Security Operation Center (SOC).', imageUrl: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800&h=500&fit=crop' },
      { name: 'Studio Motion Capture & Rendering', category: 'Multimedia', description: 'Dilengkapi green screen interaktif, mo-cap suit profesional, dan GPU render farm NVIDIA RTX.', imageUrl: 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?w=800&h=500&fit=crop' }
    ],
    news: [
      { title: 'Tim Siswa SMK Telkom Menjuarai National Hackathon Competition 2026', slug: 'juara-hackathon-2026', category: 'Prestasi', summary: 'Aplikasi AI deteksi hama tanaman buatan tim CyberCraft meraih penghargaan inovasi terbaik tingkat nasional.', coverImageUrl: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=800&h=500&fit=crop', publishedAt: '02 September 2026' },
      { title: 'MoU Penyaluran Kerja dengan 25 Perusahaan Startup Teknologi Unicorn', slug: 'mou-startup-2026', category: 'Kerjasama', summary: 'Seluruh siswa kelas XII terjamin magang berbayar dan fast-track rekrutmen kerja setelah lulus.', coverImageUrl: 'https://images.unsplash.com/photo-1515187029135-18ee286d815b?w=800&h=500&fit=crop', publishedAt: '30 Agustus 2026' }
    ],
    staff: [
      { name: 'Budi Santoso, S.Kom., M.T.', role: 'Kepala Sekolah', subject: 'Computer Science', photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop' },
      { name: 'Maya Paramitha, M.Cs.', role: 'Head of Software Lab', subject: 'Web & Cloud Architecture', photoUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&h=400&fit=crop' }
    ],
    testimonials: [
      { alumniName: 'Andi Wicaksono', graduationYear: '2022', content: 'Berkat portofolio dan bimbingan lab di SMK Telkom, saya diterima sebagai Software Engineer di unicorn teknologi sebelum wisuda kelulusan.' },
      { alumniName: 'Denny Setiawan', graduationYear: '2021', content: 'Kurikulum praktis dan bimbingan mentor industri sangat relevan dengan kebutuhan dunia kerja saat ini.' }
    ],
    ppdb: {
      isOpen: true,
      title: 'Penerimaan Siswa Baru Gelombang 1 TA 2026/2027',
      startDate: '2026-04-01',
      endDate: '2026-06-30'
    }
  });

  // Empty Account Template 2: SMA Modern Cakrawala
  await seedEmptySchool({
    adminName: 'Admin SMA Cakrawala',
    adminEmail: 'admin.cakrawala@sobat.com',
    schoolName: 'SMA Modern Cakrawala',
    npsn: '20407788',
    level: 'SMA',
    province: 'Banten',
    city: 'Kota Tangerang Selatan',
    address: 'Jl. Cakrawala Raya Blok B No. 8, BSD City',
    phone: '(021) 5389000',
    email: 'info@smacakrawala.sch.id',
    slug: 'sma-cakrawala',
    templateVerId: tplModernVer.id,
    siteName: 'SMA Modern Cakrawala',
    tagline: 'Inspiring Minds, Shaping Tomorrow',
    primaryColor: '#087F5B',
    secondaryColor: '#0CA678'
  });

  // =========================================================================
  // 3. SMA NEGERI 1 PRESTASI BANGSA (Template: school-classic)
  // =========================================================================
  await seedPopulatedSchool({
    adminName: 'Prof. Dr. Ir. H. Bambang Suryono, M.Pd.',
    adminEmail: 'admin.sman1@sobat.com',
    schoolName: 'SMA Negeri 1 Prestasi Bangsa',
    npsn: '20403344',
    level: 'SMA',
    province: 'DKI Jakarta',
    city: 'Jakarta Pusat',
    address: 'Jl. Diponegoro No. 45, Menteng, Jakarta Pusat 10310',
    phone: '(021) 3192456',
    email: 'sekretariat@sman1prestasibangsa.sch.id',
    slug: 'sman1prestasi',
    templateVerId: tplClassicVer.id,
    releaseSummary: 'Publikasi Portal Akademik SMA Negeri 1 Prestasi Bangsa',
    settings: {
      siteName: 'SMAN 1 Prestasi Bangsa',
      tagline: 'Tradisi Keunggulan Akademik & Karakter Pemimpin Negeri',
      description: 'Sekolah Menengah Atas Unggulan Nasional dengan rekam jejak kelulusan tertinggi di perguruan tinggi negeri terbaik dan beasiswa prestisius luar negeri.',
      primaryColor: '#1E3A8A',
      secondaryColor: '#3B82F6',
      fontFamily: 'Poppins',
      address: 'Jl. Diponegoro No. 45, Menteng, Jakarta Pusat 10310',
      phone: '(021) 3192456 / +62 811-2233-4455',
      email: 'sekretariat@sman1prestasibangsa.sch.id',
      operationalHours: 'Senin - Jumat: 07:00 - 16:00 WIB',
      sectionHeadlines: {
        hero: { badge: 'Akademik Unggulan', title: 'Menegakkan Tradisi Intelektual, Moralitas, dan Kepemimpinan Bangsa' },
        facilities: { badge: 'Sarana Kampus', title: 'Fasilitas & Kampus Akademik' },
        news: { badge: 'Warta Kampus', title: 'Warta Prestasi & Buletin Akademik' },
        programs: { badge: 'Jalur Pendidikan', title: 'Program Akademik & Peminatan' },
        vision_mission: { badge: 'Visi Mulia', title: 'Visi, Misi & Landasan Historis' },
        staff: { badge: 'Dewan Pendidik', title: 'Tenaga Pengajar Magister & Doktor' },
        testimonials: { badge: 'Alumni Sukses', title: 'Kiprah Para Alumni di Tingkat Nasional & Global' }
      }
    },
    hero: {
      title: 'Menegakkan Tradisi Intelektual, Moralitas, dan Kepemimpinan Bangsa',
      subtitle: 'SMA Negeri 1 Prestasi Bangsa berkomitmen membina insan cendekia yang berintegritas tinggi, berwawasan global, dan siap menjadi garda terdepan pembangunan peradaban nusantara.',
      imageUrl: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=1600&h=900&fit=crop',
      ctaText: 'Pelajari Program Akademik',
      ctaUrl: '#program'
    },
    vision: {
      vision: 'Terwujudnya sekolah teladan nasional yang unggul dalam prestasi akademik dan non-akademik, berlandaskan budi pekerti luhur, berwawasan kebangsaan, dan berdaya saing internasional.'
    },
    programs: [
      { title: 'MIPA Riset & Olimpiade', category: 'Sains & Matematika', description: 'Pembinaan intensif persiapan Olimpiade Sains Nasional (OSN) dan International Science Olympiad (IPhO, IBO, IChO).' },
      { title: 'IPS Humaniora & Diplomasi', category: 'Sosial & Hukum', description: 'Kurikulum komprehensif kajian ekonomi makro, geopolitik, debat parlemen, dan Model United Nations (MUN).' },
      { title: 'Kelas Akselerasi & Cambridge', category: 'Kurikulum Internasional', description: 'Program penyelesaian studi cepat dan persiapan sertifikasi Cambridge A-Level untuk universitas global (Ivy League/Oxbridge).' }
    ],
    facilities: [
      { name: 'Laboratorium Bioteknologi & Fisika Modern', category: 'Sains Terpadu', description: 'Fasilitas riset presisi tinggi untuk eksperimen DNA, spektroskopi cahaya, dan uji laboratorium terakreditasi.', imageUrl: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800&h=500&fit=crop' },
      { name: 'Auditorium & Teater Budaya', category: 'Kesenian', description: 'Gedung pertunjukan akustik megah dengan kapasitas 1.200 kursi untuk seminar internasional dan konser seni.', imageUrl: 'https://images.unsplash.com/photo-1511578314322-379afb476865?w=800&h=500&fit=crop' },
      { name: 'Stadion Olahraga & Kolam Renang Standar FINA', category: 'Olahraga', description: 'Pusat kebugaran lengkap dengan lintasan atletik sintetis, lapangan tenis, dan kolam renang Olimpiade.', imageUrl: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&h=500&fit=crop' }
    ],
    news: [
      { title: '100% Lulusan 2026 Diterima di PTN Terbaik (UI, ITB, UGM) dan Luar Negeri', slug: 'kelulusan-ptn-2026', category: 'Kelulusan', summary: 'Sebanyak 320 siswa angkatan ke-58 mencatatkan rekor penerimaan SNBP dan SNBT dengan rata-rata nilai tertinggi se-DKI Jakarta.', coverImageUrl: 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=800&h=500&fit=crop', publishedAt: '01 September 2026' },
      { title: 'Delegasi Siswa Meraih Outstanding Delegate pada Harvard National Model UN', slug: 'delegasi-harvard-mun', category: 'Internasional', summary: 'Kiprah gemilang delegasi debat SMA Negeri 1 Prestasi Bangsa di Boston, Amerika Serikat.', coverImageUrl: 'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=800&h=500&fit=crop', publishedAt: '25 Agustus 2026' }
    ],
    staff: [
      { name: 'Prof. Dr. Ir. H. Bambang Suryono, M.Pd.', role: 'Kepala Sekolah', subject: 'Fisika & Kebijakan Pendidikan', photoUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop' },
      { name: 'Dra. Hj. Ratna Juwita, M.Hum.', role: 'Waka Kesiswaan', subject: 'Sastra & Diplomasi', photoUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=400&fit=crop' }
    ],
    testimonials: [
      { alumniName: 'dr. Satria Wibawa, Sp.B.', graduationYear: '2015', content: 'Disiplin dan standar akademik tinggi di SMAN 1 Prestasi Bangsa membentuk mentalitas tangguh yang sangat berharga dalam menempuh pendidikan spesialis bedah di FKUI.' },
      { alumniName: 'Clara Indrawati, LL.M.', graduationYear: '2017', content: 'Tradisi debat dan penelitian yang dibiasakan sejak SMA membimbing saya menyelesaikan Master of Laws di Leiden University.' }
    ]
  });

  // Empty Account Template 3: SMA Budi Luhur Heritage
  await seedEmptySchool({
    adminName: 'Admin SMA Budi Luhur',
    adminEmail: 'admin.budiluhur@sobat.com',
    schoolName: 'SMA Budi Luhur Heritage',
    npsn: '20402211',
    level: 'SMA',
    province: 'Jawa Tengah',
    city: 'Kota Surakarta',
    address: 'Jl. Slamet Riyadi No. 120, Surakarta',
    phone: '(0271) 714500',
    email: 'info@budiluhur-heritage.sch.id',
    slug: 'sma-budiluhur',
    templateVerId: tplClassicVer.id,
    siteName: 'SMA Budi Luhur Surakarta',
    tagline: 'Membangun Karakter Luhur dan Berbudi Pekerti',
    primaryColor: '#1E3A8A',
    secondaryColor: '#3B82F6'
  });

  // =========================================================================
  // 6. POPULATED & EMPTY ACCOUNTS: TEMPLATE 4 (school-vocational)
  // =========================================================================
  await seedPopulatedSchool({
    adminName: 'Ir. Hendro Wijaya, M.T.',
    adminEmail: 'admin.smkvokasi@sobat.com',
    schoolName: 'SMK Negeri 1 Vokasi Industri',
    npsn: '20405566',
    level: 'SMK',
    province: 'Jawa Timur',
    city: 'Kota Surabaya',
    address: 'Kawasan Industri Rungkut No. 88, Surabaya 60293',
    phone: '(031) 8439900',
    email: 'humas@smkn1vokasi.sch.id',
    slug: 'smk-vokasi',
    templateVerId: tplVocationalVer.id,
    releaseSummary: 'Publikasi Portal SMK Negeri 1 Vokasi Industri Surabaya',
    settings: {
      siteName: 'SMKN 1 Vokasi Industri',
      tagline: 'Pusat Keunggulan Vokasi & Teaching Factory Bersertifikasi Internasional',
      description: 'SMK Pusat Keunggulan dengan kemitraan 150+ industri terkemuka nasional dan multinasional, menjamin keterserapan kerja dan wirausaha berdaya saing global.',
      primaryColor: '#d97706',
      secondaryColor: '#4f46e5',
      fontFamily: 'Plus Jakarta Sans',
      address: 'Kawasan Industri Rungkut No. 88, Surabaya 60293',
      phone: '(031) 8439900 / +62 813-8899-0011',
      email: 'humas@smkn1vokasi.sch.id',
      operationalHours: 'Senin - Jumat: 07:00 - 17:00 WIB',
      sectionHeadlines: {
        hero: { badge: 'Vokasi Masa Depan', title: 'Mencetak Tenaga Ahli Kejuruan Terampil, Adaptif, dan Siap Kerja' },
        facilities: { badge: 'Bengkel & Lab', title: 'Fasilitas Praktik Standar Industri 4.0' },
        news: { badge: 'Warta Vokasi', title: 'Kabar Teaching Factory & Kerjasama Industri' },
        programs: { badge: 'Keahlian Industri', title: 'Konsentrasi Keahlian Unggulan' },
        vision_mission: { badge: 'Visi Kejuruan', title: 'Visi, Misi & Sasaran Mutu Vokasi' },
        staff: { badge: 'Instruktur Ahli', title: 'Pendidik & Praktisi Industri Tersertifikasi' },
        student_orgs: { badge: 'Unit Kreatif', title: 'Komunitas Riset & Ekstrakurikuler Siswa' },
        testimonials: { badge: 'Kisah Sukses', title: 'Jejak Karir Alumni di Industri Multinasional' },
        ppdb: { badge: 'PPDB Vokasi 2026', title: 'Penerimaan Peserta Didik Baru Jalur Industri' }
      }
    },
    hero: {
      title: 'Mencetak Tenaga Ahli Kejuruan Terampil, Adaptif, dan Siap Kerja',
      subtitle: 'Kurikulum berbasis proyek (PBL) dan magang industri terstruktur selama 1 tahun di Jepang dan Jerman.',
      imageUrl: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=1600&h=900&fit=crop',
      ctaText: 'Daftar PPDB Vokasi',
      ctaUrl: '#ppdb'
    },
    vision: {
      vision: 'Menjadi pusat pendidikan kejuruan terdepan di Asia Tenggara yang menghasilkan teknisi profesional berintegritas tinggi dan berdaya saing global.'
    },
    programs: [
      { title: 'Teknik Mekatronika & Robotika', category: 'Teknologi & Rekayasa', description: 'Penguasaan automasi industri, PLC programming, robot industri FANUC, dan sensor presisi.' },
      { title: 'Rekayasa Perangkat Lunak & AI', category: 'Teknologi Informasi', description: 'Pengembangan web skala enterprise, machine learning, mobile app development, dan cloud computing.' },
      { title: 'Teknik Pemesinan CNC & 3D Prototyping', category: 'Manufaktur Modern', description: 'Pengoperasian mesin CNC 5-Axis, perancangan CAD/CAM, dan manufaktur presisi aerospace.' }
    ],
    facilities: [
      { name: 'Pusat Teaching Factory & Machining Center', category: 'Bengkel Produksi', description: 'Lini produksi komponen otomotif bekerja sama langsung dengan PT Astra Otoparts Tbk.', imageUrl: 'https://images.unsplash.com/photo-1581092335397-9583fe92d232?w=800&h=500&fit=crop' },
      { name: 'Laboratorium Cyber Security & Data Center', category: 'Lab Komputer', description: 'Fasilitas server tier-3 dan simulasi pengujian penetrasi keamanan siber perbankan.', imageUrl: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800&h=500&fit=crop' }
    ],
    news: [
      { title: 'SMKN 1 Vokasi Ekspor 50.000 Komponen Presisi ke Manufaktur Otomotif Jepang', slug: 'ekspor-komponen-jepang-2026', category: 'Teaching Factory', summary: 'Hasil produksi siswa mekatronika dan CNC berhasil menembus standar kualitas ekspor pasar internasional.', coverImageUrl: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=800&h=500&fit=crop', publishedAt: '30 Agustus 2026' }
    ],
    staff: [
      { name: 'Ir. Hendro Wijaya, M.T.', role: 'Kepala Sekolah', subject: 'Manajemen Rekayasa Vokasi', photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop' },
      { name: 'Aris Wicaksono, S.T., M.Kom.', role: 'Kepala Bengkel CNC', subject: 'Pemesinan Presisi & CAD/CAM', photoUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop' }
    ],
    testimonials: [
      { alumniName: 'Bagus Prakoso, S.Tr.T.', graduationYear: '2021', content: 'Belajar langsung di Teaching Factory SMKN 1 Vokasi membuat saya langsung direkrut sebagai Automation Engineer di Toyota Motor Mfg Indonesia.' }
    ]
  });

  // Empty Account Template 4: SMK Karya Kreatif
  await seedEmptySchool({
    adminName: 'Admin SMK Karya Kreatif',
    adminEmail: 'admin.kreatif@sobat.com',
    schoolName: 'SMK Karya Kreatif Digital',
    npsn: '20408899',
    level: 'SMK',
    province: 'Jawa Barat',
    city: 'Kota Bandung',
    address: 'Jl. Dago Asri No. 44, Bandung',
    phone: '(022) 2501234',
    email: 'info@karyakreatif.sch.id',
    slug: 'smk-karyakreatif',
    templateVerId: tplVocationalVer.id,
    siteName: 'SMK Karya Kreatif Digital Bandung',
    tagline: 'Inovasi Vokasi dan Kreativitas Digital Masa Depan',
    primaryColor: '#d97706',
    secondaryColor: '#4f46e5'
  });

  // =========================================================================
  // 7. POPULATED & EMPTY ACCOUNTS: TEMPLATE 5 (school-pesantren)
  // =========================================================================
  await seedPopulatedSchool({
    adminName: 'K.H. Ahmad Dahlan, Lc., M.A.',
    adminEmail: 'admin.pesantren@sobat.com',
    schoolName: 'Pondok Pesantren Darussalam Modern',
    npsn: '69901122',
    level: 'MADRASAH',
    province: 'Jawa Timur',
    city: 'Kabupaten Ponorogo',
    address: 'Jl. Raya Siman No. 1, Siman, Ponorogo 63471',
    phone: '(0352) 481234',
    email: 'sekretariat@darussalam-pesantren.ac.id',
    slug: 'pesantren-darussalam',
    templateVerId: tplPesantrenVer.id,
    releaseSummary: 'Publikasi Portal Resmi Pondok Pesantren Darussalam Modern',
    settings: {
      siteName: 'Pesantren Darussalam Modern',
      tagline: 'Mencetak Santri Berakhlak Karimah, Berwawasan Global & Berjiwa Pemimpin',
      description: 'Lembaga pendidikan islam terpadu yang memadukan kedalaman ilmu salafiah (Kulliyatul Muallimin Al-Islamiyah), hafalan Al-Qur\'an 30 juz, serta penguasaan aktif Bahasa Arab & Inggris.',
      primaryColor: '#0f766e',
      secondaryColor: '#d97706',
      fontFamily: 'Plus Jakarta Sans',
      address: 'Jl. Raya Siman No. 1, Siman, Ponorogo 63471',
      phone: '(0352) 481234 / +62 811-9988-7766',
      email: 'sekretariat@darussalam-pesantren.ac.id',
      operationalHours: 'Senin - Ahad: 08:00 - 21:00 WIB',
      sectionHeadlines: {
        hero: { badge: 'Pesantren Unggulan', title: 'Mendidik Kader Ulama dan Pemimpin Umat yang Berkarakter Qur\'ani' },
        facilities: { badge: 'Sarana Kampus', title: 'Asrama, Masjid Megah & Fasilitas Santri' },
        news: { badge: 'Warta Pesantren', title: 'Kajian Ilmiah, Haflah & Prestasi Santri' },
        programs: { badge: 'Kulliyatul Muallimin', title: 'Program Pendidikan & Kepesantrenan' },
        vision_mission: { badge: 'Panca Jiwa', title: 'Visi, Misi & Landasan Falsafah Pesantren' },
        staff: { badge: 'Dewan Asatidz', title: 'Masyayikh & Asatidz Pembina Santri' },
        student_orgs: { badge: 'Organisasi Santri', title: 'OPPM & Pembinaan Kepemimpinan Santri' },
        testimonials: { badge: 'Kiprah Santri', title: 'Pengabdian dan Jejak Alumni di Pelosok Negeri' },
        ppdb: { badge: 'PSB 2026/2027', title: 'Pendaftaran Santri Baru (PSB) Online' }
      }
    },
    hero: {
      title: 'Mendidik Kader Ulama dan Pemimpin Umat yang Berkarakter Qur\'ani',
      subtitle: 'Memadukan tradisi keilmuan Islam klasik dengan sains modern dan penguasaan bahasa internasional selama 24 jam.',
      imageUrl: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=1600&h=900&fit=crop',
      ctaText: 'Daftar Santri Baru (PSB)',
      ctaUrl: '#ppdb'
    },
    vision: {
      vision: 'Terwujudnya pusat kaderisasi ulama yang menguasai ilmu agama mendalam, berjiwa ikhlas, mandiri, dan istiqomah dalam dakwah risalah Islam rahmatan lil alamin.'
    },
    programs: [
      { title: 'Kulliyatul Muallimin Al-Islamiyah (KMI)', category: 'Kepesantrenan 6 Tahun', description: 'Kurikulum tarbiyah islamiyah komprehensif mencakup Dirasah Islamiyah, Nahwu-Shorof, Ushul Fiqih, Balaghah, dan Mantiq.' },
      { title: 'Tahfidzul Qur\'an Mutqin 30 Juz', category: 'Tahfidz & Sanad', description: 'Bimbingan intensif setoran hafalan dengan sanad bacaan bersambung hingga Rasulullah SAW.' },
      { title: 'Bilingual Immersion (Arab & Inggris)', category: 'Bahasa Internasional', description: 'Lingkungan percakapan 24 jam aktif dengan pidato tiga bahasa (muhadharah) mingguan.' }
    ],
    facilities: [
      { name: 'Masjid Jami\' Baitul Muttaqin (Kapasitas 5.000 Santri)', category: 'Pusat Ibadah', description: 'Pusat ibadah shalat berjamaah 5 waktu, kajian kitab kuning ba\'da subuh, dan muhasabah malam.', imageUrl: 'https://images.unsplash.com/photo-1564769625905-50e93615e769?w=800&h=500&fit=crop' },
      { name: 'Kompleks Asrama & Perpustakaan Kitab Turats', category: 'Kajian Ilmiah', description: 'Asrama bertingkat dengan sirkulasi udara alami dan perpustakaan ribuan jilid kitab kuning klasik.', imageUrl: 'https://images.unsplash.com/photo-1541829070764-84a7d30dd3f3?w=800&h=500&fit=crop' }
    ],
    news: [
      { title: 'Santri Pesantren Darussalam Raih Juara 1 Musabaqah Hifdzil Qur\'an Internasional di Dubai', slug: 'juara-mhq-dubai-2026', category: 'Prestasi Santri', summary: 'Muhammad Rizqi (Kelas 5 KMI) mengharumkan nama bangsa di ajang kompetisi hafalan Al-Qur\'an tingkat dunia.', coverImageUrl: 'https://images.unsplash.com/photo-1585036156171-384164a8c675?w=800&h=500&fit=crop', publishedAt: '28 Agustus 2026' }
    ],
    staff: [
      { name: 'K.H. Ahmad Dahlan, Lc., M.A.', role: 'Pimpinan Pesantren', subject: 'Tafsir & Hadits Tematik', photoUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=400&fit=crop' },
      { name: 'Ustadz Farid Ridwan, S.Th.I., M.Pd.I.', role: 'Direktur KMI', subject: 'Ushul Fiqh & Fiqh Muamalah', photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=400&fit=crop' }
    ],
    testimonials: [
      { alumniName: 'Dr. H. Muhammad Zulkarnain, Lc., M.A.', graduationYear: '2014', content: 'Jiwa kemandirian dan keikhlasan yang ditanamkan selama nyantri di Darussalam menjadi bekal terbesar saya saat menyelesaikan doktor di Universitas Al-Azhar Kairo.' }
    ]
  });

  // Empty Account Template 5: Pesantren Nurul Iman
  await seedEmptySchool({
    adminName: 'Admin Pesantren Nurul Iman',
    adminEmail: 'admin.nuruliman@sobat.com',
    schoolName: 'Pesantren Modern Nurul Iman',
    npsn: '69904455',
    level: 'MADRASAH',
    province: 'DI Yogyakarta',
    city: 'Kabupaten Bantul',
    address: 'Jl. Imogiri Timur Km. 10, Bantul, Yogyakarta',
    phone: '(0274) 439000',
    email: 'info@nuruliman-boarding.sch.id',
    slug: 'pesantren-nuruliman',
    templateVerId: tplPesantrenVer.id,
    siteName: 'Pesantren Modern Nurul Iman Bantul',
    tagline: 'Mencetak Generasi Hafidz Qur\'an yang Cerdas dan Mandiri',
    primaryColor: '#0f766e',
    secondaryColor: '#d97706'
  });

  console.log('🎉 Multi-template seeding successfully finished with 10 distinct accounts (5 Populated + 5 Empty Fresh)!');
}

// Only run automatically when executed directly as a script
if (process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('src/seed.ts')) {
  runSeed().catch(err => {
    console.error('Seeding error:', err);
    process.exit(1);
  });
}

