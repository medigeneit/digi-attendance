<script setup>
import { useTodoStore } from '@/stores/useTodoStore'
import { onMounted } from 'vue'
const todoStore = useTodoStore()
onMounted(() => {
  todoStore.fetchMyTodos()
})

const toggleStatus = async (todo) => {
  // Cycle through statuses: PENDING → WORKING → COMPLETED → PENDING
  const newStatus =
    todo.status === 'PENDING' ? 'WORKING' : todo.status === 'WORKING' ? 'COMPLETED' : 'PENDING'

  await todoStore.updateTodoStatus(todo.id, newStatus)
}
</script>
<template>
  <div class="container mx-auto p-6">
    <h2 class="text-2xl font-semibold text-gray-800 mb-6">Todo List</h2>

    <!-- Show Loading State -->
    <div v-if="todoStore.loading" class="text-center text-gray-500 py-4">Loading...</div>

    <!-- Show Error -->
    <div v-if="todoStore.error" class="text-center text-red-500 py-4">{{ todoStore.error }}</div>

    <!-- Todo List -->
    <ul v-else class="space-y-4">
      <li
        v-for="todo in todoStore.todos"
        :key="todo.id"
        class="flex justify-between bg-white items-center p-4 border rounded-lg"
      >
        <!-- Todo Title & Status -->

        <div class="flex items-center space-x-4">
          <input
            type="checkbox"
            @change="toggleStatus(todo)"
            class="form-checkbox h-5 w-5 text-blue-500"
          />
          <span :class="{ 'line-through text-gray-500': todo.status === 'COMPLETED' }">
            {{ todo.message}}
          </span>
          <span class="text-xs btn-4">{{ todo.status }}</span>
        </div>
        <!-- Delete Button (optional) -->
        <button @click="todoStore.deleteTodo(todo.id)" class="text-red-500 hover:text-red-600">
          Delete
        </button>
      </li>
    </ul>
  </div>
</template>
