<script setup>
defineProps({
  task: Object,
  subTasksOpen: { type: Boolean, default: false },
  isMyTask: { type: Boolean, default: false },
})
</script>
<template>
  <div class="flex items-center gap-2">
    <i
      class="fad"
      :class="
        task?.children_task_count > 0
          ? {
              'fa-folder text-blue-800/70': !subTasksOpen,
              'fa-folder-open text-blue-400': subTasksOpen,
            }
          : 'fa-file-alt text-gray-400'
      "
    ></i>
    <RouterLink
      :to="{
        name: isMyTask ? 'MyTaskShow' : 'TaskShow',
        params: { id: task.id },
      }"
      class="font-medium text-gray-700 cursor-pointer hover:text-blue-700"
    >
      <div>
        {{ task.title }}
      </div>
    </RouterLink>
  </div>
</template>
