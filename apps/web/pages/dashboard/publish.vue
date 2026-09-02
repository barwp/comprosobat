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
    toast.success('Publikasi Berhasil! 🚀', 'Snapshot rilis baru telah aktif di subdomain.');
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
    <div>
      <h2 class="text-xl font-bold text-slate-900">Publikasi & Riwayat Rilis</h2>
      <p class="text-xs text-slate-500">Kunci data draft menjadi rilis resmi yang dapat diakses publik oleh siswa dan orang tua</p>
    </div>
    <div v-if="publicationStatus" class="rounded-2xl border p-4 flex flex-wrap items-center justify-between gap-3" :class="publicationStatus.hasUnpublishedChanges ? 'bg-amber-50 border-amber-200 text-amber-900' : 'bg-emerald-50 border-emerald-200 text-emerald-900'">
      <div><p class="text-sm font-extrabold">{{ publicationStatus.hasUnpublishedChanges ? 'Belum dipublikasikan' : 'Website sudah menggunakan draft terbaru' }}</p><p class="text-xs mt-1">{{ publicationStatus.hasUnpublishedChanges ? 'Perubahan tersimpan sebagai draft dan sudah dapat dilihat di Live Preview.' : 'Tidak ada perubahan draft setelah publikasi terakhir.' }}</p></div>
      <div v-if="publicationStatus.activeRelease" class="text-xs font-bold">Rilis aktif v{{ publicationStatus.activeRelease.versionNumber }} · {{ new Date(publicationStatus.activeRelease.publishedAt).toLocaleString('id-ID') }}</div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-12 gap-8">
      <!-- Publish Action Box -->
      <div class="lg:col-span-5 bg-gradient-to-br from-emerald-800 to-teal-900 rounded-3xl p-8 text-white shadow-xl space-y-6">
        <div class="space-y-2">
          <span class="text-xs font-bold uppercase tracking-widest text-emerald-300">Siap Menerbitkan?</span>
          <h3 class="text-2xl font-black">Publikasikan Versi Baru</h3>
          <p class="text-xs text-emerald-100 leading-relaxed">
            Publikasi akan membuat snapshot website yang aman dan independen. Perubahan draft berikutnya tidak akan mengubah website live sampai Anda menekan tombol publish lagi.
          </p>
        </div>

        <div>
          <label class="block text-xs font-bold uppercase tracking-wider text-emerald-200 mb-1.5">Catatan Perubahan (Opsional)</label>
          <input
            v-model="summaryInput"
            type="text"
            placeholder="Contoh: Pembaruan jadwal PPDB & berita terbaru"
            class="w-full px-4 py-3 rounded-xl bg-white/10 text-white placeholder-emerald-200/50 border border-white/20 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
          >
        </div>

        <button
          type="button"
          @click="handlePublish"
          :disabled="isPublishing"
          class="w-full py-4 px-6 rounded-xl bg-white text-emerald-950 font-black text-sm hover:bg-emerald-50 shadow-xl transition disabled:opacity-50"
        >
          {{ isPublishing ? 'Menerbitkan Snapshot...' : '🚀 Terbitkan Website Sekarang' }}
        </button>
      </div>

      <!-- Release History Timeline -->
      <div class="lg:col-span-7 bg-white rounded-3xl p-8 border border-slate-200 shadow-sm space-y-6">
        <h3 class="text-base font-bold text-slate-900">Riwayat Rilis & Rollback</h3>

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
  </div>
</template>
