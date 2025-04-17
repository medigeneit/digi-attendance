<script setup>
import { useTodoStore } from '@/stores/useTodoStore'
import { onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const store = useTodoStore()
const route = useRoute()
const router = useRouter()
const todoId = route.params.id

const form = ref({
  message: '',
  status: '',
  date: '',
  hours: 0,
})

onMounted(async () => {
  await store.fetchTodo(todoId)
})

watch(
  () => store.todo,
  (todo) => {
    form.value.message = todo.message || ''
    form.value.status = todo.status || ''
    form.value.date = todo.date || ''
    form.value.hours = todo.hours || ''
  },
)

const update = async () => {
  await store.updateTodo(todoId, form.value)
  router.push('/todos')
}
</script>

<template>
  <div class="container mx-auto p-6">
    <div class="max-w-xl mx-auto bg-white shadow-lg rounded-lg p-6">
      <h2 class="text-2xl font-bold mb-6">Edit Todo</h2>
      <form @submit.prevent="update" class="space-y-4">
        <input
          v-model="form.message"
          required
          type="text"
          placeholder="Todo message"
          class="w-full px-4 py-2 border rounded-md"
        />
        <input
          v-model="form.date"
          type="date"
          required
          class="w-full px-4 py-2 border rounded-md"
        />
        <input
          v-model="form.hours"
          type="number"
          required
          placeholder="Estimated Hours"
          class="w-full px-4 py-2 border rounded-md"
        />
        <select v-model="form.status" required class="w-full px-4 py-2 border rounded-md">
          <option value="PENDING">Pending</option>
          <option value="WORKING">Working</option>
          <option value="DONE">Done</option>
          <option value="BLOCKED">Blocked</option>
        </select>
        <button
          type="submit"
          class="bg-green-500 hover:bg-green-600 text-white font-semibold px-5 py-2 rounded-md"
        >
          Update Todo
        </button>
      </form>
    </div>
  </div>
</template>
