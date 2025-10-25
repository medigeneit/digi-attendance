div
<script setup>
// import Draggable from '@/components/common/Draggable.js'
// import draggable from 'vuedraggable'
import LoaderView from '@/components/common/LoaderView.vue'
import OverlyModal from '@/components/common/OverlyModal.vue'
import DepartmentChip from '@/components/DepartmentChip.vue'
import TaskAddForm from '@/components/tasks/TaskAddForm.vue'
import TaskEditForm from '@/components/tasks/TaskEditForm.vue'
import TaskHeader from '@/components/tasks/TaskHeader.vue'
import TaskUserAssignForm from '@/components/tasks/TaskUserAssignForm.vue'
import UserAvatar from '@/components/UserAvatar.vue'
import useTaskPriorityUpdate from '@/libs/task-priority'
import { useAuthStore } from '@/stores/auth'
import { useRequirementStore } from '@/stores/useRequirementStore'
import { useTaskStore } from '@/stores/useTaskStore'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import TaskTable from './TaskTable.vue'

const store = useTaskStore()
const requirementStore = useRequirementStore()
const route = useRoute()
const router = useRouter()
const state = ref('')
const editingId = ref(null)
const addForm = ref(false)
const authStore = useAuthStore()

const addFormData = reactive({
  parentId: 0,
  requirementId: 0,
})

const employeeAssignForm = reactive({
  taskId: 0,
  isOpen: false,
})

const taskUsers = computed(() => {
  const selectedUserIds = route.query['user-ids'] || null
  const userList = (store.tasks || []).flatMap((task) => {
    return selectedUserIds ? task.users?.filter((u) => selectedUserIds.includes(u.id)) : task.users
  })

  // Deduplicate by user.id
  const uniqueUsers = [...new Map(userList.map((user) => [user.id, user])).values()]

  return uniqueUsers.sort((userA, userB) => userA.id - userB.id)
})

const taskDepartmentGroups = computed(() => {
  return (store.tasks || []).reduce((deptGroups, task) => {
    const groupKey = `${task.from_department_id}-${task.to_department_id}`

    const foundGroup = deptGroups.find((g) => g.key == groupKey)

    if (!foundGroup) {
      deptGroups.push({
        key: groupKey,
        from_department: task.from_department,
        to_department: task.to_department,
        tasks: [task],
      })
    } else {
      foundGroup.tasks = [...foundGroup.tasks, task]
    }

    return deptGroups
  }, [])
})

const draggableTaskList = ref(null)
const queryLogs = ref([])

const { saveTaskPriority, listHasRearranged } = useTaskPriorityUpdate(() => store.taskListTree, 0)

onMounted(() => {
  console.log('Task List Mounted')
  state.value = 'loading'

  fetchTasks()
})

async function fetchTasks() {
  let data

  console.log({ name: route.name })

  if (route.name == 'RequirementTaskList') {
    await store.fetchAllTasks({
      ...route.query,
      ...{ page: 1 },
    })
  }

  if (route.name == 'MyRequirementTaskList') {
    await store.fetchAllMyTasks({
      ...route.query,
      ...{ page: 1 },
    })
  }

  state.value = ''
  queryLogs.value = data?.query_log || []
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

function getTaskListByUserId(userId) {
  return store.tasks.filter((task) => {
    // Check if any task inside this requirementDetail
    return (task.users || []).some((user) => user.id === userId)
  })
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
    } catch (err) {
      console.warn(err)
    }
  },
)

watch(
  () => authStore.isAdminMood,
  (adminMode) => {
    if (!adminMode) {
      router.push({ name: 'MyRequirementTaskList' })
    } else {
      router.push({ name: 'RequirementTaskList' })
    }
  },
  {
    immediate: true,
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

function getTaskRouterLink(task) {
  return {
    name: 'RequirementTaskShow',
    params: { id: task?.id || 0 },
  }
}
</script>

<template>
  <div class="my-container p-6 mt-2 relative bg-white rounded-md shadow-md min-h-[50vh]">
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
      :isMyTask="route.name === 'MyRequirementTaskList'"
      class="mb-6"
    />

    <template v-if="route?.query?.['query-log'] == 'true'">
      <div v-for="(log, ind) in queryLogs" :key="ind" class="text-xs text-gray-500">
        <div class="mb-4">{{ log.raw_query }}</div>
      </div>
    </template>

    <div v-if="requirementStore.error" class="text-center py-4 text-red-500">
      {{ requirementStore.error }}
    </div>

    <!-- <pre>{{ taskUsers }}</pre> -->
    <div class="relative min-h-[20vh]">
      <template v-if="route.query?.view === 'userwise'">
        <div
          v-for="user in taskUsers"
          :key="user.id"
          class="mt-8 rounded-md border-2 border-sky-300"
        >
          <div
            class="sticky top-14 z-40 text-gray-700 bg-gradient-to-tl from-sky-400/60 to-sky-400 py-2 px-4 flex items-center"
          >
            <div class="font-semibold flex items-center gap-2">
              <UserAvatar :user="user" />
              <div class="text-white text-base">{{ user.label }}</div>
            </div>
          </div>

          <div class="rounded-b-md overflow-y-auto">
            <TaskTable
              :tasks="getTaskListByUserId(user.id)"
              @editClick="(taskId) => (editingId = taskId)"
              @addClick="(taskId) => goToAdd(taskId)"
              @employeeAssignClick="(taskId) => openEmployeeAssignForm(taskId)"
              :taskLinkTo="
                (task) => {
                  return { name: 'RequirementTaskShow', params: { id: task?.id || 0 } }
                }
              "
            />
          </div>
        </div>
      </template>

      <template v-else>
        <div
          v-for="deptGroup in taskDepartmentGroups"
          :key="deptGroup.key"
          class="mt-8 rounded-md border-2 border-sky-300"
        >
          <div
            class="sticky top-14 z-40 text-gray-700 bg-gradient-to-tl from-sky-400/60 to-sky-400 py-2 px-4 flex items-center"
          >
            <div class="font-semibold flex items-center gap-2">
              <span class="text-white text-sm">From</span>
              <DepartmentChip :department="deptGroup.from_department" />
              <span class="text-white text-sm">To</span>
              <DepartmentChip :department="deptGroup.to_department" />
            </div>
          </div>

          <div class="rounded-b-md overflow-y-auto">
            <TaskTable
              :tasks="deptGroup.tasks"
              groupBy="requirement_details"
              @editClick="(taskId) => (editingId = taskId)"
              @addClick="(taskId) => goToAdd(taskId)"
              @employeeAssignClick="(taskId) => openEmployeeAssignForm(taskId)"
              :hideButtons="route?.name !== 'RequirementTaskList'"
              :taskLinkTo="getTaskRouterLink"
            />
          </div>
        </div>
      </template>

      <div
        v-if="state !== 'loading' && store.tasks?.length === 0"
        class="text-center py-4 text-gray-500 border h-[30vh] flex items-center justify-center rounded bg-gray-50 italic"
      >
        No tasks
      </div>
      <LoaderView
        v-if="state === 'loading'"
        class="absolute inset-0 flex items-center z-50 bg-opacity-60 h-full shadow-none border"
        :class="[store.tasks?.length === 0 ? 'justify-center' : '']"
      />
    </div>
  </div>
</template>
