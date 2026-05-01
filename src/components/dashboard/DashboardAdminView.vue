<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useUserStore } from '@/stores/user'
import { useDepartmentStore } from '@/stores/department'
import ChartCard from '@/components/dashboard/admin/ChartCard.vue'
import DashboardTabs from '@/components/dashboard/admin/DashboardTabs.vue'
import EmptyState from '@/components/dashboard/admin/EmptyState.vue'
import KpiCard from '@/components/dashboard/admin/KpiCard.vue'
import SmartInsightCard from '@/components/dashboard/admin/SmartInsightCard.vue'

const userStore = useUserStore()
const departmentStore = useDepartmentStore()
const { dashboardInfo, isLoading } = storeToRefs(userStore)
const { departments } = storeToRefs(departmentStore)

const activeTab = ref('overview')
const filters = ref({
  date_filter: 'today',
  department_id: '',
})

const tabs = [
  { key: 'overview', label: 'Overview' },
  { key: 'attendance', label: 'Attendance & Late' },
  { key: 'leave', label: 'Leave Management' },
  // { key: 'insights', label: 'Smart Insights' },
  // { key: 'export', label: 'Export Reports' },
]

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

const filterCopy = computed(() => {
  if (filters.value.date_filter === 'week') {
    return {
      option: 'Last 7 Days',
      movement: 'Last 7 days workforce movement',
      summary: 'Last 7 Days Summary',
      lateDepartment: 'Last 7 days late count by department',
      leaveDepartment: 'Last 7 days approved and pending leave days by department',
      leaveDistribution: 'Last 7 days leave windows',
    }
  }

  if (filters.value.date_filter === 'month') {
    return {
      option: 'Month',
      movement: 'Monthly workforce movement',
      summary: 'Monthly Summary',
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
  { label: 'Present Today', value: kpis.value.present_today, icon: 'fas fa-user-check', tone: 'green', to: { name: 'TodayAttendanceReport', query: { status: 'Present' } } },
  { label: 'Absent Today', value: kpis.value.absent_today, icon: 'fas fa-user-xmark', tone: 'red', to: { name: 'TodayAttendanceReport', query: { status: 'Absent' } } },
  { label: 'On Leave Today', value: kpis.value.on_leave_today, icon: 'fas fa-calendar-check', tone: 'blue', to: { name: 'LeaveApplicationsForDay', query: { applicationType: 'today' } } },
  { label: 'Late', value: kpis.value.late_today, icon: 'fas fa-clock', tone: 'orange', to: { name: 'DailyLateAttendanceReport' } },
  { label: 'Short Leave', value: kpis.value.short_leave_today, icon: 'fas fa-person-walking-arrow-right', tone: 'purple', to: { name: 'DateWiseShortLeaveList' } },
])

const leaveCards = computed(() => [
  { label: 'Today Leave', value: kpis.value.on_leave_today, icon: 'fas fa-calendar-day', tone: 'blue' },
  { label: 'Tomorrow Leave', value: kpis.value.tomorrow_leave, icon: 'fas fa-calendar-plus', tone: 'green' },
  { label: 'Previous Week Leaves', value: kpis.value.prev_week_leaves, icon: 'fas fa-calendar-minus', tone: 'orange' },
  { label: 'Upcoming Leaves', value: kpis.value.upcoming_leaves, icon: 'fas fa-calendar-days', tone: 'purple' },
  { label: 'Short Leave', value: kpis.value.short_leave_today, icon: 'fas fa-person-walking-arrow-right', tone: 'red' },
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

const dashboardParams = computed(() => ({
    date_filter: filters.value.date_filter,
    department_id: filters.value.department_id,
    summary_only: true,
}))

const refreshDashboard = async () => {
  await userStore.fetchAdminDashboardData(dashboardParams.value)
  const chartParams = {
    date_filter: filters.value.date_filter,
    department_id: filters.value.department_id,
  }
  const chartParamsTend = {
    date_filter: filters.value.date_filter === 'today' ? 'week' : filters.value.date_filter, // For attendance trend, use last 7 days data when 'today' is selected to show meaningful trend
    department_id: filters.value.department_id,
  }
  await Promise.all([
    userStore.fetchAdminDashboardAttendanceTrend(chartParamsTend),
    userStore.fetchAdminDashboardLeaveAnalytics(chartParams),
    userStore.fetchAdminDashboardLateAnalytics(chartParams),
  ])
}

onMounted(async () => {
  await Promise.all([
    refreshDashboard(),
    departmentStore.fetchDepartments(),
  ])
})

watch(filters, refreshDashboard, { deep: true })
</script>

<template>
  <div class="min-h-screen bg-slate-50 px-1 py-2 md:px-3">
    <div class="mx-auto max-w-[1440px] space-y-6">
      <div class="flex flex-col gap-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p class="text-xs font-semibold uppercase tracking-wide text-blue-600">Admin Dashboard</p>
          <h1 class="mt-1 text-2xl font-bold text-slate-950 md:text-3xl">HRM Workforce Dashboard</h1>
          <p class="mt-1 text-sm text-slate-500">Attendance, leave, late arrivals, todos, and workforce signals.</p>
        </div>

        <div class="grid gap-3 sm:grid-cols-2">
          <label class="block">
            <span class="mb-1 block text-xs font-semibold text-slate-500">Date</span>
            <select v-model="filters.date_filter" class="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100">
              <option value="today">Today</option>
              <option value="week">Last 7 Days</option>
              <option value="month">Month</option>
            </select>
          </label>
          <label class="block">
            <span class="mb-1 block text-xs font-semibold text-slate-500">Department</span>
            <select v-model="filters.department_id" class="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100">
              <option value="">All Departments</option>
              <option v-for="department in departments" :key="department.id" :value="department.id">
                {{ department.name }}
              </option>
            </select>
          </label>
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
                subtitle="Current leave windows"
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

        <section v-else class="grid gap-4 md:grid-cols-3">
          <RouterLink :to="{ name: 'TodayAttendanceReport' }" class="export-card">
            <i class="fas fa-file-export text-blue-600"></i>
            <span>Export Attendance Report</span>
          </RouterLink>
          <RouterLink :to="{ name: 'MonthlyLeaveReport' }" class="export-card">
            <i class="fas fa-calendar-arrow-down text-emerald-600"></i>
            <span>Export Leave Report</span>
          </RouterLink>
          <RouterLink :to="{ name: 'DailyLateAttendanceReport' }" class="export-card">
            <i class="fas fa-clock-rotate-left text-orange-600"></i>
            <span>Export Late Report</span>
          </RouterLink>
        </section>
      </template>
    </div>
  </div>
</template>

<style scoped>
.export-card {
  display: flex;
  min-height: 130px;
  align-items: center;
  justify-content: center;
  gap: 12px;
  border-radius: 16px;
  background: #ffffff;
  padding: 24px;
  font-size: 15px;
  font-weight: 700;
  color: #0f172a;
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08);
  transition:
    transform 0.18s ease,
    box-shadow 0.18s ease;
}

.export-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 14px 36px rgba(15, 23, 42, 0.11);
}
</style>
