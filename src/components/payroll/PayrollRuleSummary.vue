<script setup>
import { computed } from 'vue'

const props = defineProps({
  mode: { type: String, default: 'regular' },
})

const summary = computed(() => {
  const map = {
    regular: {
      tone: 'border-blue-200 bg-blue-50 text-blue-800',
      icon: 'fa-info-circle',
      text: 'This will generate the standard monthly payroll. Existing monthly rules will apply.',
    },
    half_salary_advance: {
      tone: 'border-amber-200 bg-amber-50 text-amber-800',
      icon: 'fa-exclamation-triangle',
      text: 'This pays part of salary in advance without deductions. Bonus can be included, but only the salary advance part will be adjusted from the regular month-end payroll.',
    },
    final_settlement: {
      tone: 'border-orange-200 bg-orange-50 text-orange-800',
      icon: 'fa-exclamation-circle',
      text: 'This is a prorated settlement payroll. Deductions will be applied.',
    },
    bonus_only: {
      tone: 'border-orange-200 bg-orange-50 text-orange-800',
      icon: 'fa-gift',
      text: 'This payroll will generate bonus only. Salary and deductions will not be included.',
    },
  }
  return map[props.mode] || map.regular
})
</script>

<template>
  <div class="flex gap-2 rounded-2xl border p-4 text-sm" :class="summary.tone">
    <i class="far mt-0.5 flex-shrink-0" :class="summary.icon"></i>
    <span>{{ summary.text }}</span>
  </div>
</template>
