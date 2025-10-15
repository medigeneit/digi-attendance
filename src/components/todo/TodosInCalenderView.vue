<script setup>
import { dateIsToday, getMonthName } from '@/libs/datetime'
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
    emit('dateClick', date)
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
      <template #date="{ day, month, yearMonthDate, isCurrentMonth }">
        <div
          tabindex="0"
          class="border p-4 cursor-pointer group/date relative focus:outline-slate-400"
          :class="{
            'bg-sky-50   border-sky-300 focus:bg-sky-50 focus:outline-sky-400':
              isToday(yearMonthDate),
            'hover:bg-slate-50  hover:border-slate-300 focus:bg-slate-50 ': !isToday(yearMonthDate),
          }"
          @click.prevent.stop="emit('dateClick', yearMonthDate)"
          @keypress.prevent="(e) => handleDateKeypress(e, yearMonthDate)"
        >
          <button
            tabindex="1"
            :class="{
              'text-gray-300 hover:bg-sky-200  hover:text-white': !isCurrentMonth,
              'text-sky-400 hover:bg-sky-200': isCurrentMonth,
            }"
            class="text-center mb-2 font-semibold w-full rounded"
          >
            {{ day }} {{ !isCurrentMonth ? getMonthName(month - 1) : '' }}
          </button>

          <div>
            <TodosInDate :date="yearMonthDate" @clickTodo="(todo) => emit('clickTodo', todo)">
              <template #noTodos>
                <span></span>
              </template>
            </TodosInDate>
          </div>
          <div class="flex items-center justify-center">
            <button
              @click.prevent.stop="emit('clickDateCell', yearMonthDate)"
              class="btn-3 !py-1 invisible group-hover/date:visible text-sm text-red-800/40"
            >
              <i class="fas fa-plus"></i>
              <span class="hidden lg:inline whitespace-nowrap"> Add todo </span>
            </button>
          </div>
        </div>
      </template>
    </CalenderView>
  </div>
</template>
