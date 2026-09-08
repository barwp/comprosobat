<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useApiClient } from '~/composables/useApi';
import { useToast } from '~/composables/useToast';

definePageMeta({ layout: 'admin' });

const toast = useToast();
const schools = ref<any[]>([]);
const searchQuery = ref('');
const statusFilter = ref('ALL');
const isLoading = ref(true);

async function loadSchools() {
  isLoading.value = true;
  const res = await useApiClient('/admin/schools');
  if (res.success && res.data) {
    schools.value = res.data;
  }
  isLoading.value = false;
}

const filteredSchools = computed(() => {
  return schools.value.filter(s => {
    const matchesSearch = s.officialName.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      (s.city && s.city.toLowerCase().includes(searchQuery.value.toLowerCase())) ||
      (s.slug && s.slug.toLowerCase().includes(searchQuery.value.toLowerCase()));
    const matchesStatus = statusFilter.value === 'ALL' || s.status === statusFilter.value;
    return matchesSearch && matchesStatus;
  });
});

async function toggleSchoolStatus(schoolId: string, currentStatus: string) {
  const newStatus = currentStatus === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
  const actionName = newStatus === 'SUSPENDED' ? 'menangguhkan (suspend)' : 'mengaktifkan kembali';

  if (!confirm(`Apakah Anda yakin ingin ${actionName} sekolah ini?`)) return;

  const res = await useApiClient(`/admin/schools/${schoolId}/status`, {
    method: 'PATCH',
    body: { status: newStatus, reason: 'Tindakan Super Admin dari control panel' }
  });

  if (res.success) {
    toast.success('Status Diperbarui', `Sekolah berhasil di-${newStatus.toLowerCase()}.`);
    loadSchools();
  } else {
    toast.error('Gagal Mengubah Status', res.error?.message);
  }
}

onMounted(() => {
  loadSchools();
});
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-black text-white">Manajemen Sekolah & Tenant</h1>
        <p class="text-xs text-slate-400">Daftar seluruh sekolah yang terdaftar pada sistem SobatWeb</p>
      </div>
    </div>

    <!-- Search and Filter Bar -->
    <div class="flex flex-col sm:flex-row gap-4">
      <input
        v-model="searchQuery"
        type="text"
        placeholder="Cari berdasarkan nama sekolah, kota, atau slug..."
        class="flex-1 px-4 py-2.5 rounded-xl bg-slate-950 text-white placeholder-slate-500 border border-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
      >
      <select
        v-model="statusFilter"
        class="px-4 py-2.5 rounded-xl bg-slate-950 text-white border border-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
      >
        <option value="ALL">Semua Status</option>
        <option value="ACTIVE">Aktif (ACTIVE)</option>
        <option value="SUSPENDED">Ditangguhkan (SUSPENDED)</option>
      </select>
    </div>

    <!-- Schools Table -->
    <div class="bg-slate-950 rounded-3xl border border-slate-800 overflow-hidden">
      <div v-if="filteredSchools.length === 0" class="text-center py-12 text-slate-500 text-sm">
        Tidak ada sekolah yang cocok dengan pencarian.
      </div>
      <table v-else class="w-full text-left text-sm">
        <thead class="bg-slate-900/60 text-slate-400 text-xs font-bold uppercase tracking-wider border-b border-slate-800">
          <tr>
            <th class="py-4 px-6">Nama Sekolah</th>
            <th class="py-4 px-6">Jenjang / Tipe</th>
            <th class="py-4 px-6">Subdomain</th>
            <th class="py-4 px-6">Kota & Provinsi</th>
            <th class="py-4 px-6">Status</th>
            <th class="py-4 px-6 text-right">Aksi</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-800/60 text-slate-300">
          <tr v-for="school in filteredSchools" :key="school.id" class="hover:bg-slate-900/40 transition">
            <td class="py-4 px-6 font-bold text-white">
              {{ school.officialName }}
            </td>
            <td class="py-4 px-6 text-xs">
              <span class="px-2 py-0.5 rounded bg-slate-800 font-semibold">{{ school.educationLevel }} ({{ school.schoolType }})</span>
            </td>
            <td class="py-4 px-6 text-xs font-mono text-emerald-400">
              <a v-if="school.slug" :href="`/?slug=${school.slug}`" target="_blank" class="hover:underline">
                {{ school.slug }}.sobat.com ↗
              </a>
              <span v-else class="text-slate-500">-</span>
            </td>
            <td class="py-4 px-6 text-xs text-slate-400">
              {{ school.city }}, {{ school.province }}
            </td>
            <td class="py-4 px-6 text-xs">
              <span
                class="px-2.5 py-1 rounded-full font-bold uppercase"
                :class="school.status === 'ACTIVE' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-rose-950 text-rose-400 border border-rose-800'"
              >
                {{ school.status }}
              </span>
            </td>
            <td class="py-4 px-6 text-right space-x-2">
              <button
                type="button"
                @click="toggleSchoolStatus(school.id, school.status)"
                class="px-3 py-1.5 rounded-lg text-xs font-bold transition"
                :class="school.status === 'ACTIVE' ? 'bg-rose-900/40 text-rose-300 hover:bg-rose-900/80' : 'bg-emerald-900/40 text-emerald-300 hover:bg-emerald-900/80'"
              >
                {{ school.status === 'ACTIVE' ? 'Suspend' : 'Aktifkan' }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
