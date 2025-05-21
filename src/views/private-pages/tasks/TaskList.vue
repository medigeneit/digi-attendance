<script setup>
import CommentModal from '@/components/CommentModal.vue'
import Multiselect from '@/components/MultiselectDropdown.vue'
import TaskTreeView from '@/components/TaskTreeView.vue'
import { useAttendanceStore } from '@/stores/attendance'
import { useCompanyStore } from '@/stores/company'
import { useTaskStore } from '@/stores/useTaskStore'
import { storeToRefs } from 'pinia'
import { onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'

const store = useTaskStore()
const lateAttendanceStore = useAttendanceStore()
const companyStore = useCompanyStore()
const { flattenedTasks } = storeToRefs(store)
const { companies, employees } = storeToRefs(companyStore)
const router = useRouter()
const showCommentModal = ref(false)
const userId = 1 // অ্যাকচুয়াল auth ইউজার আইডি
const selectedTaskId = ref(null)
const selectedCompanyId = ref('')
const selectedEmployeeId = ref('')
const { selectedMonth } = storeToRefs(lateAttendanceStore)

onMounted(async () => {
  await companyStore.fetchCompanies()
  await store.fetchTasks()
})

const goToAdd = () => {
  router.push({ name: 'TaskAdd' })
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
    }
  },
)
watch(
  () => selectedEmployeeId.value,
  async (newEmployee) => {
    if (newEmployee.id) {
      await store.fetchTasks({ user_ids: newEmployee.id })
    }
  },
)
</script>

<template>
  <div class="container mx-auto p-6">
    <div class="mb-3">
      <div class="flex justify-between items-center">
        <h2 class="text-2xl font-bold text-gray-800">Task List</h2>
      </div>
      <div class="flex flex-wrap items-center gap-2 mt-3">
        <div>
          <select id="user-filter" v-model="selectedCompanyId" class="input-1">
            <option value="">Select Company</option>
            <option v-for="user in companies" :key="user.id" :value="user.id">
              {{ user.name }}
            </option>
          </select>
        </div>
        <div>
          <Multiselect
            v-model="selectedEmployeeId"
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
