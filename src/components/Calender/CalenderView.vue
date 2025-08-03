<script setup>
import { computed, ref } from 'vue'

const props = defineProps({
  month: {
    type: String,
    required: true,
    validator: (val) => /^\d{4}-(0[1-9]|1[0-2])$/.test(val),
  },
})

const gridStartDate = ref()
const gridEndDate = ref()
const startOfMonth = ref()
const endOfMonth = ref()

// Days of week starting from Saturday
const daysInWeek = ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']

function getCalendarDates(year, month) {
  const startOfMonth = new Date(year, month, 1)
  const endOfMonth = new Date(year, month + 1, 0)

  const daysInCurrentMonth = endOfMonth.getDate()
  const startDayIndex = startOfMonth.getDay() // JS: 0=Sun, ..., 6=Sat

  // Shift for Saturday-start week
  const startOffset = (startDayIndex + 1) % 7

  // Previous month
  const prevMonthDate = new Date(year, month, 0)
  const prevMonthDays = prevMonthDate.getDate()
  const dates = []

  // Add previous month's trailing days
  for (let i = startOffset - 1; i >= 0; i--) {
    const day = prevMonthDays - i
    const date = new Date(year, month - 1, day)

    dates.push({
      date,
      day: date.getDate(),
      month: date.getMonth() + 1,
      year: date.getFullYear(),
      isCurrentMonth: false,
    })
  }

  // Add current month days
  for (let i = 1; i <= daysInCurrentMonth; i++) {
    const date = new Date(year, month, i)

    const dateObject = {
      date,
      day: i,
      month: month + 1,
      year,
      isCurrentMonth: true,
    }

    if (i === 1) {
      startOfMonth.value = dateObject
      console.log(i, { dateObject })
    } else if (i === daysInCurrentMonth) {
      endOfMonth.value = dateObject
      console.log(i, { dateObject })
    }

    dates.push(dateObject)
  }

  // Add next month's leading days to fill full weeks
  const totalCells = Math.ceil(dates.length / 7) * 7
  const nextMonthDayStart = 1
  for (let i = 0; dates.length < totalCells; i++) {
    const date = new Date(year, month + 1, nextMonthDayStart + i)
    dates.push({
      date,
      day: date.getDate(),
      month: date.getMonth() + 1,
      year: date.getFullYear(),
      isCurrentMonth: false,
    })
  }

  gridStartDate.value = dates[0]
  gridEndDate.value = dates[dates.length - 1]

  return dates
}

const calendarDates = computed(() => {
  const [yearStr, monthStr] = props.month.split('-')
  const year = parseInt(yearStr)
  const month = parseInt(monthStr) - 1
  return getCalendarDates(year, month)
})

const weeks = computed(() => {
  const days = calendarDates.value
  const result = []
  for (let i = 0; i < days.length; i += 7) {
    result.push(days.slice(i, i + 7))
  }
  return result
})
</script>

<template>
  <div>
    <!-- Day names header -->
    <div>
      {{ { startOfMonth, endOfMonth } }}
    </div>
    <div
      class="grid grid-cols-7 *:text-center *:p-2 *:border-r *:border-b *:text-blue-800 *:text-sm"
    >
      <div v-for="day in daysInWeek" :key="day">{{ day }}</div>
    </div>

    <!-- Weekly rows -->
    <div class="flex flex-col">
      <div class="week grid grid-cols-7 min-h-28" v-for="(week, wIdx) in weeks" :key="wIdx">
        <template v-for="(date, _dIdx) in week" :key="_dIdx">
          <template v-if="date">
            <!-- <slot
              name="date"
              :day="date.getDate()"
              :month="date.getMonth() + 1"
              :year="date.getFullYear()"
              :weekday="(date.getDay() + 6) % 7"
            > -->
            <slot
              name="date"
              :day="date.day"
              :month="date.month"
              :year="date.year"
              :weekday="(date.date.getDay() + 1) % 7"
              :isCurrentMonth="date.isCurrentMonth"
            >
              <div class="p-2 border-r border-t">
                {{ date.getDate() }}
              </div>
            </slot>
          </template>
          <template v-else>
            <div class="p-2 border-r border-t">
              <!-- Empty cell -->
              <span class="text-gray-300">-</span>
            </div>
          </template>
        </template>
      </div>
    </div>
  </div>
</template>
