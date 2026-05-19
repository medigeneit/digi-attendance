<script setup>
import { useTodoDateStore } from '@/stores/useTodoDateStore'
import { useTodoStore } from '@/stores/useTodoStore'
import { ref } from 'vue'
import DraggableList from '../common/DraggableList.vue'
import DepartmentChip from '../DepartmentChip.vue'
import UserAvatar from '../UserAvatar.vue'
import TodoItemCard from './TodoItemCard.vue'

const props = defineProps({
  todosDates: {
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
const emit = defineEmits(['clickTodo', 'clickEdit', 'addCarryClick', 'update'])

const todoStore = useTodoStore()
const todoDateStore = useTodoDateStore()

async function handleClickDelete(todo) {
  if (confirm(`Are your sure want to delete todo\n'${todo?.title}'`)) {
    await todoDateStore.deleteTodoDate(todo.id)
    emit('update')
  }
}

async function handleClickComplete(todo, status) {
  if (confirm(`Are your sure?\nwant to change status to ${status} \ntodo: '${todo?.title}'`)) {
    await todoDateStore.updateStatus(todo.id, status)
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
  <div class="max-w-6xl mx-auto mb-6">
    <!-- User section header -->
    <div class="flex items-center justify-between  py-1 bg-blue-50 border-y border-blue-200">
      <div class="flex items-center gap-3 justify-between w-full px-1">
        <div class="flex items-center gap-1">
          <UserAvatar size="small" :user="user" />
          <div class="font-semibold text-gray-800 text-base">{{ user.label }}</div>
        </div>
        <DepartmentChip :department="user?.department" class="text-xs mt-0.5" />
      </div>

      <!-- Save/Discard buttons -->
      <div class="flex items-center gap-2" v-if="draggableTodos?.isItemsChanged">
        <button
          @click.prevent="() => handleTodosRearrange()"
          class="btn btn-sm bg-green-500 text-white hover:bg-green-600 disabled:opacity-40 disabled:pointer-events-none"
          :disabled="todoStore.updatingPriority"
        >
          <i class="fas fa-save mr-1"></i> Save
        </button>
        <button
          @click.prevent="() => draggableTodos.resetItems()"
          class="btn btn-sm bg-gray-400 text-white hover:bg-gray-500 disabled:opacity-40 disabled:pointer-events-none"
          :disabled="todoStore.updatingPriority"
        >
          <i class="fas fa-times mr-1"></i> Discard
        </button>
      </div>
    </div>

    <!-- Todos list container -->
    <div class="space-y-2">
      <DraggableList
        :items="todosDates"
        ref="draggableTodos"
        handle="handle"
        v-if="todosDates.length > 0"
      >
        <template #item="{ item: todoDate }">
          <TodoItemCard
            :todoDate="todoDate"
            @clickTodo="(todoDate) => emit('clickTodo', todoDate)"
            @clickEdit="(todoDate) => emit('clickEdit', todoDate)"
            @clickDelete="(todoDate) => handleClickDelete(todoDate)"
            @clickChangeStatus="(todoDate, status) => handleClickComplete(todoDate, status)"
            hide-department
            hide-user
            class="border-sky-100"
            :userRole="userRole"
          />
        </template>
      </DraggableList>

      <div
        v-if="todosDates.length === 0"
        class="flex min-h-[20vh] items-center justify-center text-gray-400 text-center rounded-lg bg-gray-50 border border-dashed border-gray-300"
      >
        <div>
          <i class="fas fa-inbox text-4xl mb-2 opacity-30"></i>
          <p>No todos for this user</p>
        </div>
      </div>
    </div>
    <hr />
  </div>
</template>
