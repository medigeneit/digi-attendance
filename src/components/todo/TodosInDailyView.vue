<script setup>
import { dateIsToday, getDisplayDate } from '@/libs/datetime'
import { useAuthStore } from '@/stores/auth'
import { useTodoStore } from '@/stores/useTodoStore'
import { computed } from 'vue'
import TodosInDate from './TodosInDate.vue'
import UserTodos from './UserTodos.vue'

const props = defineProps({
  date: {
    type: String,
    required: true,
  },
  userRole: {
    type: String,
    default: 'employee',
  },
})

const emit = defineEmits([
  'clickTodo',
  'clickAdd',
  'clickEdit',
  'addCarryClick',
  'clickDelete',
  'clickChangeStatus',
  'backClick',
  'update',
])

const authStore = useAuthStore()

const todoStore = useTodoStore()

const selectedDate = computed(() => {
  return new Date(props.date)
})

const userWiseTodos = (todos) => {
  if (props.userRole == 'employee') {
    return [
      {
        ...authStore.user,
        todos,
      },
    ]
  }

  const grouped = {}

  todos.forEach((todo) => {
    const userId = todo.user?.id // taking full user object, not just id
    if (!grouped[userId]) {
      grouped[userId] = {
        ...todo.user, // spread user info
        todos: [],
      }
    }
    grouped[userId].todos.push(todo)
  })

  return Object.values(grouped)
}

// const dateIsToday = computed(() => {
//   return true
// })
</script>
<template>
  <!-- Error message -->
  <div
    v-if="todoStore.error"
    class="max-w-6xl mx-auto mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3 text-red-700"
  >
    <i class="fad fa-exclamation-circle text-red-600"></i>
    <div class="text-sm">{{ todoStore.error }}</div>
  </div>

  <!-- Header -->
  <div class="max-w-6xl mx-auto px-4">
    <div class="flex items-center justify-between py-2 mb-8  border-b border-gray-200">
      <div class="flex items-center gap-3">
        <button
          class="btn btn-icon text-gray-600 hover:text-gray-900 hover:bg-gray-100"
          @click.prevent="emit('backClick')"
        >
          <i class="fa fa-arrow-left"></i>
        </button>
        <div class="flex items-center gap-2">
          <h2 class="text-lg font-bold text-gray-800">{{ getDisplayDate(selectedDate, { weekDay: 'long' }) }}</h2>
          <span
            v-if="dateIsToday(date)"
            class="rounded-full px-3 py-1 text-xs font-semibold text-white bg-red-500"
          >
            Today
          </span>
        </div>
      </div>

      <button
        v-if="userRole == 'employee'"
        class="btn btn-primary flex items-center gap-2"
        @click.prevent="emit('clickAdd', props.date)"
      >
        <i class="fas fa-plus"></i>
        <span class="hidden sm:inline">Add Todo</span>
      </button>
    </div>
  </div>

  <!-- Todos list -->
  <TodosInDate :date="date" max-items="all" class="max-w-6xl mx-auto px-4">
    <template #todoItems="{ allTodos }">
      <template v-for="user in userWiseTodos(allTodos)" :key="user.id">
        <UserTodos
          :todosDates="user?.todos || []"
          :user="user"
          @clickTodo="(todo) => emit('clickTodo', todo)"
          @clickEdit="(todo) => emit('clickEdit', todo)"
          @update="(_todo) => emit('update')"
          :user-role="userRole"
        />
      </template>
    </template>
    <template #noTodos>
      <div
        class="flex min-h-[38vh] items-center justify-center text-gray-400 text-center rounded-md"
      >
        No Todos
      </div>
    </template>
  </TodosInDate>
</template>
