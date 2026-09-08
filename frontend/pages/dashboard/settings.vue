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
const isLoading = ref(true);
const isSaving = ref(false);
const showMediaModal = ref(false);

const form = ref({
  siteName: '',
  tagline: '',
  description: '',
  logoUrl: '',
  logoAlt: 'Logo Sekolah',
  faviconUrl: '',
  primaryColor: '#087F5B',
  secondaryColor: '#0CA678',
  fontFamily: 'Inter',
  seoTitle: '',
  seoDescription: '',
  address: '',
  email: '',
  phone: '',
  whatsapp: '',
  operationalHours: 'Senin - Jumat: 07.00 - 15.30 WIB',
  socialLinks: {
    instagram: '',
    facebook: '',
    youtube: '',
    tiktok: '',
    twitter: ''
  },
  sectionHeadlines: {
    hero: { badge: 'Selamat Datang', title: 'Selamat Datang di Website Resmi', description: '' },
    programs: { badge: 'Pendidikan Unggulan', title: 'Program & Jurusan Unggulan', description: 'Program pendidikan berkualitas untuk mencetak lulusan berprestasi.' },
    facilities: { badge: 'Sarana Belajar', title: 'Fasilitas Kampus', description: 'Sarana dan prasarana modern untuk mendukung proses belajar mengajar.' },
    news: { badge: 'Informasi Terkini', title: 'Berita & Kegiatan', description: 'Kumpulan berita, kegiatan, dan pengumuman terbaru dari sekolah kami.' },
    vision_mission: { badge: 'Visi & Misi', title: 'Visi, Misi & Tujuan', description: 'Landasan dan arah perjuangan dalam membina generasi bangsa.' },
    staff: { badge: 'Tenaga Pendidik', title: 'Guru & Tenaga Kependidikan', description: 'Didukung oleh pendidik profesional dan berdedikasi tinggi.' },
    testimonials: { badge: 'Kata Alumni', title: 'Testimoni & Kisah Sukses', description: 'Apa kata para alumni mengenai pengalaman berharga mereka.' },
    ppdb: { badge: 'Penerimaan Siswa Baru', title: 'Pendaftaran PPDB Online', description: 'Bergabunglah bersama keluarga besar kami.' },
    contact: { badge: 'Hubungi Kami', title: 'Kontak & Lokasi Kampus', description: 'Kunjungi kampus kami atau hubungi kami melalui saluran resmi.' }
  }
});

async function loadSettings() {
  if (!user.value?.school?.id) return;
  isLoading.value = true;

  const obRes = await useApiClient(`/schools/${user.value.school.id}/onboarding`);
  if (obRes.success && obRes.data?.siteId) {
    siteId.value = obRes.data.siteId;

    const res = await useApiClient(`/sites/${siteId.value}/settings`);
    if (res.success && res.data) {
      form.value = {
        ...form.value,
        ...res.data,
        socialLinks: {
          ...form.value.socialLinks,
          ...(res.data.socialLinks || {})
        },
        sectionHeadlines: {
          ...form.value.sectionHeadlines,
          ...(res.data.sectionHeadlines || {})
        }
      };
    }
  }
  isLoading.value = false;
}

async function handleSave() {
  if (!siteId.value) return;
  isSaving.value = true;

  const res = await useApiClient(`/sites/${siteId.value}/settings`, {
    method: 'PATCH',
    body: form.value
  });
  isSaving.value = false;

  if (res.success) {
    toast.success('Pengaturan Disimpan', 'Pengaturan situs dan SEO berhasil diperbarui.');
  } else {
    toast.error('Gagal Menyimpan', res.error?.message);
  }
}

function handleSelectLogo(url: string) {
  form.value.logoUrl = url;
}

onMounted(() => {
  loadSettings();
});
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-xl font-bold text-slate-900">Pengaturan Situs & SEO</h2>
        <p class="text-xs text-slate-500">Kelola identitas umum, warna tema, logo, dan metadata mesin pencari</p>
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
      <!-- Card 1: Identitas Situs -->
      <div class="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm space-y-4">
        <h3 class="text-sm font-bold text-slate-900 uppercase tracking-wider text-emerald-800">1. Identitas & Logo Sekolah</h3>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Nama Situs / Judul Header *</label>
            <input
              v-model="form.siteName"
              type="text"
              required
              class="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
            >
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Tagline / Slogan</label>
            <input
              v-model="form.tagline"
              type="text"
              class="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
            >
          </div>
        </div>

        <div>
          <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Deskripsi Singkat Footer</label>
          <textarea
            v-model="form.description"
            rows="3"
            class="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
          ></textarea>
        </div>

        <!-- Logo Selector -->
        <div>
          <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Logo Sekolah</label>
          <div class="flex items-center gap-4">
            <div class="w-16 h-16 rounded-2xl border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden">
              <img v-if="form.logoUrl" :src="form.logoUrl" alt="Logo" class="w-full h-full object-cover">
              <span v-else class="text-xs text-slate-400">Kosong</span>
            </div>
            <div class="space-x-2">
              <button
                type="button"
                @click="showMediaModal = true"
                class="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition"
              >
                Pilih dari Media
              </button>
              <button
                v-if="form.logoUrl"
                type="button"
                @click="form.logoUrl = ''"
                class="px-3 py-2 rounded-xl text-rose-600 hover:bg-rose-50 text-xs font-bold transition"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Card 2: Warna & Desain -->
      <div class="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm space-y-4">
        <h3 class="text-sm font-bold text-slate-900 uppercase tracking-wider text-emerald-800">2. Tema Warna & Tipografi</h3>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Warna Utama (Primary)</label>
            <div class="flex items-center gap-3">
              <input v-model="form.primaryColor" type="color" class="w-10 h-10 rounded-lg border cursor-pointer">
              <input v-model="form.primaryColor" type="text" class="w-28 px-3 py-2 border rounded-xl font-mono text-xs uppercase">
            </div>
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Warna Aksen (Secondary)</label>
            <div class="flex items-center gap-3">
              <input v-model="form.secondaryColor" type="color" class="w-10 h-10 rounded-lg border cursor-pointer">
              <input v-model="form.secondaryColor" type="text" class="w-28 px-3 py-2 border rounded-xl font-mono text-xs uppercase">
            </div>
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Font Keluarga</label>
            <select v-model="form.fontFamily" class="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm bg-white">
              <option value="Inter">Inter</option>
              <option value="Plus Jakarta Sans">Plus Jakarta Sans</option>
              <option value="Poppins">Poppins</option>
              <option value="Merriweather">Merriweather (Serif)</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Card 3: SEO Metadata -->
      <div class="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm space-y-4">
        <h3 class="text-sm font-bold text-slate-900 uppercase tracking-wider text-emerald-800">3. Optimasi Mesin Pencari (SEO)</h3>

        <div>
          <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Judul SEO (Meta Title)</label>
          <input
            v-model="form.seoTitle"
            type="text"
            placeholder="SMA Negeri 1 Nusantara - Sekolah Unggulan"
            class="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
          >
        </div>

        <div>
          <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Deskripsi SEO (Meta Description)</label>
          <textarea
            v-model="form.seoDescription"
            rows="2"
            placeholder="Selamat datang di website resmi SMA Negeri 1 Nusantara..."
            class="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
          ></textarea>
        </div>
      </div>

      <!-- Card 4: Kustomisasi Judul & Badge Seksi (Headlines) -->
      <div class="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm space-y-6">
        <div class="flex items-center justify-between border-b pb-4">
          <div>
            <h3 class="text-sm font-bold text-slate-900 uppercase tracking-wider text-emerald-800">4. Judul & Badge Tiap Seksi Website</h3>
            <p class="text-xs text-slate-500">Ubah teks headline, badge atas, dan sub-judul untuk masing-masing bagian website</p>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <!-- Fasilitas -->
          <div class="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
            <h4 class="font-bold text-xs uppercase tracking-wider text-slate-900 flex items-center gap-1.5">🏢 Seksi Fasilitas</h4>
            <div>
              <label class="block text-[11px] font-bold text-slate-600 uppercase mb-1">Badge Atas</label>
              <input v-model="form.sectionHeadlines.facilities.badge" type="text" placeholder="Sarana Belajar" class="w-full px-3 py-2 text-xs rounded-lg border bg-white">
            </div>
            <div>
              <label class="block text-[11px] font-bold text-slate-600 uppercase mb-1">Judul Utama Seksi</label>
              <input v-model="form.sectionHeadlines.facilities.title" type="text" placeholder="Fasilitas Kampus" class="w-full px-3 py-2 text-xs rounded-lg border bg-white">
            </div>
            <div>
              <label class="block text-[11px] font-bold text-slate-600 uppercase mb-1">Deskripsi Singkat</label>
              <input v-model="form.sectionHeadlines.facilities.description" type="text" placeholder="Sarana dan prasarana modern..." class="w-full px-3 py-2 text-xs rounded-lg border bg-white">
            </div>
          </div>

          <!-- Berita -->
          <div class="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
            <h4 class="font-bold text-xs uppercase tracking-wider text-slate-900 flex items-center gap-1.5">📰 Seksi Berita & Informasi</h4>
            <div>
              <label class="block text-[11px] font-bold text-slate-600 uppercase mb-1">Badge Atas</label>
              <input v-model="form.sectionHeadlines.news.badge" type="text" placeholder="Informasi Terkini" class="w-full px-3 py-2 text-xs rounded-lg border bg-white">
            </div>
            <div>
              <label class="block text-[11px] font-bold text-slate-600 uppercase mb-1">Judul Utama Seksi</label>
              <input v-model="form.sectionHeadlines.news.title" type="text" placeholder="Berita & Kegiatan" class="w-full px-3 py-2 text-xs rounded-lg border bg-white">
            </div>
            <div>
              <label class="block text-[11px] font-bold text-slate-600 uppercase mb-1">Deskripsi Singkat</label>
              <input v-model="form.sectionHeadlines.news.description" type="text" placeholder="Kumpulan berita terbaru..." class="w-full px-3 py-2 text-xs rounded-lg border bg-white">
            </div>
          </div>

          <!-- Program & Jurusan -->
          <div class="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
            <h4 class="font-bold text-xs uppercase tracking-wider text-slate-900 flex items-center gap-1.5">🎓 Seksi Program & Jurusan</h4>
            <div>
              <label class="block text-[11px] font-bold text-slate-600 uppercase mb-1">Badge Atas</label>
              <input v-model="form.sectionHeadlines.programs.badge" type="text" placeholder="Kurikulum & Karir" class="w-full px-3 py-2 text-xs rounded-lg border bg-white">
            </div>
            <div>
              <label class="block text-[11px] font-bold text-slate-600 uppercase mb-1">Judul Utama Seksi</label>
              <input v-model="form.sectionHeadlines.programs.title" type="text" placeholder="Program & Jurusan Unggulan" class="w-full px-3 py-2 text-xs rounded-lg border bg-white">
            </div>
            <div>
              <label class="block text-[11px] font-bold text-slate-600 uppercase mb-1">Deskripsi Singkat</label>
              <input v-model="form.sectionHeadlines.programs.description" type="text" placeholder="Program pendidikan berkualitas..." class="w-full px-3 py-2 text-xs rounded-lg border bg-white">
            </div>
          </div>

          <!-- Visi & Misi -->
          <div class="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
            <h4 class="font-bold text-xs uppercase tracking-wider text-slate-900 flex items-center gap-1.5">🎯 Seksi Visi & Misi</h4>
            <div>
              <label class="block text-[11px] font-bold text-slate-600 uppercase mb-1">Badge Atas</label>
              <input v-model="form.sectionHeadlines.vision_mission.badge" type="text" placeholder="Komitmen & Nilai Luhur" class="w-full px-3 py-2 text-xs rounded-lg border bg-white">
            </div>
            <div>
              <label class="block text-[11px] font-bold text-slate-600 uppercase mb-1">Judul Utama Seksi</label>
              <input v-model="form.sectionHeadlines.vision_mission.title" type="text" placeholder="Visi & Misi Sekolah" class="w-full px-3 py-2 text-xs rounded-lg border bg-white">
            </div>
          </div>

          <!-- Guru & Staf -->
          <div class="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
            <h4 class="font-bold text-xs uppercase tracking-wider text-slate-900 flex items-center gap-1.5">👨‍🏫 Seksi Guru & Staf</h4>
            <div>
              <label class="block text-[11px] font-bold text-slate-600 uppercase mb-1">Badge Atas</label>
              <input v-model="form.sectionHeadlines.staff.badge" type="text" placeholder="Pendidik Profesional" class="w-full px-3 py-2 text-xs rounded-lg border bg-white">
            </div>
            <div>
              <label class="block text-[11px] font-bold text-slate-600 uppercase mb-1">Judul Utama Seksi</label>
              <input v-model="form.sectionHeadlines.staff.title" type="text" placeholder="Guru & Tenaga Pendidik" class="w-full px-3 py-2 text-xs rounded-lg border bg-white">
            </div>
          </div>

          <!-- Testimoni -->
          <div class="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
            <h4 class="font-bold text-xs uppercase tracking-wider text-slate-900 flex items-center gap-1.5">💬 Seksi Testimoni</h4>
            <div>
              <label class="block text-[11px] font-bold text-slate-600 uppercase mb-1">Badge Atas</label>
              <input v-model="form.sectionHeadlines.testimonials.badge" type="text" placeholder="Kata Alumni" class="w-full px-3 py-2 text-xs rounded-lg border bg-white">
            </div>
            <div>
              <label class="block text-[11px] font-bold text-slate-600 uppercase mb-1">Judul Utama Seksi</label>
              <input v-model="form.sectionHeadlines.testimonials.title" type="text" placeholder="Kata Alumni Kami" class="w-full px-3 py-2 text-xs rounded-lg border bg-white">
            </div>
          </div>

          <!-- PPDB -->
          <div class="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
            <h4 class="font-bold text-xs uppercase tracking-wider text-slate-900 flex items-center gap-1.5">📝 Seksi PPDB</h4>
            <div>
              <label class="block text-[11px] font-bold text-slate-600 uppercase mb-1">Badge Atas</label>
              <input v-model="form.sectionHeadlines.ppdb.badge" type="text" placeholder="Penerimaan Siswa Baru" class="w-full px-3 py-2 text-xs rounded-lg border bg-white">
            </div>
            <div>
              <label class="block text-[11px] font-bold text-slate-600 uppercase mb-1">Judul Utama Seksi</label>
              <input v-model="form.sectionHeadlines.ppdb.title" type="text" placeholder="Informasi PPDB Online" class="w-full px-3 py-2 text-xs rounded-lg border bg-white">
            </div>
          </div>

          <!-- Kontak -->
          <div class="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
            <h4 class="font-bold text-xs uppercase tracking-wider text-slate-900 flex items-center gap-1.5">📍 Seksi Kontak & Footer</h4>
            <div>
              <label class="block text-[11px] font-bold text-slate-600 uppercase mb-1">Badge Atas</label>
              <input v-model="form.sectionHeadlines.contact.badge" type="text" placeholder="Hubungi Kami" class="w-full px-3 py-2 text-xs rounded-lg border bg-white">
            </div>
            <div>
              <label class="block text-[11px] font-bold text-slate-600 uppercase mb-1">Judul Seksi</label>
              <input v-model="form.sectionHeadlines.contact.title" type="text" placeholder="Kontak & Lokasi" class="w-full px-3 py-2 text-xs rounded-lg border bg-white">
            </div>
          </div>
        </div>
      </div>
    </form>

    <MediaSelectorModal
      v-if="siteId"
      :site-id="siteId"
      :is-open="showMediaModal"
      @close="showMediaModal = false"
      @select="handleSelectLogo"
    />
  </div>
</template>
