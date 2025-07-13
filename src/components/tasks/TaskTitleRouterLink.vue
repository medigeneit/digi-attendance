<script setup>
defineProps({ task: Object, subTasksOpen: { type: Boolean, default: false } })
</script>
<template>
  <div class="flex items-center gap-1">
    <i
      class="fad"
      :class="
        task?.children_task_count > 0
          ? {
              'fa-folder text-teal-800/70': !subTasksOpen,
              'fa-folder-open text-teal-400': subTasksOpen,
            }
          : 'fa-file-alt text-green-400'
      "
    ></i>
    <RouterLink
      :to="{
        name: 'TaskShow',
        params: { id: task.id },
      }"
      class="font-medium text-gray-700 cursor-pointer hover:text-sky-700"
    >
      <div>
        {{ task.title }}
      </div>
    </RouterLink>
  </div>
</template>
