<template>
  <div>
    <template v-for="childTask in childrenTasks" :key="childTask.id">
      <TaskTreeView :task="childTask" class="mb-3 shadow-sm" :hide-buttons="hideButtons" />
    </template>
  </div>
</template>

<script setup>
import TaskTreeView from '@/components/TaskTreeView.vue'

const props = defineProps({
  childrenTasks: { type: Array, required: true, default: [] },
  hideButtons: { type: Boolean, default: false },
})
</script>
