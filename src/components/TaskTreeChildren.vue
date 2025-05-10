<template>
  <div class="mt-3">
    <template v-for="childTask in childrenTasks" :key="childTask.id">
      <TaskTreeView
        :task="childTask"
        class="mb-3"
        :hide-buttons="hideButtons"
        :tree-level="parentTreeLevel + 1"
      />
    </template>
  </div>
</template>

<script setup>
import TaskTreeView from '@/components/TaskTreeView.vue'

const props = defineProps({
  childrenTasks: { type: Array, required: true, default: [] },
  hideButtons: { type: Boolean, default: false },
  parentTreeLevel: { type: Number },
})
</script>
