<script setup lang="ts">
import { onMounted } from 'vue';
import { useAuth } from '~/composables/useAuth';
import ToastContainer from '~/components/ToastContainer.vue';

const { initAuth } = useAuth();

onMounted(() => {
  initAuth();
});
</script>

<template>
  <div class="min-h-screen bg-slate-50 flex flex-col justify-between">
    <slot />
    <ToastContainer />
  </div>
</template>
