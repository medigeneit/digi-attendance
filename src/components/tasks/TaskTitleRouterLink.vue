<script setup>
import { computed } from 'vue'

const props = defineProps({
  task: Object,
  subTasksOpen: { type: Boolean, default: false },
  isMyTask: { type: Boolean, default: false },
  titleClass: { type: String, default: '' },
  to: { type: Function, default: null },
})

const routerTo = computed(() => {
  return typeof props.to == 'function'
    ? props.to(props.task)
    : {
        name: props.isMyTask ? 'MyTaskShow' : 'TaskShow',
        params: { id: props.task.id },
      }
})
</script>
<template>
  <div class="flex items-center gap-2">
    <!-- <i
      class="fad"
      :class="
        task?.children_task_count > 0
          ? {
              'fa-folder text-blue-800/70': !subTasksOpen,
              'fa-folder-open text-blue-400': subTasksOpen,
            }
          : 'fa-file-alt text-gray-400'
      "
    ></i> -->
    <RouterLink
      :to="routerTo"
      :title="task.title"
      class="text-gray-700 cursor-pointer hover:text-blue-700 whitespace-normal line-clamp-1 w-full"
      :class="titleClass"
    >
      <div>
        {{ task.title }}
      </div>
    </RouterLink>
  </div>
</template>
