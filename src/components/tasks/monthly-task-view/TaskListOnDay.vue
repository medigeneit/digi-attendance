<script setup>
import TaskTreeView from '@/components/TaskTreeView.vue'
import { computed } from 'vue'
import { RouterLink } from 'vue-router'

const props = defineProps({
  isCurrentMonth: { type: Boolean, default: false },
  tasks: { type: Array, default: () => [] },
  limit: { type: Number, default: null },
  tree: { type: Boolean, default: false },
})

const emit = defineEmits(['clickOnMore'])

const limitedTaskList = computed(() => {
  if (!props.limit) {
    return [...props.tasks]
  }

  return props?.tasks?.slice(0, props.limit) || []
})
</script>
<template>
  <div>
    <div v-if="tree">
      <TaskTreeView
        v-for="task in limitedTaskList"
        hide-buttons
        hide-assigned-users
        :task="task"
        :key="task.id"
        class="mb-6"
      />
    </div>

    <ul v-else :class="{ 'text-gray-500 group-hover:text-gray-900': !isCurrentMonth }">
      <li class="mb-2" v-for="task in limitedTaskList" :key="task.id">
        <RouterLink
          :to="`/tasks/${task.id}`"
          target="_blank"
          class="flex items-center hover:underline hover:text-blue-600"
        >
          <i class="fad fa-folder text-xs mr-2" v-if="task.children_task_count > 0"></i>
          <i class="fad fa-file-alt text-xs mr-2" v-if="task.children_task_count == 0"></i>
          <span class="line-clamp-1" :class="{ 'text-red-800': task.deadline_crossed }">
            {{ task.title }}
          </span>
        </RouterLink>
        <!-- <div>{{ task.deadline_crossed }}</div> -->
      </li>
    </ul>

    <div
      class="text-center w-full mt-4 text-xs text-gray-600"
      v-if="tasks.length - limitedTaskList.length > 0"
    >
      <button @click.prevent="emit('clickOnMore', $event)" class="text-blue-600 hover:underline">
        +{{ tasks.length - limitedTaskList.length }} More Tasks
      </button>
    </div>
  </div>
</template>
