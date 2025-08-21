<script setup>
import { dateWiseTaskList } from '@/libs/task'
import { reactive } from 'vue'
import CalenderView from '../../Calender/CalenderView.vue'
import TaskListOnDay from './TaskListOnDay.vue'

const selected = reactive({ day: null, month: null, year: null })

defineProps({
  month: {
    type: String,
    required: true,
    validator: (val) => /^\d{4}-(0[1-9]|1[0-2])$/.test(val),
  },
  tasks: {
    type: Array,
    required: true,
    default: () => [],
  },
})

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
</script>

<template>
  <div class="relative">
    <CalenderView :month="month" v-if="month" class="border-t border-blue-200/50 relative">
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
            :tasks="dateWiseTaskList(tasks, day, month, year)"
            :limit="3"
            class="text-xs mt-4"
            @clickOnMore="(event) => handleSelection(event, day, month, year)"
          />
        </div>
      </template>

      <template #calender-bottom>
        <div class="absolute inset-0 bg-gray-300 bg-opacity-90" v-if="selected.day">
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
              :tasks="dateWiseTaskList(tasks, selected.day, selected.month, selected.year)"
              :tree="true"
            />
          </div>
        </div>
      </template>
    </CalenderView>
  </div>
</template>
