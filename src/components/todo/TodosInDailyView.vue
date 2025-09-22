<script setup>
import { getDisplayDate } from '@/libs/datetime'
import { computed } from 'vue'
import TodosInDate from './TodosInDate.vue'
import TodoStatusIcon from './TodoStatusIcon.vue'

const props = defineProps({
  date: {
    type: String,
    required: true,
  },
})

const emit = defineEmits(['clickTodo', 'clickAdd', 'clickEdit'])

const selectedDate = computed(() => {
  return new Date(props.date)
})
</script>
<template>
  <div class="relative bg-white p-4">
    <div class="max-w-6xl mx-auto border rounded my-10">
      <div class="text-lg font-semibold mb-4 text-gray-700 border-b py-2 px-4 flex items-center">
        {{ getDisplayDate(selectedDate, { weekDay: 'long' }) }}

        <div class="ml-auto">
          <button class="btn btn-icon" @click.prevent="emit('clickAdd')">
            <i class="fas fa-plus"></i>
          </button>
        </div>
      </div>
      <TodosInDate :date="date" :max-items="10" class="my-8 w-full px-4">
        <template #todoItem="{ todo }">
          <div
            class="border rounded px-4 py-3 my-4 hover:bg-sky-50 cursor-pointer flex items-center"
            @click.prevent="emit('clickTodo', todo)"
          >
            <TodoStatusIcon :todo="todo" />

            <div class="line-clamp-2 ml-2">{{ todo.title }}</div>

            <div class="ml-auto">
              <button
                class="btn-icon bg-sky-700 hover:bg-sky-800 hover:text-white"
                @click.prevent.stop="emit('clickEdit', todo)"
              >
                <i class="fas fa-pen"></i>
              </button>
            </div>
          </div>
        </template>
        <template #noTodos>
          <div
            class="flex min-h-[38vh] items-center justify-center text-gray-400 text-center rounded-md"
          >
            No Todos
          </div>
        </template>
      </TodosInDate>
    </div>
  </div>
</template>
