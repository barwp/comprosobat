<script setup lang="ts">
import { nextTick, onMounted, ref, watch } from 'vue';

const props = defineProps<{ modelValue: string; placeholder?: string; disabled?: boolean }>();
const emit = defineEmits<{ (e: 'update:modelValue', value: string): void; (e: 'request-image'): void }>();
const editor = ref<HTMLElement | null>(null);

onMounted(syncFromModel);
watch(() => props.modelValue, (value) => {
  if (editor.value && editor.value.innerHTML !== value) editor.value.innerHTML = value || '';
});

function syncFromModel() {
  if (editor.value) editor.value.innerHTML = props.modelValue || '';
}

function updateModel() {
  emit('update:modelValue', editor.value?.innerHTML || '');
}

function command(name: string, value?: string) {
  if (props.disabled) return;
  editor.value?.focus();
  document.execCommand(name, false, value);
  updateModel();
}

function addLink() {
  const url = window.prompt('Masukkan alamat tautan (https://...)');
  if (url) command('createLink', url);
}

function requestImage() {
  if (!props.disabled) emit('request-image');
}

async function insertImage(url: string) {
  const caption = window.prompt('Caption gambar (opsional)') || '';
  editor.value?.focus();
  const safeUrl = url.replace(/"/g, '&quot;');
  const safeCaption = caption.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] || c));
  document.execCommand('insertHTML', false, `<figure><img src="${safeUrl}" alt="${safeCaption}">${safeCaption ? `<figcaption>${safeCaption}</figcaption>` : ''}</figure><p><br></p>`);
  await nextTick();
  updateModel();
}

defineExpose({ insertImage });
</script>

<template>
  <div class="rounded-xl border border-slate-200 overflow-hidden bg-white focus-within:ring-2 focus-within:ring-emerald-600">
    <div class="flex flex-wrap items-center gap-1 border-b border-slate-200 bg-slate-50 p-2">
      <select :disabled="disabled" class="rounded-lg border px-2 py-1.5 text-xs bg-white" @change="command('formatBlock', ($event.target as HTMLSelectElement).value)">
        <option value="p">Paragraf</option><option value="h2">Heading 2</option><option value="h3">Heading 3</option>
      </select>
      <button type="button" title="Bold" :disabled="disabled" @click="command('bold')"><strong>B</strong></button>
      <button type="button" title="Italic" :disabled="disabled" @click="command('italic')"><em>I</em></button>
      <button type="button" title="Underline" :disabled="disabled" @click="command('underline')"><u>U</u></button>
      <button type="button" title="Bullet list" :disabled="disabled" @click="command('insertUnorderedList')">• List</button>
      <button type="button" title="Numbered list" :disabled="disabled" @click="command('insertOrderedList')">1. List</button>
      <button type="button" title="Kutipan" :disabled="disabled" @click="command('formatBlock', 'blockquote')">❝ Kutip</button>
      <button type="button" title="Tautan" :disabled="disabled" @click="addLink">🔗 Tautan</button>
      <button type="button" title="Gambar dan caption" :disabled="disabled" @click="requestImage">🖼 Gambar</button>
      <button type="button" title="Undo" :disabled="disabled" @click="command('undo')">↶</button>
      <button type="button" title="Redo" :disabled="disabled" @click="command('redo')">↷</button>
    </div>
    <div
      ref="editor"
      :contenteditable="!disabled"
      :data-placeholder="placeholder || 'Tulis isi berita secara lengkap di sini…'"
      class="rich-editor min-h-56 p-4 text-sm leading-7 outline-none"
      @input="updateModel"
      @blur="updateModel"
    ></div>
  </div>
</template>

<style scoped>
.rich-editor:empty::before { content: attr(data-placeholder); color: #94a3b8; pointer-events: none; }
.rich-editor :deep(h2) { font-size: 1.35rem; font-weight: 800; margin: 1rem 0 .5rem; }
.rich-editor :deep(h3) { font-size: 1.1rem; font-weight: 700; margin: .8rem 0 .4rem; }
.rich-editor :deep(ul) { list-style: disc; padding-left: 1.5rem; }
.rich-editor :deep(ol) { list-style: decimal; padding-left: 1.5rem; }
.rich-editor :deep(blockquote) { border-left: 4px solid #059669; padding-left: 1rem; color: #475569; font-style: italic; }
.rich-editor :deep(img) { max-width: 100%; border-radius: .75rem; margin-top: 1rem; }
.rich-editor :deep(figcaption) { text-align: center; color: #64748b; font-size: .75rem; }
button { border-radius: .5rem; padding: .35rem .55rem; font-size: .75rem; color: #334155; }
button:hover { background: #d1fae5; color: #065f46; }
button:disabled { opacity: .45; cursor: not-allowed; }
</style>
