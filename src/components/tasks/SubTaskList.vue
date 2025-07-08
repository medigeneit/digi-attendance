<script setup>
import { reactive, ref } from 'vue'
import OverlyModal from '../common/OverlyModal.vue'
import TaskAddForm from './TaskAddForm.vue'
import TaskEditForm from './TaskEditForm.vue'
import TaskList from './TaskList.vue'
import TaskUserAssignForm from './TaskUserAssignForm.vue'

const props = defineProps({
  subTasks: Array,
  parentId: { type: Number, required: true },
  treeLevel: { type: Number, required: true },
})

const employeeAssignForm = reactive({
  taskId: 0,
  isOpen: false,
})

const emit = defineEmits(['created', 'error', 'updatePriority', 'assignUser'])

const editingId = ref()

const addForm = reactive({
  show: false,
  parentId: props.parentId,
  requirementId: null,
})

const goToAdd = (parentId) => {
  addForm.show = true
  addForm.parentId = parentId

  console.log({ addForm })
}

function handleTaskCreate() {
  addForm.show = false
  addForm.parentId = props.parentId
  emit('created')
}

function handleUserAssignUpdate() {
  emit('assignUser')
}

function handleTaskUpdate() {
  editingId.value = false
  emit('updated')
}

function handleTaskAddClose() {
  addForm.show = false
  addForm.parentId = props.parentId
}
</script>
<template>
  <div>
    <OverlyModal v-if="editingId">
      <TaskEditForm :taskId="editingId" @close="editingId = null" @updated="handleTaskUpdate" />
    </OverlyModal>
    <OverlyModal v-if="addForm.show">
      <TaskAddForm
        :parentTaskId="addForm.parentId"
        :requirementId="addForm.requirementId"
        @task-created="handleTaskCreate"
        @error="handleTaskError"
        @close="handleTaskAddClose"
      />
    </OverlyModal>

    <OverlyModal v-if="employeeAssignForm.isOpen">
      <TaskUserAssignForm
        :taskId="employeeAssignForm.taskId"
        @cancelClick="
          () => {
            employeeAssignForm.isOpen = false
            employeeAssignForm.taskId = 0
          }
        "
        @success="
          () => {
            employeeAssignForm.isOpen = false
            employeeAssignForm.taskId = 0
            handleUserAssignUpdate()
          }
        "
      />
    </OverlyModal>

    <TaskList
      :tasks="subTasks"
      :parentId="parentId"
      :treeLevel="treeLevel"
      @addClick="(taskId) => goToAdd(taskId)"
      @editClick="(taskId) => (editingId = taskId)"
      @updatePriority="emit('updatePriority')"
      @employeeAssignClick="
        (taskId) => {
          employeeAssignForm.taskId = taskId
          employeeAssignForm.isOpen = true
        }
      "
    >
      <template #task:header>
        <div class="flex justify-between mt-5">
          <div class="flex justify-between items-center">
            <h2 class="text-2xl font-bold text-gray-800">Sub Tasks</h2>
          </div>

          <div class="flex flex-wrap items-center gap-2 mt-3">
            <button class="btn-1 ml-auto" @click.prevent="() => goToAdd(parentId)">
              Add Sub Task
            </button>
          </div>
        </div>
      </template>
    </TaskList>
  </div>
</template>
