<script setup>
import { useTodoStore } from '@/stores/useTodoStore'
import { onMounted } from 'vue'

const store = useTodoStore()

onMounted(() => {
  store.fetchTodos()
})
</script>

<template>
  <div class="container mx-auto px-4 py-6">
    <h2 class="text-2xl font-bold text-gray-800 mb-6">📋 Todo List</h2>

    <div v-if="store.loading" class="text-center text-gray-500 py-6">Loading...</div>
    <div v-else-if="store.error" class="text-center text-red-500 py-6">
      {{ store.error }}
    </div>
    <div v-else>
      <ul class="grid gap-4">
        <li
          v-for="todo in store.todos"
          :key="todo.id"
          class="flex justify-between items-start gap-4 p-4 bg-white border rounded-lg shadow-sm hover:shadow-md transition"
        >
          <div>
            <h3
              class="font-medium text-gray-800"
              :class="{ 'line-through text-gray-400': todo.status === 'COMPLETED' }"
            >
              {{ todo.message }}
            </h3>
            <span
              v-if="todo.status === 'COMPLETED'"
              class="inline-flex items-center text-green-600 text-xs font-semibold bg-green-100 px-2 py-0.5 rounded-full"
            >
              ✅ Completed
            </span>
            <p class="text-sm text-gray-500 mt-1">
              <span
                class="inline-block bg-blue-100 text-blue-800 text-xs font-semibold px-2 py-0.5 rounded"
              >
                {{ todo.todoable_type.split('\\').pop() }}
              </span>
              <span class="ml-2">{{ todo.todoable?.title || 'No title' }}</span>
            </p>

            <p class="text-sm text-gray-500 mt-2">
              <i class="far fa-user-friends"></i>
              <span class="bg-gray-100 text-gray-700 px-2 py-0.5 ml-2 rounded-full text-xs">
                {{ todo?.user?.name }}
              </span>
            </p>
          </div>
        </li>
      </ul>
    </div>
  </div>
</template>
