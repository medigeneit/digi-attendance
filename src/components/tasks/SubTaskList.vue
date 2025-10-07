<script setup>
import { mapAndFilterTask } from '@/libs/task-tree'
import { useAuthStore } from '@/stores/auth'
import { computed, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'
import OverlyModal from '../common/OverlyModal.vue'
import SearchInput from '../SearchInput.vue'
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
const search = ref('')
const taskStatus = ref('')

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
      }).filter((task) => {
        if (!search.value) {
          return true
        }

        return task?.title?.toUpperCase()?.includes(search.value?.toUpperCase())
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
          <div class="flex justify-between items-center gap-4">
            <h2 class="text-xl font-semibold text-gray-800">Sub Tasks</h2>

            <template v-if="props?.subTasks?.length > 0">
              <SearchInput
                v-model="search"
                class="w-full md:w-48 md:ml-auto h-8"
                :debounce-time="0"
              />

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
            </template>
          </div>

          <div class="flex flex-wrap items-center gap-2 mt-3" v-if="subTaskIsCreatable">
            <button class="btn-1 ml-auto" @click.prevent="() => goToAdd(parentId)">
              Add Sub Task
            </button>
          </div>
        </div>
      </template>
    </TaskList>

    <div
      v-if="filteredSubTasks?.length === 0 && treeLevel <= 2"
      class="border p-4 rounded text-center text-gray-500 italic"
    >
      No Sub Tasks
    </div>
  </div>
</template>
