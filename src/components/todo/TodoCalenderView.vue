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
</script>
<template>
  <div class="relative">
    <CalenderView v-if="month" :month="month" class="border-t border-blue-200/50 relative">
      <template #date="{ day, yearMonthDate, isCurrentMonth }">
        <div class="border p-2">
          <div
            :class="{ 'text-gray-300': !isCurrentMonth, 'text-sky-400': isCurrentMonth }"
            class="text-center mb-2 font-semibold"
          >
            {{ day }}
          </div>
          <div>
            <TodosInDate :date="yearMonthDate" />
          </div>
        </div>
      </template>
    </CalenderView>
  </div>
</template>
