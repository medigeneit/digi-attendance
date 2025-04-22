<template>
  <div class="space-y-4">
    <h2 class="text-xl font-semibold">Project Overview</h2>
    <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <div
        v-for="project in projects"
        :key="project.name"
        class="rounded-lg border bg-white p-4 shadow hover:shadow-md transition-shadow"
      >
        <div class="flex justify-between items-center mb-2">
          <h3 class="font-medium text-gray-800">{{ project.name }}</h3>
          <span class="text-xs px-2 py-1 rounded text-white" :class="project.priorityClass">
            {{ project.priority }}
          </span>
        </div>
        <p class="text-sm text-gray-500 mb-1">Due: {{ project.dueDate }}</p>
        <div class="text-sm">Tasks: {{ project.completed }} / {{ project.total }}</div>
        <div class="mt-2 h-2 w-full bg-gray-200 rounded">
          <div
            class="h-full bg-blue-600 rounded"
            :style="{ width: (project.completed / project.total) * 100 + '%' }"
          ></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
const projects = [
  {
    name: 'E-commerce Platform',
    total: 18,
    completed: 12,
    dueDate: 'May 15, 2025',
    priority: 'High',
    priorityClass: 'bg-red-500',
  },
  {
    name: 'CRM Integration',
    total: 15,
    completed: 13,
    dueDate: 'Apr 30, 2025',
    priority: 'High',
    priorityClass: 'bg-red-500',
  },
  {
    name: 'Analytics Dashboard',
    total: 20,
    completed: 6,
    dueDate: 'Jul 5, 2025',
    priority: 'Medium',
    priorityClass: 'bg-yellow-500',
  },
]
</script>
