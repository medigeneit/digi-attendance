<script setup>
import LoaderView from '@/components/common/LoaderView.vue'
import OverlyModal from '@/components/common/OverlyModal.vue'
import DepartmentChip from '@/components/DepartmentChip.vue'
import RequirementAttachmentShow from '@/components/requirements/RequirementAttachmentShow.vue'
import TaskAddForm from '@/components/tasks/TaskAddForm.vue'
import TaskEditForm from '@/components/tasks/TaskEditForm.vue'
import TaskUserAssignForm from '@/components/tasks/TaskUserAssignForm.vue'
import UserAvatar from '@/components/UserAvatar.vue'
import useTaskPriorityUpdate from '@/libs/task-priority'
import { useAuthStore } from '@/stores/auth'
import { useRequirementStore } from '@/stores/useRequirementStore'
import { useTaskStore } from '@/stores/useTaskStore'
import TaskTable from '@/views/private-pages/tasks/TaskTable.vue'
import { computed, onMounted, reactive, ref, watch } from 'vue'

const props = defineProps({
  taskFilters: { type: Object, default: () => ({}) },
  showOnlyMyTasks: { type: Boolean, default: false },
  inContainer: { type: Boolean, default: true },
})

const emit = defineEmits(['update:taskFilters', 'loading'])

const store = useTaskStore()
const requirementStore = useRequirementStore()
const state = ref('')
const editingId = ref(null)
const addForm = ref(false)
const authStore = useAuthStore()

const reqAttachShow = reactive({ show: false, attachments: [] })

const addFormData = reactive({ parentId: 0, requirementId: 0, params: {} })

const employeeAssignForm = reactive({ taskId: 0, isOpen: false })

const taskUsers = computed(() => {
  const selectedUserIds = props.taskFilters['user-ids'] || null
  const userList = (store.tasks || []).flatMap((task) => {
    return selectedUserIds ? task.users?.filter((u) => selectedUserIds.includes(u.id)) : task.users
  })

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
  state.value = 'loading'

  fetchTasks()
})

async function fetchTasks() {
  emit('loading', true)
  if (props.showOnlyMyTasks) {
    await store.fetchAllMyTasks({ ...props.taskFilters,  page: 1 })
  } else {
    await store.fetchAllTasks({ ...props.taskFilters,  page: 1 })
  }
  emit('loading', false)
  state.value = ''
  queryLogs.value = store.query_log || []
}

const goToAdd = (params, readonlyValues) => {
  addForm.value = true
  addFormData.params = params
  addFormData.readonlyValues = readonlyValues
}

const openEmployeeAssignForm = (taskId) => {
  employeeAssignForm.taskId = taskId
  employeeAssignForm.isOpen = true
}

async function handleTaskUpdate() {
  editingId.value = null
  addForm.value = false
  state.value = 'loading'
  addFormData.params = {}
  await fetchTasks()
}

async function handleTaskAddClose() {
  addForm.value = false
  addFormData.params = {}
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
    return (task.users || []).some((user) => user.id === userId)
  })
}

watch(
  () => ({ ...props.taskFilters }),
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

// expose methods so parent wrapper (page) can control the list (open add modal, save/discard priority)
function openAdd(params, readonlyValues) {
  goToAdd(params, readonlyValues)
}

function savePriority() {
  return handleTaskPrioritySave()
}

function discardPriority() {
  if (listHasRearranged && draggableTaskList.value && draggableTaskList.value.resetItems) {
    return draggableTaskList.value.resetItems()
  }
  return null
}

defineExpose({ openAdd, savePriority, discardPriority })

function getTaskRouterLink(task) {
  return { name: 'RequirementTaskShow', params: { id: task?.id || 0 } }
}
const wrapperClass = computed(() =>
  props.inContainer
    ? 'p-6 mt-2 container mx-auto relative bg-white rounded-md shadow-md min-h-[calc(100vh-12rem)]'
    : '',
)
</script>

<template>
  <div :class="wrapperClass">
    <OverlyModal v-if="editingId">
      <TaskEditForm :taskId="editingId" @close="editingId = null" @updated="handleTaskUpdate" />
    </OverlyModal>

    <OverlyModal v-if="addForm">
      <TaskAddForm
        :parentTaskId="addFormData.parentId"
        :requirementId="addFormData.params?.requirement_id"
        :requirementDetailId="addFormData.params?.requirement_detail_id"
        :default-values="addFormData.params"
        :readonly-fields="addFormData.readonlyValues"
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

    <!-- TaskHeader moved to page wrapper; header controls live in the parent page. -->

    <template v-if="props.taskFilters?.['query-log'] == 'true'">
      <div v-for="(log, ind) in queryLogs" :key="ind" class="text-xs text-gray-500">
        <div class="mb-4">{{ log.raw_query }}</div>
      </div>
    </template>

    <div v-if="requirementStore.error" class="text-center py-4 text-red-500">
      {{ requirementStore.error }}
    </div>

    <div class="relative min-h-[60vh]">
      <div v-if="props.taskFilters?.view === 'userwise'" class="space-y-6">
        <div v-for="user in taskUsers" :key="user.id" class="rounded-md border-2 border-sky-300">
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
              @clickAttachment="
                (attachments) => {
                  reqAttachShow.show = true
                  reqAttachShow.attachments = attachments
                }
              "
              :taskLinkTo="
                (task) => ({ name: 'RequirementTaskShow', params: { id: task?.id || 0 } })
              "
            />
          </div>
        </div>
      </div>

      <div v-else class="space-y-6">
        <div
          v-for="deptGroup in taskDepartmentGroups"
          :key="deptGroup.key"
          class="rounded-md border-2 border-sky-300"
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
            <div class="ml-auto">
              <button
                v-if="
                  !props.showOnlyMyTasks &&
                  authStore?.user?.department_id == deptGroup?.to_department?.id
                "
                @click="
                  () =>
                    goToAdd(
                      {
                        from_department_id: deptGroup?.from_department?.id,
                        to_department_id: deptGroup?.to_department?.id,
                      },
                      {
                        from_department_id: true,
                        to_department_id: true,
                      },
                    )
                "
                class="btn-3 h-6 whitespace-nowrap bg-white border-white px-2"
              >
                Add Task
              </button>
            </div>
          </div>

          <div class="rounded-b-md overflow-y-auto">
            <TaskTable
              :tasks="deptGroup.tasks"
              groupBy="requirement"
              @editClick="(taskId) => (editingId = taskId)"
              @clickAddTask="(params, readonlyValues) => goToAdd(params, readonlyValues)"
              @employeeAssignClick="(taskId) => openEmployeeAssignForm(taskId)"
              @clickAttachment="
                (attachments) => {
                  reqAttachShow.show = true
                  reqAttachShow.attachments = attachments
                }
              "
              :hideButtons="props.showOnlyMyTasks"
              :taskLinkTo="getTaskRouterLink"
            />
          </div>
        </div>
      </div>

      <div
        v-if="state !== 'loading' && store.tasks?.length === 0"
        class="text-center py-4 text-gray-500 border h-[60vh] flex items-center justify-center rounded bg-gray-50 italic"
      >
        No tasks
      </div>
      <LoaderView
        v-if="state === 'loading'"
        class="absolute inset-0 flex items-center z-50 bg-opacity-60 h-full shadow-none border"
        :class="[store.tasks?.length === 0 ? 'justify-center' : '']"
      />
    </div>
    <OverlyModal v-if="reqAttachShow.show">
      <RequirementAttachmentShow
        :attachments="reqAttachShow.attachments || []"
        @clickClose="reqAttachShow.show = false"
      />
    </OverlyModal>
  </div>
</template>
