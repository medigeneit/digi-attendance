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

// --------- MENU DEFINITIONS (using your route names) ----------

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
]
const reportRouteNames = reportsMenu.map((i) => i.routeName)

// KPI
const kpiMenu = [
  { label: 'Monthly KPI Forms', routeName: 'MonthlyKpiFormList' },
  // { label: 'Assignment List', routeName: 'AssignmentList' },
  { label: 'Monthly Evaluation List', routeName: 'EvaluationList' },
  { label: 'Yearly Evaluation', routeName: 'YearlyEvaluationList' },
  { label: 'Monthly KPI Reports', routeName: 'MonthlyKpiReportList' },
  { label: 'Department KPI Reports', routeName: 'YearlyDepartmentalKpiReportList' },
  { label: 'Executive Kpi Reports', routeName: 'YearlyExecutiveKpiReportList' },
]
const kpiRouteNames = kpiMenu.map((i) => i.routeName)

// HRD
const hrdMenu = [
  { label: 'Job Card', routeName: 'EmployeeAttendance' },
  { label: 'Attendance Log', routeName: 'EmployeeAttendanceLog' },
  { label: 'Monthly Application Log', routeName: 'MonthWiseApplicationLog' },
  { label: 'Annual Leave Applications', routeName: 'HrdAdminLeaveApplication' },
  { label: 'Leave Applications', routeName: 'LeaveApplicationList' },
  { label: 'Short Leaves', routeName: 'ShortLeaveList' },
  { label: 'Shift Exchanges', routeName: 'ShiftExchangeList' },
  { label: 'Offday Exchanges', routeName: 'OffdayExchangeList' },
  { label: 'Manual Attendance List', routeName: 'ManualAttendanceList' },
  { label: 'Manual Attendance Application', routeName: 'HrdAdminManualAttendanceApplication' },
  { label: 'Overtime List', routeName: 'OvertimeList' },
  { label: 'PayCut List', routeName: 'PayCutList' },
  { label: 'Notice List', routeName: 'NoticeList' },
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
// there’s only one routeName here, but with different query
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
</script>

<template>
  <aside
    class="bg-white sidebar h-screen overflow-auto scrollbar pb-24 z-[500]"
    :class="{ 'sm:min-w-[240px]': open }"
  >
    <div class="space-y-1 pt-16 md:pt-0">
      <!-- Admin Mode + Toggle Menu Row -->
      <div
        class="flex items-center justify-between md:gap-2 px-2 py-5 sticky top-0 z-30 bg-white border-b"
      >
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

      <!-- Default Menus (hidden for adminMode ON + admin roles) -->
      <RouterLink
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
        <!-- Requirement -->
        <RouterLink
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

        <!-- Task Management -->
        <RouterLink
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

        <!-- Reports + Submenu -->
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
                :aria-expanded="isSubmenuOpen('reports')"
              >
                <i
                  class="fas text-xs"
                  :class="isSubmenuOpen('reports') ? 'fa-chevron-up' : 'fa-chevron-down'"
                ></i>
              </button>
            </div>
          </div>
        </RouterLink>

        <nav v-if="open && isSubmenuOpen('reports')" class="mt-1 space-y-1">
          <RouterLink
            v-for="item in reportsMenu"
            :key="item.routeName"
            :to="{ name: item.routeName }"
            class="flex items-center gap-2 pl-11 pr-3 py-1.5 text-sm text-gray-600 rounded hover:bg-blue-50 hover:text-blue-600"
            :class="{ 'bg-blue-50 text-blue-600 font-medium': currentName === item.routeName }"
          >
            <span class="w-1.5 h-1.5 rounded-full bg-gray-300"></span>
            <span>{{ item.label }}</span>
          </RouterLink>
        </nav>

        <!-- KPI + Submenu -->
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
                :aria-expanded="isSubmenuOpen('kpi')"
              >
                <i
                  class="fas text-xs"
                  :class="isSubmenuOpen('kpi') ? 'fa-chevron-up' : 'fa-chevron-down'"
                ></i>
              </button>
            </div>
          </div>
        </RouterLink>

        <nav v-if="open && isSubmenuOpen('kpi')" class="mt-1 space-y-1">
          <RouterLink
            v-for="item in kpiMenu"
            :key="item.routeName"
            :to="{ name: item.routeName }"
            class="flex items-center gap-2 pl-11 pr-3 py-1.5 text-sm text-gray-600 rounded hover:bg-blue-50 hover:text-blue-600"
            :class="{ 'bg-blue-50 text-blue-600 font-medium': currentName === item.routeName }"
          >
            <span class="w-1.5 h-1.5 rounded-full bg-gray-300"></span>
            <span>{{ item.label }}</span>
          </RouterLink>
        </nav>

        <!-- HR Department + Submenu -->
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
                :aria-expanded="isSubmenuOpen('hrd')"
              >
                <i
                  class="fas text-xs"
                  :class="isSubmenuOpen('hrd') ? 'fa-chevron-up' : 'fa-chevron-down'"
                ></i>
              </button>
            </div>
          </div>
        </RouterLink>

        <nav v-if="open && isSubmenuOpen('hrd')" class="mt-1 space-y-1">
          <RouterLink
            v-for="item in hrdMenu"
            :key="item.routeName"
            :to="{ name: item.routeName }"
            class="flex items-center gap-2 pl-11 pr-3 py-1.5 text-sm text-gray-600 rounded hover:bg-blue-50 hover:text-blue-600"
            :class="{ 'bg-blue-50 text-blue-600 font-medium': currentName === item.routeName }"
          >
            <span class="w-1.5 h-1.5 rounded-full bg-gray-300"></span>
            <span>{{ item.label }}</span>
          </RouterLink>
        </nav>

        <!-- EmpManage + Submenu -->
        <template v-if="isSuperAdminOrDev">
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
                  :aria-expanded="isSubmenuOpen('emp')"
                >
                  <i
                    class="fas text-xs"
                    :class="isSubmenuOpen('emp') ? 'fa-chevron-up' : 'fa-chevron-down'"
                  ></i>
                </button>
              </div>
            </div>
          </RouterLink>

          <nav v-if="open && isSubmenuOpen('emp')" class="mt-1 space-y-1">
            <RouterLink
              v-for="item in empManageMenu"
              :key="item.key"
              :to="item.to"
              class="flex items-center gap-2 pl-11 pr-3 py-1.5 text-sm text-gray-600 rounded hover:bg-blue-50 hover:text-blue-600"
              :class="{
                'bg-blue-50 text-blue-600 font-medium': currentName === 'checklists.board',
              }"
            >
              <span class="w-1.5 h-1.5 rounded-full bg-gray-300"></span>
              <span>{{ item.label }}</span>
            </RouterLink>
          </nav>

          <!-- Settings + Submenu -->
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
                  :aria-expanded="isSubmenuOpen('settings')"
                >
                  <i
                    class="fas text-xs"
                    :class="isSubmenuOpen('settings') ? 'fa-chevron-up' : 'fa-chevron-down'"
                  ></i>
                </button>
              </div>
            </div>
          </RouterLink>

          <nav v-if="open && isSubmenuOpen('settings')" class="mt-1 space-y-1">
            <RouterLink
              v-for="item in settingsMenu"
              :key="item.label"
              :to="{ name: item.routeName, params: item.params }"
              class="flex items-center gap-2 pl-11 pr-3 py-1.5 text-sm text-gray-600 rounded hover:bg-blue-50 hover:text-blue-600"
              :class="{ 'bg-blue-50 text-blue-600 font-medium': currentName === item.routeName }"
            >
              <span class="w-1.5 h-1.5 rounded-full bg-gray-300"></span>
              <span>{{ item.label }}</span>
            </RouterLink>
          </nav>

          <!-- Careers + Submenu -->
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
                  :aria-expanded="isSubmenuOpen('careers')"
                >
                  <i
                    class="fas text-xs"
                    :class="isSubmenuOpen('careers') ? 'fa-chevron-up' : 'fa-chevron-down'"
                  ></i>
                </button>
              </div>
            </div>
          </RouterLink>

          <nav v-if="open && isSubmenuOpen('careers')" class="mt-1 space-y-1">
            <RouterLink
              v-for="item in careerMenu"
              :key="item.routeName"
              :to="{ name: item.routeName }"
              class="flex items-center gap-2 pl-11 pr-3 py-1.5 text-sm text-gray-600 rounded hover:bg-blue-50 hover:text-blue-600"
              :class="{ 'bg-blue-50 text-blue-600 font-medium': currentName === item.routeName }"
            >
              <span class="w-1.5 h-1.5 rounded-full bg-gray-300"></span>
              <span>{{ item.label }}</span>
            </RouterLink>
          </nav>
        </template>
      </template>

      <!-- Logout -->
      <button
        :class="{ 'flex justify-center': !open }"
        class="side-menu bg-rose-50 w-full hover:bg-rose-600 text-rose-700"
        @click="logout"
      >
        <i class="fad fa-sign-out-alt py-2"></i>
        <h4 v-show="open">Logout</h4>
      </button>
    </div>
  </aside>
</template>
