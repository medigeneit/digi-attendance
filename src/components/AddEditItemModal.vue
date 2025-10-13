<script setup>
import { ref, watch, computed, nextTick, onMounted, onBeforeUnmount } from 'vue'

const props = defineProps({
  open: { type: Boolean, default: false },
  mode: { type: String, default: 'add' }, // 'add' | 'edit'
  model: { type: Object, default: () => ({}) },
  nextOrder: { type: Number, default: 0 }
})
const emit = defineEmits(['close', 'submit'])

const statusOptions = [
  { value: 'BLOCKED',  label: 'Blocked' },
  { value: 'COMPLETED',label: 'Completed' },
]

/** ---- Form state ---- */
const form = ref({
  item_key: '',
  label: '',
  required: false,
  order_no: 0,
  status: 'BLOCKED',
})

/** ---- UX helpers ---- */
const errors = ref({})
const submitting = ref(false)
const autoKey = ref(true) // auto-generate item_key from label in "add" mode by default
const modalRef = ref(null)
const firstInputRef = ref(null)

/** ---- Utils ---- */
function slugKey(s) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 80)
}

/** ---- Populate/reset on open ---- */
watch(() => props.open, async (v) => {
  if (v) {
    if (props.mode === 'edit') {
      form.value = {
        item_key: props.model?.item_key ?? '',
        label: props.model?.label ?? '',
        required: !!props.model?.required,
        order_no: Number(props.model?.order_no ?? 0),
        status: props.model?.status ?? 'BLOCKED',
      }
      autoKey.value = false
    } else {
      form.value = {
        item_key: '',
        label: '',
        required: false,
        order_no: Number(props.nextOrder ?? 0),
        status: 'BLOCKED',
      }
      autoKey.value = true
    }
    errors.value = {}
    submitting.value = false
    await nextTick()
    firstInputRef.value?.focus()
  }
}, { immediate: true })

/** ---- Auto-generate item_key from label (only in add mode, when autoKey on) ---- */
watch(() => form.value.label, (v) => {
  if (props.mode === 'add' && autoKey.value) {
    form.value.item_key = slugKey(v)
  }
})

/** ---- Title ---- */
const title = computed(() => props.mode === 'edit' ? 'Edit Checklist Item' : 'Add Checklist Item')

/** ---- Validation ---- */
function validate() {
  const e = {}
  if (props.mode === 'add') {
    if (!form.value.item_key.trim()) e.item_key = 'Item key is required'
    if (form.value.item_key.length > 80) e.item_key = 'Max 80 characters'
    if (!/^[a-z0-9_]+$/.test(form.value.item_key)) e.item_key = 'Use lowercase letters, numbers, and underscores only'
  }

  if (!form.value.label.trim()) e.label = 'Label is required'

  if (form.value.order_no == null || isNaN(form.value.order_no) || form.value.order_no < 0) {
    e.order_no = 'Order must be 0 or a positive number'
  }
  
  if (!statusOptions.some(s => s.value === form.value.status)) {
    e.status = 'Invalid status'
  }
  errors.value = e
  return Object.keys(e).length === 0
}

/** ---- Close & keyboard handling ---- */
function close() { if (!submitting.value) emit('close') }

function onKeydown(e) {
  if (!props.open) return
  if (e.key === 'Escape') {
    e.stopPropagation()
    close()
  }
}
onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))

/** ---- Submit ---- */
async function submit() {
  if (!validate()) return
  submitting.value = true
  try {
    emit('submit', { ...form.value })
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <transition name="fade">
    <div
      v-if="open"
      class="fixed inset-0 z-50 flex items-start justify-center bg-black/40 backdrop-blur-sm p-4 md:items-center"
      @click.self="close"
      aria-modal="true"
      role="dialog"
      :aria-label="title"
    >
      <div
        ref="modalRef"
        class="w-full max-w-xl rounded-2xl bg-white shadow-2xl ring-1 ring-black/5 dark:bg-gray-900 dark:text-gray-100"
      >
        <!-- Header -->
        <div class="flex items-center justify-between gap-3 border-b border-gray-100 px-5 py-4 dark:border-gray-800">
          <h3 class="text-lg font-semibold tracking-tight">{{ title }}</h3>
          <button
            class="inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-300 dark:hover:bg-gray-800"
            @click="close"
            :disabled="submitting"
            title="Close"
          >✕</button>
        </div>

        <!-- Body -->
        <div class="px-5 py-4 space-y-4">
          <!-- Item Key (add only) -->
          <div v-if="props.mode==='add'">
            <div class="flex items-center justify-between">
              <label for="item_key" class="block text-sm font-medium">Item Key</label>
              <label class="flex items-center gap-2 text-xs text-gray-600">
                <input type="checkbox" v-model="autoKey" class="h-4 w-4" />
                Auto-generate from Label
              </label>
            </div>
            <input
              ref="firstInputRef"
              id="item_key"
              v-model.trim="form.item_key"
              :readonly="autoKey"
              maxlength="80"
              type="text"
              class="mt-1 w-full rounded-lg border px-3 py-2 outline-none transition
                     focus:ring-2 focus:ring-gray-900/20 disabled:opacity-60
                     dark:bg-gray-900 dark:border-gray-700"
              placeholder="e.g., nid_copy"
            />
            <div class="mt-1 flex items-start justify-between">
              <p class="text-xs text-gray-500">Lowercase, numbers, underscores (max 80 chars)</p>
              <p v-if="errors.item_key" class="text-xs text-rose-600">{{ errors.item_key }}</p>
            </div>
          </div>

          <!-- Label -->
          <div>
            <label for="label" class="block text-sm font-medium">Label</label>
            <input
              id="label"
              v-model.trim="form.label"
              type="text"
              class="mt-1 w-full rounded-lg border px-3 py-2 outline-none transition
                     focus:ring-2 focus:ring-gray-900/20 dark:bg-gray-900 dark:border-gray-700"
              placeholder="e.g., National ID Copy"
            />
            <p v-if="errors.label" class="mt-1 text-xs text-rose-600">{{ errors.label }}</p>
          </div>

          <!-- Required + Order -->
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div class="flex h-full items-end">
              <label class="inline-flex items-center gap-2">
                <input v-model="form.required" type="checkbox" class="h-4 w-4" />
                <span class="text-sm">Required</span>
              </label>
            </div>

            <div>
              <label for="order_no" class="block text-sm font-medium">Order</label>
              <input
                id="order_no"
                v-model.number="form.order_no"
                type="number"
                min="0"
                class="mt-1 w-full rounded-lg border px-3 py-2 outline-none transition
                       focus:ring-2 focus:ring-gray-900/20 dark:bg-gray-900 dark:border-gray-700"
                placeholder="0"
              />
              <p v-if="errors.order_no" class="mt-1 text-xs text-rose-600">{{ errors.order_no }}</p>
            </div>
          </div>

          <!-- Status -->
          <div>
            <label class="block text-sm font-medium mb-1">Status</label>
            <div class="flex flex-wrap gap-2">
              <label
                v-for="opt in statusOptions"
                :key="opt.value"
                class="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm cursor-pointer
                       transition hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
                :class="form.status === opt.value ? 'ring-2 ring-gray-900/20' : ''"
              >
                <input
                  v-model="form.status"
                  type="radio"
                  :value="opt.value"
                  class="h-4 w-4"
                />
                <span class="inline-flex items-center gap-1">
                  <span
                    class="inline-block h-2.5 w-2.5 rounded-full"
                    :class="{
                      'bg-amber-500': opt.value==='BLOCKED',
                      'bg-emerald-500': opt.value==='COMPLETED'
                    }"
                  />
                  {{ opt.label }}
                </span>
              </label>
            </div>
            <p v-if="errors.status" class="mt-1 text-xs text-rose-600">{{ errors.status }}</p>
          </div>
        </div>

        <!-- Footer -->
        <div class="flex items-center justify-end gap-2 border-t border-gray-100 px-5 py-4 dark:border-gray-800">
          <button
            class="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300 dark:border-gray-700 dark:hover:bg-gray-800"
            @click="close"
            :disabled="submitting"
          >
            Cancel
          </button>
          <button
            class="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-3 py-2 text-sm text-white transition hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-300 disabled:opacity-60"
            @click="submit"
            :disabled="submitting"
          >
            <svg v-if="submitting" class="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" opacity="0.25"/>
              <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>
            </svg>
            {{ props.mode==='edit' ? 'Update' : 'Create' }}
          </button>
        </div>
      </div>
    </div>
  </transition>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity .15s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
