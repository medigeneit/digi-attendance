<script setup>
import CommentModal from '@/components/CommentModal.vue'
// import Draggable from '@/components/common/Draggable.js'
// import draggable from 'vuedraggable'
import LoaderView from '@/components/common/LoaderView.vue'
import OverlyModal from '@/components/common/OverlyModal.vue'
import RequirementDetailItemWithTaskList from '@/components/tasks/RequirementDetailItemWithTaskList.vue'
import TaskAddForm from '@/components/tasks/TaskAddForm.vue'
import TaskEditForm from '@/components/tasks/TaskEditForm.vue'
import TaskHeader from '@/components/tasks/TaskHeader.vue'
import TaskUserAssignForm from '@/components/tasks/TaskUserAssignForm.vue'
import UserWiseList from '@/components/tasks/UserWiseList.vue'
import useTaskPriorityUpdate from '@/libs/task-priority'
import { mapAndFilterTask } from '@/libs/task-tree'
import { useAuthStore } from '@/stores/auth'
import { useRequirementStore } from '@/stores/useRequirementStore'
import { useTaskStore } from '@/stores/useTaskStore'
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const store = useTaskStore()
const requirementStore = useRequirementStore()
const auth = useAuthStore()
const route = useRoute()
const router = useRouter()
const state = ref('')
const showCommentModal = ref(false)
const userId = 1 // অ্যাকচুয়াল auth ইউজার আইডি
const selectedTaskId = ref(null)
const editingId = ref(null)
const addForm = ref(false)

const addFormData = reactive({
  parentId: 0,
  requirementId: 0,
})

const employeeAssignForm = reactive({
  taskId: 0,
  isOpen: false,
})

const draggableTaskList = ref(null)
const queryLogs = ref([])

const { saveTaskPriority, listHasRearranged } = useTaskPriorityUpdate(() => store.taskListTree, 0)

onMounted(() => {
  console.log('Task List Mounted')
  state.value = 'loading'
  if (!route.query['status']) {
    router.push({
      query: { ...route.query, status: 'not-completed' },
    })
  }
  fetchTasks()
})

let taskAbortController

async function fetchTasks() {
  let data

  taskAbortController = new AbortController()

  requirementStore.fetchRequirementsWithTasks()
  // console.log({ useRequirementStored, rr: requirementStore })

  if (route.name === 'MyTaskList') {
    data = await store.fetchMyTasks(
      { ...route.query, ...{ page: 1 } },
      { signal: taskAbortController.signal },
    )
  } else {
    data = await store.fetchTasks(
      { ...route.query, ...{ page: 1 } },
      { signal: taskAbortController.signal },
    )
  }

  state.value = ''
  queryLogs.value = data.query_log || []
}

const goToAdd = (parentId) => {
  //router.push({ name: 'TaskAdd' })
  addForm.value = true
  addFormData.parentId = parentId
}

const openEmployeeAssignForm = (taskId) => {
  employeeAssignForm.taskId = taskId
  employeeAssignForm.isOpen = true
}

const openComment = (id) => {
  selectedTaskId.value = id
  showCommentModal.value = true
}

const closeComment = () => {
  showCommentModal.value = false
  selectedTaskId.value = null
}

async function handleTaskUpdate() {
  editingId.value = null
  addForm.value = false
  addFormData.parentId = 0
  state.value = 'loading'
  await fetchTasks()
}

async function handleTaskAddClose() {
  addForm.value = false
  addFormData.parentId = 0
  await fetchTasks()
}

async function handleTaskPrioritySave() {
  state.value = 'loading'
  if (await saveTaskPriority()) {
    await fetchTasks()
  }
}

watch(
  () => ({
    ...route.query,
  }),
  async () => {
    try {
      store.resetTaskList()
      state.value = 'loading'
      await fetchTasks()
    } catch {
      console.warn('...')
    }
  },
)

const taskFilter = computed({
  get() {
    return { ...route.query }
  },
  set(value) {
    localStorage.removeItem('sub_task_opened_list')
    router.push({ query: { ...value } })
  },
})

const tasks = computed(() => {
  const filters = { ...route.query }
  if (route.name == 'MyTaskList') {
    filters['user-ids'] = auth?.user?.id
  }

  return Array.isArray(store.tasks) ? mapAndFilterTask(store.tasks, filters) : []
})

onUnmounted(() => {
  store.tasks.value = null

  if (taskAbortController) {
    taskAbortController.abort()
  }
})
</script>

<template>
  <div class="my-container p-6 mt-2 relative bg-white rounded-md shadow-md">
    <OverlyModal v-if="editingId">
      <TaskEditForm :taskId="editingId" @close="editingId = null" @updated="handleTaskUpdate" />
    </OverlyModal>

    <OverlyModal v-if="addForm">
      <TaskAddForm
        :parentTaskId="addFormData.parentId"
        :requirementId="addFormData.requirementId"
        @close="handleTaskAddClose"
        @taskCreated="handleTaskUpdate"
      />
    </OverlyModal>

    <OverlyModal v-if="employeeAssignForm.isOpen" class="*:max-w-4xl">
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
            state = 'loading'
            fetchTasks()
          }
        "
      />
    </OverlyModal>

    <TaskHeader
      v-model="taskFilter"
      @clickAddTask="goToAdd"
      @clickPrioritySave="handleTaskPrioritySave"
      @clickPriorityDiscard="() => (listHasRearranged ? draggableTaskList.resetItems : null)"
      :list-has-rearranged="listHasRearranged"
      :isMyTask="route.name === 'MyTaskList'"
    />

    <!-- {{ requirementStore.requirementDetails }} -->

    <template v-if="route?.query?.['query-log'] == 'true'">
      <div v-for="(log, ind) in queryLogs" :key="ind" class="text-xs text-gray-500">
        <div class="mb-4">{{ log.raw_query }}</div>
      </div>
    </template>

    <div>
      <RequirementDetailItemWithTaskList
        v-for="(detail, index) in requirementStore.requirementDetails"
        :key="detail.id"
        :index="index"
        :detail="detail"
        @commentButtonClick="openComment($event, task.id)"
        @editClick="(taskId) => (editingId = taskId)"
        @addClick="(taskId) => goToAdd(taskId)"
        @employeeAssignClick="(taskId) => openEmployeeAssignForm(taskId)"
      />
    </div>

    <hr />
    <div class="relative">
      <div v-if="store.error" class="text-center py-4 text-red-500">
        {{ store.error }}
      </div>

      <div v-else-if="store.tasks.length > 0">
        <UserWiseList
          v-if="route.query?.view == 'userwise'"
          :tasks="tasks"
          :selectedUserId="route.query['user-ids']"
          :isMyTask="route.name === 'MyTaskList'"
          @commentButtonClick="openComment($event, task.id)"
          @editClick="(taskId) => (editingId = taskId)"
          @addClick="(taskId) => goToAdd(taskId)"
          @employeeAssignClick="(taskId) => openEmployeeAssignForm(taskId)"
        />
      </div>

      <div
        v-else-if="state !== 'loading'"
        class="text-center py-4 text-gray-500 border h-[30vh] flex items-center justify-center text-xl rounded bg-gray-50"
      >
        No tasks found.
      </div>
      <LoaderView
        v-if="state === 'loading'"
        class="absolute inset-0 flex items-center z-50 bg-opacity-60"
      ></LoaderView>
    </div>

    <!-- Comment Modal -->
    <CommentModal
      :show="showCommentModal"
      :commentable-id="selectedTaskId"
      commentable-type="task"
      :user-id="userId"
      :on-close="closeComment"
      @submitted="store.fetchTasks"
    />
  </div>
</template>
