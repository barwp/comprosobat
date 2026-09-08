<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useApiClient } from '~/composables/useApi';
import { useToast } from '~/composables/useToast';

definePageMeta({ layout: 'admin' });

const toast = useToast();
const users = ref<any[]>([]);
const isLoading = ref(true);

async function loadUsers() {
  isLoading.value = true;
  const res = await useApiClient('/admin/users');
  if (res.success && res.data) {
    users.value = res.data;
  }
  isLoading.value = false;
}

async function toggleUserStatus(userId: string, currentStatus: string) {
  const newStatus = currentStatus === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
  const res = await useApiClient(`/admin/users/${userId}/status`, {
    method: 'PATCH',
    body: { status: newStatus }
  });

  if (res.success) {
    toast.success('Status Pengguna Diperbarui', `Akun berhasil di-${newStatus.toLowerCase()}.`);
    loadUsers();
  } else {
    toast.error('Gagal Mengubah Status', res.error?.message);
  }
}

onMounted(() => {
  loadUsers();
});
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-2xl font-black text-white">Manajemen Pengguna</h1>
      <p class="text-xs text-slate-400">Kelola akun administrator, staf editor sekolah, dan hak akses</p>
    </div>

    <div class="bg-slate-950 rounded-3xl border border-slate-800 overflow-x-auto">
      <table class="w-full text-left text-sm">
        <thead class="bg-slate-900/60 text-slate-400 text-xs font-bold uppercase tracking-wider border-b border-slate-800">
          <tr>
            <th class="py-4 px-6">Nama Pengguna</th>
            <th class="py-4 px-6">Email Akun</th>
            <th class="py-4 px-6">Peran Platform</th>
            <th class="py-4 px-6">Status Akun</th>
            <th class="py-4 px-6 text-right">Aksi</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-800/60 text-slate-300">
          <tr v-for="u in users" :key="u.id" class="hover:bg-slate-900/40 transition">
            <td class="py-4 px-6 font-bold text-white">{{ u.name }}</td>
            <td class="py-4 px-6 text-xs text-slate-400 font-mono">{{ u.email }}</td>
            <td class="py-4 px-6 text-xs font-semibold">
              <span class="px-2.5 py-1 rounded bg-slate-800 text-purple-300">{{ u.platformRole }}</span>
            </td>
            <td class="py-4 px-6 text-xs">
              <span
                class="px-2.5 py-1 rounded-full font-bold uppercase"
                :class="u.status === 'ACTIVE' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-rose-950 text-rose-400 border border-rose-800'"
              >
                {{ u.status }}
              </span>
            </td>
            <td class="py-4 px-6 text-right">
              <button
                v-if="u.platformRole !== 'SUPER_ADMIN'"
                type="button"
                @click="toggleUserStatus(u.id, u.status)"
                class="px-3 py-1.5 rounded-lg text-xs font-bold transition"
                :class="u.status === 'ACTIVE' ? 'bg-rose-900/40 text-rose-300 hover:bg-rose-900/80' : 'bg-emerald-900/40 text-emerald-300 hover:bg-emerald-900/80'"
              >
                {{ u.status === 'ACTIVE' ? 'Suspend Akun' : 'Aktifkan Akun' }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
