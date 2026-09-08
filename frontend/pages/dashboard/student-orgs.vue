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
  name: '',
  description: '',
  supervisor: '',
  schedule: 'Setiap Jumat',
  sortOrder: 1
});

async function loadData() {
  if (!user.value?.school?.id) return;
  isLoading.value = true;
  const obRes = await useApiClient(`/schools/${user.value.school.id}/onboarding`);
  if (obRes.success && obRes.data?.siteId) {
    siteId.value = obRes.data.siteId;
    const res = await useApiClient(`/sites/${siteId.value}/content?type=student_org`);
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
    supervisor: '',
    schedule: 'Setiap Jumat',
    sortOrder: items.value.length + 1
  };
  showModal.value = true;
}

function openEditModal(item: any) {
  isEditing.value = true;
  editingId.value = item.id;
  form.value = {
    ...item.payload,
    name: item.title,
    sortOrder: item.sortOrder
  };
  showModal.value = true;
}

async function handleSave() {
  if (!siteId.value || !form.value.name) return;

  if (isEditing.value && editingId.value) {
    const res = await useApiClient(`/sites/${siteId.value}/content/${editingId.value}`, {
      method: 'PATCH',
      body: {
        title: form.value.name,
        sortOrder: form.value.sortOrder,
        payload: form.value
      }
    });
    if (res.success) {
      toast.success('Organisasi Diperbarui', 'Data organisasi/ekskul berhasil disimpan.');
      showModal.value = false;
      loadData();
    }
  } else {
    const res = await useApiClient(`/sites/${siteId.value}/content`, {
      method: 'POST',
      body: {
        type: 'student_org',
        title: form.value.name,
        sortOrder: form.value.sortOrder,
        payload: form.value
      }
    });
    if (res.success) {
      toast.success('Organisasi Ditambahkan', 'Organisasi/ekskul baru berhasil dibuat.');
      showModal.value = false;
      loadData();
    }
  }
}

async function handleDelete(id: string) {
  if (!confirm('Hapus ekskul ini?')) return;
  const res = await useApiClient(`/sites/${siteId.value}/content/${id}`, { method: 'DELETE' });
  if (res.success) {
    toast.success('Organisasi Dihapus', 'Data berhasil dihapus.');
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
        <h2 class="text-xl font-bold text-slate-900">Organisasi Siswa & Ekstrakurikuler</h2>
        <p class="text-xs text-slate-500">Kelola daftar OSIS, MPK, Pramuka, PMR, dan klub kegiatan ekstrakurikuler</p>
      </div>
      <button
        type="button"
        @click="openCreateModal"
        class="px-5 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs shadow-md shadow-emerald-800/20 transition flex items-center gap-2"
      >
        <span>+</span> Tambah Ekskul / Organisasi
      </button>
    </div>

    <div v-if="items.length === 0" class="bg-white rounded-3xl p-12 text-center border border-slate-200 text-slate-400">
      <p class="text-4xl mb-3">👥</p>
      <p class="text-sm font-semibold">Belum ada data organisasi siswa atau ekstrakurikuler.</p>
    </div>

    <div v-else class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div
        v-for="item in items"
        :key="item.id"
        class="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between"
      >
        <div class="space-y-3">
          <div class="w-12 h-12 rounded-2xl bg-teal-50 text-teal-800 flex items-center justify-center font-bold text-xl">
            👥
          </div>
          <h3 class="font-bold text-base text-slate-900">{{ item.title }}</h3>
          <p class="text-xs text-slate-600 leading-relaxed">{{ item.payload?.description }}</p>
          <div class="text-[11px] text-slate-500 space-y-0.5 pt-2">
            <p v-if="item.payload?.supervisor">Pembina: <span class="font-semibold text-slate-700">{{ item.payload.supervisor }}</span></p>
            <p v-if="item.payload?.schedule">Jadwal: <span class="font-semibold text-slate-700">{{ item.payload.schedule }}</span></p>
          </div>
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
        <h3 class="text-lg font-bold text-slate-900">{{ isEditing ? 'Edit Organisasi' : 'Tambah Organisasi / Ekskul' }}</h3>
        <form @submit.prevent="handleSave" class="space-y-4">
          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Nama Organisasi / Ekskul *</label>
            <input v-model="form.name" type="text" required placeholder="Contoh: Pramuka Penegak Garuda / Robotika Club" class="w-full px-4 py-2.5 rounded-xl border text-sm">
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Guru Pembina</label>
            <input v-model="form.supervisor" type="text" class="w-full px-4 py-2.5 rounded-xl border text-sm">
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Jadwal Latihan</label>
            <input v-model="form.schedule" type="text" class="w-full px-4 py-2.5 rounded-xl border text-sm">
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Deskripsi Kegiatan</label>
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
