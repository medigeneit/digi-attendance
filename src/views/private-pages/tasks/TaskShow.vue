<script setup>
import LoaderView from '@/components/common/LoaderView.vue'
import OverlyModal from '@/components/common/OverlyModal.vue'
import DescriptionView from '@/components/DescriptionView.vue'
import SubTaskList from '@/components/tasks/SubTaskList.vue'
import SubTaskProgress from '@/components/tasks/SubTaskProgress.vue'
import { default as TaskDeletingFrom } from '@/components/tasks/TaskDeletingFrom.vue'
import TaskImportantBadge from '@/components/tasks/TaskImportantBadge.vue'
import TaskProgressTable from '@/components/tasks/TaskProgressTable.vue'
import TaskStatus from '@/components/tasks/TaskStatus.vue'
import TaskStatusManager from '@/components/tasks/TaskStatusManager.vue'
import TaskSupervisorAndEmployee from '@/components/tasks/TaskSupervisorAndEmployee.vue'
import TaskUrgentBadge from '@/components/tasks/TaskUrgentBadge.vue'
import TaskUserDateUpdate from '@/components/tasks/TaskUserDateUpdate.vue'
import UserAvatar from '@/components/UserAvatar.vue'
import { getDisplayDateTime } from '@/libs/datetime'
import { scrollToID } from '@/libs/dom'
import { getTaskProgressUsers } from '@/libs/task-progress'
import { useTaskStore } from '@/stores/useTaskStore'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const store = useTaskStore()
const route = useRoute()
const router = useRouter()
const state = ref('')

// const subTasks = computed(() => taskTree.getTaskListTree())
const subTasks = computed(() => store.tasks)
const progress = ref({})
const taskDeleting = reactive({
  open: false,
  task: null,
})

onMounted(async () => {
  state.value = 'loading'
  await fetchTaskList(route.params.id)
  state.value = ''
  if (route.hash == '#sub-tasks') {
    setTimeout(() => scrollToID(route.hash, 66), 0)
  }
})

const dateUpdateModal = reactive({
  user: null,
  type: '',
})

async function fetchTaskList(taskId) {
  await store.fetchTask(taskId)
}

const taskProgressUsers = computed(() =>
  getTaskProgressUsers(store.task.users, store.task.task_reports || []),
)

async function handleUpdateDate() {
  await fetchTaskList(route.params.id)
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

function handleDeleteButtonClick() {
  taskDeleting.open = true
  taskDeleting.task = store.task
}

function handleDeleteSuccess() {
  taskDeleting.open = false
  console.log({ STATE: 'Deleted', backLink: backLink.value })
  router.push(backLink.value)
}

const isMyTask = computed(() => route.name == 'MyTaskShow' || !!route.query['is-my-task'])

const getBreadCrumbFromTask = (task, is_current_page = false) => {
  return {
    id: task?.id,
    title: task?.title,
    status: task?.status,
    is_current_page,
  }
}

const breadcrumbTaskItems = computed(() => {
  const parents = []

  if (store?.task?.parent) {
    parents.push(getBreadCrumbFromTask(store.task?.parent))

    if (store?.task?.parent?.parent) {
      parents.push(getBreadCrumbFromTask(store.task?.parent?.parent))
    }
  }

  return [...parents.reverse(), ...[getBreadCrumbFromTask(store.task, true)]]
})

watch(
  () => route.params.id,
  async (taskId) => {
    state.value = 'changing'
    await fetchTaskList(taskId)
    state.value = ''
  },
)

watch(
  () => route.hash,
  async function () {
    setTimeout(() => scrollToID(route.hash, 66), 0)
  },
)
</script>

<template>
  <div class="container mx-auto p-6">
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

    <LoaderView v-if="state === 'loading'" />

    <div class="max-w-8xl min-h-64 mx-auto bg-white shadow-lg rounded-lg p-6 relative" v-else>
      <template v-if="store.task">
        <nav
          class="text-sm mb-2 border-b"
          aria-label="Breadcrumb"
          v-if="breadcrumbTaskItems.length > 1"
        >
          <ol class="flex items-center gap-2">
            <template
              v-for="(breadcrumbTask, index) in breadcrumbTaskItems"
              :key="breadcrumbTask.id"
            >
              <li aria-hidden="true" class="text-gray-400 text-base" v-if="index > 0">/</li>
              <li :title="breadcrumbTask?.title" class="text-gray-600">
                <RouterLink
                  :to="`${isMyTask ? '/my-tasks' : '/tasks'}/${breadcrumbTask.id}`"
                  class="hover:text-gray-900 hover:underline transition"
                  :class="{
                    'line-clamp-1 text-justify': index > 0,
                    'whitespace-nowrap': index === 0,
                  }"
                  v-if="!breadcrumbTask.is_current_page"
                >
                  {{ breadcrumbTask?.title }}
                </RouterLink>
                <span v-else class="text-gray-900 font-medium line-clamp-1" aria-current="page">
                  {{ breadcrumbTask?.title }}
                </span>
              </li>
            </template>
          </ol>
        </nav>

        <section class="grid grid-cols-4">
          <div class="mb-4 flex col-span-full">
            <div>
              <h2 class="font-medium text-xl">
                {{ store.task.title }}
              </h2>

              <div class="flex items-center gap-3 text-xs text-gray-500 mt-2 opacity-80 text-left">
                <div
                  v-if="store.task.parent_id == 0"
                  class="text-white bg-green-700 text-[12px] uppercase px-2 py-[2px] rounded-full border border-green-200 opacity-80"
                >
                  MAIN TASK
                </div>
                <div class="font-semibold">#{{ store.task?.serial }}</div>

                <TaskImportantBadge v-if="store.task?.is_important" />

                <TaskUrgentBadge v-if="store.task?.is_urgent" />
              </div>

              <div class="mt-2 col-span-full flex items-center">
                <div class="text-gray-400 text-xs">
                  <i class="fas fa-clock"></i>
                  {{ getDisplayDateTime(store.task.created_at) }}
                </div>
                <template v-if="store.task?.created_by_user">
                  <span class="text-sm text-gray-600 ml-4">By</span>
                  <div class="flex items-center gap-0.5">
                    <UserAvatar :user="store.task?.created_by_user" class="!size-4 ml-1" />
                    <div class="text-sky-400 text-sm font-semibold">
                      {{ store.task?.created_by_user?.label }}
                    </div>
                  </div>
                </template>
              </div>
            </div>

            <div
              class="text-right col-span-full md:col-span-1 ml-auto flex items-start justify-center gap-4 !text-lg"
            >
              <TaskStatus
                :status="store.task?.status"
                :progressPercent="store.task?.progress_percent"
                class="h-6 !text-lg"
              />
              <SubTaskProgress
                v-if="store.task"
                :task="store.task"
                ref="progress"
                class="!text-lg"
              />
            </div>
          </div>

          <div class="col-span-full mb-4">
            <DescriptionView>
              <p v-html="store.task?.description" class="text-justify" />
            </DescriptionView>
          </div>

          <TaskSupervisorAndEmployee
            :task="store?.task"
            :tree-level="store?.task?.level"
            class="justify-center border col-span-full border-dashed rounded-lg"
          />

          <section class="mt-4 col-span-full mb-6" v-if="store.task.children_task_count > 0">
            <TaskProgressTable
              :task-users="store.task?.users || []"
              :task="store.task"
              :sub-tasks="store.tasks"
              :progress-users="taskProgressUsers"
            >
              <template #caption>
                <div class="text-sm py-1 text-left uppercase font-semibold text-gray-600">
                  Assigned Users
                </div>
              </template>
            </TaskProgressTable>
          </section>

          <TaskStatusManager
            v-if="store?.task"
            :task="store?.task || {}"
            class="col-span-full mt-4"
            @updateStatus="() => fetchTaskList(store?.task?.id)"
          />

          <div
            class="mt-2 py-2 flex flex-col lg:flex-row gap-y-4 justify-center items-center gap-2 col-span-full"
          >
            <div class="flex items-center gap-4 flex-wrap justify-center">
              <button
                @click.stop="goToEdit(store.task?.id)"
                class="btn-2 py-0.5 disabled:opacity-30 disabled:pointer-events-none"
                :disabled="!!store.task.closed_at"
              >
                <i class="fas fa-edit"></i> Edit
              </button>

              <RouterLink
                :to="{ name: 'TaskUserAssign', params: { id: store.task?.id } }"
                class="bg-indigo-500 hover:bg-indigo-600 text-white font-semibold px-3 py-0.5 rounded-full transition whitespace-nowrap"
                @click="$event.stopPropagation()"
                :class="!!store.task.closed_at ? 'opacity-30 pointer-events-none' : ''"
              >
                <i class="fas fa-users-cog"></i> Assign Users
              </RouterLink>

              <button
                class="border-2 border-indigo-500 hover:bg-indigo-500 hover:text-white text-indigo-500 font-semibold px-3 py-0.5 rounded-full transition disabled:opacity-30 disabled:pointer-events-none whitespace-nowrap"
                @click="router.back()"
              >
                <i class="fas fa-arrow-left"></i> Back
              </button>

              <RouterLink
                :to="backLink"
                class="border-2 border-indigo-500 hover:bg-indigo-500 hover:text-white ml-2 text-indigo-500 font-semibold px-3 py-0.5 rounded-full transition disabled:opacity-30 disabled:pointer-events-none whitespace-nowrap"
                @click="$event.stopPropagation()"
              >
                <i class="fas fa-arrow-left"></i> Parent Task
              </RouterLink>
            </div>
            <div class="lg:ml-auto flex gap-4 items-center">
              <template
                v-if="store.task?.children_task_count === 0 && store.task?.status === 'PENDING'"
              >
                <button class="btn-2-red h-8" @click.prevent="handleDeleteButtonClick">
                  Delete
                </button>
              </template>

              <RouterLink
                :to="{
                  name: isMyTask || !!route.query['is-my-task'] ? 'MyTaskShow' : 'TaskShow',
                  params: { id: store.task?.id },
                  hash: '#sub-tasks',
                }"
                @click="$event.stopPropagation()"
                class="py-0.5 btn-3 ml-auto text-sm h-8 whitespace-nowrap"
                :class="{
                  'bg-blue-500 text-white': route.name == 'TaskShow' || route.name === 'MyTaskShow',
                }"
                v-if="subTasks.length > 0"
              >
                <i class="fal fa-list-ul"></i> Sub Tasks
              </RouterLink>

              <RouterLink
                :to="{
                  name: 'TaskReports',
                  params: { id: store.task?.id },
                  query: { ['is-my-task']: isMyTask },
                  hash: '#task-reports',
                }"
                @click="$event.stopPropagation()"
                class="py-0.5 btn-3 text-sm h-8"
                :class="{ 'bg-blue-500 text-white': route.name == 'TaskReports' }"
              >
                <i class="fal fa-file-alt"></i> Reports
              </RouterLink>
            </div>
          </div>
        </section>

        <div id="sub-tasks"></div>
        <section
          v-if="(route.name == 'TaskShow' || route.name === 'MyTaskShow') && store.task?.level <= 2"
        >
          <SubTaskList
            :subTasks="subTasks"
            :parent-id="route.params.id"
            :sub-task-is-creatable="!store.task.closed_at"
            :tree-level="store.task.level + 1"
            @created="fetchTaskList(route.params.id)"
            @updated="fetchTaskList(route.params.id)"
            @updatePriority="fetchTaskList(route.params.id)"
            @assignUser="fetchTaskList(route.params.id)"
          />
        </section>

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
    <!--
    <CommentModal
      :show="showCommentModal"
      :commentable-id="selectedTaskId"
      commentable-type="task"
      :user-id="userId"
      :on-close="closeComment"
      @submitted="store.fetchTasks"
    /> -->
  </div>
</template>
