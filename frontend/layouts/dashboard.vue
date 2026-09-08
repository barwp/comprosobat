<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuth } from '~/composables/useAuth';
import { useApiClient } from '~/composables/useApi';
import DashboardSidebar from '~/components/DashboardSidebar.vue';
import DashboardHeader from '~/components/DashboardHeader.vue';
import ToastContainer from '~/components/ToastContainer.vue';

const router = useRouter();
const { user, initAuth, isAuthenticated } = useAuth();

const siteId = ref<string | null>(null);
const slug = ref<string | null>(null);
const isLoading = ref(true);
const authReady = ref(false);
const mobileMenuOpen = ref(false);

async function fetchSiteContext() {
  if (!user.value?.school?.id) {
    isLoading.value = false;
    return;
  }

  const res = await useApiClient(`/schools/${user.value.school.id}/onboarding`);
  if (res.success && res.data) {
    siteId.value = res.data.siteId || null;
    slug.value = res.data.slug || null;
  }
  isLoading.value = false;
}

onMounted(async () => {
  initAuth();
  if (!user.value) {
    router.push('/login');
    return;
  }

  if (user.value.platformRole === 'SUPER_ADMIN' && !user.value.school) {
    router.push('/admin/dashboard');
    return;
  }

  if (!user.value.school) {
    router.push('/onboarding');
    return;
  }

  authReady.value = true;
  await fetchSiteContext();
});
</script>

<template>
  <div class="min-h-screen bg-slate-50 flex">
    <button v-if="mobileMenuOpen" aria-label="Tutup menu" class="fixed inset-0 bg-black/40 z-30 lg:hidden" @click="mobileMenuOpen = false" />
    <DashboardSidebar :class="mobileMenuOpen ? 'visible translate-x-0' : 'invisible -translate-x-full lg:visible lg:translate-x-0'" @navigate="mobileMenuOpen = false" />
    <div class="flex-1 min-w-0 lg:ml-64 flex flex-col min-h-screen">
      <button class="lg:hidden px-4 py-3 text-left font-bold bg-white" :aria-expanded="mobileMenuOpen" @click="mobileMenuOpen = !mobileMenuOpen">☰ Menu CMS</button>
      <DashboardHeader :slug="slug" :site-id="siteId" />
      <main class="flex-1 min-w-0 p-4 sm:p-8 max-w-7xl w-full mx-auto">
        <slot v-if="authReady" :site-id="siteId" :slug="slug" />
      </main>
    </div>
    <ToastContainer />
  </div>
</template>
