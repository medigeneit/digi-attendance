<template>
  <div>
    <template v-for="childTask in childrenTasks" :key="childTask.id">
      <TaskTreeView :task="childTask" />
    </template>
  </div>
</template>

<script setup>
import TaskTreeView from '@/components/TaskTreeView.vue'

const props = defineProps({
  childrenTasks: { type: Array, required: true, default: [] },
})
</script>
