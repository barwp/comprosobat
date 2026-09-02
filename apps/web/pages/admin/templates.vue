<script setup lang="ts">
import { computed, ref, onMounted } from 'vue';
import { useApiClient } from '~/composables/useApi';
import { useToast } from '~/composables/useToast';

definePageMeta({ layout: 'admin' });

const toast = useToast();
const templates = ref<any[]>([]);
const isLoading = ref(true);
const isUploading = ref(false);
const showUploadModal = ref(false);
const validationErrors = ref<any[]>([]);
const previewHtml = ref('');
const previewTitle = ref('');
const previewVersionId = ref<string | null>(null);
const isPreviewOpen = ref(false);
const isPreviewLoading = ref(false);
const previewViewport = ref<'desktop' | 'tablet' | 'mobile'>('desktop');

const previewWidthClass = computed(() => ({
  desktop: 'w-full',
  tablet: 'w-[768px] max-w-full',
  mobile: 'w-[390px] max-w-full'
}[previewViewport.value]));

async function loadTemplates() {
  isLoading.value = true;
  const res = await useApiClient('/admin/templates');
  if (res.success && res.data) {
    templates.value = res.data;
  }
  isLoading.value = false;
}

async function handleZipUpload(event: Event) {
  const target = event.target as HTMLInputElement;
  const files = target.files;
  if (!files || files.length === 0) return;

  const file = files[0];
  const formData = new FormData();
  formData.append('file', file);

  isUploading.value = true;
  validationErrors.value = [];

  const res = await useApiClient('/admin/templates/upload', {
    method: 'POST',
    body: formData
  });
  isUploading.value = false;

  if (res.success) {
    toast.success('Template Valid & Diunggah!', `Versi ${res.data?.manifest?.version} berhasil diaktifkan.`);
    showUploadModal.value = false;
    loadTemplates();
  } else {
    toast.error('Validasi Template Gagal', res.error?.message || 'Terdapat kesalahan keamanan atau struktur pada paket ZIP.');
    if (res.error?.fields?.validationErrors) {
      try {
        validationErrors.value = JSON.parse(res.error.fields.validationErrors);
      } catch (e) {}
    }
  }
}

async function toggleVersionActive(versionId: string, currentActive: boolean) {
  const res = await useApiClient(`/admin/templates/versions/${versionId}/status`, {
    method: 'PATCH',
    body: { isActive: !currentActive }
  });

  if (res.success) {
    toast.success('Status Versi Template Diperbarui', !currentActive ? 'Versi diaktifkan.' : 'Versi dinonaktifkan.');
    loadTemplates();
  }
}

async function openTemplatePreview(tpl: any, ver: any) {
  isPreviewOpen.value = true;
  isPreviewLoading.value = true;
  previewVersionId.value = ver.id;
  previewTitle.value = `${tpl.name} — v${ver.version}`;
  previewHtml.value = '';
  previewViewport.value = 'desktop';
  const res = await useApiClient(`/admin/templates/versions/${ver.id}/preview`);
  isPreviewLoading.value = false;
  if (res.success && res.data?.html) {
    previewHtml.value = res.data.html;
  } else {
    toast.error('Preview Gagal', res.error?.message || 'File preview template tidak dapat dimuat.');
    isPreviewOpen.value = false;
  }
}

function closeTemplatePreview() {
  isPreviewOpen.value = false;
  previewHtml.value = '';
  previewVersionId.value = null;
}

onMounted(() => {
  loadTemplates();
});
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-black text-white">Manajemen & Upload Template</h1>
        <p class="text-xs text-slate-400">Kelola katalog template resmi dan unggah paket template HTML baru dengan verifikasi manifest</p>
      </div>

      <button
        type="button"
        @click="showUploadModal = true; validationErrors = [];"
        class="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-lg shadow-purple-600/30 transition flex items-center gap-2"
      >
        <span>📦</span> Upload Template ZIP Baru
      </button>
    </div>

    <!-- Templates List -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div
        v-for="tpl in templates"
        :key="tpl.id"
        class="bg-slate-950 rounded-3xl p-6 border border-slate-800 space-y-4 flex flex-col justify-between"
      >
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <h3 class="font-bold text-lg text-white">{{ tpl.name }}</h3>
            <span class="text-xs font-mono text-purple-300 bg-purple-950 px-2 py-0.5 rounded border border-purple-800">
              {{ tpl.key }}
            </span>
          </div>
          <p class="text-xs text-slate-400">Kategori: <strong class="text-slate-300">{{ tpl.category }}</strong></p>

          <!-- Versions List -->
          <div class="space-y-2 pt-2">
            <p class="text-xs font-bold uppercase tracking-wider text-slate-500">Versi Terpasang:</p>
            <div
              v-for="ver in tpl.versions"
              :key="ver.id"
              class="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs"
            >
              <div>
                <span class="font-bold text-white">v{{ ver.version }}</span>
                <span class="text-slate-500 ml-2 font-mono">({{ ver.checksum.slice(0, 16) }}...)</span>
              </div>

              <div class="flex items-center gap-2">
                <span
                  class="px-2 py-0.5 rounded-full font-bold uppercase text-[10px]"
                  :class="ver.isActive ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-slate-800 text-slate-400'"
                >
                  {{ ver.isActive ? 'Aktif' : 'Nonaktif' }}
                </span>
                <button
                  type="button"
                  @click="openTemplatePreview(tpl, ver)"
                  :disabled="isPreviewLoading && previewVersionId === ver.id"
                  class="px-2.5 py-1 rounded bg-purple-700 hover:bg-purple-600 text-white font-bold text-[11px] disabled:opacity-50"
                >
                  {{ isPreviewLoading && previewVersionId === ver.id ? 'Memuat...' : '👁 Preview' }}
                </button>
                <button
                  type="button"
                  @click="toggleVersionActive(ver.id, ver.isActive)"
                  class="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-[11px]"
                >
                  {{ ver.isActive ? 'Nonaktifkan' : 'Aktifkan' }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Sandboxed template preview -->
    <div v-if="isPreviewOpen" class="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm p-2 sm:p-4 flex items-center justify-center">
      <div class="w-full max-w-[1600px] h-[calc(100dvh-1rem)] sm:h-[calc(100dvh-2rem)] bg-slate-950 border border-slate-700 rounded-2xl overflow-hidden shadow-2xl flex flex-col">
        <div class="px-4 sm:px-5 py-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div class="min-w-0">
            <h3 class="font-bold text-white">Preview Template</h3>
            <p class="text-xs text-slate-400 mt-0.5 truncate">{{ previewTitle }} · Terisolasi, belum dipasang atau dipublikasikan</p>
          </div>
          <div class="flex items-center gap-2 ml-auto">
            <div class="hidden sm:flex items-center rounded-xl bg-slate-900 border border-slate-800 p-1">
              <button
                v-for="viewport in ['desktop', 'tablet', 'mobile'] as const"
                :key="viewport"
                type="button"
                @click="previewViewport = viewport"
                class="px-3 py-1.5 rounded-lg text-[11px] font-bold transition"
                :class="previewViewport === viewport ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'"
              >
                {{ viewport === 'desktop' ? 'Desktop' : viewport === 'tablet' ? 'Tablet' : 'Mobile' }}
              </button>
            </div>
            <button type="button" @click="closeTemplatePreview" class="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold whitespace-nowrap">✕ Tutup</button>
          </div>
        </div>
        <div class="flex-1 bg-slate-900 p-2 sm:p-3 min-h-0 overflow-hidden">
          <div v-if="isPreviewLoading" class="w-full h-full bg-white rounded-2xl flex items-center justify-center text-slate-500 text-sm font-semibold">
            Memuat preview template...
          </div>
          <div v-else class="w-full h-full overflow-auto flex justify-center bg-slate-800/60 rounded-xl">
            <iframe
              v-if="previewHtml"
              :key="previewVersionId || undefined"
              :srcdoc="previewHtml"
              sandbox="allow-scripts allow-forms allow-modals"
              class="h-full min-h-[640px] bg-white border-0 shadow-2xl transition-[width] duration-300"
              :class="previewWidthClass"
              :title="`Preview ${previewTitle}`"
            ></iframe>
            <div v-else class="w-full h-full bg-white flex items-center justify-center text-slate-500 text-sm font-semibold">
              Konten preview tidak tersedia.
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Upload Modal with Security Scanner Report -->
    <div v-if="showUploadModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div class="bg-slate-950 border border-slate-800 rounded-3xl max-w-xl w-full p-8 shadow-2xl space-y-6 text-slate-100 max-h-[90vh] overflow-y-auto custom-scrollbar">
        <div class="flex items-center justify-between border-b border-slate-800 pb-4">
          <h3 class="text-lg font-bold text-white">Upload Template HTML / Paket (.ZIP / .HTML)</h3>
          <button type="button" @click="showUploadModal = false" class="text-slate-400 hover:text-white">✕</button>
        </div>

        <div class="space-y-4">
          <p class="text-xs text-slate-400 leading-relaxed">
            Anda dapat mengunggah file <code class="text-purple-300">.html</code> mandiri secara langsung atau paket <code class="text-purple-300">.zip</code> berisi <code class="text-purple-300">manifest.json</code> + <code class="text-purple-300">index.html</code>. Sistem akan memindai script berbahaya dan mendaftarkan template otomatis.
          </p>

          <label class="border-2 border-dashed border-slate-800 hover:border-purple-500 rounded-2xl p-8 block text-center cursor-pointer bg-slate-900/60 hover:bg-purple-950/20 transition">
            <input type="file" accept=".zip,.html,.htm" class="hidden" @change="handleZipUpload">
            <span class="text-4xl block mb-2">📄 / 📦</span>
            <span class="text-sm font-bold text-white block">Pilih File Template (.HTML atau .ZIP)</span>
            <span class="text-xs text-slate-500 mt-1 block">Maksimal 50MB</span>
            <span v-if="isUploading" class="text-xs font-bold text-purple-400 mt-3 block animate-pulse">Memindai keamanan template...</span>
          </label>

          <!-- Error Feedback -->
          <div v-if="validationErrors.length > 0" class="p-4 rounded-2xl bg-rose-950/80 border border-rose-800 space-y-2 text-xs">
            <p class="font-bold text-rose-300 uppercase">Temuan Validasi Keamanan / Struktur:</p>
            <ul class="space-y-1 text-rose-200 list-disc list-inside">
              <li v-for="(err, idx) in validationErrors" :key="idx">
                <strong v-if="err.file">{{ err.file }}: </strong>{{ err.message }}
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
