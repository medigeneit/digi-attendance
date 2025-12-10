<script setup>
import EmployeeFilter from '@/components/common/EmployeeFilter.vue'
import FlexibleDatePicker from '@/components/FlexibleDatePicker.vue'
import LoaderView from '@/components/common/LoaderView.vue'
import SelectedEmployeeCard from '@/components/user/SelectedEmployeeCard.vue'
import { useAttendanceStore } from '@/stores/attendance'
import { useUserStore } from '@/stores/user'
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()
const attendanceStore = useAttendanceStore()

const selectedUser = ref(null)
const now = new Date()
const pad = (value) => value.toString().padStart(2, '0')
const initialMonth = route.query.date || attendanceStore.selectedMonth || `${now.getFullYear()}-${pad(now.getMonth() + 1)}`
const selectedMonth = ref(initialMonth)
const period = ref({
  year: Number(initialMonth.split('-')[0] || now.getFullYear()),
  month: Number(initialMonth.split('-')[1] || now.getMonth() + 1),
  day: 1,
})
const periodMonth = computed(() => {
  if (!period.value?.year || !period.value?.month) return ''
  return `${period.value.year}-${pad(period.value.month)}`
})

const filters = ref({
  company_id: route.query.company_id || '',
  department_id: route.query.department_id || 'all',
  line_type: route.query.line_type || 'all',
  employee_id: route.query.employee_id || '',
  category: '',
})

// Fetch selected user info
const fetchUser = async (employeeId) => {
  if (employeeId) {
    await userStore.fetchUser(employeeId)
    selectedUser.value = userStore.user
  } else {
    selectedUser.value = null
  }
}

// Fetch attendance
const fetchAttendance = async () => {
  if (filters.value.employee_id && selectedMonth.value) {
    await attendanceStore.getMonthlyAttendanceLog(filters.value.employee_id, selectedMonth.value)
  }
}

// Initial fetch on mount
onMounted(async () => {
  if (filters.value.employee_id) {
    await fetchUser(filters.value.employee_id)
    await fetchAttendance()
  }
})

// Watch employee_id changes
watch(
  () => filters.value.employee_id,
  async (newVal, oldVal) => {
    if (newVal && newVal !== oldVal) {
      await fetchUser(newVal)
      await fetchAttendance()
    router.replace({
      query: {
        ...route.query,
        employee_id: newVal,
        date: periodMonth.value || undefined,
      },
    })
    }
  }
)

// Watch month change
watch(
  periodMonth,
  (newDate) => {
    if (!newDate) return
    selectedMonth.value = newDate
    router.replace({
      query: {
        ...route.query,
        date: newDate,
      },
    })
    fetchAttendance()
  },
  { immediate: true }
)

// Go back
const goBack = () => router.go(-1)

// Format time
const formatTime = (timestamp) => {
  const d = new Date(timestamp)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

// Apply filters from EmployeeFilter component
const handleFilterChange = () => {
  router.replace({
      query: {
        ...route.query,
        company_id: filters.value.company_id,
        department_id: filters.value.department_id,
        line_type: filters.value.line_type,
        employee_id: filters.value.employee_id,
        date: periodMonth.value || undefined,
      },
  })
}
</script>


<template>
  <div class="px-4 space-y-4">
    <div class="flex items-center justify-between gap-2">
      <button class="btn-3" @click="goBack">
        <i class="far fa-arrow-left"></i>
        <span class="hidden md:flex">Back</span>
      </button>
      <h1 class="title-md md:title-lg flex-wrap text-center">Attendance Log</h1>
      <div></div>
    </div>

    <div class="flex flex-wrap gap-4 items-center">
      <EmployeeFilter
        v-model:company_id="filters.company_id"
        v-model:department_id="filters.department_id"
        v-model:employee_id="filters.employee_id"
        v-model:line_type="filters.line_type"
        :with-type="true"
        :initial-value="$route.query"
        @filter-change="handleFilterChange"
      />
      <FlexibleDatePicker
        v-model="period"
        :show-year="false"
        :show-month="true"
        :show-date="false"
      />
    </div>

    <div v-if="selectedUser" class="flex justify-between gap-4 text-sm">
        <SelectedEmployeeCard :user="selectedUser"/>
    </div>
    <LoaderView v-if="attendanceStore.isLoading" />
    <div v-else class="space-y-4">
      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        <div
          v-for="(logs, date) in attendanceStore.attendanceLogs"
          :key="date"
          class="bg-white shadow rounded-lg p-4"
        >
          <h3 class="text-sm font-semibold text-blue-700 border-b pb-1 mb-2">{{ date }}</h3>

          <div
            v-for="(log, index) in logs"
            :key="log.id"
            class="flex items-center justify-between text-xs mb-1"
          >
            <div class="flex items-center gap-1 text-gray-700">
              <i class="far fa-clock text-blue-500"></i>
              {{ formatTime(log.timestamp) }}
            </div>
            <div class="text-right text-gray-500 bg-blue-100 px-2 py-0.5 rounded text-[10px]">
              {{ log?.device?.name || 'Unknown' }}
            </div>
          </div>
        </div>
      </div>
    </div>
    
  </div>
</template>
