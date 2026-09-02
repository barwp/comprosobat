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
const items = ref<any[]>([]);
const isLoading = ref(true);
const showModal = ref(false);
const showMediaModal = ref(false);
const isEditing = ref(false);
const editingId = ref<string | null>(null);
const isSaving = ref(false);

const form = ref({
  name: '',
  description: '',
  thumbnailUrl: '',
  category: 'Akademik',
  sortOrder: 1,
  galleryUrls: [] as string[],
  isActive: true
});

async function loadData() {
  if (!user.value?.school?.id) return;
  isLoading.value = true;
  const obRes = await useApiClient(`/schools/${user.value.school.id}/onboarding`);
  if (obRes.success && obRes.data?.siteId) {
    siteId.value = obRes.data.siteId;
    const res = await useApiClient(`/sites/${siteId.value}/content?type=facility`);
    if (res.success && res.data) {
      items.value = res.data;
    }
  }
  isLoading.value = false;
}

function openCreateModal() {
  isEditing.value = false;
  editingId.value = null;
  form.value = {
    name: '',
    description: '',
    thumbnailUrl: 'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?w=600&h=400&fit=crop',
    category: 'Akademik',
    sortOrder: items.value.length + 1,
    galleryUrls: [],
    isActive: true
  };
  showModal.value = true;
}

function openEditModal(item: any) {
  isEditing.value = true;
  editingId.value = item.id;
  form.value = {
    ...item.payload,
    name: item.title,
    thumbnailUrl: item.payload?.thumbnailUrl || item.payload?.imageUrl || '',
    galleryUrls: item.payload?.galleryUrls || [],
    isActive: item.payload?.isActive !== false,
    sortOrder: item.sortOrder
  };
  showModal.value = true;
}

async function handleSave() {
  if (!siteId.value || !form.value.name || !form.value.thumbnailUrl) {
    toast.error('Form Belum Lengkap', 'Nama dan foto fasilitas wajib diisi.'); return;
  }
  isSaving.value = true;

  if (isEditing.value && editingId.value) {
    const res = await useApiClient(`/sites/${siteId.value}/content/${editingId.value}`, {
      method: 'PATCH',
      body: {
        title: form.value.name,
        status: 'DRAFT',
        sortOrder: form.value.sortOrder,
        payload: form.value
      }
    });
    if (res.success) {
      toast.success('Fasilitas Diperbarui', 'Perubahan fasilitas berhasil disimpan.');
      showModal.value = false;
      loadData();
    } else toast.error('Gagal Menyimpan', res.error?.message || 'Fasilitas tidak dapat diperbarui.');
  } else {
    const res = await useApiClient(`/sites/${siteId.value}/content`, {
      method: 'POST',
      body: {
        type: 'facility',
        title: form.value.name,
        status: 'DRAFT',
        sortOrder: form.value.sortOrder,
        payload: form.value
      }
    });
    if (res.success) {
      toast.success('Fasilitas Ditambahkan', 'Fasilitas baru berhasil disimpan.');
      showModal.value = false;
      loadData();
    } else toast.error('Gagal Menyimpan', res.error?.message || 'Fasilitas tidak dapat ditambahkan.');
  }
  isSaving.value = false;
}

async function handleDelete(id: string) {
  if (!confirm('Hapus fasilitas ini?')) return;
  const res = await useApiClient(`/sites/${siteId.value}/content/${id}`, { method: 'DELETE' });
  if (res.success) {
    toast.success('Fasilitas Dihapus', 'Fasilitas berhasil dihapus.');
    loadData();
  } else toast.error('Gagal Menghapus', res.error?.message || 'Fasilitas tidak dapat dihapus.');
}

onMounted(() => {
  loadData();
});
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-xl font-bold text-slate-900">Fasilitas & Sarana Prasarana</h2>
        <p class="text-xs text-slate-500">Kelola daftar gedung, lab, perpustakaan, lapangan olahraga, dan sarana lainnya</p>
      </div>
      <button
        type="button"
        @click="openCreateModal"
        class="px-5 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs shadow-md shadow-emerald-800/20 transition flex items-center gap-2"
      >
        <span>+</span> Tambah Fasilitas
      </button>
    </div>

    <div v-if="items.length === 0" class="bg-white rounded-3xl p-12 text-center border border-slate-200 text-slate-400">
      <p class="text-4xl mb-3">🏢</p>
      <p class="text-sm font-semibold">Belum ada data fasilitas.</p>
    </div>

    <div v-else class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div
        v-for="item in items"
        :key="item.id"
        class="bg-white rounded-3xl overflow-hidden border border-slate-200 shadow-sm flex flex-col justify-between group"
      >
        <div class="aspect-[16/10] relative bg-slate-100 overflow-hidden">
          <img :src="item.payload?.thumbnailUrl" :alt="item.title" class="w-full h-full object-cover group-hover:scale-105 transition duration-300">
          <span class="absolute top-3 right-3 bg-black/60 backdrop-blur-md text-white text-xs font-semibold px-3 py-1 rounded-full">
            {{ item.payload?.category }}
          </span>
        </div>
        <div class="p-6 space-y-3 flex-1 flex flex-col justify-between">
          <div>
            <h3 class="font-bold text-base text-slate-900">{{ item.title }}</h3>
            <p class="text-xs text-slate-600 line-clamp-2 mt-1">{{ item.payload?.description }}</p>
          </div>
          <div class="pt-4 border-t border-slate-100 flex items-center justify-between">
            <span class="text-xs font-semibold text-slate-400">Urutan: {{ item.sortOrder }}</span>
            <div class="flex gap-2">
              <button type="button" @click="openEditModal(item)" class="text-xs font-bold text-slate-600 hover:text-slate-900">Edit</button>
              <button type="button" @click="handleDelete(item.id)" class="text-xs font-bold text-rose-600 hover:text-rose-800">Hapus</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal Form -->
    <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div class="bg-white rounded-3xl max-w-lg w-full p-8 shadow-2xl space-y-6">
        <h3 class="text-lg font-bold text-slate-900">{{ isEditing ? 'Edit Fasilitas' : 'Tambah Fasilitas Baru' }}</h3>
        <form @submit.prevent="handleSave" class="space-y-4">
          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Nama Fasilitas *</label>
            <input v-model="form.name" type="text" required class="w-full px-4 py-2.5 rounded-xl border text-sm">
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Kategori</label>
            <select v-model="form.category" class="w-full px-4 py-2.5 rounded-xl border text-sm bg-white">
              <option value="Akademik">Akademik</option>
              <option value="Olahraga">Olahraga</option>
              <option value="Teknologi">Teknologi & Lab</option>
              <option value="Kesenian">Kesenian & Ibadah</option>
              <option value="Umum">Umum</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Foto Thumbnail *</label>
            <div class="flex gap-3">
              <input v-model="form.thumbnailUrl" type="url" required class="flex-1 px-4 py-2.5 rounded-xl border text-sm">
              <button type="button" @click="showMediaModal = true" class="px-4 py-2.5 rounded-xl bg-slate-100 text-xs font-bold">Media</button>
            </div>
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Deskripsi Fasilitas</label>
            <textarea v-model="form.description" rows="3" class="w-full px-4 py-2.5 rounded-xl border text-sm"></textarea>
          </div>
          <label class="flex items-center gap-2 text-xs font-bold text-slate-700"><input v-model="form.isActive" type="checkbox"> Tampilkan fasilitas di website</label>
          <div class="flex justify-end gap-3 pt-4 border-t">
            <button type="button" @click="showModal = false" class="px-5 py-2.5 rounded-xl border text-xs font-bold">Batal</button>
            <button type="submit" :disabled="isSaving" class="px-6 py-2.5 rounded-xl bg-emerald-800 text-white font-bold text-xs disabled:opacity-50">{{ isSaving ? 'Menyimpan…' : 'Simpan sebagai Draft' }}</button>
          </div>
        </form>
      </div>
    </div>

    <MediaSelectorModal
      v-if="siteId"
      :site-id="siteId"
      :is-open="showMediaModal"
      @close="showMediaModal = false"
      @select="(url) => form.thumbnailUrl = url"
    />
  </div>
</template>
