<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuth } from '~/composables/useAuth';

const router = useRouter();
const { login, user } = useAuth();

const email = ref('');
const password = ref('');
const isLoading = ref(false);

async function handleLogin() {
  if (!email.value || !password.value) return;
  isLoading.value = true;
  const success = await login(email.value, password.value);
  isLoading.value = false;

  if (success) {
    const role = user.value?.platformRole || (user.value as any)?.role;
    if (role === 'SUPER_ADMIN') {
      router.push('/admin/dashboard');
    } else if (user.value?.school) {
      router.push('/dashboard');
    } else {
      router.push('/onboarding');
    }
  }
}

function fillDemo(type: 'superadmin' | 'man5') {
  if (type === 'superadmin') {
    email.value = 'superadmin@sobat.com';
    password.value = 'SuperAdminPassword123!';
  } else if (type === 'man5') {
    email.value = 'admin.man5sleman@sobat.com';
    password.value = 'SchoolAdmin123!';
  }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center p-6 bg-slate-900">
    <div class="max-w-md w-full bg-white rounded-3xl p-8 shadow-2xl space-y-6">
      <div class="text-center space-y-2">
        <div class="w-12 h-12 rounded-2xl bg-emerald-800 text-white font-black text-2xl flex items-center justify-center mx-auto shadow-lg shadow-emerald-800/30">
          S
        </div>
        <h2 class="text-2xl font-black text-slate-900">Masuk ke SobatWeb</h2>
        <p class="text-xs text-slate-500 font-medium">Kelola website profil MAN 5 Sleman</p>
      </div>

      <!-- Demo Quick Fill Buttons -->
      <div class="p-3 bg-emerald-50 rounded-2xl border border-emerald-100 space-y-2">
        <p class="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">🚀 Klik Akun Demo Otomatis:</p>
        <div class="grid grid-cols-2 gap-2 text-xs font-semibold">
          <button
            type="button"
            @click="fillDemo('man5')"
            class="py-2 px-3 rounded-xl bg-white text-emerald-800 hover:bg-emerald-100 border border-emerald-300 transition text-center shadow-xs flex items-center justify-center gap-1.5"
          >
            <span>🏫</span> Admin MAN 5
          </button>
          <button
            type="button"
            @click="fillDemo('superadmin')"
            class="py-2 px-3 rounded-xl bg-white text-purple-800 hover:bg-purple-100 border border-purple-300 transition text-center shadow-xs flex items-center justify-center gap-1.5"
          >
            <span>👑</span> Super Admin
          </button>
        </div>
      </div>

      <form @submit.prevent="handleLogin" class="space-y-4">
        <div>
          <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Email Akun</label>
          <input
            v-model="email"
            type="email"
            required
            placeholder="admin.sekolah@sobat.com"
            class="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 transition"
          >
        </div>

        <div>
          <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Kata Sandi</label>
          <input
            v-model="password"
            type="password"
            required
            placeholder="••••••••"
            class="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 transition"
          >
        </div>

        <button
          type="submit"
          :disabled="isLoading"
          class="w-full py-3.5 px-4 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-sm shadow-lg shadow-emerald-800/30 transition disabled:opacity-50"
        >
          {{ isLoading ? 'Memproses...' : 'Masuk ke Dashboard' }}
        </button>
      </form>

      <div class="text-center text-xs text-slate-500 pt-2">
        Belum memiliki akun sekolah?
        <NuxtLink to="/register" class="font-bold text-emerald-700 hover:underline">Daftar Sekarang</NuxtLink>
      </div>
    </div>
  </div>
</template>
