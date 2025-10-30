<script setup>
import EmployeeFilter from '@/components/common/EmployeeFilter.vue'
import LoaderView from '@/components/common/LoaderView.vue'
import ShiftAssignmentModal from '@/components/common/ShiftAssignmentModal.vue'
import ShiftWeekendModal from '@/components/common/WeekendAssignModal.vue'
import CriteriaAssignModal from '@/components/CriteriaAssignModal.vue'

import { useCompanyStore } from '@/stores/company'
import { useDepartmentStore } from '@/stores/department'
import { useShiftStore } from '@/stores/shift'
import { useUserStore } from '@/stores/user'

import { storeToRefs } from 'pinia'
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

/* ------------ stores & router ------------ */
const router = useRouter()
const route = useRoute()

const companyStore = useCompanyStore()
const departmentStore = useDepartmentStore()
const userStore = useUserStore()
const shiftStore = useShiftStore()

const { companies } = storeToRefs(companyStore)
const { departments } = storeToRefs(departmentStore)
const { shifts } = storeToRefs(shiftStore)

/* ------------ filters ------------ */
const selectedCompany = ref(route.query.company || 'all')
const selectedDepartment = ref(route.query.department || 'all')
const selectedLineType = ref(route.query.line_type || 'all')
const selectedStatus = ref(route.query.status || 'active')
const selectedUserId = ref('')

/* ------------ list & ui ------------ */
const users = ref([])
const userWeekendHistory = ref(null) // { history, current }
const userShiftHistory = ref(null) // { history, current }
const selectedEmployee = ref(null)

/* ------------ Modals (single instance outside table) ------------ */
const shiftModalOpen = ref(false)
const weekendModalOpen = ref(false)
const kpiModalOpen = ref(false)

/* ------------ lifecycle ------------ */
onMounted(async () => {
  await companyStore.fetchCompanies()

  const companyId = route.query.company
  const departmentId = route.query.department

  if (companyId) {
    await fetchEmployees(companyId)
    await fetchDepartmentByCompany(companyId)
  }
  if (departmentId) {
    await fetchDepartmentEmployee(departmentId)
  }
})

/* ------------ navigation ------------ */
const goBack = () => router.go(-1)

/* ------------ query -> list ------------ */
const fetchUser = () => {
  userStore.fetchUsers({
    company_id: route.query.company,
    department_id: route.query.department,
    line_type: route.query.line_type,
    status: route.query.status,
    user_id: route.query.employee_id,
  })
}

watch(selectedCompany, async (nv, ov) => {
  if (!nv || nv === ov) return
  fetchDepartmentByCompany(nv)
  fetchEmployees(nv)
  if (route.query.company !== nv) {
    router.push({ query: { ...route.query, company: nv } })
  }
})

watch(selectedDepartment, async (nv, ov) => {
  if (!nv || nv === ov) return
  fetchDepartmentEmployee(nv)
  if (route.query.department !== nv) {
    router.push({ query: { ...route.query, department: nv } })
  }
})

watch(selectedLineType, (nv) => {
  router.push({ query: { ...route.query, line_type: nv } })
})

watch(selectedStatus, (nv) => {
  router.push({ query: { ...route.query, status: nv } })
})

/* ------------ data fetch helpers ------------ */
const fetchDepartmentByCompany = async (company_id) => {
  await departmentStore.fetchDepartments(company_id)
}

const fetchEmployees = async (companyId) => {
  try {
    const res = await companyStore.fetchEmployees(companyId)
    users.value = res.data
  } catch (err) {
    console.error('Failed to fetch employees by company:', err)
  }
}

const fetchDepartmentEmployee = async (departmentId) => {
  try {
    const res = await departmentStore.fetchDepartmentEmployee({ departmentIds: [departmentId] })
    users.value = res
  } catch (err) {
    console.error('Failed to fetch employees by department:', err)
  }
}

/* ------------ grouped users ------------ */
const groupedUsers = computed(() => {
  let filtered = [...(userStore?.users || [])]

  if (selectedCompany.value !== 'all') {
    filtered = filtered.filter(u => u?.company?.id == selectedCompany.value)
  }
  if (selectedDepartment.value !== 'all') {
    filtered = filtered.filter(u => u?.department?.id == selectedDepartment.value)
  }
  if (selectedLineType.value !== 'all') {
    filtered = filtered.filter(u => u?.type == selectedLineType.value)
  }
  if (selectedStatus.value) {
    const is_active = selectedStatus.value === 'active' ? 1 : 0
    filtered = filtered.filter(u => u?.is_active == is_active)
  }
  if (selectedUserId.value) {
    filtered = filtered.filter(u => u?.id == selectedUserId.value)
  }

  const grouped = {}
  filtered.forEach(u => {
    const companyName = u?.company?.name || 'Unknown Company'
    if (!grouped[companyName]) grouped[companyName] = []
    grouped[companyName].push(u)
  })
  return grouped
})

/* ------------ cell helpers (UI) ------------ */
const formattedName = (name) => {
  if (!name) return ''
  const parts = String(name).split(' ')
  const firstTwo = parts.slice(0, 2).join(' ')
  const rest = parts.length > 2 ? `<br>${parts.slice(2).join(' ')}` : ''
  return firstTwo + rest
}

const hasShift = (user) => !!user?.current_shift?.shift?.name
const shiftName = (user) => user?.current_shift?.shift?.name || 'Not Assigned'
const shiftBadgeCount = (user) => hasShift(user) ? 1 : 0

const hasWeekend = (user) => Array.isArray(user?.assign_weekend?.weekends) && user.assign_weekend.weekends.length > 0
const weekendDays = (user) => hasWeekend(user) ? user.assign_weekend.weekends.join(', ') : 'Not Assigned'
const weekendBadgeCount = (user) => hasWeekend(user) ? user.assign_weekend.weekends.length : 0

/* ------------ open modals (single instance) ------------ */
async function openShift(user) {

  selectedEmployee.value = user

  if (user?.company_id) {

    const res = await userStore.fetchUserShifts(user.id)

    userShiftHistory.value = res;

    await shiftStore.fetchShifts(user.company_id)


  }
  shiftModalOpen.value = true
}

async function openWeekend(user) {
  selectedEmployee.value = user
  weekendModalOpen.value = true
  try {
    const res = await userStore.fetchUserWeekends(user.id)
    userWeekendHistory.value = res
  } catch (e) {
    userWeekendHistory.value = { history: [], current: null }
  }
}

function openAssign(user) {
  selectedEmployee.value = user
  kpiModalOpen.value = true
}

/* ------------ export ------------ */
async function excelDownload() {
  await userStore.fetchUsersExcelExport({
    data: {
      company_id: selectedCompany.value,
      department_id: selectedDepartment.value,
      line_type: selectedLineType.value,
      status: selectedStatus.value,
    },
  })
}

/* ------------ after modal save (optional local refresh) ------------ */
function afterAssigned() {
  kpiModalOpen.value = false
  // প্রয়োজনে তালিকা রিফ্রেশ করতে পারো: fetchUser()
}
</script>

<template>
  <div class="space-y-2 p-5">
    <!-- header -->
    <div class="flex items-center justify-between gap-2">
      <button class="btn-3" @click="goBack">
        <i class="far fa-arrow-left"></i>
        <span class="hidden md:flex">Back</span>
      </button>

      <h1 class="title-md md:title-lg flex-wrap text-center">Employee List</h1>
      <div></div>

      <!-- <div class="flex gap-4">
        <RouterLink
          :to="{ name: 'UserAdd', query: { company: route.query.company } }"
          class="btn-2"
        >
          <span class="hidden md:flex">Add New</span>
          <i class="far fa-plus"></i>
        </RouterLink>
        <button type="button" @click="excelDownload" class="btn-3">
          <i class="far fa-file-excel text-2xl text-green-500"></i>Excel
        </button>
      </div> -->
    </div>

   <!-- ========== PATCH A: Sticky Filters Bar (replace your current filters <div> ========== -->
    <div class="sticky top-14 z-40 -mx-5 px-5 py-2 bg-white/90 supports-[backdrop-filter]:bg-white/70 backdrop-blur border-b border-zinc-200 rounded-none">
      <div class="flex flex-wrap items-center gap-2">
        <EmployeeFilter
          v-model:company_id="selectedCompany"
          v-model:department_id="selectedDepartment"
          v-model:employee_id="selectedUserId"
          v-model:line_type="selectedLineType"
          :with-type="true"
          :initial-value="$route.query"
          class="w-full"
        >
          <select v-model="selectedStatus" class="input-1 py-1 text-sm w-auto">
            <option value="active">Active</option>
            <option value="in_active">In Active</option>
          </select>
        </EmployeeFilter>

        <div class="ml-auto flex items-center gap-2">
          <button type="button" @click="fetchUser" class="inline-flex h-8 items-center rounded-md border border-zinc-300 bg-zinc-50 px-3 text-[12px] font-medium text-zinc-700 hover:bg-white active:scale-[.99]">
            <i class="far fa-search text-[12px] mr-1"></i>
            Search
          </button>
          <button type="button" @click="excelDownload" class="inline-flex h-8 items-center rounded-md border border-zinc-300 bg-white px-3 text-[12px] font-medium text-zinc-700 hover:bg-zinc-50 active:scale-[.99]">
            <i class="far fa-file-excel text-[14px] text-green-600 mr-1"></i>
            <span class="hidden sm:inline">Export</span>
          </button>
        </div>
      </div>
    </div>

    <!-- ========== PATCH B: Company Section + Table (replace the block inside v-for) ========== -->
    <div v-for="(users, companyName) in groupedUsers" :key="companyName" class="mt-4">
      <!-- Section header -->
      <div class="flex items-center justify-between px-1">
        <h2 class="flex items-center gap-2 text-sm font-semibold text-zinc-800">
          <span class="h-2 w-2 rounded-full bg-indigo-500"></span>
          <span class="truncate max-w-[60vw]">{{ companyName }}</span>
        </h2>
        <span class="text-[11px] font-medium text-zinc-500">{{ users.length }} users</span>
      </div>
      <div class="mt-1 h-px w-full bg-gradient-to-r from-indigo-500/60 via-sky-400/60 to-cyan-400/60"></div>

      <!-- Table -->
      <div class="relative overflow-x-auto rounded-lg border border-zinc-200 bg-white shadow-sm mt-2">
        <table class="min-w-full table-auto text-[13px]">
          <thead class="bg-zinc-50/80 text-zinc-700">
            <tr>
              <th class="px-2 py-2 text-left font-medium">#</th>
              <th class="px-3 py-2 text-left font-medium">Name</th>
              <th class="px-3 py-2 text-left font-medium">Designation</th>
              <th class="px-2 py-2 text-left font-medium">ID's</th>
              <th class="px-2 py-2 text-left font-medium">Joining</th>
              <th class="px-2 py-2 text-left font-medium">Role</th>
              <th class="px-3 py-2 text-left font-medium">Shift</th>
              <th class="px-3 py-2 text-left font-medium">Weekend</th>
              <th class="px-2 py-2 text-left font-medium hidden lg:table-cell">Phone</th>
              <th class="px-2 py-2 text-left font-medium hidden xl:table-cell">Email</th>
              <th class="px-2 py-2 text-left font-medium">Status</th>
              <th class="px-3 py-2 text-left font-medium">KPI</th>
              <th class="px-2 py-2 text-left font-medium">Action</th>
            </tr>
          </thead>

          <tbody>
            <tr
              v-for="(user, index) in users"
              :key="user.id"
              class="border-t border-zinc-100 odd:bg-white even:bg-zinc-50/50 hover:bg-indigo-50/50"
            >
              <td class="px-2 py-2 align-top">{{ index + 1 }}</td>

              <td class="px-3 py-2 align-top leading-tight">
                <div class="font-medium text-zinc-900" v-html="formattedName(user?.name)"></div>
                <div class="text-[11px] text-zinc-500">{{ user?.department?.name || '—' }}</div>
              </td>

              <td class="px-3 py-2 align-top leading-tight" v-html="formattedName(user?.designation?.title)"></td>

              <td class="px-2 py-2 align-top whitespace-nowrap">
                <div class="text-[11px]">Fing ID : <span class="font-medium">{{ user?.device_user_id || '—' }}</span></div>
                <div class="text-[11px]">Emp ID : <span class="font-medium">{{ user?.employee_id || '—' }}</span></div>
              </td>

              <td class="px-2 py-2 align-top whitespace-nowrap">{{ user.joining_date || '—' }}</td>
              <td class="px-2 py-2 align-top">{{ user.role || '—' }}</td>

              <!-- SHIFT (pill) -->
              <td class="px-3 py-2 align-top whitespace-nowrap">
                <button
                  @click="openShift(user)"
                  :title="hasShift(user) ? 'Manage Shift' : 'Assign Shift'"
                  :class="[
                    'group inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium transition',
                    'focus:outline-none focus:ring-2 focus:ring-offset-1',
                    hasShift(user)
                      ? 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 focus:ring-amber-300'
                      : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-white focus:ring-slate-300'
                  ]"
                >
                  <span class="ml-1 hidden lg:inline">
                    {{ hasShift(user) ? 'Change' : 'Assign' }}
                  </span>
                  <span
                    class="ml-1 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1 text-[10px] font-semibold"
                    :class="hasShift(user) ? 'bg-amber-600 text-white' : 'bg-slate-200 text-slate-700'"
                  >
                    {{ user.shifts_count }}
                  </span>
                </button>
                <div class="mt-1 text-[11px] text-gray-500 max-w-[16rem] truncate" :title="shiftName(user)">
                  {{ shiftName(user) }}
                </div>
              </td>

              <!-- WEEKEND (pill) -->
              <td class="px-3 py-2 align-top whitespace-nowrap">
                <button
                  @click="openWeekend(user)"
                  :title="hasWeekend(user) ? 'Manage Weekend' : 'Assign Weekend'"
                  :class="[
                    'group inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium transition',
                    'focus:outline-none focus:ring-2 focus:ring-offset-1',
                    hasWeekend(user)
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 focus:ring-emerald-300'
                      : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-white focus:ring-slate-300'
                  ]"
                >
                  <span class="ml-1 hidden lg:inline">
                    {{ hasWeekend(user) ? 'Change' : 'Assign' }}
                  </span>
                  <span
                    class="ml-1 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1 text-[10px] font-semibold"
                    :class="hasWeekend(user) ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'"
                  >
                    {{ user?.assign_weekends_count || 0 }}
                  </span>
                </button>
                <div class="mt-1 text-[11px] text-gray-500 max-w-[16rem] truncate" :title="weekendDays(user)">
                  {{ weekendDays(user) }}
                </div>
              </td>

              <td class="px-2 py-2 align-top hidden lg:table-cell">{{ user.phone || '—' }}</td>
              <td class="px-2 py-2 align-top hidden xl:table-cell">{{ user.email || '—' }}</td>

              <td class="px-2 py-2 align-top">
                <span :class="user.is_active ? 'text-emerald-600' : 'text-rose-500'">
                  {{ user.is_active ? 'Active' : 'Inactive' }}
                </span>
              </td>

              <!-- KPI (pill) -->
              <td class="px-3 py-2 align-top whitespace-nowrap">
                <button
                  @click="openAssign(user)"
                  :title="(user.criteria_assignments?.length || 0) > 0 ? 'Manage KPI criteria' : 'Assign KPI criteria'"
                  :class="[
                    'group inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium transition',
                    'focus:outline-none focus:ring-2 focus:ring-offset-1',
                    (user.criteria_assignments?.length || 0) > 0
                      ? 'border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 focus:ring-indigo-300'
                      : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-white focus:ring-slate-300'
                  ]"
                >
                  <span class="ml-1 hidden lg:inline">
                    {{ (user.criteria_assignments?.length || 0) > 0 ? 'Manage' : 'Assign' }}
                  </span>
                  <span
                    class="ml-1 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1 text-[10px] font-semibold"
                    :class="(user.criteria_assignments?.length || 0) > 0 ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-700'"
                  >
                    {{ user.criteria_assignments?.length || 0 }}
                  </span>
                </button>
              </td>

              <!-- Action -->
              <td class="px-2 py-2 align-top">
                <div class="flex gap-1.5">
                  <RouterLink
                    :to="{ name: 'UserShow', params: { id: user.id }, query: { company: route.query.company } }"
                    class="btn-icon"
                    title="View"
                    aria-label="View user"
                  >
                    <i class="far fa-eye"></i>
                  </RouterLink>
                  <RouterLink
                    :to="{ name: 'UserEdit', params: { id: user.id }, query: { company: route.query.company } }"
                    class="btn-icon"
                    title="Edit"
                    aria-label="Edit user"
                  >
                    <i class="far fa-edit"></i>
                  </RouterLink>
                  <RouterLink
                    :to="{ name: 'KpiReview', params: { employeeId: user.id } }"
                    class="btn-icon"
                    aria-label="Open KPI"
                  >
                    KPI
                  </RouterLink>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
