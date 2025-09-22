<script setup>
import { computed, onMounted, ref, watch } from 'vue'

const props = defineProps({
  month: {
    type: String,
    required: true,
    validator: (val) => /^\d{4}-(0[1-9]|1[0-2])$/.test(val),
  },
})

const emit = defineEmits(['change'])

const gridStartDate = ref()
const gridEndDate = ref()
const startOfMonth = ref()
const endOfMonth = ref()

// Days of week starting from Saturday
const daysInWeek = ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']

function getPreviousMonthTrailingDays(year, month, startOffset, prevMonthDays) {
  const dates = []
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
  return dates
}

function getCurrentMonthDays(year, month, daysInCurrentMonth) {
  const dates = []
  for (let i = 1; i <= daysInCurrentMonth; i++) {
    const date = new Date(year, month, i)

    const dateObject = {
      date,
      day: i,
      month: month + 1,
      year,
      isCurrentMonth: true,
    }

    dates.push(dateObject)
  }

  return dates
}

function getDaysWithLeadingDays(dates, year, month) {
  const leadingDates = [...dates]

  // return leadingDates
  const totalCells = Math.ceil(leadingDates.length / 7) * 7
  const nextMonthDayStart = 1
  for (let i = 0; leadingDates.length < totalCells; i++) {
    const date = new Date(year, month + 1, nextMonthDayStart + i)
    leadingDates.push({
      date,
      day: date.getDate(),
      month: date.getMonth() + 1,
      year: date.getFullYear(),
      isCurrentMonth: false,
    })
  }
  return leadingDates
}

function getCalendarDates(year, month) {
  const startingMonth = new Date(year, month, 1)
  const endingMonth = new Date(year, month + 1, 0)

  const daysInCurrentMonth = endingMonth.getDate()
  const startDayIndex = startingMonth.getDay() // JS: 0=Sun, ..., 6=Sat

  // Shift for Saturday-start week
  const startOffset = (startDayIndex + 1) % 7

  // Previous month
  const prevMonthDate = new Date(year, month, 0)
  const prevMonthDays = prevMonthDate.getDate()
  let dates = []

  //adding previous month trailing days
  const prevTrailingDays = getPreviousMonthTrailingDays(year, month, startOffset, prevMonthDays)
  dates = [...prevTrailingDays]

  const currentMonthDays = getCurrentMonthDays(year, month, daysInCurrentMonth)

  startOfMonth.value = currentMonthDays[0]
  endOfMonth.value = currentMonthDays[currentMonthDays.length - 1]

  // Adding current month days
  dates = [...dates, ...currentMonthDays]

  // Adding next month's leading days to fill full weeks
  const withLeadingDays = getDaysWithLeadingDays(dates, year, month)
  dates = [...withLeadingDays]

  gridStartDate.value = dates[0]
  gridEndDate.value = dates[dates.length - 1]

  return dates
}

const calendarDates = computed(() => {
  const [yearStr, monthStr] = props.month.split('-')
  const year = parseInt(yearStr)
  const month = parseInt(monthStr) - 1

  console.log({ yearStr, monthStr })

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

function updateOnMonthChange() {
  emit('change', {
    gridStartDate: gridStartDate.value,
    gridEndDate: gridEndDate.value,
    startOfMonth: startOfMonth.value,
    endOfMonth: endOfMonth.value,
  })
}

onMounted(() => updateOnMonthChange())

watch(() => props.month, updateOnMonthChange)
</script>

<template>
  <div>
    <slot name="calender-top"></slot>
    <div
      class="grid grid-cols-7 *:text-center *:p-2 *:border-r *:border-b *:text-blue-800 *:text-sm"
    >
      <div v-for="day in daysInWeek" :key="day">{{ day }}</div>
    </div>

    <!-- Weekly rows -->

    <div class="flex flex-col">
      <div class="week grid grid-cols-7 min-h-28" v-for="(week, wIdx) in weeks" :key="wIdx">
        <template v-for="(date, _dIdx) in week" :key="_dIdx">
          <slot
            name="date"
            :day="date.day"
            :month="date.month"
            :year="date.year"
            :weekday="(date.date.getDay() + 1) % 7"
            :isCurrentMonth="date.isCurrentMonth"
            :yearMonthDate="`${date.year}-${String(date.month).padStart(2, '0')}-${String(date.day).padStart(2, '0')}`"
          >
            <div class="p-2 border-r border-t" v-if="date?.date">
              {{ date?.date?.getDate() }}
            </div>
          </slot>
        </template>
      </div>
    </div>
    <slot name="calender-bottom"></slot>
  </div>
</template>
