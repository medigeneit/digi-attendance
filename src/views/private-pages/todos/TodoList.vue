<script setup>
import { useTodoStore } from '@/stores/useTodoStore'
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'

const store = useTodoStore()
const router = useRouter()

onMounted(() => {
  store.fetchTodos()
})

const goToEdit = (id) => {
  router.push({ name: 'TodoEdit', params: { id } })
}

const deleteTodo = async (id) => {
  await store.deleteTodo(id)
}
</script>

<template>
  <div class="container mx-auto p-6">
    <h2 class="text-2xl font-bold mb-6">Todo List</h2>
    <div v-if="store.loading" class="text-center py-4 text-gray-500">Loading...</div>
    <div v-else-if="store.error" class="text-center py-4 text-red-500">{{ store.error }}</div>

    <div v-else>
      <ul class="space-y-4">
        <li
          v-for="todo in store.todos"
          :key="todo.id"
          class="flex justify-between items-center p-4 bg-white border rounded-lg"
        >
          <div>
            <span :class="{ 'line-through text-gray-500': todo.status === 'DONE' }">
              {{ todo.message }}
            </span>
            <div class="text-sm text-gray-400">
              {{ todo.todoable_type }} | {{ todo.todoable?.title }}
            </div>
          </div>
          <div class="flex gap-2">
            <button @click="goToEdit(todo.id)" class="bg-green-500 text-white px-4 py-2 rounded">
              Edit
            </button>
            <button @click="deleteTodo(todo.id)" class="bg-red-500 text-white px-4 py-2 rounded">
              Delete
            </button>
          </div>
        </li>
      </ul>
    </div>
  </div>
</template>
