<template>
  <div class="space-y-4">
    <h2 class="text-xl font-semibold">Requirement Tasks</h2>
    <div class="space-y-4">
      <div
        v-for="task in tasks"
        :key="task.id"
        class="rounded-lg border bg-white p-4 shadow hover:bg-gray-50 transition-colors"
      >
        <div class="flex items-start justify-between">
          <div class="space-y-1">
            <div class="flex items-center gap-2 text-xs text-gray-500">
              <span class="font-medium">{{ task.id }}</span>
              <span class="px-2 py-0.5 rounded bg-blue-100 text-blue-800">{{ task.status }}</span>
            </div>
            <h3 class="font-medium text-gray-800">{{ task.title }}</h3>
            <p class="text-sm text-gray-500">Requirement: {{ task?.requirement?.title }}</p>
            <div
              class="mt-2 flex items-center gap-2"
              v-for="(item, index) in task.users"
              :key="index"
            >
              <div
                class="w-10 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium text-gray-600"
              >
                {{ getInitials(item?.name) }}
              </div>
              <span class="text-sm text-gray-600">{{ item?.name }}</span>
            </div>
          </div>
          <div class="text-right">
            <span class="text-xs px-2 py-1 rounded border" :class="priorityColor(task.priority)">
              {{ task.priority }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useTaskStore } from '@/stores/useTaskStore'
import { storeToRefs } from 'pinia'
import { onMounted } from 'vue'

const taskStore = useTaskStore()

const { tasks } = storeToRefs(taskStore)

onMounted(() => {
  taskStore.fetchTasks()
})

// const tasks = [
//   {
//     id: 'TASK-001',
//     title: 'Implement Login Form',
//     requirement: 'User Authentication System',
//     assignee: 'John Doe',
//     progress: 75,
//     dueDate: 'Apr 25, 2025',
//     status: 'In Progress',
//   },
//   {
//     id: 'TASK-002',
//     title: 'Create Product Detail Page',
//     requirement: 'Product Catalog Management',
//     assignee: 'Sarah Johnson',
//     progress: 60,
//     dueDate: 'Apr 28, 2025',
//     status: 'In Progress',
//   },
//   {
//     id: 'TASK-003',
//     title: 'Design Responsive Layout',
//     requirement: 'Responsive Design Implementation',
//     assignee: 'Emily Taylor',
//     progress: 90,
//     dueDate: 'Apr 30, 2025',
//     status: 'In Progress',
//   },
// ]

const getInitials = (name) => {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
}

const priorityColor = (priority) => {
  switch (priority) {
    case 'HIGH':
      return 'border-red-500 text-red-500'
    case 'MEDIUM':
      return 'border-yellow-500 text-yellow-500'
    default:
      return 'border-gray-300 text-gray-500'
  }
}
</script>
