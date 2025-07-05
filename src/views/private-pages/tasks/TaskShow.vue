<script setup>
import LoaderView from '@/components/common/LoaderView.vue'
import OverlyModal from '@/components/common/OverlyModal.vue'
import CountdownTimer from '@/components/CountdownTimer.vue'
import SubTaskList from '@/components/tasks/SubTaskList.vue'
import SubTaskProgress from '@/components/tasks/SubTaskProgress.vue'
import TaskProgressTable from '@/components/tasks/TaskProgressTable.vue'
import TaskStatus from '@/components/tasks/TaskStatus.vue'
import TaskUserDateUpdate from '@/components/tasks/TaskUserDateUpdate.vue'
import { getDisplayDate } from '@/libs/datetime'
import { getTaskProgressUsers } from '@/libs/task-progress'
import { useAuthStore } from '@/stores/auth'
import { useTaskStore } from '@/stores/useTaskStore'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const store = useTaskStore()
const route = useRoute()
const router = useRouter()
const state = ref('')
const auth = useAuthStore()

// const subTasks = computed(() => taskTree.getTaskListTree())
const subTasks = computed(() => store.tasks)
const progress = ref({})

const full_description_hidden = ref(true)

onMounted(async () => {
  state.value = 'loading'
  await fetchTaskList(route.params.id)
  state.value = ''
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

const startedDate = computed(() => getDisplayDate(store.task.started_at))
const deadline = computed(() => getDisplayDate(store.task.deadline))

function handleDateChangeModal(type) {
  dateUpdateModal.user = auth.user
  dateUpdateModal.type = type
}
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
    return { name: 'TaskList' }
  }

  return { name: 'TaskShow', params: { id: store.task?.parent_id } }
})

watch(
  () => route.params.id,
  async (taskId) => {
    state.value = 'changing'
    await fetchTaskList(taskId)
    state.value = ''
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

    <LoaderView v-if="state === 'loading'" />

    <div class="max-w-8xl min-h-64 mx-auto bg-white shadow-lg rounded-lg p-6 relative" v-else>
      <template v-if="store.task">
        <section class="grid grid-cols-4">
          <div class="mb-4 flex col-span-full">
            <div>
              <h2 class="font-medium text-xl">
                {{ store.task.title }}
              </h2>

              <div class="flex items-center gap-2 text-xs text-gray-500 mt-2 opacity-80 text-left">
                <span
                  class="text-xs px-2 py-0.5 rounded-full border bg-yellow-800 text-white"
                  v-if="store.task?.is_important"
                  >IMPORTANT</span
                >

                <span
                  class="text-xs px-2 py-0.5 rounded-full border bg-red-500 text-white"
                  v-if="store.task?.is_urgent"
                  >URGENT</span
                >
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

          <div class="col-span-full">
            <p
              v-html="store.task?.description"
              class="text-gray-700"
              :class="{ 'line-clamp-3': full_description_hidden }"
            />
            <button
              v-if="store.task?.description?.length >= 600"
              class="text-blue-500 mt-2"
              @click.prevent="full_description_hidden = !full_description_hidden"
            >
              Show {{ full_description_hidden ? 'More' : 'Less' }}
            </button>
          </div>

          <section class="mt-4 col-span-full mb-6">
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

          <div class="ml-auto text-right text-sm col-span-full">
            <CountdownTimer
              v-if="store.task.deadline"
              :targetDateTime="store.task.deadline"
              class="text-lg font-semibold italic text-green-600"
            />
            <span class="text-gray-500" v-if="startedDate">
              Started: <span class="font-semibold text-green-800">{{ startedDate }}</span>
            </span>
            <span class="ml-4 text-gray-500" v-if="deadline">
              Deadline: <span class="text-red-500 font-semibold">{{ deadline }}</span>
            </span>
          </div>

          <hr class="my-3 col-span-full" />

          <div class="py-2 flex justify-center items-center gap-2 col-span-full">
            <button @click.stop="goToEdit(store.task?.id)" class="btn-2 py-0.5">Edit</button>

            <RouterLink
              :to="{ name: 'TaskUserAssign', params: { id: store.task?.id } }"
              class="bg-indigo-500 hover:bg-indigo-600 text-white font-semibold px-3 py-0.5 rounded-full transition"
              @click="$event.stopPropagation()"
            >
              <i class="fas fa-user-plus"></i> Assign Users
            </RouterLink>

            <RouterLink
              :to="backLink"
              class="bg-indigo-500 hover:bg-indigo-600 text-white font-semibold px-3 py-0.5 rounded-full transition"
              @click="$event.stopPropagation()"
            >
              <i class="fas fa-arrow-left"></i> Back
            </RouterLink>

            <!-- 
              <button
                @click="openComment($event, store.task?.id)"
                class="bg-indigo-500 text-white px-3 py-1 rounded-full"
              >
                <i class="fas fa-plus"></i> Comment
              </button> 
            -->

            <div class="ml-auto flex gap-4">
              <template v-if="store.task?.children_task_count === 0">
                <button
                  class="btn-3 px-3 py-0.5 text-sm h-8 font-semibold border disabled:opacity-30 disabled:pointer-events-none"
                  @click.prevent="() => handleDateChangeModal('start-date')"
                  :disabled="!!authUserProgress?.started_at"
                >
                  Set Started Date
                </button>

                <button
                  class="btn-3 px-3 py-0.5 text-sm h-8 font-semibold border disabled:opacity-30 disabled:pointer-events-none"
                  @click.prevent="() => handleDateChangeModal('finish-date')"
                  :disabled="!!authUserProgress?.finished_at"
                >
                  Set Finish Date
                </button>
              </template>

              <RouterLink
                :to="{
                  name: 'TaskShow',
                  params: { id: store.task?.id },
                }"
                @click="$event.stopPropagation()"
                class="py-0.5 btn-3 ml-auto text-sm h-8"
                :class="{ 'bg-blue-500 text-white': route.name == 'TaskShow' }"
                v-if="subTasks.length > 0"
              >
                <i class="fal fa-list-ul"></i> Sub Tasks
              </RouterLink>

              <RouterLink
                :to="{
                  name: 'TaskReports',
                  params: { id: store.task?.id },
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

        <section v-if="route.name == 'TaskShow' && store.task?.level <= 2">
          <SubTaskList
            :subTasks="subTasks"
            :parent-id="route.params.id"
            :tree-level="store.task.level + 1"
            @created="fetchTaskList(route.params.id)"
            @updated="fetchTaskList(route.params.id)"
            @updatePriority="fetchTaskList(route.params.id)"
          />
        </section>

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
