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
    const userId = todo.user.id // taking full user object, not just id
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
  <div class="relative bg-white p-4">
    <div
      class="text-red-500 text-sm border border-red-300 max-w-6xl mx-auto py-2 gap-2 shadow-sm rounded flex items-center px-3"
      v-if="todoStore.error"
    >
      <i class="fad fa-exclamation-circle"></i>
      <div>
        {{ todoStore.error }}
      </div>
    </div>

    <div class="max-w-6xl mx-auto border rounded my-5">
      <div class="text-gray-700 border-b py-2 px-4 flex items-center">
        <button class="fa fa-arrow-left btn-icon mr-2" @click.prevent="emit('backClick')"></button>
        <div class="text-lg font-semibold flex items-center gap-2">
          {{ getDisplayDate(selectedDate, { weekDay: 'long' }) }}

          <span
            v-if="dateIsToday(date)"
            class="rounded-md border text-xs px-2 py-[1px] text-red-500 border-red-500 bg-red-50"
          >
            Today
          </span>
        </div>

        <div class="ml-auto flex items-center gap-2" v-if="userRole == 'employee'">
          <button class="btn btn-icon" @click.prevent="emit('clickAdd', props.date)">
            <i class="fas fa-plus"></i>
          </button>
        </div>
      </div>
      <TodosInDate :date="date" max-items="all" class="w-full space-y-4 p-2">
        <template #todoItems="{ allTodos }">
          <template v-for="user in userWiseTodos(allTodos)" :key="user.id">
            <UserTodos
              :todosDates="user?.todos || []"
              :user="user"
              @clickTodo="(todo) => emit('clickTodo', todo)"
              @clickEdit="(todo) => emit('clickEdit', todo)"
              @update="(todo) => emit('update')"
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
    </div>
  </div>
</template>
