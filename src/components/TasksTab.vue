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
            <p class="text-sm text-gray-500">Requirement: {{ task.requirement }}</p>
            <div class="mt-2 flex items-center gap-2">
              <div
                class="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium text-gray-600"
              >
                {{ getInitials(task.assignee) }}
              </div>
              <span class="text-sm text-gray-600">{{ task.assignee }}</span>
            </div>
          </div>
          <div class="text-right">
            <span class="text-sm font-medium">{{ task.progress }}%</span>
            <div class="mt-1 h-1 w-24 bg-gray-200 rounded">
              <div class="h-full bg-blue-600 rounded" :style="{ width: task.progress + '%' }"></div>
            </div>
            <div class="text-xs text-gray-400 mt-1">Due: {{ task.dueDate }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
const tasks = [
  {
    id: 'TASK-001',
    title: 'Implement Login Form',
    requirement: 'User Authentication System',
    assignee: 'John Doe',
    progress: 75,
    dueDate: 'Apr 25, 2025',
    status: 'In Progress',
  },
  {
    id: 'TASK-002',
    title: 'Create Product Detail Page',
    requirement: 'Product Catalog Management',
    assignee: 'Sarah Johnson',
    progress: 60,
    dueDate: 'Apr 28, 2025',
    status: 'In Progress',
  },
  {
    id: 'TASK-003',
    title: 'Design Responsive Layout',
    requirement: 'Responsive Design Implementation',
    assignee: 'Emily Taylor',
    progress: 90,
    dueDate: 'Apr 30, 2025',
    status: 'In Progress',
  },
]

const getInitials = (name) => {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
}
</script>

<style scoped></style>
