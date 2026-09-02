<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useAuth } from '~/composables/useAuth';
import { useApiClient } from '~/composables/useApi';
import { useToast } from '~/composables/useToast';
import MediaSelectorModal from '~/components/MediaSelectorModal.vue';
import RichTextEditor from '~/components/RichTextEditor.vue';

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
const richEditor = ref<InstanceType<typeof RichTextEditor> | null>(null);
const mediaTarget = ref<'cover' | 'content'>('cover');

const form = ref({
  title: '',
  slug: '',
  summary: '',
  contentHtml: '',
  coverImageUrl: '',
  category: 'Berita',
  author: 'Admin Sekolah',
  publishedAt: '',
  status: 'DRAFT'
});

async function loadData() {
  if (!user.value?.school?.id) return;
  isLoading.value = true;
  const obRes = await useApiClient(`/schools/${user.value.school.id}/onboarding`);
  if (obRes.success && obRes.data?.siteId) {
    siteId.value = obRes.data.siteId;
    const res = await useApiClient(`/sites/${siteId.value}/content?type=news`);
    if (res.success && res.data) {
      items.value = res.data;
    }
  } else toast.error('Gagal Memuat', obRes.error?.message || 'Data situs tidak dapat dimuat.');
  isLoading.value = false;
}

function openCreateModal() {
  isEditing.value = false;
  editingId.value = null;
  form.value = {
    title: '',
    slug: '',
    summary: '',
    contentHtml: '',
    coverImageUrl: '',
    category: 'Berita',
    author: user.value?.name || 'Admin Sekolah',
    publishedAt: new Date().toISOString(),
    status: 'DRAFT'
  };
  showModal.value = true;
}

function openEditModal(item: any) {
  isEditing.value = true;
  editingId.value = item.id;
  form.value = {
    ...item.payload,
    title: item.title,
    slug: item.slug || item.payload?.slug || '',
    status: item.status
  };
  showModal.value = true;
}

function generateSlug() {
  form.value.slug = form.value.title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function handleSave() {
  if (!siteId.value || !form.value.title.trim() || !stripHtml(form.value.contentHtml)) {
    toast.error('Form Belum Lengkap', 'Judul dan konten berita wajib diisi.');
    return;
  }

  if (!form.value.slug) generateSlug();

  isSaving.value = true;
  if (!form.value.summary.trim()) form.value.summary = stripHtml(form.value.contentHtml).slice(0, 180);
  const payload = { ...form.value, publishedAt: form.value.publishedAt || new Date().toISOString() } as any;
  if (isEditing.value && editingId.value) {
    const res = await useApiClient(`/sites/${siteId.value}/content/${editingId.value}`, {
      method: 'PATCH',
      body: {
        title: form.value.title,
        slug: form.value.slug,
        status: form.value.status,
        payload
      }
    });
    if (res.success) {
      toast.success('Berita Diperbarui', 'Perubahan berita berhasil disimpan.');
      showModal.value = false;
      loadData();
    } else toast.error('Gagal Menyimpan', res.error?.message || 'Berita tidak dapat diperbarui.');
  } else {
    const res = await useApiClient(`/sites/${siteId.value}/content`, {
      method: 'POST',
      body: {
        type: 'news',
        title: form.value.title,
        slug: form.value.slug,
        status: form.value.status,
        payload
      }
    });
    if (res.success) {
      toast.success('Berita Ditambahkan', 'Berita baru berhasil disimpan.');
      showModal.value = false;
      loadData();
    } else toast.error('Gagal Menyimpan', res.error?.message || 'Berita tidak dapat ditambahkan.');
  }
  isSaving.value = false;
}

function stripHtml(value: string) {
  if (typeof document === 'undefined') return value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  const node = document.createElement('div'); node.innerHTML = value; return (node.textContent || '').replace(/\s+/g, ' ').trim();
}

function chooseMedia(target: 'cover' | 'content') { mediaTarget.value = target; showMediaModal.value = true; }
function handleMediaSelected(url: string) {
  if (mediaTarget.value === 'cover') form.value.coverImageUrl = url;
  else richEditor.value?.insertImage(url);
}

async function handleDelete(id: string) {
  if (!confirm('Hapus berita ini?')) return;
  const res = await useApiClient(`/sites/${siteId.value}/content/${id}`, { method: 'DELETE' });
  if (res.success) {
    toast.success('Berita Dihapus', 'Berita berhasil dihapus.');
    loadData();
  } else toast.error('Gagal Menghapus', res.error?.message || 'Berita tidak dapat dihapus.');
}

onMounted(() => {
  loadData();
});
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-xl font-bold text-slate-900">Berita & Pengumuman Sekolah</h2>
        <p class="text-xs text-slate-500">Kelola artikel kegiatan, warta prestasi, dan pengumuman resmi</p>
      </div>
      <button
        type="button"
        @click="openCreateModal"
        class="px-5 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs shadow-md shadow-emerald-800/20 transition flex items-center gap-2"
      >
        <span>+</span> Tulis Berita Baru
      </button>
    </div>

    <div v-if="items.length === 0" class="bg-white rounded-3xl p-12 text-center border border-slate-200 text-slate-400">
      <p class="text-4xl mb-3">📰</p>
      <p class="text-sm font-semibold">Belum ada berita atau artikel.</p>
    </div>

    <div v-else class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div
        v-for="item in items"
        :key="item.id"
        class="bg-white rounded-3xl overflow-hidden border border-slate-200 shadow-sm flex flex-col justify-between group"
      >
        <div class="aspect-[16/9] relative bg-slate-100 overflow-hidden">
          <img :src="item.payload?.coverImageUrl" :alt="item.title" class="w-full h-full object-cover group-hover:scale-105 transition duration-300">
          <span class="absolute top-3 right-3 bg-emerald-800 text-white text-xs font-semibold px-3 py-1 rounded-full">
            {{ item.payload?.category }}
          </span>
        </div>
        <div class="p-6 space-y-3 flex-1 flex flex-col justify-between">
          <div>
            <h3 class="font-bold text-base text-slate-900 line-clamp-2">{{ item.title }}</h3>
            <p class="text-xs text-slate-600 line-clamp-3 mt-1">{{ item.payload?.summary }}</p>
          </div>
          <div class="pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
            <span class="text-slate-400">Penulis: {{ item.payload?.author }}</span>
            <div class="flex gap-2">
              <button type="button" @click="openEditModal(item)" class="font-bold text-slate-600 hover:text-slate-900">Edit</button>
              <button type="button" @click="handleDelete(item.id)" class="font-bold text-rose-600 hover:text-rose-800">Hapus</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal Form -->
    <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div class="bg-white rounded-3xl max-w-2xl w-full p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto custom-scrollbar">
        <h3 class="text-lg font-bold text-slate-900">{{ isEditing ? 'Edit Berita' : 'Tulis Berita Baru' }}</h3>
        <form @submit.prevent="handleSave" class="space-y-4">
          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Judul Berita *</label>
            <input v-model="form.title" @blur="generateSlug" type="text" required class="w-full px-4 py-2.5 rounded-xl border text-sm">
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Kategori</label>
              <select v-model="form.category" class="w-full px-4 py-2.5 rounded-xl border text-sm bg-white">
                <option value="Berita">Berita Umum</option>
                <option value="Prestasi">Prestasi Siswa</option>
                <option value="Pengumuman">Pengumuman Resmi</option>
                <option value="Akademik">Kegiatan Akademik</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Penulis</label>
              <input v-model="form.author" type="text" class="w-full px-4 py-2.5 rounded-xl border text-sm">
            </div>
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Gambar Cover *</label>
            <div class="flex gap-3">
              <input v-model="form.coverImageUrl" type="url" required class="flex-1 px-4 py-2.5 rounded-xl border text-sm">
              <button type="button" @click="chooseMedia('cover')" class="px-4 py-2.5 rounded-xl bg-slate-100 text-xs font-bold">Media</button>
            </div>
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Ringkasan Singkat</label>
            <textarea v-model="form.summary" rows="2" class="w-full px-4 py-2.5 rounded-xl border text-sm"></textarea>
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Konten Berita Lengkap *</label>
            <RichTextEditor ref="richEditor" v-model="form.contentHtml" :disabled="isSaving" placeholder="Tulis isi berita secara lengkap di sini…" @request-image="chooseMedia('content')" />
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
      @select="handleMediaSelected"
    />
  </div>
</template>
