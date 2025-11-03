<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  user: { type: Object, required: true },
  saving: { type: Boolean, default: false },
  value: { type: String, required: true },
  onConfirmChange: { type: Function, required: true },
})

const EMP_TYPES = [
  { value: 'probationary', label: 'Probationary' },
  { value: 'permanent', label: 'Permanent' },
  { value: 'contract', label: 'Contract' },
]
const typeLabel = (v) => EMP_TYPES.find(x => x.value === v)?.label || '—'
const typeBadgeClass = (v) => {
  if (v === 'probationary') return 'bg-amber-50 text-amber-700 ring-amber-200'
  if (v === 'permanent')    return 'bg-green-50 text-green-700 ring-green-200'
  if (v === 'contract')     return 'bg-blue-50 text-blue-700 ring-blue-200'
  return 'bg-gray-50 text-gray-700 ring-gray-200'
}

/* ---------- confirm modal ---------- */
const open = ref(false)
const pendingValue = ref('')
const currentLabel = computed(() => typeLabel(props.value))
const nextLabel = computed(() => typeLabel(pendingValue.value))

function requestChange(e) {
  const next = e.target.value
  if (next === props.value) return
  pendingValue.value = next
  open.value = true
}

async function confirmChange() {
  const v = pendingValue.value
  open.value = false
  if (!v) return
  await props.onConfirmChange(v)
  pendingValue.value = ''
}
function cancelChange() {
  open.value = false
  pendingValue.value = ''
}
</script>

<template>
  <div class="flex items-center gap-2">
    <span class="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] ring-1" :class="typeBadgeClass(value)">
      {{ typeLabel(value) }}
    </span>

    <div class="relative">
      <select
        :disabled="saving"
        :value="value"
        class="rounded-md border bg-white px-2 py-1 text-[11px] outline-none disabled:opacity-50"
        @change="requestChange"
        aria-label="Change employment type"
      >
        <option v-for="t in EMP_TYPES" :key="t.value" :value="t.value">
          {{ t.label }}
        </option>
      </select>

      <svg v-if="saving" class="absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 animate-spin text-gray-400" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" fill="none"/>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v3A5 5 0 007 12H4z"/>
      </svg>
    </div>

    <!-- Simple Tailwind modal -->
    <div v-if="open" class="fixed inset-0 z-50 flex items-center justify-center">
      <div class="absolute inset-0 bg-black/40"></div>
      <div class="relative z-10 w-[92vw] max-w-sm rounded-xl bg-white p-4 shadow-xl">
        <h3 class="text-sm font-semibold">Confirm status change</h3>
        <p class="mt-2 text-[13px] text-gray-600">
          Change <span class="font-medium">{{ currentLabel }}</span> ➜
          <span class="font-medium">{{ nextLabel }}</span> for
          <span class="font-medium">{{ user?.name || user?.full_name || user?.email }}</span>?
        </p>
        <div class="mt-4 flex items-center justify-end gap-2">
          <button class="px-3 py-1.5 rounded-md text-[12px] border" @click="cancelChange">Cancel</button>
          <button class="px-3 py-1.5 rounded-md text-[12px] bg-gray-900 text-white hover:bg-black" @click="confirmChange">
            Confirm
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
