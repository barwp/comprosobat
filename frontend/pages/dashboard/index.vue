<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useAuth } from '~/composables/useAuth';
import { useApiClient } from '~/composables/useApi';
import { useToast } from '~/composables/useToast';

definePageMeta({ layout: 'dashboard' });

const { user } = useAuth();
const toast = useToast();
const onboarding = ref<any>(null);
const stats = ref({
  newsCount: 0,
  mediaCount: 0,
  staffCount: 0,
  facilitiesCount: 0
});
const isLoading = ref(true);
const isPublishing = ref(false);

async function loadDashboardData() {
  if (!user.value?.school?.id) return;
  isLoading.value = true;

  const obRes = await useApiClient(`/schools/${user.value.school.id}/onboarding`);
  if (obRes.success && obRes.data) {
    onboarding.value = obRes.data;

    if (obRes.data.siteId) {
      const newsRes = await useApiClient(`/sites/${obRes.data.siteId}/content?type=news`);
      const mediaRes = await useApiClient(`/sites/${obRes.data.siteId}/media`);
      const staffRes = await useApiClient(`/sites/${obRes.data.siteId}/content?type=staff`);
      const facRes = await useApiClient(`/sites/${obRes.data.siteId}/content?type=facility`);

      stats.value = {
        newsCount: newsRes.data?.length || 0,
        mediaCount: mediaRes.data?.length || 0,
        staffCount: staffRes.data?.length || 0,
        facilitiesCount: facRes.data?.length || 0
      };
    }
  }
  isLoading.value = false;
}

async function handleInstantPublish() {
  if (!onboarding.value?.siteId) {
    toast.error('Gagal Publikasi', 'Situs sekolah belum terkonfigurasi.');
    return;
  }

  isPublishing.value = true;
  const res = await useApiClient(`/sites/${onboarding.value.siteId}/publish`, {
    method: 'POST',
    body: { summary: 'Publikasi langsung dari dashboard' }
  });
  isPublishing.value = false;

  if (res.success) {
    toast.success('Website Berhasil Online! 🚀', 'Draft telah dipublikasikan dan langsung aktif.');
    onboarding.value.isPublished = true;
    const liveTarget = `/?slug=${onboarding.value?.slug || res.data?.slug || ''}`;
    window.open(liveTarget, '_blank');
  } else {
    toast.error('Gagal Mempublikasikan', res.error?.message);
  }
}

onMounted(() => {
  loadDashboardData();
});
</script>

<template>
  <div class="space-y-8">
    <!-- Welcome Banner -->
    <div class="bg-gradient-to-r from-emerald-800 to-teal-900 rounded-3xl p-8 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
      <div class="space-y-2">
        <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-emerald-200 text-xs font-semibold">
          <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          Status Website: {{ onboarding?.isPublished ? 'PUBLISHED (Aktif Online)' : 'DRAFT (Belum Diterbitkan)' }}
        </div>
        <h2 class="text-2xl sm:text-3xl font-extrabold tracking-tight">
          {{ user?.school?.name || 'Website Sekolah' }}
        </h2>
        <p class="text-xs sm:text-sm text-emerald-100 max-w-xl">
          Lengkapi modul konten sekolah Anda, periksa tampilan pada Live Preview, lalu publikasikan website langsung ke alamat subdomain.
        </p>
      </div>

      <div class="flex flex-wrap gap-3">
        <NuxtLink
          to="/dashboard/preview"
          class="px-5 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/20 transition"
        >
          👁️ Live Preview
        </NuxtLink>
        <button
          type="button"
          @click="handleInstantPublish"
          :disabled="isPublishing"
          class="px-6 py-3 rounded-xl bg-white text-emerald-950 hover:bg-emerald-50 font-extrabold text-xs shadow-lg transition cursor-pointer disabled:opacity-50 inline-flex items-center gap-2"
        >
          <span>🚀</span>
          <span>{{ isPublishing ? 'Mempublikasikan...' : 'Publikasikan Sekarang' }}</span>
          <span class="text-[10px] text-emerald-700">↗</span>
        </button>
      </div>
    </div>

    <!-- Metrics Cards -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-5">
      <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
        <div class="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center text-2xl font-bold">
          📰
        </div>
        <div>
          <span class="text-2xl font-black text-slate-900 block">{{ stats.newsCount }}</span>
          <span class="text-xs font-medium text-slate-500">Berita & Warta</span>
        </div>
      </div>

      <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
        <div class="w-12 h-12 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center text-2xl font-bold">
          👨‍🏫
        </div>
        <div>
          <span class="text-2xl font-black text-slate-900 block">{{ stats.staffCount }}</span>
          <span class="text-xs font-medium text-slate-500">Guru & Staf</span>
        </div>
      </div>

      <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
        <div class="w-12 h-12 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center text-2xl font-bold">
          🏢
        </div>
        <div>
          <span class="text-2xl font-black text-slate-900 block">{{ stats.facilitiesCount }}</span>
          <span class="text-xs font-medium text-slate-500">Fasilitas Sekolah</span>
        </div>
      </div>

      <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
        <div class="w-12 h-12 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center text-2xl font-bold">
          📁
        </div>
        <div>
          <span class="text-2xl font-black text-slate-900 block">{{ stats.mediaCount }}</span>
          <span class="text-xs font-medium text-slate-500">File Media</span>
        </div>
      </div>
    </div>

    <!-- Content Completeness Checklist -->
    <div class="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm space-y-6">
      <div>
        <h3 class="text-lg font-bold text-slate-900">Checklist Kelengkapan Website</h3>
        <p class="text-xs text-slate-500">Pastikan seluruh informasi penting telah diisi agar website tampil maksimal</p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm" v-if="onboarding?.checklist">
        <div class="p-4 rounded-xl border flex items-center justify-between" :class="onboarding.checklist.hasLogo ? 'bg-emerald-50/50 border-emerald-200 text-emerald-900' : 'bg-slate-50 border-slate-200 text-slate-700'">
          <div class="flex items-center gap-3">
            <span class="font-bold">{{ onboarding.checklist.hasLogo ? '✓' : '○' }}</span>
            <span class="font-medium">Logo & Identitas Brand</span>
          </div>
          <NuxtLink to="/dashboard/settings" class="text-xs font-bold text-emerald-700 hover:underline">Kelola →</NuxtLink>
        </div>

        <div class="p-4 rounded-xl border flex items-center justify-between" :class="onboarding.checklist.hasContact ? 'bg-emerald-50/50 border-emerald-200 text-emerald-900' : 'bg-slate-50 border-slate-200 text-slate-700'">
          <div class="flex items-center gap-3">
            <span class="font-bold">{{ onboarding.checklist.hasContact ? '✓' : '○' }}</span>
            <span class="font-medium">Kontak & Alamat Sekolah</span>
          </div>
          <NuxtLink to="/dashboard/contact" class="text-xs font-bold text-emerald-700 hover:underline">Kelola →</NuxtLink>
        </div>

        <div class="p-4 rounded-xl border flex items-center justify-between" :class="onboarding.checklist.hasHero ? 'bg-emerald-50/50 border-emerald-200 text-emerald-900' : 'bg-slate-50 border-slate-200 text-slate-700'">
          <div class="flex items-center gap-3">
            <span class="font-bold">{{ onboarding.checklist.hasHero ? '✓' : '○' }}</span>
            <span class="font-medium">Slide Banner Beranda</span>
          </div>
          <NuxtLink to="/dashboard/hero" class="text-xs font-bold text-emerald-700 hover:underline">Kelola →</NuxtLink>
        </div>

        <div class="p-4 rounded-xl border flex items-center justify-between" :class="onboarding.checklist.hasVisionMission ? 'bg-emerald-50/50 border-emerald-200 text-emerald-900' : 'bg-slate-50 border-slate-200 text-slate-700'">
          <div class="flex items-center gap-3">
            <span class="font-bold">{{ onboarding.checklist.hasVisionMission ? '✓' : '○' }}</span>
            <span class="font-medium">Visi & Misi Sekolah</span>
          </div>
          <NuxtLink to="/dashboard/vision-mission" class="text-xs font-bold text-emerald-700 hover:underline">Kelola →</NuxtLink>
        </div>
      </div>
    </div>
  </div>
</template>
