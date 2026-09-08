<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useAuth } from '~/composables/useAuth';
import { useApiClient } from '~/composables/useApi';
import { useToast } from '~/composables/useToast';

definePageMeta({ layout: 'dashboard' });

const { user } = useAuth();
const toast = useToast();

const siteId = ref<string | null>(null);
const slug = ref<string | null>(null);
const releases = ref<any[]>([]);
const summaryInput = ref('Pembaruan konten dan informasi sekolah.');
const isLoading = ref(true);
const isPublishing = ref(false);
const publicationStatus = ref<any>(null);

async function loadData() {
  if (!user.value?.school?.id) return;
  isLoading.value = true;

  const obRes = await useApiClient(`/schools/${user.value.school.id}/onboarding`);
  if (obRes.success && obRes.data?.siteId) {
    siteId.value = obRes.data.siteId;
    slug.value = obRes.data.slug;

    const relRes = await useApiClient(`/sites/${siteId.value}/releases`);
    if (relRes.success && relRes.data) {
      releases.value = relRes.data;
    }
    const statusRes = await useApiClient(`/sites/${siteId.value}/publication-status`);
    if (statusRes.success) publicationStatus.value = statusRes.data;
  }
  isLoading.value = false;
}

async function handlePublish() {
  if (!siteId.value) return;
  isPublishing.value = true;

  const res = await useApiClient(`/sites/${siteId.value}/publish`, {
    method: 'POST',
    body: { summary: summaryInput.value }
  });
  isPublishing.value = false;

  if (res.success) {
    toast.success('Website Berhasil Online! 🚀', 'Snapshot rilis baru telah aktif dan terbuka di tab baru.');
    const liveTarget = `/?slug=${slug.value || ''}`;
    window.open(liveTarget, '_blank');
    loadData();
  } else {
    toast.error('Publikasi Gagal', res.error?.message);
  }
}

async function handleRollback(releaseId: string, versionNumber: number) {
  if (!confirm(`Apakah Anda yakin ingin mengembalikan (rollback) website ke Rilis Versi ${versionNumber}?`)) return;

  const res = await useApiClient(`/sites/${siteId.value}/releases/${releaseId}/rollback`, {
    method: 'POST'
  });

  if (res.success) {
    toast.success('Rollback Berhasil', `Website telah dikembalikan ke rilis Versi ${versionNumber}.`);
    loadData();
  } else {
    toast.error('Rollback Gagal', res.error?.message);
  }
}

onMounted(() => {
  loadData();
});
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h2 class="text-xl font-bold text-slate-900">Riwayat Rilis & Publikasi</h2>
        <p class="text-xs text-slate-500">Kunci data draft menjadi rilis resmi yang langsung online dan dapat diakses publik</p>
      </div>

      <div class="flex items-center gap-3">
        <button
          type="button"
          @click="handlePublish"
          :disabled="isPublishing"
          class="px-5 py-2.5 rounded-xl bg-emerald-800 text-white font-bold text-xs hover:bg-emerald-900 shadow-md shadow-emerald-800/20 transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
        >
          <span>🚀</span>
          <span>{{ isPublishing ? 'Mempublikasikan...' : 'Publikasikan Draft Sekarang' }}</span>
          <span class="text-[10px] text-emerald-200">↗</span>
        </button>
      </div>
    </div>

    <div v-if="publicationStatus" class="rounded-2xl border p-4 flex flex-wrap items-center justify-between gap-3" :class="publicationStatus.hasUnpublishedChanges ? 'bg-amber-50 border-amber-200 text-amber-900' : 'bg-emerald-50 border-emerald-200 text-emerald-900'">
      <div>
        <p class="text-sm font-extrabold">{{ publicationStatus.hasUnpublishedChanges ? 'Terdapat Perubahan Draft Baru' : 'Website sudah menggunakan draft terbaru' }}</p>
        <p class="text-xs mt-1">{{ publicationStatus.hasUnpublishedChanges ? 'Tekan tombol Publikasikan untuk langsung memperbarui website live di tab baru.' : 'Website live sudah identik dengan data draft terakhir.' }}</p>
      </div>
      <div v-if="publicationStatus.activeRelease" class="text-xs font-bold">Rilis aktif v{{ publicationStatus.activeRelease.versionNumber }} · {{ new Date(publicationStatus.activeRelease.publishedAt).toLocaleString('id-ID') }}</div>
    </div>

    <!-- Release History Timeline (Full Width) -->
    <div class="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm space-y-6">
      <div class="flex items-center justify-between">
        <h3 class="text-base font-bold text-slate-900">Daftar Riwayat Rilis & Rollback</h3>
        <span class="text-xs text-slate-400 font-medium">{{ releases.length }} rilis tercatat</span>
      </div>

      <div v-if="releases.length === 0" class="text-center py-10 text-slate-400 text-sm font-medium">
        Belum ada rilis yang diterbitkan.
      </div>

      <div v-else class="space-y-4">
        <div
          v-for="rel in releases"
          :key="rel.id"
          class="p-5 rounded-2xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          :class="rel.status === 'ACTIVE' ? 'bg-emerald-50/60 border-emerald-300 ring-2 ring-emerald-500/20' : 'bg-slate-50 border-slate-200 opacity-80'"
        >
          <div class="space-y-1">
            <div class="flex items-center gap-2">
              <span class="font-extrabold text-sm text-slate-900">Rilis v{{ rel.versionNumber }}</span>
              <span
                class="text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase"
                :class="rel.status === 'ACTIVE' ? 'bg-emerald-800 text-white' : 'bg-slate-200 text-slate-700'"
              >
                {{ rel.status === 'ACTIVE' ? 'Sedang Aktif Live' : 'Arsip Versi' }}
              </span>
            </div>
            <p class="text-xs text-slate-600 font-medium">{{ rel.summary || 'Rilis publikasi situs sekolah.' }}</p>
            <p class="text-[11px] text-slate-400">Diterbitkan: {{ new Date(rel.publishedAt).toLocaleString('id-ID') }}</p>
          </div>

          <div v-if="rel.status === 'ACTIVE'">
            <a
              :href="slug ? `/?slug=${slug}` : '/'"
              target="_blank"
              class="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition shadow-xs inline-flex items-center gap-1.5"
            >
              <span>🌐</span>
              <span>Buka Website Live</span>
              <span class="text-[10px]">↗</span>
            </a>
          </div>
          <div v-else>
            <button
              type="button"
              @click="handleRollback(rel.id, rel.versionNumber)"
              class="px-4 py-2 bg-slate-200 hover:bg-emerald-700 hover:text-white rounded-xl text-xs font-bold text-slate-700 transition shadow-xs"
            >
              ↺ Rollback ke v{{ rel.versionNumber }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
