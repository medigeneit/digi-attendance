<template>
  <div class="mt-3">
    <template v-for="(childTask, index) in childrenTasks" :key="childTask.id">
      <TaskTreeView
        :index="index"
        :task="childTask"
        class="mb-3"
        :hide-buttons="hideButtons"
        :hide-assigned-users="hideAssignedUsers"
        :tree-level="parentTreeLevel + 1"
        @editClick="(taskId) => emits('editClick', taskId)"
        @addClick="(taskId) => emits('addClick', taskId)"
        @employeeAssignClick="(taskId) => emits('employeeAssignClick', taskId)"
      >
        <template #item-end="{ task, level }">
          <slot name="treeItemEnd" :task="task" :level="level"></slot>
        </template>
      </TaskTreeView>
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

// @editClick="(taskId) => (editingId = taskId)"

const emits = defineEmits(['editClick', 'addClick', 'employeeAssignClick'])
</script>
