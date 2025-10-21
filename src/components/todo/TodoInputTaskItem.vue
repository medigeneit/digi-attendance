<script setup>
defineProps({
  task: Object,
  level: Number,
  selected: { type: [Number, String], default: null },
})

const emit = defineEmits(['select'])
</script>
<template>
  <div
    class="px-2 border-b py-3 over text-sm relative"
    :class="[task.id == selected ? 'text-red-50 bg-sky-500 px-2' : 'hover:text-blue-500']"
  >
    <div class="flex items-center py-1">
      <div :class="['line-clamp-2 mr-4 ']">{{ task.id }} - {{ task.title }}</div>
      <button
        class="border btn-2 ml-auto"
        @click.prevent="() => emit('select', task)"
        v-if="task.id != selected"
      >
        Select
      </button>
    </div>
  </div>
</template>
