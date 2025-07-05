<template>
  <div class="space-y-4">
    <h2 class="text-xl font-semibold">Tasks</h2>
    <!-- <pre>
      {{ taskListTree }}
    </pre> -->

    <div class="space-y-4">
      <div
        v-for="task in taskListTree"
        :key="task.id"
        class="rounded-lg border bg-white overflow-hidden"
      >
        <TaskTreeView :task="task" class="!border-0" hide-buttons />
      </div>
    </div>
  </div>
</template>

<script setup>
import TaskTreeView from '@/components/TaskTreeView.vue'
import { useTaskStore } from '@/stores/useTaskStore'
import { storeToRefs } from 'pinia'
import { onMounted } from 'vue'

const taskStore = useTaskStore()

const { tasks, taskListTree } = storeToRefs(taskStore)

onMounted(() => {
  taskStore.fetchTasks()
})
</script>
