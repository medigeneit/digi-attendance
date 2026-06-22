<script setup>
import EmployeeFilter from '@/components/common/EmployeeFilter.vue'
import FlexibleDatePicker from '@/components/FlexibleDatePicker.vue'
import LoaderView from '@/components/common/LoaderView.vue'
import { useAttendanceStore } from '@/stores/attendance'
import { eachDayOfInterval, format } from 'date-fns'
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const attendanceStore = useAttendanceStore()
const router = useRouter()
const route = useRoute()

const pad = (value) => String(value).padStart(2, '0')
const todayIso = format(new Date(), 'yyyy-MM-dd')

const normalizeISODate = (value) => {
  const raw = Array.isArray(value) ? value[0] : value
  if (!raw) return ''
  return String(raw).match(/^(\d{4}-\d{2}-\d{2})/)?.[1] || ''
}

const buildPeriod = (value) => {
  if (!value) return null
  const [year, month, day] = value.split('-')
  if (!year || !month || !day) return null
  return { year: Number(year), month: Number(month), day: Number(day) }
}

const fromPeriod = (period) => {
  if (!period) return ''
  return `${period.year}-${pad(period.month)}-${pad(period.day)}`
}

const queryStart = normalizeISODate(route.query.start_date) || normalizeISODate(route.query.start)
const queryEnd = normalizeISODate(route.query.end_date) || normalizeISODate(route.query.end)

const selectedDateRange = ref({
  start: queryStart || queryEnd || todayIso,
  end: queryEnd || queryStart || todayIso,
})
const startPeriod = ref(buildPeriod(selectedDateRange.value.start))
const endPeriod = ref(buildPeriod(selectedDateRange.value.end))
const dateRangeAttendance = ref([])
const hasRun = ref(false)
const reportError = ref('')
const employeeSearch = ref('')
const tableDensity = ref('comfortable')
const lastUpdatedAt = ref(null)

const filters = ref({
  company_id: route.query.company_id || '',
  department_id: route.query.department_id || 'all',
  line_type: route.query.line_type || 'all',
  employee_id: route.query.employee_id || '',
})

const isDateRangeValid = computed(() => {
  const { start, end } = selectedDateRange.value
  return Boolean(start && end && start <= end)
})
const canSearch = computed(() => Boolean(filters.value.company_id && isDateRangeValid.value))

const dateList = computed(() => {
  if (!isDateRangeValid.value) return []
  return eachDayOfInterval({
    start: new Date(`${selectedDateRange.value.start}T00:00:00`),
    end: new Date(`${selectedDateRange.value.end}T00:00:00`),
  }).map((date) => format(date, 'yyyy-MM-dd'))
})

const formatDate = (date) => format(new Date(`${date}T00:00:00`), 'dd MMM yyyy')
const formatDay = (date) => format(new Date(`${date}T00:00:00`), 'EEE')

const hasMetric = (value) => {
  const normalized = String(value ?? '').trim().toLowerCase()
  return !['', '-', '0', '0m', '00:00', '00:00:00', 'none', 'n/a'].includes(normalized)
}

const flatRows = computed(() => {
  if (!Array.isArray(dateRangeAttendance.value) || !dateList.value.length) return []
  return dateRangeAttendance.value.flatMap((employee) =>
    dateList.value.map((date, dateIndex) => {
      const attendance = employee.attendance?.[date] || {}
      const checkIn = attendance.in ?? '-'
      const checkOut = attendance.out ?? '-'
      return {
        key: `${employee.employee_id || employee.employee_name || 'employee'}-${date}`,
        employee_id: employee.employee_id,
        employee_name: employee.employee_name || '-',
        date,
        dateIndex,
        in: checkIn,
        out: checkOut,
        late: attendance.late ?? '-',
        early: attendance.early ?? '-',
        comment: attendance.comment ?? '-',
        hasAttendance: hasMetric(checkIn) || hasMetric(checkOut),
      }
    }),
  )
})

const visibleRows = computed(() => {
  const term = employeeSearch.value.trim().toLowerCase()
  if (!term) return flatRows.value
  return flatRows.value.filter((row) =>
    `${row.employee_name} ${row.employee_id || ''}`.toLowerCase().includes(term),
  )
})

const totalEmployees = computed(() =>
  Array.isArray(dateRangeAttendance.value) ? dateRangeAttendance.value.length : 0,
)
const attendedRecords = computed(() => flatRows.value.filter((row) => row.hasAttendance).length)
const lateRecords = computed(() => flatRows.value.filter((row) => hasMetric(row.late)).length)
const earlyRecords = computed(() => flatRows.value.filter((row) => hasMetric(row.early)).length)

const groupedRows = computed(() => {
  const term = employeeSearch.value.trim().toLowerCase()
  let rows = flatRows.value
  if (term) {
    rows = rows.filter((row) =>
      `${row.employee_name} ${row.employee_id || ''}`.toLowerCase().includes(term),
    )
  }
  const result = []
  let i = 0
  let empIndex = 0
  while (i < rows.length) {
    const currentId = rows[i].employee_id
    let j = i + 1
    while (j < rows.length && rows[j].employee_id === currentId) j++
    const span = j - i
    empIndex++
    for (let k = i; k < j; k++) {
      result.push({
        ...rows[k],
        rowspan: k === i ? span : 0,
        isFirstInGroup: k === i,
        isLastInGroup: k === j - 1,
        empIndex,
        dateSeq: k - i + 1,
      })
    }
    i = j
  }
  return result
})

const rangeLabel = computed(() => {
  const { start, end } = selectedDateRange.value
  if (!start || !end) return 'Date range not selected'
  if (start === end) return formatDate(start)
  return `${formatDate(start)} – ${formatDate(end)}`
})

const lastUpdatedLabel = computed(() => {
  if (!lastUpdatedAt.value) return 'Not generated yet'
  return new Intl.DateTimeFormat('en', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: 'short',
  }).format(lastUpdatedAt.value)
})

const employeeInitials = (name) =>
  String(name || '?')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || '?'

const isFirstEmployeeRow = (row, index) =>
  index === 0 || visibleRows.value[index - 1]?.employee_id !== row.employee_id

const syncRouteQuery = () => {
  router.replace({
    query: {
      ...route.query,
      company_id: filters.value.company_id,
      department_id: filters.value.department_id || 'all',
      line_type: filters.value.line_type || 'all',
      employee_id: filters.value.employee_id,
      start_date: selectedDateRange.value.start,
      end_date: selectedDateRange.value.end,
    },
  })
}

const fetchDateRangeAttendance = async () => {
  if (!canSearch.value) return
  reportError.value = ''

  const response = await attendanceStore.getDateRangeAttendanceSummary(
    selectedDateRange.value.start,
    selectedDateRange.value.end,
    filters.value.company_id,
    filters.value.line_type,
    filters.value.employee_id,
    false,
    filters.value.department_id,
  )

  hasRun.value = true
  if (Array.isArray(response)) {
    dateRangeAttendance.value = response
    lastUpdatedAt.value = new Date()
  } else {
    dateRangeAttendance.value = []
    reportError.value = attendanceStore.error || 'Unable to generate the report.'
  }
}

const runSearch = async () => {
  if (!filters.value.company_id) {
    reportError.value = 'Select a company to generate the report.'
    return
  }
  if (!isDateRangeValid.value) {
    reportError.value = 'End date must be the same as or later than start date.'
    return
  }
  syncRouteQuery()
  await fetchDateRangeAttendance()
  filterOpen.value = false
}

const downloadDateRangeExcel = async () => {
  if (!canSearch.value) return
  await attendanceStore.downloadDateRangeExcel(
    selectedDateRange.value.start,
    selectedDateRange.value.end,
    filters.value.company_id,
    filters.value.line_type,
    filters.value.employee_id,
    filters.value.department_id,
  )
}

const filterOpen = ref(true)

const handleFilterChange = () => syncRouteQuery()
const goBack = () => router.go(-1)

watch(
  startPeriod,
  (value) => {
    const normalized = fromPeriod(value)
    if (normalized) selectedDateRange.value.start = normalized
  },
  { deep: true },
)

watch(
  endPeriod,
  (value) => {
    const normalized = fromPeriod(value)
    if (normalized) selectedDateRange.value.end = normalized
  },
  { deep: true },
)

watch(
  () => selectedDateRange.value.start,
  (value) => {
    const parsed = buildPeriod(value)
    if (parsed) startPeriod.value = parsed
  },
)

watch(
  () => selectedDateRange.value.end,
  (value) => {
    const parsed = buildPeriod(value)
    if (parsed) endPeriod.value = parsed
  },
)

onMounted(async () => {
  if (queryStart && queryEnd && filters.value.company_id) await fetchDateRangeAttendance()
})
</script>

<template>
  <div class="erp-page">

    <!-- ── Sticky command bar ─────────────────────────────── -->
    <header class="cmd-bar">
      <div class="cmd-bar__left">
        <button type="button" class="icon-btn" aria-label="Go back" @click="goBack">
          <i class="far fa-arrow-left"></i>
        </button>
        <div class="cmd-title">
          <span class="kicker"><i class="far fa-chart-mixed"></i> Workforce Analytics</span>
          <h1>Date-wise Attendance Summary</h1>
        </div>
      </div>
      <div class="cmd-bar__right">
        <div class="period-chip">
          <i class="far fa-calendar-range text-blue-500"></i>
          <span>{{ rangeLabel }}</span>
        </div>
        <button
          type="button"
          class="cmd-btn"
          :class="filterOpen ? 'cmd-btn--active' : 'cmd-btn--ghost'"
          @click="filterOpen = !filterOpen"
        >
          <i class="far fa-sliders"></i>
          <span class="hidden sm:inline">Filters</span>
          <i class="far fa-chevron-down filter-chevron" :class="{ 'rotate-180': filterOpen }"></i>
        </button>
        <button
          type="button"
          class="cmd-btn cmd-btn--ghost"
          :disabled="!canSearch || attendanceStore.isLoading"
          @click="downloadDateRangeExcel"
        >
          <i class="far fa-file-excel text-emerald-600"></i>
          <span class="hidden sm:inline">Export</span>
        </button>
        <button
          type="button"
          class="cmd-btn cmd-btn--primary"
          :disabled="!canSearch || attendanceStore.isLoading"
          @click="runSearch"
        >
          <i class="far" :class="attendanceStore.isLoading ? 'fa-spinner-third fa-spin' : 'fa-play'"></i>
          {{ attendanceStore.isLoading ? 'Generating…' : 'Generate' }}
        </button>
      </div>
    </header>

    <!-- ── Collapsible filter drawer ─────────────────────── -->
    <Transition name="filter-slide">
      <section v-if="filterOpen" class="filter-drawer">
        <div class="filter-drawer__body">
          <EmployeeFilter
            v-model:company_id="filters.company_id"
            v-model:department_id="filters.department_id"
            v-model:employee_id="filters.employee_id"
            v-model:line_type="filters.line_type"
            :with-type="true"
            :active-only="true"
            :initial-value="$route.query"
            grid-class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4"
            slot-class="hidden"
            class="w-full"
            @filter-change="handleFilterChange"
          />
          <div class="filter-date-row">
            <FlexibleDatePicker
              v-model="startPeriod"
              :show-year="false"
              :show-month="false"
              :show-date="true"
              label="Start date"
            />
            <i class="far fa-arrow-right text-slate-300"></i>
            <FlexibleDatePicker
              v-model="endPeriod"
              :show-year="false"
              :show-month="false"
              :show-date="true"
              label="End date"
            />
            <p v-if="!isDateRangeValid" class="date-error">
              <i class="far fa-circle-exclamation"></i> End date cannot be before start date.
            </p>
          </div>
        </div>
      </section>
    </Transition>

    <!-- ── Error banner ───────────────────────────────────── -->
    <div v-if="reportError" class="alert-error" role="alert">
      <i class="far fa-circle-exclamation mt-0.5 shrink-0"></i>
      <div>
        <p class="font-semibold">Report could not be generated</p>
        <p class="mt-0.5 text-xs text-rose-600">{{ reportError }}</p>
      </div>
    </div>

    <!-- ── Content area ───────────────────────────────────── -->
    <div class="content-area">
      <LoaderView v-if="attendanceStore.isLoading && !hasRun" />

      <template v-else-if="hasRun">
        <div class="table-panel">

          <!-- Table toolbar with inline metrics -->
          <header class="table-toolbar">
            <div class="toolbar-left">
              <h2 class="table-title">Daily attendance records</h2>
              <span class="count-badge">{{ groupedRows.length }}</span>
              <span class="toolbar-divider"></span>
              <div class="metric-chips">
                <span class="mchip mchip--blue">
                  <i class="far fa-users"></i> {{ totalEmployees }} emp
                </span>
                <span class="mchip mchip--violet">
                  <i class="far fa-calendar-days"></i> {{ dateList.length }} days
                </span>
                <span class="mchip mchip--green">
                  <i class="far fa-user-check"></i> {{ attendedRecords }} present
                </span>
                <span class="mchip mchip--amber">
                  <i class="far fa-clock-rotate-left"></i> {{ lateRecords }} late
                </span>
                <span class="mchip mchip--rose">
                  <i class="far fa-arrow-left-from-line"></i> {{ earlyRecords }} early
                </span>
              </div>
            </div>
            <div class="toolbar-right">
              <p class="update-label">Updated {{ lastUpdatedLabel }}</p>
              <label class="search-control">
                <i class="far fa-search text-slate-400"></i>
                <input v-model="employeeSearch" type="search" placeholder="Search employee…" />
                <button v-if="employeeSearch" type="button" aria-label="Clear" @click="employeeSearch = ''">
                  <i class="far fa-times"></i>
                </button>
              </label>
              <div class="density-control" aria-label="Table density">
                <button
                  type="button"
                  :class="{ active: tableDensity === 'comfortable' }"
                  title="Comfortable"
                  @click="tableDensity = 'comfortable'"
                ><i class="far fa-bars"></i></button>
                <button
                  type="button"
                  :class="{ active: tableDensity === 'compact' }"
                  title="Compact"
                  @click="tableDensity = 'compact'"
                ><i class="far fa-list"></i></button>
              </div>
            </div>
          </header>

          <!-- Table -->
          <div v-if="groupedRows.length" class="table-scroll">
            <table
              class="enterprise-table"
              :class="{ 'enterprise-table--compact': tableDensity === 'compact' }"
            >
              <thead>
                <tr>
                  <th class="w-10 text-center">#</th>
                  <th class="employee-column text-left">Employee</th>
                  <th class="w-8 text-center"><span class="sr-only">Day</span></th>
                  <th class="min-w-[130px] text-left">Work date</th>
                  <th class="min-w-[100px] text-center">Check in</th>
                  <th class="min-w-[100px] text-center">Check out</th>
                  <th class="min-w-[90px] text-center">Late</th>
                  <th class="min-w-[90px] text-center">Early leave</th>
                  <th class="min-w-[180px] text-left">Remarks</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="row in groupedRows"
                  :key="row.key"
                  :class="{
                    'group-first': row.isFirstInGroup,
                    'group-last': row.isLastInGroup,
                  }"
                >
                  <td v-if="row.rowspan > 0" :rowspan="row.rowspan" class="emp-seq-cell">
                    <span class="emp-seq-badge">{{ row.empIndex }}</span>
                  </td>
                  <td v-if="row.rowspan > 0" :rowspan="row.rowspan" class="employee-column employee-merged-cell">
                    <div class="flex min-w-[210px] items-center gap-2.5">
                      <div class="employee-avatar">{{ employeeInitials(row.employee_name) }}</div>
                      <div class="min-w-0">
                        <p class="emp-name">{{ row.employee_name }}</p>
                        <p v-if="row.employee_id" class="emp-id">ID {{ row.employee_id }}</p>
                        <span class="day-count-pill">{{ row.rowspan }}d</span>
                      </div>
                    </div>
                  </td>
                  <td class="date-seq-cell">
                    <span class="date-seq-dot">{{ row.dateSeq }}</span>
                  </td>
                  <td>
                    <p class="date-primary">{{ formatDate(row.date) }}</p>
                    <p class="date-day">{{ formatDay(row.date) }}</p>
                  </td>
                  <td class="text-center"><span class="time-value">{{ row.in }}</span></td>
                  <td class="text-center"><span class="time-value">{{ row.out }}</span></td>
                  <td class="text-center">
                    <span :class="hasMetric(row.late) ? 'exception-pill exception-pill--late' : 'muted-value'">
                      {{ row.late }}
                    </span>
                  </td>
                  <td class="text-center">
                    <span :class="hasMetric(row.early) ? 'exception-pill exception-pill--early' : 'muted-value'">
                      {{ row.early }}
                    </span>
                  </td>
                  <td>
                    <p class="max-w-[280px] truncate text-xs text-slate-500" :title="row.comment">
                      {{ row.comment }}
                    </p>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div v-else class="empty-state">
            <div class="empty-state__icon"><i class="far fa-calendar-xmark"></i></div>
            <h3>{{ employeeSearch ? 'No matching employee' : 'No attendance records found' }}</h3>
            <p>{{ employeeSearch ? 'Try another name or clear the search.' : 'Adjust the criteria and generate again.' }}</p>
            <button v-if="employeeSearch" type="button" class="cmd-btn cmd-btn--ghost mt-3" @click="employeeSearch = ''">
              Clear search
            </button>
          </div>
        </div>
      </template>

      <div v-else class="welcome-state">
        <div class="welcome-icon"><i class="far fa-chart-mixed"></i></div>
        <h2>Build an attendance report</h2>
        <p>Select a company and date range above, then click <strong>Generate</strong>.</p>
      </div>
    </div>

  </div>
</template>

<style scoped>
/* ── Page shell ─────────────────────────────────────────── */
.erp-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
  background: #f8fafc;
}

/* ── Command bar ────────────────────────────────────────── */
.cmd-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 0 20px;
  height: 52px;
  min-height: 52px;
  background: #fff;
  border-bottom: 1px solid #e2e8f0;
  z-index: 50;
  flex-shrink: 0;
}
.cmd-bar__left { display: flex; align-items: center; gap: 12px; min-width: 0; }
.cmd-bar__right { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }

.icon-btn { @apply inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 hover:text-slate-900; }

.cmd-title { min-width: 0; }
.kicker { @apply block text-[9px] font-bold uppercase tracking-[0.2em] text-blue-600; }
.cmd-title h1 { @apply truncate text-sm font-bold text-slate-900 leading-tight; }

.period-chip { @apply inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-xs font-semibold text-slate-600; }

.cmd-btn { @apply inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-40; }
.cmd-btn--ghost { @apply border border-slate-200 bg-white text-slate-700 hover:bg-slate-50; }
.cmd-btn--active { @apply border border-blue-200 bg-blue-50 text-blue-700; }
.cmd-btn--primary { @apply bg-blue-600 text-white shadow-sm shadow-blue-200 hover:bg-blue-700 disabled:bg-slate-300 disabled:shadow-none; }

.filter-chevron { @apply text-[10px] transition-transform duration-200; }
.filter-chevron.rotate-180 { transform: rotate(180deg); }

/* ── Filter drawer ──────────────────────────────────────── */
.filter-drawer {
  border-bottom: 1px solid #e2e8f0;
  background: #fff;
  flex-shrink: 0;
}
.filter-drawer__body { @apply flex flex-col gap-3 px-5 py-3; }
.filter-date-row { @apply flex flex-wrap items-end gap-3; }
.date-error { @apply flex items-center gap-1.5 text-xs font-medium text-rose-600; }

.filter-slide-enter-active,
.filter-slide-leave-active { transition: max-height 0.22s ease, opacity 0.18s ease; overflow: hidden; }
.filter-slide-enter-from,
.filter-slide-leave-to { max-height: 0; opacity: 0; }
.filter-slide-enter-to,
.filter-slide-leave-from { max-height: 300px; opacity: 1; }

/* ── Error banner ───────────────────────────────────────── */
.alert-error { @apply mx-5 mt-3 flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700; flex-shrink: 0; }

/* ── Content area (fills remaining height) ──────────────── */
.content-area {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding: 12px 20px 16px;
  gap: 0;
  overflow: hidden;
}

/* ── Table panel (fills content area) ──────────────────── */
.table-panel {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  background: #fff;
  overflow: hidden;
  box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.05);
}

/* ── Table toolbar ──────────────────────────────────────── */
.table-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 14px;
  border-bottom: 1px solid #e2e8f0;
  flex-shrink: 0;
  flex-wrap: wrap;
}
.toolbar-left { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; min-width: 0; }
.toolbar-right { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
.toolbar-divider { width: 1px; height: 16px; background: #e2e8f0; flex-shrink: 0; }
.table-title { @apply text-sm font-bold text-slate-900; }
.update-label { @apply hidden text-[10px] text-slate-400 lg:block; }

.count-badge { @apply rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600; }

/* Inline metric chips */
.metric-chips { display: flex; align-items: center; gap: 4px; flex-wrap: wrap; }
.mchip { @apply inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold; }
.mchip--blue   { @apply bg-blue-50 text-blue-700; }
.mchip--violet { @apply bg-violet-50 text-violet-700; }
.mchip--green  { @apply bg-emerald-50 text-emerald-700; }
.mchip--amber  { @apply bg-amber-50 text-amber-700; }
.mchip--rose   { @apply bg-rose-50 text-rose-700; }

.search-control { @apply flex h-8 w-full max-w-[220px] items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2.5 transition focus-within:border-blue-400 focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-100; }
.search-control input { @apply min-w-0 flex-1 bg-transparent text-xs text-slate-800 outline-none placeholder:text-slate-400; }
.search-control button { @apply text-xs text-slate-400 hover:text-slate-700; }

.density-control { @apply inline-flex h-8 items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5; }
.density-control button { @apply flex h-7 w-7 items-center justify-center rounded-md text-xs text-slate-400 transition hover:text-slate-700; }
.density-control button.active { @apply bg-white text-blue-600 shadow-sm; }

/* ── Table scroll area (fills remaining panel space) ────── */
.table-scroll { flex: 1; min-height: 0; overflow: auto; }

/* ── Enterprise table ───────────────────────────────────── */
.enterprise-table { @apply min-w-full border-separate border-spacing-0 text-xs; }
.enterprise-table thead { position: sticky; top: 0; z-index: 30; background: #f8fafc; }
.enterprise-table th { @apply border-b border-r border-slate-200 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400; }
.enterprise-table td { @apply border-b border-r border-slate-100 bg-white px-3 py-2.5 text-slate-700; transition: background 0.1s; }
.enterprise-table tbody tr:hover td { background: #eff6ff; }
.enterprise-table--compact th { padding-top: 6px; padding-bottom: 6px; }
.enterprise-table--compact td { padding-top: 5px; padding-bottom: 5px; }

/* Employee group separator */
.enterprise-table tbody tr.group-first td { border-top: 2px solid #e2e8f0; }

/* Sticky # column */
thead th:first-child { position: sticky; left: 0; z-index: 40; background: #f8fafc; }
.emp-seq-cell {
  position: sticky;
  left: 0;
  z-index: 10;
  width: 40px;
  text-align: center;
  background: #fff;
  vertical-align: middle;
  border-right: 1px solid #e2e8f0;
}
.enterprise-table tbody tr:hover .emp-seq-cell { background: #eff6ff; }
.emp-seq-badge { @apply inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 font-mono text-[10px] font-bold text-slate-500; }

/* Sticky employee column */
.employee-column { position: sticky; left: 40px; z-index: 10; min-width: 230px; }
thead .employee-column { z-index: 40; background: #f8fafc; }
.employee-merged-cell {
  background: #f8fafc;
  vertical-align: middle;
  border-right: 2px solid #e2e8f0;
}
.enterprise-table tbody tr:hover .employee-merged-cell { background: #eff6ff; }

.employee-avatar { @apply flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-[10px] font-bold text-blue-700 ring-1 ring-blue-100; }
.emp-name { @apply truncate text-xs font-semibold text-slate-900; }
.emp-id { @apply font-mono text-[10px] text-slate-400; }
.day-count-pill { @apply mt-1 inline-flex items-center rounded-full bg-blue-100 px-1.5 py-0.5 text-[9px] font-bold text-blue-600; }

/* Date sequence dot */
.date-seq-cell { width: 32px; text-align: center; }
.date-seq-dot { @apply inline-flex h-4 w-4 items-center justify-center rounded-full bg-slate-100 font-mono text-[9px] font-semibold text-slate-400; }

.date-primary { @apply font-medium text-slate-800; }
.date-day { @apply text-[10px] font-semibold uppercase tracking-wide text-slate-400; }

.time-value { @apply font-mono text-xs font-semibold tabular-nums text-slate-700; }
.muted-value { @apply text-xs text-slate-300; }
.exception-pill { @apply inline-flex min-w-[50px] justify-center rounded-full px-2 py-0.5 font-mono text-[10px] font-bold tabular-nums; }
.exception-pill--late  { @apply bg-amber-50 text-amber-700 ring-1 ring-amber-100; }
.exception-pill--early { @apply bg-rose-50 text-rose-700 ring-1 ring-rose-100; }

/* ── Empty / welcome states ─────────────────────────────── */
.empty-state { @apply flex flex-1 flex-col items-center justify-center px-6 py-16 text-center; }
.empty-state__icon { @apply mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-lg text-slate-400; }
.empty-state h3 { @apply text-sm font-semibold text-slate-800; }
.empty-state p  { @apply mt-1 max-w-sm text-xs leading-5 text-slate-500; }

.welcome-state { @apply flex flex-1 flex-col items-center justify-center px-6 text-center; }
.welcome-icon { @apply mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-2xl text-blue-400; }
.welcome-state h2 { @apply text-sm font-bold text-slate-800; }
.welcome-state p  { @apply mt-1.5 max-w-sm text-xs leading-5 text-slate-500; }
.welcome-state strong { @apply font-semibold text-blue-600; }

@media (max-width: 640px) {
  .cmd-bar { padding: 0 12px; }
  .content-area { padding: 8px 12px 12px; }
  .employee-column { min-width: 180px; }
  .metric-chips { display: none; }
}
</style>
