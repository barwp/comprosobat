<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useAuth } from '~/composables/useAuth';
import { useApiClient } from '~/composables/useApi';
import { useToast } from '~/composables/useToast';

definePageMeta({ layout: 'dashboard' });

const { user } = useAuth();
const toast = useToast();

const siteId = ref<string | null>(null);
const items = ref<any[]>([]);
const isLoading = ref(true);
const showModal = ref(false);
const isEditing = ref(false);
const editingId = ref<string | null>(null);

const form = ref({
  title: '',
  description: '',
  icon: 'Trophy',
  sortOrder: 1
});

async function loadData() {
  if (!user.value?.school?.id) return;
  isLoading.value = true;
  const obRes = await useApiClient(`/schools/${user.value.school.id}/onboarding`);
  if (obRes.success && obRes.data?.siteId) {
    siteId.value = obRes.data.siteId;
    const res = await useApiClient(`/sites/${siteId.value}/content?type=program`);
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
    title: '',
    description: '',
    icon: 'Trophy',
    sortOrder: items.value.length + 1
  };
  showModal.value = true;
}

function openEditModal(item: any) {
  isEditing.value = true;
  editingId.value = item.id;
  form.value = {
    ...item.payload,
    title: item.title,
    sortOrder: item.sortOrder
  };
  showModal.value = true;
}

async function handleSave() {
  if (!siteId.value || !form.value.title) return;

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
      toast.success('Program Diperbarui', 'Perubahan program berhasil disimpan.');
      showModal.value = false;
      loadData();
    }
  } else {
    const res = await useApiClient(`/sites/${siteId.value}/content`, {
      method: 'POST',
      body: {
        type: 'program',
        title: form.value.title,
        sortOrder: form.value.sortOrder,
        payload: form.value
      }
    });
    if (res.success) {
      toast.success('Program Ditambahkan', 'Program unggulan baru berhasil dibuat.');
      showModal.value = false;
      loadData();
    }
  }
}

async function handleDelete(id: string) {
  if (!confirm('Hapus program ini?')) return;
  const res = await useApiClient(`/sites/${siteId.value}/content/${id}`, { method: 'DELETE' });
  if (res.success) {
    toast.success('Program Dihapus', 'Program berhasil dihapus.');
    loadData();
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
        <h2 class="text-xl font-bold text-slate-900">Program Unggulan</h2>
        <p class="text-xs text-slate-500">Kelola kurikulum khusus, kelas peminatan, atau program unggulan sekolah</p>
      </div>
      <button
        type="button"
        @click="openCreateModal"
        class="px-5 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs shadow-md shadow-emerald-800/20 transition flex items-center gap-2"
      >
        <span>+</span> Tambah Program
      </button>
    </div>

    <div v-if="items.length === 0" class="bg-white rounded-3xl p-12 text-center border border-slate-200 text-slate-400">
      <p class="text-4xl mb-3">🎓</p>
      <p class="text-sm font-semibold">Belum ada program unggulan.</p>
    </div>

    <div v-else class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div
        v-for="item in items"
        :key="item.id"
        class="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between"
      >
        <div class="space-y-3">
          <div class="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-800 flex items-center justify-center font-bold text-xl">
            🎓
          </div>
          <h3 class="font-bold text-base text-slate-900">{{ item.title }}</h3>
          <p class="text-xs text-slate-600 leading-relaxed">{{ item.payload?.description }}</p>
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
        <h3 class="text-lg font-bold text-slate-900">{{ isEditing ? 'Edit Program' : 'Tambah Program Baru' }}</h3>
        <form @submit.prevent="handleSave" class="space-y-4">
          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Nama Program *</label>
            <input v-model="form.title" type="text" required class="w-full px-4 py-2.5 rounded-xl border text-sm">
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Deskripsi Ringkas</label>
            <textarea v-model="form.description" rows="3" class="w-full px-4 py-2.5 rounded-xl border text-sm"></textarea>
          </div>
          <div class="flex justify-end gap-3 pt-4 border-t">
            <button type="button" @click="showModal = false" class="px-5 py-2.5 rounded-xl border text-xs font-bold">Batal</button>
            <button type="submit" class="px-6 py-2.5 rounded-xl bg-emerald-800 text-white font-bold text-xs">Simpan</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
