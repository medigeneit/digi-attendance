<template>
  <div class="space-y-4">
    <h2 class="text-xl font-semibold">Project Requirements</h2>
    <div class="space-y-4">
      <div
        v-for="requirement in requirements"
        :key="requirement.id"
        class="rounded-lg border bg-white p-4 shadow hover:bg-gray-50 transition-colors"
      >
        <div class="flex items-start justify-between">
          <div class="space-y-1">
            <div class="flex items-center gap-2">
              <span class="text-xs font-medium text-gray-500">{{ requirement.id }}</span>
              <!-- <span
                class="text-xs font-semibold px-2 py-1 rounded text-white"
                :class="statusColor(requirement.status)"
              >
                {{ requirement.status }}
              </span> -->
              <span
                class="text-xs px-2 py-1 rounded border"
                :class="priorityColor(requirement.priority)"
              >
                {{ requirement.priority }}
              </span>
            </div>
            <h3 class="font-medium text-gray-800">{{ requirement.title }}</h3>
            <p class="text-sm text-gray-500">Project: {{ requirement.project?.name }}</p>
          </div>
          <div class="text-right">
            <div class="text-sm">
              <span class="font-medium">{{ requirement.completed_tasks_count }}</span>
              <span class="text-gray-500">/{{ requirement.tasks_count }} tasks</span>
            </div>
            <div class="mt-1 h-2 w-24 bg-gray-200 rounded">
              <div
                class="h-full bg-blue-500 rounded"
                :style="{
                  width: (requirement.completed_tasks_count / requirement.tasks_count) * 100 + '%',
                }"
              ></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useRequirementStore } from '@/stores/useRequirementStore'
import { storeToRefs } from 'pinia'
import { onMounted } from 'vue'

const requirementStore = useRequirementStore()

const { requirements } = storeToRefs(requirementStore)

onMounted(() => {
  requirementStore.fetchRequirements()
})

// const requirements = [
//   {
//     id: 'REQ-001',
//     title: 'User Authentication System',
//     project: 'E-commerce Platform',
//     status: 'Completed',
//     priority: 'High',
//     tasks: 5,
//     completedTasks: 5,
//   },
//   {
//     id: 'REQ-002',
//     title: 'Product Catalog Management',
//     project: 'E-commerce Platform',
//     status: 'In Progress',
//     priority: 'High',
//     tasks: 8,
//     completedTasks: 5,
//   },
//   {
//     id: 'REQ-003',
//     title: 'Shopping Cart Functionality',
//     project: 'E-commerce Platform',
//     status: 'Not Started',
//     priority: 'Medium',
//     tasks: 6,
//     completedTasks: 0,
//   },
// ]

const statusColor = (status) => {
  switch (status) {
    case 'Completed':
      return 'bg-green-600'
    case 'In Progress':
      return 'bg-yellow-500'
    case 'Not Started':
      return 'bg-gray-400'
  }
}

const priorityColor = (priority) => {
  switch (priority) {
    case 'High':
      return 'border-red-500 text-red-500'
    case 'Medium':
      return 'border-yellow-500 text-yellow-500'
    default:
      return 'border-gray-300 text-gray-500'
  }
}
</script>
