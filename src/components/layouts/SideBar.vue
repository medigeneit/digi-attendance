<script setup>
import { useAuthStore } from '@/stores/auth'
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const props = defineProps({
  user: Object,
})

const open = ref(true)
const expandedMenuKey = ref(null)

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const currentPath = computed(() => route.path)
const currentName = computed(() => route.name)

const isAdmin = computed(() => ['admin', 'super_admin', 'developer'].includes(props.user?.role))

const isSuperAdminOrDev = computed(() => ['super_admin', 'developer'].includes(props.user?.role))

const logout = () => {
  authStore.logout()
  router.push('/login')
}

const toggleSubmenu = (key) => {
  expandedMenuKey.value = expandedMenuKey.value === key ? null : key
}

const isSubmenuOpen = (key) => expandedMenuKey.value === key
const searchQuery = ref('')
const normalizedQuery = computed(() => searchQuery.value.trim().toLowerCase())
const isSearching = computed(() => !!normalizedQuery.value)

const matchesQuery = (label) => {
  if (!normalizedQuery.value) return true
  return label.toLowerCase().includes(normalizedQuery.value)
}

// --------- MENU DEFINITIONS ----------

// Core (visible for everyone)
const coreMenu = [
  { label: 'Dashboard', to: { path: '/dashboard' }, icon: 'fad fa-table' },
  { label: 'Task List', to: { path: '/my-requirement-tasks' }, icon: 'fad fa-tasks' },
  { label: 'Profile', to: { path: '/profile' }, icon: 'fad fa-user' },
  { label: 'Notifications', to: { path: '/notifications' }, icon: 'fad fa-bells' },
  { label: 'Notices', to: { path: '/notices' }, icon: 'fad fa-exclamation-triangle' },
  { label: 'Attendance', to: { path: '/attendance' }, icon: 'fad fa-list' },
  { label: 'Applications', to: { path: '/applications' }, icon: 'fad fa-list-alt' },
]

// Admin entry points
const adminMenu = [
  { label: 'Requirement', to: { path: '/requirements' }, icon: 'fad fa-tasks' },
  { label: 'Task Management', to: { path: '/requirement-tasks' }, icon: 'fad fa-tasks' },
]

// Reports
const reportsMenu = [
  { label: 'Daily Attendance', routeName: 'TodayAttendanceReport' },
  { label: 'Daily Late ', routeName: 'DailyLateAttendanceReport' },
  { label: 'Monthly Late ', routeName: 'LateAttendanceReport' },
  { label: 'Monthly  Summary', routeName: 'AttendanceSummaryReport' },
  { label: 'Date Range Attendance ', routeName: 'DateWiseAttendanceSummaryReport' },
  { label: 'Overtime ', routeName: 'OvertimeReport' },
  { label: 'Monthly Application', routeName: 'MonthWiseApplicationReport' },
  { label: 'Todo Report', routeName: 'TodoReport' },
  { label: 'Personal Activity Report (PAR)', routeName: 'PersonalActivityReport' },
  { label: 'Yearly Delay Early Summary', routeName: 'YearlyDealyEarlyAttendanceSummary' },
  { label: 'Yearly Attendance Summary', routeName: 'YearlyAttendanceSummary' },
]
const reportRouteNames = reportsMenu.map((i) => i.routeName)

// KPI
const kpiMenu = [
  { label: 'Monthly KPI Forms', routeName: 'MonthlyKpiFormList' },
  { label: 'Monthly Evaluation List', routeName: 'EvaluationList' },
  { label: 'Monthly KPI Reports', routeName: 'MonthlyKpiReportList' },
  { label: 'Yearly Evaluation', routeName: 'YearlyEvaluationList' },
  { label: 'Department KPI Reports', routeName: 'YearlyDepartmentalKpiReportList' },
  { label: 'Yearly KPI Reports', routeName: 'YearlyKpiReport' },
]
const kpiRouteNames = kpiMenu.map((i) => i.routeName)

// HRD
const hrdMenu = [
  { label: 'Job Card', routeName: 'EmployeeAttendance' },
  { label: 'Attendance Log', routeName: 'EmployeeAttendanceLog' },
  { label: 'Monthly Application Log', routeName: 'MonthWiseApplicationLog' },
  { label: 'Annual Leave History', routeName: 'HrdAdminLeaveApplication' },
  { label: 'Leave Applications', routeName: 'LeaveApplicationList' },
  { label: 'Short Leaves', routeName: 'ShortLeaveList' },
  { label: 'Shift Exchanges', routeName: 'ShiftExchangeList' },
  { label: 'Offday Exchanges', routeName: 'OffdayExchangeList' },
  { label: 'Manual Attendance', routeName: 'ManualAttendanceList' },
  { label: 'Bulk Manual Attendance', routeName: 'HrdAdminManualAttendanceApplication' },
  { label: 'Overtime', routeName: 'OvertimeList' },
  { label: 'PayCut', routeName: 'PayCutList' },
  { label: 'Notice', routeName: 'NoticeList' },
  { label: 'Shift Schedules', routeName: 'ShiftSchedule' },
  { label: 'User Clearances', routeName: 'UserClearance' },
]
const hrdRouteNames = hrdMenu.map((i) => i.routeName)

// EmpManage
const empManageMenu = [
  {
    label: 'Joining Checklist',
    to: { name: 'checklists.board', query: { type: 'joining' } },
    key: 'joining',
  },
  {
    label: 'Exit Checklist',
    to: { name: 'checklists.board', query: { type: 'exit' } },
    key: 'exit',
  },
]
const empRouteNames = ['checklists.board']

// Settings
const settingsMenu = [
  { label: 'User List', routeName: 'UserList' },
  { label: 'Holiday List', routeName: 'HoliDayList' },
  { label: 'Leave Approval List', routeName: 'LeaveApprovalList' },
  { label: 'Other Approval List', routeName: 'OtherApprovalList' },
  { label: 'Leave Type List', routeName: 'LeaveTypeList' },
  { label: 'Shift List', routeName: 'ShiftList' },
  { label: 'Designation List', routeName: 'DesignationList' },
  { label: 'Department List', routeName: 'DepartmentList' },
  { label: 'Company List', routeName: 'CompanyList' },
  { label: 'Device List', routeName: 'DeviceList' },
  { label: 'ZK User Management', routeName: 'ZKUsers' },
  { label: 'Permission List', routeName: 'PermissionList' },
  { label: 'Monthly KPI Criteria', routeName: 'KpiMonthlyList' },
  { label: 'KPI Forms', routeName: 'KpiCycles' },
  { label: 'KPI Permissions', routeName: 'LaneOverrides' },
  { label: 'Joining Template Items', routeName: 'TemplateItems', params: { id: 1 } },
  { label: 'Exit Template Items', routeName: 'TemplateItems', params: { id: 2 } },
]
const settingsRouteNames = settingsMenu.map((i) => i.routeName)

// Careers
const careerMenu = [
  { label: 'Job Circulars', routeName: 'AdminCareersJobs' },
  { label: 'Applications', routeName: 'AdminCareersApplications' },
]
const careerRouteNames = careerMenu.map((i) => i.routeName)

const filteredReportsMenu = computed(() =>
  normalizedQuery.value ? reportsMenu.filter((i) => matchesQuery(i.label)) : reportsMenu,
)
const filteredKpiMenu = computed(() =>
  normalizedQuery.value ? kpiMenu.filter((i) => matchesQuery(i.label)) : kpiMenu,
)
const filteredHrdMenu = computed(() =>
  normalizedQuery.value ? hrdMenu.filter((i) => matchesQuery(i.label)) : hrdMenu,
)
const filteredEmpManageMenu = computed(() =>
  normalizedQuery.value ? empManageMenu.filter((i) => matchesQuery(i.label)) : empManageMenu,
)
const filteredSettingsMenu = computed(() =>
  normalizedQuery.value ? settingsMenu.filter((i) => matchesQuery(i.label)) : settingsMenu,
)
const filteredCareerMenu = computed(() =>
  normalizedQuery.value ? careerMenu.filter((i) => matchesQuery(i.label)) : careerMenu,
)

const submenuOpen = (key, filteredList) =>
  normalizedQuery.value ? filteredList.length > 0 : isSubmenuOpen(key)

const hasSearchHit = computed(() => {
  if (!normalizedQuery.value) return true

  const coreHits = coreMenu.some((i) => matchesQuery(i.label))
  const adminTopHits = adminMenu.some((i) => matchesQuery(i.label))

  const anySubmenuHit =
    filteredReportsMenu.value.length ||
    filteredKpiMenu.value.length ||
    filteredHrdMenu.value.length ||
    filteredEmpManageMenu.value.length ||
    filteredSettingsMenu.value.length ||
    filteredCareerMenu.value.length

  return coreHits || (isAdmin.value && authStore.isAdminMood && (adminTopHits || anySubmenuHit))
})

// ----- helpers for group active -----
const groupActive = (names, basePath = null) => {
  if (names.includes(currentName.value)) return true
  if (basePath && currentPath.value.startsWith(basePath)) return true
  return false
}

// open correct submenu based on current route initially
onMounted(() => {
  if (groupActive(reportRouteNames, '/reports')) expandedMenuKey.value = 'reports'
  else if (groupActive(kpiRouteNames, '/kpi')) expandedMenuKey.value = 'kpi'
  else if (groupActive(hrdRouteNames, '/hrd')) expandedMenuKey.value = 'hrd'
  else if (groupActive(empRouteNames, '/employee-management')) expandedMenuKey.value = 'emp'
  else if (groupActive(settingsRouteNames, '/settings')) expandedMenuKey.value = 'settings'
  else if (groupActive(careerRouteNames, '/admin/careers')) expandedMenuKey.value = 'careers'
})

// close submenus when sidebar collapsed
watch(open, (val) => {
  if (!val) expandedMenuKey.value = null
})

watch(
  () => route.fullPath,
  () => {
    searchQuery.value = ''
  },
)
</script>

<template>
  <aside
    class="bg-white sidebar h-screen z-[500000] flex flex-col transition-all duration-300 shadow"
    :class="{ 'w-[240px]': open, 'w-[70px]': !open }"
  >
    <!-- Header Section (Switcher + Search) -->
    <div class="flex flex-col border-b bg-white">
      <!-- Admin Mode + Toggle Menu Row -->
      <div class="flex items-center justify-between gap-2 py-5" :class="[open ? 'px-4' : 'px-1']">
        <!-- Admin Toggle -->
        <div v-if="isAdmin" class="flex items-center gap-2">
          <span v-if="open" class="text-sm font-medium text-gray-600">Admin Mode</span>
          <label class="inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              class="sr-only"
              :checked="authStore.isAdminMood"
              @change="authStore.toggleAdminMode"
            />
            <div
              class="w-8 md:w-11 h-5 md:h-6 bg-gray-200 rounded-full shadow-inner relative transition duration-200"
              :class="{ '!bg-blue-600': authStore.isAdminMood }"
            >
              <div
                class="dot absolute left-1 top-1 bg-white size-3 md:size-4 rounded-full transition"
                :class="{ 'translate-x-3 md:translate-x-5': authStore.isAdminMood }"
              ></div>
            </div>
          </label>
        </div>

        <!-- Menu Toggle Button -->
        <button
          @click="open = !open"
          class="text-gray-500 hover:text-blue-600 transition flex justify-center items-center"
          :title="open ? 'Minimize Menu' : 'Expand Menu'"
        >
          <i :class="['fas', 'fa-chevron-left', 'text-lg', { 'rotate-180': !open }]"></i>
        </button>
      </div>

      <div v-if="open" class="px-3 pb-4">
        <div class="relative">
          <i class="far fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"></i>
          <input
            v-model="searchQuery"
            type="search"
            class="w-full rounded-lg border border-slate-200 bg-slate-50 px-9 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
            placeholder="Search menu..."
          />
          <button
            v-if="searchQuery"
            class="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            @click="searchQuery = ''"
          >
            <i class="far fa-times"></i>
          </button>
        </div>
      </div>
    </div>

    <!-- Scrollable Menu Content -->
    <div class="flex-1 overflow-y-auto scrollbar overflow-x-hidden py-4 space-y-1">
      <!-- Menus (filtered when searching) -->
      <div v-if="isSearching && !hasSearchHit" class="px-3 py-2 text-sm text-slate-500">
        No matches found.
      </div>

      <RouterLink
        v-if="matchesQuery('Dashboard')"
        to="/dashboard"
        class="side-menu"
        :class="{
          'side-menu-active': currentPath.includes('/dashboard'),
          'flex justify-center': !open,
        }"
      >
        <i class="fad fa-table py-2 border-red-500"></i>
        <h4 v-if="open">Dashboard</h4>
      </RouterLink>

      <template v-if="!authStore.isAdminMood || !isAdmin">
        <RouterLink
          v-if="matchesQuery('Task List')"
          :to="`/my-requirement-tasks`"
          class="side-menu"
          :class="{
            'flex justify-center': !open,
            'side-menu-active': currentPath.includes('/my-requirement-tasks'),
          }"
        >
          <i class="fad fa-tasks py-2"></i>
          <h4 v-if="open">Task List</h4>
        </RouterLink>

        <RouterLink
          v-if="matchesQuery('Profile')"
          to="/profile"
          class="side-menu"
          :class="{
            'flex justify-center': !open,
            'side-menu-active': currentPath.includes('/profile'),
          }"
        >
          <i class="fad fa-user py-2"></i>
          <h4 v-if="open">Profile</h4>
        </RouterLink>

        <RouterLink
          v-if="matchesQuery('Notifications')"
          to="/notifications"
          class="side-menu"
          :class="{
            'flex justify-center': !open,
            'side-menu-active': currentPath.includes('/notifications'),
          }"
        >
          <i class="fad fa-bells py-2"></i>
          <h4 v-if="open">Notifications</h4>
        </RouterLink>

        <RouterLink
          v-if="matchesQuery('Notices')"
          to="/notices"
          class="side-menu"
          :class="{
            'flex justify-center': !open,
            'side-menu-active': currentPath.includes('/notices'),
          }"
        >
          <i class="fad fa-exclamation-triangle py-2"></i>
          <h4 v-if="open">Notices</h4>
        </RouterLink>

        <RouterLink
          v-if="matchesQuery('Attendance')"
          to="/attendance"
          class="side-menu"
          :class="{
            'flex justify-center': !open,
            'side-menu-active': currentPath.includes('/attendance'),
          }"
        >
          <i class="fad fa-list py-2"></i>
          <h4 v-if="open">Attendance</h4>
        </RouterLink>

        <RouterLink
          v-if="matchesQuery('Applications')"
          to="/applications"
          class="side-menu"
          :class="{
            'flex justify-center': !open,
            'side-menu-active': currentPath.includes('/applications'),
          }"
        >
          <i class="fad fa-list-alt py-2"></i>
          <h4 v-if="open">Applications</h4>
        </RouterLink>
      </template>

      <!-- Admin Menus -->
      <template v-if="isAdmin && authStore.isAdminMood">
        <RouterLink
          v-if="matchesQuery('Requirement')"
          to="/requirements"
          class="side-menu"
          :class="{
            'flex justify-center': !open,
            'side-menu-active': currentPath.startsWith('/requirements'),
          }"
        >
          <i class="fad fa-tasks py-2"></i>
          <h4 v-if="open">Requirement</h4>
        </RouterLink>

        <RouterLink
          v-if="matchesQuery('Task Management')"
          to="/requirement-tasks"
          class="side-menu"
          :class="{
            'flex justify-center': !open,
            'side-menu-active': currentPath.startsWith('/requirement-tasks'),
          }"
        >
          <i class="fad fa-tasks py-2"></i>
          <h4 v-if="open">Task Management</h4>
        </RouterLink>

        <template v-if="!isSearching || filteredReportsMenu.length">
          <RouterLink to="/reports" custom v-slot="{ navigate }">
            <div
              class="side-menu"
              :class="{
                'flex justify-center': !open,
                'side-menu-active': groupActive(reportRouteNames, '/reports'),
              }"
              @click="navigate"
            >
              <div class="flex items-center justify-between w-full">
                <div class="flex items-center gap-2">
                  <i class="fas fa-file-chart-line py-2"></i>
                  <h4 v-if="open">Reports</h4>
                </div>
                <button
                  v-if="open"
                  class="p-1 rounded hover:bg-gray-100 hover:text-black"
                  @click.stop="toggleSubmenu('reports')"
                  :aria-expanded="submenuOpen('reports', filteredReportsMenu)"
                >
                  <i
                    class="fas text-xs"
                    :class="
                      submenuOpen('reports', filteredReportsMenu)
                        ? 'fa-chevron-up'
                        : 'fa-chevron-down'
                    "
                  ></i>
                </button>
              </div>
            </div>
          </RouterLink>

          <transition name="submenu">
            <nav
              v-if="open && submenuOpen('reports', filteredReportsMenu)"
              class="submenu-accordion relative mt-2 ml-3 space-y-1 rounded-xl bg-slate-50/70 px-2 py-2 shadow-sm"
            >
              <span
                aria-hidden="true"
                class="absolute left-3 top-2 bottom-2 w-px bg-slate-200"
              ></span>
              <RouterLink
                v-for="item in filteredReportsMenu"
                :key="item.routeName"
                :to="{ name: item.routeName }"
                class="group relative flex items-center gap-2 rounded-lg py-2 pl-7 pr-3 text-[13px] text-slate-600 transition duration-200 ease-out hover:bg-slate-100 hover:text-slate-900 hover:translate-x-0.5"
                :class="{
                  'bg-blue-50/80 text-blue-700 font-semibold shadow-sm':
                    currentName === item.routeName,
                }"
              >
                <span
                  class="absolute left-3 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-slate-300 transition group-hover:bg-blue-400"
                  :class="currentName === item.routeName ? 'bg-blue-500' : ''"
                ></span>
                <span class="flex-1">{{ item.label }}</span>
                <span
                  class="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-full bg-blue-600 opacity-0 transition"
                  :class="currentName === item.routeName ? 'opacity-100' : 'group-hover:opacity-60'"
                ></span>
              </RouterLink>
            </nav>
          </transition>
        </template>

        <template v-if="!isSearching || filteredKpiMenu.length">
          <RouterLink to="/kpi" custom v-slot="{ navigate }">
            <div
              class="side-menu"
              :class="{
                'flex justify-center': !open,
                'side-menu-active': groupActive(kpiRouteNames, '/kpi'),
              }"
              @click="navigate"
            >
              <div class="flex items-center justify-between w-full">
                <div class="flex items-center gap-2">
                  <i class="fas fa-file-chart-line py-2"></i>
                  <h4 v-if="open">KPI</h4>
                </div>
                <button
                  v-if="open"
                  class="p-1 rounded hover:bg-gray-100 hover:text-black"
                  @click.stop="toggleSubmenu('kpi')"
                  :aria-expanded="submenuOpen('kpi', filteredKpiMenu)"
                >
                  <i
                    class="fas text-xs"
                    :class="
                      submenuOpen('kpi', filteredKpiMenu) ? 'fa-chevron-up' : 'fa-chevron-down'
                    "
                  ></i>
                </button>
              </div>
            </div>
          </RouterLink>

          <transition name="submenu">
            <nav
              v-if="open && submenuOpen('kpi', filteredKpiMenu)"
              class="submenu-accordion relative mt-2 ml-3 space-y-1 rounded-xl bg-slate-50/70 px-2 py-2 shadow-sm"
            >
              <span
                aria-hidden="true"
                class="absolute left-3 top-2 bottom-2 w-px bg-slate-200"
              ></span>
              <RouterLink
                v-for="item in filteredKpiMenu"
                :key="item.routeName"
                :to="{ name: item.routeName }"
                class="group relative flex items-center gap-2 rounded-lg py-2 pl-7 pr-3 text-[13px] text-slate-600 transition duration-200 ease-out hover:bg-slate-100 hover:text-slate-900 hover:translate-x-0.5"
                :class="{
                  'bg-blue-50/80 text-blue-700 font-semibold shadow-sm':
                    currentName === item.routeName,
                }"
              >
                <span
                  class="absolute left-3 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-slate-300 transition group-hover:bg-blue-400"
                  :class="currentName === item.routeName ? 'bg-blue-500' : ''"
                ></span>
                <span class="flex-1">{{ item.label }}</span>
                <span
                  class="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-full bg-blue-600 opacity-0 transition"
                  :class="currentName === item.routeName ? 'opacity-100' : 'group-hover:opacity-60'"
                ></span>
              </RouterLink>
            </nav>
          </transition>
        </template>

        <template v-if="!isSearching || filteredHrdMenu.length">
          <RouterLink to="/hrd" custom v-slot="{ navigate }">
            <div
              class="side-menu"
              :class="{
                'flex justify-center': !open,
                'side-menu-active': groupActive(hrdRouteNames, '/hrd'),
              }"
              @click="navigate"
            >
              <div class="flex items-center justify-between w-full">
                <div class="flex items-center gap-2">
                  <i class="fas fa-users-cog py-2"></i>
                  <h4 v-if="open">HR Department</h4>
                </div>
                <button
                  v-if="open"
                  class="p-1 rounded hover:bg-gray-100 hover:text-black"
                  @click.stop="toggleSubmenu('hrd')"
                  :aria-expanded="submenuOpen('hrd', filteredHrdMenu)"
                >
                  <i
                    class="fas text-xs"
                    :class="
                      submenuOpen('hrd', filteredHrdMenu) ? 'fa-chevron-up' : 'fa-chevron-down'
                    "
                  ></i>
                </button>
              </div>
            </div>
          </RouterLink>

          <transition name="submenu">
            <nav
              v-if="open && submenuOpen('hrd', filteredHrdMenu)"
              class="submenu-accordion relative mt-2 ml-3 space-y-1 rounded-xl bg-slate-50/70 px-2 py-2 shadow-sm"
            >
              <span
                aria-hidden="true"
                class="absolute left-3 top-2 bottom-2 w-px bg-slate-200"
              ></span>
              <RouterLink
                v-for="item in filteredHrdMenu"
                :key="item.routeName"
                :to="{ name: item.routeName }"
                class="group relative flex items-center gap-2 rounded-lg py-2 pl-7 pr-3 text-[13px] text-slate-600 transition duration-200 ease-out hover:bg-slate-100 hover:text-slate-900 hover:translate-x-0.5"
                :class="{
                  'bg-blue-50/80 text-blue-700 font-semibold shadow-sm':
                    currentName === item.routeName,
                }"
              >
                <span
                  class="absolute left-3 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-slate-300 transition group-hover:bg-blue-400"
                  :class="currentName === item.routeName ? 'bg-blue-500' : ''"
                ></span>
                <span class="flex-1">{{ item.label }}</span>
                <span
                  class="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-full bg-blue-600 opacity-0 transition"
                  :class="currentName === item.routeName ? 'opacity-100' : 'group-hover:opacity-60'"
                ></span>
              </RouterLink>
            </nav>
          </transition>
        </template>

        <template v-if="isSuperAdminOrDev && (!isSearching || filteredEmpManageMenu.length)">
          <RouterLink to="/employee-management" custom v-slot="{ navigate }">
            <div
              class="side-menu"
              :class="{
                'flex justify-center': !open,
                'side-menu-active': groupActive(empRouteNames, '/employee-management'),
              }"
              @click="navigate"
            >
              <div class="flex items-center justify-between w-full">
                <div class="flex items-center gap-2">
                  <i class="fas fa-users py-2"></i>
                  <h4 v-if="open">EmpManage</h4>
                </div>
                <button
                  v-if="open"
                  class="p-1 rounded hover:bg-gray-100 hover:text-black"
                  @click.stop="toggleSubmenu('emp')"
                  :aria-expanded="submenuOpen('emp', filteredEmpManageMenu)"
                >
                  <i
                    class="fas text-xs"
                    :class="
                      submenuOpen('emp', filteredEmpManageMenu)
                        ? 'fa-chevron-up'
                        : 'fa-chevron-down'
                    "
                  ></i>
                </button>
              </div>
            </div>
          </RouterLink>

          <transition name="submenu">
            <nav
              v-if="open && submenuOpen('emp', filteredEmpManageMenu)"
              class="submenu-accordion relative mt-2 ml-3 space-y-1 rounded-xl bg-slate-50/70 px-2 py-2 shadow-sm"
            >
              <span
                aria-hidden="true"
                class="absolute left-3 top-2 bottom-2 w-px bg-slate-200"
              ></span>
              <RouterLink
                v-for="item in filteredEmpManageMenu"
                :key="item.key"
                :to="item.to"
                class="group relative flex items-center gap-2 rounded-lg py-2 pl-7 pr-3 text-[13px] text-slate-600 transition duration-200 ease-out hover:bg-slate-100 hover:text-slate-900 hover:translate-x-0.5"
                :class="{
                  'bg-blue-50/80 text-blue-700 font-semibold shadow-sm':
                    currentName === 'checklists.board',
                }"
              >
                <span
                  class="absolute left-3 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-slate-300 transition group-hover:bg-blue-400"
                  :class="currentName === 'checklists.board' ? 'bg-blue-500' : ''"
                ></span>
                <span class="flex-1">{{ item.label }}</span>
                <span
                  class="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-full bg-blue-600 opacity-0 transition"
                  :class="
                    currentName === 'checklists.board' ? 'opacity-100' : 'group-hover:opacity-60'
                  "
                ></span>
              </RouterLink>
            </nav>
          </transition>
        </template>

        <template v-if="!isSearching || filteredSettingsMenu.length">
          <RouterLink to="/settings" custom v-slot="{ navigate }">
            <div
              class="side-menu"
              :class="{
                'flex justify-center': !open,
                'side-menu-active': groupActive(settingsRouteNames, '/settings'),
              }"
              @click="navigate"
            >
              <div class="flex items-center justify-between w-full">
                <div class="flex items-center gap-2">
                  <i class="fas fa-cogs py-2"></i>
                  <h4 v-if="open">Settings</h4>
                </div>
                <button
                  v-if="open"
                  class="p-1 rounded hover:bg-gray-100 hover:text-black"
                  @click.stop="toggleSubmenu('settings')"
                  :aria-expanded="submenuOpen('settings', filteredSettingsMenu)"
                >
                  <i
                    class="fas text-xs"
                    :class="
                      submenuOpen('settings', filteredSettingsMenu)
                        ? 'fa-chevron-up'
                        : 'fa-chevron-down'
                    "
                  ></i>
                </button>
              </div>
            </div>
          </RouterLink>

          <transition name="submenu">
            <nav
              v-if="open && submenuOpen('settings', filteredSettingsMenu)"
              class="submenu-accordion relative mt-2 ml-3 space-y-1 rounded-xl bg-slate-50/70 px-2 py-2 shadow-sm"
            >
              <span
                aria-hidden="true"
                class="absolute left-3 top-2 bottom-2 w-px bg-slate-200"
              ></span>
              <RouterLink
                v-for="item in filteredSettingsMenu"
                :key="item.label"
                :to="{ name: item.routeName, params: item.params }"
                class="group relative flex items-center gap-2 rounded-lg py-2 pl-7 pr-3 text-[13px] text-slate-600 transition duration-200 ease-out hover:bg-slate-100 hover:text-slate-900 hover:translate-x-0.5"
                :class="{
                  'bg-blue-50/80 text-blue-700 font-semibold shadow-sm':
                    currentName === item.routeName,
                }"
              >
                <span
                  class="absolute left-3 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-slate-300 transition group-hover:bg-blue-400"
                  :class="currentName === item.routeName ? 'bg-blue-500' : ''"
                ></span>
                <span class="flex-1">{{ item.label }}</span>
                <span
                  class="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-full bg-blue-600 opacity-0 transition"
                  :class="currentName === item.routeName ? 'opacity-100' : 'group-hover:opacity-60'"
                ></span>
              </RouterLink>
            </nav>
          </transition>
        </template>

        <template v-if="!isSearching || filteredCareerMenu.length">
          <RouterLink to="/admin/careers" custom v-slot="{ navigate }">
            <div
              class="side-menu"
              :class="{
                'flex justify-center': !open,
                'side-menu-active': groupActive(careerRouteNames, '/admin/careers'),
              }"
              @click="navigate"
            >
              <div class="flex items-center justify-between w-full">
                <div class="flex items-center gap-2">
                  <i class="far fa-briefcase"></i>
                  <h4 v-if="open">Careers</h4>
                </div>
                <button
                  v-if="open"
                  class="p-1 rounded hover:bg-gray-100 hover:text-black"
                  @click.stop="toggleSubmenu('careers')"
                  :aria-expanded="submenuOpen('careers', filteredCareerMenu)"
                >
                  <i
                    class="fas text-xs"
                    :class="
                      submenuOpen('careers', filteredCareerMenu)
                        ? 'fa-chevron-up'
                        : 'fa-chevron-down'
                    "
                  ></i>
                </button>
              </div>
            </div>
          </RouterLink>

          <transition name="submenu">
            <nav
              v-if="open && submenuOpen('careers', filteredCareerMenu)"
              class="submenu-accordion relative mt-2 ml-3 space-y-1 rounded-xl bg-slate-50/70 px-2 py-2 shadow-sm"
            >
              <span
                aria-hidden="true"
                class="absolute left-3 top-2 bottom-2 w-px bg-slate-200"
              ></span>
              <RouterLink
                v-for="item in filteredCareerMenu"
                :key="item.routeName"
                :to="{ name: item.routeName }"
                class="group relative flex items-center gap-2 rounded-lg py-2 pl-7 pr-3 text-[13px] text-slate-600 transition duration-200 ease-out hover:bg-slate-100 hover:text-slate-900 hover:translate-x-0.5"
                :class="{
                  'bg-blue-50/80 text-blue-700 font-semibold shadow-sm':
                    currentName === item.routeName,
                }"
              >
                <span
                  class="absolute left-3 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-slate-300 transition group-hover:bg-blue-400"
                  :class="currentName === item.routeName ? 'bg-blue-500' : ''"
                ></span>
                <span class="flex-1">{{ item.label }}</span>
                <span
                  class="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-full bg-blue-600 opacity-0 transition"
                  :class="currentName === item.routeName ? 'opacity-100' : 'group-hover:opacity-60'"
                ></span>
              </RouterLink>
            </nav>
          </transition>
        </template>
      </template>
    </div>

    <!-- Footer Section (Logout) -->
    <div class="mt-auto border-t bg-white p-2">
      <button
        :class="{ 'flex justify-center': !open }"
        class="side-menu bg-rose-50 w-full hover:bg-rose-600 text-rose-700 rounded-lg"
        @click="logout"
      >
        <i class="fad fa-sign-out-alt py-2"></i>
        <h4 v-show="open">Logout</h4>
      </button>
    </div>
  </aside>
</template>

<style scoped>
.submenu-enter-active,
.submenu-leave-active {
  transition:
    max-height 0.25s ease,
    opacity 0.2s ease;
  overflow: hidden;
}

.submenu-enter-from,
.submenu-leave-to {
  max-height: 0;
  opacity: 0;
}

.submenu-enter-to,
.submenu-leave-from {
  max-height: 900px;
  opacity: 1;
}

.side-menu {
  transition:
    transform 0.18s ease,
    box-shadow 0.18s ease,
    background-color 0.18s ease,
    color 0.18s ease;
}

.side-menu:hover {
  transform: translateX(2px);
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.06);
}

.side-menu:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.45);
}

.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #e2e8f0;
  border-radius: 10px;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #cbd5e1;
}
</style>
