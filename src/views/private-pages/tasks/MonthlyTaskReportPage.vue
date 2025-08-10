<script setup>
import MonthlyTaskReport from '@/components/tasks/MonthlyTaskReport.vue'
import { getYearMonthDayFormat } from '@/libs/datetime'
import { onMounted, reactive, ref, watch } from 'vue'

const selected = reactive({ month: null, year: null })
const selectedMonth = ref()
const state = ref('loading')

const dateRange = ref([])

function getYearMonth(date) {
  if ((!date) instanceof Date) {
    return ''
  }
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

onMounted(() => {
  const today = new Date()

  selectedMonth.value = getYearMonth(today)
})

watch(selectedMonth, (newValue) => {
  const [year, month, _day] = newValue.split('-').map(Number)

  // First day of month
  const firstDay = new Date(year, month - 1, 1)

  // Last day of month
  const lastDay = new Date(year, month, 0)

  dateRange.value = [firstDay, lastDay]

  selected.month = month
  selected.year = year
})

function handleClickOnCurrentMonth() {
  const today = new Date()
  selectedMonth.value = getYearMonth(today)
}

function handleClickOnNextMonth() {
  const today = new Date(selectedMonth.value)
  today.setMonth(today.getMonth() + 1)
  selectedMonth.value = getYearMonth(today)
}

function handleClickOnPreviousMonth() {
  const today = new Date(selectedMonth.value)
  today.setMonth(today.getMonth() - 1)
  selectedMonth.value = getYearMonth(today)
}
</script>

<template>
  <div class="border container mx-auto">
    <div class="px-4 py-2 flex items-center bg-gray-50 group">
      <h2 class="leading-none font-semibold text-lg">Monthly Task Report</h2>
      <!-- <div class="mx-4">{{ getDisplayDate(selectedMonth) }}</div> -->
      <button class="btn-3 mx-4 h-7" @click.prevent="handleClickOnCurrentMonth">
        Current Month
      </button>

      <div class="ml-4 md:ml-auto flex items-center gap-2">
        <button class="btn-2 h-7" @click.prevent="handleClickOnPreviousMonth">
          Previous Month
        </button>
        <button class="btn-2 h-7" @click.prevent="handleClickOnNextMonth">Next Month</button>

        <input type="month" v-model="selectedMonth" class="border px-2 rounded" />
      </div>
    </div>

    <div class="bg-gray-300 bg-opacity-90 relative">
      <div class="bg-white p-4 border-t">
        <MonthlyTaskReport
          :start-date="dateRange.length >= 1 ? getYearMonthDayFormat(dateRange[0]) : null"
          :end-date="dateRange.length == 2 ? getYearMonthDayFormat(dateRange[1]) : null"
        />
      </div>
    </div>
  </div>
</template>
