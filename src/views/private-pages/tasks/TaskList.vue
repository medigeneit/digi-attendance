<script setup>
import CommentModal from '@/components/CommentModal.vue'
// import Draggable from '@/components/common/Draggable.js'
// import draggable from 'vuedraggable'
import DraggableList from '@/components/common/DraggableList.vue'
import OverlyModal from '@/components/common/OverlyModal.vue'
import Multiselect from '@/components/MultiselectDropdown.vue'
import TaskAddForm from '@/components/tasks/TaskAddForm.vue'
import TaskEditForm from '@/components/tasks/TaskEditForm.vue'
import TaskTreeView from '@/components/TaskTreeView.vue'
import useTaskPriorityUpdate from '@/libs/task-priority'
import { useCompanyStore } from '@/stores/company'
import { useTaskStore } from '@/stores/useTaskStore'
import { storeToRefs } from 'pinia'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const store = useTaskStore()
const companyStore = useCompanyStore()
const { companies, employees } = storeToRefs(companyStore)
const route = useRoute()
const router = useRouter()
const showCommentModal = ref(false)
const userId = 1 // অ্যাকচুয়াল auth ইউজার আইডি
const selectedTaskId = ref(null)

const selectedCompanyId = computed(setOrGetQuery('company-id'))
const selectedEmployeeId = computed(setOrGetQuery('user-id'))
const selectedEmployee = ref()
const priorityChangingDisabled = ref(false)

const editingId = ref(null)
const addForm = ref(false)
const addFormData = reactive({
  parentId: 0,
  requirementId: 0,
})

const draggableTaskList = ref(null)

onMounted(async () => {
  await companyStore.fetchCompanies()
  await fetchTasks({}, { loadingBeforeFetch: true })
})

const goToAdd = (parentId) => {
  //router.push({ name: 'TaskAdd' })
  addForm.value = true
  addFormData.parentId = parentId
}

function setOrGetQuery(key) {
  return {
    set: (value) => {
      router.push({ query: { ...route.query, [key]: value || undefined } })
    },
    get: () => {
      return route.query[key] || ''
    },
  }
}

const openComment = (id) => {
  selectedTaskId.value = id
  showCommentModal.value = true
}

const closeComment = () => {
  showCommentModal.value = false
  selectedTaskId.value = null
}

watch(
  () => selectedCompanyId.value,

  async (newCompanyId) => {
    if (newCompanyId) {
      // selectedEmployeeId.value = null
      await companyStore.fetchEmployee(newCompanyId)
      selectedEmployee.value =
        employees.value.find((emp) => emp.id == selectedEmployeeId.value) || null
    }
  },

  {
    initial: true,
    immediate: true,
  },
)

watch(
  () => ({
    'user-id': route.query['user-id'],
    'company-id': route.query['company-id'],
  }),
  async () => {
    fetchTasks()
  },
)

async function fetchTasks() {
  priorityChangingDisabled.value = !!route.query['user-id']

  await store.fetchTasks(
    {
      user_ids: route.query['user-id'] || undefined,
      company_id: route.query['company-id'] || undefined,
    },
    {
      loadingBeforeFetch: true,
    },
  )
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

watch(selectedEmployee, (emp) => {
  selectedEmployeeId.value = emp?.id
})

const { handleItemsPriorityUpdate, saveTaskPriority, listHasRearranged } = useTaskPriorityUpdate(
  () => store.taskListTree,
  0,
)

async function handleTaskPrioritySave() {
  if (saveTaskPriority()) {
    await fetchTasks()
    // draggableTaskList.value.resetItems()
  }
}
</script>

<template>
  <div class="container mx-auto p-6 relative">
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

    <div class="mb-3">
      <div class="flex justify-between items-center">
        <h2 class="text-2xl font-bold text-gray-800">Task List</h2>
      </div>
      <div class="flex flex-wrap items-center gap-2 mt-3">
        <div class="flex gap-4">
          <div class="flex-shrink-0 w-full md:w-64 text-gray-600">
            <select id="company-filter" v-model="selectedCompanyId" class="input-1 h-full">
              <option value="">Select Company</option>
              <option v-for="company in companies" :key="company.id" :value="company.id">
                {{ company.name }}
              </option>
            </select>
          </div>

          <Multiselect
            v-model="selectedEmployee"
            :options="employees"
            :multiple="false"
            label="name"
            label-prefix="id"
            placeholder="Please select employee..."
            class="w-full md:w-64 text-gray-600"
          />
        </div>

        <!--
          <div>
            <input id="month-filter" v-model="month" type="month" class="input-1" />
          </div>

        -->

        <div class="ml-auto flex gap-6 items-center">
          <div v-if="listHasRearranged" class="flex gap-2 items-center">
            <span class="text-red-500">Priority Changed</span>
            <button class="btn-3" @click.prevent="handleTaskPrioritySave">Save</button>
            <button class="btn-3" @click.prevent="draggableTaskList.resetItems">Discard</button>
          </div>
          <button @click="goToAdd" class="btn-1">Add Task</button>
        </div>
      </div>
    </div>

    <div v-if="store.error" class="text-center py-4 text-red-500">
      {{ store.error }}
    </div>

    <div class="space-y-4">
      <DraggableList
        :items="store.taskListTree"
        handle="handle"
        @itemsUpdate="handleItemsPriorityUpdate"
        class="space-y-4"
        ref="draggableTaskList"
      >
        <template #item="{ item }">
          <TaskTreeView
            :task="item"
            class="!border-0"
            @commentButtonClick="openComment($event, task.id)"
            @editClick="(taskId) => (editingId = taskId)"
            @addClick="(taskId) => goToAdd(taskId)"
            :showDraggableHandle="!priorityChangingDisabled"
          />
        </template>
      </DraggableList>
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
