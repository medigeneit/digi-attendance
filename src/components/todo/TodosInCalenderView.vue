<script setup>
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
</script>
<template>
  <div class="relative">
    <CalenderView v-if="month" :month="month" class="border-t border-blue-200/50 relative">
      <template #date="{ day, yearMonthDate, isCurrentMonth }">
        <div
          class="border p-3 hover:bg-sky-50 cursor-pointer"
          @click.prevent="emit('clickDateCell', yearMonthDate)"
        >
          <button
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
        </div>
      </template>
    </CalenderView>
  </div>
</template>
