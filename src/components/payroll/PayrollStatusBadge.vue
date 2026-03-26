<script setup>
import { computed } from 'vue'

const props = defineProps({
  status: { type: String, default: '' },
})

const info = computed(() => {
  const s = (props.status || '').toLowerCase()
  const map = {
    paid: {
      cls: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      icon: 'fa-check-circle',
      label: 'Paid',
    },
    unpaid: {
      cls: 'bg-red-50 text-red-700 border-red-200',
      icon: 'fa-times-circle',
      label: 'Unpaid',
    },
    partial: {
      cls: 'bg-amber-50 text-amber-700 border-amber-200',
      icon: 'fa-adjust',
      label: 'Partial',
    },
    hold: {
      cls: 'bg-gray-100 text-gray-600 border-gray-300',
      icon: 'fa-pause-circle',
      label: 'Hold',
    },
    cancelled: {
      cls: 'bg-rose-50 text-rose-700 border-rose-200',
      icon: 'fa-ban',
      label: 'Cancelled',
    },
    generated: {
      cls: 'bg-blue-50 text-blue-700 border-blue-200',
      icon: 'fa-file-invoice',
      label: 'Generated',
    },
  }
  return (
    map[s] || {
      cls: 'bg-slate-100 text-slate-600 border-slate-200',
      icon: 'fa-circle',
      label: props.status || '—',
    }
  )
})
</script>

<template>
  <span
    class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border"
    :class="info.cls"
  >
    <i :class="`fas ${info.icon} text-[10px]`"></i>
    {{ info.label }}
  </span>
</template>
