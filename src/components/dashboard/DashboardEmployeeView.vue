<script setup>
import OverlyModal from '@/components/common/OverlyModal.vue'
import TodoAddForm from '@/components/todo/TodoAddForm.vue'
import { useAuthStore } from '@/stores/auth'
import { useUserStore } from '@/stores/user'
import apiClient from '@/axios'
import { storeToRefs } from 'pinia'
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const authStore = useAuthStore()
const userStore = useUserStore()
const { user: authUser } = storeToRefs(authStore)
const { employeeDashboardOverview, userDashboard } = storeToRefs(userStore)
const route = useRoute()
const router = useRouter()

const today = new Date()
const initialDate = isValidDate(route.query.date) ? String(route.query.date) : formatDate(today)
const selectedDate = ref(initialDate)
const visibleMonth = ref(isValidMonth(route.query.month) ? String(route.query.month) : initialDate.slice(0, 7))
const showTodoForm = ref(false)
const showPendingNoticeModal = ref(false)

// Todos fetched from my-todo-dates API for the visible month
const myTodoDates = ref([])
const todosLoading = ref(false)

async function fetchMyTodoDates() {
  const [year, month] = visibleMonth.value.split('-').map(Number)
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`
  const endDate = new Date(year, month, 0).toISOString().slice(0, 10)
  try {
    todosLoading.value = true
    const res = await apiClient.get('/my-todo-dates', {
      params: { 'start-date': startDate, 'end-date': endDate },
    })
    myTodoDates.value = res.data?.todo_dates || []
  } catch {
    myTodoDates.value = []
  } finally {
    todosLoading.value = false
  }
}

const todosForSelectedDate = computed(() =>
  myTodoDates.value.filter((td) => {
    const raw = td.date || (td.attributes && td.attributes.date)
    return raw && raw.slice(0, 10) === selectedDate.value
  })
)

const myTodoCount = computed(() => todosForSelectedDate.value.length)

const overview = computed(() => {
  if (employeeDashboardOverview.value?.profile || employeeDashboardOverview.value?.hero) {
    return employeeDashboardOverview.value
  }

  const dashboard = userDashboard.value || {}
  const user = authUser.value || storedUser() || {}

  return {
    profile: {
      id: user.id,
      name: user.name,
      employee_id: user.employee_id,
      role: user.role,
      type: user.type,
      is_active: user.is_active ?? true,
      department: user.department || null,
      company: user.company || null,
    },
    hero: {
      attendance_rate: 0,
      tasks_completed: 0,
      tasks_total: 0,
      leave_available: sumLeaveAvailable(dashboard.leave_balance),
    },
    attendance: {},
    leave_balance: dashboard.leave_balance || [],
    tasks: { selected_date: [], stats: {} },
    todos: { selected_date: [] },
    calendar: { markers: {} },
    quick_actions: {
      leave: { pending: dashboard.counts?.current_month_leave || 0, route: 'MyLeaveApplications' },
      short_leave: { pending: dashboard.counts?.short_leave || 0, route: 'MyShortLeaves' },
      exchange: { pending: dashboard.counts?.exchange || 0, route: 'MyShiftExchangeList' },
      manual_attendance: { pending: dashboard.counts?.manual_attendance || 0, route: 'MyManualAttendanceList' },
    },
    applications: {
      leave: dashboard.lists?.current_month_leave || [],
      short_leave: dashboard.lists?.short_leave || [],
      exchange: dashboard.lists?.exchange || [],
      manual_attendance: dashboard.lists?.manual_attendance || [],
    },
    notices: dashboard.notices || [],
  }
})
const profile = computed(() => overview.value.profile || {})
const hero = computed(() => overview.value.hero || {})
const attendance = computed(() => overview.value.attendance || {})
const tasks = computed(() => overview.value.tasks?.selected_date || [])
const todos = computed(() => overview.value.todos?.selected_date || [])
const notices = computed(() => overview.value.notices || [])
const quickActions = computed(() => overview.value.quick_actions || {})
const applications = computed(() => overview.value.applications || {})
const markers = computed(() => {
  const base = overview.value.calendar?.markers || {}
  // Overlay live todo counts from my-todo-dates
  const overlay = {}
  for (const td of myTodoDates.value) {
    const date = (td.date || td.attributes?.date || '').slice(0, 10)
    if (date) {
      overlay[date] = { todos: (overlay[date]?.todos || 0) + 1, tasks: base[date]?.tasks || 0 }
    }
  }
  return { ...base, ...overlay }
})
const workItems = computed(() => [
  ...todos.value.map((todo) => ({
    ...todo,
    key: `todo-${todo.id}`,
    source: 'todo',
    due: todo.time ? `Due: ${todo.time}` : `Due: ${selectedDate.value}`,
    priority: todo.status === 'COMPLETED' ? 'low' : 'medium',
  })),
  ...tasks.value.map((task) => ({
    ...task,
    key: `task-${task.id}`,
    source: 'task',
    due: `Due: ${task.deadline || task.started_at || task.assigned_at || selectedDate.value}`,
    priority: task.priority || 'normal',
  })),
].slice(0, 5))
const workItemCount = computed(() => todos.value.length + tasks.value.length)
// Merge overview applications with legacy userDashboard lists as fallback
const mergedApplications = computed(() => {
  const ov = applications.value
  const legacy = userDashboard.value?.lists || {}
  return {
    leave: (ov.leave?.length ? ov.leave : legacy.current_month_leave) || [],
    short_leave: (ov.short_leave?.length ? ov.short_leave : legacy.short_leave) || [],
    exchange: (ov.exchange?.length ? ov.exchange : legacy.exchange) || [],
    manual_attendance: (ov.manual_attendance?.length ? ov.manual_attendance : legacy.manual_attendance) || [],
  }
})

const applicationActions = computed(() => [
  {
    key: 'leave',
    title: 'Apply Leave',
    subtitle: 'Leave applications from this month',
    icon: 'far fa-file-alt',
    route: 'MyLeaveApplications',
    pending: quickActions.value.leave?.pending || 0,
    items: mergedApplications.value.leave.slice(0, 3),
    addRoute: 'LeaveApplicationAdd',
  },
  {
    key: 'short_leave',
    title: 'Short Leave',
    subtitle: 'Quick leave requests and approvals',
    icon: 'far fa-walking',
    route: 'MyShortLeaves',
    pending: quickActions.value.short_leave?.pending || 0,
    items: mergedApplications.value.short_leave.slice(0, 3),
    addRoute: 'ShortLeaveAdd',
  },
  {
    key: 'exchange',
    title: 'Exchange',
    subtitle: 'Shift and offday exchange requests',
    icon: 'fas fa-exchange-alt',
    route: 'MyShiftExchangeList',
    pending: quickActions.value.exchange?.pending || 0,
    items: mergedApplications.value.exchange.slice(0, 3),
    chips: [
      { label: 'Shift', route: 'MyShiftExchangeList' },
      { label: 'Offday', route: 'MyOffdayExchangeList' },
    ],
  },
  {
    key: 'manual_attendance',
    title: 'Manual Attendance',
    subtitle: 'Manual check-in and check-out requests',
    icon: 'far fa-user-check',
    route: 'MyManualAttendanceList',
    pending: quickActions.value.manual_attendance?.pending || 0,
    items: mergedApplications.value.manual_attendance.slice(0, 3),
    addRoute: 'ManualAttendanceAdd',
  },
])

function applicationItemLabel(action, item) {
  if (action.key === 'leave') {
    return item.resumption_date ? item.resumption_date.slice(0, 10) : item.created_at?.slice(0, 10) || '--'
  }
  if (action.key === 'short_leave') {
    return `${item.date?.slice(0, 10) || '--'} · ${item.type || ''}`
  }
  if (action.key === 'exchange') {
    return `${item.current_date?.slice(0, 10) || '--'} · ${item.exchange_type || ''}`
  }
  if (action.key === 'manual_attendance') {
    return `${item.check_in?.slice(0, 10) || '--'} · ${item.type || ''}`
  }
  return '--'
}

function statusBadgeClass(status) {
  if (status === 'Approved') return 'bg-emerald-50 text-emerald-700 border-emerald-200'
  if (status === 'Rejected') return 'bg-red-50 text-red-600 border-red-200'
  return 'bg-amber-50 text-amber-700 border-amber-200'
}

const selectedDateLabel = computed(() => formatLongDate(selectedDate.value))
const visibleMonthLabel = computed(() => formatMonthTitle(visibleMonth.value))
const greeting = computed(() => {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good Morning'
  if (hour < 17) return 'Good Afternoon'
  return 'Good Evening'
})

const departmentName = computed(() =>
  profile.value.department?.short_name || profile.value.department?.name || 'Department'
)

const taskTotal = computed(() => Number(hero.value.tasks_total || 0))
const taskCompleted = computed(() => Number(hero.value.tasks_completed || 0))
const attendanceRate = computed(() => Number(hero.value.attendance_rate || 0))
const leaveAvailable = computed(() => Number(hero.value.leave_available || 0))

const checkIn = computed(() => formatTime(attendance.value.today?.check_in))
const checkOut = computed(() => formatTime(attendance.value.today?.check_out))
const lastSevenDays = computed(() => attendance.value.last_7_days || [])

const leaveBalances = computed(() => flattenLeaveBalances(overview.value.leave_balance).slice(0, 4))
const unreadNotices = computed(() => notices.value.filter((notice) => !notice?.user_feedback).slice(0, 3))
const visibleNotices = computed(() => (unreadNotices.value.length ? unreadNotices.value : notices.value.slice(0, 3)))
const pendingNoticeModalKey = computed(() => {
  const ids = unreadNotices.value.map((notice) => notice.id).filter(Boolean).join(',')
  return ids ? `dashboard-pending-notices:${ids}` : ''
})

const calendarDays = computed(() => {
  const [year, month] = visibleMonth.value.split('-').map(Number)
  const first = new Date(year, month - 1, 1)
  const start = new Date(first)
  start.setDate(first.getDate() - first.getDay())

  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(start)
    day.setDate(start.getDate() + index)
    const date = formatDate(day)
    return {
      date,
      label: day.getDate(),
      currentMonth: day.getMonth() === month - 1,
      selected: date === selectedDate.value,
      today: date === formatDate(new Date()),
      marker: markers.value[date] || { tasks: 0, todos: 0 },
    }
  })
})

async function fetchOverview() {
  syncDashboardQuery()
  if (!authUser.value) {
    await authStore.fetchUser()
  }

  // Fetch todos for the month from dedicated endpoint
  fetchMyTodoDates()

  try {
    await userStore.fetchEmployeeDashboardOverview({
      date: selectedDate.value,
      month: visibleMonth.value,
    })
  } catch {
    // Fallback to legacy endpoint when employee-overview is unavailable
    try {
      await userStore.fetchUserDashboardData()
    } catch {
      // Both endpoints failed — UI will render from cached auth user data
    }
  }
}

async function handleTodoAdded() {
  showTodoForm.value = false
  await Promise.all([fetchOverview(), fetchMyTodoDates()])
}

async function toggleTodoComplete(todo) {
  if (todo.status === 'COMPLETED') return
  const nextStatus = todo.status === 'PENDING' ? 'WORKING' : 'COMPLETED'
  try {
    await apiClient.patch(`/my-todo-dates/${todo.id}/status`, { status: nextStatus })
    // Optimistically update local state
    const idx = myTodoDates.value.findIndex((t) => t.id === todo.id)
    if (idx !== -1) myTodoDates.value[idx] = { ...myTodoDates.value[idx], status: nextStatus }
  } catch {
    // silent — list will refresh on next fetch
  }
}

function selectCalendarDate(date) {
  selectedDate.value = date
  visibleMonth.value = date.slice(0, 7)
}

function changeMonth(delta) {
  const [year, month] = visibleMonth.value.split('-').map(Number)
  const next = new Date(year, month - 1 + delta, 1)
  const nextDate = formatDate(next)
  selectedDate.value = nextDate
  visibleMonth.value = nextDate.slice(0, 7)
}

function formatDate(date) {
  const d = new Date(date)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatMonth(date) {
  const d = new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function isValidDate(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
}

function isValidMonth(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}$/.test(value)
}

function storedUser() {
  try {
    return JSON.parse(localStorage.getItem('user') || 'null')
  } catch {
    return null
  }
}

function sumLeaveAvailable(raw) {
  return flattenLeaveBalances(raw).reduce((sum, item) => sum + Number(item.remaining_days || 0), 0)
}

function syncDashboardQuery() {
  if (route.query.date === selectedDate.value && route.query.month === visibleMonth.value) return
  router.replace({
    query: {
      ...route.query,
      date: selectedDate.value,
      month: visibleMonth.value,
    },
  })
}

function formatLongDate(value) {
  if (!value) return ''
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value))
}

function formatMonthTitle(value) {
  if (!value) return ''
  const [year, month] = value.split('-').map(Number)
  return new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(
    new Date(year, month - 1, 1),
  )
}

function formatTime(value) {
  if (!value) return '--'
  const [hour = '0', minute = '0'] = String(value).split(':')
  const date = new Date()
  date.setHours(Number(hour), Number(minute), 0, 0)
  return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(date)
}

function formatNoticeTime(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(date)
}

function openPendingNoticeModal() {
  if (!unreadNotices.value.length || !pendingNoticeModalKey.value) return
  if (sessionStorage.getItem(pendingNoticeModalKey.value)) return
  showPendingNoticeModal.value = true
}

function closePendingNoticeModal() {
  if (pendingNoticeModalKey.value) {
    sessionStorage.setItem(pendingNoticeModalKey.value, 'dismissed')
  }
  showPendingNoticeModal.value = false
}

function flattenLeaveBalances(raw) {
  if (Array.isArray(raw)) {
    if (raw.some((item) => Array.isArray(item?.balances || item?.items || item?.leave_balance))) {
      return raw.flatMap((item) => item?.balances || item?.items || item?.leave_balance || [])
    }
    return raw
  }
  if (raw && typeof raw === 'object') {
    return Object.values(raw).flatMap((value) => (Array.isArray(value) ? value : []))
  }
  return []
}

function statusShort(status) {
  const map = {
    present: 'P',
    leave: 'L',
    weekend: 'W',
    holiday: 'H',
    absent: '-',
  }
  return map[status] || '-'
}

function statusClass(status) {
  if (status === 'present') return 'bg-emerald-500 text-white'
  if (status === 'leave') return 'bg-amber-400 text-white'
  if (status === 'weekend') return 'bg-slate-200 text-slate-500'
  if (status === 'holiday') return 'bg-sky-100 text-sky-700'
  return 'bg-slate-100 text-slate-400'
}

function priorityClass(priority) {
  if (priority === 'high') return 'border-rose-200 bg-rose-50 text-rose-600'
  if (priority === 'medium') return 'border-amber-200 bg-amber-50 text-amber-700'
  return 'border-emerald-200 bg-emerald-50 text-emerald-600'
}

function priorityLabel(priority) {
  if (priority === 'high') return 'High'
  if (priority === 'medium') return 'Medium'
  return 'Low'
}

// Quick Actions collapse state — all collapsed by default
const expandedActions = ref({})
function toggleAction(key) {
  expandedActions.value = { ...expandedActions.value, [key]: !expandedActions.value[key] }
}

watch([selectedDate, visibleMonth], fetchOverview)
watch(visibleMonth, fetchMyTodoDates)
watch(unreadNotices, openPendingNoticeModal)

onMounted(fetchOverview)
</script>

<template>
  <div class="min-h-screen bg-slate-50 px-4 py-4 sm:px-6 lg:px-8">
    <section class="mx-auto max-w-[1440px] space-y-4">
      <!-- Hero Banner -->
      <div class="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div class="h-1 w-full bg-gradient-to-r from-blue-500 via-indigo-500 to-blue-600"></div>
        <div class="grid lg:grid-cols-[minmax(0,1fr)_auto]">
          <!-- Left: User Info -->
          <div class="px-7 py-5">
            <p class="text-[10px] font-bold uppercase tracking-[0.3em] text-blue-500">
              {{ greeting }}
            </p>
            <h1 class="mt-1 text-2xl font-bold text-slate-900">{{ profile.name || 'Employee' }}</h1>
            <div class="mt-1.5 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
              <i class="far fa-calendar text-blue-400"></i>
              <span>{{ selectedDateLabel }}</span>
              <span class="text-slate-300">·</span>
              <i class="far fa-building text-blue-400"></i>
              <span>{{ departmentName }}</span>
              <span class="text-slate-300">·</span>
              <span class="font-semibold text-blue-600">{{ profile.employee_id || '--' }}</span>
            </div>
            <div class="mt-3 flex flex-wrap items-center gap-2 text-[11px]">
              <span
                class="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 font-semibold text-emerald-700"
              >
                <span class="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500"></span>
                {{ profile.is_active ? 'Active' : 'Inactive' }}
              </span>
              <span class="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-slate-500">
                <i class="far fa-clock text-blue-400"></i>
                Shift: 9:00 AM – 5:00 PM
              </span>
            </div>
          </div>

          <!-- Right: Stats -->
          <div class="grid grid-cols-2 divide-x divide-slate-100 border-l border-slate-100">
            <div class="flex flex-col items-center justify-center gap-0.5 px-8 py-5">
              <div class="mb-1 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                <i class="fas fa-chart-line text-sm"></i>
              </div>
              <div class="text-2xl font-extrabold text-emerald-600">{{ attendanceRate }}<span class="text-base font-semibold">%</span></div>
              <p class="text-[10px] font-medium text-slate-400">Attendance</p>
              <p class="text-[10px] text-slate-400">This month</p>
            </div>
            <div class="flex flex-col items-center justify-center gap-0.5 px-8 py-5">
              <div class="mb-1 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                <i class="fas fa-tasks text-sm"></i>
              </div>
              <div class="text-2xl font-extrabold text-blue-600">{{ taskCompleted }}<span class="text-sm font-medium text-slate-400">/{{ taskTotal }}</span></div>
              <p class="text-[10px] font-medium text-slate-400">Tasks Done</p>
              <p class="text-[10px] text-slate-400">Current month</p>
            </div>
          </div>
        </div>
      </div>

      <div class="grid gap-4 xl:grid-cols-[340px_minmax(0,1fr)_340px]">
        <div class="space-y-4">
          <section class="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <header class="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <div class="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <i class="far fa-calendar-check text-blue-600"></i>
                Attendance
              </div>
              <span class="rounded border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700">
                {{ attendanceRate }}% This Month
              </span>
            </header>

            <div class="space-y-4 p-4">
              <div class="grid grid-cols-2 gap-3">
                <div class="rounded-md border border-emerald-200 bg-emerald-50 p-4">
                  <p class="text-[11px] font-semibold uppercase text-emerald-700">Check In</p>
                  <div class="mt-2 text-2xl font-bold text-emerald-700">{{ checkIn }}</div>
                  <p class="mt-1 text-xs text-emerald-700/70">{{ attendance.today?.status || 'Pending' }}</p>
                </div>
                <div class="rounded-md border border-slate-200 bg-slate-50 p-4">
                  <p class="text-[11px] font-semibold uppercase text-slate-500">Check Out</p>
                  <div class="mt-2 text-2xl font-bold text-slate-400">{{ checkOut }}</div>
                  <p class="mt-1 text-xs text-slate-500">{{ checkOut === '--' ? 'Pending' : 'Done' }}</p>
                </div>
              </div>

              <div>
                <p class="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Last 7 Days</p>
                <div v-if="lastSevenDays.length" class="grid grid-cols-7 gap-1.5">
                  <div v-for="day in lastSevenDays" :key="day.date" class="text-center">
                    <p class="mb-1 text-[10px] font-semibold uppercase text-slate-500">
                      {{ day.day?.slice(0, 1) }}
                    </p>
                    <div
                      class="flex h-9 items-center justify-center rounded text-xs font-bold"
                      :class="statusClass(day.status)"
                    >
                      {{ statusShort(day.status) }}
                    </div>
                    <p class="mt-1 text-[10px] text-slate-400">{{ day.date?.slice(-2) }}</p>
                  </div>
                </div>
                <div v-else class="rounded-md border border-slate-100 bg-slate-50 px-3 py-4 text-center text-xs text-slate-500">
                  Attendance data unavailable. Device may not be linked.
                </div>
              </div>
            </div>
          </section>

          <section class="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <header class="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <div class="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <i class="far fa-umbrella-beach text-blue-600"></i>
                Leave Balance
              </div>
              <RouterLink :to="{ name: 'MyLeaveApplications' }" class="text-xs font-semibold text-blue-600">
                Apply
              </RouterLink>
            </header>
            <div v-if="leaveBalances.length" class="grid grid-cols-2 gap-4 p-4">
              <div v-for="leave in leaveBalances" :key="leave.id || leave.name" class="min-w-0">
                <div class="flex items-center justify-between text-xs">
                  <span class="font-semibold text-slate-900">{{ leave.name || leave.leave_type }}</span>
                  <span class="text-slate-400">{{ leave.remaining_days }}/{{ leave.annual_quota }}</span>
                </div>
                <div class="mt-2 h-1.5 rounded-full bg-slate-100">
                  <div
                    class="h-1.5 rounded-full bg-blue-500"
                    :style="{ width: `${Math.min(100, ((leave.remaining_days || 0) / Math.max(1, leave.annual_quota || 1)) * 100)}%` }"
                  ></div>
                </div>
                <p class="mt-1 truncate text-[11px] text-slate-500">{{ leave.used_days || 0 }} used</p>
              </div>
            </div>
            <div v-else class="px-4 py-8 text-center text-sm text-slate-500">
              No leave balance configured.
            </div>
          </section>
        </div>

        <div class="space-y-4">
          <section class="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <header class="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <div class="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <i class="far fa-check-square text-blue-600"></i>
                My Todos
                <span class="rounded bg-blue-600 px-2 py-0.5 text-xs text-white">{{ myTodoCount }}</span>
              </div>
              <div class="flex items-center gap-3">
                <RouterLink
                  :to="{ name: 'MyWork', query: { tab: 'todos' } }"
                  class="text-xs font-semibold text-blue-600"
                >
                  View All
                </RouterLink>
                <button
                  type="button"
                  class="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700"
                  @click="showTodoForm = true"
                >
                  <i class="fas fa-plus text-[10px]"></i>
                  Add
                </button>
              </div>
            </header>

            <div v-if="todosLoading" class="px-4 py-6 text-center text-sm text-slate-400">
              <i class="fas fa-circle-notch fa-spin mr-2"></i>Loading...
            </div>
            <div v-else-if="todosForSelectedDate.length" class="divide-y divide-slate-100">
              <article
                v-for="todo in todosForSelectedDate.slice(0, 6)"
                :key="todo.id"
                class="flex items-center gap-3 px-4 py-3 hover:bg-slate-50"
              >
                <button
                  type="button"
                  :disabled="todo.status === 'COMPLETED'"
                  class="mt-0.5 inline-flex h-5 w-5 flex-none items-center justify-center rounded border transition"
                  :class="todo.status === 'COMPLETED'
                    ? 'border-emerald-400 bg-emerald-50 cursor-default'
                    : 'border-slate-300 hover:border-blue-400 hover:bg-blue-50 cursor-pointer'"
                  :title="todo.status === 'COMPLETED' ? 'Completed' : todo.status === 'WORKING' ? 'Click to complete' : 'Click to start'"
                  @click.prevent="toggleTodoComplete(todo)"
                >
                  <i
                    v-if="todo.status === 'COMPLETED'"
                    class="fas fa-check text-[8px] text-emerald-600"
                  ></i>
                  <i
                    v-else-if="todo.status === 'WORKING'"
                    class="fas fa-play text-[7px] text-amber-500"
                  ></i>
                </button>
                <div class="min-w-0 flex-1">
                  <p
                    class="truncate text-sm font-medium"
                    :class="todo.status === 'COMPLETED' ? 'text-slate-400 line-through' : 'text-slate-900'"
                  >
                    {{ todo.title || todo.attributes?.title || 'Untitled' }}
                  </p>
                  <p class="mt-0.5 text-[11px] text-slate-500">
                    {{ (todo.date || todo.attributes?.date || '').slice(0, 10) }}
                  </p>
                </div>
                <button
                  type="button"
                  :disabled="todo.status === 'COMPLETED'"
                  class="rounded border px-2 py-1 text-[11px] transition"
                  :class="todo.status === 'COMPLETED'
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-600 cursor-default'
                    : todo.status === 'WORKING'
                      ? 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 cursor-pointer'
                      : 'border-slate-200 bg-slate-50 text-slate-500 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600 cursor-pointer'"
                  @click.prevent="toggleTodoComplete(todo)"
                >
                  {{ todo.status === 'COMPLETED' ? 'Done' : todo.status === 'WORKING' ? 'Working →' : 'Pending →' }}
                </button>
              </article>
            </div>
            <div v-else class="px-4 py-8 text-center text-sm text-slate-500">
              No todos for {{ selectedDateLabel }}.
            </div>
          </section>

          <section class="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <header class="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <div class="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <i class="far fa-bullhorn text-blue-600"></i>
                Notices
              </div>
              <RouterLink :to="{ name: 'NoticeView' }" class="text-xs font-semibold text-blue-600">
                View All
              </RouterLink>
            </header>
            <div v-if="visibleNotices.length" class="divide-y divide-slate-100">
              <article v-for="notice in visibleNotices" :key="notice.id" class="flex gap-3 px-4 py-3">
                <span class="inline-flex h-8 w-8 flex-none items-center justify-center rounded bg-blue-50 text-blue-600">
                  <i class="far fa-bell"></i>
                </span>
                <div class="min-w-0">
                  <RouterLink
                    :to="notice.type === 1 ? `/notice-details/${notice.id}` : `/policy-details/${notice.id}`"
                    class="block truncate text-sm font-medium text-slate-900 hover:text-blue-700"
                  >
                    {{ notice.title || 'Untitled notice' }}
                  </RouterLink>
                  <p class="mt-1 text-[11px] text-slate-500">{{ formatNoticeTime(notice.published_at) }}</p>
                </div>
              </article>
            </div>
            <div v-else class="px-4 py-8 text-center text-sm text-slate-500">No pending notice found</div>
          </section>
        </div>

        <div class="space-y-4">
          <section class="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <header class="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <div class="text-sm font-semibold uppercase text-slate-900">{{ visibleMonthLabel }}</div>
              <div class="flex items-center gap-1">
                <button class="inline-flex h-7 w-7 items-center justify-center rounded hover:bg-slate-100" @click="changeMonth(-1)">
                  <i class="fas fa-chevron-left text-xs text-slate-500"></i>
                </button>
                <button class="inline-flex h-7 w-7 items-center justify-center rounded hover:bg-slate-100" @click="changeMonth(1)">
                  <i class="fas fa-chevron-right text-xs text-slate-500"></i>
                </button>
              </div>
            </header>

            <div class="p-4">
              <div class="grid grid-cols-7 gap-1 text-center text-[10px] font-semibold text-slate-500">
                <span>Su</span><span>Mo</span><span>Tu</span><span>We</span><span>Th</span><span>Fr</span><span>Sa</span>
              </div>
              <div class="mt-2 grid grid-cols-7 gap-1">
                <button
                  v-for="day in calendarDays"
                  :key="day.date"
                  class="relative flex h-9 items-center justify-center rounded text-xs font-semibold transition hover:bg-blue-50"
                  :class="[
                    day.currentMonth ? 'text-slate-900' : 'text-slate-300',
                    day.selected ? 'bg-blue-600 text-white hover:bg-blue-600' : '',
                    day.today && !day.selected ? 'ring-1 ring-blue-200' : '',
                  ]"
                  @click="selectCalendarDate(day.date)"
                >
                  {{ day.label }}
                  <span
                    v-if="day.marker.tasks || day.marker.todos"
                    class="absolute bottom-1 h-1 w-1 rounded-full"
                    :class="day.selected ? 'bg-white' : 'bg-blue-500'"
                  ></span>
                </button>
              </div>
            </div>
          </section>

          <section class="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <header class="border-b border-slate-200 px-4 py-3">
              <p class="text-sm font-semibold text-slate-900">Quick Actions</p>
              <p class="mt-0.5 text-[11px] text-slate-400">Click an item to expand details</p>
            </header>
            <div class="divide-y divide-slate-100">
              <div v-for="action in applicationActions" :key="action.key">
                <!-- Collapsible header row -->
                <button
                  type="button"
                  class="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-slate-50"
                  @click="toggleAction(action.key)"
                >
                  <span class="inline-flex h-8 w-8 flex-none items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                    <i :class="action.icon" class="text-sm"></i>
                  </span>
                  <div class="min-w-0 flex-1">
                    <p class="text-sm font-semibold text-slate-800">{{ action.title }}</p>
                    <p class="truncate text-[10px] text-slate-400">{{ action.subtitle }}</p>
                  </div>
                  <span
                    v-if="action.pending"
                    class="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700"
                  >{{ action.pending }}</span>
                  <span v-else class="rounded-full border border-slate-100 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-400">
                    {{ action.items.length }}
                  </span>
                  <i
                    class="fas fa-chevron-down text-[10px] text-slate-400 transition-transform duration-200"
                    :class="expandedActions[action.key] ? 'rotate-180' : ''"
                  ></i>
                </button>

                <!-- Expanded items -->
                <div v-if="expandedActions[action.key]" class="border-t border-slate-100 bg-slate-50/60 px-4 pb-3 pt-2">
                  <div class="mb-2 flex items-center justify-between">
                    <span class="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Recent Records</span>
                    <RouterLink :to="{ name: action.route }" class="text-[11px] font-semibold text-blue-600 hover:underline">
                      See all →
                    </RouterLink>
                  </div>
                  <div v-if="action.items && action.items.length" class="space-y-1.5">
                    <div
                      v-for="item in action.items"
                      :key="item.id"
                      class="flex items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-[11px]"
                    >
                      <span class="font-medium text-slate-700">{{ applicationItemLabel(action, item) }}</span>
                      <span
                        class="rounded border px-2 py-0.5 font-semibold"
                        :class="statusBadgeClass(item.status)"
                      >{{ item.status || 'Pending' }}</span>
                    </div>
                  </div>
                  <p v-else class="py-2 text-center text-[11px] text-slate-400">No recent records</p>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </section>

    <OverlyModal v-if="showTodoForm" @close="showTodoForm = false">
      <TodoAddForm
        :date="selectedDate"
        userRole="employee"
        @update="handleTodoAdded"
        @cancelClick="showTodoForm = false"
      />
    </OverlyModal>

    <OverlyModal
      v-if="showPendingNoticeModal"
      :close-on-backdrop="false"
      @close="closePendingNoticeModal"
    >
      <div class="overflow-hidden rounded-2xl bg-white">
        <header class="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div>
            <p class="text-[11px] font-bold uppercase tracking-[0.22em] text-blue-600">Pending Notices</p>
            <h2 class="mt-1 text-lg font-semibold text-slate-900">Please review your unread notices</h2>
          </div>
          <button
            type="button"
            class="inline-flex h-8 w-8 flex-none items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close pending notices"
            @click="closePendingNoticeModal"
          >
            <i class="far fa-times"></i>
          </button>
        </header>

        <div class="max-h-[60vh] divide-y divide-slate-100 overflow-y-auto">
          <article v-for="notice in unreadNotices" :key="notice.id" class="flex gap-3 px-5 py-4">
            <span class="inline-flex h-10 w-10 flex-none items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <i class="far fa-bell"></i>
            </span>
            <div class="min-w-0 flex-1">
              <RouterLink
                :to="notice.type === 1 ? `/notice-details/${notice.id}` : `/policy-details/${notice.id}`"
                class="block text-sm font-semibold text-slate-900 hover:text-blue-700"
                @click="closePendingNoticeModal"
              >
                {{ notice.title || 'Untitled notice' }}
              </RouterLink>
              <p class="mt-1 text-[11px] text-slate-500">{{ formatNoticeTime(notice.published_at) }}</p>
            </div>
          </article>
        </div>

        <footer class="flex flex-wrap items-center justify-end gap-2 border-t border-slate-200 px-5 py-4">
          <button
            type="button"
            class="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
            @click="closePendingNoticeModal"
          >
            Later
          </button>
          <RouterLink
            :to="{ name: 'NoticeView' }"
            class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
            @click="closePendingNoticeModal"
          >
            View All
          </RouterLink>
        </footer>
      </div>
    </OverlyModal>
  </div>
</template>
