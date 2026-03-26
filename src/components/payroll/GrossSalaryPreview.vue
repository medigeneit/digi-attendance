<script setup>
import { computed } from 'vue'
import { formatCurrency } from '@/utils/currency'

const props = defineProps({
  gross: { type: Number, default: 0 },
  label: { type: String, default: 'Computed Gross Salary' },
})
</script>

<template>
  <div
    class="flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl px-5 py-4"
  >
    <div class="flex items-center gap-3">
      <div class="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
        <i class="fas fa-calculator text-blue-600"></i>
      </div>
      <div>
        <p class="text-xs text-blue-600 font-medium uppercase tracking-wide">{{ label }}</p>
        <p class="text-xs text-blue-400 mt-0.5">Auto-calculated from salary components above</p>
      </div>
    </div>
    <div class="text-2xl font-bold text-blue-800 font-mono">
      {{ formatCurrency(gross) }}
    </div>
  </div>
</template>
