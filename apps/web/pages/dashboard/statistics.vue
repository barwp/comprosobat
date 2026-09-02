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
  historyTitle: 'Sejarah Singkat',
  establishmentYear: 1990,
  historySummary: '',
  historyImageUrl: '',
  accreditation: '',
  stats: [
    { key: 'students', label: 'Siswa Aktif', rawValue: 1200, suffix: '+', icon: 'Users', sortOrder: 0, isActive: true },
    { key: 'teachers', label: 'Tenaga Pendidik', rawValue: 75, suffix: '+', icon: 'Award', sortOrder: 1, isActive: true },
    { key: 'alumni', label: 'Alumni Sukses', rawValue: 5000, suffix: '+', icon: 'GraduationCap', sortOrder: 2, isActive: true },
    { key: 'achievements', label: 'Prestasi Nasional', rawValue: 120, suffix: '+', icon: 'Trophy', sortOrder: 3, isActive: true }
  ]
});

async function loadData() {
  if (!user.value?.school?.id) return;
  isLoading.value = true;
  const obRes = await useApiClient(`/schools/${user.value.school.id}/onboarding`);
  if (obRes.success && obRes.data?.siteId) {
    siteId.value = obRes.data.siteId;
    const res = await useApiClient(`/sites/${siteId.value}/content?type=history_statistic`);
    if (res.success && res.data && res.data.length > 0) {
      const entry = res.data[0];
      form.value = {
        historyTitle: entry.payload?.historyTitle || 'Sejarah Singkat',
        establishmentYear: entry.payload?.establishmentYear || 1990,
        historySummary: entry.payload?.historySummary || '',
        historyImageUrl: entry.payload?.historyImageUrl || '',
        accreditation: entry.payload?.accreditation || '',
        stats: entry.payload?.stats || form.value.stats
      };
    }
  }
  isLoading.value = false;
}

function addStat() {
  form.value.stats.push({
    key: `stat_${Date.now()}`,
    label: 'Statistik Baru',
    rawValue: 100,
    suffix: '+',
    icon: 'Sparkles',
    sortOrder: form.value.stats.length,
    isActive: true
  });
}

function moveStat(index: number, direction: -1 | 1) {
  const target = index + direction;
  if (target < 0 || target >= form.value.stats.length) return;
  const [item] = form.value.stats.splice(index, 1); form.value.stats.splice(target, 0, item);
  form.value.stats.forEach((stat: any, idx) => stat.sortOrder = idx);
}

function removeStat(index: number) {
  if (form.value.stats.length > 1) {
    form.value.stats.splice(index, 1);
  }
}

async function handleSave() {
  if (!siteId.value) return;
  isSaving.value = true;

  const res = await useApiClient(`/sites/${siteId.value}/content`, {
    method: 'POST',
    body: {
      type: 'history_statistic',
      entryKey: 'history_statistic',
      title: 'Sejarah & Statistik Sekolah',
      status: 'DRAFT',
      payload: { ...form.value, stats: form.value.stats.map((stat: any, idx) => ({ ...stat, sortOrder: idx, isActive: stat.isActive !== false })) }
    }
  });
  isSaving.value = false;

  if (res.success) {
    toast.success('Statistik Disimpan', 'Sejarah dan data statistik berhasil diperbarui.');
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
        <h2 class="text-xl font-bold text-slate-900">Sejarah & Statistik Sekolah</h2>
        <p class="text-xs text-slate-500">Kelola narasi sejarah dan angka statistik pencapaian (siswa, guru, kelulusan)</p>
      </div>
      <button
        type="button"
        @click="handleSave"
        :disabled="isSaving"
        class="px-6 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs shadow-md shadow-emerald-800/20 transition disabled:opacity-50"
      >
        {{ isSaving ? 'Menyimpan...' : '💾 Simpan Data' }}
      </button>
    </div>

    <form @submit.prevent="handleSave" class="space-y-6">
      <!-- Sejarah Card -->
      <div class="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm space-y-4">
        <h3 class="text-sm font-bold text-slate-900 uppercase tracking-wider text-emerald-800">1. Sejarah Sekolah</h3>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div class="sm:col-span-2">
            <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Judul Sejarah</label>
            <input v-model="form.historyTitle" type="text" class="w-full px-4 py-2.5 rounded-xl border text-sm">
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Tahun Berdiri</label>
            <input v-model.number="form.establishmentYear" type="number" class="w-full px-4 py-2.5 rounded-xl border text-sm">
          </div>
        </div>

        <div>
          <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Ringkasan Sejarah</label>
          <textarea v-model="form.historySummary" rows="4" class="w-full px-4 py-2.5 rounded-xl border text-sm"></textarea>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div><label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Akreditasi</label><input v-model="form.accreditation" type="text" placeholder="A (Unggul)" class="w-full px-4 py-2.5 rounded-xl border text-sm"></div>
          <div><label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Gambar Pendukung</label><div class="flex gap-2"><input v-model="form.historyImageUrl" type="url" class="flex-1 min-w-0 px-4 py-2.5 rounded-xl border text-sm"><button type="button" @click="showMediaModal = true" class="px-3 rounded-xl bg-slate-100 text-xs font-bold">Media</button></div></div>
        </div>
      </div>

      <!-- Statistik Card -->
      <div class="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm space-y-4">
        <div class="flex items-center justify-between">
          <h3 class="text-sm font-bold text-slate-900 uppercase tracking-wider text-emerald-800">2. Angka Statistik Utama</h3>
          <button type="button" @click="addStat" class="px-3 py-1.5 bg-emerald-50 text-emerald-800 rounded-lg text-xs font-bold hover:bg-emerald-100">
            + Tambah Angka Statistik
          </button>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div
            v-for="(item, idx) in form.stats"
            :key="idx"
            class="p-4 rounded-2xl border border-slate-200 bg-slate-50 space-y-3"
          >
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold text-slate-500 uppercase">Kartu {{ idx + 1 }}</span>
              <button type="button" @click="removeStat(idx)" class="text-xs text-rose-600 font-bold hover:underline">Hapus</button>
            </div>
            <div class="grid grid-cols-2 gap-2"><input v-model="item.icon" type="text" placeholder="Ikon (Users)" class="px-3 py-2 rounded-lg border text-xs bg-white"><label class="flex items-center gap-2 text-xs"><input v-model="item.isActive" type="checkbox"> Aktif</label></div>
            <div class="flex gap-2"><button type="button" :disabled="idx === 0" @click="moveStat(idx, -1)" class="text-xs font-bold disabled:opacity-30">↑ Naik</button><button type="button" :disabled="idx === form.stats.length - 1" @click="moveStat(idx, 1)" class="text-xs font-bold disabled:opacity-30">↓ Turun</button></div>

            <div>
              <label class="block text-[11px] font-bold text-slate-600 uppercase mb-1">Label Statistik</label>
              <input v-model="item.label" type="text" class="w-full px-3 py-2 rounded-lg border text-sm bg-white">
            </div>

            <div class="grid grid-cols-2 gap-2">
              <div>
                <label class="block text-[11px] font-bold text-slate-600 uppercase mb-1">Nilai Angka (Raw)</label>
                <input v-model.number="item.rawValue" type="number" class="w-full px-3 py-2 rounded-lg border text-sm bg-white">
              </div>
              <div>
                <label class="block text-[11px] font-bold text-slate-600 uppercase mb-1">Akhiran (Suffix)</label>
                <input v-model="item.suffix" type="text" placeholder="+, %, dll" class="w-full px-3 py-2 rounded-lg border text-sm bg-white">
              </div>
            </div>
          </div>
        </div>
      </div>
    </form>
    <MediaSelectorModal v-if="siteId" :site-id="siteId" :is-open="showMediaModal" @close="showMediaModal = false" @select="(url) => form.historyImageUrl = url" />
  </div>
</template>
