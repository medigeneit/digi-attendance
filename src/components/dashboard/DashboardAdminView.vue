<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useUserStore } from '@/stores/user'
import EmployeeFilter from '@/components/common/EmployeeFilter.vue'
import ChartCard from '@/components/dashboard/admin/ChartCard.vue'
import DashboardTabs from '@/components/dashboard/admin/DashboardTabs.vue'
import EmptyState from '@/components/dashboard/admin/EmptyState.vue'
import KpiCard from '@/components/dashboard/admin/KpiCard.vue'
import SmartInsightCard from '@/components/dashboard/admin/SmartInsightCard.vue'

const userStore = useUserStore()
const { dashboardInfo, isLoading } = storeToRefs(userStore)
const route = useRoute()
const router = useRouter()

const localDate = () => {
  const date = new Date()
  const offset = date.getTimezoneOffset()
  return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 10)
}

const tabs = [
  { key: 'overview', label: 'Overview' },
  { key: 'attendance', label: 'Attendance & Late' },
  { key: 'leave', label: 'Leave Management' },
  // { key: 'insights', label: 'Smart Insights' },
  { key: 'reports', label: 'Reports' },
]

const tabKeys = tabs.map((tab) => tab.key)
const normalizeTab = (value) => {
  const tab = Array.isArray(value) ? value[0] : value
  if (tab === 'export') return 'reports'
  return tabKeys.includes(tab) ? tab : 'overview'
}

const activeTab = ref(normalizeTab(route.query.tab))
const filters = ref({
  date_filter: 'today',
  custom_date: localDate(),
  company_id: '',
  department_id: '',
  line_type: 'all',
})

const numberValue = (value) => Number(value ?? 0) || 0

const normalized = computed(() => {
  const raw = dashboardInfo.value || {}
  const apiKpis = raw.kpis || {}

  const kpis = {
    total_employees: numberValue(apiKpis.total_employees ?? raw.totalUsers),
    present_today: numberValue(apiKpis.present_today ?? raw.todayPresents),
    absent_today: numberValue(apiKpis.absent_today ?? raw.todayAbsents),
    late_today: numberValue(apiKpis.late_today ?? raw.todayLateEntries),
    short_leave_today: numberValue(apiKpis.short_leave_today ?? raw.todayShortLeaves),
    on_leave_today: numberValue(apiKpis.on_leave_today ?? raw.todayLeaves),
    tomorrow_leave: numberValue(apiKpis.tomorrow_leave ?? raw.tomorrowLeaves),
    prev_week_leaves: numberValue(apiKpis.prev_week_leaves ?? raw.prevWeekLeaves),
    upcoming_leaves: numberValue(apiKpis.upcoming_leaves ?? raw.nextWeekLeaves),
    today_todos: numberValue(apiKpis.today_todos ?? raw.todayTotalTodos),
    monthly_todos: numberValue(apiKpis.monthly_todos ?? raw.thisMonthTotalTodos),
  }

  const fallbackInsights = [
    kpis.absent_today > 0
      ? {
          type: kpis.absent_today > kpis.total_employees * 0.2 ? 'danger' : 'warning',
          title: 'High Absence',
          message: `${kpis.absent_today} employees are absent today`,
        }
      : null,
    kpis.upcoming_leaves > 0
      ? {
          type: 'warning',
          title: 'Leave Summary',
          message: `${kpis.upcoming_leaves} employees have upcoming leave`,
        }
      : null,
  ].filter(Boolean)

  return {
    kpis,
    charts: {
      attendance_trend: {
        categories: raw.charts?.attendance_trend?.categories || [],
        series: raw.charts?.attendance_trend?.series || [],
      },
      leave_distribution: {
        labels: raw.charts?.leave_distribution?.labels || ['Today', 'Tomorrow', 'Previous Week', 'Upcoming'],
        series: raw.charts?.leave_distribution?.series || [
          kpis.on_leave_today,
          kpis.tomorrow_leave,
          kpis.prev_week_leaves,
          kpis.upcoming_leaves,
        ],
      },
      late_by_department: {
        categories: raw.charts?.late_by_department?.categories || [],
        series: raw.charts?.late_by_department?.series || [{ name: 'Late', data: [] }],
      },
      leave_department_overview: {
        categories: raw.charts?.leave_department_overview?.categories || [],
        series: raw.charts?.leave_department_overview?.series || [
          { name: 'Approved', data: [] },
          { name: 'Pending', data: [] },
        ],
      },
    },
    leaveTypeDistribution: Array.isArray(raw.leave_type_distribution)
      ? raw.leave_type_distribution
      : [],
    insights: Array.isArray(raw.insights) && raw.insights.length ? raw.insights : fallbackInsights,
    topLateEmployees: Array.isArray(raw.top_late_employees) ? raw.top_late_employees : [],
  }
})

const kpis = computed(() => normalized.value.kpis)
const charts = computed(() => normalized.value.charts)
const insights = computed(() => normalized.value.insights)
const topLateEmployees = computed(() => normalized.value.topLateEmployees)
const leaveTypeDistribution = computed(() => normalized.value.leaveTypeDistribution)
const summaryLabelSuffix = computed(() => (filters.value.date_filter === 'custom' ? 'Selected Date' : 'Today'))

const filterCopy = computed(() => {
  if (filters.value.date_filter === 'custom') {
    const date = filters.value.custom_date || localDate()
    return {
      option: 'Specific Date',
      movement: `Last 7 days workforce movement ending ${date}`,
      summary: `${date} Summary`,
      lateDepartment: `${date} late count by department`,
      leaveDepartment: `${date} approved and pending leave days by department`,
      leaveDistribution: `${date} leave windows`,
    }
  }

  if (filters.value.date_filter === 'week') {
    return {
      option: 'Last 7 Days',
      movement: 'Last 7 days workforce movement',
      summary: "Today's Summary",
      lateDepartment: 'Last 7 days late count by department',
      leaveDepartment: 'Last 7 days approved and pending leave days by department',
      leaveDistribution: 'Last 7 days leave windows',
    }
  }

  if (filters.value.date_filter === 'month') {
    return {
      option: 'Month',
      movement: 'Monthly workforce movement',
      summary: "Today's Summary",
      lateDepartment: 'Monthly late count by department',
      leaveDepartment: 'Monthly approved and pending leave days by department',
      leaveDistribution: 'Monthly leave windows',
    }
  }

  return {
    option: 'Today',
    movement: 'Today workforce movement',
    summary: "Today's Summary",
    lateDepartment: 'Today late count by department',
    leaveDepartment: 'Today approved and pending leave days by department',
    leaveDistribution: 'Current leave windows',
  }
})

const overviewCards = computed(() => [
  { label: 'Total Employees', value: kpis.value.total_employees, icon: 'fas fa-users', tone: 'blue', to: { name: 'TodayAttendanceReport', query: { status: 'all' } } },
  { label: `Present ${summaryLabelSuffix.value}`, value: kpis.value.present_today, icon: 'fas fa-user-check', tone: 'green', to: { name: 'TodayAttendanceReport', query: { status: 'Present' } } },
  { label: `Absent ${summaryLabelSuffix.value}`, value: kpis.value.absent_today, icon: 'fas fa-user-times', tone: 'red', to: { name: 'TodayAttendanceReport', query: { status: 'Absent' } } },
  { label: `On Leave ${summaryLabelSuffix.value}`, value: kpis.value.on_leave_today, icon: 'fas fa-calendar-check', tone: 'blue', to: { name: 'LeaveApplicationsForDay', query: { applicationType: 'today' } } },
  { label: 'Late', value: kpis.value.late_today, icon: 'fas fa-clock', tone: 'orange', to: { name: 'DailyLateAttendanceReport' } },
  { label: 'Short Leave', value: kpis.value.short_leave_today, icon: 'fas fa-walking', tone: 'purple', to: { name: 'DateWiseShortLeaveList' } },
])

const leaveCards = computed(() => [
  { label: 'Today Leave', value: kpis.value.on_leave_today, icon: 'fas fa-calendar-day', tone: 'blue' },
  { label: 'Tomorrow Leave', value: kpis.value.tomorrow_leave, icon: 'fas fa-calendar-plus', tone: 'green' },
  { label: 'Previous Week Leaves', value: kpis.value.prev_week_leaves, icon: 'fas fa-calendar-minus', tone: 'orange' },
  { label: 'Upcoming Leaves', value: kpis.value.upcoming_leaves, icon: 'fas fa-calendar-alt', tone: 'purple' },
  { label: 'Short Leave', value: kpis.value.short_leave_today, icon: 'fas fa-walking', tone: 'red' },
])

const summaryRows = computed(() => [
  ['Total Staff', kpis.value.total_employees],
  ['Present', kpis.value.present_today],
  ['Absent', kpis.value.absent_today],
  ['Late', kpis.value.late_today],
  ['Short Leave', kpis.value.short_leave_today],
  ['On Leave', kpis.value.on_leave_today],
])

const leaveTypeTones = [
  { border: 'border-l-blue-500', icon: 'bg-blue-50 text-blue-600', bar: 'bg-blue-500', iconClass: 'fas fa-plane-departure' },
  { border: 'border-l-rose-500', icon: 'bg-rose-50 text-rose-600', bar: 'bg-rose-500', iconClass: 'far fa-heart' },
  { border: 'border-l-violet-500', icon: 'bg-violet-50 text-violet-600', bar: 'bg-violet-500', iconClass: 'fas fa-bolt' },
  { border: 'border-l-orange-500', icon: 'bg-orange-50 text-orange-600', bar: 'bg-orange-500', iconClass: 'far fa-star' },
  { border: 'border-l-teal-500', icon: 'bg-teal-50 text-teal-600', bar: 'bg-teal-500', iconClass: 'fas fa-house-laptop' },
]

const leaveTypeCards = computed(() =>
  leaveTypeDistribution.value.map((item, index) => ({
    ...item,
    tone: leaveTypeTones[index % leaveTypeTones.length],
  })),
)

const reportCards = computed(() => [
  {
    label: 'Today Attendance',
    description: 'Daily present, absent, late, leave and movement summary.',
    icon: 'fas fa-calendar-day',
    tone: 'blue',
    to: { name: 'TodayAttendanceReport' },
  },
  {
    label: 'Date Wise Attendance',
    description: 'Attendance summary for a selected day or date range.',
    icon: 'fas fa-calendar-week',
    tone: 'green',
    to: {
      name: 'DateWiseAttendanceSummaryReport',
      query: {
        company_id: '',
        department_id: 'all',
        line_type: 'all',
        employee_id: '',
        start_date: localDate(),
        end_date: localDate(),
      },
    },
  },
  {
    label: 'Monthly Attendance',
    description: 'Month based attendance register and staff status.',
    icon: 'fas fa-clipboard-list',
    tone: 'purple',
    to: { name: 'MonthlyAttendanceReport' },
  },
  {
    label: 'Daily Late Report',
    description: 'Late arrivals calculated with shift grace time.',
    icon: 'fas fa-clock',
    tone: 'orange',
    to: { name: 'DailyLateAttendanceReport' },
  },
  {
    label: 'Monthly Leave Report',
    description: 'Monthly leave usage, approvals and leave windows.',
    icon: 'fas fa-calendar-check',
    tone: 'red',
    to: { name: 'MonthlyLeaveReport' },
  },
  {
    label: 'Weekly Leave Histories',
    description: 'Past 5 days and next 5 days leave movement in one view.',
    icon: 'fas fa-calendar-week',
    tone: 'blue',
    to: { name: 'WeekLeaveHistories', query: { past_days: 5, future_days: 5 } },
  },
])

const orgParams = computed(() => ({
  company_id: filters.value.company_id || undefined,
  department_id: filters.value.department_id || undefined,
  line_type: filters.value.line_type && filters.value.line_type !== 'all' ? filters.value.line_type : undefined,
}))

const selectedDateParams = computed(() =>
  filters.value.date_filter === 'custom'
    ? {
        date_filter: 'custom',
        date: filters.value.custom_date || localDate(),
      }
    : { date_filter: 'today' },
)

const dashboardParams = computed(() => ({
  ...selectedDateParams.value,
  ...orgParams.value,
  summary_only: true,
}))

let lastRefreshKey = ''
const refreshDashboard = async () => {
  const chartParams = {
    date_filter: filters.value.date_filter,
    ...(filters.value.date_filter === 'custom' ? { date: filters.value.custom_date || localDate() } : {}),
    ...orgParams.value,
  }
  const chartParamsTend = {
    date_filter: ['today', 'custom'].includes(filters.value.date_filter) ? 'week' : filters.value.date_filter, // Trend needs at least 7 days, even for today/specific date.
    ...(filters.value.date_filter === 'custom' ? { date: filters.value.custom_date || localDate() } : {}),
    ...orgParams.value,
  }
  const refreshKey = JSON.stringify({
    summary: dashboardParams.value,
    trend: chartParamsTend,
    analytics: chartParams,
  })
  if (refreshKey === lastRefreshKey) return
  lastRefreshKey = refreshKey

  await userStore.fetchAdminDashboardData(dashboardParams.value)
  await Promise.all([
    userStore.fetchAdminDashboardAttendanceTrend(chartParamsTend),
    userStore.fetchAdminDashboardLeaveAnalytics(chartParams),
    userStore.fetchAdminDashboardLateAnalytics(chartParams),
  ])
}

onMounted(async () => {
  await refreshDashboard()
})

watch(
  () => route.query.tab,
  (tab) => {
    const nextTab = normalizeTab(tab)
    if (activeTab.value !== nextTab) {
      activeTab.value = nextTab
    }
  },
)

watch(activeTab, (tab) => {
  if (normalizeTab(route.query.tab) === tab) return

  router.push({
    query: {
      ...route.query,
      tab,
    },
  })
})

watch(filters, refreshDashboard, { deep: true })
</script>

<template>
  <div class="min-h-screen bg-slate-50 px-1 py-2 md:px-3">
    <div class="mx-auto max-w-[1440px] space-y-6">
      <div class="grid gap-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100 xl:grid-cols-[330px_1fr] xl:items-center">
        <div class="min-w-0">
          <p class="text-xs font-semibold uppercase tracking-wide text-blue-600">Admin Dashboard</p>
          <h1 class="mt-1 text-2xl font-bold leading-tight text-slate-950">HRM Workforce Dashboard</h1>
          <p class="mt-1 max-w-sm text-sm leading-5 text-slate-500">Attendance, leave, late arrivals, todos, and workforce signals.</p>
        </div>

        <div class="dashboard-filter-row min-w-0">
          <label class="min-w-0">
            <span class="mb-1 block text-xs font-semibold text-slate-500">Date Preset</span>
            <select v-model="filters.date_filter" class="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100">
              <option value="today">Today</option>
              <option value="week">Last 7 Days</option>
              <option value="month">Month</option>
              <option value="custom">Specific Date</option>
            </select>
          </label>
          <label class="min-w-0" :class="filters.date_filter !== 'custom' ? 'opacity-50' : ''">
            <span class="mb-1 block text-xs font-semibold text-slate-500">Specific Date</span>
            <input
              v-model="filters.custom_date"
              type="date"
              :disabled="filters.date_filter !== 'custom'"
              class="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-50"
            />
          </label>

          <EmployeeFilter
            v-model:company_id="filters.company_id"
            v-model:department_id="filters.department_id"
            v-model:line_type="filters.line_type"
            :with-type="true"
            :with-employee="false"
            class="dashboard-org-filter"
            slot-class="hidden"
          />
        </div>
      </div>

      <DashboardTabs v-model="activeTab" :tabs="tabs" />

      <div v-if="isLoading" class="rounded-2xl bg-white p-6 text-sm text-slate-500 shadow-sm">
        Loading dashboard data...
      </div>

      <template v-else>
        <section v-if="activeTab === 'overview'" class="grid gap-6 xl:grid-cols-[1fr_360px]">
          <div class="space-y-6">
            <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <KpiCard v-for="card in overviewCards" :key="card.label" v-bind="card" />
            </div>

            <div class="grid gap-6 lg:grid-cols-2">
              <ChartCard
                title="Attendance Trend"
                :subtitle="filterCopy.movement"
                type="area"
                :categories="charts.attendance_trend.categories"
                :series="charts.attendance_trend.series"
              />
              <ChartCard
                title="Leave Distribution"
                :subtitle="filterCopy.leaveDistribution"
                type="donut"
                :labels="charts.leave_distribution.labels"
                :series="charts.leave_distribution.series"
              />
            </div>
          </div>

          <aside class="space-y-4">
            <div class="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
              <h2 class="text-base font-bold text-slate-900">Smart Insights</h2>
              <div class="mt-4 space-y-3">
                <SmartInsightCard v-for="insight in insights.slice(0, 3)" :key="`${insight.title}-${insight.message}`" :insight="insight" />
                <EmptyState v-if="!insights.length" title="No insights" message="Dashboard signals are stable." icon="fas fa-lightbulb" />
              </div>
            </div>
          </aside>
        </section>

        <section v-else-if="activeTab === 'attendance'" class="space-y-6">
          <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
            <KpiCard v-for="card in overviewCards" :key="card.label" v-bind="card" />
          </div>

          <div class="grid gap-6 xl:grid-cols-[1.35fr_.85fr]">
            <ChartCard
              title="Attendance Trend"
              :subtitle="filterCopy.movement"
              type="area"
              :categories="charts.attendance_trend.categories"
              :series="charts.attendance_trend.series"
            />
            <ChartCard
              title="Late by Department"
              :subtitle="filterCopy.lateDepartment"
              type="bar"
              :categories="charts.late_by_department.categories"
              :series="charts.late_by_department.series"
            />
          </div>

          <div class="grid gap-6 lg:grid-cols-2">
            <section class="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
              <h3 class="text-base font-bold text-slate-900">{{ filterCopy.summary }}</h3>
              <div class="mt-4 divide-y divide-slate-100">
                <div v-for="[label, value] in summaryRows" :key="label" class="flex items-center justify-between py-3 text-sm">
                  <span class="font-medium text-slate-600">{{ label }}</span>
                  <span class="font-bold text-slate-900">{{ value }}</span>
                </div>
              </div>
            </section>

            <section class="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
              <h3 class="text-base font-bold text-slate-900">Top Late Employees</h3>
              <div v-if="topLateEmployees.length" class="mt-4 divide-y divide-slate-100">
                <div v-for="employee in topLateEmployees" :key="`${employee.employee_id}-${employee.name}`" class="flex items-center justify-between gap-3 py-3">
                  <div>
                    <p class="text-sm font-semibold text-slate-900">{{ employee.name }}</p>
                    <p class="text-xs text-slate-500">{{ employee.department || 'Unassigned' }}</p>
                  </div>
                  <span class="rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-700">
                    {{ employee.late_duration || 'Late' }}
                  </span>
                </div>
              </div>
              <EmptyState v-else title="No late employees" message="No late arrival record found for the selected filters." icon="fas fa-user-clock" />
            </section>
          </div>
        </section>

        <section v-else-if="activeTab === 'leave'" class="space-y-6">
          <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <KpiCard v-for="card in leaveCards" :key="card.label" v-bind="card" />
          </div>
          <div class="grid gap-6 xl:grid-cols-[1.35fr_.85fr]">
            <ChartCard
              title="Department Overview"
              :subtitle="filterCopy.leaveDepartment"
              type="bar"
              :categories="charts.leave_department_overview.categories"
              :series="charts.leave_department_overview.series"
              :colors="['#22c55e', '#f59e0b']"
              :height="340"
            />
            <ChartCard
              title="Leave Distribution"
              :subtitle="filterCopy.leaveDistribution"
              type="donut"
              :labels="charts.leave_distribution.labels"
              :series="charts.leave_distribution.series"
            />
          </div>

          <section class="space-y-3">
            <h3 class="text-sm font-bold uppercase tracking-wide text-slate-600">Leave Type Distribution</h3>
            <div v-if="leaveTypeCards.length" class="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
              <div
                v-for="item in leaveTypeCards"
                :key="item.label"
                class="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm border-l-4"
                :class="item.tone.border"
              >
                <div class="flex items-center gap-3">
                  <div class="flex h-9 w-9 items-center justify-center rounded-xl" :class="item.tone.icon">
                    <i :class="item.tone.iconClass"></i>
                  </div>
                  <p class="min-w-0 truncate text-sm font-semibold text-slate-600">{{ item.label }}</p>
                </div>
                <p class="mt-4 text-2xl font-bold text-slate-950">{{ item.value }}</p>
                <div class="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div class="h-full rounded-full" :class="item.tone.bar" :style="{ width: `${Math.max(4, item.percentage || 0)}%` }"></div>
                </div>
              </div>
            </div>
            <EmptyState v-else title="No leave type data" message="No leave type records found for the selected filters." icon="far fa-calendar" />
          </section>
        </section>

        <section v-else-if="activeTab === 'insights'" class="grid gap-4 lg:grid-cols-3">
          <SmartInsightCard v-for="insight in insights" :key="`${insight.title}-${insight.message}`" :insight="insight" />
          <EmptyState v-if="!insights.length" title="No insights" message="Dashboard signals are stable." icon="fas fa-lightbulb" />
        </section>

        <section v-else class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <RouterLink
            v-for="report in reportCards"
            :key="report.label"
            :to="report.to"
            class="report-card"
            :class="`report-card--${report.tone}`"
          >
            <div class="report-card__icon">
              <i :class="report.icon"></i>
            </div>
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-bold text-slate-950">{{ report.label }}</p>
              <p class="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{{ report.description }}</p>
            </div>
            <i class="fas fa-chevron-right text-xs text-slate-300"></i>
          </RouterLink>
        </section>
      </template>
    </div>
  </div>
</template>

<style scoped>
.report-card {
  --report-color: #2563eb;
  --report-bg: #eff6ff;
  display: flex;
  min-height: 112px;
  align-items: center;
  gap: 14px;
  border-left: 4px solid var(--report-color);
  border-radius: 16px;
  background: #ffffff;
  padding: 18px 20px;
  color: #0f172a;
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08);
  transition:
    transform 0.18s ease,
    box-shadow 0.18s ease;
}

.report-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 14px 36px rgba(15, 23, 42, 0.11);
}

.report-card__icon {
  display: flex;
  height: 44px;
  width: 44px;
  flex: 0 0 44px;
  align-items: center;
  justify-content: center;
  border-radius: 14px;
  background: var(--report-bg);
  color: var(--report-color);
}

.report-card--blue {
  --report-color: #2563eb;
  --report-bg: #eff6ff;
}

.report-card--green {
  --report-color: #10b981;
  --report-bg: #ecfdf5;
}

.report-card--purple {
  --report-color: #8b5cf6;
  --report-bg: #f5f3ff;
}

.report-card--teal {
  --report-color: #14b8a6;
  --report-bg: #f0fdfa;
}

.report-card--orange {
  --report-color: #f97316;
  --report-bg: #fff7ed;
}

.report-card--red {
  --report-color: #f43f5e;
  --report-bg: #fff1f2;
}

.dashboard-org-filter {
  display: contents;
}

.dashboard-filter-row {
  display: grid;
  grid-template-columns: minmax(140px, 0.9fr) minmax(160px, 1fr) minmax(170px, 1fr) minmax(170px, 1fr) minmax(150px, 0.9fr);
  gap: 12px;
  align-items: end;
}

.dashboard-org-filter :deep(.relative.min-w-0) {
  min-width: 0;
}

@media (max-width: 1280px) {
  .dashboard-filter-row {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 768px) {
  .dashboard-filter-row {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 520px) {
  .dashboard-filter-row {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
