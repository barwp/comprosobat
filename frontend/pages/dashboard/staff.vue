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
  position: '',
  photoUrl: '',
  bio: '',
  contactEmail: '',
  sortOrder: 1,
  isActive: true
});

async function loadData() {
  if (!user.value?.school?.id) return;
  isLoading.value = true;
  const obRes = await useApiClient(`/schools/${user.value.school.id}/onboarding`);
  if (obRes.success && obRes.data?.siteId) {
    siteId.value = obRes.data.siteId;
    const res = await useApiClient(`/sites/${siteId.value}/content?type=staff`);
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
    position: '',
    photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&h=300&fit=crop',
    bio: '',
    contactEmail: '',
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
    name: item.title || item.payload?.name || '',
    position: item.payload?.position || item.payload?.role || '',
    photoUrl: item.payload?.photoUrl || '',
    bio: item.payload?.bio || '',
    contactEmail: item.payload?.contactEmail || '',
    sortOrder: item.sortOrder ?? 1,
    isActive: item.payload?.isActive !== false
  };
  showModal.value = true;
}

async function handleSave() {
  if (!siteId.value || !form.value.name || !form.value.position) return;
  isSaving.value = true;

  const payloadToSave = {
    ...form.value,
    position: form.value.position,
    role: form.value.position
  };

  if (isEditing.value && editingId.value) {
    const res = await useApiClient(`/sites/${siteId.value}/content/${editingId.value}`, {
      method: 'PATCH',
      body: {
        title: form.value.name,
        sortOrder: form.value.sortOrder,
        payload: payloadToSave
      }
    });
    if (res.success) {
      toast.success('Staf Diperbarui', 'Data guru/staf berhasil diperbarui.');
      showModal.value = false;
      loadData();
    } else {
      toast.error('Gagal Menyimpan', res.error?.message || 'Data guru/staf gagal diperbarui.');
    }
  } else {
    const res = await useApiClient(`/sites/${siteId.value}/content`, {
      method: 'POST',
      body: {
        type: 'staff',
        title: form.value.name,
        sortOrder: form.value.sortOrder,
        payload: payloadToSave
      }
    });
    if (res.success) {
      toast.success('Staf Ditambahkan', 'Guru/staf baru berhasil ditambahkan.');
      showModal.value = false;
      loadData();
    } else {
      toast.error('Gagal Menambahkan', res.error?.message || 'Data guru/staf gagal ditambahkan.');
    }
  }
  isSaving.value = false;
}

async function handleDelete(id: string) {
  if (!confirm('Hapus data guru/staf ini?')) return;
  const res = await useApiClient(`/sites/${siteId.value}/content/${id}`, { method: 'DELETE' });
  if (res.success) {
    toast.success('Staf Dihapus', 'Data berhasil dihapus.');
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
        <h2 class="text-xl font-bold text-slate-900">Guru & Tenaga Pendidik</h2>
        <p class="text-xs text-slate-500">Kelola direktori dewan guru, kepala sekolah, dan staf akademik</p>
      </div>
      <button
        type="button"
        @click="openCreateModal"
        class="px-5 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs shadow-md shadow-emerald-800/20 transition flex items-center gap-2"
      >
        <span>+</span> Tambah Guru / Staf
      </button>
    </div>

    <div v-if="items.length === 0" class="bg-white rounded-3xl p-12 text-center border border-slate-200 text-slate-400">
      <p class="text-4xl mb-3">👨‍🏫</p>
      <p class="text-sm font-semibold">Belum ada data guru atau tenaga pendidik.</p>
    </div>

    <div v-else class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
      <div
        v-for="item in items"
        :key="item.id"
        class="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between text-center"
      >
        <div class="space-y-3">
          <img :src="item.payload?.photoUrl" :alt="item.title" class="w-24 h-24 rounded-full mx-auto object-cover border-2 border-emerald-100 shadow-sm" onerror="this.src='https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&h=300&fit=crop'">
          <div>
            <h3 class="font-bold text-sm text-slate-900">{{ item.title || item.payload?.name }}</h3>
            <p class="text-xs font-semibold text-emerald-800 mt-0.5">{{ item.payload?.position || item.payload?.role || 'Tenaga Pendidik' }}</p>
          </div>
        </div>
        <div class="pt-4 mt-4 border-t border-slate-100 flex justify-center gap-2">
          <button type="button" @click="openEditModal(item)" class="text-xs font-bold text-slate-600 hover:text-slate-900 px-2 py-1">Edit</button>
          <button type="button" @click="handleDelete(item.id)" class="text-xs font-bold text-rose-600 hover:text-rose-800 px-2 py-1">Hapus</button>
        </div>
      </div>
    </div>

    <!-- Modal Form -->
    <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div class="bg-white rounded-3xl max-w-lg w-full p-8 shadow-2xl space-y-6">
        <h3 class="text-lg font-bold text-slate-900">{{ isEditing ? 'Edit Guru / Staf' : 'Tambah Guru / Staf Baru' }}</h3>
        <form @submit.prevent="handleSave" class="space-y-4">
          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Nama Lengkap & Gelar *</label>
            <input v-model="form.name" type="text" required class="w-full px-4 py-2.5 rounded-xl border text-sm">
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Jabatan *</label>
            <input v-model="form.position" type="text" required placeholder="Contoh: Kepala Sekolah / Guru Fisika" class="w-full px-4 py-2.5 rounded-xl border text-sm">
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Foto Profil</label>
            <div class="flex gap-3">
              <input v-model="form.photoUrl" type="text" placeholder="/api/v1/... atau https://..." class="flex-1 px-4 py-2.5 rounded-xl border text-sm">
              <button type="button" @click="showMediaModal = true" class="px-4 py-2.5 rounded-xl bg-slate-100 text-xs font-bold">Media</button>
            </div>
          </div>
          <div class="flex justify-end gap-3 pt-4 border-t">
            <label class="mr-auto flex items-center gap-2 text-xs font-semibold text-slate-700">
              <input v-model="form.isActive" type="checkbox" class="w-4 h-4 rounded">
              Tampilkan di website
            </label>
            <button type="button" @click="showModal = false" class="px-5 py-2.5 rounded-xl border text-xs font-bold">Batal</button>
            <button type="submit" :disabled="isSaving" class="px-6 py-2.5 rounded-xl bg-emerald-800 text-white font-bold text-xs disabled:opacity-50">{{ isSaving ? 'Menyimpan...' : 'Simpan' }}</button>
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
