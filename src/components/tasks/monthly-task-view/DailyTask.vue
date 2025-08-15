<script setup>
import LoaderView from '@/components/common/LoaderView.vue'
import { getDisplayDate, getYearMonthDayFormat } from '@/libs/datetime'
import { dateWiseTaskList } from '@/libs/task'
import { useTaskStore } from '@/stores/useTaskStore'
import { onMounted, reactive, ref, watch } from 'vue'
import TaskListOnDay from './TaskListOnDay.vue'

const selected = reactive({ day: null, month: null, year: null })
const selectedDay = ref()
const state = ref('loading')
const taskStore = useTaskStore()

onMounted(() => {
  selectedDay.value = getYearMonthDayFormat(new Date())
})

watch(selectedDay, (newValue) => {
  const [year, month, day] = newValue.split('-').map(Number)
  selected.day = day
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

async function fetchMyTask() {
  await taskStore.fetchMyTasks({ status: 'not-completed' })
}

function handleClickOnToday() {
  const today = new Date()
  selectedDay.value = getYearMonthDayFormat(today)
}

function handleClickOnNextDay() {
  const today = new Date(selectedDay.value)
  today.setDate(today.getDate() + 1)
  selectedDay.value = getYearMonthDayFormat(today)
}

function handleClickOnPreviousDay() {
  const today = new Date(selectedDay.value)
  today.setDate(today.getDate() - 1)
  selectedDay.value = getYearMonthDayFormat(today)
}

const handleReloadClick = async () => {
  state.value = 'loading'
  await fetchMyTask()
  state.value = ''
}
</script>

<template>
  <div class="border">
    <div class="px-4 py-2 flex items-center bg-gray-50 group">
      <h2 class="leading-none font-semibold text-lg">Daily Task</h2>
      <div class="mx-4">{{ getDisplayDate(selectedDay) }}</div>
      <button class="btn-3 mx-4 h-7" @click.prevent="handleClickOnToday">Today</button>

      <button
        class="btn-3 px-2 py-2 mx-4 size-7 disabled:text-gray-300 disabled:border-gray-300"
        :class="{ 'animate-spin text-gray-300 border-gray-300 !bg-opacity-0': state == 'loading' }"
        @click.prevent="handleReloadClick"
        :disabled="state == 'loading'"
      >
        <i class="fas fa-redo-alt"></i>
      </button>

      <div class="ml-4 md:ml-auto flex items-center gap-2">
        <button class="btn-2 h-7" @click.prevent="handleClickOnPreviousDay">Previous Day</button>
        <button class="btn-2 h-7" @click.prevent="handleClickOnNextDay">Next Day</button>

        <input type="date" v-model="selectedDay" class="border px-2 rounded" />
      </div>
    </div>

    <div class="bg-gray-300 bg-opacity-90 relative">
      <div class="bg-white border rounded-md z-20">
        <div
          class="text-md font-semibold sticky top-0 border-b px-4 z-30 py-3 bg-white flex items-center shadow"
        >
          Tasks
        </div>
        <TaskListOnDay
          class="p-4 min-h-[40vh] max-h-[60vh] overflow-y-auto"
          :is-current-month="isCurrentMonth"
          :tasks="dateWiseTaskList(taskStore.tasks, selected.day, selected.month, selected.year)"
          :tree="true"
        />
      </div>
      <LoaderView
        class="absolute inset-0 flex items-center justify-center z-20 bg-opacity-70"
        v-if="state === 'loading'"
      />
    </div>
  </div>
</template>
