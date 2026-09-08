<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useApiClient } from '~/composables/useApi';

definePageMeta({ layout: 'admin' });

const logs = ref<any[]>([]);
const isLoading = ref(true);

async function loadAuditLogs() {
  isLoading.value = true;
  const res = await useApiClient('/admin/audit-logs?limit=100');
  if (res.success && res.data) {
    logs.value = res.data;
  }
  isLoading.value = false;
}

onMounted(() => {
  loadAuditLogs();
});
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-2xl font-black text-white">Platform Audit Logs</h1>
      <p class="text-xs text-slate-400">Rekaman jejak aktivitas autentikasi, perubahan konten, mutasi status, dan rilis publikasi</p>
    </div>

    <div class="bg-slate-950 rounded-3xl border border-slate-800 overflow-hidden">
      <div v-if="logs.length === 0" class="text-center py-12 text-slate-500 text-sm">
        Belum ada log aktivitas.
      </div>
      <table v-else class="w-full text-left text-sm">
        <thead class="bg-slate-900/60 text-slate-400 text-xs font-bold uppercase tracking-wider border-b border-slate-800">
          <tr>
            <th class="py-4 px-6">Waktu Kejadian</th>
            <th class="py-4 px-6">Pelaku (Actor)</th>
            <th class="py-4 px-6">Sekolah Terkait</th>
            <th class="py-4 px-6">Aksi (Action)</th>
            <th class="py-4 px-6">Tipe Target</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-800/60 text-slate-300">
          <tr v-for="log in logs" :key="log.id" class="hover:bg-slate-900/40 transition">
            <td class="py-4 px-6 text-xs text-slate-400 font-mono">
              {{ new Date(log.createdAt).toLocaleString('id-ID') }}
            </td>
            <td class="py-4 px-6">
              <span class="font-bold text-white block">{{ log.actorName || 'Sistem' }}</span>
              <span class="text-[11px] text-slate-500">{{ log.actorEmail }}</span>
            </td>
            <td class="py-4 px-6 text-xs text-slate-300">
              {{ log.schoolName || '-' }}
            </td>
            <td class="py-4 px-6">
              <span class="px-2 py-0.5 rounded bg-purple-950 text-purple-300 text-xs font-mono font-bold border border-purple-800">
                {{ log.action }}
              </span>
            </td>
            <td class="py-4 px-6 text-xs font-mono text-slate-400">
              {{ log.targetType }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
