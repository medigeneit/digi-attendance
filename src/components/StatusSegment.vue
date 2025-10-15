<script setup>
import { ref, watch, computed } from 'vue'

defineOptions({ name: 'StatusSegment' })

const props = defineProps({
  modelValue: { type: String, default: '' }, // 'PENDING' | 'WORKING' | 'COMPLETED'
  disabled:   { type: Boolean, default: false },
})
const emit = defineEmits(['update:modelValue', 'change'])

/* ---------- Normalize + local state (for instant active UI) ---------- */
const normalize = (v) => (v ?? '').toString().trim().toUpperCase()
const current = ref(normalize(props.modelValue))

watch(() => props.modelValue, (v) => {
  const nv = normalize(v)
  if (nv !== current.value) current.value = nv
})

/* ---------- Options + helpers ---------- */
const OPTIONS = [
  { value: 'PENDING',   label: 'Pending' },
  { value: 'WORKING',   label: 'Working' },
  { value: 'COMPLETED', label: 'Completed' },
]

const isActive = (v) => current.value === v

function set(v) {
  if (props.disabled) return
  const nv = normalize(v)
  current.value = nv                      // instant visual update
  emit('update:modelValue', nv)           // notify parent
  emit('change', nv)
}

function onKeydown(e) {
  if (props.disabled) return
  const idx = Math.max(0, OPTIONS.findIndex(o => o.value === current.value))
  if (['ArrowRight','ArrowDown'].includes(e.key)) {
    e.preventDefault()
    set(OPTIONS[(idx + 1) % OPTIONS.length].value)
  } else if (['ArrowLeft','ArrowUp'].includes(e.key)) {
    e.preventDefault()
    set(OPTIONS[(idx - 1 + OPTIONS.length) % OPTIONS.length].value)
  }
}

const baseBtn =
  'inline-flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-xs font-medium transition ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/40 select-none'

function classes(v) {
  const active = isActive(v)
  const palette = active
    ? {
        PENDING:   'bg-amber-600 text-white border-amber-600',
        WORKING:   'bg-sky-600 text-white border-sky-600',
        COMPLETED: 'bg-emerald-600 text-white border-emerald-600',
      }[v] || 'bg-gray-800 text-white border-gray-800'
    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
  const state = props.disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
  return `${baseBtn} ${palette} ${state}`
}

const groupClass = computed(() =>
  `inline-flex items-center gap-1 bg-white rounded-lg p-1 border ${props.disabled ? 'opacity-75' : ''}`
)
</script>

<template>
  <div
    :class="groupClass"
    role="radiogroup"
    :aria-disabled="disabled ? 'true' : 'false'"
    @keydown="onKeydown"
  >
    <button
      v-for="o in OPTIONS"
      :key="o.value"
      type="button"
      :class="classes(o.value)"
      :aria-checked="isActive(o.value) ? 'true' : 'false'"
      role="radio"
      @click="set(o.value)"
    >
      <!-- dot -->
      <span
        class="h-1.5 w-1.5 rounded-full"
        :class="{
          'bg-amber-200':   o.value==='PENDING'   && !isActive(o.value),
          'bg-sky-200':     o.value==='WORKING'   && !isActive(o.value),
          'bg-emerald-200': o.value==='COMPLETED' && !isActive(o.value),
          'bg-white':       isActive(o.value),
        }"
      />
      {{ o.label }}
    </button>
  </div>
</template>
