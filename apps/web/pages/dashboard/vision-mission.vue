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
  visionTitle: 'Visi Sekolah',
  visionContent: '',
  missionTitle: 'Misi Sekolah',
  missionItems: ['']
});

async function loadData() {
  if (!user.value?.school?.id) return;
  isLoading.value = true;
  const obRes = await useApiClient(`/schools/${user.value.school.id}/onboarding`);
  if (obRes.success && obRes.data?.siteId) {
    siteId.value = obRes.data.siteId;
    const res = await useApiClient(`/sites/${siteId.value}/content?type=vision_mission`);
    if (res.success && res.data && res.data.length > 0) {
      const entry = res.data[0];
      form.value = {
        visionTitle: entry.payload?.visionTitle || 'Visi Sekolah',
        visionContent: entry.payload?.visionContent || entry.payload?.vision || '',
        missionTitle: entry.payload?.missionTitle || 'Misi Sekolah',
        missionItems: entry.payload?.missionItems || entry.payload?.missions || ['']
      };
    }
  }
  isLoading.value = false;
}

function moveMissionItem(index: number, direction: -1 | 1) {
  const target = index + direction;
  if (target < 0 || target >= form.value.missionItems.length) return;
  const [item] = form.value.missionItems.splice(index, 1); form.value.missionItems.splice(target, 0, item);
}

function addMissionItem() {
  form.value.missionItems.push('');
}

function removeMissionItem(index: number) {
  if (form.value.missionItems.length > 1) {
    form.value.missionItems.splice(index, 1);
  }
}

async function handleSave() {
  if (!siteId.value || !form.value.visionContent) {
    toast.error('Form Belum Lengkap', 'Isi pernyataan visi wajib diisi.');
    return;
  }

  isSaving.value = true;
  const filteredMissions = form.value.missionItems.filter(m => m.trim() !== '');

  const res = await useApiClient(`/sites/${siteId.value}/content`, {
    method: 'POST',
    body: {
      type: 'vision_mission',
      entryKey: 'vision_mission',
      title: 'Visi dan Misi Sekolah',
      status: 'DRAFT',
      payload: {
        ...form.value,
        missionItems: filteredMissions.length > 0 ? filteredMissions : ['Mewujudkan pembelajaran aktif dan berkarakter.']
      }
    }
  });
  isSaving.value = false;

  if (res.success) {
    toast.success('Perubahan tersimpan sebagai draft', 'Publikasikan website agar perubahan terlihat oleh pengunjung.');
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
        <h2 class="text-xl font-bold text-slate-900">Visi & Misi Sekolah</h2>
        <p class="text-xs text-slate-500">Tentukan cita-cita besar dan langkah strategis pendidikan sekolah</p>
      </div>
      <button
        type="button"
        @click="handleSave"
        :disabled="isSaving"
        class="px-6 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs shadow-md shadow-emerald-800/20 transition disabled:opacity-50"
      >
        {{ isSaving ? 'Menyimpan...' : '💾 Simpan Visi & Misi' }}
      </button>
    </div>

    <form @submit.prevent="handleSave" class="space-y-6">
      <!-- Visi Card -->
      <div class="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm space-y-4">
        <h3 class="text-sm font-bold text-slate-900 uppercase tracking-wider text-emerald-800">1. Pernyataan Visi</h3>
        <div>
          <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Isi Pernyataan Visi *</label>
          <textarea
            v-model="form.visionContent"
            rows="3"
            required
            placeholder="Terwujudnya insan cendekia yang beriman, bertakwa, berdaya saing global..."
            class="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
          ></textarea>
        </div>
      </div>

      <!-- Misi Card -->
      <div class="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm space-y-4">
        <div class="flex items-center justify-between">
          <h3 class="text-sm font-bold text-slate-900 uppercase tracking-wider text-emerald-800">2. Poin-Poin Misi</h3>
          <button
            type="button"
            @click="addMissionItem"
            class="px-3 py-1.5 bg-emerald-50 text-emerald-800 rounded-lg text-xs font-bold hover:bg-emerald-100"
          >
            + Tambah Poin Misi
          </button>
        </div>

        <div class="space-y-3">
          <div
            v-for="(item, idx) in form.missionItems"
            :key="idx"
            class="flex items-center gap-3"
          >
            <span class="w-7 h-7 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-xs flex-shrink-0">
              {{ idx + 1 }}
            </span>
            <input
              v-model="form.missionItems[idx]"
              type="text"
              placeholder="Tuliskan butir misi..."
              class="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
            >
            <button
              type="button"
              @click="removeMissionItem(idx)"
              class="text-slate-400 hover:text-rose-600 p-2 text-xs font-bold"
            >
              ✕
            </button>
            <button type="button" :disabled="idx === 0" @click="moveMissionItem(idx, -1)" class="text-xs font-bold disabled:opacity-30">↑</button>
            <button type="button" :disabled="idx === form.missionItems.length - 1" @click="moveMissionItem(idx, 1)" class="text-xs font-bold disabled:opacity-30">↓</button>
          </div>
        </div>
      </div>
    </form>
  </div>
</template>
