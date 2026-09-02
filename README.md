# 🏫 SobatWeb — Multi-Tenant School Website Builder SaaS

**SobatWeb** adalah platform SaaS multi-tenant modern untuk pembuatan website *company profile* sekolah tanpa perlu coding. Pihak sekolah dapat mendaftar, mengisi data profil, mereservasi subdomain unik (misal `man5sleman.sobat.com` / `namasekolah.localhost:3000`), memilih desain template resmi, mengelola 14 modul konten CMS visual, melihat responsive live preview, dan menerbitkan rilis website instan dengan fitur *snapshot versioning* dan *1-click rollback*.

---

## 🌟 Arsitektur & Fitur Utama

1. **Multi-Tenant Subdomain Resolver**:
   - Dynamic `Host` header router (e.g. `namasekolah.localhost:3000` / `namasekolah.sobat.com` atau parameter `?slug=namasekolah`).
   - Tenant isolation ketat pada level middleware dan database query.
   - Pengecekan collision subdomain unik dengan saran alternatif otomatis (`-2`, `-3`).

2. **Mesin Template Aman & Sanitizer AST**:
   - Parsing atribut binding `data-cms-text`, `data-cms-image`, `data-cms-link`, `data-cms-repeat`, `data-cms-toggle`.
   - Sanitizer HTML ketat yang menghapus script berbahaya, event handler inline (`onclick`, `onerror`), dan pseudoprotocol `javascript:`.
   - JSON-LD structured data generator (`EducationalOrganization`) dan OpenGraph SEO meta tags.
   - Template Validator ZIP paket dengan deteksi zip bomb, path traversal, dan forbidden binary files.

3. **14 Modul Konten CMS Visual**:
   - 🖼️ **Hero Slides**: Slider visual dinamis, CTA buttons, custom sort order.
   - 🎓 **Program Unggulan**: Kurikulum vokasi/unggulan, peminatan.
   - 🏢 **Fasilitas & Sarana**: Direktori gedung, lab komputer, lapangan, perpustakaan.
   - 📰 **Berita & Pengumuman**: Artikel kegiatan sekolah dengan HTML formatting & status.
   - 🎯 **Visi, Misi & Nilai**: Pernyataan visi dan daftar butir misi interaktif.
   - 📈 **Sejarah & Statistik**: Tahun berdiri, narasi sejarah, counter angka dinamis (siswa, guru, kelulusan, prestasi).
   - 👨‍🏫 **Guru & Staf**: Direktori dewan guru, foto, jabatan, dan profil singkat.
   - 👥 **Organisasi Siswa & Ekskul**: OSIS, MPK, Pramuka, klub robotika, jadwal dan guru pembina.
   - 💬 **Testimoni Alumni**: Kisah sukses lulusan dengan 1-5 star ratings.
   - 📝 **Modul PPDB**: Info gelombang, kuota siswa, countdown batas pendaftaran, dan alur pendaftaran langkah-demi-langkah.
   - 📍 **Kontak & Lokasi**: Alamat fisik, jam operasional, Google Maps URL, dan akun media sosial.
   - 🎬 **Video Profil**: Video YouTube/Vimeo profil sekolah.
   - 🧭 **Menu & Navigasi**: Tree builder menu navbar dan footer (maksimal 2 tingkat kedalaman, pencegahan siklus).
   - 📁 **Media Library**: Upload manager, thumbnail preview, alt-text, dan instant URL copier.

4. **Snapshot Release & 1-Click Rollback**:
   - Perubahan di CMS tersimpan dalam mode **DRAFT** dan tidak akan mengubah website publik yang sedang aktif.
   - Tombol **Publikasikan** membuat snapshot *immutable release* seketika.
   - Riwayat rilis tersimpan rapi dengan fitur **Rollback 1-Klik** ke versi sebelumnya kapan saja.

5. **Super Admin Platform Portal**:
   - 📊 Platform dashboard (total sekolah, aktif/suspend, pengguna, template, audit log).
   - 🏫 Manajemen Sekolah (pencarian, filter status, suspend/activate tenant).
   - 👥 Manajemen Pengguna (role assigning, status toggle).
   - 📦 Template Manager & ZIP Uploader dengan scanner keamanan & error breakdown real-time.
   - 📜 Platform Audit Logs (pencatatan kronologis aktivitas sensitif).

---

## 📂 Struktur Monorepo

```text
sobatwebcompro/
├── apps/
│   ├── api/                    # Hono REST API & Multi-Tenant Backend (Port 4000)
│   └── web/                    # Nuxt 3 + Vue 3 + Tailwind CSS Frontend (Port 3000)
├── packages/
│   ├── contracts/              # Shared Zod Schemas & TypeScript Types
│   ├── database/               # Drizzle ORM Schema, Migrations, Seeds & Dual Client (PostgreSQL / PGlite)
│   └── template-engine/        # HTML Binding Parser, Sanitizer, ZIP Validator & Renderer
├── templates/
│   ├── school-modern/          # Official School Modern Template (Tailwind & Hero Slider)
│   └── school-classic/         # Official School Classic Template (Academic Navy/Gold)
├── docker-compose.yml          # Optional PostgreSQL Docker configuration
├── pnpm-workspace.yaml         # Turborepo & PNPM workspace config
└── package.json
```

---

## 🚀 Panduan Memulai Cepat (Local Development)

### 1. Prasyarat
- Node.js >= 20.x
- PNPM >= 9.x

### 2. Instalasi Dependensi
```bash
pnpm install
```

### 3. Database Migration & Seeding
Proyek telah dilengkapi dengan zero-config embedded `@electric-sql/pglite` (atau dapat menggunakan PostgreSQL URL standar pada `.env`). Jalankan migrasi dan seed:

```bash
# Menjalankan migrasi DDL database
pnpm --filter @sobatweb/database migrate

# Menjalankan seeder akun & template bawaan
pnpm --filter @sobatweb/database seed
```

### 4. Akun Demo Bawaan (Hasil Seeder)

| Peran | Email | Kata Sandi | Keterangan |
| :--- | :--- | :--- | :--- |
| **Super Admin** | `superadmin@sobat.com` | `SuperAdminPassword123!` | Akses portal platform di `/admin/dashboard` |
| **Admin SMAN 1** | `admin.sman1@sobat.com` | `SchoolAdmin123!` | Tenant: `sman1nusantara.sobat.com` |
| **Admin SMK Bintang** | `admin.smkbintang@sobat.com` | `SchoolAdmin123!` | Tenant: `smkbintangbangsa.sobat.com` |

### 5. Menjalankan Aplikasi

```bash
# Menjalankan seluruh layanan (API di port 4000, Web di port 3000)
pnpm dev
```

Buka peramban di:
- **Landing Page & Demo Showcase**: `http://localhost:3000`
- **Demo Website SMAN 1 Nusantara**: `http://localhost:3000/?slug=sman1nusantara` (atau via subdomain `http://sman1nusantara.localhost:3000`)
- **Demo Website SMK Bintang Bangsa**: `http://localhost:3000/?slug=smkbintangbangsa`
- **Dashboard CMS Sekolah**: `http://localhost:3000/dashboard`
- **Super Admin Platform Portal**: `http://localhost:3000/admin/dashboard`

---

## 🧪 Pengujian (Test Suites)

Jalankan seluruh rangkaian unit test dan multi-tenant integration test:

```bash
pnpm test
```

Rangkaian tes mencakup:
- ✅ Kontrak Zod, validasi slug reserved/collision, menu 2-level hierarchy & cycle detection.
- ✅ Template Engine HTML/CSS sanitizer, ZIP validator, dot-notation resolver, repeater injection & SEO schema.
- ✅ Multi-Tenant API end-to-end: Auth JWT sessions, onboarding wizard, tenant scoping, draft isolation, atomic publish snapshot, rollback verification, dan Super Admin audit logging.

---

## 🛡️ Keamanan & Kepatuhan
- **XSS & Injection Protection**: HTML sanitization dengan allowlist elemen dan atribut ketat.
- **Tenant Data Isolation**: Guard middleware memastikan pengguna tidak dapat melihat atau memodifikasi data sekolah lain.
- **Audit Logging**: Setiap mutasi konten, perubahan pengaturan, publikasi, dan rollback dicatat bersama ID pengguna dan timestamp.
