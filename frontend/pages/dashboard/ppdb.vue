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
  isActive: true,
  title: 'Penerimaan Peserta Didik Baru (PPDB)',
  academicYear: '2026/2027',
  quota: 320,
  startDate: '2026-06-01',
  endDate: '2026-07-15',
  announcementDate: '2026-07-20',
  bannerImageUrl: '',
  description: 'Bergabunglah bersama kami dan kembangkan potensimu.',
  ctaText: 'Daftar Sekarang Secara Online',
  ctaUrl: '',
  whatsappNumber: '',
  formMode: 'external' as 'external' | 'whatsapp' | 'internal',
  registrationPaths: [] as Array<{ title: string; description: string; isActive: boolean; sortOrder: number }>,
  requirements: [] as string[],
  costs: '',
  registrationSteps: [
    { stepNumber: 1, title: 'Registrasi Akun Online', description: 'Buat akun calon siswa dan masukkan NISN serta data diri.' },
    { stepNumber: 2, title: 'Unggah Berkas & Raport', description: 'Unggah dokumen scan Kartu Keluarga, Akta, dan Nilai Raport.' },
    { stepNumber: 3, title: 'Verifikasi & Jalur Seleksi', description: 'Pilih jalur seleksi zonasi, prestasi, atau afirmasi.' },
    { stepNumber: 4, title: 'Pengumuman Hasil', description: 'Cek pengumuman kelulusan dan daftar ulang.' }
  ]
});

async function loadData() {
  if (!user.value?.school?.id) return;
  isLoading.value = true;
  const obRes = await useApiClient(`/schools/${user.value.school.id}/onboarding`);
  if (obRes.success && obRes.data?.siteId) {
    siteId.value = obRes.data.siteId;
    const res = await useApiClient(`/sites/${siteId.value}/content?type=ppdb`);
    if (res.success && res.data && res.data.length > 0) {
      const entry = res.data[0];
      form.value = {
        ...form.value,
        ...entry.payload,
        isActive: entry.payload?.isActive !== undefined ? entry.payload.isActive : true
      };
    }
  }
  isLoading.value = false;
}

function addStep() {
  form.value.registrationSteps.push({
    stepNumber: form.value.registrationSteps.length + 1,
    title: 'Langkah Baru',
    description: 'Deskripsi langkah pendaftaran'
  });
}

function removeStep(index: number) {
  form.value.registrationSteps.splice(index, 1);
  form.value.registrationSteps.forEach((s, idx) => s.stepNumber = idx + 1);
}

function addPath() { form.value.registrationPaths.push({ title: '', description: '', isActive: true, sortOrder: form.value.registrationPaths.length }); }
function removePath(index: number) { form.value.registrationPaths.splice(index, 1); }
function addRequirement() { form.value.requirements.push(''); }
function removeRequirement(index: number) { form.value.requirements.splice(index, 1); }

async function handleSave() {
  if (!siteId.value || !form.value.title.trim()) { toast.error('Form Belum Lengkap', 'Judul PPDB wajib diisi.'); return; }
  isSaving.value = true;

  const res = await useApiClient(`/sites/${siteId.value}/content`, {
    method: 'POST',
    body: {
      type: 'ppdb',
      entryKey: 'ppdb',
      title: 'Penerimaan Peserta Didik Baru (PPDB)',
      status: 'DRAFT',
      payload: {
        ...form.value,
        requirements: form.value.requirements.filter(Boolean),
        registrationPaths: form.value.registrationPaths.map((path, idx) => ({ ...path, sortOrder: idx })),
        registrationSteps: form.value.registrationSteps.map((step, idx) => ({ ...step, stepNumber: idx + 1, url: (step as any).url || '' }))
      }
    }
  });
  isSaving.value = false;

  if (res.success) {
    toast.success('Perubahan tersimpan sebagai draft', 'PPDB akan tampil di website publik setelah dipublikasikan.');
  } else {
    toast.error('Gagal Menyimpan', res.error?.message);
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
        <h2 class="text-xl font-bold text-slate-900">Modul PPDB Online</h2>
        <p class="text-xs text-slate-500">Kelola jadwal gelombang pendaftaran, kuota siswa, alur pendaftaran, dan tombol CTA</p>
      </div>
      <button
        type="button"
        @click="handleSave"
        :disabled="isSaving"
        class="px-6 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs shadow-md shadow-emerald-800/20 transition disabled:opacity-50"
      >
        {{ isSaving ? 'Menyimpan...' : '💾 Simpan PPDB' }}
      </button>
    </div>

    <form @submit.prevent="handleSave" class="space-y-6">
      <!-- Jadwal & Kuota -->
      <div class="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm space-y-4">
        <h3 class="text-sm font-bold text-slate-900 uppercase tracking-wider text-emerald-800">1. Informasi Umum PPDB</h3>
        <label class="flex items-center gap-3 rounded-xl bg-emerald-50 p-4 text-sm font-bold text-emerald-900"><input v-model="form.isActive" type="checkbox"> PPDB aktif dan ditampilkan di website</label>

        <div><label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Judul PPDB</label><input v-model="form.title" type="text" class="w-full px-4 py-2.5 rounded-xl border text-sm"></div>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Tahun Ajaran</label>
            <input v-model="form.academicYear" type="text" class="w-full px-4 py-2.5 rounded-xl border text-sm">
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Kuota Penerimaan (Siswa)</label>
            <input v-model.number="form.quota" type="number" class="w-full px-4 py-2.5 rounded-xl border text-sm">
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Batas Akhir (Deadline)</label>
            <input v-model="form.endDate" type="date" class="w-full px-4 py-2.5 rounded-xl border text-sm bg-white">
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4"><div><label class="block text-xs font-bold text-slate-700 mb-1.5">Mulai Pendaftaran</label><input v-model="form.startDate" type="date" class="w-full px-4 py-2.5 rounded-xl border text-sm"></div><div><label class="block text-xs font-bold text-slate-700 mb-1.5">Pengumuman</label><input v-model="form.announcementDate" type="date" class="w-full px-4 py-2.5 rounded-xl border text-sm"></div><div><label class="block text-xs font-bold text-slate-700 mb-1.5">Biaya</label><input v-model="form.costs" type="text" placeholder="Gratis / Rp..." class="w-full px-4 py-2.5 rounded-xl border text-sm"></div></div>

        <div><label class="block text-xs font-bold text-slate-700 mb-1.5">Banner PPDB</label><div class="flex gap-2"><input v-model="form.bannerImageUrl" type="text" placeholder="/api/v1/... atau https://..." class="flex-1 px-4 py-2.5 rounded-xl border text-sm"><button type="button" @click="showMediaModal = true" class="px-4 rounded-xl bg-slate-100 text-xs font-bold">Media</button></div></div>

        <div>
          <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Deskripsi Singkat Ajakan</label>
          <textarea v-model="form.description" rows="2" class="w-full px-4 py-2.5 rounded-xl border text-sm"></textarea>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Teks Tombol Daftar (CTA)</label>
            <input v-model="form.ctaText" type="text" class="w-full px-4 py-2.5 rounded-xl border text-sm">
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Tautan URL Pendaftaran Luar</label>
            <input v-model="form.ctaUrl" type="text" placeholder="https://ppdb.sman1.sch.id" class="w-full px-4 py-2.5 rounded-xl border text-sm">
          </div>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4"><div><label class="block text-xs font-bold text-slate-700 mb-1.5">Tujuan Pendaftaran</label><select v-model="form.formMode" class="w-full px-4 py-2.5 rounded-xl border text-sm bg-white"><option value="external">URL eksternal</option><option value="whatsapp">WhatsApp</option><option value="internal">Form internal</option></select></div><div v-if="form.formMode === 'whatsapp'"><label class="block text-xs font-bold text-slate-700 mb-1.5">Nomor WhatsApp</label><input v-model="form.whatsappNumber" type="tel" class="w-full px-4 py-2.5 rounded-xl border text-sm"></div></div>
      </div>

      <div class="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm space-y-4"><div class="flex justify-between"><h3 class="text-sm font-bold text-emerald-800 uppercase">2. Jalur & Persyaratan</h3><div class="flex gap-2"><button type="button" @click="addPath" class="text-xs font-bold">+ Jalur</button><button type="button" @click="addRequirement" class="text-xs font-bold">+ Syarat</button></div></div><div v-for="(path, idx) in form.registrationPaths" :key="`path-${idx}`" class="grid sm:grid-cols-12 gap-2"><input v-model="path.title" placeholder="Nama jalur" class="sm:col-span-3 px-3 py-2 rounded-lg border text-sm"><input v-model="path.description" placeholder="Keterangan" class="sm:col-span-7 px-3 py-2 rounded-lg border text-sm"><label class="sm:col-span-1 text-xs flex items-center"><input v-model="path.isActive" type="checkbox"> Aktif</label><button type="button" @click="removePath(idx)" class="text-xs text-rose-600">Hapus</button></div><div v-for="(_, idx) in form.requirements" :key="`req-${idx}`" class="flex gap-2"><input v-model="form.requirements[idx]" placeholder="Persyaratan pendaftaran" class="flex-1 px-3 py-2 rounded-lg border text-sm"><button type="button" @click="removeRequirement(idx)" class="text-xs text-rose-600">Hapus</button></div></div>

      <!-- Alur Pendaftaran -->
      <div class="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm space-y-4">
        <div class="flex items-center justify-between">
          <h3 class="text-sm font-bold text-slate-900 uppercase tracking-wider text-emerald-800">3. Langkah / Alur Pendaftaran</h3>
          <button type="button" @click="addStep" class="px-3 py-1.5 bg-emerald-50 text-emerald-800 rounded-lg text-xs font-bold hover:bg-emerald-100">
            + Tambah Langkah
          </button>
        </div>

        <div class="space-y-4">
          <div
            v-for="(step, idx) in form.registrationSteps"
            :key="idx"
            class="p-4 rounded-2xl border border-slate-200 bg-slate-50 flex items-start gap-4"
          >
            <div class="w-8 h-8 rounded-full bg-emerald-800 text-white font-bold text-xs flex items-center justify-center flex-shrink-0 mt-1">
              {{ idx + 1 }}
            </div>
            <div class="flex-1 space-y-2">
              <input v-model="step.title" type="text" placeholder="Judul langkah" class="w-full px-3 py-1.5 rounded-lg border text-sm font-bold bg-white">
              <textarea v-model="step.description" rows="2" placeholder="Deskripsi instruksi" class="w-full px-3 py-1.5 rounded-lg border text-xs bg-white"></textarea>
            </div>
            <button type="button" @click="removeStep(idx)" class="text-slate-400 hover:text-rose-600 p-1 text-xs font-bold">✕</button>
          </div>
        </div>
      </div>
    </form>
    <MediaSelectorModal v-if="siteId" :site-id="siteId" :is-open="showMediaModal" @close="showMediaModal = false" @select="(url) => form.bannerImageUrl = url" />
  </div>
</template>
