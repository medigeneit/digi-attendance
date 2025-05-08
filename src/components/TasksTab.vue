<template>
  <div class="space-y-4">
    <h2 class="text-xl font-semibold">Requirement Tasks</h2>
    <!-- <pre>
      {{ taskListTree }}
    </pre> -->

    <div class="space-y-4">
      <div
        v-for="task in taskListTree"
        :key="task.id"
        class="rounded-lg border bg-white p-4 shadow hover:bg-gray-50 transition-colors"
      >
        <TaskTreeView :task="task" />
      </div>
    </div>
  </div>
</template>

<script setup>
import TaskTreeView from '@/components/TaskTreeView.vue'
import { useTaskStore } from '@/stores/useTaskStore'
import { storeToRefs } from 'pinia'
import { onMounted } from 'vue'

const taskStore = useTaskStore()

const { tasks, taskListTree } = storeToRefs(taskStore)

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
