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

const formatDate = (date) => format(new Date(date), 'dd MMM yyyy')
const formatDay = (date) => format(new Date(date), 'EEE')

const flatRows = computed(() => {
  if (!Array.isArray(dateRangeAttendance.value) || !dateList.value.length) return []
  return dateRangeAttendance.value.flatMap((emp) =>
    dateList.value.map((date) => {
      const attendance = emp.attendance?.[date] || {}
      return {
        key: `${emp.employee_id || emp.employee_name || 'emp'}-${date}`,
        employee_name: emp.employee_name || '-',
        date,
        in: attendance.in ?? '-',
        out: attendance.out ?? '-',
        late: attendance.late ?? '-',
        early: attendance.early ?? '-',
        comment: attendance.comment ?? '-',
      }
    }),
  )
})

const totalEmployees = computed(() =>
  Array.isArray(dateRangeAttendance.value) ? dateRangeAttendance.value.length : 0,
)

const rangeLabel = computed(() => {
  const { start, end } = selectedDateRange.value
  if (!start || !end) return 'Select a date range'
  return `${formatDate(start)} - ${formatDate(end)}`
})

const fetchDateRangeAttendance = async () => {
  if (!filters.value.company_id || !selectedDateRange.value.start || !selectedDateRange.value.end)
    return

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
      line_type: filters.value.line_type,
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

    <div class="report-hero glass-panel px-5 py-4">
      <div class="flex items-center gap-3">
        <button class="btn-3 flex items-center gap-2" @click="goBack">
          <i class="far fa-arrow-left text-lg"></i>
          <span class="hidden md:inline-block">Back</span>
        </button>
        <div class="space-y-1">
          <p class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
            Attendance analytics
          </p>
          <h1 class="title-md">Date Range Attendance Report</h1>
          <p class="text-sm text-slate-500">
            Review in/out times, late/early counts, and comments by day.
          </p>
        </div>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <span class="tag">{{ rangeLabel }}</span>
        <span class="text-xs text-slate-500">
          {{ totalEmployees }} employees | {{ dateList.length }} days
        </span>
      </div>
    </div>

    <div class="glass-panel p-4 space-y-4">
      <div class="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
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
        <div class="flex flex-wrap items-center justify-end gap-2">
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
            class="btn-1 flex items-center gap-2 px-4 py-1"
          >
            <i class="far fa-file-excel text-green-600"></i>
            <span class="hidden sm:inline">Download Excel</span>
          </button>
        </div>
      </div>

      <EmployeeFilter
        v-model:company_id="filters.company_id"
        v-model:department_id="filters.department_id"
        v-model:employee_id="filters.employee_id"
        v-model:line_type="filters.line_type"
        :with-type="true"
        :initial-value="$route.query"
        @filter-change="handleFilterChange"
        class="w-full"
      >
        <div class="flex items-end justify-end">
          <button
            type="button"
            class="btn-2 h-8 px-3 text-xs"
            @click="handleFilterChange"
          >
            Search
          </button>
        </div>
      </EmployeeFilter>
    </div>

    <LoaderView v-if="attendanceStore.isLoading" />

    <div v-else class="space-y-4">
      <div class="rounded-2xl border border-slate-200 bg-white shadow-lg">
        <div class="table-header">
          <div>
            <p class="uppercase tracking-wider text-[11px] text-slate-500">Attendance grid</p>
            <h2 class="text-base font-semibold text-slate-900">Detailed daily log</h2>
          </div>
          <span class="text-xs text-slate-500">
            {{ totalEmployees }} employees | {{ dateList.length }} days | {{ flatRows.length }} rows
          </span>
        </div>
        <div class="table-scroll">
          <table class="min-w-full text-sm text-slate-600">
            <thead class="sticky top-0 bg-slate-100 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th class="th w-12 text-left">#</th>
                <th class="th text-left">Employee</th>
                <th class="th text-left">Date</th>
                <th class="th text-center">In</th>
                <th class="th text-center">Out</th>
                <th class="th text-center">Late</th>
                <th class="th text-center">Early</th>
                <th class="th text-left">Comment</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(row, idx) in flatRows"
                :key="row.key"
                class="border-b border-slate-100 hover:bg-slate-100/60"
                :class="idx % 2 === 1 ? 'row-odd' : 'row-even'"
              >
                <td class="td font-semibold text-slate-700">{{ idx + 1 }}</td>
                <td class="td text-slate-800">{{ row.employee_name }}</td>
                <td class="td">
                  <div class="font-medium text-slate-700">{{ formatDate(row.date) }}</div>
                  <div class="text-[11px] text-slate-400">{{ formatDay(row.date) }}</div>
                </td>
                <td class="td text-center">{{ row.in }}</td>
                <td class="td text-center">{{ row.out }}</td>
                <td class="td text-center text-amber-600 font-semibold">{{ row.late }}</td>
                <td class="td text-center text-emerald-600 font-semibold">{{ row.early }}</td>
                <td class="td">
                  <div class="max-w-[220px] truncate text-slate-500" :title="row.comment">
                    {{ row.comment }}
                  </div>
                </td>
              </tr>
              <tr v-if="!flatRows.length">
                <td colspan="8" class="px-3 py-8 text-center text-slate-500">
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

<style scoped>
.glass-panel { @apply rounded-2xl border border-slate-100 bg-white/70 shadow-sm; }
.report-hero { @apply flex flex-col gap-4 md:flex-row md:items-center md:justify-between; }
.table-header { @apply flex items-center justify-between gap-2 border-b border-slate-100 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700; }
.table-scroll { max-height: 70vh; overflow: auto; }
.th { @apply border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600; }
.td { @apply border border-slate-200 px-3 py-2 text-sm text-slate-700 tabular-nums; }
.row-odd { @apply bg-slate-50; }
.row-even { @apply bg-white; }
.tag { @apply inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600; }
</style>
