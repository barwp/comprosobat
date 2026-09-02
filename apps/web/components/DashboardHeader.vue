<script setup lang="ts">
import { computed } from 'vue';
import { useAuth } from '~/composables/useAuth';

const props = defineProps<{
  title?: string;
  subtitle?: string;
  slug?: string | null;
  siteId?: string | null;
}>();

const { user } = useAuth();

const subdomainUrl = computed(() => {
  if (!props.slug) return null;
  return `/?slug=${props.slug}`;
});
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

    <div class="flex items-center gap-4">
      <!-- Subdomain Live Link -->
      <a
        v-if="slug"
        :href="subdomainUrl || '#'"
        target="_blank"
        class="hidden sm:inline-flex items-center gap-2 text-xs font-bold px-3.5 py-2 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100 transition shadow-xs"
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

      <!-- Quick Action: Publish -->
      <NuxtLink
        to="/dashboard/publish"
        class="inline-flex items-center gap-2 text-xs font-bold px-4 py-2 rounded-xl bg-emerald-800 text-white hover:bg-emerald-900 shadow-sm shadow-emerald-800/20 transition"
      >
        <span>🚀</span>
        <span>Publikasikan</span>
      </NuxtLink>
    </div>
  </header>
</template>
