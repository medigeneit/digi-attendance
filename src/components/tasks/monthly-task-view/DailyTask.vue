<script setup>
import LoaderView from '@/components/common/LoaderView.vue'
import SearchInput from '@/components/SearchInput.vue'
import {
  getDisplayDate,
  getDisplayMonth,
  getYearMonthDayFormat,
  getYearMonthFormat,
} from '@/libs/datetime'
import { useTaskStore } from '@/stores/useTaskStore'
import { onMounted, reactive, ref, watch } from 'vue'
import RequirementTaskList from '../RequirementTaskList.vue'
import DailyTaskHeading from './DailyTaskHeading.vue'
import MonthlyTaskHeading from './MonthlyTaskHeading.vue'

const selected = reactive({ day: null, month: null, year: null })
const selectedDay = ref()
const selectedMonth = ref()
const state = ref('loading')
const taskStore = useTaskStore()

const search = ref('')
const listType = ref('day-wise')
const taskStatus = ref('not-completed')

onMounted(() => {
  selectedDay.value = getYearMonthDayFormat(new Date())
  selectedMonth.value = getYearMonthFormat(new Date())
})

watch(selectedDay, (newValue) => {
  const [year, month, day] = newValue.split('-').map(Number)
  selected.day = day
  selected.month = month
  selected.year = year
})

watch(selectedMonth, (newValue) => {
  const [year, month] = newValue.split('-').map(Number)
  selected.day = 1
  selected.month = month
  selected.year = year
})

watch(
  () => selected.month,
  async () => {
    state.value = 'loading'
    await fetchMyTask()
    state.value = ''
  },
)

watch(listType, (newType) => {
  if (newType == 'month-wise') {
    const [year, month] = selectedDay.value.split('-')
    selectedMonth.value = `${year}-${month}`
  }
})

async function fetchMyTask() {
  await taskStore.fetchMyTasks()
}

const handleReloadClick = async () => {
  state.value = 'loading'
  await fetchMyTask()
  state.value = ''
}
</script>

<template>
  <div>
    <DailyTaskHeading
      v-if="listType == 'day-wise'"
      :loading="state == 'loading'"
      :selected-day="selectedDay"
      @change="(v) => (selectedDay = v)"
      @reload-click="handleReloadClick"
      @month-wise-button-click="listType = 'month-wise'"
    />

    <MonthlyTaskHeading
      v-if="listType == 'month-wise'"
      :loading="state == 'loading'"
      :selected-month="selectedMonth"
      @change="(v) => (selectedMonth = v)"
      @day-wise-button-click="listType = 'day-wise'"
      @reload-click="handleReloadClick"
    />

    <div class="bg-opacity-90 relative">
      <div class="rounded-md z-20">
        <div class="text-md sticky top-0 border-b px-4 z-30 py-3 bg-white flex items-center shadow">
          <div class="flex justify-between items-center gap-6 w-full">
            <div
              class="text-blue-800 bg-blue-100 rounded-full border px-4 py-0.5 text-sm"
              v-if="listType == 'day-wise'"
            >
              {{ getDisplayDate(selectedDay) }}
            </div>

            <div
              class="text-blue-800 bg-blue-100 rounded-full border px-4 py-0.5 text-sm"
              v-if="listType == 'month-wise'"
            >
              {{ getDisplayMonth(selectedMonth) }}
            </div>

            <div class="ml-auto flex items-center gap-2">
              <div class="w-32 relative h-8" v-if="listType == 'day-wise'">
                <label class="absolute text-xs left-3 -top-1.5 bg-slate-100 text-blue-500"
                  >Status</label
                >
                <select
                  v-model="taskStatus"
                  class="h-8 text-xs px-2 text-gray-600 border-2 border-gray-400 rounded-md w-full"
                >
                  <option value="">--ALL TASKS--</option>
                  <option value="not-completed">Not Completed</option>
                  <!-- <option value="only-completed">Completed</option> -->
                </select>
              </div>
              <SearchInput
                v-model="search"
                class="w-full md:w-48 md:ml-auto h-8"
                :debounce-time="0"
              />
            </div>
          </div>
        </div>
        <!-- :taskFilters="route.query"
        @update:taskFilters="handleUpdateTaskFilter" -->
      </div>
      <LoaderView
        class="absolute inset-0 flex items-center justify-center z-20 bg-opacity-70"
        v-if="state === 'loading'"
      />
      <RequirementTaskList :showOnlyMyTasks="true" />
    </div>
  </div>
</template>
