<script setup>
import { dateIsToday } from '@/libs/datetime'
import CalenderView from '../Calender/CalenderView.vue'
import TodosInDate from './TodosInDate.vue'

defineProps({
  month: {
    type: String,
    required: true,
    validator: (val) => /^\d{4}-(0[1-9]|1[0-2])$/.test(val),
  },
})

const emit = defineEmits(['dateClick', 'clickTodo', 'clickDateCell'])

function handleDateKeypress(e, date) {
  if (e.isTrusted && e.ctrlKey && e.which == 10) {
    emit('clickDateCell', date)
  }
}

function isToday(date) {
  const [year, month, day] = String(date).split('-').map(Number)

  const selectedDate = new Date(year, month - 1, day) // month-1 because JS months are 0-based

  return dateIsToday(selectedDate)
}
</script>
<template>
  <div class="relative">
    <CalenderView v-if="month" :month="month" class="border-t border-blue-200/50 relative">
      <template #date="{ day, yearMonthDate, isCurrentMonth }">
        <div
          tabindex="0"
          class="border p-4 cursor-pointer group/date relative"
          :class="{
            'bg-rose-50  border-rose-300 focus:bg-rose-50 focus:outline-rose-400':
              isToday(yearMonthDate),
            'hover:bg-sky-50  hover:border-blue-300 focus:bg-sky-50 focus:outline-blue-400':
              !isToday(yearMonthDate),
          }"
          @click="emit('clickDateCell', yearMonthDate)"
          @keypress.prevent="(e) => handleDateKeypress(e, yearMonthDate)"
        >
          <button
            tabindex="1"
            :class="{ 'text-gray-300': !isCurrentMonth, 'text-sky-400': isCurrentMonth }"
            class="text-center mb-2 font-semibold hover:bg-sky-200 w-full rounded"
            @click.prevent.stop="emit('dateClick', yearMonthDate)"
          >
            {{ day }}
          </button>
          <div>
            <TodosInDate :date="yearMonthDate" @clickTodo="(todo) => emit('clickTodo', todo)">
              <template #noTodos>
                <span></span>
              </template>
            </TodosInDate>
          </div>
          <div
            class="absolute bottom-0 left-0 right-0 text-center hidden group-hover/date:block text-sm text-red-800/40"
          >
            Click to add todo
          </div>
        </div>
      </template>
    </CalenderView>
  </div>
</template>
