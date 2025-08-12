<script setup>
import { mapAndFilterTask } from '@/libs/task-tree'
import { useAuthStore } from '@/stores/auth'
import { computed, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'
import OverlyModal from '../common/OverlyModal.vue'
import TaskAddForm from './TaskAddForm.vue'
import TaskEditForm from './TaskEditForm.vue'
import TaskList from './TaskList.vue'
import TaskUserAssignForm from './TaskUserAssignForm.vue'

const props = defineProps({
  subTasks: Array,
  parentId: { type: Number, required: true },
  treeLevel: { type: Number, required: true },
  subTaskIsCreatable: { type: Boolean, default: true },
})

const route = useRoute()
const auth = useAuthStore()
const employeeAssignForm = reactive({
  taskId: 0,
  isOpen: false,
})

const taskStatus = ref('not-completed')

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

const filteredSubTasks = computed(() => {
  return Array.isArray(props.subTasks)
    ? mapAndFilterTask(props.subTasks, {
        status: taskStatus.value,
        ...(route.name == 'MyTaskShow'
          ? {
              ['user-ids']: auth?.user?.id,
            }
          : {}),
      })
    : []
})
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
      :tasks="filteredSubTasks"
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
            <h2 class="text-xl font-semibold text-gray-800">Sub Tasks</h2>

            <div class="w-32 relative h-8 mx-4">
              <label class="absolute text-xs left-3 -top-1.5 bg-slate-100 text-blue-500"
                >Status</label
              >
              <select
                v-model="taskStatus"
                class="h-8 text-xs px-2 text-gray-600 border-2 border-gray-400 rounded-md w-full"
              >
                <option value="">--ALL TASKS--</option>
                <option value="not-completed">Not Completed</option>
                <option value="only-completed">Completed</option>
              </select>
            </div>
          </div>

          <div class="flex flex-wrap items-center gap-2 mt-3" v-if="subTaskIsCreatable">
            <button class="btn-1 ml-auto" @click.prevent="() => goToAdd(parentId)">
              Add Sub Task
            </button>
          </div>
        </div>
      </template>
    </TaskList>
  </div>
</template>
