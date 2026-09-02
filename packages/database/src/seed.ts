import * as argon2 from 'argon2';
import { getDatabaseClient, getPgliteInstance } from './client.js';
import { runMigrations } from './migrate.js';
import * as schema from './schema/index.js';
import { eq } from 'drizzle-orm';

export async function runSeed() {
  console.log('🌱 Starting database seeding with single school & MAN 5 Sleman template...');
  const pglite = getPgliteInstance();
  if (pglite?.waitReady) {
    await pglite.waitReady;
  }

  await runMigrations();

  const db = getDatabaseClient();

  // Clear existing content to ensure clean single-school state
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

  const [superAdmin] = await db.insert(schema.users).values({
    name: process.env.SUPERADMIN_NAME || 'Super Administrator',
    email: superAdminEmail,
    passwordHash: superAdminHash,
    platformRole: 'SUPER_ADMIN',
    status: 'ACTIVE',
    emailVerifiedAt: new Date()
  }).returning();
  console.log(`✅ Created Super Admin (${superAdminEmail})`);

  // 2. Seed Single Official Template: MAN 5 Sleman
  const man5Manifest = {
    schemaVersion: '1.0.0',
    templateKey: 'man5-sleman',
    name: 'Template Unggulan MAN 5 Sleman',
    version: '1.0.0',
    category: 'Madrasah / MA',
    entry: 'index.html',
    preview: 'assets/preview.webp',
    description: 'Template profil madrasah unggulan dengan nuansa hijau botol islami, aksen emas royal, dan integrasi penuh 14 modul CMS SobatWeb.',
    supportedModules: [
      'site_settings',
      'hero_slides',
      'programs',
      'facilities',
      'news',
      'vision_mission',
      'statistics',
      'staff',
      'student_organizations',
      'testimonials',
      'ppdb',
      'video_profile',
      'contact',
      'navigation'
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
      { key: 'primaryColor', label: 'Warna Primer (Hijau)', type: 'color', defaultValue: '#1a6b2f' },
      { key: 'secondaryColor', label: 'Warna Sekunder (Emas)', type: 'color', defaultValue: '#c9a227' },
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

  // Seed Template 2: School Modern
  const [tplModern] = await db.insert(schema.templates).values({
    key: 'school-modern',
    name: 'Template Modern SMA/SMK',
    category: 'SMA/SMK',
    status: 'ACTIVE'
  }).returning();

  await db.insert(schema.templateVersions).values({
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
  });

  // Seed Template 3: School Classic
  const [tplClassic] = await db.insert(schema.templates).values({
    key: 'school-classic',
    name: 'Template Klasik Akademik',
    category: 'Akademik & Tradisional',
    status: 'ACTIVE'
  }).returning();

  await db.insert(schema.templateVersions).values({
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
  });

  console.log('✅ Official templates seeded (man5-sleman, school-modern, school-classic)');

  // 3. Seed Single School: MAN 5 Sleman
  const schoolAdminEmail = 'admin.man5sleman@sobat.com';
  const schoolAdminPassword = 'SchoolAdmin123!';
  const schoolAdminHash = await argon2.hash(schoolAdminPassword);

  const [userSchool] = await db.insert(schema.users).values({
    name: 'Drs. H. Ahmad Fauzi, M.Pd.',
    email: schoolAdminEmail,
    passwordHash: schoolAdminHash,
    platformRole: 'SCHOOL_ADMIN',
    status: 'ACTIVE',
    emailVerifiedAt: new Date()
  }).returning();

  const [school] = await db.insert(schema.schools).values({
    officialName: 'MAN 5 Sleman',
    npsn: '20401122',
    educationLevel: 'MADRASAH',
    schoolType: 'NEGERI',
    province: 'D.I. Yogyakarta',
    city: 'Kab. Sleman',
    address: 'Gendol, Sumberejo, Tempel, Kabupaten Sleman, Daerah Istimewa Yogyakarta 55552',
    phone: '(0274) 868423',
    email: 'info@man5sleman.sch.id',
    status: 'ACTIVE'
  }).returning();

  // Link membership
  await db.insert(schema.schoolMembers).values({
    schoolId: school.id,
    userId: userSchool.id,
    role: 'SCHOOL_ADMIN'
  });

  // Create school site
  const [site] = await db.insert(schema.schoolSites).values({
    schoolId: school.id,
    templateVersionId: tplMan5Ver.id,
    status: 'PUBLISHED',
    publishedAt: new Date()
  }).returning();

  // Create subdomain domain
  const slug = 'man5sleman';
  const baseDomain = process.env.BASE_DOMAIN || 'localhost:3005';
  await db.insert(schema.siteDomains).values({
    siteId: site.id,
    type: 'SUBDOMAIN',
    slug,
    hostname: `${slug}.${baseDomain}`,
    isPrimary: true,
    status: 'ACTIVE'
  });

  // Site Settings
  await db.insert(schema.siteSettings).values({
    siteId: site.id,
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
      social: {
        facebook: 'https://facebook.com/man5sleman',
        instagram: 'https://instagram.com/man5sleman',
        youtube: 'https://youtube.com/@man5sleman'
      }
    }
  });

  // Hero Slide
  await db.insert(schema.contentEntries).values({
    siteId: site.id,
    type: 'hero_slide',
    title: "Mencetak Generasi Qur'ani, Berakhlak & Berprestasi",
    slug: 'hero-man5',
    status: 'PUBLISHED',
    sortOrder: 1,
    payload: {
      title: "Mencetak Generasi Qur'ani, Berakhlak & Berprestasi",
      subtitle: 'Selamat datang di website resmi MAN 5 Sleman — memadukan keunggulan sains teknologi, bahasa, dan nilai-nilai keislaman untuk mencetak kader pemimpin masa depan yang berdaya saing global.',
      imageUrl: 'https://images.unsplash.com/photo-1742549586702-c23994895082?w=1600&h=900&fit=crop',
      ctaText: 'Daftar PPDB 2026/2027',
      ctaUrl: '#ppdb'
    }
  });

  // Vision Mission
  await db.insert(schema.contentEntries).values({
    siteId: site.id,
    type: 'vision_mission',
    title: 'Visi & Misi Madrasah',
    slug: 'visi-misi',
    status: 'PUBLISHED',
    payload: {
      vision: "Menjadi Madrasah Unggul, Kompetitif, dan Berwawasan Lingkungan yang Mampu Mencetak Generasi Qur'ani, Berakhlak Mulia, serta Berprestasi di Tingkat Nasional dan Internasional."
    }
  });

  // Programs
  const programs = [
    {
      title: "Tahfidz Al-Qur'an",
      category: "Spiritual & Qur'ani",
      description: "Program intensif hafalan Al-Qur'an 30 Juz dengan sanad bersertifikasi, muroja'ah berkala, dan bimbingan ustadz berpengalaman."
    },
    {
      title: 'Madrasah Riset & Sains',
      category: 'Sains & Inovasi',
      description: 'Laboratorium riset terpadu membimbing karya ilmiah remaja (KIR), eksperimen bioteknologi, robotika cerdas, dan olimpiade KSM/OSN.'
    },
    {
      title: 'Kelas Bahasa & Diplomasi',
      category: 'Komunikasi Global',
      description: 'Penguasaan aktif Bahasa Arab dan Bahasa Inggris melalui Arabic/English Day, debat internasional, dan persiapan studi luar negeri.'
    },
    {
      title: 'Teknologi & Multimedia',
      category: 'Skill & Karir',
      description: 'Pengembangan keterampilan coding, desain grafis, editing video, dan kewirausahaan digital untuk kesiapan karir modern.'
    }
  ];

  for (let i = 0; i < programs.length; i++) {
    await db.insert(schema.contentEntries).values({
      siteId: site.id,
      type: 'program',
      title: programs[i].title,
      slug: `program-${i + 1}`,
      status: 'PUBLISHED',
      sortOrder: i + 1,
      payload: programs[i]
    });
  }

  // Facilities
  const facilities = [
    {
      name: 'Masjid Al-Ikhlas',
      category: 'Ibadah & Spiritual',
      description: 'Masjid megah berkapasitas 800+ jamaah untuk sholat fardhu, dhuha bersama, dan halaqah tahfidz.',
      imageUrl: 'https://images.unsplash.com/photo-1759512711804-83aee32c8d48?w=700&h=500&fit=crop'
    },
    {
      name: 'Laboratorium Sains & IPA',
      category: 'Praktikum & Riset',
      description: 'Dilengkapi mikroskop digital, alat peraga sains mutakhir, dan reagen standar olimpiade.',
      imageUrl: 'https://images.unsplash.com/photo-1748261347768-a32434751a9a?w=700&h=500&fit=crop'
    },
    {
      name: 'Perpustakaan Digital',
      category: 'Literasi Modern',
      description: 'Ruang baca nyaman ber-AC, ribuan e-book, katalog digital online, dan pojok santai literasi.',
      imageUrl: 'https://images.unsplash.com/photo-1604866830893-c13cafa515d5?w=700&h=500&fit=crop'
    },
    {
      name: 'Ruang Kelas Multimedia',
      category: 'Smart Classroom',
      description: 'Kenyamanan belajar dengan proyektor LCD interaktif, pencahayaan optimal, dan pendingin ruangan.',
      imageUrl: 'https://images.unsplash.com/photo-1742549586702-c23994895082?w=700&h=500&fit=crop'
    },
    {
      name: 'Aula Serba Guna',
      category: 'Convention Hall',
      description: 'Gedung pertemuan serbaguna untuk event madrasah, pelantikan pengurus, serta resepsi wisuda siswa.',
      imageUrl: 'https://images.unsplash.com/photo-1549431971-f54b3f5c82d8?w=700&h=500&fit=crop'
    },
    {
      name: 'Laboratorium Komputer',
      category: 'IT & CBT Center',
      description: 'Dilengkapi 80+ unit PC generasi terbaru dengan jaringan fiber optic gigabit untuk ujian dan riset.',
      imageUrl: 'https://images.unsplash.com/photo-1589104760192-ccab0ce0d90f?w=700&h=500&fit=crop'
    }
  ];

  for (let i = 0; i < facilities.length; i++) {
    await db.insert(schema.contentEntries).values({
      siteId: site.id,
      type: 'facility',
      title: facilities[i].name,
      slug: `facility-${i + 1}`,
      status: 'PUBLISHED',
      sortOrder: i + 1,
      payload: facilities[i]
    });
  }

  // News
  const newsItems = [
    {
      title: 'MAN 5 Sleman Raih Juara 1 Kompetisi Sains Madrasah (KSM) Tingkat Kabupaten 2024',
      summary: 'Tim KSM MAN 5 Sleman berhasil menorehkan prestasi gemilang di bidang Matematika Terintegrasi dan Fisika, berhak melaju ke tingkat provinsi.',
      category: 'Prestasi',
      publishedAt: '18 Juli 2024',
      coverImageUrl: 'https://images.unsplash.com/photo-1549431971-f54b3f5c82d8?w=500&h=350&fit=crop',
      url: '#berita'
    },
    {
      title: 'Pelaksanaan Asesmen Bakat Minat Berbasis Komputer Berjalan Lancar dan Tertib',
      summary: 'Sebanyak 240 peserta didik kelas XII mengikuti asesmen pemetaan minat jurusan perguruan tinggi dengan pendampingan guru BK.',
      category: 'Akademik',
      publishedAt: '10 Juli 2024',
      coverImageUrl: 'https://images.unsplash.com/photo-1742549586702-c23994895082?w=500&h=350&fit=crop',
      url: '#berita'
    },
    {
      title: 'Peringatan Milad MAN 5 Sleman Dimeriahkan dengan Pawai Budaya dan Bakti Sosial',
      summary: 'Rangkaian peringatan Milad berlangsung khidmat dengan penyaluran paket sembako kepada masyarakat sekitar madrasah.',
      category: 'Kegiatan',
      publishedAt: '05 Juli 2024',
      coverImageUrl: 'https://images.unsplash.com/photo-1551161001-5c4184cc4317?w=500&h=350&fit=crop',
      url: '#berita'
    }
  ];

  for (let i = 0; i < newsItems.length; i++) {
    await db.insert(schema.contentEntries).values({
      siteId: site.id,
      type: 'news',
      title: newsItems[i].title,
      slug: `news-${i + 1}`,
      status: 'PUBLISHED',
      sortOrder: i + 1,
      payload: newsItems[i]
    });
  }

  // Testimonials
  const testimonials = [
    {
      alumniName: 'Nurul Latifah, S.Si.',
      graduationYear: '2020',
      content: 'Program Riset dan Tahfidz di MAN 5 Sleman membentuk kedisiplinan dan rasa percaya diri saya hingga berhasil tembus Fakultas Kedokteran. Sangat berkesan!'
    },
    {
      alumniName: 'Rifqi Pratama, S.T.',
      graduationYear: '2019',
      content: 'Bimbingan para guru sangat tulus. Fasilitas lab komputer dan dukungan lomba robotika memberi pondasi teknik yang kuat bagi saya di perguruan tinggi.'
    },
    {
      alumniName: 'Aisyah Rahmawati, Lc.',
      graduationYear: '2021',
      content: 'Kelas Bahasa dan pendampingan Tahfidz memudahkan saya lolos seleksi beasiswa Kemenag ke Mesir. Sukses selalu untuk almamater tercinta!'
    }
  ];

  for (let i = 0; i < testimonials.length; i++) {
    await db.insert(schema.contentEntries).values({
      siteId: site.id,
      type: 'testimonial',
      title: testimonials[i].alumniName,
      slug: `testimoni-${i + 1}`,
      status: 'PUBLISHED',
      sortOrder: i + 1,
      payload: testimonials[i]
    });
  }

  // Publish Release v1.0.0 snapshot
  const snapshotData = {
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
      operationalHours: 'Senin - Jumat: 07.00 - 15.30 WIB'
    },
    modules: {
      hero_slides: [
        {
          title: "Mencetak Generasi Qur'ani, Berakhlak & Berprestasi",
          subtitle: 'Selamat datang di website resmi MAN 5 Sleman — memadukan keunggulan sains teknologi, bahasa, dan nilai-nilai keislaman untuk mencetak kader pemimpin masa depan yang berdaya saing global.',
          imageUrl: 'https://images.unsplash.com/photo-1742549586702-c23994895082?w=1600&h=900&fit=crop',
          ctaText: 'Daftar PPDB 2026/2027',
          ctaUrl: '#ppdb'
        }
      ],
      vision_mission: {
        vision: "Menjadi Madrasah Unggul, Kompetitif, dan Berwawasan Lingkungan yang Mampu Mencetak Generasi Qur'ani, Berakhlak Mulia, serta Berprestasi di Tingkat Nasional dan Internasional."
      },
      programs,
      facilities,
      news: newsItems,
      testimonials
    },
    navigation: {
      header: [],
      footer: []
    }
  };

  const [rel] = await db.insert(schema.publicationReleases).values({
    siteId: site.id,
    templateVersionId: tplMan5Ver.id,
    versionNumber: 1,
    status: 'ACTIVE',
    summary: 'Rilis Perdana Website Resmi MAN 5 Sleman',
    snapshotManifest: snapshotData,
    createdBy: userSchool.id
  }).returning();

  await db.update(schema.schoolSites).set({
    activeReleaseId: rel.id
  }).where(eq(schema.schoolSites.id, site.id));

  console.log('✅ Demo School MAN 5 Sleman seeded (slug: man5sleman)');
  console.log('🎉 Seeding successfully finished with exactly 1 school and 1 template!');
}

// Only run automatically when executed directly as a script
if (process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('src/seed.ts')) {
  runSeed().catch(err => {
    console.error('Seeding error:', err);
    process.exit(1);
  });
}
