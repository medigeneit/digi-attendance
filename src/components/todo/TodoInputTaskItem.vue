<script setup>
defineProps({
  task: Object,
  level: Number,
  selected: Number,
})

const emit = defineEmits(['select'])
</script>
<template>
  <div class="px-2 border-b py-3 over text-sm relative">
    <div class="flex items-center py-1">
      <div
        :class="[
          'line-clamp-2 mr-4 ',
          { 'text-red-50 bg-green-800 px-2': task.id == selected },
          { 'hover:text-blue-500': task.id != selected },
        ]"
      >
        {{ task.id }} - {{ task.title }}
      </div>
      <button class="border btn-2 ml-auto" @click.prevent="() => emit('select', task)">
        Select
      </button>
    </div>
    <slot
      name="children"
      v-if="task?.children_tasks?.length"
      :childrenTasks="task?.children_tasks"
      :level="level + 1"
    >
    </slot>
  </div>
</template>
