<script setup>
import CommentModal from '@/components/CommentModal.vue'
import OverlyModal from '@/components/common/OverlyModal.vue'
import Multiselect from '@/components/MultiselectDropdown.vue'
import TaskAddForm from '@/components/tasks/TaskAddForm.vue'
import TaskEditForm from '@/components/tasks/TaskEditForm.vue'
import TaskTreeView from '@/components/TaskTreeView.vue'
import { useAttendanceStore } from '@/stores/attendance'
import { useCompanyStore } from '@/stores/company'
import { useTaskStore } from '@/stores/useTaskStore'
import { storeToRefs } from 'pinia'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const store = useTaskStore()
const lateAttendanceStore = useAttendanceStore()
const companyStore = useCompanyStore()
const { flattenedTasks } = storeToRefs(store)
const { companies, employees } = storeToRefs(companyStore)
const route = useRoute()
const router = useRouter()
const showCommentModal = ref(false)
const userId = 1 // অ্যাকচুয়াল auth ইউজার আইডি
const selectedTaskId = ref(null)

const selectedCompanyId = computed(setOrGetQuery('company-id'))
const selectedEmployeeId = computed(setOrGetQuery('user-id'))
const selectedEmployee = ref()
const { selectedMonth } = storeToRefs(lateAttendanceStore)

const editingId = ref(null)
const addForm = ref(false)
const addFormData = reactive({
  parentId: 0,
  requirementId: 0,
})

onMounted(async () => {
  await companyStore.fetchCompanies()
  await store.fetchTasks(route.query['user-id'] ? { user_ids: route.query['user-id'] } : {})
})

const goToAdd = (parentId) => {
  //router.push({ name: 'TaskAdd' })
  addForm.value = true
  addFormData.parentId = parentId
}

function setOrGetQuery(key) {
  return {
    set: (value) => {
      router.push({ query: { ...route.query, [key]: value } })
    },
    get: () => {
      return route.query[key] || undefined
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
    id: route.query['user-id'],
  }),

  async (newEmployee) => {
    console.log('Selected Employee:', newEmployee)
    fetchTasksByEmployeeId(newEmployee.id)
  },
)

async function fetchTasksByEmployeeId(employeeId) {
  await store.fetchTasks(employeeId ? { user_ids: employeeId } : {}, { loadingBeforeFetch: false })
}

function handleTaskUpdate() {
  editingId.value = null
  fetchTasksByEmployeeId(route.query['user-id'])
}

function handleTaskAddClose() {
  addForm.value = false
  addFormData.parentId = 0
}

watch(selectedEmployee, (emp) => {
  selectedEmployeeId.value = emp?.id
})
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
        @created="handleTaskUpdate"
      />
    </OverlyModal>

    <div class="mb-3">
      <div class="flex justify-between items-center">
        <h2 class="text-2xl font-bold text-gray-800">Task List</h2>
      </div>
      <div class="flex flex-wrap items-center gap-2 mt-3">
        <div>
          <select id="company-filter" v-model="selectedCompanyId" class="input-1">
            <option value="">Select Company</option>
            <option v-for="company in companies" :key="company.id" :value="company.id">
              {{ company.name }}
            </option>
          </select>
        </div>
        <div>
          <Multiselect
            v-model="selectedEmployee"
            :options="employees"
            :multiple="false"
            label="name"
            placeholder="Please select employee..."
          />
        </div>
        <!-- <div>
          <input
            id="month-filter"
            v-model="month"
            type="month"
            class="input-1"
          />
        </div> -->

        <button @click="goToAdd" class="btn-1 ml-auto">Add Task</button>
      </div>
    </div>

    <div v-if="store.loading" class="text-center py-4 text-gray-500">Loading tasks...</div>

    <div v-else-if="store.error" class="text-center py-4 text-red-500">
      {{ store.error }}
    </div>

    <div v-else class="space-y-4">
      <div
        v-for="task in store?.taskListTree || []"
        :key="task.id"
        class="rounded-lg border bg-white overflow-hidden"
      >
        <TaskTreeView
          :task="task"
          class="!border-0"
          @commentButtonClick="openComment($event, task.id)"
          @editClick="(taskId) => (editingId = taskId)"
          @addClick="(taskId) => goToAdd(taskId)"
        />
      </div>
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
