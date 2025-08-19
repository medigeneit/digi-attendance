<script setup>
import LoaderView from '@/components/common/LoaderView.vue'
import SearchInput from '@/components/SearchInput.vue'
import { getYearMonthDayFormat } from '@/libs/datetime'
import { dateWiseTaskList } from '@/libs/task'
import { mapAndFilterTask } from '@/libs/task-tree'
import { useAuthStore } from '@/stores/auth'
import { useTaskStore } from '@/stores/useTaskStore'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import DailyTaskHeading from './DailyTaskHeading.vue'
import MonthlyTaskHeading from './MonthlyTaskHeading.vue'
import TaskListOnDay from './TaskListOnDay.vue'

const selected = reactive({ day: null, month: null, year: null })
const selectedDay = ref()
const state = ref('loading')
const taskStore = useTaskStore()
const auth = useAuthStore()

const search = ref('')
const taskStatus = ref('not-completed')

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

const dailyTaskList = computed(() => {
  const titlePartiallyMatched = (taskTitle) => {
    if (!search.value) {
      return true
    }
    return taskTitle?.toUpperCase()?.includes(search.value?.toUpperCase())
  }

  return mapAndFilterTask(
    dateWiseTaskList(taskStore.tasks, selected.day, selected.month, selected.year),
    {
      ['user-ids']: auth?.user?.id,
      status: taskStatus.value,
    },
  )
    .filter((task) => {
      return (
        titlePartiallyMatched(task.title) ||
        task.children_tasks?.some((childTask) => titlePartiallyMatched(childTask?.title))
      )
    })
    .map((task) => {
      return {
        ...task,
        children_tasks: task.children_tasks.filter((childTask) =>
          titlePartiallyMatched(childTask.title),
        ),
      }
    })

  // return dateWiseTaskList(tasks, selected.day, selected.month, selected.year)
})
</script>

<template>
  <div class="border">
    <DailyTaskHeading
      :selected-day="selectedDay"
      :loading="state == 'loading'"
      @todayButtonClick="handleClickOnToday"
      @reload-click="handleReloadClick"
      @previous-day-click="handleClickOnPreviousDay"
      @next-day-click="handleClickOnNextDay"
      @input-selected-day="(event) => (selectedDay = event?.target?.value)"
    />

    <MonthlyTaskHeading />

    <div class="bg-gray-300 bg-opacity-90 relative">
      <div class="bg-gray-50 border-y rounded-md z-20">
        <div
          class="text-md font-semibold sticky top-0 border-b px-4 z-30 py-3 bg-white flex items-center shadow"
        >
          Tasks

          <div class="flex justify-between items-center gap-4 ml-auto">
            <div class="w-32 relative h-8 mx-4">
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
        <TaskListOnDay
          class="p-4 min-h-[40vh] max-h-[60vh] overflow-y-auto"
          :is-current-month="isCurrentMonth"
          :tasks="dailyTaskList"
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
