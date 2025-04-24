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
        <p class="text-sm text-gray-500 mb-1">Company: {{ project?.company?.name }}</p>
        <p class="text-sm text-gray-500 mb-1">
          Total Requirements: {{ project?.requirements_count }}
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useProjectStore } from '@/stores/useProjectStore'
import { storeToRefs } from 'pinia'
import { onMounted } from 'vue'

const projectStore = useProjectStore()

const { projects } = storeToRefs(projectStore)

onMounted(() => {
  projectStore.fetchProjects()
})

// const projects = [
//   {
//     name: 'E-commerce Platform',
//     total: 18,
//     completed: 12,
//     dueDate: 'May 15, 2025',
//     priority: 'High',
//     priorityClass: 'bg-red-500',
//   },
//   {
//     name: 'CRM Integration',
//     total: 15,
//     completed: 13,
//     dueDate: 'Apr 30, 2025',
//     priority: 'High',
//     priorityClass: 'bg-red-500',
//   },
//   {
//     name: 'Analytics Dashboard',
//     total: 20,
//     completed: 6,
//     dueDate: 'Jul 5, 2025',
//     priority: 'Medium',
//     priorityClass: 'bg-yellow-500',
//   },
// ]
</script>
