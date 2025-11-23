<script setup>
import { computed, ref } from 'vue'

/* ---------------- Props ---------------- */
const props = defineProps({
  allowedTypes: {
    type: Array,
    default: () => ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
  },
  allowedLabel: {
    type: String,
    default: '', // auto-derive if empty
  },
  maxSizeMb: {
    type: Number,
    default: 10,
  },

  // if parent wants to block UI while uploading
  loading: {
    type: Boolean,
    default: false,
  },

  // optional: you can disable dragdrop if ever needed
  enableDragDrop: {
    type: Boolean,
    default: true,
  },
  multiple: {
    type: Boolean,
    default: false,
  },
})

/* ---------------- Emits ---------------- */
const emit = defineEmits(['file', 'error'])

/* ---------------- UI State ---------------- */
const fileInput = ref(null)
const isDragging = ref(false)

/* ---------------- Helpers ---------------- */
const MIME_TO_EXT = {
  'image/jpeg': 'JPG',
  'image/png': 'PNG',
  'image/webp': 'WEBP',
  'application/pdf': 'PDF',
}

const derivedLabel = computed(() => {
  if (props.allowedLabel?.trim()) return props.allowedLabel.trim()

  const exts = props.allowedTypes.map((t) => MIME_TO_EXT[t]).filter(Boolean)

  return exts.length ? exts.join(', ') : 'Files'
})

const validateFile = (file) => {
  if (!file) return false

  if (!props.allowedTypes.includes(file.type)) {
    emit('error', `Only ${derivedLabel.value} allowed`)
    return false
  }

  const sizeMb = file.size / (1024 * 1024)
  if (sizeMb > props.maxSizeMb) {
    emit('error', `Max file size ${props.maxSizeMb} MB`)
    return false
  }

  return true
}

/* ---------------- Input Change ---------------- */
const handleFileSelect = (event) => {
  const file = event.target.files?.[0]
  if (!file) return

  if (validateFile(file)) {
    emit('file', file) // ✅ parent receives file
  }

  // reset so same file can be re-picked
  if (fileInput.value) fileInput.value.value = ''
}

const browseFiles = () => fileInput.value?.click()

/* ---------------- Drag & Drop (Child-owned) ---------------- */
const onDragOver = (e) => {
  if (!props.enableDragDrop) return
  e.preventDefault()
  isDragging.value = true
}

const onDragLeave = (e) => {
  if (!props.enableDragDrop) return
  e.preventDefault()
  isDragging.value = false
}

const onDrop = (e) => {
  if (!props.enableDragDrop) return
  e.preventDefault()
  isDragging.value = false

  const file = e.dataTransfer?.files?.[0]
  if (!file) return

  if (validateFile(file)) {
    emit('file', file) // ✅ parent receives file
  }
}

defineExpose({
  browseFiles,
  validateFile,
})
</script>

<template>
  <div
    class="rounded-xl border-2 border-dashed p-6 transition grid place-items-center text-center"
    :class="[
      isDragging && enableDragDrop
        ? 'border-blue-500 bg-blue-50'
        : 'border-slate-300 hover:border-slate-400',
      loading ? 'opacity-60 pointer-events-none' : '',
    ]"
    @dragover="onDragOver"
    @dragleave="onDragLeave"
    @drop="onDrop"
  >
    <div class="space-y-2">
      <i class="far fa-cloud-upload-alt text-3xl"></i>

      <p class="text-sm text-slate-600">
        Drag & drop your file here, or
        <button class="text-blue-700 underline font-medium" type="button" @click="browseFiles">
          browse
        </button>
      </p>

      <p class="text-xs text-slate-500">Allowed: {{ derivedLabel }} • Max {{ maxSizeMb }} MB</p>
    </div>

    <input
      ref="fileInput"
      class="hidden"
      type="file"
      :accept="allowedTypes.join(',')"
      @change="handleFileSelect"
      :multiple="multiple"
    />

    <div v-if="loading" class="mt-3 text-sm inline-flex items-center gap-2">
      <i class="far fa-circle-notch fa-spin"></i>
      Uploading…
    </div>
  </div>
</template>
