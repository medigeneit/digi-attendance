<script setup>
import LoaderView from '@/components/common/LoaderView.vue'
import OverlyModal from '@/components/common/OverlyModal.vue'
import DepartmentChip from '@/components/DepartmentChip.vue'
import DescriptionView from '@/components/DescriptionView.vue'
import TaskAssignedUsers from '@/components/tasks/TaskAssignedUsers.vue'
import { default as TaskDeletingFrom } from '@/components/tasks/TaskDeletingFrom.vue'
import TaskStatus from '@/components/tasks/TaskStatus.vue'
import TaskStatusManager from '@/components/tasks/TaskStatusManager.vue'
import TaskUserDateUpdate from '@/components/tasks/TaskUserDateUpdate.vue'
import TodoItemCard from '@/components/todo/TodoItemCard.vue'
import UserAvatar from '@/components/UserAvatar.vue'
import { getDisplayDate, getDisplayDateTime } from '@/libs/datetime'
import { scrollToID } from '@/libs/dom'
import { useAuthStore } from '@/stores/auth'
import { useTaskStore } from '@/stores/useTaskStore'
import { useTodoDateStore } from '@/stores/useTodoDateStore'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import TodoCreateEditShow from '../todos/TodoCreateEditShow.vue'
import TaskTimeline from './TaskTimeline.vue'

const store = useTaskStore()
const authStore = useAuthStore()
const todoDateStore = useTodoDateStore()
const route = useRoute()
const router = useRouter()
const state = ref('')

// const subTasks = computed(() => taskTree.getTaskListTree())
const taskDeleting = reactive({
  open: false,
  task: null,
})

onMounted(async () => {
  state.value = 'loading'
  await fetchTask(route.params.id)
  state.value = ''
  if (route.hash == '#sub-tasks') {
    setTimeout(() => scrollToID(route.hash, 66), 0)
  }
})

const dateUpdateModal = reactive({
  user: null,
  type: '',
})

async function fetchTask(taskId) {
  await store.fetchTask(taskId, { with_todos: 'true' })
}

async function handleUpdateDate() {
  await fetchTask(route.params.id)
  dateUpdateModal.user = null
  dateUpdateModal.type = ''
}

const goToEdit = (id) => {
  router.push({ name: 'TaskEdit', params: { id } })
}

const backLink = computed(() => {
  if (!store.task) {
    return null
  }

  if (store.task?.parent_id == 0) {
    return { name: isMyTask.value ? 'MyTaskList' : 'TaskList' }
  }

  return {
    params: {
      id: store.task?.parent_id,
    },
    query: { ['is-my-task']: isMyTask.value },
  }
})

function handleDeleteSuccess() {
  taskDeleting.open = false
  console.log({ STATE: 'Deleted', backLink: backLink.value })
  router.push(backLink.value)
}

const isMyTask = computed(() => route.name == 'MyTaskShow' || !!route.query['is-my-task'])

// const getBreadCrumbFromTask = (task, is_current_page = false) => {
//   return {
//     id: task?.id,
//     title: task?.title,
//     status: task?.status,
//     is_current_page,
//   }
// }

const authUserHasTaskAssigned = computed(() => {
  return store?.task?.users?.find((u) => authStore.user?.id == u.id)
})

const breadcrumbTaskItems = computed(() => {
  const parents = []

  if (store.task?.requirement_detail?.id) {
    parents.push({
      id: store.task?.requirement_detail?.id,
      title: store.task?.requirement_detail?.title,
      // status: store.task?.status,
      is_current_page: false,
    })
  }

  parents.push({
    id: store.task?.id,
    title: store.task?.title,
    // status: store.task?.status,
    is_current_page: true,
  })
  return parents

  // return [...parents.reverse(), ...[getBreadCrumbFromTask(store.task, true)]]
})

watch(
  () => route.params.id,
  async (taskId) => {
    state.value = 'changing'
    await fetchTask(taskId)
    state.value = ''
  },
)

watch(
  () => route.hash,
  async function () {
    setTimeout(() => scrollToID(route.hash, 66), 0)
  },
)

const todoModal = ref({
  action: null,
})

const groupWiseTodoDates = computed(() => {
  const items = store?.task_todo_dates || []

  const grouped = items.reduce((acc, item) => {
    const date = item.date
    if (!acc[date]) acc[date] = []
    acc[date].push(item)
    return acc
  }, {})

  return Object.keys(grouped)
    .sort((a, b) => new Date(b) - new Date(a)) // ascending sort by date
    .map((date) => ({
      date,
      todo_dates: grouped[date],
    }))
})

function handleTodoUpdate() {
  todoModal.value = { ...todoModal.value, action: '' }
  // fetchTodos()
  fetchTask(route.params.id)
}

function handleTodoDateUpdate() {
  todoModal.value = { ...todoModal.value, action: '' }
  fetchTask(route.params.id)
}

function handleClickEditTodo(todo) {
  console.log({ todo })

  todoModal.value = {
    ...todoModal.value,
    action: 'edit',
    todo,
  }
}

function addTodoDate(todoId, yearMonthDay) {
  console.log({ yearMonthDay, todoId })

  todoModal.value = {
    ...todoModal.value,
    action: 'addDate',
    date: yearMonthDay,
    todo_id: todoId,
    formReadonlyValues: {
      date: true,
    },
  }
}

function handleModalCancel() {
  todoModal.value = {
    action: null,
    todo: null,
  }
}

function handleClickTodo(todo) {
  console.log({ todo })
  todoModal.value = {
    ...todoModal.value,
    action: 'show',
    todo,
  }
}

function handleClickAddTodo() {
  todoModal.value = {
    ...todoModal.value,
    action: 'add',
    todoTypeId: route.params?.id,
    todoType: 'task',
    formReadonlyValues: {
      todo_type_id: true,
    },
  }
}

async function handleClickComplete(todo, status) {
  if (confirm(`Are your sure?\nwant to change status to ${status} \ntodo: '${todo?.title}'`)) {
    await todoDateStore.updateStatus(todo.id, status)
    fetchTask(route.params?.id)
  }
}

async function handleClickDelete(todoDate) {
  if (confirm(`Are your sure want to delete todo\n'${todoDate?.title}'`)) {
    await todoDateStore.deleteTodoDate(todoDate.id)
    fetchTask(route.params?.id)
  }
}
</script>

<template>
  <div class="container mx-auto px-4">
    <OverlyModal v-if="dateUpdateModal.user">
      <TaskUserDateUpdate
        :task="store.task"
        :user="dateUpdateModal.user"
        :type="dateUpdateModal.type"
        @closeClick="dateUpdateModal.user = null"
        @updateDate="handleUpdateDate"
      />
    </OverlyModal>

    <OverlyModal v-if="taskDeleting.open">
      <TaskDeletingFrom
        @closeClick="taskDeleting.open = false"
        :task="taskDeleting.task"
        @delete="handleDeleteSuccess"
      />
    </OverlyModal>

    <LoaderView v-if="state === 'loading'" class="h-[80vh] items-center justify-center" />

    <div class="w-full xl:max-w-8xl min-h-64 mx-auto relative" v-else>
      <template v-if="store.task">
        <nav
          class="text-sm mb-4 border-b"
          aria-label="Breadcrumb"
          v-if="breadcrumbTaskItems.length > 1"
        >
          <ol class="flex items-center gap-2">
            <template
              v-for="(breadcrumbTask, index) in breadcrumbTaskItems"
              :key="breadcrumbTask.id"
            >
              <li aria-hidden="true" class="text-gray-400 text-base" v-if="index > 0">/</li>
              <li :title="breadcrumbTask?.title" class="text-gray-600 line-clamp-1">
                <div
                  :to="`${isMyTask ? '/my-tasks' : '/tasks'}/${breadcrumbTask.id}`"
                  class="hover:text-gray-900 hover:underline transition"
                  :class="{
                    'line-clamp-1 text-justify': index > 0,
                    'whitespace-nowrap': index === 0,
                  }"
                  v-if="!breadcrumbTask.is_current_page"
                >
                  {{ breadcrumbTask?.title }}
                </div>
                <span v-else class="text-gray-900 font-medium line-clamp-1" aria-current="page">
                  {{ breadcrumbTask?.title }}
                </span>
              </li>
            </template>
          </ol>
        </nav>

        <div class="grid grid-cols-12 gap-x-4 gap-y-3">
          <div
            class="col-span-full md:col-span-7 xl:col-span-8 2xl:col-span-9 row-span-10 bg-white shadow rounded-lg p-6"
          >
            <!-- IGNORE
            <pre>
              {{ store.task }}
              </pre>
              -->
            <div>
              <h2 class="font-medium text-md flex items-start gap-2">
                <button class="btn-icon size-6 text-sm text-sky-500" @click="router.back()">
                  <i class="fas fa-arrow-left"></i>
                </button>

                <DescriptionView>
                  {{ store.task.title }}
                </DescriptionView>
              </h2>

              <div class="mt-2 col-span-full flex items-center">
                <div class="text-gray-400 text-xs">
                  <i class="fas fa-clock"></i>
                  {{ getDisplayDateTime(store.task.created_at) }}
                </div>
                <template v-if="store.task?.created_by_user">
                  <span class="text-sm text-gray-600 ml-4">By</span>
                  <div class="flex items-center gap-0.5">
                    <UserAvatar :user="store.task?.created_by_user" class="ml-1" size="xsmall" />
                    <div class="text-sky-400 text-sm font-semibold">
                      {{ store.task?.created_by_user?.label }}
                    </div>
                  </div>
                </template>
              </div>
            </div>

            <DescriptionView>
              <p v-html="store.task?.description" class="text-justify" />
            </DescriptionView>

            <div>
              <div class="flex justify-between items-end mt-6 mb-2">
                <h3 class="font-semibold text-xl">Todos</h3>
                <button
                  class="btn btn-3 h-8"
                  @click.prevent="() => handleClickAddTodo()"
                  v-if="authUserHasTaskAssigned"
                >
                  <i class="fas fa-plus"></i> Add Todo
                </button>
              </div>

              <div>
                <div
                  v-if="groupWiseTodoDates.length === 0"
                  class="border flex items-center justify-center h-96 rounded bg-gray-50 text-sm italic"
                >
                  No Todos
                </div>

                <div
                  v-for="datewise in groupWiseTodoDates"
                  :key="datewise.date"
                  class="border rounded-md overflow-hidden mb-4"
                >
                  <div
                    class="text-gray-700 bg-gradient-to-tl from-sky-400/60 to-sky-400 border-b py-2 px-4 flex items-center"
                  >
                    <div class="font-semibold flex items-center gap-2">
                      <div class="text-white text-base">{{ getDisplayDate(datewise.date) }}</div>
                    </div>
                  </div>

                  <div>
                    <TodoItemCard
                      v-for="todoDate in datewise?.todo_dates || []"
                      :key="todoDate.id"
                      :todoDate="todoDate"
                      @clickTodo="(todoDate) => handleClickTodo(todoDate)"
                      @clickEdit="() => handleClickEditTodo(todoDate?.todo)"
                      @clickChangeStatus="
                        (todoDate, status) => handleClickComplete(todoDate, status)
                      "
                      @clickDelete="(todoDate) => handleClickDelete(todoDate)"
                      hide-sorting-btn
                      class="border-b border-sky-200"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div
            class="col-span-full md:col-span-5 xl:col-span-4 2xl:col-span-3 space-y-4 sticky top-[74px] bg-white shadow rounded-lg p-4 pb-0"
          >
            <div class="border col-span-3 p-3 rounded-md">
              <div>
                <div class="flex items-center gap-2 mb-4">
                  <div class="text-gray-500 text-sm">From</div>
                  <DepartmentChip :department="store?.task?.from_department" :short-name="true" />
                </div>
                <div class="text-gray-600 text-sm mb-2 border-b border-dashed">Supervisors</div>
                <TaskAssignedUsers
                  class="flex items-center gap-x-3 gap-y-2 flex-wrap"
                  :users="store?.task?.supervisors || []"
                  listType="supervisors"
                  :maxItem="3"
                />
              </div>

              <hr class="my-4" />

              <div>
                <div class="flex items-center gap-2 mb-4">
                  <div class="text-gray-500 text-sm">To</div>
                  <DepartmentChip :department="store?.task?.to_department" :short-name="true" />
                </div>
                <div class="text-gray-600 text-sm mb-2 border-b border-dashed">Assigned Users</div>
                <TaskAssignedUsers
                  class="flex items-center gap-x-3 gap-y-2 flex-wrap"
                  :users="store?.task?.users || []"
                  :isTargetTask="store?.task?.is_target"
                  :maxItem="5"
                />
              </div>
            </div>

            <TaskTimeline :task="store?.task" />

            <TaskStatusManager
              v-if="store?.task"
              :task="store?.task || {}"
              class="col-span-full"
              @updateStatus="() => fetchTask(store?.task?.id)"
              hide-timeline
            >
              <template #top>
                <div class="flex items-start justify-center !text-lg mb-4">
                  <TaskStatus
                    :status="store.task?.status"
                    :progressPercent="store.task?.progress_percent"
                    class="h-6 !text-lg"
                  />
                </div>
              </template>
            </TaskStatusManager>

            <div
              class="flex items-center gap-4 flex-wrap justify-between col-span-3 sticky bottom-0 bg-white py-4"
            >
              <RouterLink
                :to="{ name: 'TaskUserAssign', params: { id: store.task?.id } }"
                class="bg-indigo-500 hover:bg-indigo-600 text-white font-semibold px-3 py-0.5 rounded-full transition whitespace-nowrap"
                @click="$event.stopPropagation()"
                :class="!!store.task.closed_at ? 'opacity-30 pointer-events-none' : ''"
              >
                <i class="fas fa-users-cog"></i> Assign Users
              </RouterLink>

              <button
                @click.stop="goToEdit(store.task?.id)"
                class="btn-2 py-0.5 disabled:opacity-30 disabled:pointer-events-none"
                :disabled="!!store.task.closed_at"
              >
                <i class="fas fa-edit"></i> Edit
              </button>
            </div>
          </div>
        </div>

        <OverlyModal v-if="route.name === 'TaskReportAdd'" class="*:bg-transparent">
          <router-view />
        </OverlyModal>

        <section v-else>
          <router-view />
        </section>
      </template>

      <div v-else class="text-center py-4 text-red-500">
        {{ store.error }}
      </div>

      <LoaderView class="absolute bg-opacity-80 inset-0 z-20" v-if="state === 'changing'" />
    </div>

    <TodoCreateEditShow
      userRole="employee"
      :todoModal="todoModal"
      @cancelClick="handleModalCancel"
      @todoUpdate="handleTodoUpdate"
      @todoDateUpdate="handleTodoDateUpdate"
      @clickEdit="handleClickEditTodo"
      @clickAddTodoDate="addTodoDate"
    />
  </div>
</template>
