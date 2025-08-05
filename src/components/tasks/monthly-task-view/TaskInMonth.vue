<script setup>
import { useTaskStore } from '@/stores/useTaskStore'
import { reactive, ref } from 'vue'
import CalenderView from '../../Calender/CalenderView.vue'
import TaskListOnDay from './TaskListOnDay.vue'

const month = ref('2025-08')
const selected = reactive({ day: null, month: null, year: null })

const taskStore = useTaskStore()

function handleCloseClick(event) {
  event.stopPropagation()

  selected.day = null
  selected.month = null
  selected.year = null
}

function handleSelection(event, day, month, year) {
  event.stopPropagation()

  selected.day = day
  selected.month = month
  selected.year = year
}

async function handleCalenderChange({ gridStartDate, gridEndDate, startOfMonth, endOfMonth }) {
  console.log({ gridStartDate, gridEndDate, startOfMonth, endOfMonth })

  await taskStore.fetchTasks()
}

const dateIsToday = (day, month, year) => {
  const today = new Date()
  return day === today.getDate() && month === today.getMonth() + 1 && year === today.getFullYear()
}

const isSelectedDay = (day, month, year) => {
  return day === selected.day && month === selected.month && year === selected.year
}

const dateClass = (day, month, year, isCurrentMonth) => {
  const isToday = dateIsToday(day, month, year)

  return {
    'bg-green-100 text-green-900 border-blue-500 border-2 scale-105 z-10': isToday,
    'border-r border-t hover:border border-blue-200  hover:scale-105 hover:z-20 hover:bg-blue-50':
      !isToday,
    'bg-gray-50': !isCurrentMonth,
  }
}

const dateWiseTaskList = (_day, _month, _year) => {
  const selectedDate = new Date(_year, _month - 1, _day)
  return taskStore?.tasks
    .filter((t) => {
      if (!t.users.some((u) => u.id === 4)) {
        //Saif Vai
        return false
      }

      // if (!t.users.some((u) => u.id === 49)) {
      //   //Asif Vai
      //   return false
      // }

      const deadline = t.deadline ? new Date(t.deadline) : null
      const today = new Date()

      console.log({ today })

      if (t.assigned_at || t.created_at) {
        let assignDate = new Date(t.assigned_at)

        if (!t.assigned_at && t.created_at) {
          const createdDate = new Date(t.created_at)
          assignDate = new Date(
            createdDate.getFullYear(),
            createdDate.getMonth(),
            createdDate.getDate(),
          )
        }

        let taskCompletedDate = null
        if (t.completed_at) {
          taskCompletedDate = new Date(t.completed_at)
        }

        return (
          assignDate <= selectedDate &&
          (!taskCompletedDate || taskCompletedDate >= selectedDate) &&
          (!deadline || deadline >= selectedDate || selectedDate <= today)
        )
      }
      return false
    })
    .map((task) => {
      let deadline_crossed = false
      if (task.deadline) {
        deadline_crossed = new Date(task.deadline) < selectedDate
      }

      return {
        ...task,
        deadline_crossed,
      }
    })
}
</script>

<template>
  <div class="relative">
    <div class="px-4 py-2 flex items-center bg-gray-50 group">
      <h2 class="leading-none font-semibold text-lg">Task List</h2>
      <input type="month" v-model="month" class="ml-auto border px-2 rounded" />
    </div>

    <CalenderView
      :month="month"
      class="border-t border-blue-200/50 relative"
      @change="handleCalenderChange"
    >
      <template #date="{ day, month, year, isCurrentMonth }">
        <div
          tabindex="0"
          class="transition origin-center p-2 outline-blue-600 outline-1 cursor-pointer"
          :class="dateClass(day, month, year, isCurrentMonth)"
        >
          <div
            class="font-bold w-full flex items-center"
            :class="{ 'text-gray-300': !isCurrentMonth }"
          >
            <div>{{ day }}</div>

            <div class="ml-auto">
              <button
                v-if="!isSelectedDay(day, month, year)"
                class="btn-icon"
                @click.prevent="(event) => handleSelection(event, day, month, year)"
              >
                <i class="fas fa-expand-arrows text-gray-400 hover:text-gray-600"></i>
              </button>
            </div>
          </div>

          <TaskListOnDay
            :is-current-month="isCurrentMonth"
            :tasks="dateWiseTaskList(day, month, year)"
            limit="3"
            class="text-xs mt-4"
            @clickOnMore="(event) => handleSelection(event, day, month, year)"
          />
        </div>
      </template>

      <template #calender-bottom>
        <div class="absolute inset-0 bg-white bg-opacity-90" v-if="selected.day">
          <div
            class="absolute inset-16 bg-white border border-blue-500 rounded-md z-20 overflow-y-auto"
          >
            <div
              class="text-lg font-semibold mb-4 sticky top-0 border-b border-blue-200 px-4 z-30 py-3 bg-white flex items-center"
            >
              Tasks for {{ selected.day }}/{{ selected.month }}/{{ selected.year }}
              <button class="ml-auto" type="button" @click.prevent="handleCloseClick">
                <i class="fas fa-times"></i>
              </button>
            </div>
            <TaskListOnDay
              class="p-4"
              :is-current-month="isCurrentMonth"
              :tasks="dateWiseTaskList(selected.day, selected.month, selected.year)"
              :tree="true"
            />
          </div>
        </div>
      </template>
    </CalenderView>
    <!--
    <pre>
      {{
        taskStore?.tasks
          ?.map((t) => ({
            id: t.id,
            title: t.title,
            started_at: t.started_at,
          }))
          .filter((t) => t.started_at)
      }}
    </pre> -->
  </div>
</template>
