<template>
  <div class="mb-4 border-b border-t p-3 group">
    <div class="items-start grid grid-cols-3">
      <div class="">
        <RouterLink
          :to="{
            name: 'TaskShow',
            params: { id: task.id },
          }"
          class="font-medium text-gray-700 cursor-pointer hover:text-sky-700"
        >
          {{ task.title }}
        </RouterLink>

        <p class="text-sm text-gray-500 mt-2" v-if="task?.requirement">
          Requirement: {{ task?.requirement?.title }}
        </p>

        <div class="flex items-center gap-2 text-xs text-gray-500 mt-2 opacity-50">
          <span
            class="px-2 py-0.5 text-xs rounded bg-blue-100 text-blue-800 border border-blue-200"
            >{{ task.status }}</span
          >
          <span class="text-xs px-2 py-0.5 rounded border" :class="priorityColor(task.priority)">
            {{ task.priority }}
          </span>
        </div>
      </div>

      <div class="flex items-start flex-wrap gap-3">
        <div
          class="flex items-center gap-2 border rounded-full px-1 py-0.5 bg-slate-100 shadow-sm"
          v-for="(item, index) in task.users"
          :key="index"
        >
          <div
            class="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium text-gray-600"
          >
            {{ getInitials(item?.name) }}
          </div>
          <span class="text-xs text-gray-700 mr-2">{{ item?.name }}</span>
        </div>
      </div>

      <div class="flex justify-end items-center">
        <!-- <div class="text-sm"><span>Status</span> <span>1/5</span></div> -->
      </div>
    </div>
    <div class="mt-4">
      <div class="flex items-center">
        <div
          class="flex gap-3 group"
          @click="task.children_tasks?.length > 0 ? (showSubTask = !showSubTask) : null"
        >
          <i
            v-if="showSubTask"
            class="fas fa-caret-down text-gray-400 group-hover:text-sky-400"
          ></i>
          <i v-else class="fas fa-caret-right text-gray-400 group-hover:text-sky-400"></i>
          <span :class="subTaskHeadingClass" class="text-xs text-gray-500">
            Sub Tasks ({{ task.children_tasks?.length }})
          </span>
        </div>
      </div>
      <div class="ml-6">
        <TaskTreeChildren v-if="showSubTask" :childrenTasks="task.children_tasks" />
      </div>
    </div>
  </div>
</template>

<script setup>
import TaskTreeChildren from '@/components/TaskTreeChildren.vue'
import { computed, ref } from 'vue'
const props = defineProps({
  task: { type: Object, required: true },
})

const showSubTask = ref(false)

const subTaskHeadingClass = computed(() => {
  return {
    'hover:underline hover:text-sky-400 cursor-pointer': props.task?.children_tasks?.length > 0,
    'cursor-default pointer-none': props.task?.children_tasks?.length === 0,
  }
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
