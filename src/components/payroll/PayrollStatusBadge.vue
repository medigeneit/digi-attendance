<script setup>
import { computed } from 'vue'

const props = defineProps({
  status: { type: String, default: '' },
  compact: { type: Boolean, default: false },
  alwaysShowLabel: { type: Boolean, default: false },
})

const info = computed(() => {
  const s = (props.status || '').toLowerCase()
  const map = {
    pending: {
      cls: 'bg-amber-50 text-amber-700 border-amber-200',
      icon: 'fa-hourglass-half',
      label: 'Pending',
      description: 'Awaiting action or processing',
    },
    paid: {
      cls: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      icon: 'fa-check-circle',
      label: 'Paid',
      description: 'Payment completed successfully',
    },
    unpaid: {
      cls: 'bg-red-50 text-red-700 border-red-200',
      icon: 'fa-exclamation-circle',
      label: 'Unpaid',
      description: 'Payment not yet received',
    },
    partial: {
      cls: 'bg-amber-50 text-amber-700 border-amber-200',
      icon: 'fa-percent',
      label: 'Partial',
      description: 'Partial payment received',
    },
    hold: {
      cls: 'bg-gray-100 text-gray-600 border-gray-300',
      icon: 'fa-pause-circle',
      label: 'Hold',
      description: 'Temporarily on hold',
    },
    cancelled: {
      cls: 'bg-red-50 text-red-700 border-red-200',
      icon: 'fa-circle-xmark',
      label: 'Cancelled',
      description: 'Cancelled and no longer active',
    },
    generated: {
      cls: 'bg-blue-50 text-blue-700 border-blue-200',
      icon: 'fa-file-alt',
      label: 'Generated',
      description: 'Document created',
    },
    draft: {
      cls: 'bg-slate-50 text-slate-700 border-slate-200',
      icon: 'fa-pen-fancy',
      label: 'Draft',
      description: 'Work in progress, not final',
    },
    reviewed: {
      cls: 'bg-purple-50 text-purple-700 border-purple-200',
      icon: 'fa-eye',
      label: 'Reviewed',
      description: 'Has been examined',
    },
    approved: {
      cls: 'bg-green-50 text-green-700 border-green-200',
      icon: 'fa-check-double',
      label: 'Approved',
      description: 'Officially accepted',
    },
    locked: {
      cls: 'bg-slate-900 text-white border-slate-900',
      icon: 'fa-lock',
      label: 'Locked',
      description: 'Cannot be modified',
    },
  }
  const match = map[s] || {
    cls: 'bg-slate-100 text-slate-600 border-slate-200',
    icon: 'fa-circle-info',
    label: props.status || 'Unknown',
    description: props.status || 'No status information',
  }
  
  return {
    ...match,
    ariaLabel: `${match.label}: ${match.description}`,
  }
})

const showLabel = computed(() => !props.compact || props.alwaysShowLabel)
</script>

<template>
  <span
    class="inline-flex items-center justify-center rounded-full text-xs font-medium border transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-opacity-50"
    :class="[
      info.cls,
      {
        'gap-1.5 px-2.5 py-0.5': showLabel,
        'h-6 w-6 shrink-0': compact && !showLabel,
        'h-6 px-2 py-0.5': compact && showLabel,
        'shadow-sm hover:shadow': !compact,
      }
    ]"
    :title="info.description"
    :aria-label="info.ariaLabel"
    role="status"
  >
    <i 
      :class="[
        `fas ${info.icon}`,
        {
          'text-[10px]': compact && !showLabel,
          'text-xs': !compact || showLabel,
        }
      ]"
      aria-hidden="true"
    ></i>
    <span v-if="showLabel" class="ml-1">{{ info.label }}</span>
    <span v-else class="sr-only">{{ info.label }}: {{ info.description }}</span>
  </span>
</template>

<style scoped>
span:active {
  transform: scale(0.96);
}
</style>