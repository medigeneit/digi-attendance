<script setup>
import TaskTreeView from '@/components/TaskTreeView.vue'

const props = defineProps({
  tasks: {
    default: null,
    type: Array,
  },
  loading: {
    default: false,
    type: Boolean,
  },
  error: {
    default: '',
    type: String,
  },
})

const emit = defineEmits(['commentButtonClick', 'editClick', 'addClick'])
</script>

<template>
  <div>
    <div class="mb-3">
      <slot name="task:header"></slot>
    </div>

    <div v-if="loading" class="text-center py-4 text-gray-500">Loading tasks...</div>

    <div v-else-if="error" class="text-center py-4 text-red-500">
      {{ error }}
    </div>

    <div v-else class="space-y-4">
      <div
        v-for="task in tasks || []"
        :key="task.id"
        class="rounded-lg border bg-white overflow-hidden"
      >
        <TaskTreeView
          :task="task"
          class="!border-0"
          @commentButtonClick="emit('commentButtonClick', task.id)"
          @editClick="(taskId) => emit('editClick', taskId)"
          @addClick="(taskId) => emit('addClick', taskId)"
        />
      </div>
    </div>
  </div>
</template>
