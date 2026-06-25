<script setup>
import { computed } from 'vue'

const props = defineProps({
  status: { type: String, default: '' },
  compact: { type: Boolean, default: false },
  alwaysShowLabel: { type: Boolean, default: false },
  noIcon: { type: Boolean, default: false },
})

const info = computed(() => {
  const s = (props.status || '').toLowerCase()
  const map = {
    pending:   { cls: 'bg-amber-50 text-amber-700 border-amber-200',       label: 'Pending',    description: 'Awaiting action or processing' },
    paid:      { cls: 'bg-emerald-100 text-emerald-800 border-emerald-300', label: 'Paid',       description: 'Payment completed successfully' },
    unpaid:    { cls: 'bg-red-50 text-red-700 border-red-200',             label: 'Unpaid',     description: 'Payment not yet received' },
    partial:   { cls: 'bg-amber-50 text-amber-700 border-amber-200',       label: 'Partial',    description: 'Partial payment received' },
    hold:      { cls: 'bg-gray-100 text-gray-600 border-gray-300',         label: 'Hold',       description: 'Temporarily on hold' },
    cancelled: { cls: 'bg-red-50 text-red-700 border-red-200',             label: 'Cancelled',  description: 'Cancelled and no longer active' },
    generated: { cls: 'bg-blue-50 text-blue-700 border-blue-200',          label: 'Generated',  description: 'Document created' },
    draft:     { cls: 'bg-slate-50 text-slate-700 border-slate-200',       label: 'Draft',      description: 'Work in progress, not final' },
    reviewed:  { cls: 'bg-purple-50 text-purple-700 border-purple-200',    label: 'Reviewed',   description: 'Has been examined' },
    approved:  { cls: 'bg-green-50 text-green-700 border-green-200',       label: 'Approved',   description: 'Officially accepted' },
    locked:    { cls: 'bg-slate-800 text-white border-slate-800',           label: 'Locked',     description: 'Cannot be modified' },
  }
  const match = map[s] || {
    cls: 'bg-slate-100 text-slate-600 border-slate-200',
    label: props.status || 'Unknown',
    description: props.status || 'No status information',
  }
  return { ...match, ariaLabel: `${match.label}: ${match.description}` }
})

const showLabel = computed(() => !props.compact || props.alwaysShowLabel)
</script>

<template>
  <span
    class="inline-flex items-center justify-center rounded-full border text-xs font-semibold transition-all duration-150"
    :class="[
      info.cls,
      compact && !showLabel ? 'h-5 w-5 shrink-0' : 'px-2.5 py-0.5',
    ]"
    :title="info.description"
    :aria-label="info.ariaLabel"
    role="status"
  >
    <span v-if="showLabel">{{ info.label }}</span>
    <span v-else class="sr-only">{{ info.label }}</span>
  </span>
</template>

<style scoped>
span:active {
  transform: scale(0.96);
}
</style>
