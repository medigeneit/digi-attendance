<script setup>
import EmployeeFilter from '@/components/common/EmployeeFilter.vue'
import LoaderView from '@/components/common/LoaderView.vue'
import FlexibleDatePicker from '@/components/FlexibleDatePicker.vue'
import { useShortLeaveStore } from '@/stores/short-leave'
import { useUserStore } from '@/stores/user'
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const router = useRouter()
const route = useRoute()

const shortLeaveStore = useShortLeaveStore()
const userStore = useUserStore()

const selectedUser = ref(null)
const initialMonth = route.query.date || shortLeaveStore.selectedMonth || new Date().toISOString().slice(0, 7)
const selectedMonth = ref(initialMonth)
const now = new Date()
const pad = (value) => value.toString().padStart(2, '0')
const period = ref({
  year: Number(initialMonth.split('-')[0] || now.getFullYear()),
  month: Number(initialMonth.split('-')[1] || now.getMonth() + 1),
  day: 1,
})
const periodMonth = computed(() => {
  if (!period.value?.year || !period.value?.month) return ''
  return `${period.value.year}-${pad(period.value.month)}`
})
const search = ref(route.query.search || '')

const filters = ref({
  company_id: route.query.company_id || '',
  department_id: route.query.department_id || 'all',
  line_type: route.query.line_type || 'all',
  employee_id: route.query.employee_id || '',
  category: '',
})

const fetchShortLeavesByUser = async () => {
  const payload = {
    selectedCompany:filters.value.company_id,
    selectedDepartment:filters.value.department_id,
    line_type:filters.value.line_type,
    selectedMonth: selectedMonth.value,
    selectedStatus: shortLeaveStore.selectedStatus,
    query: search.value,
  }

  if (filters.value.employee_id) {
    payload.user_id = filters.value.employee_id
  }

  await shortLeaveStore.fetchShortLeaves(payload)
}

onMounted(async () => {
  await userStore.fetchUsers()

  if (filters.value.employee_id) {
    selectedUser.value = userStore.users.find((u) => u.id == filters.value.employee_id) || null
  }

  await fetchShortLeavesByUser()
})

// Watch for employee selection change
watch(
  () => filters.value.employee_id,
  async (newVal, oldVal) => {
    if (newVal !== oldVal) {
      selectedUser.value = userStore.users.find(u => u.id == newVal) || null
      await fetchShortLeavesByUser()
    }
  }
)
// Watch for employee selection change
watch(
  () => filters.value.company_id,
  async (newVal, oldVal) => {
    if (newVal !== oldVal) {
      await fetchShortLeavesByUser()
    }
  }
)
// Watch for employee selection change
watch(
  () => filters.value.department_id,
  async (newVal, oldVal) => {
    if (newVal !== oldVal) {
      await fetchShortLeavesByUser()
    }
  }
)

// Watch for selectedMonth change via period picker
watch(
  periodMonth,
  async (newDate) => {
    if (!newDate) return
    selectedMonth.value = newDate
    router.replace({
      query: {
        ...route.query,
        date: newDate,
      },
    })
    await fetchShortLeavesByUser()
  }
)

const goBack = () => router.go(-1)

const formatTime = (timeString) => {
  const [hour, minute] = timeString.split(':').map(Number)
  const date = new Date()
  date.setHours(hour, minute)
  return date.toLocaleString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

const deleteApplication = async (applicationId) => {
  if (confirm('Are you sure to delete this application?')) {
    await shortLeaveStore.deleteShortLeave(applicationId)
    await fetchShortLeavesByUser()
  }
}

const handleFilterChange = () => {
  router.replace({
    query: {
      ...route.query,
      company_id: filters.value.company_id,
      department_id: filters.value.department_id,
      line_type: filters.value.line_type,
      employee_id: filters.value.employee_id,
    },
  })
}

const formatDate = (ts) => {
  if (!ts) return ''
  const d = new Date(ts)
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}
</script>


<template>
  <div class="space-y-2 px-4">
    <div class="flex items-center justify-between gap-2">
      <button class="btn-3" @click="goBack">
        <i class="far fa-arrow-left"></i>
        <span class="hidden md:flex">Back</span>
      </button>

      <h1 class="title-md md:title-lg flex-wrap text-center">Short Leaves</h1>

      <div></div>
    </div>
    <div class="flex flex-wrap gap-4 p-3">
        <EmployeeFilter
          v-model:company_id="filters.company_id"
            v-model:department_id="filters.department_id"
            v-model:employee_id="filters.employee_id"
            v-model:line_type="filters.line_type"
            :with-type="true"
            :initial-value="$route.query"
          @filter-change="handleFilterChange"
        >
        <div>
          <select
            v-model="shortLeaveStore.selectedStatus"
            @change="fetchShortLeavesByUser"
            class="input-1 py-0.5 px-2 text-center"
          >
            <option value="" selected>All</option>
            <option value="Pending">Pending</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
          </select>
        </div>
      </EmployeeFilter>

      <div class="flex gap-4">
        <FlexibleDatePicker
          v-model="period"
          :show-year="false"
          :show-month="true"
          :show-date="false"
        />
        <button type="button" @click="fetchShortLeavesByUser" class="btn-2 py-1">
          <span class="hidden md:flex">Search</span>
        </button>
      </div>
    </div>

    <div v-if="shortLeaveStore.loading" class="text-center py-4">
      <LoaderView />
    </div>

    <div v-else class="space-y-4">
      <div class="overflow-x-auto">
        <table
          class="min-w-full table-auto border-collapse border border-gray-200 bg-white rounded-md text-sm"
        >
          <thead>
            <tr class="bg-gray-200">
              <th class="border border-gray-300 px-2 text-left">#</th>
              <th class="border border-gray-300 px-2 text-left">Employee Name</th>
              <th class="border border-gray-300 px-2 text-left">Type</th>
              <th class="border border-gray-300 px-2 text-left">Created Date</th>
              <th class="border border-gray-300 px-2 text-left">Date</th>
              <th class="border border-gray-300 px-2 text-left">Start Time</th>
              <th class="border border-gray-300 px-2 text-left">End Time</th>
              <th class="border border-gray-300 px-2 text-left">Total Minutes</th>
              <th class="border border-gray-300 px-2 text-left">Attachment</th>
              <th class="border border-gray-300 px-2 text-left">Status</th>
              <th class="border border-gray-300 px-2 text-left">Action</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(leave, index) in shortLeaveStore?.shortLeaves"
              :key="leave?.id"
              class="border-b border-gray-200 hover:bg-blue-200"
            >
              <td class="border border-gray-300 px-2">{{ index + 1 }}</td>
              <td class="border border-gray-300 px-2">{{ leave?.user?.name || 'Unknown' }}</td>
              <td class="border border-gray-300 px-2">{{ leave?.type || 'Unknown' }}</td>
              <td class="border border-gray-300 px-2">{{ formatDate(leave.created_at) }}</td>
              <td class="border border-gray-300 px-2">{{ formatDate(leave.date) }}</td>
              <td class="border border-gray-300 px-2">{{ formatTime(leave.start_time) }}</td>
              <td class="border border-gray-300 px-2">
                {{ leave.end_time ? formatTime(leave.end_time) : '' }}
              </td>
              <td class="border border-gray-300 px-2">{{ leave.total_minutes }}</td>
              <td class="border border-gray-300 px-2 text-center">
                <a
                  v-if="leave.attachment"
                  :href="leave?.attachment"
                  target="_blank"
                  class="text-blue-500 underline"
                >
                  <i class="fad fa-link"></i>
                </a>
              </td>
              <td class="border border-gray-300 px-2">{{ leave.status || 'N/A' }}</td>
              <td class="border border-gray-300 px-2">
                <div class="flex gap-2">
                  <RouterLink
                    :to="{ name: 'ShortLeaveShow', params: { id: leave?.id } }"
                    class="btn-icon"
                  >
                    <i class="far fa-eye"></i>
                  </RouterLink>
                  <button @click="deleteApplication(leave?.id)" class="btn-icon text-red-500">
                    <i class="far fa-trash"></i>
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="shortLeaveStore?.shortLeaves?.length === 0">
              <td colspan="8" class="p-2 text-center text-red-500">No short leaves found</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
