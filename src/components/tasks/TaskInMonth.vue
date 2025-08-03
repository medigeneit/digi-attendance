<script setup>
import { ref } from 'vue'
import CalenderView from '../Calender/CalenderView.vue'
const month = ref('2025-08')

const dateClass = (day, month, year) => {
  const today = new Date()

  const isToday =
    day === today.getDate() && month === today.getMonth() + 1 && year === today.getFullYear()

  return isToday ? 'bg-green-100 text-green-900 border-blue-500 border-2' : ' border-r border-t'
}

function handleDateRangeChange({ startDate, endDate }) {
  console.log({ startDate, endDate })
}
</script>

<template>
  <div>
    <div class="px-4 py-2 flex items-center bg-gray-50 group">
      <h2 class="leading-none font-semibold text-lg">Task List</h2>
      <input type="month" v-model="month" class="ml-auto border px-2 rounded" />
    </div>

    <CalenderView
      :month="month"
      class="border-t border-blue-200/50"
      @date-range-change="handleDateRangeChange"
    >
      <template #date="{ day, month, year, isCurrentMonth }">
        <div
          tabindex="0"
          class="p-2 hover:bg-blue-50 outline-blue-600 outline-1 cursor-pointer"
          :class="dateClass(day, month, year, isCurrentMonth)"
        >
          <div class="font-bold" :class="{ 'text-gray-300': !isCurrentMonth }">
            {{ day }}
          </div>

          <div
            class="flex gap-2 w-full items-center justify-center text-red-800 mt-5"
            v-if="day === 15 && month === 8"
          >
            🎉 Holiday
          </div>

          <div
            v-if="
              (day === 2 ||
                day === 29 ||
                day === 21 ||
                day === 6 ||
                day === 7 ||
                day === 3 ||
                day === 1) &&
              (month === 8 || month === 7)
            "
          >
            <ul
              class="text-xs mt-4"
              :class="{ 'text-gray-500 group-hover:text-gray-900': !isCurrentMonth }"
            >
              <li class="flex items-center">
                <i class="fad fa-tasks text-xs mr-2"></i>
                <span class="line-clamp-1"> BCS Question Bank Print Option </span>
              </li>
              <li class="flex items-center">
                <i class="fad fa-tasks text-xs mr-2"></i>
                <span class="line-clamp-1">BCS Previous Question add into BCS site </span>
              </li>
              <li class="flex items-center">
                <i class="fad fa-tasks text-xs mr-2"></i>
                <span class="line-clamp-1">App Publish to Play Store 2</span>
              </li>
            </ul>
            <div class="text-center w-full mt-4 text-xs">+3 More Tasks</div>
          </div>
        </div>
      </template>
    </CalenderView>
  </div>
</template>
