<script setup>
import { computed } from 'vue'

const props = defineProps({
  status: { type: String, default: '' },
})

const info = computed(() => {
  const s = (props.status || '').toLowerCase()
  const map = {
    pending: {
      cls: 'bg-amber-50 text-amber-700 border-amber-200',
      icon: 'fa-clock',
      label: 'Pending',
      iconOnly: true,
    },
    paid: {
      cls: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      icon: 'fa-money-bill-wave',
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
      cls: 'bg-red-50 text-red-700 border-red-200',
      icon: 'fa-ban',
      label: 'Cancelled',
    },
    generated: {
      cls: 'bg-blue-50 text-blue-700 border-blue-200',
      icon: 'fa-file-invoice',
      label: 'Generated',
    },
    draft: {
      cls: 'bg-slate-50 text-slate-700 border-slate-200',
      icon: 'fa-pencil-alt',
      label: 'Draft',
    },
    reviewed: {
      cls: 'bg-purple-50 text-purple-700 border-purple-200',
      icon: 'fa-search',
      label: 'Reviewed',
    },
    approved: {
      cls: 'bg-green-50 text-green-700 border-green-200',
      icon: 'fa-thumbs-up',
      label: 'Approved',
    },
    locked: {
      cls: 'bg-slate-900 text-white border-slate-900',
      icon: 'fa-lock',
      label: 'Locked',
    },
  }
  return (
    map[s] || {
      cls: 'bg-slate-100 text-slate-600 border-slate-200',
      icon: 'fa-circle',
      label: props.status || '—',
      iconOnly: false,
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
    <span v-if="!info.iconOnly">{{ info.label }}</span>
  </span>
</template>
