<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useAuth } from '~/composables/useAuth';
import { useApiClient } from '~/composables/useApi';
import { useSiteTemplate } from '~/composables/useSiteTemplate';

definePageMeta({ layout: 'dashboard' });

const { user } = useAuth();
const { template, fetchActiveTemplate } = useSiteTemplate();
const siteId = ref<string | null>(null);
const previewUrl = ref<string | null>(null);
const activeDevice = ref<'desktop' | 'tablet' | 'mobile'>('desktop');
const isLoading = ref(true);
const errorMessage = ref<string | null>(null);

async function loadPreview() {
  if (!user.value?.school?.id) return;
  isLoading.value = true;
  errorMessage.value = null;

  try {
    await fetchActiveTemplate();
    const obRes = await useApiClient(`/schools/${user.value.school.id}/onboarding`);
    if (obRes.success && obRes.data?.siteId) {
      siteId.value = obRes.data.siteId;

      const tokenRes = await useApiClient(`/sites/${siteId.value}/preview-token`, { method: 'POST' });
      if (tokenRes.success && tokenRes.data) {
        previewUrl.value = `/api/v1/public/render?token=${tokenRes.data.token}&_t=${Date.now()}`;
      } else {
        errorMessage.value = tokenRes.error?.message || 'Gagal menghasilkan token pratinjau.';
      }
    } else {
      errorMessage.value = obRes.error?.message || 'Data situs sekolah tidak ditemukan.';
    }
  } catch (err: any) {
    errorMessage.value = err.message || 'Terjadi kesalahan saat memuat pratinjau.';
  } finally {
    isLoading.value = false;
  }
}

onMounted(() => {
  loadPreview();
});
</script>

<template>
  <div class="space-y-4">
    <!-- Header with Device Switcher & Template Badge -->
    <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
      <div>
        <div class="flex items-center gap-2">
          <h2 class="text-base font-bold text-slate-900">Live Draft Preview</h2>
          <span v-if="template" class="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
            🎨 {{ template.templateName }} (v{{ template.version }})
          </span>
        </div>
        <p class="text-xs text-slate-500 mt-0.5">
          Pratinjau langsung tampilan situs dari perubahan draft di CMS tanpa harus publish terlebih dahulu.
        </p>
      </div>

      <!-- Device Frame Switcher & Actions -->
      <div class="flex flex-wrap items-center gap-3">
        <div class="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
          <button
            type="button"
            @click="activeDevice = 'desktop'"
            class="px-3 py-1.5 rounded-lg text-xs font-bold transition"
            :class="activeDevice === 'desktop' ? 'bg-white text-emerald-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'"
          >
            🖥️ Desktop (1280px)
          </button>
          <button
            type="button"
            @click="activeDevice = 'tablet'"
            class="px-3 py-1.5 rounded-lg text-xs font-bold transition"
            :class="activeDevice === 'tablet' ? 'bg-white text-emerald-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'"
          >
            📱 Tablet (768px)
          </button>
          <button
            type="button"
            @click="activeDevice = 'mobile'"
            class="px-3 py-1.5 rounded-lg text-xs font-bold transition"
            :class="activeDevice === 'mobile' ? 'bg-white text-emerald-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'"
          >
            📱 Mobile (375px)
          </button>
        </div>

        <button
          type="button"
          @click="loadPreview"
          :disabled="isLoading"
          class="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center gap-1.5 disabled:opacity-50"
          title="Muat Ulang Pratinjau"
        >
          <span :class="{ 'animate-spin': isLoading }">🔄</span> Segarkan
        </button>

        <a
          v-if="previewUrl"
          :href="previewUrl"
          target="_blank"
          class="px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold transition flex items-center gap-1.5"
        >
          <span>↗</span> Tab Baru
        </a>
      </div>
    </div>

    <!-- Error state banner if any -->
    <div v-if="errorMessage" class="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-rose-800 text-xs flex items-center justify-between">
      <div class="flex items-center gap-2">
        <span class="text-base">⚠️</span>
        <span>{{ errorMessage }}</span>
      </div>
      <button type="button" @click="loadPreview" class="underline font-bold hover:text-rose-900">
        Coba Lagi
      </button>
    </div>

    <!-- Preview Canvas Frame -->
    <div class="bg-slate-950 rounded-3xl p-4 sm:p-8 flex justify-center min-h-[750px] overflow-x-auto border border-slate-800 shadow-inner">
      <div
        class="transition-all duration-300 bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col relative"
        :class="{
          'w-full max-w-[1280px] h-[750px]': activeDevice === 'desktop',
          'w-[768px] h-[750px]': activeDevice === 'tablet',
          'w-[375px] h-[700px]': activeDevice === 'mobile'
        }"
      >
        <!-- Loading Overlay -->
        <div v-if="isLoading" class="absolute inset-0 bg-white/80 backdrop-blur-xs z-10 flex flex-col items-center justify-center gap-3">
          <div class="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
          <p class="text-xs font-semibold text-slate-700">Menyusun draft pratinjau...</p>
        </div>

        <iframe
          v-if="previewUrl"
          :src="previewUrl"
          class="w-full h-full border-0"
          title="Preview Website"
        ></iframe>
        <div v-else class="flex-1 flex items-center justify-center text-slate-400 text-sm">
          Menyiapkan pratinjau...
        </div>
      </div>
    </div>
  </div>
</template>
