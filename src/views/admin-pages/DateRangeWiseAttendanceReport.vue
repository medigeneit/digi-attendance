<script setup>
import EmployeeFilter from '@/components/common/EmployeeFilter.vue'
import LoaderView from '@/components/common/LoaderView.vue'
import FlexibleDatePicker from '@/components/FlexibleDatePicker.vue'
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

const pad = (value) => String(value).padStart(2, '0')

const buildPeriod = (value) => {
  if (!value) return null
  const [year, month, day] = value.split('-')
  if (!year || !month || !day) return null
  return {
    year: Number(year),
    month: Number(month),
    day: Number(day),
  }
}

const fromPeriod = (period) => {
  if (!period) return ''
  return `${period.year}-${pad(period.month)}-${pad(period.day)}`
}

const selectedDateRange = ref({
  start: route.query.start_date || '',
  end: route.query.end_date || '',
})

const startPeriod = ref(buildPeriod(selectedDateRange.value.start))
const endPeriod = ref(buildPeriod(selectedDateRange.value.end))

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
  console.log({
    dateRange: selectedDateRange.value,
    filters: filters.value,
  })
  if (!filters.value.company_id || !selectedDateRange.value.start || !selectedDateRange.value.end)
    return

  const res = await attendanceStore.getDateRangeAttendanceSummary(
    selectedDateRange.value.start,
    selectedDateRange.value.end,
    filters.value.company_id,
    filters.value.line_type,
    filters.value.employee_id,
  )

  console.log('Date Range Attendance:', res)

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

watch(
  () => filters.value.company_id,
  async (newVal) => {
    if (newVal) {
      await companyStore.fetchEmployee(newVal)
      employees.value = companyStore.employees
    }
  },
)

watch(
  () => [
    filters.value.company_id,
    filters.value.employee_id,
    filters.value.line_type,
    selectedDateRange.value.start,
    selectedDateRange.value.end,
  ],
  async () => {
    await fetchDateRangeAttendance()
  },
  { deep: true },
)

watch(startPeriod, (value) => {
  if (!value) return
  const normalized = fromPeriod(value)
  if (selectedDateRange.value.start !== normalized) {
    selectedDateRange.value.start = normalized
  }
})

watch(endPeriod, (value) => {
  if (!value) return
  const normalized = fromPeriod(value)
  if (selectedDateRange.value.end !== normalized) {
    selectedDateRange.value.end = normalized
  }
})

watch(
  () => selectedDateRange.value.start,
  (value) => {
    const parsed = buildPeriod(value)
    if (parsed) {
      if (
        !startPeriod.value ||
        startPeriod.value.year !== parsed.year ||
        startPeriod.value.month !== parsed.month ||
        startPeriod.value.day !== parsed.day
      ) {
        startPeriod.value = parsed
      }
    }
  },
)

watch(
  () => selectedDateRange.value.end,
  (value) => {
    const parsed = buildPeriod(value)
    if (parsed) {
      if (
        !endPeriod.value ||
        endPeriod.value.year !== parsed.year ||
        endPeriod.value.month !== parsed.month ||
        endPeriod.value.day !== parsed.day
      ) {
        endPeriod.value = parsed
      }
    }
  },
)

const handleFilterChange = () => {
  router.replace({
    query: {
      ...route.query,
      company_id: filters.value.company_id,
      department_id: filters.value.department_id,
      type: filters.value.type,
      employee_id: filters.value.employee_id,
      start_date: selectedDateRange.value.start,
      end_date: selectedDateRange.value.end,
    },
  })
  fetchDateRangeAttendance()
}
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
      <h1 class="text-xl md:text-2xl font-semibold text-center">📅 Date Range Attendance Report</h1>

      <div></div>
    </div>

    <!-- Filter Controls Section -->
    <div class="bg-white shadow-sm border rounded-lg p-4 grid gap-4">
      <!-- Date Range -->
      <div class="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div class="flex flex-wrap gap-4">
          <FlexibleDatePicker
            v-model="startPeriod"
            :show-year="false"
            :show-month="false"
            :show-date="true"
            label="Start Date"
          />
          <FlexibleDatePicker
            v-model="endPeriod"
            :show-year="false"
            :show-month="false"
            :show-date="true"
            label="End Date"
          />
        </div>
        <div class="flex gap-4">
          <button
            type="button"
            @click="fetchDateRangeAttendance"
            class="btn-2 flex items-center gap-2 px-4 py-1"
            title="Get Report"
          >
            <span class="hidden sm:inline">Get Report</span>
          </button>
          <button
            type="button"
            @click="downloadDateRangeExcel"
            class="btn-1 ml-auto flex items-center gap-2 px-4 py-1"
          >
            <i class="far fa-file-excel text-green-600"></i>
            <span class="hidden sm:inline">Download Excel</span>
          </button>
        </div>
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
      </div>
    </div>

    <LoaderView v-if="attendanceStore.isLoading" />

    <div v-else class="space-y-4">
      <div class="rounded-2xl border border-slate-200 bg-white shadow-lg">
        <div
          class="flex items-center justify-between gap-2 border-b border-slate-100 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700"
        >
          <div>
            <p class="uppercase tracking-wider text-[11px] text-slate-500">Attendance grid</p>
            <h2 class="text-base font-semibold text-slate-900">Detailed daily log</h2>
          </div>
          <span class="text-xs text-slate-500">{{ dateList.length }} day(s)</span>
        </div>
        <div class="overflow-x-auto">
          <table class="min-w-[900px] text-sm text-slate-600">
            <thead class="bg-slate-100 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th class="px-3 py-2 text-left">#</th>
                <th class="px-3 py-2 text-left">Employee</th>
                <th v-for="date in dateList" :key="date" colspan="5" class="px-3 py-2 text-left">
                  {{ formatDate(date) }}
                </th>
              </tr>
              <tr class="bg-slate-50 text-[10px] text-center tracking-wider">
                <th></th>
                <th></th>
                <template v-for="date in dateList" :key="`detail-${date}`">
                  <th class="px-2 py-1">In</th>
                  <th class="px-2 py-1">Out</th>
                  <th class="px-2 py-1">Late</th>
                  <th class="px-2 py-1">Early</th>
                  <th class="px-2 py-1">Comment</th>
                </template>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(emp, idx) in dateRangeAttendance"
                :key="emp.employee_name || idx"
                class="border-b border-slate-100 bg-white hover:bg-slate-50"
              >
                <td class="px-3 py-2 font-semibold text-slate-700">{{ idx + 1 }}</td>
                <td class="px-3 py-2 text-slate-800">{{ emp.employee_name }}</td>
                <template v-for="date in dateList" :key="`row-${emp.employee_name}-${date}`">
                  <td class="px-2 py-2 text-center">{{ emp.attendance?.[date]?.in || '-' }}</td>
                  <td class="px-2 py-2 text-center">{{ emp.attendance?.[date]?.out || '-' }}</td>
                  <td class="px-2 py-2 text-center text-amber-600 font-semibold">
                    {{ emp.attendance?.[date]?.late || '-' }}
                  </td>
                  <td class="px-2 py-2 text-center text-emerald-600 font-semibold">
                    {{ emp.attendance?.[date]?.early || '-' }}
                  </td>
                  <td class="px-2 py-2 text-center text-xs text-slate-500">
                    {{ emp.attendance?.[date]?.comment || '—' }}
                  </td>
                </template>
              </tr>
              <tr v-if="!dateRangeAttendance.length">
                <td colspan="100%" class="px-3 py-8 text-center text-slate-500">
                  No attendance available for the selected filters.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>
