<script setup lang="ts">
import { computed, ref } from 'vue';
import { useAuth } from '~/composables/useAuth';
import { useApiClient } from '~/composables/useApi';
import { useToast } from '~/composables/useToast';

const props = defineProps<{
  title?: string;
  subtitle?: string;
  slug?: string | null;
  siteId?: string | null;
}>();

const { user } = useAuth();
const toast = useToast();
const isPublishing = ref(false);

const subdomainUrl = computed(() => {
  if (!props.slug) return '/';
  return `/?slug=${props.slug}`;
});

async function handleInstantPublish() {
  let activeSiteId = props.siteId;
  let activeSlug = props.slug;

  if (!activeSiteId && user.value?.school?.id) {
    const obRes = await useApiClient(`/schools/${user.value.school.id}/onboarding`);
    if (obRes.success && obRes.data) {
      activeSiteId = obRes.data.siteId;
      activeSlug = obRes.data.slug;
    }
  }

  if (!activeSiteId) {
    toast.error('Gagal Publikasi', 'Situs sekolah belum terkonfigurasi.');
    return;
  }

  isPublishing.value = true;
  const res = await useApiClient(`/sites/${activeSiteId}/publish`, {
    method: 'POST',
    body: { summary: 'Publikasi langsung dari navbar' }
  });
  isPublishing.value = false;

  if (res.success) {
    toast.success('Website Berhasil Online! 🚀', 'Draft telah dipublikasikan dan langsung aktif.');
    const liveTarget = `/?slug=${activeSlug || res.data?.slug || ''}`;
    window.open(liveTarget, '_blank');
  } else {
    toast.error('Gagal Mempublikasikan', res.error?.message);
  }
}
</script>

<template>
  <header class="h-16 bg-white border-b border-slate-200 sticky top-0 z-20 flex items-center justify-between px-8 shadow-sm">
    <div>
      <h1 class="text-lg font-bold text-slate-900 leading-tight">
        {{ title || 'Dashboard Sekolah' }}
      </h1>
      <p v-if="subtitle" class="text-xs text-slate-500 font-medium">
        {{ subtitle }}
      </p>
    </div>

    <div class="flex items-center gap-3">
      <!-- Subdomain Live Link -->
      <a
        v-if="slug"
        :href="subdomainUrl || '#'"
        target="_blank"
        class="hidden sm:inline-flex items-center gap-2 text-xs font-bold px-3.5 py-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition shadow-xs"
      >
        <span>🌐</span>
        <span>Lihat Website</span>
        <span class="text-[10px]">↗</span>
      </a>

      <!-- Quick Action: Preview -->
      <NuxtLink
        to="/dashboard/preview"
        class="inline-flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition"
      >
        <span>👁️</span>
        <span>Preview</span>
      </NuxtLink>

      <!-- Instant Action: Publish & Open Live -->
      <button
        type="button"
        @click="handleInstantPublish"
        :disabled="isPublishing"
        class="inline-flex items-center gap-2 text-xs font-bold px-5 py-2.5 rounded-xl bg-emerald-800 text-white hover:bg-emerald-900 shadow-sm shadow-emerald-800/20 transition cursor-pointer disabled:opacity-50"
      >
        <span>🚀</span>
        <span>{{ isPublishing ? 'Mempublikasikan...' : 'Publikasi' }}</span>
        <span class="text-[10px] text-emerald-200 font-normal hidden sm:inline">↗</span>
      </button>
    </div>
  </header>
</template>
