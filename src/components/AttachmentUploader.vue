<!-- components/AttachmentCompact.vue -->
<script setup>
import { ref, computed } from 'vue'
import { useChecklistStore } from '@/stores/checklist'

const props = defineProps({
  itemId: { type: [Number, String], required: true },
  modelValue: { type: [Number, null], default: null },
  current: { type: Object, default: null },
  /** new: externally disable buttons (e.g. row is saving) */
  disabled: { type: Boolean, default: false },
})

const emit = defineEmits(['update:modelValue', 'update:current', 'uploaded', 'detached'])

const store = useChecklistStore()

const inputRef = ref(null)
const busy = ref(false)
const err = ref('')
const progress = ref(0)
const hasProgress = ref(false)

const MAX_BYTES = 10 * 1024 * 1024
const ACCEPT_MIMES = [
  'image/jpeg','image/png','application/pdf',
  'application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document'
]
const acceptAttr = '.jpg,.jpeg,.png,.pdf,.doc,.docx'

const hasFile = computed(() => !!(props.current?.url || props.current?.path))
const fileUrl = computed(() => props.current?.url || props.current?.path || null)
const fileName = computed(() =>
  props.current?.name || props.current?.original_name || filenameFromUrl(fileUrl.value) || 'Document'
)
const isImg = computed(() => (props.current?.mime || '').startsWith('image/'))

function filenameFromUrl(u) {
  if (!u) return ''
  try { return decodeURIComponent(u.split('/').pop().split('?')[0]) } catch { return '' }
}
function formatBytes(n) {
  if (n == null) return ''
  const units = ['B','KB','MB','GB']
  let i = 0, v = n
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++ }
  return `${v.toFixed(i ? 1 : 0)} ${units[i]}`
}
function validate(file) {
  if (!file) return 'No file selected'
  if (file.size > MAX_BYTES) return `Max ${formatBytes(MAX_BYTES)}`
  if (!ACCEPT_MIMES.includes(file.type)) return 'Unsupported type'
  return ''
}

async function handleFile(file) {
  const v = validate(file)
  if (v) { err.value = v; return }
  if (props.disabled) return

  busy.value = true
  err.value = ''
  progress.value = 0
  hasProgress.value = false

  try {
    const doc = await store.uploadDocument(file, {
      onProgress: (p) => { hasProgress.value = true; progress.value = p }
    })
    emit('update:modelValue', doc.id)
    emit('uploaded', doc)
    window?.notify?.success && window.notify.success('File uploaded')
  } catch (e) {
    console.error(e)
    err.value = 'Upload failed'
    window?.notify?.error && window.notify.error('Upload failed')
  } finally {
    busy.value = false
    progress.value = 0
    hasProgress.value = false
    if (inputRef.value) inputRef.value.value = ''
  }
}

function onInput(e) {
  const file = e.target.files?.[0]
  if (file) handleFile(file)
}
function browse() {
  if (busy.value || props.disabled) return
  inputRef.value?.click()
}

const clearSelection = async () => {
  if (busy.value || props.disabled) return
  busy.value = true
  err.value = ''
  try {
    const res = await store.detachAttachment(props.itemId, { deleteDocument: true })
    emit('update:modelValue', null)
    emit('update:current', null)
    emit('detached', res?.data || null)
    window?.notify?.success && window.notify.success('Attachment removed')
  } catch (e) {
    console.error(e)
    err.value = 'Failed to remove'
    window?.notify?.error && window.notify.error('Failed to remove')
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="min-w-0">
    <div class="flex items-center gap-2 min-w-0">
      <template v-if="hasFile">
        <a
          :href="fileUrl"
          target="_blank"
          class="group inline-flex max-w-[12rem] items-center gap-1 truncate rounded-full border px-2 py-0.5 text-xs hover:bg-gray-50"
          :title="fileName"
        >
          <span class="inline-flex h-4 w-4 items-center justify-center">
            <img v-if="isImg" :src="fileUrl" alt="" class="h-4 w-4 rounded object-cover" />
            <svg v-else class="h-4 w-4 text-gray-500" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M14 2H6a2 2 0 00-2 2v16c0 1.1.9 2 2 2h12a2 2 0 002-2V8l-6-6z" stroke="currentColor" stroke-width="1.5"/>
              <path d="M14 2v6h6" stroke="currentColor" stroke-width="1.5"/>
            </svg>
          </span>
          <span class="truncate">{{ fileName }}</span>
        </a>

        <!-- Replace -->
        <button
          type="button"
          class="inline-flex h-7 w-7 items-center justify-center rounded border text-gray-700 hover:bg-gray-50 disabled:opacity-60"
          :disabled="busy || disabled"
          title="Replace"
          @click="browse"
        >
          <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M4 12a8 8 0 118 8" stroke="currentColor" stroke-width="1.5"/>
            <path d="M12 8v8m0-8l-3 3m3-3l3 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
        </button>

        <!-- Remove -->
        <button
          type="button"
          class="inline-flex h-7 w-7 items-center justify-center rounded border border-rose-200 text-rose-700 hover:bg-rose-50 disabled:opacity-60"
          :disabled="busy || disabled"
          title="Remove"
          @click="clearSelection"
        >
          <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
        </button>
      </template>

      <template v-else>
        <button
          type="button"
          class="inline-flex items-center gap-1 rounded-md bg-gray-900 px-2.5 py-1 text-xs text-white hover:bg-gray-800 disabled:opacity-60"
          :disabled="busy || disabled"
          @click="browse"
          title="Upload file"
        >
          <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M12 16V4m0 12l-3-3m3 3l3-3M6 20h12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
          Upload
        </button>
      </template>

      <input
        ref="inputRef"
        type="file"
        class="hidden"
        :accept="acceptAttr"
        @change="onInput"
        :disabled="busy || disabled"
      />

      <svg v-if="busy" class="h-4 w-4 animate-spin text-gray-500" viewBox="0 0 24 24" fill="none" aria-label="Uploading">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3"/>
        <path class="opacity-75" d="M4 12a8 8 0 018-8" stroke="currentColor" stroke-width="3"/>
      </svg>
    </div>

    <div v-if="busy" class="mt-1 h-[3px] w-full overflow-hidden rounded bg-gray-200">
      <div class="h-[3px] bg-blue-500 transition-[width]" :style="{ width: (hasProgress ? progress : 60) + '%' }" />
    </div>

    <p v-if="err" class="mt-1 truncate text-[11px] text-rose-600" role="alert">{{ err }}</p>
  </div>
</template>
