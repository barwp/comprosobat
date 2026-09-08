<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useAuth } from '~/composables/useAuth';
import { useApiClient } from '~/composables/useApi';
import { useToast } from '~/composables/useToast';

definePageMeta({ layout: 'dashboard' });

const { user } = useAuth();
const toast = useToast();

const siteId = ref<string | null>(null);
const mediaList = ref<any[]>([]);
const isLoading = ref(true);
const isUploading = ref(false);

async function loadData() {
  if (!user.value?.school?.id) return;
  isLoading.value = true;
  const obRes = await useApiClient(`/schools/${user.value.school.id}/onboarding`);
  if (obRes.success && obRes.data?.siteId) {
    siteId.value = obRes.data.siteId;
    const res = await useApiClient(`/sites/${siteId.value}/media`);
    if (res.success && res.data) {
      mediaList.value = res.data;
    }
  }
  isLoading.value = false;
}

async function handleFileUpload(event: Event) {
  const target = event.target as HTMLInputElement;
  const files = target.files;
  if (!files || files.length === 0 || !siteId.value) return;

  const file = files[0];
  const formData = new FormData();
  formData.append('file', file);
  formData.append('altText', file.name.split('.')[0]);

  isUploading.value = true;
  const res = await useApiClient(`/sites/${siteId.value}/media/upload`, {
    method: 'POST',
    body: formData
  });
  isUploading.value = false;

  if (res.success) {
    toast.success('Upload Berhasil', 'Gambar tersimpan sebagai draft dan langsung tampil pada galeri di Live Preview.');
    loadData();
  } else {
    toast.error('Upload Gagal', res.error?.message);
  }
}

async function handleDelete(assetId: string) {
  if (!confirm('Hapus file media ini?')) return;
  const res = await useApiClient(`/sites/${siteId.value}/media/${assetId}`, { method: 'DELETE' });
  if (res.success) {
    toast.success('Media Dihapus', 'File berhasil dihapus dari pustaka.');
    loadData();
  } else {
    toast.error('Gagal Menghapus', res.error?.message);
  }
}

function copyUrl(url: string) {
  if (typeof window !== 'undefined') {
    navigator.clipboard.writeText(window.location.origin + url);
    toast.info('Tersalin', 'Tautan URL gambar telah disalin ke clipboard.');
  }
}

onMounted(() => {
  loadData();
});
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-xl font-bold text-slate-900">Pustaka Media (Media Library)</h2>
        <p class="text-xs text-slate-500">Kelola kumpulan gambar foto kegiatan, logo, thumbnail berita, dan fasilitas sekolah</p>
      </div>

      <label class="px-5 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs shadow-md shadow-emerald-800/20 transition cursor-pointer flex items-center gap-2">
        <input type="file" accept="image/*" class="hidden" @change="handleFileUpload">
        <span>+</span> Unggah Gambar Baru
      </label>
    </div>

    <!-- Upload Progress -->
    <div v-if="isUploading" class="p-4 bg-emerald-50 text-emerald-800 rounded-2xl border border-emerald-200 text-xs font-bold flex items-center gap-2 animate-pulse">
      <span>📤</span> Sedang mengunggah dan memproses file media...
    </div>

    <!-- Media Grid -->
    <div v-if="mediaList.length === 0" class="bg-white rounded-3xl p-16 text-center border border-slate-200 text-slate-400">
      <p class="text-5xl mb-3">📁</p>
      <h3 class="text-base font-bold text-slate-700 mb-1">Pustaka Media Masih Kosong</h3>
      <p class="text-xs text-slate-500 mb-4">Unggah logo, foto fasilitas, atau banner untuk mulai mempercantik website.</p>
    </div>

    <div v-else class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
      <div
        v-for="item in mediaList"
        :key="item.id"
        class="bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-sm flex flex-col justify-between group"
      >
        <div class="aspect-square relative bg-slate-100 overflow-hidden">
          <img :src="item.url" :alt="item.altText" class="w-full h-full object-cover group-hover:scale-105 transition duration-300">
        </div>
        <div class="p-3 text-xs space-y-2">
          <p class="font-bold text-slate-800 truncate" :title="item.filename">{{ item.filename }}</p>
          <div class="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-100">
            <span>{{ (item.sizeBytes / 1024).toFixed(0) }} KB</span>
            <div class="flex gap-2">
              <button type="button" @click="copyUrl(item.url)" class="text-emerald-700 font-bold hover:underline" title="Salin URL">Salin</button>
              <button type="button" @click="handleDelete(item.id)" class="text-rose-600 font-bold hover:underline" title="Hapus">Hapus</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
