<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuth } from '~/composables/useAuth';
import { useApiClient } from '~/composables/useApi';
import { useToast } from '~/composables/useToast';

const router = useRouter();
const { user, initAuth, setUser } = useAuth();
const toast = useToast();

const currentStep = ref<1 | 2 | 3>(1);
const isLoading = ref(false);

// Step 1 State: Profile
const officialName = ref('');
const npsn = ref('');
const educationLevel = ref('SMA');
const schoolType = ref('NEGERI');
const province = ref('D.I. Yogyakarta');
const city = ref('Kab. Sleman');
const address = ref('');
const phone = ref('');
const email = ref('');
const schoolId = ref<string | null>(null);

// Step 2 State: Subdomain
const slugInput = ref('');
const isCheckingSlug = ref(false);
const isSlugAvailable = ref<boolean | null>(null);
const slugSuggestions = ref<string[]>([]);
const slugError = ref<string | null>(null);

// Step 3 State: Template Selection
const templates = ref<any[]>([]);
const selectedTemplateVersionId = ref<string | null>(null);

async function handleSaveProfile() {
  if (!officialName.value || !province.value || !city.value) {
    toast.error('Form Belum Lengkap', 'Nama sekolah, provinsi, dan kota wajib diisi.');
    return;
  }

  isLoading.value = true;
  const res = await useApiClient('/schools', {
    method: 'POST',
    body: {
      officialName: officialName.value,
      npsn: npsn.value || null,
      educationLevel: educationLevel.value,
      schoolType: schoolType.value,
      province: province.value,
      city: city.value,
      address: address.value || null,
      phone: phone.value || null,
      email: email.value || null
    }
  });
  isLoading.value = false;

  if (res.success && res.data) {
    schoolId.value = res.data.school.id;
    slugInput.value = res.data.suggestedSlug;
    if (user.value) {
      setUser({
        ...user.value,
        school: {
          id: res.data.school.id,
          name: res.data.school.officialName,
          role: 'SCHOOL_ADMIN'
        }
      });
    }
    toast.success('Profil Tersimpan', 'Silakan pilih alamat subdomain unik sekolah Anda.');
    currentStep.value = 2;
    checkSlug();
  } else {
    toast.error('Gagal Menyimpan', res.error?.message || 'Gagal menyimpan data sekolah.');
  }
}

async function checkSlug() {
  if (!slugInput.value || !schoolId.value) return;
  isCheckingSlug.value = true;
  slugError.value = null;

  const res = await useApiClient(`/schools/${schoolId.value}/subdomain/check`, {
    method: 'POST',
    body: { slug: slugInput.value }
  });
  isCheckingSlug.value = false;

  if (res.success && res.data) {
    isSlugAvailable.value = res.data.isAvailable;
    slugSuggestions.value = res.data.suggestions || [];
    if (!res.data.isAvailable) {
      slugError.value = res.data.reason || 'Subdomain tidak tersedia.';
    }
  }
}

async function handleReserveSubdomain() {
  if (!slugInput.value || !schoolId.value || !isSlugAvailable.value) return;
  isLoading.value = true;

  const res = await useApiClient(`/schools/${schoolId.value}/subdomain`, {
    method: 'PUT',
    body: { slug: slugInput.value }
  });
  isLoading.value = false;

  if (res.success) {
    toast.success('Subdomain Berhasil Direservasi', `Subdomain ${slugInput.value}.sobat.com siap digunakan!`);
    await loadTemplates();
    currentStep.value = 3;
  } else {
    toast.error('Gagal Reservasi', res.error?.message || 'Subdomain gagal direservasi.');
  }
}

async function loadTemplates() {
  const res = await useApiClient('/templates');
  if (res.success && res.data) {
    templates.value = res.data;
    if (templates.value.length > 0) {
      selectedTemplateVersionId.value = templates.value[0].versionId;
    }
  }
}

async function handleFinishOnboarding() {
  if (!selectedTemplateVersionId.value || !schoolId.value) return;
  isLoading.value = true;

  // 1. Select template
  const selectRes = await useApiClient(`/schools/${schoolId.value}/template`, {
    method: 'PUT',
    body: { templateVersionId: selectedTemplateVersionId.value }
  });

  if (!selectRes.success) {
    isLoading.value = false;
    toast.error('Gagal Memilih Template', selectRes.error?.message);
    return;
  }

  // 2. Complete onboarding transaction
  const completeRes = await useApiClient(`/schools/${schoolId.value}/onboarding/complete`, {
    method: 'POST'
  });
  isLoading.value = false;

  if (completeRes.success) {
    toast.success('Website Berhasil Dibuat!', 'Selamat! Situs sekolah Anda siap diisi melalui CMS.');
    router.push('/dashboard');
  } else {
    toast.error('Gagal Menyelesaikan', completeRes.error?.message);
  }
}

onMounted(() => {
  initAuth();
  if (!user.value) {
    router.push('/login');
    return;
  }
  if (user.value.school?.id) {
    schoolId.value = user.value.school.id;
  }
});
</script>

<template>
  <div class="min-h-screen bg-slate-900 text-slate-100 py-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-3xl mx-auto space-y-8">
      <!-- Wizard Progress Header -->
      <div class="text-center space-y-3">
        <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950 text-emerald-400 text-xs font-bold border border-emerald-800 uppercase tracking-widest">
          Wizard Onboarding Sekolah
        </div>
        <h1 class="text-3xl font-extrabold tracking-tight">Siapkan Website Sekolah Anda</h1>
        <div class="flex items-center justify-center gap-3 pt-2 text-xs font-semibold">
          <div class="flex items-center gap-2" :class="currentStep >= 1 ? 'text-emerald-400' : 'text-slate-500'">
            <span class="w-6 h-6 rounded-full flex items-center justify-center border font-bold" :class="currentStep >= 1 ? 'border-emerald-400 bg-emerald-950' : 'border-slate-700'">1</span>
            Profil Sekolah
          </div>
          <span class="text-slate-700">──</span>
          <div class="flex items-center gap-2" :class="currentStep >= 2 ? 'text-emerald-400' : 'text-slate-500'">
            <span class="w-6 h-6 rounded-full flex items-center justify-center border font-bold" :class="currentStep >= 2 ? 'border-emerald-400 bg-emerald-950' : 'border-slate-700'">2</span>
            Alamat Subdomain
          </div>
          <span class="text-slate-700">──</span>
          <div class="flex items-center gap-2" :class="currentStep >= 3 ? 'text-emerald-400' : 'text-slate-500'">
            <span class="w-6 h-6 rounded-full flex items-center justify-center border font-bold" :class="currentStep >= 3 ? 'border-emerald-400 bg-emerald-950' : 'border-slate-700'">3</span>
            Pilih Template
          </div>
        </div>
      </div>

      <!-- STEP 1: School Profile -->
      <div v-if="currentStep === 1" class="bg-white text-slate-900 rounded-3xl p-8 shadow-2xl space-y-6">
        <div>
          <h2 class="text-xl font-bold">1. Data Pokok Sekolah</h2>
          <p class="text-xs text-slate-500">Masukkan identitas resmi institusi pendidikan Anda</p>
        </div>

        <form @submit.prevent="handleSaveProfile" class="space-y-4">
          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Nama Resmi Sekolah *</label>
            <input
              v-model="officialName"
              type="text"
              required
              placeholder="Contoh: SMA Negeri 1 Kota Bandung"
              class="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
            >
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">NPSN (Opsional)</label>
              <input
                v-model="npsn"
                type="text"
                placeholder="20104567"
                class="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
              >
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Jenjang Pendidikan</label>
              <select
                v-model="educationLevel"
                class="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 bg-white"
              >
                <option value="SD">SD / MI</option>
                <option value="SMP">SMP / MTs</option>
                <option value="SMA">SMA / MA</option>
                <option value="SMK">SMK / MAK</option>
                <option value="OTHER">Lembaga Lainnya</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Status Sekolah</label>
              <select
                v-model="schoolType"
                class="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 bg-white"
              >
                <option value="NEGERI">Negeri</option>
                <option value="SWASTA">Swasta</option>
              </select>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Provinsi *</label>
              <input
                v-model="province"
                type="text"
                required
                placeholder="D.I. Yogyakarta"
                class="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
              >
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Kota / Kabupaten *</label>
              <input
                v-model="city"
                type="text"
                required
                placeholder="Kab. Sleman"
                class="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
              >
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Telepon Sekolah</label>
              <input
                v-model="phone"
                type="text"
                placeholder="(0274) 895123"
                class="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
              >
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Email Sekolah</label>
              <input
                v-model="email"
                type="email"
                placeholder="info@sekolah.sch.id"
                class="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
              >
            </div>
          </div>

          <button
            type="submit"
            :disabled="isLoading"
            class="w-full py-4 px-6 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-sm shadow-xl shadow-emerald-800/30 transition disabled:opacity-50 mt-4"
          >
            {{ isLoading ? 'Menyimpan...' : 'Lanjutkan ke Pemilihan Subdomain →' }}
          </button>
        </form>
      </div>

      <!-- STEP 2: Subdomain Selector -->
      <div v-else-if="currentStep === 2" class="bg-white text-slate-900 rounded-3xl p-8 shadow-2xl space-y-6">
        <div>
          <h2 class="text-xl font-bold">2. Tentukan Alamat Subdomain</h2>
          <p class="text-xs text-slate-500">Website Anda akan dapat diakses publik melalui alamat unik ini</p>
        </div>

        <div class="space-y-4">
          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Subdomain Sekolah</label>
            <div class="flex rounded-xl shadow-sm border border-slate-200 overflow-hidden focus-within:ring-2 focus-within:ring-emerald-600">
              <input
                v-model="slugInput"
                type="text"
                @input="checkSlug"
                placeholder="sman1bandung"
                class="flex-1 px-4 py-3 text-sm focus:outline-none font-mono"
              >
              <span class="bg-slate-100 text-slate-600 px-4 py-3 text-xs font-bold font-mono flex items-center border-l border-slate-200">
                .sobat.com
              </span>
            </div>
          </div>

          <!-- Availability Feedback -->
          <div v-if="isCheckingSlug" class="text-xs font-medium text-slate-500 flex items-center gap-2">
            <span class="w-3 h-3 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"></span>
            Memeriksa ketersediaan subdomain...
          </div>
          <div v-else-if="isSlugAvailable === true" class="text-xs font-bold text-emerald-700 bg-emerald-50 p-3 rounded-xl border border-emerald-200 flex items-center gap-2">
            <span>✓</span> Subdomain <strong>{{ slugInput }}.sobat.com</strong> tersedia!
          </div>
          <div v-else-if="isSlugAvailable === false" class="space-y-2">
            <p class="text-xs font-bold text-rose-600 bg-rose-50 p-3 rounded-xl border border-rose-200">
              ✕ {{ slugError }}
            </p>
            <div v-if="slugSuggestions.length > 0" class="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <p class="text-[11px] font-bold text-slate-600 uppercase">Saran Subdomain yang Tersedia:</p>
              <div class="flex flex-wrap gap-2">
                <button
                  v-for="sug in slugSuggestions"
                  :key="sug"
                  type="button"
                  @click="slugInput = sug; checkSlug();"
                  class="px-3 py-1 text-xs font-mono font-bold bg-white text-emerald-800 border border-emerald-300 rounded-lg hover:bg-emerald-50"
                >
                  {{ sug }}
                </button>
              </div>
            </div>
          </div>

          <div class="flex gap-4 pt-4">
            <button
              type="button"
              @click="currentStep = 1"
              class="w-1/3 py-3.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50 transition"
            >
              ← Kembali
            </button>
            <button
              type="button"
              @click="handleReserveSubdomain"
              :disabled="isLoading || !isSlugAvailable"
              class="w-2/3 py-3.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs shadow-lg shadow-emerald-800/30 transition disabled:opacity-50"
            >
              {{ isLoading ? 'Mereservasi...' : 'Reservasi & Lanjut ke Template →' }}
            </button>
          </div>
        </div>
      </div>

      <!-- STEP 3: Template Selector -->
      <div v-else-if="currentStep === 3" class="bg-white text-slate-900 rounded-3xl p-8 shadow-2xl space-y-6">
        <div>
          <h2 class="text-xl font-bold">3. Pilih Desain Template Website</h2>
          <p class="text-xs text-slate-500">Anda dapat mengubah template kapan saja tanpa kehilangan konten yang telah diisi</p>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div
            v-for="tpl in templates"
            :key="tpl.versionId"
            @click="selectedTemplateVersionId = tpl.versionId"
            class="border-2 rounded-2xl p-5 cursor-pointer transition flex flex-col justify-between"
            :class="selectedTemplateVersionId === tpl.versionId ? 'border-emerald-600 bg-emerald-50/50 ring-2 ring-emerald-600/20' : 'border-slate-200 hover:border-slate-300 bg-white'"
          >
            <div class="space-y-3">
              <div class="aspect-[16/10] bg-slate-100 rounded-xl overflow-hidden border border-slate-200 flex items-center justify-center font-bold text-slate-400 text-sm">
                🖼️ Preview {{ tpl.name }}
              </div>
              <div class="flex items-center justify-between">
                <h3 class="font-bold text-base text-slate-900">{{ tpl.name }}</h3>
                <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">{{ tpl.category }}</span>
              </div>
              <p class="text-xs text-slate-600 leading-relaxed">
                {{ tpl.manifest?.description || 'Template responsif dengan dukungan penuh semua modul CMS.' }}
              </p>
            </div>
            <div class="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
              <span class="text-xs font-semibold text-emerald-800">Versi {{ tpl.version }}</span>
              <span
                class="w-6 h-6 rounded-full border flex items-center justify-center text-xs font-bold"
                :class="selectedTemplateVersionId === tpl.versionId ? 'bg-emerald-600 text-white border-emerald-600' : 'border-slate-300'"
              >
                {{ selectedTemplateVersionId === tpl.versionId ? '✓' : '' }}
              </span>
            </div>
          </div>
        </div>

        <div class="flex gap-4 pt-4">
          <button
            type="button"
            @click="currentStep = 2"
            class="w-1/3 py-3.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50 transition"
          >
            ← Kembali
          </button>
          <button
            type="button"
            @click="handleFinishOnboarding"
            :disabled="isLoading || !selectedTemplateVersionId"
            class="w-2/3 py-3.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs shadow-lg shadow-emerald-800/30 transition disabled:opacity-50"
          >
            {{ isLoading ? 'Membuat Situs...' : 'Selesai & Masuk ke CMS Dashboard 🚀' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
