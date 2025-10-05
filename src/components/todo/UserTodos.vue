<script setup>
import { useTodoStore } from '@/stores/useTodoStore'
import { ref } from 'vue'
import DraggableList from '../common/DraggableList.vue'
import DepartmentChip from '../DepartmentChip.vue'
import UserAvatar from '../UserAvatar.vue'
import TodoItemCard from './TodoItemCard.vue'

const props = defineProps({
  todos: {
    type: Array,
    required: true,
  },
  user: {
    type: Object,
    required: true,
  },
  userRole: {
    type: String,
    default: 'employee',
  },
})

const draggableTodos = ref(null)
const emit = defineEmits(['clickTodo', 'clickEdit', 'update'])

const todoStore = useTodoStore()

async function handleClickDelete(todo) {
  if (confirm(`Are your sure want to delete todo\n'${todo?.title}'`)) {
    await todoStore.deleteTodo(todo.id)
    emit('update')
  }
}

async function handleClickComplete(todo, status) {
  if (confirm(`Are your sure?\nwant to change status to ${status} \ntodo: '${todo?.title}'`)) {
    await todoStore.updateTodoStatus(todo.id, status)
    emit('update')
  }
}

async function handleTodosRearrange() {
  const ids = draggableTodos?.value.items?.map((item) => item.id)

  await todoStore.rearrangeMyTodos(ids, { date: props.date })

  emit('update')
}
</script>
<template>
  <div class="border rounded-md">
    <div
      class="text-gray-700 bg-gradient-to-tl from-sky-400/60 to-sky-400 border-b py-2 px-4 flex items-center"
    >
      <div class="font-semibold flex items-center gap-2">
        <UserAvatar :user="user" />
        <div class="text-white text-base">{{ user.label }}</div>
      </div>

      <div class="ml-auto flex items-center gap-2">
        <div class="flex items-center gap-3 mr-6" v-if="draggableTodos?.isItemsChanged">
          <button
            @click.prevent="() => handleTodosRearrange()"
            class="btn-2 disabled:opacity-40 disabled:pointer-events-none"
            :disabled="todoStore.updatingPriority"
          >
            Save Rearranged
          </button>
          <button
            @click.prevent="() => draggableTodos.resetItems()"
            class="btn-3 disabled:opacity-40 disabled:pointer-events-none"
            :disabled="todoStore.updatingPriority"
          >
            Discard
          </button>
        </div>
        <DepartmentChip :department="user?.department" class="px-2" />
      </div>
    </div>

    <div :date="date" max-items="all" class="w-full">
      <DraggableList :items="todos" ref="draggableTodos" handle="handle" v-if="todos.length > 0">
        <template #item="{ item: todo }">
          <TodoItemCard
            :todo="todo"
            @clickTodo="(todo) => emit('clickTodo', todo)"
            @clickEdit="(todo) => emit('clickEdit', todo)"
            @clickDelete="(todo) => handleClickDelete(todo)"
            @clickChangeStatus="(todo, status) => handleClickComplete(todo, status)"
            hide-department
            hide-user
            class="border-b border-sky-200"
            :userRole="userRole"
          />
        </template>
      </DraggableList>

      <div
        v-if="todos.length === 0"
        class="flex min-h-[38vh] items-center justify-center text-gray-400 text-center rounded-md"
      >
        No Todos
      </div>
    </div>
  </div>
</template>
