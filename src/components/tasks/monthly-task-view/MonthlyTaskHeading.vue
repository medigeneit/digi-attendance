<script setup lang="ts">
import { getYearMonthFormat } from '@/libs/datetime'

const props = defineProps({
  selectedMonth: {
    type: String,
    required: true,
  },
  loading: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['reloadClick', 'dayWiseButtonClick', 'change'])

function handleClickCurrentMonth() {
  const today = new Date()
  emit('change', getYearMonthFormat(today))
}

function handleClickOnNextMonth() {
  const [year, month] = props.selectedMonth?.split('-').map(Number)
  const date = new Date(year, month, 1)
  date.setMonth(date.getMonth())
  emit('change', getYearMonthFormat(date))
}

function handleClickOnPreviousMonth() {
  const [year, month] = props.selectedMonth?.split('-').map(Number)
  const date = new Date(year, month, 1)
  date.setMonth(date.getMonth() - 2)
  emit('change', getYearMonthFormat(date))
}
</script>

<template>
  <div class="px-4 py-2 flex items-center bg-gray-50 group">
    <h2 class="leading-none font-semibold text-lg">Monthly Task</h2>

    <button class="btn-3 mx-4 h-7" @click.prevent="emit('dayWiseButtonClick')">Day Wise</button>

    <button class="btn-3 mx-4 h-7" @click.prevent="handleClickCurrentMonth">Current Month</button>

    <button
      class="btn-3 px-2 py-2 mx-4 size-7 disabled:text-gray-300 disabled:border-gray-300"
      :class="{ 'animate-spin text-gray-300 border-gray-300 !bg-opacity-0': loading }"
      @click.prevent="emit('reloadClick')"
      :disabled="loading"
    >
      <i class="fas fa-redo-alt"></i>
    </button>

    <div class="ml-4 md:ml-auto flex items-center gap-2">
      <button class="btn-2 h-7" @click.prevent="handleClickOnPreviousMonth">Previous Month</button>
      <button class="btn-2 h-7" @click.prevent="handleClickOnNextMonth">Next Month</button>

      <input
        type="month"
        :value="selectedMonth"
        @input="(e) => emit('change', e.target?.value)"
        class="border px-2 rounded"
      />
    </div>
  </div>
</template>
