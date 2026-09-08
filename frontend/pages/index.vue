<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { useAuth } from '~/composables/useAuth';

const route = useRoute();
const { isAuthenticated, user, isSuperAdmin } = useAuth();

const { data: tenantData, pending: isLoadingTenant } = await useAsyncData(
  () => `tenant_${route.query.slug || ''}`,
  async () => {
    let slug = route.query.slug as string | undefined;

    if (!slug && import.meta.server) {
      const reqHeaders = useRequestHeaders(['host', 'x-tenant-slug']);
      const host = (reqHeaders.host || '').split(':')[0].toLowerCase();
      const parts = host.split('.');
      if (parts.length >= 2 && !['localhost', 'sobat', '127', 'www', 'admin', 'app'].includes(parts[0])) {
        slug = parts[0];
      }
      if (reqHeaders['x-tenant-slug']) {
        slug = reqHeaders['x-tenant-slug'];
      }
    } else if (!slug && typeof window !== 'undefined') {
      const host = window.location.host.split(':')[0].toLowerCase();
      const parts = host.split('.');
      if (parts.length >= 2 && !['localhost', 'sobat', '127', 'www', 'admin', 'app'].includes(parts[0])) {
        slug = parts[0];
      }
    }

    if (!slug) return null;

    try {
      const res = await fetch(`http://localhost:4000/api/v1/public/render?slug=${encodeURIComponent(slug)}`);
      if (!res.ok) {
        return { slug, html: null, error: 'Website sekolah belum diterbitkan atau sedang dinonaktifkan.' };
      }
      const html = await res.text();
      return { slug, html, error: null };
    } catch (e: any) {
      return { slug, html: null, error: e.message || 'Gagal memuat situs sekolah.' };
    }
  },
  { watch: [() => route.query.slug] }
);

const tenantSlug = computed(() => tenantData.value?.slug || null);
const renderedHtml = computed(() => tenantData.value?.html || null);
const tenantError = computed(() => tenantData.value?.error || null);
</script>

<template>
  <div>
    <!-- 1. Tenant Public Website View (Subdomain) -->
    <div v-if="tenantSlug">
      <div v-if="isLoadingTenant" class="min-h-screen flex items-center justify-center bg-slate-50">
        <div class="text-center space-y-3">
          <div class="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p class="text-sm font-semibold text-slate-700">Memuat Website Sekolah...</p>
        </div>
      </div>

      <div v-else-if="tenantError" class="min-h-screen flex items-center justify-center p-6 bg-slate-100">
        <div class="max-w-md w-full bg-white rounded-2xl p-8 text-center shadow-xl border border-slate-200">
          <div class="w-16 h-16 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto text-2xl mb-4 font-bold">
            ⚠️
          </div>
          <h2 class="text-xl font-bold text-slate-900 mb-2">Informasi Akses</h2>
          <p class="text-sm text-slate-600 mb-6 leading-relaxed">{{ tenantError }}</p>
          <NuxtLink to="/" class="inline-block px-5 py-2.5 rounded-xl bg-emerald-800 text-white font-semibold text-xs hover:bg-emerald-900 transition">
            Kembali ke Beranda SobatWeb
          </NuxtLink>
        </div>
      </div>

      <div v-else-if="renderedHtml" v-html="renderedHtml"></div>
    </div>

    <!-- 2. SobatWeb Platform Landing Page (Root Domain) -->
    <div v-else class="min-h-screen bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 text-slate-100 flex flex-col justify-between">
      <!-- Navbar -->
      <nav class="max-w-7xl mx-auto w-full px-6 py-6 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center font-extrabold text-white text-xl shadow-lg shadow-emerald-500/20">
            S
          </div>
          <div>
            <span class="text-xl font-black tracking-tight block">SobatWeb</span>
            <span class="text-[10px] text-emerald-400 font-semibold tracking-wider uppercase">School Website Builder</span>
          </div>
        </div>

        <div class="flex items-center gap-4">
          <template v-if="isAuthenticated">
            <NuxtLink
              v-if="isSuperAdmin"
              to="/admin/dashboard"
              class="text-xs font-bold px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white transition"
            >
              🛡️ Super Admin Portal
            </NuxtLink>
            <NuxtLink
              to="/dashboard"
              class="text-xs font-bold px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/30 transition"
            >
              Ke Dashboard CMS
            </NuxtLink>
          </template>
          <template v-else>
            <NuxtLink
              to="/login"
              class="text-sm font-semibold text-slate-300 hover:text-white px-4 py-2 transition"
            >
              Masuk
            </NuxtLink>
            <NuxtLink
              to="/register"
              class="text-sm font-bold px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30 transition"
            >
              Daftar Gratis
            </NuxtLink>
          </template>
        </div>
      </nav>

      <!-- Hero Section -->
      <section class="max-w-5xl mx-auto px-6 py-20 text-center space-y-8">
        <div class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-950/80 border border-emerald-800/80 text-emerald-300 text-xs font-semibold tracking-wide">
          <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          Platform Multi-Tenant CMS Sekolah Tanpa Coding
        </div>

        <h1 class="text-4xl sm:text-6xl font-black tracking-tight leading-tight">
          Bangun Website Sekolah Resmi & Modern dalam <span class="bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">Hitungan Menit</span>
        </h1>

        <p class="text-base sm:text-xl text-slate-400 max-w-3xl mx-auto leading-relaxed">
          SobatWeb memudahkan sekolah dari tingkat SD, SMP, SMA hingga SMK memiliki website company profile profesional, subdomain instan, modul PPDB lengkap, dan manajemen konten visual tanpa perlu keahlian pemrograman.
        </p>

        <div class="flex flex-wrap justify-center gap-4 pt-4">
          <NuxtLink
            to="/register"
            class="px-8 py-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-base shadow-xl shadow-emerald-600/25 transition transform hover:-translate-y-0.5"
          >
            Buat Website Sekolah Sekarang 🚀
          </NuxtLink>
          <a
            href="#demo"
            class="px-8 py-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-base border border-slate-700 transition"
          >
            Lihat Contoh Sekolah
          </a>
        </div>
      </section>

      <!-- Live Demo Showcase -->
      <section id="demo" class="max-w-7xl mx-auto px-6 py-16 w-full border-t border-slate-800">
        <div class="text-center max-w-2xl mx-auto mb-12">
          <h2 class="text-xs font-bold uppercase tracking-widest text-emerald-400 mb-2">Live Multi-Tenant Showcase</h2>
          <h3 class="text-2xl sm:text-3xl font-extrabold">Sekolah Demo yang Telah Terbit</h3>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
          <!-- Demo 1 -->
          <div class="bg-slate-900 border border-slate-800 hover:border-emerald-500/50 rounded-2xl p-6 transition flex flex-col justify-between">
            <div class="space-y-4">
              <div class="flex items-center justify-between">
                <span class="text-xs font-bold px-3 py-1 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800">Template School Modern</span>
                <span class="text-xs text-slate-400">SMA Negeri</span>
              </div>
              <h4 class="text-xl font-bold text-white">SMA Negeri 1 Nusantara</h4>
              <p class="text-sm text-slate-400 leading-relaxed">
                Website lengkap dengan slide beranda, program unggulan olimpiade, fasilitas perpustakaan modern, berita prestasi, visi-misi, dan modul pendaftaran PPDB.
              </p>
            </div>
            <div class="pt-6 mt-6 border-t border-slate-800 flex items-center justify-between">
              <span class="text-xs text-emerald-400 font-mono">sman1nusantara.sobat.com</span>
              <a
                href="/?slug=sman1nusantara"
                class="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition"
              >
                Buka Website ↗
              </a>
            </div>
          </div>

          <!-- Demo 2 -->
          <div class="bg-slate-900 border border-slate-800 hover:border-blue-500/50 rounded-2xl p-6 transition flex flex-col justify-between">
            <div class="space-y-4">
              <div class="flex items-center justify-between">
                <span class="text-xs font-bold px-3 py-1 rounded-full bg-blue-950 text-blue-400 border border-blue-800">Template School Classic</span>
                <span class="text-xs text-slate-400">SMK Pusat Keunggulan</span>
              </div>
              <h4 class="text-xl font-bold text-white">SMK Bintang Bangsa Bandung</h4>
              <p class="text-sm text-slate-400 leading-relaxed">
                Website bergaya akademik klasik dengan kurikulum vokasi industri 4.0, program rekayasa perangkat lunak, profil guru, dan pendaftaran siswa baru.
              </p>
            </div>
            <div class="pt-6 mt-6 border-t border-slate-800 flex items-center justify-between">
              <span class="text-xs text-blue-400 font-mono">smkbintangbangsa.sobat.com</span>
              <a
                href="/?slug=smkbintangbangsa"
                class="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition"
              >
                Buka Website ↗
              </a>
            </div>
          </div>
        </div>
      </section>

      <!-- Footer -->
      <footer class="border-t border-slate-800 py-8 px-6 text-center text-xs text-slate-500">
        <p>&copy; 2026 SobatWeb School Website Builder. Multi-Tenant SaaS Platform.</p>
      </footer>
    </div>
  </div>
</template>
