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

const emit = defineEmits([
  'clickTodo',
  'clickAdd',
  'clickEdit',
  'clickDelete',
  'clickComplete',
  'backClick',
])

const selectedDate = computed(() => {
  return new Date(props.date)
})

function handleClickDelete(todo) {
  if (confirm(`Are your sure want to delete todo\n'${todo.title}'`)) {
    emit('clickComplete', todo.id)
  }
}

function handleClickComplete(todo) {
  if (confirm(`Are your sure want to compete todo\n'${todo.title}'`)) {
    emit('clickComplete', todo.id)
  }
}
</script>
<template>
  <div class="relative bg-white p-4">
    <div class="max-w-6xl mx-auto border rounded my-10">
      <div class="mb-4 text-gray-700 border-b py-2 px-4 flex items-center">
        <button class="fa fa-arrow-left btn-icon mr-2" @click.prevent="emit('backClick')"></button>
        <div class="text-lg font-semibold">
          {{ getDisplayDate(selectedDate, { weekDay: 'long' }) }}
        </div>

        <div class="ml-auto">
          <button class="btn btn-icon" @click.prevent="emit('clickAdd', props.date)">
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

            <div class="ml-auto flex items-center gap-2">
              <button
                class="btn-icon bg-green-400 text-white hover:bg-green-600 hover:text-white"
                @click.prevent.stop="() => handleClickComplete(todo)"
              >
                <i class="fas fa-check"></i>
              </button>
              <button
                class="btn-icon bg-sky-400 text-white hover:bg-sky-600 hover:text-white"
                @click.prevent.stop="emit('clickEdit', todo)"
              >
                <i class="fas fa-pen"></i>
              </button>
              <button
                v-if="todo.status !== 'COMPLETED'"
                class="btn-icon bg-red-400 text-white hover:bg-red-600 hover:text-white"
                @click.prevent.stop="() => handleClickDelete(todo)"
              >
                <i class="fas fa-trash-alt"></i>
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
