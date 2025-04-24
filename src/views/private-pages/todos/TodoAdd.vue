<script setup>
import { useTodoStore } from '@/stores/useTodoStore'
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const store = useTodoStore()
const router = useRouter()
const route = useRoute()
const form = ref({
  todoable_id: route.params.todoable_id,
  todoable_type: route.query.todoable_type || '', // Change this based on the related entity (task/bug/meeting)
  message: '',
  date: '',
  hours: 0,
  status: 'PENDING',
})

onMounted(() => {
  // If the query parameter exists, use it
  if (route.query.todoable_type) {
    form.value.todoable_type = route.query.todoable_type
  }
})

const submit = async () => {
  await store.createTodo(form.value)
  router.push('/todos')
}
</script>

<template>
  <div class="container mx-auto p-6">
    <div class="max-w-xl mx-auto bg-white shadow-lg rounded-lg p-6">
      <h2 class="text-2xl font-bold mb-6">Add Todo</h2>
      <form @submit.prevent="submit" class="space-y-4">
        <!-- <input
          v-model="form.todoable_id"
          type="number"
          required
          placeholder="Todoable ID (e.g., task/bug/meeting ID)"
          class="w-full px-4 py-2 border rounded-md"
        /> -->
        <select v-model="form.todoable_type" required class="w-full px-4 py-2 border rounded-md">
          <option value="task">Task</option>
          <option value="bug">Bug</option>
          <option value="meeting">Meeting</option>
        </select>
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
          class="bg-blue-500 hover:bg-blue-600 text-white font-semibold px-5 py-2 rounded-md"
        >
          Add Todo
        </button>
      </form>
    </div>
  </div>
</template>
