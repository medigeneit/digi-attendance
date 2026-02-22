<script setup>
import { ref, watch, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'

import LoaderView from '@/components/common/LoaderView.vue'
import EmployeeFilter from '@/components/common/EmployeeFilter.vue'
import FlexibleDatePicker from '@/components/FlexibleDatePicker.vue'
import { useAttendanceStore } from '@/stores/attendance'
import { useCompanyStore } from '@/stores/company'
const router = useRouter()
const route = useRoute()

// Stores
const companyStore = useCompanyStore()
const attendanceStore = useAttendanceStore()
// Store refs
const { dailyLogs } = storeToRefs(attendanceStore)

// Filter refs
const selectedCompanyId = ref(route.query.company_id || '')
const selectedDepartment = ref(route.query.department_id || '')
const selectedEmployeeId = ref(route.query.employee_id || '')
const selectedDate = ref(route.query.date || attendanceStore.selectedDate || '')
const status = ref(route.query.status || 'all')
const line_type = ref(route.query.line_type || 'all')
const statusOptions = [
  { label: 'All Status', value: 'all' },
  { label: 'Present', value: 'Present' },
  { label: 'Absent', value: 'Absent' },
  { label: 'Weekend', value: 'Weekend' },
  { label: 'Holiday', value: 'Holiday' },
  { label: 'Leave', value: 'Leave' },
]

// Filter object for sync
const pad = (val) => String(val).padStart(2, '0')

const parsePeriod = (value) => {
  const base = value || selectedDate.value
  if (!base) {
    const today = new Date()
    return { year: today.getFullYear(), month: today.getMonth() + 1, day: today.getDate() }
  }
  const [year, month, day] = base.split('-')
  return {
    year: Number(year) || new Date().getFullYear(),
    month: Number(month) || new Date().getMonth() + 1,
    day: Number(day) || 1,
  }
}
const initialPeriod = parsePeriod()
const period = ref({ ...initialPeriod })

const filters = ref({
  company_id: selectedCompanyId.value,
  department_id: selectedDepartment.value,
  line_type: line_type.value,
  employee_id: selectedEmployeeId.value,
})

const logs = computed(() => (Array.isArray(dailyLogs.value) ? dailyLogs.value : []))
const headerTitle = computed(() => {
  const currentStatus =
    status.value && status.value !== 'all' ? status.value : 'Attendance'
  return `Today ${currentStatus} Report`
})
const summaryTiles = computed(() => {
  const rows = logs.value
  const total = rows.length
  const countBy = (label) => rows.filter((row) => row.status === label).length
  return [
    { label: 'Records', value: total, tone: 'neutral' },
    { label: 'Present', value: countBy('Present'), tone: 'success' },
    { label: 'Leave/Holiday', value: countBy('Leave') + countBy('Holiday'), tone: 'info' },
    { label: 'Absent', value: countBy('Absent'), tone: 'danger' },
  ]
})
const hasFilters = computed(() => Boolean(filters.value.company_id))

// Fetch attendance based on filters
const fetchAttendance = async () => {
  const { company_id, department_id, employee_id, line_type } = filters.value

  // Only fetch if company or status is selected
  if (company_id || (status.value && status.value !== 'all')) {
    await attendanceStore.getTodayAttendanceReport({
      companyId: filters.value.company_id,
      departmentId: department_id,
      employee_id: employee_id,
      line_type: line_type,
      month: selectedDate.value,
      status: status.value,
    })

  }
}


// Handle filter change → sync with query
const handleFilterChange = () => {
  const newQuery = {
    company_id: filters.value.company_id,
    department_id: filters.value.department_id,
    line_type: filters.value.line_type,
    employee_id: filters.value.employee_id,
    date: selectedDate.value,
    status: status.value,
  }

  const isDifferent = Object.entries(newQuery).some(
    ([key, value]) => route.query[key] !== String(value)
  )

  if (isDifferent) {
    router.replace({ query: newQuery })
  }
}

// Download actions
const getExportExcel = () =>
  attendanceStore.attendanceDownloadExcel(
    filters.value.company_id,
    selectedEmployeeId.value?.id,
    filters.value.line_type,
    selectedDate.value,
    status.value
  )

const getDownloadPDF = () =>
  attendanceStore.attendanceDownloadPdf(
    filters.value.company_id,
    selectedEmployeeId.value?.id,
    filters.value.line_type,
    selectedDate.value,
    status.value
  )

const getStatusMeta = (log) => {
  if (log.absent_reason) {
    if (log.absent_reason.includes('Approved')) {
      return { text: log.absent_reason, tone: 'success' }
    }
    if (log.absent_reason.includes('Pending')) {
      return { text: log.absent_reason, tone: 'warning' }
    }
    return { text: log.absent_reason, tone: 'neutral' }
  }
  const toneMap = {
    Present: 'success',
    Holiday: 'info',
    Leave: 'neutral',
    Weekend: 'neutral',
    Absent: 'danger',
  }
  return { text: log.status, tone: toneMap[log.status] || 'neutral' }
}

const goBack = () => router.go(-1)

// Lifecycle
onMounted(async () => {
  await companyStore.fetchCompanies()
  await fetchAttendance()
})

watch(
  period,
  (value) => {
    if (!value) return
    const formatted = `${value.year}-${pad(value.month)}-${pad(value.day)}`
    if (selectedDate.value !== formatted) {
      selectedDate.value = formatted
    }
  },
  { deep: true }
)

watch(selectedDate, (newDate) => {
  if (!newDate) return
  const next = parsePeriod(newDate)
  if (
    next.year !== period.value.year ||
    next.month !== period.value.month ||
    next.day !== period.value.day
  ) {
    period.value = next
  }
  handleFilterChange()
})

watch(status, () => {
  handleFilterChange()
})

</script>


<template>
  <div class="px-4 space-y-6">
    <div class="report-hero glass-panel">
      <div class="report-hero__left">
        <button class="btn-3 !h-10 !w-10 rounded-full shadow-sm" @click="goBack">
          <i class="far fa-arrow-left"></i>
        </button>
        <div>
          <p class="hero-eyebrow">Today overview</p>
          <h1 class="title-md md:title-lg">{{ headerTitle }}</h1>
        </div>
      </div>
      <div class="report-hero__actions">
        <button type="button" class="btn-1 hero-action" @click="getExportExcel">
          <i class="far fa-file-excel text-green-500"></i>
          <span>Excel</span>
        </button>
        <button type="button" class="btn-1 hero-action" @click="getDownloadPDF">
          <i class="fal fa-file-pdf text-red-500"></i>
          <span>PDF</span>
        </button>
      </div>
    </div>

    <div class="glass-panel space-y-3 compact-panel relative z-50">
      <div class="flex flex-wrap gap-2">
        <EmployeeFilter
          v-model:company_id="filters.company_id"
          v-model:department_id="filters.department_id"
          v-model:employee_id="filters.employee_id"
          v-model:line_type="filters.line_type"
          :with-type="true"
          :initial-value="$route.query"
          @filter-change="handleFilterChange"
        >
        <div class="relative gap-4">

          <select id="userSelect" v-model="status" class="input-1 py-0.5">
            <option v-for="option in statusOptions" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
          <label class="absolute text-xs left-3 -top-1.5 bg-slate-100 text-blue-500 leading-none z-30">Status</label>
        </div>
        </EmployeeFilter>
        <FlexibleDatePicker
          v-model="period"
          :show-year="false"
          :show-month="false"
          :show-date="true"
          label="Month"
        />
        <button type="button" @click="fetchAttendance" class="btn-2 rounded py-0.5 px-3">Search</button>
      </div>
    </div>

    <LoaderView v-if="attendanceStore.isLoading" />

    <div v-else>
      <div v-if="!hasFilters" class="empty-state glass-panel">
        <p class="text-base font-semibold text-rose-500">Select a company to see today's logs.</p>
        <p class="text-sm text-gray-500">Use the filter set above to load records.</p>
      </div>

      <div v-else-if="logs.length === 0" class="empty-state glass-panel">
        <p class="text-base font-semibold text-slate-700">No records found</p>
        <p class="text-sm text-gray-500">Adjust filters or pick a different date/status.</p>
      </div>

      <div v-else class="space-y-3">
        <div class="compact-stats">
          <div
            v-for="tile in summaryTiles"
            :key="tile.label"
            class="compact-stats__chip"
            :class="`compact-stats__chip--${tile.tone}`"
          >
            <span>{{ tile.label }}</span>
            <strong>{{ tile.value }}</strong>
          </div>
        </div>

        <div class="table-shell">
          <div class="table-scroll">
            <table class="min-w-full table-auto border-collapse">
              <thead class="sticky top-0 z-10 bg-slate-50">
                <tr class="text-[11px] text-slate-600">
                  <th class="th">#</th>
                  <th class="th text-left">Employee</th>
                  <th class="th text-left">Department</th>
                  <th class="th">Date</th>
                  <th class="th">Day</th>
                  <th class="th">Shift</th>
                  <th class="th !text-center">Entry</th>
                  <th class="th !text-center">Exit</th>
                  <th class="th !text-center">Hours</th>
                  <th class="th !text-center">Late</th>
                  <th class="th !text-center">Early</th>
                  <th class="th !text-center">Status</th>
                </tr>
              </thead>
              <tbody class="text-[11px] text-center">
                <tr v-for="(log, index) in logs" :key="`${log?.date}-${index}`" class="table-row">
                  <td class="td">{{ index + 1 }}</td>
                  <td class="td text-left">
                    <p class="font-semibold text-slate-800">{{ log.user_name }}</p>
                    <p class="text-[11px] text-slate-400">ID: {{ log.user_id || '-' }}</p>
                  </td>
                  <td class="td text-left">{{ log.department }}</td>
                  <td class="td text-left">{{ log.date }}</td>
                  <td class="td text-left">{{ log.weekday }}</td>
                  <td class="td text-left" :title="`${log.shift_start_time} to ${log.shift_end_time}`">
                    {{ log.shift_name }}
                  </td>
                  <td class="td td--alert" :class="{ 'td--danger': log.late_duration }" :title="`Device: ${log.entry_device}`">
                    {{ log.entry_time }}
                  </td>
                  <td class="td td--alert" :class="{ 'td--danger': log.early_leave_duration }" :title="`Device: ${log.exit_device}`">
                    {{ log.exit_time }}
                  </td>
                  <td class="td">{{ log.working_hours }}</td>
                  <td class="td">{{ log.late_duration || '-' }}</td>
                  <td class="td">{{ log.early_leave_duration || '-' }}</td>
                  <td class="td">
                    <div class="status-chip" :class="`status-chip--${getStatusMeta(log).tone}`">
                      {{ getStatusMeta(log).text }}
                      <router-link
                        v-if="log.application_id"
                        :to="{
                          name: 'LeaveApplicationShow',
                          params: { id: log.application_id },
                        }"
                        class="status-link"
                      >
                        <i class="far fa-eye"></i>
                      </router-link>
                      <router-link
                        v-if="log.exchange_application_id"
                        :to="{
                          name: 'ExchangeOffdayShow',
                          params: { id: log.exchange_application_id },
                        }"
                        class="status-link"
                      >
                        <i class="far fa-eye"></i>
                      </router-link>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.glass-panel {
  @apply rounded-2xl border border-slate-100 bg-white/80 p-4 shadow-sm backdrop-blur;
}
.report-hero {
  @apply flex flex-col gap-3 md:flex-row md:items-center md:justify-between;
}
.report-hero__left {
  @apply flex items-center gap-3;
}
.report-hero__actions {
  @apply flex items-center gap-2;
}
.hero-action {
  @apply inline-flex items-center gap-2 py-1.5 px-3 text-sm;
}
.hero-eyebrow {
  @apply text-[11px] uppercase tracking-[0.2em] text-slate-400;
}
.compact-panel {
  @apply py-3;
}
.filter-grid {
  @apply grid gap-3 lg:grid-cols-2;
}
.filter-inline {
  @apply flex flex-col gap-1;
}
.filter-label {
  @apply text-xs font-semibold uppercase tracking-wide text-slate-500;
}
.filter-hint {
  @apply text-xs text-slate-400;
}
.empty-state {
  @apply flex min-h-[140px] flex-col items-center justify-center gap-1 text-center;
}
.compact-stats {
  @apply flex flex-wrap gap-2;
}
.compact-stats__chip {
  @apply inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold;
}
.compact-stats__chip--success {
  @apply border-emerald-200 text-emerald-700;
}
.compact-stats__chip--danger {
  @apply border-rose-200 text-rose-700;
}
.compact-stats__chip--info {
  @apply border-sky-200 text-sky-700;
}
.compact-stats__chip--neutral {
  @apply border-slate-200 text-slate-600;
}
.table-shell {
  @apply relative z-0 rounded-2xl border border-slate-100 bg-white shadow-lg;
}
.table-scroll {
  max-height: 70vh;
  overflow: auto;
}
.th {
  @apply border-b border-slate-100 px-2 py-1.5 text-left font-semibold;
}
.td {
  @apply border-b border-slate-100 px-2 py-1.5;
}
.td--alert {
  @apply font-semibold text-slate-700;
}
.td--danger {
  @apply text-rose-600;
}
.table-row:nth-child(even) {
  @apply bg-slate-50/40;
}
.status-chip {
  @apply inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide;
}
.status-chip--success {
  @apply bg-emerald-50 text-emerald-700;
}
.status-chip--danger {
  @apply bg-rose-50 text-rose-700;
}
.status-chip--info {
  @apply bg-sky-50 text-sky-700;
}
.status-chip--warning {
  @apply bg-amber-50 text-amber-700;
}
.status-chip--neutral {
  @apply bg-slate-100 text-slate-600;
}
.status-link {
  @apply text-xs text-slate-400 hover:text-slate-600;
}
.table-row:hover {
  @apply bg-slate-100;
}
.table-row td {
  @apply align-middle;
}
.table-row td p {
  @apply leading-tight;
}
.table-row td .text-[11px] {
  @apply mt-0.5;
}
.table-row:nth-child(odd) .status-chip {
  @apply shadow-sm;
}
.table-row:nth-child(even) .status-chip {
  @apply shadow-sm;
}
.status-chip .far {
  @apply text-xs;
}
.table-scroll::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
.table-scroll::-webkit-scrollbar-thumb {
  @apply rounded-full bg-slate-300;
}
</style>
