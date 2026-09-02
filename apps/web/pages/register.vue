<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuth } from '~/composables/useAuth';

const router = useRouter();
const { register } = useAuth();

const name = ref('');
const email = ref('');
const password = ref('');
const whatsappNumber = ref('');
const agreeTerms = ref(true);
const isLoading = ref(false);

async function handleRegister() {
  if (!name.value || !email.value || !password.value || !agreeTerms.value) return;
  isLoading.value = true;
  const success = await register({
    name: name.value,
    email: email.value,
    password: password.value,
    whatsappNumber: whatsappNumber.value,
    agreeTerms: agreeTerms.value
  });
  isLoading.value = false;

  if (success) {
    router.push('/onboarding');
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
        <h2 class="text-2xl font-black text-slate-900">Daftar Akun Sekolah</h2>
        <p class="text-xs text-slate-500 font-medium">Langkah 1 dari 4: Buat akun penanggung jawab sekolah</p>
      </div>

      <form @submit.prevent="handleRegister" class="space-y-4">
        <div>
          <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Nama Penanggung Jawab</label>
          <input
            v-model="name"
            type="text"
            required
            placeholder="Drs. H. Ahmad Dahlan, M.Pd"
            class="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 transition"
          >
        </div>

        <div>
          <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Email Resmi</label>
          <input
            v-model="email"
            type="email"
            required
            placeholder="admin@sekolah.sch.id"
            class="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 transition"
          >
        </div>

        <div>
          <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Kata Sandi (Min. 8 Karakter)</label>
          <input
            v-model="password"
            type="password"
            required
            minlength="8"
            placeholder="••••••••"
            class="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 transition"
          >
        </div>

        <div>
          <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Nomor WhatsApp (Opsional)</label>
          <input
            v-model="whatsappNumber"
            type="tel"
            placeholder="08123456789"
            class="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 transition"
          >
        </div>

        <div class="flex items-start gap-2.5 pt-2">
          <input
            v-model="agreeTerms"
            type="checkbox"
            id="terms"
            required
            class="mt-1 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
          >
          <label for="terms" class="text-xs text-slate-600 leading-snug">
            Saya menyetujui <span class="text-emerald-700 font-semibold">Syarat & Ketentuan</span> serta kebijakan privasi platform SobatWeb.
          </label>
        </div>

        <button
          type="submit"
          :disabled="isLoading || !agreeTerms"
          class="w-full py-3.5 px-4 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-sm shadow-lg shadow-emerald-800/30 transition disabled:opacity-50"
        >
          {{ isLoading ? 'Mendaftarkan...' : 'Lanjutkan ke Profil Sekolah →' }}
        </button>
      </form>

      <div class="text-center text-xs text-slate-500 pt-2">
        Sudah memiliki akun?
        <NuxtLink to="/login" class="font-bold text-emerald-700 hover:underline">Masuk Disini</NuxtLink>
      </div>
    </div>
  </div>
</template>
