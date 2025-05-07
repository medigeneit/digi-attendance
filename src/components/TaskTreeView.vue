<template>
  <div class="mb-6 rounded border-b p-3">
    <div class="flex items-start justify-between">
      <div class="space-y-1">
        <div class="flex items-center gap-2 text-xs text-gray-500">
          <span class="font-medium">PI: {{ task.parent_id }}</span>
          <span class="font-medium">{{ task.id }}</span>
          <span class="px-2 py-0.5 rounded bg-blue-100 text-blue-800">{{ task.status }}</span>
        </div>
        <h3 class="font-medium text-gray-800">{{ task.title }}</h3>
        <p class="text-sm text-gray-500" v-if="task?.requirement">
          Requirement: {{ task?.requirement?.title }}
        </p>
        <div class="mt-2 flex items-center gap-2" v-for="(item, index) in task.users" :key="index">
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
    <div class="ml-10 mt-4">
      <div>Sub Tasks ({{ task.children_tasks?.length }})</div>
      <TaskTreeChildren :childrenTasks="task.children_tasks" />
    </div>
  </div>
</template>

<script setup>
import TaskTreeChildren from '@/components/TaskTreeChildren.vue'
const props = defineProps({
  task: { type: Object, required: true },
})

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
