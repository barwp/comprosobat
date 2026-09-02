<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useAuth } from '~/composables/useAuth';
import { useApiClient } from '~/composables/useApi';
import { useToast } from '~/composables/useToast';

definePageMeta({ layout: 'dashboard' });

const { user } = useAuth();
const toast = useToast();

const siteId = ref<string | null>(null);
const menuItems = ref<any[]>([]);
const isLoading = ref(true);
const showModal = ref(false);
const isEditing = ref(false);
const editingId = ref<string | null>(null);

const form = ref({
  label: '',
  linkType: 'section',
  target: '#hero',
  location: 'header',
  parentId: null as string | null,
  sortOrder: 1,
  isActive: true
});

async function loadData() {
  if (!user.value?.school?.id) return;
  isLoading.value = true;
  const obRes = await useApiClient(`/schools/${user.value.school.id}/onboarding`);
  if (obRes.success && obRes.data?.siteId) {
    siteId.value = obRes.data.siteId;
    const res = await useApiClient(`/sites/${siteId.value}/menu-items`);
    if (res.success && res.data) {
      menuItems.value = res.data.items || [];
    }
  }
  isLoading.value = false;
}

function openCreateModal() {
  isEditing.value = false;
  editingId.value = null;
  form.value = {
    label: '',
    linkType: 'section',
    target: '#hero',
    location: 'header',
    parentId: null,
    sortOrder: menuItems.value.length + 1,
    isActive: true
  };
  showModal.value = true;
}

function openEditModal(item: any) {
  isEditing.value = true;
  editingId.value = item.id;
  form.value = {
    label: item.label,
    linkType: item.linkType,
    target: item.target,
    location: item.location,
    parentId: item.parentId,
    sortOrder: item.sortOrder,
    isActive: item.isActive
  };
  showModal.value = true;
}

async function handleSave() {
  if (!siteId.value || !form.value.label || !form.value.target) return;

  if (isEditing.value && editingId.value) {
    const res = await useApiClient(`/sites/${siteId.value}/menu-items/${editingId.value}`, {
      method: 'PATCH',
      body: form.value
    });
    if (res.success) {
      toast.success('Menu Diperbarui', 'Perubahan menu navigasi berhasil disimpan.');
      showModal.value = false;
      loadData();
    } else {
      toast.error('Gagal Menyimpan', res.error?.message);
    }
  } else {
    const res = await useApiClient(`/sites/${siteId.value}/menu-items`, {
      method: 'POST',
      body: form.value
    });
    if (res.success) {
      toast.success('Menu Ditambahkan', 'Item menu baru berhasil dibuat.');
      showModal.value = false;
      loadData();
    } else {
      toast.error('Gagal Menambahkan', res.error?.message);
    }
  }
}

async function handleDelete(id: string) {
  if (!confirm('Hapus item menu ini beserta submenu terkait?')) return;
  const res = await useApiClient(`/sites/${siteId.value}/menu-items/${id}`, { method: 'DELETE' });
  if (res.success) {
    toast.success('Menu Dihapus', 'Item menu berhasil dihapus.');
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
        <h2 class="text-xl font-bold text-slate-900">Menu & Navigasi</h2>
        <p class="text-xs text-slate-500">Susun tautan navbar dan footer sekolah (maksimal 2 tingkat kedalaman)</p>
      </div>
      <button
        type="button"
        @click="openCreateModal"
        class="px-5 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs shadow-md shadow-emerald-800/20 transition flex items-center gap-2"
      >
        <span>+</span> Tambah Menu
      </button>
    </div>

    <div class="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm space-y-4">
      <div v-if="menuItems.length === 0" class="text-center py-12 text-slate-400">
        <p class="text-3xl mb-2">🧭</p>
        <p class="text-sm font-semibold">Belum ada item menu.</p>
      </div>

      <div v-else class="divide-y divide-slate-100">
        <div
          v-for="item in menuItems"
          :key="item.id"
          class="py-3 flex items-center justify-between hover:bg-slate-50/80 px-4 rounded-xl transition"
          :class="{ 'pl-10 text-slate-600': item.parentId }"
        >
          <div class="flex items-center gap-3">
            <span v-if="item.parentId" class="text-slate-400">↳</span>
            <span class="font-bold text-sm text-slate-900">{{ item.label }}</span>
            <span class="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600">{{ item.target }}</span>
            <span class="text-[10px] font-bold px-2 py-0.5 rounded uppercase" :class="item.location === 'header' ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-100 text-slate-700'">{{ item.location }}</span>
          </div>

          <div class="flex items-center gap-2">
            <span class="text-xs text-slate-400 mr-2">Urutan: {{ item.sortOrder }}</span>
            <button type="button" @click="openEditModal(item)" class="text-xs font-bold text-slate-600 hover:text-slate-900">Edit</button>
            <button type="button" @click="handleDelete(item.id)" class="text-xs font-bold text-rose-600 hover:text-rose-800">Hapus</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal Form -->
    <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div class="bg-white rounded-3xl max-w-lg w-full p-8 shadow-2xl space-y-6">
        <h3 class="text-lg font-bold text-slate-900">{{ isEditing ? 'Edit Item Menu' : 'Tambah Item Menu Baru' }}</h3>
        <form @submit.prevent="handleSave" class="space-y-4">
          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Label Menu *</label>
            <input v-model="form.label" type="text" required placeholder="Contoh: Program Unggulan" class="w-full px-4 py-2.5 rounded-xl border text-sm">
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Tipe Tautan</label>
              <select v-model="form.linkType" class="w-full px-4 py-2.5 rounded-xl border text-sm bg-white">
                <option value="section">Bagian Section (#hero, #news)</option>
                <option value="internal_page">Halaman Internal</option>
                <option value="external_url">URL Eksternal (https://)</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Posisi Lokasi</label>
              <select v-model="form.location" class="w-full px-4 py-2.5 rounded-xl border text-sm bg-white">
                <option value="header">Header Navbar</option>
                <option value="footer">Footer Bawah</option>
              </select>
            </div>
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Target URL / ID Section *</label>
            <input v-model="form.target" type="text" required placeholder="#programs atau https://..." class="w-full px-4 py-2.5 rounded-xl border text-sm">
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Menu Induk (Parent) — Opsional</label>
            <select v-model="form.parentId" class="w-full px-4 py-2.5 rounded-xl border text-sm bg-white">
              <option :value="null">-- Tidak Ada (Menu Utama Tingkat 1) --</option>
              <option
                v-for="parent in menuItems.filter(m => !m.parentId && m.id !== editingId)"
                :key="parent.id"
                :value="parent.id"
              >
                {{ parent.label }}
              </option>
            </select>
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Urutan Tampil (Sort Order)</label>
            <input v-model.number="form.sortOrder" type="number" min="1" class="w-24 px-4 py-2.5 rounded-xl border text-sm">
          </div>

          <label class="flex items-center gap-3 text-sm font-semibold text-slate-700">
            <input v-model="form.isActive" type="checkbox" class="w-4 h-4 rounded border-slate-300 text-emerald-700">
            Tampilkan menu ini di website
          </label>

          <div class="flex justify-end gap-3 pt-4 border-t">
            <button type="button" @click="showModal = false" class="px-5 py-2.5 rounded-xl border text-xs font-bold">Batal</button>
            <button type="submit" class="px-6 py-2.5 rounded-xl bg-emerald-800 text-white font-bold text-xs">Simpan</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
