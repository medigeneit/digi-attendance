<script setup>
import TaskTitle from '../tasks/TaskTitle.vue'

const props = defineProps({
  task: Object,
  level: Number,
  selected: { type: [Number, String], default: null },
})

const emit = defineEmits(['select'])
</script>
<template>
  <div
    class="px-2 border-b py-1 h-12 over text-sm relative group/main cursor-pointer flex items-center"
    :class="[
      task.id == selected ? 'text-red-50 bg-sky-500 px-2' : 'hover:bg-blue-50 hover:text-blue-500',
    ]"
    @click.prevent="() => emit('select', task)"
    :title="task.title"
  >
    <div :class="['line-clamp-1 mr-4 ']">{{ task.id }} - <TaskTitle :title="task.title" /></div>
    <button class="border btn-2 ml-auto" v-if="task.id != selected">Select</button>
  </div>
</template>
