<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useAuth } from '~/composables/useAuth';
import { useApiClient } from '~/composables/useApi';
import { useToast } from '~/composables/useToast';

definePageMeta({ layout: 'dashboard' });

const { user } = useAuth();
const toast = useToast();

const siteId = ref<string | null>(null);
const isLoading = ref(true);
const isSaving = ref(false);

const form = ref({
  address: '',
  email: '',
  phone: '',
  whatsapp: '',
  operationalHours: 'Senin - Jumat: 07.00 - 15.30 WIB',
  googleMapsUrl: '',
  socialLinks: {
    instagram: '',
    facebook: '',
    youtube: '',
    tiktok: '',
    twitter: ''
  }
});

const videoForm = ref({
  title: 'Video Profil Sekolah',
  videoUrl: '',
  description: ''
});

async function loadData() {
  if (!user.value?.school?.id) return;
  isLoading.value = true;
  const obRes = await useApiClient(`/schools/${user.value.school.id}/onboarding`);
  if (obRes.success && obRes.data?.siteId) {
    siteId.value = obRes.data.siteId;

    // Load settings for contact
    const setRes = await useApiClient(`/sites/${siteId.value}/settings`);
    if (setRes.success && setRes.data) {
      form.value = {
        address: setRes.data.address || '',
        email: setRes.data.email || '',
        phone: setRes.data.phone || '',
        whatsapp: setRes.data.whatsapp || '',
        operationalHours: setRes.data.operationalHours || 'Senin - Jumat: 07.00 - 15.30 WIB',
        googleMapsUrl: setRes.data.googleMapsUrl || '',
        socialLinks: {
          instagram: setRes.data.socialLinks?.instagram || '',
          facebook: setRes.data.socialLinks?.facebook || '',
          youtube: setRes.data.socialLinks?.youtube || '',
          tiktok: setRes.data.socialLinks?.tiktok || '',
          twitter: setRes.data.socialLinks?.twitter || ''
        }
      };
    }

    // Load video profile
    const vidRes = await useApiClient(`/sites/${siteId.value}/content?type=video_profile`);
    if (vidRes.success && vidRes.data && vidRes.data.length > 0) {
      videoForm.value = {
        title: vidRes.data[0].payload?.title || 'Video Profil Sekolah',
        videoUrl: vidRes.data[0].payload?.videoUrl || '',
        description: vidRes.data[0].payload?.description || ''
      };
    }
  }
  isLoading.value = false;
}

async function handleSave() {
  if (!siteId.value) return;
  isSaving.value = true;
  try {
    const settingsResult = await useApiClient(`/sites/${siteId.value}/settings`, {
      method: 'PATCH',
      body: form.value
    });
    if (!settingsResult.success) throw new Error(settingsResult.error?.message || 'Kontak gagal disimpan.');

    const videoResult = await useApiClient(`/sites/${siteId.value}/content`, {
      method: 'POST',
      body: {
        type: 'video_profile',
        entryKey: 'video_profile',
        title: videoForm.value.title,
        status: 'DRAFT',
        payload: videoForm.value
      }
    });
    if (!videoResult.success) throw new Error(videoResult.error?.message || 'Video profil gagal disimpan.');

    toast.success('Tersimpan sebagai Draft', 'Kontak dan video profil sudah tampil di Live Preview. Publikasikan untuk memperbarui website publik.');
  } catch (error: any) {
    toast.error('Gagal Menyimpan', error.message || 'Kontak dan video profil gagal disimpan.');
  } finally {
    isSaving.value = false;
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
        <h2 class="text-xl font-bold text-slate-900">Kontak, Lokasi & Video Profil</h2>
        <p class="text-xs text-slate-500">Kelola alamat fisik, nomor layanan, sosial media, dan tautan video profil</p>
      </div>
      <button
        type="button"
        @click="handleSave"
        :disabled="isSaving"
        class="px-6 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs shadow-md shadow-emerald-800/20 transition disabled:opacity-50"
      >
        {{ isSaving ? 'Menyimpan...' : '💾 Simpan Perubahan' }}
      </button>
    </div>

    <form @submit.prevent="handleSave" class="space-y-6">
      <!-- Card 1: Kontak & Lokasi -->
      <div class="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm space-y-4">
        <h3 class="text-sm font-bold text-slate-900 uppercase tracking-wider text-emerald-800">1. Alamat & Saluran Kontak</h3>

        <div>
          <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Alamat Lengkap Sekolah</label>
          <textarea v-model="form.address" rows="2" class="w-full px-4 py-2.5 rounded-xl border text-sm"></textarea>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Nomor Telepon</label>
            <input v-model="form.phone" type="text" placeholder="(0274) 895123" class="w-full px-4 py-2.5 rounded-xl border text-sm">
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Nomor WhatsApp</label>
            <input v-model="form.whatsapp" type="text" placeholder="08123456789" class="w-full px-4 py-2.5 rounded-xl border text-sm">
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Email Layanan</label>
            <input v-model="form.email" type="email" placeholder="info@sekolah.sch.id" class="w-full px-4 py-2.5 rounded-xl border text-sm">
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Jam Operasional Kantor</label>
            <input v-model="form.operationalHours" type="text" class="w-full px-4 py-2.5 rounded-xl border text-sm">
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">URL Google Maps</label>
            <input v-model="form.googleMapsUrl" type="url" placeholder="https://maps.google.com/?q=..." class="w-full px-4 py-2.5 rounded-xl border text-sm">
          </div>
        </div>
      </div>

      <!-- Card 2: Sosial Media -->
      <div class="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm space-y-4">
        <h3 class="text-sm font-bold text-slate-900 uppercase tracking-wider text-emerald-800">2. Akun Media Sosial Resmi</h3>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Instagram URL</label>
            <input v-model="form.socialLinks.instagram" type="url" placeholder="https://instagram.com/sekolah" class="w-full px-4 py-2.5 rounded-xl border text-sm">
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">YouTube URL</label>
            <input v-model="form.socialLinks.youtube" type="url" placeholder="https://youtube.com/@sekolah" class="w-full px-4 py-2.5 rounded-xl border text-sm">
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Facebook URL</label>
            <input v-model="form.socialLinks.facebook" type="url" placeholder="https://facebook.com/sekolah" class="w-full px-4 py-2.5 rounded-xl border text-sm">
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">TikTok URL</label>
            <input v-model="form.socialLinks.tiktok" type="url" placeholder="https://tiktok.com/@sekolah" class="w-full px-4 py-2.5 rounded-xl border text-sm">
          </div>
        </div>
      </div>

      <!-- Card 3: Video Profil -->
      <div class="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm space-y-4">
        <h3 class="text-sm font-bold text-slate-900 uppercase tracking-wider text-emerald-800">3. Video Profil Sekolah</h3>

        <div>
          <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Judul Video</label>
          <input v-model="videoForm.title" type="text" class="w-full px-4 py-2.5 rounded-xl border text-sm">
        </div>

        <div>
          <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Tautan URL Video (YouTube / Vimeo)</label>
          <input v-model="videoForm.videoUrl" type="url" placeholder="https://www.youtube.com/watch?v=..." class="w-full px-4 py-2.5 rounded-xl border text-sm">
        </div>

        <div>
          <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Deskripsi Singkat Video</label>
          <textarea v-model="videoForm.description" rows="2" class="w-full px-4 py-2.5 rounded-xl border text-sm"></textarea>
        </div>
      </div>
    </form>
  </div>
</template>
