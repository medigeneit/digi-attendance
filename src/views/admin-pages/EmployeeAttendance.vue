<script setup>
import AttendanceTable from '@/components/AttendanceTable.vue'
import EmployeeFilter from '@/components/common/EmployeeFilter.vue'
import FlexibleDatePicker from '@/components/FlexibleDatePicker.vue'
import LoaderView from '@/components/common/LoaderView.vue'
import UserMessageSender from '@/components/common/UserMessageSender.vue'
import { useAttendanceStore } from '@/stores/attendance'
import { useUserStore } from '@/stores/user'
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const router = useRouter()
const route = useRoute()
const attendanceStore = useAttendanceStore()
const userStore = useUserStore()
const now = new Date()

/* -----------------------
   Helpers
------------------------*/
const toMonth = (val) => {
  if (!val) return ''
  if (typeof val === 'string') {
    // If already YYYY-MM, return as-is
    if (/^\d{4}-\d{2}$/.test(val)) return val
    // If full date string, slice YYYY-MM
    const m = val.match(/^(\d{4})-(\d{2})/)
    return m ? `${m[1]}-${m[2]}` : ''
  }
  // Date object
  try {
    const d = new Date(val)
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    return `${y}-${m}`
  } catch {
    return ''
  }
}

const q = route.query
const selectedMonth = ref(
  toMonth(q.date) || toMonth(attendanceStore.selectedMonth) || toMonth(now),
)

const parsePeriod = (val, fallback) => {
  const month = toMonth(val) || toMonth(fallback)
  if (!month) {
    return { year: now.getFullYear(), month: now.getMonth() + 1 }
  }
  const [year, monthPart] = month.split('-')
  return {
    year: Number(year) || now.getFullYear(),
    month: Number(monthPart) || now.getMonth() + 1,
  }
}

const period = ref({
  ...parsePeriod(selectedMonth.value, now),
  day: 1,
})

const periodMonth = computed(() => {
  if (!period.value?.year || !period.value?.month) return ''
  const m = String(period.value.month).padStart(2, '0')
  return `${period.value.year}-${m}`
})

const filters = ref({
  company_id: q.company_id || '',
  department_id: q.department_id || 'all',
  line_type: q.line_type || 'all',
  employee_id: q.employee_id || '',
})

const selectedUser = ref(null)

// Debounce for router.replace
let qTimer = null
const syncQuery = (partial = {}) => {
  if (qTimer) clearTimeout(qTimer)
  qTimer = setTimeout(() => {
    const next = {
      ...route.query,
      company_id: filters.value.company_id || '',
      department_id: filters.value.department_id || 'all',
      line_type: filters.value.line_type || 'all',
      employee_id: filters.value.employee_id || '',
      date: selectedMonth.value || '',
      ...partial,
    }

    // Remove empty keys for a cleaner URL
    Object.keys(next).forEach((k) => {
      if (next[k] === '' || next[k] === undefined || next[k] === null) delete next[k]
    })

    router.replace({ query: next }).catch(() => {})
  }, 150)
}

/* -----------------------
   Data Fetchers
------------------------*/
const fetchUser = async (employeeId) => {
  if (!employeeId) {
    selectedUser.value = null
    return
  }
  try {
    await userStore.fetchUser(employeeId)
    selectedUser.value = userStore.user || null
  } catch (e) {
    console.error('fetchUser error:', e)
    selectedUser.value = null
  }
}

// Prevent duplicate attendance fetches
const lastFetchKey = ref('')

const fetchAttendance = async () => {
  const emp = filters.value.employee_id
  const month = selectedMonth.value
  if (!emp || !month) return

  const key = `${emp}|${month}`
  if (key === lastFetchKey.value) return
  lastFetchKey.value = key

  try {
    await attendanceStore.getMonthlyAttendanceByShift(emp, month)
  } catch (e) {
    console.error('fetchAttendance error:', e)
    // allow retry on next attempt
    lastFetchKey.value = ''
  }
}

/* -----------------------
   Watchers
------------------------*/
// Keep URL in sync when month changes
watch(
  periodMonth,
  (month) => {
    if (!month) return
    selectedMonth.value = month
    syncQuery({ date: month })
    if (filters.value.employee_id) {
      fetchAttendance()
    }
  },
)

// Keep URL in sync when any filter changes (but do not fetch here)
watch(
  () => ({ ...filters.value }), // shallow spread avoids deep reactivity pitfalls
  () => {
    syncQuery()
  },
)

// Fetch user + attendance when employee changes
watch(
  () => filters.value.employee_id,
  async (newVal, oldVal) => {
    if (newVal && newVal !== oldVal) {
      await fetchUser(newVal)
      await fetchAttendance()
    }
    if (!newVal) {
      selectedUser.value = null
      // reset lastFetchKey so future selections can trigger
      lastFetchKey.value = ''
    }
  },
)

/* -----------------------
   Lifecycle
------------------------*/
onMounted(async () => {
  // If URL had initial query with employee/month, fetch once.
  if (filters.value.employee_id) {
    await fetchUser(filters.value.employee_id)
  }
  if (filters.value.employee_id && selectedMonth.value) {
    await fetchAttendance()
  }
  // Ensure URL is normalized on mount
  await nextTick()
  syncQuery()
})

/* -----------------------
   Handlers
------------------------*/
const goBack = () => router.go(-1)

// From <EmployeeFilter /> to push changes to URL (no extra fetches here)
const handleFilterChange = () => {
  syncQuery()
}

const hasSelection = computed(() => !!filters.value.employee_id)

const presentRate = computed(() => {
  const workingDays = Number(attendanceStore?.summary?.total_working_days || 0)
  const presentDays = Number(attendanceStore?.summary?.total_present_days || 0)

  if (!workingDays) return 0
  return Math.round((presentDays / workingDays) * 100)
})

const selectedMonthLabel = computed(() => {
  if (!selectedMonth.value) return 'No month selected'
  const [year, month] = selectedMonth.value.split('-').map(Number)
  if (!year || !month) return selectedMonth.value
  return new Intl.DateTimeFormat('en', { month: 'long', year: 'numeric' }).format(
    new Date(year, month - 1, 1),
  )
})

const employeeInitials = computed(() =>
  String(selectedUser.value?.name || '?')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join(''),
)

const employeeSubtitle = computed(() =>
  [selectedUser.value?.designation?.title, selectedUser.value?.department?.name]
    .filter(Boolean)
    .join(' · '),
)

const fmtHours = (v) => {
  const n = Number(v ?? 0)
  if (!Number.isFinite(n) || n <= 0) return '0h'
  const totalMins = Math.round(n * 60)      // assume value is in HOURS (decimal)
  const h = Math.floor(totalMins / 60)
  const m = totalMins % 60
  return m ? `${h}h ${m}m` : `${h}h`
}

const employeeMessageUserId = computed(() => selectedUser.value?.id || filters.value.employee_id || '')
const employeeMessageName = computed(() => selectedUser.value?.name || 'Employee')
const employeeRecentMessages = computed(() => selectedUser.value?.message_history || [])

const attendanceMessageContext = computed(() => ({
  source: 'employee_attendance',
  user_id: employeeMessageUserId.value,
  month: selectedMonth.value,
  company_id: filters.value.company_id || '',
  department_id: filters.value.department_id || '',
  line_type: filters.value.line_type || '',
}))

const defaultAttendanceMessage = computed(() => {
  const summary = attendanceStore?.summary || {}
  const month = selectedMonth.value || 'selected month'

  return [
    `Dear ${employeeMessageName.value},`,
    `your attendance summary for ${month}:`,
    `working ${summary.total_working_days || 0}d,`,
    `present ${summary.total_present_days || 0}d,`,
    `late ${summary.actual_late_day || 0}d,`,
    `absent ${summary.total_absent_days || 0}d.`,
    'Please contact HR if any correction is needed.',
  ].join(' ')
})
</script>

<template>
  <main class="attendance-page">
    <section class="job-card-console">
    <header class="page-header">
      <button class="icon-button" aria-label="Go back" @click="goBack">
        <i class="far fa-arrow-left"></i>
      </button>
      <div class="min-w-0 flex-1">
        <p class="section-kicker">Attendance operations</p>
        <h1 class="truncate text-lg font-bold tracking-tight text-slate-950">Employee Job Card</h1>
      </div>

      <div class="month-chip"><i class="far fa-calendar"></i>{{ selectedMonthLabel }}</div>
    </header>

    <section class="filter-panel">
      <div class="filter-heading"><span><i class="far fa-filter mr-1.5 text-slate-400"></i>Report filters</span><span class="hidden font-normal normal-case tracking-normal text-slate-400 sm:block">Employee and payroll month</span></div>
      <div class="p-3">
      <EmployeeFilter
        :company_id="filters.company_id"
        :department_id="filters.department_id"
        :employee_id="filters.employee_id"
        :line_type="filters.line_type"
        :with-type="true"
        :active-only="true"
        :initial-value="$route.query"
        @update:company_id="filters.company_id = $event"
        @update:department_id="filters.department_id = $event"
        @update:employee_id="filters.employee_id = $event"
        @update:line_type="filters.line_type = $event"
        @filter-change="handleFilterChange"
        class="w-full"
      >
      <FlexibleDatePicker
        v-model="period"
        :show-year="false"
        :show-month="true"
        :show-date="false"
        label="Month"
      />
      </EmployeeFilter>
      </div>
    </section>
    <div class="overview-area text-slate-700">
      <div class="grid items-stretch gap-2 text-sm lg:grid-cols-[minmax(280px,0.68fr)_minmax(0,1.7fr)]">
        <!-- LEFT: Employee profile + actions -->
        <section v-if="hasSelection" class="employee-panel ep-flex">
          <!-- Top: avatar + name -->
          <div class="flex items-center gap-2.5">
            <div class="employee-avatar">
              <img v-if="selectedUser?.photo" :src="selectedUser.photo" :alt="selectedUser?.name" />
              <span v-else>{{ employeeInitials }}</span>
            </div>
            <div class="min-w-0">
              <h2 class="truncate text-sm font-bold text-slate-950">{{ selectedUser?.name || '…' }}</h2>
              <p class="mt-0.5 truncate text-[10px] text-slate-400">{{ employeeSubtitle }}</p>
            </div>
          </div>

          <!-- Middle: employee meta -->
          <dl class="ep-meta">
            <div><dt>Employee ID</dt><dd class="font-mono">{{ selectedUser?.employee_id || '—' }}</dd></div>
            <div><dt>Phone</dt><dd>{{ selectedUser?.phone || '—' }}</dd></div>
            <div><dt>Line type</dt><dd class="capitalize">{{ selectedUser?.type || '—' }}</dd></div>
            <div><dt>Joining date</dt><dd>{{ selectedUser?.joining_date || '—' }}</dd></div>
          </dl>

          <!-- Bottom: actions pushed to bottom -->
          <div class="ep-actions">
            <UserMessageSender
              :user-id="employeeMessageUserId"
              :user-name="employeeMessageName"
              :default-message="defaultAttendanceMessage"
              :context="attendanceMessageContext"
              :recent-messages="employeeRecentMessages"
              :show-recent-messages="true"
              :disabled="!employeeMessageUserId"
              button-label="Message"
              modal-title="Attendance message"
              recent-title="Recent message history"
              disabled-title="Select an employee first"
            />
            <router-link
              :to="{ name: 'MonthWiseApplicationLog', query: { ...$route.query } }"
              class="sp-link-btn"
              target="_blank" rel="noopener noreferrer"
            >
              <i class="far fa-clock"></i> App History
            </router-link>
          </div>
        </section>

        <!-- RIGHT: Summary stats -->
        <section v-if="hasSelection" class="summary-panel">

          <!-- Row 1: Title only (no buttons, they're on the left) -->
          <div class="sp-header">
            <div>
              <h2 class="sp-title">Monthly summary</h2>
              <p class="sp-sub">
                Weekend {{ attendanceStore?.summary?.total_weekend_days || 0 }}d ·
                Holiday {{ attendanceStore?.summary?.total_holiday_days || 0 }}d
              </p>
            </div>
          </div>

          <!-- Row 2: Day stats grid -->
          <div class="sp-stats">
            <div class="sp-stat">
              <span class="sp-stat__num">{{ attendanceStore?.summary?.total_working_days || 0 }}</span>
              <span class="sp-stat__lbl">Working</span>
            </div>
            <div class="sp-stat sp-stat--success">
              <span class="sp-stat__num">{{ attendanceStore?.summary?.total_present_days || 0 }}</span>
              <span class="sp-stat__lbl">Present</span>
            </div>
            <div class="sp-stat sp-stat--warn">
              <span class="sp-stat__num">{{ attendanceStore?.summary?.actual_late_day || 0 }}</span>
              <span class="sp-stat__lbl">Late</span>
            </div>
            <div class="sp-stat sp-stat--danger">
              <span class="sp-stat__num">{{ attendanceStore?.summary?.total_absent_days || 0 }}</span>
              <span class="sp-stat__lbl">Absent</span>
            </div>
          </div>

          <!-- Row 3: Progress bar -->
          <div class="sp-bar-row">
            <div class="sp-bar"><span class="sp-bar__fill" :style="{ width: `${Math.min(100, presentRate)}%` }"></span></div>
            <span class="sp-bar__pct">{{ presentRate }}%</span>
          </div>

          <!-- Row 4: Hour metrics -->
          <div class="sp-hours">
            <div class="sp-hour">
              <span class="sp-hour__lbl">Working / Shift</span>
              <span class="sp-hour__val">
                {{ (attendanceStore?.summary?.total_working_hours ?? '').toString().trim() || '—' }}
                / {{ (attendanceStore?.summary?.total_shift_hours ?? '').toString().trim() || '—' }}
              </span>
            </div>
            <div class="sp-hour__sep"></div>
            <div class="sp-hour">
              <span class="sp-hour__lbl">Approved OT / Total OT</span>
              <span class="sp-hour__val">
                {{ fmtHours(attendanceStore?.summary?.approved_overtimes) }}
                / {{ attendanceStore?.summary?.total_overtime_hours || '0h' }}
              </span>
            </div>
          </div>

        </section>
      </div>
    </div>
    </section>

    <div v-if="!selectedUser">
      <div class="empty-state"><i class="far fa-id-card"></i><h2>Select an employee</h2><p>Choose an employee above to load the monthly job card.</p></div>
    </div>

    <LoaderView v-if="attendanceStore.isLoading" />

    <section v-else class="table-panel" v-show="hasSelection">
      <div class="table-heading"><div><h2>Daily attendance register</h2><p>{{ attendanceStore.monthlyLogs?.length || 0 }} calendar entries</p></div><span>Local timezone</span></div>
      <div class="table-body">
        <AttendanceTable
          :logs="attendanceStore.monthlyLogs"
          :minimal-decorations="true"
        />
      </div>
    </section>
  </main>
</template>

<style scoped>
.attendance-page {
  @apply bg-slate-50/70 p-2.5 lg:p-3;
  display: flex;
  height: calc(100dvh - 76px);
  min-height: 0;
  flex-direction: column;
  gap: 6px;
  overflow: hidden;
}
.job-card-console {
  @apply overflow-visible rounded-xl border border-slate-200 bg-white shadow-sm;
}
.page-header {
  @apply flex h-9 items-center gap-2 border-b border-slate-100 bg-white px-2.5;
}
.icon-button { @apply flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-slate-200 text-[11px] text-slate-500 hover:bg-slate-50 hover:text-slate-800; }
.section-kicker { @apply hidden; }
.page-header h1 { @apply text-sm; }
.month-chip { @apply inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-600; }
.filter-panel {
  @apply relative top-auto z-40 overflow-visible border-b border-slate-100 bg-white p-0 shadow-none;
}
.filter-heading { @apply hidden; }
.filter-panel > div:last-child { @apply p-1.5; }
.overview-area {
  @apply bg-slate-50/60 p-1.5;
}
.employee-panel, .summary-panel {
  @apply rounded-lg border border-slate-200 bg-white p-2 shadow-none;
}

/* Employee panel flex layout — pushes actions to bottom */
.ep-flex          { display: flex; flex-direction: column; gap: 8px; }
.ep-meta          { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 10px; border-top: 1px solid #f1f5f9; padding-top: 8px; font-size: 10px; flex: 1; }
.ep-meta dt       { color: #94a3b8; font-size: 9px; font-weight: 600; text-transform: uppercase; letter-spacing: .05em; }
.ep-meta dd       { font-weight: 600; color: #334155; margin-top: 1px; }
.ep-actions       { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; border-top: 1px solid #f1f5f9; padding-top: 8px; margin-top: auto; }
.employee-avatar { @apply flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-md bg-slate-100 text-xs font-bold text-slate-700 ring-1 ring-slate-200; }
.employee-avatar img { @apply h-full w-full object-cover; }
.employee-panel > div:first-child { @apply gap-2; }
.employee-panel h2 { @apply text-[13px] leading-tight; }
.employee-panel p { @apply text-[10px]; }
.employee-panel dl {
  @apply mt-1.5 grid grid-cols-4 gap-px overflow-hidden rounded-md border border-slate-100 bg-slate-100 text-[10px];
}
.employee-panel dl > div {
  @apply bg-white px-2 py-1;
}
.employee-panel dt {
  @apply text-[8px] font-semibold uppercase tracking-wide text-slate-400;
}
.employee-panel dd {
  @apply font-medium leading-tight text-slate-700;
}
/* ── Summary panel inner layout ── */

/* Row 1: header */
.sp-header        { display: flex; align-items: flex-start; justify-content: space-between; flex-wrap: wrap; gap: 6px; margin-bottom: 8px; }
.sp-title         { font-size: 12px; font-weight: 700; color: #0f172a; line-height: 1.3; }
.sp-sub           { font-size: 10px; color: #94a3b8; margin-top: 1px; }
.sp-actions       { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.sp-link-btn      { display: inline-flex; align-items: center; gap: 4px; padding: 3px 8px; border-radius: 6px; border: 1px solid #e2e8f0; background: white; color: #475569; font-size: 10px; font-weight: 600; text-decoration: none; white-space: nowrap; }
.sp-link-btn:hover { background: #f8fafc; }

/* Row 2: day stats */
.sp-stats         { display: grid; grid-template-columns: repeat(4, 1fr); border-radius: 8px; overflow: hidden; border: 1px solid #e2e8f0; margin-bottom: 6px; }
.sp-stat          { display: flex; flex-direction: column; align-items: center; padding: 6px 4px; background: white; border-right: 1px solid #f1f5f9; }
.sp-stat:last-child { border-right: none; }
.sp-stat__num     { font-size: 18px; font-weight: 800; font-variant-numeric: tabular-nums; color: #1e293b; line-height: 1.1; }
.sp-stat__lbl     { font-size: 8px; font-weight: 700; text-transform: uppercase; letter-spacing: .07em; color: #94a3b8; margin-top: 2px; }
.sp-stat--success .sp-stat__num { color: #059669; }
.sp-stat--warn    .sp-stat__num { color: #d97706; }
.sp-stat--danger  .sp-stat__num { color: #e11d48; }

/* Row 3: rate bar */
.sp-bar-row       { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
.sp-bar           { flex: 1; height: 4px; background: #f1f5f9; border-radius: 999px; overflow: hidden; }
.sp-bar__fill     { display: block; height: 100%; background: #334155; border-radius: 999px; transition: width .4s ease; }
.sp-bar__pct      { font-size: 9px; font-weight: 700; font-variant-numeric: tabular-nums; color: #64748b; white-space: nowrap; }

/* Row 4: hour metrics */
.sp-hours         { display: flex; align-items: center; border-top: 1px solid #f1f5f9; padding-top: 6px; }
.sp-hour          { display: flex; flex-direction: column; gap: 1px; flex: 1; }
.sp-hour__lbl     { font-size: 8px; font-weight: 700; text-transform: uppercase; letter-spacing: .07em; color: #94a3b8; }
.sp-hour__val     { font-size: 12px; font-weight: 700; font-variant-numeric: tabular-nums; color: #334155; }
.sp-hour__sep     { width: 1px; height: 28px; background: #e2e8f0; margin: 0 12px; flex-shrink: 0; }
.empty-state { @apply flex min-h-[260px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white text-center; }
.empty-state > i { @apply mb-3 text-2xl text-slate-300; }
.empty-state h2 { @apply text-sm font-semibold text-slate-700; }
.empty-state p { @apply mt-1 text-xs text-slate-400; }
.table-panel {
  @apply overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm;
  display: flex;
  flex: 1 1 0%;
  min-height: 0;
  flex-direction: column;
}
.table-heading { @apply flex items-center justify-between border-b border-slate-200 px-3 py-2; }
.table-heading h2 { @apply text-xs font-bold text-slate-900; }
.table-heading p, .table-heading > span { @apply mt-0.5 text-[10px] text-slate-400; }
.table-body {
  display: flex;
  flex: 1 1 0%;
  min-height: 0;
  padding: 8px;
}
.table-body :deep(.att-wrap) {
  display: flex;
  flex: 1 1 0%;
  min-height: 0;
  height: 100%;
  flex-direction: column;
}
.table-body :deep(.att-scroll) {
  flex: 1 1 0%;
  min-height: 0;
  max-height: none;
}
.table-body :deep(.att-legend) {
  display: none;
}

@media (max-width: 640px) {
  .attendance-page { @apply p-2; }
  .month-chip { @apply max-w-[130px] truncate; }
}
@media (min-width: 640px) {
  .attendance-page { height: calc(100dvh - 88px); }
}
</style>
