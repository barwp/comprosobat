<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useApiClient } from '~/composables/useApi';
import { useToast } from '~/composables/useToast';

const props = defineProps<{
  siteId: string;
  isOpen: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'select', url: string): void;
}>();

const toast = useToast();
const mediaList = ref<any[]>([]);
const isUploading = ref(false);
const selectedTab = ref<'library' | 'upload' | 'url'>('library');
const directUrl = ref('');

async function loadMedia() {
  if (!props.siteId) return;
  const res = await useApiClient(`/sites/${props.siteId}/media`);
  if (res.success && res.data) {
    mediaList.value = res.data;
  }
}

async function handleFileUpload(event: Event) {
  const target = event.target as HTMLInputElement;
  const files = target.files;
  if (!files || files.length === 0) return;

  const file = files[0];
  const formData = new FormData();
  formData.append('file', file);
  formData.append('altText', file.name.split('.')[0]);

  isUploading.value = true;
  const res = await useApiClient(`/sites/${props.siteId}/media/upload`, {
    method: 'POST',
    body: formData
  });
  isUploading.value = false;

  if (res.success && res.data) {
    toast.success('Upload Berhasil', 'Gambar berhasil ditambahkan ke pustaka media.');
    emit('select', res.data.url);
    emit('close');
  } else {
    toast.error('Upload Gagal', res.error?.message || 'Gagal mengunggah gambar.');
  }
}

function handleSelectUrl(url: string) {
  if (!url) return;
  emit('select', url);
  emit('close');
}

onMounted(() => {
  if (props.isOpen) {
    loadMedia();
  }
});
</script>

<template>
  <div v-if="isOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
    <div class="bg-white rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
      <!-- Header -->
      <div class="p-6 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h3 class="text-lg font-bold text-slate-900">Pilih atau Unggah Media</h3>
          <p class="text-xs text-slate-500">Pilih gambar dari pustaka atau unggah file baru</p>
        </div>
        <button type="button" @click="emit('close')" class="text-slate-400 hover:text-slate-600 p-2">✕</button>
      </div>

      <!-- Tabs -->
      <div class="flex border-b border-slate-100 px-6 gap-6 text-sm font-semibold">
        <button
          type="button"
          @click="selectedTab = 'library'; loadMedia();"
          class="py-3 border-b-2 transition"
          :class="selectedTab === 'library' ? 'border-emerald-600 text-emerald-800' : 'border-transparent text-slate-500 hover:text-slate-700'"
        >
          Pustaka Media
        </button>
        <button
          type="button"
          @click="selectedTab = 'upload'"
          class="py-3 border-b-2 transition"
          :class="selectedTab === 'upload' ? 'border-emerald-600 text-emerald-800' : 'border-transparent text-slate-500 hover:text-slate-700'"
        >
          Unggah File Baru
        </button>
        <button
          type="button"
          @click="selectedTab = 'url'"
          class="py-3 border-b-2 transition"
          :class="selectedTab === 'url' ? 'border-emerald-600 text-emerald-800' : 'border-transparent text-slate-500 hover:text-slate-700'"
        >
          URL Gambar Eksternal
        </button>
      </div>

      <!-- Content Body -->
      <div class="p-6 flex-1 overflow-y-auto custom-scrollbar">
        <!-- Tab 1: Library -->
        <div v-if="selectedTab === 'library'">
          <div v-if="mediaList.length === 0" class="text-center py-12 text-slate-400">
            <p class="text-3xl mb-2">📁</p>
            <p class="text-sm font-medium">Belum ada file media yang diunggah.</p>
          </div>
          <div v-else class="grid grid-cols-3 sm:grid-cols-4 gap-4">
            <div
              v-for="item in mediaList"
              :key="item.id"
              @click="handleSelectUrl(item.url)"
              class="aspect-square rounded-xl border border-slate-200 overflow-hidden cursor-pointer hover:border-emerald-500 hover:ring-2 hover:ring-emerald-500/20 group relative transition"
            >
              <img :src="item.url" :alt="item.altText" class="w-full h-full object-cover group-hover:scale-105 transition duration-200">
              <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-bold transition">
                Pilih
              </div>
            </div>
          </div>
        </div>

        <!-- Tab 2: Upload -->
        <div v-else-if="selectedTab === 'upload'" class="py-8 text-center">
          <label class="border-2 border-dashed border-slate-200 hover:border-emerald-500 rounded-2xl p-10 block cursor-pointer bg-slate-50 hover:bg-emerald-50/50 transition">
            <input type="file" accept="image/*" class="hidden" @change="handleFileUpload">
            <span class="text-4xl block mb-2">📤</span>
            <span class="text-sm font-bold text-slate-800 block">Klik untuk memilih file gambar</span>
            <span class="text-xs text-slate-500 mt-1 block">Format didukung: JPG, PNG, WEBP, SVG (Maks. 10MB)</span>
            <span v-if="isUploading" class="text-xs font-bold text-emerald-700 mt-3 block animate-pulse">Mengunggah...</span>
          </label>
        </div>

        <!-- Tab 3: URL Direct -->
        <div v-else-if="selectedTab === 'url'" class="space-y-4 py-4">
          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Tautan URL Gambar</label>
            <input
              v-model="directUrl"
              type="url"
              placeholder="https://images.unsplash.com/photo-..."
              class="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
          </div>
          <button
            type="button"
            @click="handleSelectUrl(directUrl)"
            :disabled="!directUrl"
            class="px-5 py-2.5 rounded-xl bg-emerald-800 text-white font-bold text-xs hover:bg-emerald-900 disabled:opacity-50 transition"
          >
            Gunakan Gambar Ini
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
