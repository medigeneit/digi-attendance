<script setup>
import { ref } from 'vue'
import { useChecklistStore } from '@/stores/checklist'

const props = defineProps({
  modelValue: { type: [Number, null], default: null }, // attachment_id
  current: { type: Object, default: null }             // {url, original_name/name}
})
const emit = defineEmits(['update:modelValue','uploaded'])

const store = useChecklistStore()
const busy = ref(false)
const err = ref('')

async function onFile(e) {
  const file = e.target.files?.[0]
  if (!file) return
  busy.value = true; err.value = ''
  try {
    const doc = await store.uploadDocument(file) // {id, url, name}
    emit('update:modelValue', doc.id)
    emit('uploaded', doc)
    // optional toast
    if (window?.notify?.success) window.notify.success('Uploaded')
  } catch (ex) {
    err.value = 'Upload failed'
    if (window?.notify?.error) window.notify.error('Upload failed')
    console.error(ex)
  } finally {
    busy.value = false
    e.target.value = ''
  }
}
</script>

<template>
  <div class="space-y-1">
    <div class="flex items-center gap-2">
      <input type="file" @change="onFile" :disabled="busy" class="text-sm" />
      <span v-if="busy" class="text-xs text-gray-500">Uploading…</span>
    </div>
    <p v-if="err" class="text-xs text-red-600">{{ err }}</p>
    <div v-if="current" class="text-xs">
      <a :href="current.url || current.path" target="_blank" class="underline hover:no-underline">
        {{ current.original_name || current.name }}
      </a>
    </div>
  </div>
</template>
