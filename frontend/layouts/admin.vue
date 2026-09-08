<script setup lang="ts">
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuth } from '~/composables/useAuth';
import ToastContainer from '~/components/ToastContainer.vue';

const router = useRouter();
const { user, isSuperAdmin, initAuth, logout } = useAuth();

onMounted(() => {
  initAuth();
  if (!user.value) {
    router.push('/login');
    return;
  }
  if (!isSuperAdmin.value) {
    router.push('/dashboard');
  }
});
</script>

<template>
  <div class="min-h-screen bg-slate-900 text-slate-100 flex">
    <!-- Super Admin Sidebar -->
    <aside class="w-64 bg-slate-950 border-r border-slate-800 flex flex-col h-screen fixed top-0 left-0 z-30">
      <div class="h-16 border-b border-slate-800 flex items-center px-6 gap-3 bg-purple-950 text-white">
        <div class="w-8 h-8 rounded-lg bg-purple-600 flex items-center justify-center font-bold text-lg">
          🛡️
        </div>
        <div>
          <span class="font-extrabold text-sm tracking-tight block">SobatWeb Admin</span>
          <span class="text-[10px] text-purple-300 font-medium tracking-wide uppercase">Super Admin Portal</span>
        </div>
      </div>

      <div class="flex-1 overflow-y-auto py-4 px-3 space-y-1 text-sm font-medium">
        <NuxtLink
          to="/admin/dashboard"
          class="flex items-center gap-3 px-3.5 py-2.5 rounded-xl hover:bg-slate-800 transition"
          active-class="bg-purple-900/60 text-purple-200 font-semibold border border-purple-700/50"
        >
          <span>📊</span>
          <span>Platform Overview</span>
        </NuxtLink>
        <NuxtLink
          to="/admin/schools"
          class="flex items-center gap-3 px-3.5 py-2.5 rounded-xl hover:bg-slate-800 transition"
          active-class="bg-purple-900/60 text-purple-200 font-semibold border border-purple-700/50"
        >
          <span>🏫</span>
          <span>Kelola Sekolah</span>
        </NuxtLink>
        <NuxtLink
          to="/admin/users"
          class="flex items-center gap-3 px-3.5 py-2.5 rounded-xl hover:bg-slate-800 transition"
          active-class="bg-purple-900/60 text-purple-200 font-semibold border border-purple-700/50"
        >
          <span>👥</span>
          <span>Kelola Pengguna</span>
        </NuxtLink>
        <NuxtLink
          to="/admin/templates"
          class="flex items-center gap-3 px-3.5 py-2.5 rounded-xl hover:bg-slate-800 transition"
          active-class="bg-purple-900/60 text-purple-200 font-semibold border border-purple-700/50"
        >
          <span>🎨</span>
          <span>Template Manager & Upload</span>
        </NuxtLink>
        <NuxtLink
          to="/admin/audit-logs"
          class="flex items-center gap-3 px-3.5 py-2.5 rounded-xl hover:bg-slate-800 transition"
          active-class="bg-purple-900/60 text-purple-200 font-semibold border border-purple-700/50"
        >
          <span>📜</span>
          <span>Audit Logs</span>
        </NuxtLink>

        <!-- Shortcut to School CMS -->
        <div class="pt-6 mt-6 border-t border-slate-800">
          <NuxtLink
            to="/dashboard"
            class="flex items-center gap-3 px-3.5 py-2 rounded-xl text-emerald-400 hover:bg-emerald-950/50 font-medium"
          >
            <span>🏫</span>
            <span>Ke CMS Sekolah</span>
          </NuxtLink>
        </div>
      </div>

      <div class="p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between">
        <div class="truncate pr-2">
          <p class="text-xs font-bold text-white truncate">{{ user?.name }}</p>
          <p class="text-[11px] text-slate-400 truncate">{{ user?.email }}</p>
        </div>
        <button
          type="button"
          @click="logout"
          class="p-2 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-rose-950 transition text-xs font-semibold"
          title="Keluar"
        >
          🚪
        </button>
      </div>
    </aside>

    <div class="flex-1 ml-64 flex flex-col min-h-screen">
      <main class="flex-1 p-8 max-w-7xl w-full mx-auto">
        <slot />
      </main>
    </div>
    <ToastContainer />
  </div>
</template>
