<script setup lang="ts">
const route = useRoute();
const config = useRuntimeConfig();
const siteSlug = computed(() => String(route.query.site || 'man5sleman'));
const { data, pending, error } = await useAsyncData(
  () => `news-${siteSlug.value}-${route.params.slug}`,
  async () => {
    const base = import.meta.server ? config.public.apiBase : '';
    const response = await fetch(`${base}/api/v1/public/news/${encodeURIComponent(String(route.params.slug))}?site=${encodeURIComponent(siteSlug.value)}`);
    const result = await response.json();
    if (!response.ok || !result.success) throw new Error(result.error?.message || 'Berita tidak ditemukan.');
    return result.data;
  },
  { watch: [siteSlug, () => route.params.slug] }
);
useSeoMeta({ title: () => data.value?.seoTitle || data.value?.title || 'Berita', description: () => data.value?.seoDescription || data.value?.summary || '' });
</script>

<template>
  <main class="min-h-screen bg-slate-50 py-10 px-4">
    <article class="max-w-3xl mx-auto bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
      <div v-if="pending" class="p-12 text-center text-slate-500">Memuat berita…</div>
      <div v-else-if="error" class="p-12 text-center"><h1 class="font-bold text-xl">Berita tidak ditemukan</h1><p class="text-sm text-slate-500 mt-2">{{ error.message }}</p></div>
      <template v-else-if="data">
        <img v-if="data.coverImageUrl" :src="data.coverImageUrl" :alt="data.title" class="w-full max-h-[440px] object-cover">
        <div class="p-7 md:p-12">
          <NuxtLink :to="`/?slug=${siteSlug}`" class="text-xs font-bold text-emerald-700">← Kembali ke website</NuxtLink>
          <div class="text-xs text-slate-500 mt-6">{{ data.category }} · {{ data.author }} · {{ data.publishedAt ? new Date(data.publishedAt).toLocaleDateString('id-ID') : '' }}</div>
          <h1 class="text-3xl md:text-4xl font-black text-slate-900 mt-3 leading-tight">{{ data.title }}</h1>
          <p v-if="data.summary" class="text-lg text-slate-600 mt-4">{{ data.summary }}</p>
          <div class="news-content mt-9 text-slate-700 leading-8" v-html="data.contentHtml"></div>
        </div>
      </template>
    </article>
  </main>
</template>

<style scoped>
.news-content :deep(h2) { font-size: 1.6rem; font-weight: 800; margin: 2rem 0 .75rem; color: #0f172a; }
.news-content :deep(h3) { font-size: 1.25rem; font-weight: 750; margin: 1.5rem 0 .5rem; color: #0f172a; }
.news-content :deep(p) { margin: 1rem 0; }
.news-content :deep(ul) { list-style: disc; padding-left: 1.5rem; }
.news-content :deep(ol) { list-style: decimal; padding-left: 1.5rem; }
.news-content :deep(blockquote) { border-left: 4px solid #059669; padding-left: 1rem; font-style: italic; color: #475569; }
.news-content :deep(img) { width: 100%; border-radius: 1rem; margin-top: 1.5rem; }
.news-content :deep(figcaption) { text-align: center; font-size: .8rem; color: #64748b; }
.news-content :deep(a) { color: #047857; text-decoration: underline; }
</style>
