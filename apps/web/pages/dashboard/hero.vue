<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useAuth } from '~/composables/useAuth';
import { useApiClient } from '~/composables/useApi';
import { useToast } from '~/composables/useToast';
import MediaSelectorModal from '~/components/MediaSelectorModal.vue';

definePageMeta({ layout: 'dashboard' });

const { user } = useAuth();
const toast = useToast();

const siteId = ref<string | null>(null);
const slides = ref<any[]>([]);
const isLoading = ref(true);
const showModal = ref(false);
const showMediaModal = ref(false);
const isEditing = ref(false);
const editingId = ref<string | null>(null);

const form = ref({
  title: '',
  subtitle: '',
  imageUrl: '',
  ctaText: 'Daftar Sekarang',
  ctaUrl: '#ppdb',
  ctaSecondaryText: 'Lihat Program',
  ctaSecondaryUrl: '#programs',
  isActive: true,
  sortOrder: 1
});

async function loadData() {
  if (!user.value?.school?.id) return;
  isLoading.value = true;

  const obRes = await useApiClient(`/schools/${user.value.school.id}/onboarding`);
  if (obRes.success && obRes.data?.siteId) {
    siteId.value = obRes.data.siteId;
    const res = await useApiClient(`/sites/${siteId.value}/content?type=hero_slide`);
    if (res.success && res.data) {
      slides.value = res.data;
    }
  }
  isLoading.value = false;
}

function openCreateModal() {
  isEditing.value = false;
  editingId.value = null;
  form.value = {
    title: '',
    subtitle: '',
    imageUrl: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=1600&h=800&fit=crop',
    ctaText: 'Daftar Sekarang',
    ctaUrl: '#ppdb',
    ctaSecondaryText: 'Lihat Program',
    ctaSecondaryUrl: '#programs',
    isActive: true,
    sortOrder: slides.value.length + 1
  };
  showModal.value = true;
}

function openEditModal(slide: any) {
  isEditing.value = true;
  editingId.value = slide.id;
  form.value = {
    ...slide.payload,
    title: slide.title,
    sortOrder: slide.sortOrder
  };
  showModal.value = true;
}

async function handleSave() {
  if (!siteId.value || !form.value.title || !form.value.imageUrl) {
    toast.error('Form Belum Lengkap', 'Judul dan gambar slide wajib diisi.');
    return;
  }

  if (isEditing.value && editingId.value) {
    const res = await useApiClient(`/sites/${siteId.value}/content/${editingId.value}`, {
      method: 'PATCH',
      body: {
        title: form.value.title,
        sortOrder: form.value.sortOrder,
        payload: form.value
      }
    });
    if (res.success) {
      toast.success('Slide Diperbarui', 'Perubahan slide berhasil disimpan.');
      showModal.value = false;
      loadData();
    } else {
      toast.error('Gagal Menyimpan', res.error?.message);
    }
  } else {
    const res = await useApiClient(`/sites/${siteId.value}/content`, {
      method: 'POST',
      body: {
        type: 'hero_slide',
        title: form.value.title,
        sortOrder: form.value.sortOrder,
        payload: form.value
      }
    });
    if (res.success) {
      toast.success('Slide Ditambahkan', 'Slide beranda baru berhasil dibuat.');
      showModal.value = false;
      loadData();
    } else {
      toast.error('Gagal Menambahkan', res.error?.message);
    }
  }
}

async function handleDelete(slideId: string) {
  if (!confirm('Apakah Anda yakin ingin menghapus slide ini?')) return;
  const res = await useApiClient(`/sites/${siteId.value}/content/${slideId}`, { method: 'DELETE' });
  if (res.success) {
    toast.success('Slide Dihapus', 'Slide beranda berhasil dihapus.');
    loadData();
  } else {
    toast.error('Gagal Menghapus', res.error?.message);
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
        <h2 class="text-xl font-bold text-slate-900">Slide Banner Beranda (Hero)</h2>
        <p class="text-xs text-slate-500">Kelola banner visual utama yang tampil paling atas di halaman depan</p>
      </div>
      <button
        type="button"
        @click="openCreateModal"
        class="px-5 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs shadow-md shadow-emerald-800/20 transition flex items-center gap-2"
      >
        <span>+</span> Tambah Slide Baru
      </button>
    </div>

    <!-- Slides List -->
    <div v-if="slides.length === 0" class="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-sm text-slate-400">
      <p class="text-4xl mb-3">🖼️</p>
      <h3 class="text-base font-bold text-slate-700 mb-1">Belum Ada Slide Banner</h3>
      <p class="text-xs text-slate-500 mb-6">Tambahkan slide untuk menarik minat calon siswa dan orang tua.</p>
      <button
        type="button"
        @click="openCreateModal"
        class="px-5 py-2.5 rounded-xl bg-emerald-800 text-white font-bold text-xs hover:bg-emerald-900 transition"
      >
        + Tambah Slide Sekarang
      </button>
    </div>

    <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div
        v-for="slide in slides"
        :key="slide.id"
        class="bg-white rounded-3xl overflow-hidden border border-slate-200 shadow-sm flex flex-col justify-between group"
      >
        <div class="aspect-[16/9] relative bg-slate-100 overflow-hidden">
          <img :src="slide.payload?.imageUrl" :alt="slide.title" class="w-full h-full object-cover group-hover:scale-105 transition duration-300">
          <div class="absolute top-3 left-3 bg-black/60 backdrop-blur-md text-white text-xs font-bold px-3 py-1 rounded-full">
            Urutan: {{ slide.sortOrder }}
          </div>
        </div>

        <div class="p-6 space-y-3 flex-1 flex flex-col justify-between">
          <div>
            <h3 class="font-bold text-base text-slate-900 line-clamp-1">{{ slide.title }}</h3>
            <p class="text-xs text-slate-600 line-clamp-2 mt-1">{{ slide.payload?.subtitle }}</p>
          </div>

          <div class="pt-4 border-t border-slate-100 flex items-center justify-between">
            <span class="text-xs font-semibold text-emerald-800">CTA: {{ slide.payload?.ctaText }}</span>
            <div class="flex items-center gap-2">
              <button
                type="button"
                @click="openEditModal(slide)"
                class="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition"
              >
                Edit
              </button>
              <button
                type="button"
                @click="handleDelete(slide.id)"
                class="px-3 py-1.5 rounded-lg text-rose-600 hover:bg-rose-50 font-bold text-xs transition"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal Form -->
    <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div class="bg-white rounded-3xl max-w-xl w-full p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto custom-scrollbar">
        <div class="flex items-center justify-between border-b pb-4">
          <h3 class="text-lg font-bold text-slate-900">{{ isEditing ? 'Edit Slide Banner' : 'Tambah Slide Baru' }}</h3>
          <button type="button" @click="showModal = false" class="text-slate-400 hover:text-slate-600">✕</button>
        </div>

        <form @submit.prevent="handleSave" class="space-y-4">
          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Judul Utama Slide *</label>
            <input
              v-model="form.title"
              type="text"
              required
              placeholder="Contoh: Mewujudkan Generasi Emas Berprestasi"
              class="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
            >
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Subjudul / Deskripsi Pendukung</label>
            <textarea
              v-model="form.subtitle"
              rows="2"
              placeholder="Pendidikan holistik dengan fasilitas bertaraf internasional..."
              class="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
            ></textarea>
          </div>

          <!-- Image Picker -->
          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Gambar Background Slide *</label>
            <div class="flex items-center gap-3">
              <input
                v-model="form.imageUrl"
                type="url"
                required
                placeholder="https://images.unsplash.com/..."
                class="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
              >
              <button
                type="button"
                @click="showMediaModal = true"
                class="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
              >
                Pilih Media
              </button>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Teks Tombol CTA</label>
              <input
                v-model="form.ctaText"
                type="text"
                class="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
              >
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Tautan URL CTA</label>
              <input
                v-model="form.ctaUrl"
                type="text"
                class="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
              >
            </div>
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Urutan Tampil (Sort Order)</label>
            <input
              v-model.number="form.sortOrder"
              type="number"
              min="1"
              class="w-24 px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
            >
          </div>

          <div class="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              @click="showModal = false"
              class="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50"
            >
              Batal
            </button>
            <button
              type="submit"
              class="px-6 py-2.5 rounded-xl bg-emerald-800 text-white font-bold text-xs hover:bg-emerald-900 shadow-md shadow-emerald-800/20"
            >
              Simpan Slide
            </button>
          </div>
        </form>
      </div>
    </div>

    <MediaSelectorModal
      v-if="siteId"
      :site-id="siteId"
      :is-open="showMediaModal"
      @close="showMediaModal = false"
      @select="(url) => form.imageUrl = url"
    />
  </div>
</template>
