<script setup>
import CommentModal from '@/components/CommentModal.vue'
// import Draggable from '@/components/common/Draggable.js'
// import draggable from 'vuedraggable'
import DraggableList from '@/components/common/DraggableList.vue'
import LoaderView from '@/components/common/LoaderView.vue'
import OverlyModal from '@/components/common/OverlyModal.vue'
import TaskAddForm from '@/components/tasks/TaskAddForm.vue'
import TaskEditForm from '@/components/tasks/TaskEditForm.vue'
import TaskHeader from '@/components/tasks/TaskHeader.vue'
import UserWiseList from '@/components/tasks/UserWiseList.vue'
import TaskTreeView from '@/components/TaskTreeView.vue'
import useTaskPriorityUpdate from '@/libs/task-priority'
import { useTaskStore } from '@/stores/useTaskStore'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const store = useTaskStore()

const route = useRoute()
const router = useRouter()
const showCommentModal = ref(false)
const userId = 1 // অ্যাকচুয়াল auth ইউজার আইডি
const selectedTaskId = ref(null)
const priorityChangingDisabled = ref(false)
const editingId = ref(null)
const addForm = ref(false)
const addFormData = reactive({
  parentId: 0,
  requirementId: 0,
})
const draggableTaskList = ref(null)
const queryLogs = ref([])

const { handleItemsPriorityUpdate, saveTaskPriority, listHasRearranged } = useTaskPriorityUpdate(
  () => store.taskListTree,
  0,
)

onMounted(async () => {
  if (!route.query['status']) {
    router.push({
      query: { ...route.query, status: 'not-completed' },
    })
  }
  await fetchTasks({}, { loadingBeforeFetch: true })
})

async function fetchTasks() {
  priorityChangingDisabled.value = !!route.query['user-ids']

  const data = await store.fetchTasks(
    { ...route.query },
    {
      loadingBeforeFetch: true,
    },
  )

  console.log({ dataQuery: data.query_log })

  queryLogs.value = data.query_log || []
}

const goToAdd = (parentId) => {
  //router.push({ name: 'TaskAdd' })
  addForm.value = true
  addFormData.parentId = parentId
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
  await fetchTasks()
}

async function handleTaskAddClose() {
  addForm.value = false
  addFormData.parentId = 0
  await fetchTasks()
}

async function handleTaskPrioritySave() {
  if (saveTaskPriority()) {
    await fetchTasks()
  }
}

watch(
  () => ({
    ...route.query,
  }),
  async () => await fetchTasks(),
)

const taskFilter = computed({
  get() {
    return { ...route.query }
  },
  set(value) {
    router.push({ query: { ...value } })
  },
})
</script>

<template>
  <div class="container mx-auto p-6 relative bg-white border rounded-md shadow-md">
    <OverlyModal v-if="editingId">
      <TaskEditForm
        :taskId="editingId"
        class="rounded-full"
        @close="editingId = null"
        @updated="handleTaskUpdate"
      />
    </OverlyModal>

    <OverlyModal v-if="addForm">
      <TaskAddForm
        :parentTaskId="addFormData.parentId"
        :requirementId="addFormData.requirementId"
        class="rounded-full"
        @close="handleTaskAddClose"
        @taskCreated="handleTaskUpdate"
      />
    </OverlyModal>

    <TaskHeader
      v-model="taskFilter"
      @clickAddTask="goToAdd"
      @clickPrioritySave="handleTaskPrioritySave"
      @clickPriorityDiscard="() => (listHasRearranged ? draggableTaskList.resetItems : null)"
      :list-has-rearranged="listHasRearranged"
      class="mb-6"
    />

    <template v-if="route?.query?.['query-log'] == 'true'">
      <div v-for="(log, ind) in queryLogs" :key="ind" class="text-xs text-gray-500">
        <div class="mb-4">{{ log.raw_query }}</div>
      </div>
    </template>

    <div class="w-full flex justify-end gap-5 mb-4">
      <RouterLink
        class="text-sm btn-3 py-0.5"
        :class="route.query?.view === 'userwise' ? 'bg-blue-500 text-white' : ''"
        :to="{
          name: 'TaskList',
          query: {
            ...route.query,
            view: 'userwise',
          },
        }"
      >
        User Wise List
      </RouterLink>
      <RouterLink
        class="text-sm btn-3 py-0.5"
        :class="route.query?.view !== 'userwise' ? 'bg-blue-500 text-white' : ''"
        :to="{
          name: 'TaskList',
          query: {
            ...Object.keys(route?.query || {})
              .filter((k) => route?.query[k] !== 'userwise')
              .reduce((acc, k) => ({ ...acc, [k]: route.query[k] }), {}),
          },
        }"
      >
        TaskWise List
      </RouterLink>
    </div>
    <div v-if="store.loading">
      <LoaderView />
    </div>
    <template v-else>
      <div v-if="store.error" class="text-center py-4 text-red-500">
        {{ store.error }}
      </div>

      <div v-else-if="store.tasks.length > 0">
        <UserWiseList
          v-if="route.query?.view == 'userwise'"
          :tasks="store.tasks"
          :selectedUserId="route.query['user-ids']"
          @commentButtonClick="openComment($event, task.id)"
          @editClick="(taskId) => (editingId = taskId)"
          @addClick="(taskId) => goToAdd(taskId)"
        />

        <DraggableList
          v-else
          :items="store.taskListTree"
          handle="handle"
          @itemsUpdate="handleItemsPriorityUpdate"
          class="space-y-4"
          ref="draggableTaskList"
        >
          <template #item="{ item, index }">
            <div class="flex items-stretched">
              <TaskTreeView
                :task="item"
                :index="index"
                :showDraggableHandle="!priorityChangingDisabled"
                @commentButtonClick="openComment($event, task.id)"
                @editClick="(taskId) => (editingId = taskId)"
                @addClick="(taskId) => goToAdd(taskId)"
                class="!border-0"
              />
            </div>
          </template>
        </DraggableList>
      </div>

      <div
        v-else
        class="text-center py-4 text-gray-500 border h-[100px] flex items-center justify-center text-xl rounded bg-gray-50"
      >
        No tasks found.
      </div>
    </template>

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
