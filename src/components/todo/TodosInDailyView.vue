<script setup>
import { getDisplayDate } from '@/libs/datetime'
import { useTodoStore } from '@/stores/useTodoStore'
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
  'clickChangeStatus',
  'backClick',
  'update',
])

const selectedDate = computed(() => {
  return new Date(props.date)
})

const todoStore = useTodoStore()

async function handleClickDelete(todo) {
  if (confirm(`Are your sure want to delete todo\n'${todo?.title}'`)) {
    await todoStore.deleteTodo(todo.id)
    emit('update')
  }
}

async function handleClickComplete(todo) {
  if (confirm(`Are your sure want to compete todo\n'${todo?.title}'`)) {
    await todoStore.updateTodoStatus(todo.id, 'COMPLETED')
    emit('update')
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
            <div class="line-clamp-2 ml-2 text-gray-500" v-if="todo.todo_type && todo.todo_type_id">
              {{ todo.todo_type }} id {{ todo.todo_type_id }}
            </div>

            <div class="ml-auto flex items-center gap-2">
              <button
                v-if="todo.status === 'WORKING'"
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
