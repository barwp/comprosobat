<script setup lang="ts">
import { useToast } from '~/composables/useToast';

const { toasts, remove } = useToast();
</script>

<template>
  <div class="fixed top-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
    <transition-group
      enter-active-class="transform ease-out duration-300 transition"
      enter-from-class="translate-y-2 opacity-0 sm:translate-y-0 sm:translate-x-2"
      enter-to-class="translate-y-0 opacity-100 sm:translate-x-0"
      leave-active-class="transition ease-in duration-100"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-for="toast in toasts"
        :key="toast.id"
        class="pointer-events-auto p-4 rounded-xl shadow-lg border flex items-start gap-3 backdrop-blur-md bg-white/95"
        :class="{
          'border-emerald-200 text-emerald-900': toast.type === 'success',
          'border-rose-200 text-rose-900': toast.type === 'error',
          'border-blue-200 text-blue-900': toast.type === 'info',
          'border-amber-200 text-amber-900': toast.type === 'warning'
        }"
      >
        <div class="flex-shrink-0 mt-0.5">
          <span v-if="toast.type === 'success'" class="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">✓</span>
          <span v-else-if="toast.type === 'error'" class="w-5 h-5 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center font-bold text-xs">✕</span>
          <span v-else class="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">ℹ</span>
        </div>
        <div class="flex-1 text-sm">
          <p class="font-semibold">{{ toast.title }}</p>
          <p v-if="toast.message" class="text-xs text-slate-600 mt-0.5">{{ toast.message }}</p>
        </div>
        <button
          type="button"
          @click="remove(toast.id)"
          class="text-slate-400 hover:text-slate-600 text-xs p-1"
        >
          ✕
        </button>
      </div>
    </transition-group>
  </div>
</template>
