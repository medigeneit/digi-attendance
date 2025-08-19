<script setup>
import EmployeeFilter from '@/components/common/EmployeeFilter.vue'
import LoaderView from '@/components/common/LoaderView.vue'
import Multiselect from '@/components/MultiselectDropdown.vue'
import { useAttendanceStore } from '@/stores/attendance'
import { useCompanyStore } from '@/stores/company'
import { eachDayOfInterval, format } from 'date-fns'
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const attendanceStore = useAttendanceStore()
const companyStore = useCompanyStore()
const router = useRouter()
const route = useRoute()

const companies = ref([])
const employees = ref([])

const selectedDateRange = ref({
  start: '',
  end: '',
})

const dateRangeAttendance = ref([])

const filters = ref({
  company_id: route.query.company_id || '',
  department_id: route.query.department_id || 'all',
  line_type: route.query.line_type || 'all',
  employee_id: route.query.employee_id || '',
})

const dateList = computed(() => {
  if (!selectedDateRange.value.start || !selectedDateRange.value.end) return []
  return eachDayOfInterval({
    start: new Date(selectedDateRange.value.start),
    end: new Date(selectedDateRange.value.end),
  }).map((d) => format(d, 'yyyy-MM-dd'))
})

const formatDate = (date) => {
  return new Date(date).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
  })
}

const fetchDateRangeAttendance = async () => {
  if (!filters.value.company_id || !selectedDateRange.value.start || !selectedDateRange.value.end) return

  const res = await attendanceStore.getDateRangeAttendanceSummary(
    selectedDateRange.value.start,
    selectedDateRange.value.end,
    filters.value.company_id,
    filters.value.line_type,
    filters.value.employee_id,
  )

  if (res) {
    dateRangeAttendance.value = res
  }
}

const downloadDateRangeExcel = async () => {
  attendanceStore.downloadDateRangeExcel(
    selectedDateRange.value.start,
    selectedDateRange.value.end,
    filters.value.company_id,
    filters.value.line_type,
    filters.value.employee_id,
  )
}

const goBack = () => router.go(-1)

onMounted(async () => {
  await companyStore.fetchCompanies()
  companies.value = companyStore.companies

  if (filters.value.company_id) {
    await companyStore.fetchEmployee(filters.value.company_id)
    employees.value = companyStore.employees
  }
})

watch(() => filters.value.company_id, async (newVal) => {
  if (newVal) {
    await companyStore.fetchEmployee(newVal)
    employees.value = companyStore.employees
  }
})

watch([() => filters.value.company_id, () => filters.value.employee_id, () => filters.value.line_type, selectedDateRange], async () => {
  await fetchDateRangeAttendance()
}, { deep: true })

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
  fetchDateRangeAttendance()
}

const initialFilter = computed(() => ({
  company_id: route.query.company_id || '',
  department_id: route.query.department_id || 'all',
  type: route.query.type || 'all',
  employee_id: route.query.employee_id || '',
  line_type: '',
}))
</script>
<template>
  <div class="px-4 space-y-4">
    <div class="flex flex-wrap items-center justify-between gap-4 mb-6">
      <!-- Back Button -->
      <button class="btn-3 flex items-center gap-2" @click="goBack">
        <i class="far fa-arrow-left text-lg"></i>
        <span class="hidden md:inline-block">Back</span>
      </button>

      <!-- Page Title -->
      <h1 class="text-xl md:text-2xl font-semibold text-center">
        📅 Date Range Attendance Report 
      </h1>

      <!-- Export Excel Button -->
      <button
        type="button"
        @click="downloadDateRangeExcel"
        class="btn-1 flex items-center gap-2 px-4 py-2"
        title="Download Excel"
      >
        <i class="far fa-file-excel text-xl text-green-600"></i>
        <span class="hidden sm:inline">Export Excel</span>
      </button>
    </div>

    <!-- Filter Controls Section -->
    <div class="bg-white shadow-sm border rounded-lg p-4 grid gap-4">
      <!-- Date Range -->
      <div class="flex flex-wrap gap-4">
        <div class="flex flex-col">
          <label class="text-xs font-medium text-gray-600 mb-1">Start Date</label>
          <input type="date" v-model="selectedDateRange.start" class="input-1 w-[150px]" />
        </div>

        <div class="flex flex-col">
          <label class="text-xs font-medium text-gray-600 mb-1">End Date</label>
          <input type="date" v-model="selectedDateRange.end" class="input-1 w-[150px]" />
        </div>
      </div>

      <!-- Get Report Button -->
      <div class="w-full flex flex-wrap gap-4 items-center md:w-auto">

        <EmployeeFilter
          v-model:company_id="filters.company_id"
          v-model:department_id="filters.department_id"
          v-model:employee_id="filters.employee_id"
          v-model:line_type="filters.line_type"
          :with-type="true"
          :initial-value="$route.query"
         @filter-change="handleFilterChange"
      />
        <button
          type="button"
          @click="fetchDateRangeAttendance"
          class="btn-1 flex items-center gap-2 px-4 py-2"
          title="Get Report"
        >
          <i class="far fa-search text-xl"></i>
          <span class="hidden sm:inline">Get Report</span>
        </button>
      </div>
    </div>

    <LoaderView v-if="attendanceStore.isLoading" />

    <div v-else class="overflow-auto">
      <table class="min-w-full table-auto border-collapse border border-gray-400 bg-white">
        <thead>
          <tr class="bg-gray-100 text-sm">
            <th class="border px-2 py-1">#</th>
            <th class="border px-2 py-1">Emp/Worker Name</th>
            <th v-for="date in dateList" :key="date" colspan="5" class="border px-2 py-1">
              {{ formatDate(date) }}
            </th>
          </tr>
          <tr class="bg-gray-50 text-xs">
            <th class="border px-2 py-1"></th>
            <th class="border px-2 py-1"></th>
            <template v-for="date in dateList" :key="date">
              <th class="border px-2 py-1">In</th>
              <th class="border px-2 py-1">Out</th>
              <th class="border px-2 py-1">Late</th>
              <th class="border px-2 py-1">Early</th>
              <th class="border px-2 py-1">Comment</th>
            </template>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(emp, idx) in dateRangeAttendance"
            :key="emp.employee_name"
            class="hover:bg-blue-50 text-sm"
          >
            <td class="border px-2 py-1">{{ idx + 1 }}</td>
            <td class="border px-2 py-1">{{ emp.employee_name }}</td>
            <template v-for="date in dateList" :key="date">
              <td class="border px-2 py-1">
                {{ emp.attendance?.[date]?.in || '-' }}
              </td>
              <td class="border px-2 py-1">
                {{ emp.attendance?.[date]?.out || '-' }}
              </td>
              <td class="border px-2 py-1">
                {{ emp.attendance?.[date]?.late || '-' }}
              </td>
              <td class="border px-2 py-1">
                {{ emp.attendance?.[date]?.early || '-' }}
              </td>
              <td class="border px-2 py-1">
                {{ emp.attendance?.[date]?.comment || '' }}
              </td>
            </template>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
