<script setup>
import { useTaskStore } from '@/stores/useTaskStore'
import { ref } from 'vue'
import TaskSelectionInput from '../tasks/TaskSelectionInput.vue'

const props = defineProps({
  fromDepartmentId: {
    type: Number,
  },
  requirementDetail: {
    type: Object,
  },
})

const emit = defineEmits(['addNewTaskClick', 'cancelClick', 'assignTask'])
const taskStore = useTaskStore()
const assignType = ref('')
const selectedTask = ref(null)

const taskId = ref('')
const taskListShown = ref(false)

async function handleAssignClick() {
  await taskStore.setTaskRequirement(taskId.value, props.requirementDetail.id)
  emit('assignTask')
}
</script>
<template>
  <div class="text-left p-4">
    <div class="flex items-center gap-6 justify-center my-16">
      <button @click.prevent="emit('addNewTaskClick')" class="btn-3">Add New Task</button>

      <span>or</span>
      <button
        :class="{
          'btn-3': assignType !== 'direct-assign',
          'btn-2': assignType == 'direct-assign',
        }"
        @click.prevent="() => (assignType = 'direct-assign')"
      >
        Assign Task
      </button>
    </div>

    <div class="border rounded-md" v-if="assignType && !selectedTask">
      <form @submit.prevent="handleAssignClick" class="p-4 flex items-end">
        <TaskSelectionInput
          class="flex-grow mr-4 h-12"
          v-model:taskId="taskId"
          v-model:show="taskListShown"
          :isOnlyMyTask="false"
          :taskQueryParams="{ 'from-department-id': fromDepartmentId }"
          :filterTasks="(task) => !task.requirement_detail_id"
          @addNewTaskClick="emit('addNewTaskClick')"
        />
        <div class="flex justify-center">
          <button class="btn-2 h-12 rounded-md">Save</button>
        </div>
      </form>
    </div>
  </div>
</template>
