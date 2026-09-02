<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { useAuth } from '~/composables/useAuth';
import { useSiteTemplate } from '~/composables/useSiteTemplate';

const route = useRoute();
const { user, isSuperAdmin, logout } = useAuth();
const { template, fetchActiveTemplate, supportsModule } = useSiteTemplate();

onMounted(() => {
  fetchActiveTemplate();
});

const allPossibleContentNavs = [
  { module: 'site_settings', label: 'Pengaturan Situs & SEO', path: '/dashboard/settings', icon: '⚙️' },
  { module: 'hero_slides', label: 'Slide Beranda (Hero)', path: '/dashboard/hero', icon: '🖼️' },
  { module: 'programs', label: 'Program Unggulan', path: '/dashboard/programs', icon: '🎓' },
  { module: 'facilities', label: 'Fasilitas & Sarana', path: '/dashboard/facilities', icon: '🏢' },
  { module: 'news', label: 'Berita & Pengumuman', path: '/dashboard/news', icon: '📰' },
  { module: 'vision_mission', label: 'Visi, Misi & Nilai', path: '/dashboard/vision-mission', icon: '🎯' },
  { module: 'statistics', label: 'Sejarah & Statistik', path: '/dashboard/statistics', icon: '📈' },
  { module: 'staff', label: 'Guru & Staf Pendidik', path: '/dashboard/staff', icon: '👨‍🏫' },
  { module: 'student_organizations', label: 'Organisasi & Ekskul', path: '/dashboard/student-orgs', icon: '👥' },
  { module: 'testimonials', label: 'Testimoni Alumni', path: '/dashboard/testimonials', icon: '💬' },
  { module: 'ppdb', label: 'Pendaftaran PPDB', path: '/dashboard/ppdb', icon: '📝' },
  { module: 'contact', label: 'Video & Kontak', path: '/dashboard/contact', icon: '📍' },
  { module: 'navigation', label: 'Menu & Navigasi', path: '/dashboard/navigation', icon: '🧭' }
];

const navItems = computed(() => {
  const items = [
    { label: 'Ringkasan & Status', path: '/dashboard', icon: '📊' }
  ];

  // If template has defined sections, use them; otherwise filter by supportedModules
  const manifestSections = template.value?.sections || [];
  if (manifestSections.length > 0) {
    for (const sec of manifestSections) {
      const match = allPossibleContentNavs.find(n => n.module === sec.module);
      if (match) {
        items.push({
          label: sec.label || match.label,
          path: sec.path || match.path,
          icon: sec.icon || match.icon
        });
      }
    }
  } else {
    for (const nav of allPossibleContentNavs) {
      if (supportsModule(nav.module)) {
        items.push(nav);
      }
    }
  }

  // Add system utilities at bottom
  items.push(
    { label: 'Media Library', path: '/dashboard/media', icon: '📁' },
    { label: 'Live Preview', path: '/dashboard/preview', icon: '👁️' },
    { label: 'Publikasi & Riwayat', path: '/dashboard/publish', icon: '🚀' }
  );

  return items;
});

function isActive(path: string) {
  if (path === '/dashboard') {
    return route.path === '/dashboard';
  }
  return route.path.startsWith(path);
}
</script>

<template>
  <aside class="w-64 bg-white border-r border-slate-200 flex flex-col h-screen fixed top-0 left-0 z-30 shadow-sm">
    <!-- Brand Logo Header -->
    <div class="h-16 border-b border-slate-100 flex items-center px-6 gap-3 bg-emerald-800 text-white">
      <div class="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center font-bold text-emerald-100 text-lg">
        S
      </div>
      <div>
        <span class="font-extrabold text-base tracking-tight block leading-none">SobatWeb</span>
        <span class="text-[10px] text-emerald-200 font-medium tracking-wide uppercase">School Builder</span>
      </div>
    </div>

    <!-- School Context Banner -->
    <div class="p-4 border-b border-slate-100 bg-emerald-50/50">
      <div class="flex items-center gap-2">
        <div class="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
        <span class="text-xs font-bold text-slate-900 truncate">
          {{ user?.school?.name || 'Situs Sekolah' }}
        </span>
      </div>
      <div class="mt-1 pl-4.5 flex flex-col gap-0.5">
        <p class="text-[11px] text-slate-500">
          Peran: <span class="font-medium text-emerald-700">{{ user?.platformRole }}</span>
        </p>
        <p v-if="template" class="text-[10px] text-slate-500 truncate flex items-center gap-1 font-medium">
          <span>🎨</span>
          <span class="text-emerald-800 font-semibold truncate">{{ template.templateName }}</span>
        </p>
      </div>
    </div>

    <!-- Navigation Links -->
    <div class="flex-1 overflow-y-auto py-3 px-3 space-y-1 custom-scrollbar text-sm">
      <NuxtLink
        v-for="item in navItems"
        :key="item.path"
        :to="item.path"
        class="flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium transition duration-150"
        :class="isActive(item.path)
          ? 'bg-emerald-800 text-white shadow-sm font-semibold'
          : 'text-slate-600 hover:text-emerald-900 hover:bg-emerald-50/80'"
      >
        <span class="text-base leading-none">{{ item.icon }}</span>
        <span>{{ item.label }}</span>
      </NuxtLink>

      <!-- Super Admin shortcut -->
      <div v-if="isSuperAdmin" class="pt-4 mt-4 border-t border-slate-200">
        <span class="text-[10px] uppercase font-bold text-slate-400 px-3 block mb-1">Super Admin</span>
        <NuxtLink
          to="/admin/dashboard"
          class="flex items-center gap-3 px-3.5 py-2 rounded-xl text-purple-700 hover:bg-purple-50 font-medium"
        >
          <span>🛡️</span>
          <span>Platform Admin</span>
        </NuxtLink>
      </div>
    </div>

    <!-- User Profile & Logout Footer -->
    <div class="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
      <div class="truncate pr-2">
        <p class="text-xs font-bold text-slate-900 truncate">{{ user?.name }}</p>
        <p class="text-[11px] text-slate-500 truncate">{{ user?.email }}</p>
      </div>
      <button
        type="button"
        @click="logout"
        class="p-2 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition text-xs font-semibold"
        title="Keluar"
      >
        🚪
      </button>
    </div>
  </aside>
</template>
