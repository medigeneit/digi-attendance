<script setup>
import EmployeeFilter from '@/components/common/EmployeeFilter.vue'
import LoaderView from '@/components/common/LoaderView.vue'
import { useManualAttendanceStore } from '@/stores/manual-attendance'
import { useUserStore } from '@/stores/user'
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const router = useRouter()
const route = useRoute()
const manualAttendanceStore = useManualAttendanceStore()
const userStore = useUserStore()
const selectedUser = ref(null)
const selectedMonth = ref(route.query.date || manualAttendanceStore.selectedMonth)

const loading = ref(false)

const filters = ref({
  company_id: route.query.company_id || '',
  department_id: route.query.department_id || 'all',
  type: route.query.type || 'all',
  employee_id: route.query.employee_id || '',
  category: '',
})

const fetchManualAttendancesByUser = async () => {
  const payload = {
    company_id: filters.value.company_id,
    department_id: filters.value.department_id,
    selectedMonth: selectedMonth.value,
    selectedStatus: manualAttendanceStore.selectedStatus,
  }

  if (filters.value.employee_id) {
    payload.user_id = filters.value.employee_id
  }

  loading.value = true
  await manualAttendanceStore.fetchManualAttendances(payload)
  loading.value = false
}

// Initial data load
onMounted(async () => {
  await userStore.fetchUsers()
  selectedUser.value = userStore.users.find(user => user.id == filters.value.employee_id) || null
  await fetchManualAttendancesByUser()
})

// Watch filters and month
watch(
  () => [
    filters.value.company_id,
    filters.value.department_id,
    filters.value.employee_id,
    selectedMonth.value,
  ],
  async () => {
    await fetchManualAttendancesByUser()
  }
)

// Watch month to sync with URL
watch(selectedMonth, (date) => {
  router.replace({
    query: {
      ...route.query,
      date,
    },
  })
})

// Computed for filtered result
const filteredManualAttendances = computed(() => {
  return manualAttendanceStore.manualAttendances || []
})

// Navigation
const goBack = () => {
  router.go(-1)
}

// Delete
const deleteApplication = async (applicationId) => {
  if (confirm('Are you sure to delete this application?')) {
    await manualAttendanceStore.deleteManualAttendance(applicationId)
    await fetchManualAttendancesByUser()
  }
}

// Formatters
const formatDate = (dt) => {
  return new Date(dt).toLocaleDateString('en-GB') // 19/06/2025
}

const formatTime = (datetime) => {
  if (!datetime) return null
  return new Date(datetime).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Dhaka',
  })
}

// Update query string when filter changes
const handleFilterChange = () => {
  router.replace({
    query: {
      ...route.query,
      company_id: filters.value.company_id,
      department_id: filters.value.department_id,
      type: filters.value.type,
      employee_id: filters.value.employee_id,
    },
  })
}
</script>


<template>
  <div class="space-y-2 px-4">
    <div class="flex items-center justify-between gap-2">
      <button class="btn-3" @click="goBack">
        <i class="far fa-arrow-left"></i>
        <span class="hidden md:flex">Back</span>
      </button>

      <h1 class="title-md md:title-lg flex-wrap text-center">Manual Attendances</h1>
      <div>
        <RouterLink :to="{ name: 'HrdManualAttendanceAdd' }" class="btn-3">
          <i class="far fa-plus"></i>
          <span class="hidden md:flex">Add Manual Attendance</span>
        </RouterLink>
      </div>
    </div>
    <div class="flex flex-wrap gap-4">

       <EmployeeFilter 
          v-model="filters" 
          :initial-value="route.query" 
          @filter-change="handleFilterChange" 
        />

      <div>
        <input
          id="monthSelect"
          type="month"
          v-model="selectedMonth"
          @change="fetchManualAttendancesByUser"
          class="input-1"
        />
      </div>
      <div>
        <select
          v-model="manualAttendanceStore.selectedStatus"
          @change="fetchManualAttendancesByUser"
          class="input-1"
        >
          <option value="" selected>All</option>
          <option value="Pending">Pending</option>
          <option value="Approved">Approved</option>
          <option value="Rejected">Rejected</option>
        </select>
      </div>
    </div>

    <div v-if="manualAttendanceStore?.loading" class="text-center py-4">
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
              <th class="border border-gray-300 px-2 text-left">Department</th>
              <th class="border border-gray-300 px-2 text-left">Create</th>
              <th class="border border-gray-300 px-2 text-left">Date</th>
              <th class="border border-gray-300 px-2 text-left">Type</th>
              <th class="border border-gray-300 px-2 text-left">Check-In</th>
              <th class="border border-gray-300 px-2 text-left">Check-Out</th>
              <th class="border border-gray-300 px-2 text-left">Status</th>
              <th class="border border-gray-300 px-2 text-left">Action</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(attendance, index) in filteredManualAttendances"
              :key="attendance?.id"
              class="border-b border-gray-200 hover:bg-blue-200"
            >
              <td class="border border-gray-300 px-2">{{ index + 1 }}</td>
              <td class="border border-gray-300 px-2">{{ attendance?.user?.name }}</td>
              <td class="border border-gray-300 px-2">{{ attendance?.user?.department?.name }}</td>
              <td class="border border-gray-300 px-2">
                {{ formatDate(attendance.created_at) }}
              </td>
              <td class="border border-gray-300 px-2">
                {{ formatDate(attendance.check_in || attendance.check_out) }}
              </td>
              <td class="border border-gray-300 px-2">{{ attendance.type }}</td>
              <td class="border border-gray-300 px-2">
                {{ formatTime(attendance.check_in) || 'N/A' }}
              </td>
              <td class="border border-gray-300 px-2">
                {{ formatTime(attendance.check_out) || 'N/A' }}
              </td>
              <td class="border border-gray-300 px-2">
                <span
                  :class="{
                    'bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded text-xs':
                      attendance.status === 'Pending',
                    'bg-green-100 text-green-800 px-2 py-0.5 rounded text-xs':
                      attendance.status === 'Approved',
                    'bg-red-100 text-red-800 px-2 py-0.5 rounded text-xs':
                      attendance.status === 'Rejected',
                  }"
                >
                  {{ attendance.status }}
                </span>
              </td>
              <td class="border border-gray-300 px-2">
                <div class="flex gap-2">
                  <RouterLink
                    :to="{ name: 'ManualAttendanceShow', params: { id: attendance?.id } }"
                    class="btn-icon"
                  >
                    <i class="far fa-eye"></i>
                  </RouterLink>

                  <button @click="deleteApplication(attendance?.id)" class="btn-icon text-red-500">
                    <i class="far fa-trash"></i>
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="filteredManualAttendances.length === 0">
              <td colspan="7" class="p-2 text-center text-red-500">No manual attendances found</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
