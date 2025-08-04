<script setup>
import { computed } from 'vue'

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
    <ul :class="{ 'text-gray-500 group-hover:text-gray-900': !isCurrentMonth }">
      <li class="flex items-center mb-2" v-for="task in limitedTaskList" :key="task.id">
        <i class="fad fa-tasks text-xs mr-2"></i>
        <span class="line-clamp-1"> {{ task.title }} </span>
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
