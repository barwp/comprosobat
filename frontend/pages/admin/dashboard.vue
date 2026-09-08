<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useApiClient } from '~/composables/useApi';

definePageMeta({ layout: 'admin' });

const stats = ref<any>(null);
const isLoading = ref(true);

async function loadStats() {
  isLoading.value = true;
  const res = await useApiClient('/admin/dashboard');
  if (res.success && res.data) {
    stats.value = res.data;
  }
  isLoading.value = false;
}

onMounted(() => {
  loadStats();
});
</script>

<template>
  <div class="space-y-8">
    <div>
      <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-950 text-purple-300 text-xs font-bold border border-purple-800 uppercase tracking-widest mb-2">
        Super Admin Control Center
      </div>
      <h1 class="text-3xl font-extrabold text-white">Platform Overview & Metrics</h1>
      <p class="text-xs text-slate-400">Ringkasan seluruh tenant sekolah, pengguna, template, dan aktivitas rilis platform SobatWeb</p>
    </div>

    <!-- Stats Grid -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6" v-if="stats">
      <div class="bg-slate-950 p-6 rounded-3xl border border-slate-800 space-y-2">
        <div class="flex items-center justify-between text-slate-400 text-xs font-bold uppercase">
          <span>Total Sekolah</span>
          <span class="text-xl">🏫</span>
        </div>
        <div class="text-4xl font-black text-white">{{ stats.totalSchools }}</div>
        <p class="text-xs text-emerald-400 font-semibold">{{ stats.activeSchools }} Sekolah Aktif</p>
      </div>

      <div class="bg-slate-950 p-6 rounded-3xl border border-slate-800 space-y-2">
        <div class="flex items-center justify-between text-slate-400 text-xs font-bold uppercase">
          <span>Total Pengguna</span>
          <span class="text-xl">👥</span>
        </div>
        <div class="text-4xl font-black text-white">{{ stats.totalUsers }}</div>
        <p class="text-xs text-purple-400 font-semibold">Admin & Editor Terdaftar</p>
      </div>

      <div class="bg-slate-950 p-6 rounded-3xl border border-slate-800 space-y-2">
        <div class="flex items-center justify-between text-slate-400 text-xs font-bold uppercase">
          <span>Template Aktif</span>
          <span class="text-xl">🎨</span>
        </div>
        <div class="text-4xl font-black text-white">{{ stats.activeTemplates }}</div>
        <p class="text-xs text-blue-400 font-semibold">Tersedia untuk Sekolah</p>
      </div>

      <div class="bg-slate-950 p-6 rounded-3xl border border-slate-800 space-y-2">
        <div class="flex items-center justify-between text-slate-400 text-xs font-bold uppercase">
          <span>Aktivitas Audit</span>
          <span class="text-xl">📜</span>
        </div>
        <div class="text-4xl font-black text-white">{{ stats.recentAuditLogsCount }}</div>
        <p class="text-xs text-slate-400 font-semibold">Log Aktivitas Tercatat</p>
      </div>
    </div>

    <!-- Quick Navigation Cards -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <NuxtLink to="/admin/schools" class="bg-slate-950 p-6 rounded-3xl border border-slate-800 hover:border-purple-500/50 transition group space-y-3">
        <div class="w-10 h-10 rounded-xl bg-purple-900/40 text-purple-300 flex items-center justify-center font-bold text-xl">
          🏫
        </div>
        <h3 class="text-lg font-bold text-white group-hover:text-purple-300 transition">Kelola Sekolah & Subdomain</h3>
        <p class="text-xs text-slate-400 leading-relaxed">Cari, filter, tinjau subdomain aktif, dan ubah status aktif/suspend sekolah.</p>
      </NuxtLink>

      <NuxtLink to="/admin/templates" class="bg-slate-950 p-6 rounded-3xl border border-slate-800 hover:border-purple-500/50 transition group space-y-3">
        <div class="w-10 h-10 rounded-xl bg-blue-900/40 text-blue-300 flex items-center justify-center font-bold text-xl">
          📦
        </div>
        <h3 class="text-lg font-bold text-white group-hover:text-blue-300 transition">Unggah & Validasi Template</h3>
        <p class="text-xs text-slate-400 leading-relaxed">Upload paket template ZIP, jalankan security AST scanner, dan kelola versi.</p>
      </NuxtLink>

      <NuxtLink to="/admin/audit-logs" class="bg-slate-950 p-6 rounded-3xl border border-slate-800 hover:border-purple-500/50 transition group space-y-3">
        <div class="w-10 h-10 rounded-xl bg-emerald-900/40 text-emerald-300 flex items-center justify-center font-bold text-xl">
          📜
        </div>
        <h3 class="text-lg font-bold text-white group-hover:text-emerald-300 transition">Audit Logs & Keamanan</h3>
        <p class="text-xs text-slate-400 leading-relaxed">Pantau seluruh perubahan sensitif, login, dan mutasi data antar tenant.</p>
      </NuxtLink>
    </div>
  </div>
</template>
