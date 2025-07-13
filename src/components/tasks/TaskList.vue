<script setup>
import TaskTreeView from '@/components/TaskTreeView.vue'
import DraggableList from '@/components/common/DraggableList.vue'
import useTaskPriorityUpdate from '@/libs/task-priority'
import { useAuthStore } from '@/stores/auth'
import { computed, ref } from 'vue'

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
  parentId: {
    type: Number,
    default: 0,
  },

  treeLevel: {
    type: Number,
    required: true,
  },
})

const auth = useAuthStore()

const priorityUpdatable = computed(() => {
  if (auth?.user?.role !== 'employee' && auth?.isAdminMood) {
    return true
  }
  return false
})

const emit = defineEmits(['commentButtonClick', 'editClick', 'addClick', 'updatePriority'])

const draggableTaskList = ref(null)

const { handleItemsPriorityUpdate, saveTaskPriority, listHasRearranged } = useTaskPriorityUpdate(
  () => props.tasks,
  props.parentId,
)

const handleTaskPrioritySave = async () => {
  await saveTaskPriority()
  emit('updatePriority')
}
</script>

<template>
  <div>
    <div class="mb-3">
      <slot name="task:header"></slot>
    </div>

    <template v-if="priorityUpdatable">
      <div v-if="listHasRearranged" class="flex gap-2 items-center mx-auto justify-center mb-2">
        <span class="text-red-500">Priority Changed</span>
        <button class="btn-3" @click.prevent="handleTaskPrioritySave">Save</button>
        <button class="btn-3" @click.prevent="draggableTaskList.resetItems">Discard</button>
      </div>
    </template>

    <div v-if="loading" class="text-center py-4 text-gray-500">Loading tasks...</div>

    <div v-else-if="error" class="text-center py-4 text-red-500">
      {{ error }}
    </div>

    <div v-else class="space-y-4">
      <DraggableList
        :items="tasks"
        handle="handle"
        @itemsUpdate="handleItemsPriorityUpdate"
        class="rounded-lg bg-white overflow-hidden space-y-3"
        ref="draggableTaskList"
        #item="{ item, index }"
      >
        <TaskTreeView
          :index="index"
          :task="item"
          :showDraggableHandle="priorityUpdatable"
          :tree-level="treeLevel"
          class="!border-0"
          @commentButtonClick="emit('commentButtonClick', item.id)"
          @editClick="(taskId) => emit('editClick', taskId)"
          @addClick="(taskId) => emit('addClick', taskId)"
          @employeeAssignClick="(taskId) => emit('employeeAssignClick', taskId)"
        />
      </DraggableList>

      <!-- <div
        v-for="task in tasks || []"
        :key="task.id"
        class="rounded-lg bg-white overflow-hidden space-y-4"
      >
        <TaskTreeView
          :task="task"
          class="!border-0"
          @commentButtonClick="emit('commentButtonClick', task.id)"
          @editClick="(taskId) => emit('editClick', taskId)"
          @addClick="(taskId) => emit('addClick', taskId)"
        />
      </div> -->
    </div>
  </div>
</template>
