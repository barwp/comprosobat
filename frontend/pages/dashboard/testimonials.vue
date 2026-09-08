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
  graduationYear: 'Angkatan 2022',
  currentRole: 'Mahasiswa ITB / Software Engineer',
  rating: 5,
  photoUrl: '',
  quote: '',
  sortOrder: 1,
  isActive: true
});

async function loadData() {
  if (!user.value?.school?.id) return;
  isLoading.value = true;
  const obRes = await useApiClient(`/schools/${user.value.school.id}/onboarding`);
  if (obRes.success && obRes.data?.siteId) {
    siteId.value = obRes.data.siteId;
    const res = await useApiClient(`/sites/${siteId.value}/content?type=testimonial`);
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
    graduationYear: 'Angkatan 2022',
    currentRole: 'Mahasiswa / Profesional',
    rating: 5,
    photoUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200&h=200&fit=crop',
    quote: '',
    sortOrder: items.value.length + 1,
    isActive: true
  };
  showModal.value = true;
}

function openEditModal(item: any) {
  isEditing.value = true;
  editingId.value = item.id;
  form.value = {
    ...item.payload,
    name: item.payload?.name || item.payload?.alumniName || item.title,
    quote: item.payload?.quote || item.payload?.content || '',
    currentRole: item.payload?.currentRole || item.payload?.role || 'Alumni',
    isActive: item.payload?.isActive !== false,
    sortOrder: item.sortOrder
  };
  showModal.value = true;
}

async function handleSave() {
  if (!siteId.value || !form.value.name || !form.value.quote) { toast.error('Form Belum Lengkap', 'Nama dan isi testimoni wajib diisi.'); return; }
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
      toast.success('Testimoni Diperbarui', 'Testimoni alumni berhasil diperbarui.');
      showModal.value = false;
      loadData();
    } else toast.error('Gagal Menyimpan', res.error?.message || 'Testimoni tidak dapat diperbarui.');
  } else {
    const res = await useApiClient(`/sites/${siteId.value}/content`, {
      method: 'POST',
      body: {
        type: 'testimonial',
        title: form.value.name,
        status: 'DRAFT',
        sortOrder: form.value.sortOrder,
        payload: form.value
      }
    });
    if (res.success) {
      toast.success('Testimoni Ditambahkan', 'Testimoni alumni baru berhasil ditambahkan.');
      showModal.value = false;
      loadData();
    } else toast.error('Gagal Menyimpan', res.error?.message || 'Testimoni tidak dapat ditambahkan.');
  }
  isSaving.value = false;
}

async function handleDelete(id: string) {
  if (!confirm('Hapus testimoni ini?')) return;
  const res = await useApiClient(`/sites/${siteId.value}/content/${id}`, { method: 'DELETE' });
  if (res.success) {
    toast.success('Testimoni Dihapus', 'Data berhasil dihapus.');
    loadData();
  } else toast.error('Gagal Menghapus', res.error?.message || 'Testimoni tidak dapat dihapus.');
}

onMounted(() => {
  loadData();
});
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-xl font-bold text-slate-900">Testimoni Alumni & Tokoh</h2>
        <p class="text-xs text-slate-500">Tampilkan cerita inspiratif dan ulasan dari para lulusan terbaik sekolah</p>
      </div>
      <button
        type="button"
        @click="openCreateModal"
        class="px-5 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs shadow-md shadow-emerald-800/20 transition flex items-center gap-2"
      >
        <span>+</span> Tambah Testimoni
      </button>
    </div>

    <div v-if="items.length === 0" class="bg-white rounded-3xl p-12 text-center border border-slate-200 text-slate-400">
      <p class="text-4xl mb-3">💬</p>
      <p class="text-sm font-semibold">Belum ada testimoni alumni.</p>
    </div>

    <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div
        v-for="item in items"
        :key="item.id"
        class="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between"
      >
        <div class="space-y-4">
          <div class="flex items-center gap-4">
            <img :src="item.payload?.photoUrl" :alt="item.title" class="w-14 h-14 rounded-full object-cover border">
            <div>
              <h3 class="font-bold text-base text-slate-900">{{ item.title }}</h3>
              <p class="text-xs text-slate-500 font-medium">{{ item.payload?.currentRole }} ({{ item.payload?.graduationYear }})</p>
              <div class="text-amber-400 text-xs font-bold mt-0.5">
                {{ '★'.repeat(item.payload?.rating || 5) }}
              </div>
            </div>
          </div>
          <p class="text-xs text-slate-600 italic bg-slate-50 p-4 rounded-xl leading-relaxed">
            "{{ item.payload?.quote }}"
          </p>
        </div>
        <div class="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
          <span class="text-xs font-semibold text-slate-400">Urutan: {{ item.sortOrder }}</span>
          <div class="flex gap-2">
            <button type="button" @click="openEditModal(item)" class="text-xs font-bold text-slate-600 hover:text-slate-900">Edit</button>
            <button type="button" @click="handleDelete(item.id)" class="text-xs font-bold text-rose-600 hover:text-rose-800">Hapus</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal Form -->
    <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div class="bg-white rounded-3xl max-w-lg w-full p-8 shadow-2xl space-y-6">
        <h3 class="text-lg font-bold text-slate-900">{{ isEditing ? 'Edit Testimoni' : 'Tambah Testimoni Baru' }}</h3>
        <form @submit.prevent="handleSave" class="space-y-4">
          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Nama Alumni *</label>
            <input v-model="form.name" type="text" required class="w-full px-4 py-2.5 rounded-xl border text-sm">
          </div>
          <label class="flex items-center gap-2 text-xs font-bold text-slate-700"><input v-model="form.isActive" type="checkbox"> Tampilkan testimoni di website</label>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Angkatan / Tahun Lulus</label>
              <input v-model="form.graduationYear" type="text" class="w-full px-4 py-2.5 rounded-xl border text-sm">
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Rating (1-5)</label>
              <select v-model.number="form.rating" class="w-full px-4 py-2.5 rounded-xl border text-sm bg-white">
                <option :value="5">⭐⭐⭐⭐⭐ (5 Bintang)</option>
                <option :value="4">⭐⭐⭐⭐ (4 Bintang)</option>
                <option :value="3">⭐⭐⭐ (3 Bintang)</option>
              </select>
            </div>
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Profesi / Kuliah Saat Ini</label>
            <input v-model="form.currentRole" type="text" class="w-full px-4 py-2.5 rounded-xl border text-sm">
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Foto Alumni</label>
            <div class="flex gap-3">
              <input v-model="form.photoUrl" type="text" placeholder="/api/v1/... atau https://..." class="flex-1 px-4 py-2.5 rounded-xl border text-sm">
              <button type="button" @click="showMediaModal = true" class="px-4 py-2.5 rounded-xl bg-slate-100 text-xs font-bold">Media</button>
            </div>
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Isi Testimoni *</label>
            <textarea v-model="form.quote" rows="4" required class="w-full px-4 py-2.5 rounded-xl border text-sm"></textarea>
          </div>
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
      @select="(url) => form.photoUrl = url"
    />
  </div>
</template>
