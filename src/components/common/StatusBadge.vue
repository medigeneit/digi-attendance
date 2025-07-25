<script setup>
import { computed } from 'vue'

const props = defineProps({
  status: {
    type: String,
    required: true,
  },
  isApproved: {
    type: Boolean,
    default: false,
  },
})

const baseClasses =
  'flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-all'

const normalized = props.status?.toLowerCase() ?? ''
const approvalApplicable = ['eid', 'sl', 'cl', 'ml', 'wpl', 'weekend']

const badgeInfo = computed(() => {
  switch (normalized) {
    case 'present':
      return {
        iconClass: 'fas fa-check-circle',
        label: 'Present',
        classes: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      }
    case 'absent':
      return {
        iconClass: 'fas fa-times-circle',
        label: 'Absent',
        classes: 'bg-red-50 text-red-700 border-red-200',
      }
    case 'weekend':
      return {
        iconClass: 'fas fa-calendar-alt',
        label: 'Weekend',
        classes: 'bg-purple-50 text-purple-700 border-purple-200',
      }
    case 'eid':
      return {
        iconClass: 'fas fa-coffee',
        label: 'EID',
        classes: 'bg-amber-50 text-amber-700 border-amber-200',
      }
    case 'sl':
      return {
        iconClass: 'fas fa-exclamation-circle',
        label: 'Special Leave',
        classes: 'bg-blue-50 text-blue-700 border-blue-200',
      }
    case 'cl':
      return {
        iconClass: 'fas fa-plane-departure',
        label: 'Casual Leave',
        classes: 'bg-cyan-50 text-cyan-700 border-cyan-200',
      }
    case 'ml':
      return {
        iconClass: 'fas fa-baby',
        label: 'Medical Leave',
        classes: 'bg-pink-50 text-pink-700 border-pink-200',
      }
    case 'wpl':
      return {
        iconClass: 'fas fa-user-slash',
        label: 'Without Pay Leave',
        classes: 'bg-yellow-50 text-yellow-700 border-yellow-200',
      }
    default:
      if (normalized.startsWith('holiday')) {
        return {
          iconClass: 'fas fa-umbrella-beach',
          label: props.status,
          classes: 'bg-lime-50 text-lime-700 border-lime-200',
        }
      }

      return {
        iconClass: 'fas fa-question-circle',
        label: props.status,
        classes: 'bg-gray-50 text-gray-700 border-gray-200',
      }
  }
})
</script>

<template>
  <div class="flex items-center gap-2">
    <!-- Main status badge -->
    <div :class="[baseClasses, badgeInfo.classes]">
      <i :class="[badgeInfo.iconClass, 'h-3 w-3']"></i>
      {{ status }}
    </div>

    <!-- Optional Approved label -->
    <!-- <div
      v-if="isApproved && approvalApplicable.includes(normalized)"
      class="flex items-center gap-1 text-xs text-blue-600"
    >
      <i class="fas fa-check-circle h-3 w-3"></i>
      Approved
    </div> -->
  </div>
</template>
