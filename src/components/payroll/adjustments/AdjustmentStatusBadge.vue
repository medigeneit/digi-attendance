<script setup>
import { computed } from 'vue'

const props = defineProps({
  status: { type: String, default: '' },
})

const info = computed(() => {
  const status = String(props.status || '').toLowerCase()
  const map = {
    pending: { cls: 'bg-amber-50 text-amber-700 border-amber-200', label: 'Pending' },
    verified: { cls: 'bg-blue-50 text-blue-700 border-blue-200', label: 'Verified' },
    approved: { cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', label: 'Approved' },
    rejected: { cls: 'bg-rose-50 text-rose-700 border-rose-200', label: 'Rejected' },
    carried: { cls: 'bg-slate-100 text-slate-600 border-slate-200', label: 'Carried' },
  }

  return map[status] || { cls: 'bg-slate-100 text-slate-600 border-slate-200', label: props.status || 'Unknown' }
})
</script>

<template>
  <span class="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold" :class="info.cls">
    {{ info.label }}
  </span>
</template>
