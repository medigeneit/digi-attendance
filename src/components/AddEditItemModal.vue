<script setup>
import { ref, watch, computed, nextTick, onMounted, onBeforeUnmount } from 'vue'

/* ---------- Props & Emits ---------- */
const props = defineProps({
  open: { type: Boolean, default: false },
  mode: { type: String, default: 'add' }, // 'add' | 'edit'
  model: { type: Object, default: () => ({}) },
  nextOrder: { type: Number, default: 0 },
})
const emit = defineEmits(['close', 'submit'])

/* ---------- Options ---------- */
const statusOptions = [
  { value: 'BLOCKED',   label: 'Blocked' },
  { value: 'COMPLETED', label: 'Completed' },
]
const handoverOptions = [
  { value: 'departmental_incharge',  label: 'Departmental In-charge',  icon: 'building' },
  { value: 'technical_support_team', label: 'Technical Support Team',  icon: 'wrench' },
  { value: 'it_incharge',            label: 'IT In-charge',            icon: 'chip' },
  { value: 'hr_department',          label: 'HR Department',           icon: 'users' },
]

/* ---------- State ---------- */
const form = ref({
  item_key: '',
  label: '',
  required: false,
  order_no: 0,
  status: 'BLOCKED',
  handover_to: 'departmental_incharge',
})
const errors = ref({})
const submitting = ref(false)
const autoKey = ref(true) // "add" mode only by default
const firstInputRef = ref(null)
const errorSummaryRef = ref(null)

/* ---------- Utils ---------- */
const maxKeyLen = 80
function slugKey(s) {
  return (s ?? '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, maxKeyLen)
}
const title = computed(() => props.mode === 'edit' ? 'Edit Checklist Item' : 'Add Checklist Item')
const isEdit = computed(() => props.mode === 'edit')
const submitDisabled = computed(() => submitting.value)

/* ---------- Populate on open ---------- */
watch(() => props.open, async (v) => {
  if (!v) return
  if (isEdit.value) {
    form.value = {
      item_key: props.model?.item_key ?? '',
      label: props.model?.label ?? '',
      required: !!props.model?.required,
      order_no: Number(props.model?.order_no ?? 0),
      status: props.model?.status ?? 'BLOCKED',
      handover_to: props.model?.handover_to ?? 'departmental_incharge',
    }
    autoKey.value = false
  } else {
    form.value = {
      item_key: '',
      label: '',
      required: false,
      order_no: Number(props.nextOrder ?? 0),
      status: 'BLOCKED',
      handover_to: 'departmental_incharge',
    }
    autoKey.value = true
  }
  errors.value = {}
  submitting.value = false
  await nextTick()
  firstInputRef.value?.focus()
}, { immediate: true })

/* ---------- Auto-generate key ---------- */
watch(() => form.value.label, (v) => {
  if (!isEdit.value && autoKey.value) {
    form.value.item_key = slugKey(v)
  }
})

/* ---------- Validation ---------- */
function validate() {
  const e = {}

  if (!isEdit.value) {
    if (!form.value.item_key.trim()) e.item_key = 'Item key is required'
    else if (form.value.item_key.length > maxKeyLen) e.item_key = `Max ${maxKeyLen} characters`
    else if (!/^[a-z0-9_]+$/.test(form.value.item_key)) e.item_key = 'Use lowercase letters, numbers, underscores only'
  }

  if (!form.value.label.trim()) e.label = 'Label is required'

  if (form.value.order_no == null || isNaN(form.value.order_no) || form.value.order_no < 0) {
    e.order_no = 'Order must be 0 or a positive number'
  }

  if (!statusOptions.some(s => s.value === form.value.status)) {
    e.status = 'Invalid status'
  }

  if (!handoverOptions.some(h => h.value === form.value.handover_to)) {
    e.handover_to = 'Select a valid handover target'
  }

  errors.value = e
  return Object.keys(e).length === 0
}

/* ---------- Keyboard / Close ---------- */
function close() { if (!submitting.value) emit('close') }

function onKeydown(e) {
  if (!props.open) return
  if (e.key === 'Escape') {
    e.stopPropagation()
    close()
  }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'enter') {
    e.preventDefault()
    submit()
  }
}
onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))

/* ---------- Submit ---------- */
async function submit() {
  if (!validate()) {
    await nextTick()
    // focus first error
    const firstKey = Object.keys(errors.value)[0]
    if (firstKey) {
      const el = document.querySelector(`[data-field="${firstKey}"]`)
      el?.focus?.()
      errorSummaryRef.value?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
    return
  }
  submitting.value = true
  try {
    emit('submit', { ...form.value })
  } finally {
    submitting.value = false
  }
}

/* ---------- Icons (inline SVG) ---------- */
function Icon({ name }) {
  // minimal inline icons for pills
  switch (name) {
    case 'building': return `
      <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.8">
        <path d="M3 21h18M6 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16M9 8h6M9 12h6M9 16h6"/>
      </svg>`
    case 'wrench': return `
      <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.8">
        <path d="M14.7 6.3a4 4 0 1 0-5.66 5.66l7.07 7.07a2 2 0 0 0 2.83-2.83L11.87 9.13"/>
      </svg>`
    case 'chip': return `
      <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.8">
        <rect x="7" y="7" width="10" height="10" rx="2"/>
        <path d="M7 2v3M12 2v3M17 2v3M7 19v3M12 19v3M17 19v3M2 7h3M2 12h3M2 17h3M19 7h3M19 12h3M19 17h3"/>
      </svg>`
    case 'users': return `
      <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.8">
        <path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="3"/>
        <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a3 3 0 0 1 0 5.74"/>
      </svg>`
    default: return ''
  }
}
</script>

<template>
  <transition
    enter-active-class="transition ease-out duration-150"
    enter-from-class="opacity-0"
    enter-to-class="opacity-100"
    leave-active-class="transition ease-in duration-100"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
  >
    <div
      v-if="open"
      class="fixed inset-0 top-10 z-50 flex items-start md:items-center justify-center bg-black/40 backdrop-blur-[2px] p-4 "
      @click.self="close"
      aria-modal="true"
      role="dialog"
      :aria-label="title"
    >
      <div
        class="w-full max-w-2xl rounded-2xl bg-white shadow-2xl ring-1 ring-black/5 dark:bg-gray-900 dark:text-gray-100
               transform transition-all duration-150 ease-out scale-100"
      >
        <!-- Header (sticky) -->
        <div class="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-gray-100 px-5 py-4 bg-white/80 backdrop-blur dark:border-gray-800 dark:bg-gray-900/80">
          <div>
            <h3 class="text-lg font-semibold tracking-tight">{{ title }}</h3>
            <p class="text-xs text-gray-500">Create structured, grouped checklist items for smoother handover.</p>
          </div>
          <button
            class="inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-300 dark:hover:bg-gray-800"
            @click="close"
            title="Close (Esc)"
          >✕</button>
        </div>

        <!-- Error Summary -->
        <div v-if="Object.keys(errors).length" ref="errorSummaryRef" class="mx-5 mt-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700 text-sm dark:bg-rose-950/30 dark:border-rose-900">
          Please fix the highlighted fields.
        </div>

        <!-- Body -->
        <div class="px-5 py-4 space-y-6">
          <!-- Section: Basics -->
          <div class="rounded-xl border border-gray-100 dark:border-gray-800">
            <div class="border-b px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 dark:border-gray-800">Basics</div>
            <div class="p-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <!-- Item Key (add only) -->
              <div v-if="!isEdit">
                <div class="flex items-center justify-between">
                  <label for="item_key" class="block text-sm font-medium">Item Key</label>
                  <label class="flex items-center gap-2 text-xs text-gray-600">
                    <input type="checkbox" v-model="autoKey" class="h-4 w-4" />
                    Auto from Label
                  </label>
                </div>
                <div class="relative">
                  <input
                    ref="firstInputRef"
                    id="item_key"
                    v-model.trim="form.item_key"
                    :readonly="autoKey"
                    maxlength="80"
                    type="text"
                    data-field="item_key"
                    class="mt-1 w-full rounded-lg border px-3 py-2 outline-none transition
                           focus:ring-2 focus:ring-gray-900/20 disabled:opacity-60
                           dark:bg-gray-900 dark:border-gray-700"
                    placeholder="e.g., nid_copy"
                    aria-invalid="true"
                  />
                  <div class="pointer-events-none absolute right-2 top-2 text-[11px] text-gray-400">{{ form.item_key.length }}/{{ maxKeyLen }}</div>
                </div>
                <div class="mt-1 flex items-start justify-between">
                  <p class="text-xs text-gray-500">Lowercase, numbers, underscores. Preview: <code class="text-gray-800 dark:text-gray-200">checklist.{{ form.item_key || '...' }}</code></p>
                  <p v-if="errors.item_key" class="text-xs text-rose-600">{{ errors.item_key }}</p>
                </div>
              </div>

              <!-- Label -->
              <div :class="isEdit ? 'sm:col-span-2' : ''">
                <label for="label" class="block text-sm font-medium">Label</label>
                <input
                  id="label"
                  v-model.trim="form.label"
                  type="text"
                  data-field="label"
                  class="mt-1 w-full rounded-lg border px-3 py-2 outline-none transition
                         focus:ring-2 focus:ring-gray-900/20 dark:bg-gray-900 dark:border-gray-700"
                  placeholder="e.g., National ID Copy"
                />
                <p v-if="errors.label" class="mt-1 text-xs text-rose-600">{{ errors.label }}</p>
              </div>
            </div>
          </div>

          <!-- Section: Handover target -->
          <div class="rounded-xl border border-gray-100 dark:border-gray-800">
            <div class="border-b px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 dark:border-gray-800">Handover To</div>
            <div class="p-4">
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <label
                  v-for="opt in handoverOptions"
                  :key="opt.value"
                  class="group inline-flex items-center justify-between gap-3 rounded-xl border px-3 py-2 text-sm cursor-pointer
                         transition hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
                  :class="form.handover_to === opt.value ? 'ring-2 ring-gray-900/20 bg-gray-50 dark:bg-gray-800' : ''"
                >
                  <div class="flex items-center gap-2">
                    <span class="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-gray-100 text-gray-700 group-hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200" v-html="Icon({ name: opt.icon })"></span>
                    <span>{{ opt.label }}</span>
                  </div>
                  <input v-model="form.handover_to" type="radio" :value="opt.value" class="h-4 w-4" data-field="handover_to" />
                </label>
              </div>
              <p v-if="errors.handover_to" class="mt-2 text-xs text-rose-600">{{ errors.handover_to }}</p>
            </div>
          </div>

          <!-- Section: Display & Order -->
          <div class="rounded-xl border border-gray-100 dark:border-gray-800">
            <div class="border-b px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 dark:border-gray-800">Display & Order</div>
            <div class="p-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div class="flex h-full items-end">
                <label class="inline-flex items-center gap-2">
                  <input v-model="form.required" type="checkbox" class="h-4 w-4" data-field="required" />
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
                  data-field="order_no"
                  class="mt-1 w-full rounded-lg border px-3 py-2 outline-none transition
                         focus:ring-2 focus:ring-gray-900/20 dark:bg-gray-900 dark:border-gray-700"
                  placeholder="0"
                />
                <p v-if="errors.order_no" class="mt-1 text-xs text-rose-600">{{ errors.order_no }}</p>
              </div>
            </div>
          </div>

          <!-- Section: Status -->
          <div class="rounded-xl border border-gray-100 dark:border-gray-800">
            <div class="border-b px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 dark:border-gray-800">Status</div>
            <div class="p-4">
              <div class="flex flex-wrap gap-2">
                <label
                  v-for="opt in statusOptions"
                  :key="opt.value"
                  class="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm cursor-pointer
                         transition hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
                  :class="form.status === opt.value ? 'ring-2 ring-gray-900/20' : ''"
                >
                  <input v-model="form.status" type="radio" :value="opt.value" class="h-4 w-4" data-field="status" />
                  <span class="inline-flex items-center gap-1">
                    <span
                      class="inline-block h-2.5 w-2.5 rounded-full"
                      :class="{ 'bg-amber-500': opt.value==='BLOCKED', 'bg-emerald-500': opt.value==='COMPLETED' }"
                    />
                    {{ opt.label }}
                  </span>
                </label>
              </div>
              <p v-if="errors.status" class="mt-2 text-xs text-rose-600">{{ errors.status }}</p>
            </div>
          </div>
        </div>

        <!-- Footer (sticky) -->
        <div class="sticky bottom-0 flex items-center justify-end gap-2 border-t border-gray-100 px-5 py-4 bg-white/80 backdrop-blur dark:border-gray-800 dark:bg-gray-900/80">
          <button
            class="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300 dark:border-gray-700 dark:hover:bg-gray-800"
            @click="close"
            :disabled="submitDisabled"
          >
            Cancel
          </button>
          <button
            class="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-3 py-2 text-sm text-white transition hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-300 disabled:opacity-60"
            @click="submit"
            :disabled="submitDisabled"
            title="Submit (Ctrl+Enter)"
          >
            <svg v-if="submitting" class="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" opacity="0.25"/>
              <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>
            </svg>
            {{ isEdit ? 'Update' : 'Create' }}
          </button>
        </div>
      </div>
    </div>
  </transition>
</template>

<style scoped>
/* subtle scale on appear (already have opacity transition on wrapper) */
</style>
