<script setup>
defineProps({
  modelValue: { type: String, default: 'regular' },
  cycles: { type: Array, default: () => [] },
  label: { type: String, default: 'Payroll Mode' },
  required: { type: Boolean, default: false },
})

const emit = defineEmits(['update:modelValue'])

const fallbackCycles = [
  { value: 'regular', label: 'Regular Monthly Payroll' },
  { value: 'half_salary_advance', label: 'Half Salary Advance' },
  { value: 'final_settlement', label: 'Final Settlement' },
  { value: 'bonus_only', label: 'Bonus Only' },
]
</script>

<template>
  <div>
    <label class="mb-1 block text-sm font-medium text-slate-700">
      {{ label }} <span v-if="required" class="text-red-500">*</span>
    </label>
    <select
      :value="modelValue"
      class="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 shadow-sm transition focus:border-blue-400 focus:outline-none focus:ring-4 focus:ring-blue-100"
      @change="emit('update:modelValue', $event.target.value)"
    >
      <option
        v-for="cycle in cycles.length ? cycles : fallbackCycles"
        :key="cycle.value"
        :value="cycle.value"
      >
        {{ cycle.label }}
      </option>
    </select>
  </div>
</template>
