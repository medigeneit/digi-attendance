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

      <div class="flex gap-4">
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
      </div>
    </div>

    <!-- filters -->
    <div class="flex gap-4 items-center py-2">
      <EmployeeFilter
        v-model:company_id="selectedCompany"
        v-model:department_id="selectedDepartment"
        v-model:employee_id="selectedUserId"
        v-model:line_type="selectedLineType"
        :with-type="true"
        :initial-value="$route.query"
        class="w-full"
      />
      <select v-model="selectedStatus" class="input-1 w-auto">
        <option value="active">Active</option>
        <option value="in_active">In Active</option>
      </select>
      <div class="btn-2" @click="fetchUser()">Search</div>
    </div>

    <!-- loader -->
    <div v-if="userStore.isLoading" class="text-center py-4">
      <LoaderView />
    </div>

    <!-- table -->
    <div v-else class="space-y-4">
      <div
        v-if="Object.keys(groupedUsers).length === 0"
        class="text-center py-2 text-lg italic text-gray-500"
      >
        User not found
      </div>

      <div v-for="(users, companyName) in groupedUsers" :key="companyName">
        <h2 class="title-md">{{ companyName }} ({{ users.length }})</h2>

        <div class="overflow-x-auto">
          <table class="min-w-full table-auto bg-white shadow-md rounded-lg overflow-hidden">
            <thead>
              <tr class="bg-gray-100 text-sm font-medium text-gray-700">
                <th class="border border-gray-200 px-2 py-2 text-left">#</th>
                <th class="border border-gray-200 px-3 py-2 text-left">Name</th>
                <th class="border border-gray-200 px-3 py-2 text-left">Designation</th>
                <th class="border border-gray-200 px-2 py-2 text-left">Finger ID</th>
                <th class="border border-gray-200 px-2 py-2 text-left">Employee ID</th>
                <th class="border border-gray-200 px-2 py-2 text-left">Joining Date</th>
                <th class="border border-gray-200 px-2 py-2 text-left">Role</th>
                <th class="border border-gray-200 px-3 py-2 text-left">Shift</th>
                <th class="border border-gray-200 px-3 py-2 text-left">Weekend</th>
                <th class="border border-gray-200 px-2 py-2 text-left">Phone</th>
                <th class="border border-gray-200 px-2 py-2 text-left">Email</th>
                <th class="border border-gray-200 px-2 py-2 text-left">Status</th>
                <th class="border border-gray-200 px-3 py-2 text-left">KPI Criteria</th>
                <th class="border border-gray-200 px-2 py-2 text-left">Action</th>
              </tr>
            </thead>

            <tbody>
              <tr
                v-for="(user, index) in users"
                :key="user.id"
                class="border-b text-sm border-gray-100 hover:bg-indigo-50/50"
              >
                <td class="border border-gray-100 px-2 py-2">{{ index + 1 }}</td>

                <td class="border border-gray-100 px-3 py-2" v-html="formattedName(user?.name)"></td>

                <td class="border border-gray-100 px-3 py-2" v-html="formattedName(user?.designation?.title)"></td>

                <td class="border border-gray-100 px-2 py-2">{{ user?.device_user_id }}</td>
                <td class="border border-gray-100 px-2 py-2">{{ user?.employee_id }}</td>
                <td class="border border-gray-100 px-2 py-2">{{ user.joining_date }}</td>
                <td class="border border-gray-100 px-2 py-2">{{ user.role }}</td>

                <!-- SHIFT (KPI-style) -->
                <td class="border border-gray-100 px-3 py-2 whitespace-nowrap">
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
                      {{ hasShift(user) ? 'Manage' : 'Assign' }}
                    </span>
                    <span
                      class="ml-1 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1 text-[10px] font-semibold"
                      :class="hasShift(user) ? 'bg-amber-600 text-white' : 'bg-slate-200 text-slate-700'"
                    >
                      {{ user.shifts_count }}
                    </span>
                  </button>
                  <div class="mt-1 text-[11px] text-gray-500">
                    {{ shiftName(user) }}
                  </div>
                </td>

                <!-- WEEKEND (KPI-style) -->
                <td class="border border-gray-100 px-3 py-2 whitespace-nowrap">
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
                      {{ hasWeekend(user) ? 'Manage' : 'Assign' }}
                    </span>
                    <span
                      class="ml-1 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1 text-[10px] font-semibold"
                      :class="hasWeekend(user) ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'"
                    >
                      {{ user?.assign_weekends_count }}
                    </span>
                  </button>
                  <div class="mt-1 text-[11px] text-gray-500">
                    {{ weekendDays(user) }}
                  </div>
                </td>

                <td class="border border-gray-100 px-2 py-2">{{ user.phone }}</td>
                <td class="border border-gray-100 px-2 py-2">{{ user.email || 'নেই' }}</td>

                <td class="border border-gray-100 px-2 py-2">
                  <span
                    :class="user.is_active ? 'text-emerald-600' : 'text-rose-500'"
                  >
                    {{ user.is_active ? 'Active' : 'Inactive' }}
                  </span>
                </td>

                <!-- KPI (as before) -->
                <td class="border border-gray-100 px-3 py-2 whitespace-nowrap">
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
                <td class="border border-gray-100 px-2 py-2">
                  <div class="flex gap-2">
                    <RouterLink
                      :to="{ name: 'UserShow', params: { id: user.id }, query: { company: route.query.company } }"
                      class="btn-icon"
                      title="View"
                    >
                      <i class="far fa-eye"></i>
                    </RouterLink>
                    <RouterLink
                      :to="{ name: 'UserEdit', params: { id: user.id }, query: { company: route.query.company } }"
                      class="btn-icon"
                      title="Edit"
                    >
                      <i class="far fa-edit"></i>
                    </RouterLink>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- KPI Criteria Modal -->
      <CriteriaAssignModal
        v-model="kpiModalOpen"
        :user-id="selectedEmployee?.id"
        :user-label="selectedEmployee?.name"
        :criteria_assignments="selectedEmployee?.criteria_assignments"
        @assigned="afterAssigned"
      />


      <ShiftWeekendModal
        v-model="weekendModalOpen"
        :user-id="selectedEmployee?.id"
        :user-label="selectedEmployee?.name"
        :assign_weekends="userWeekendHistory" 
        @saved="(res) => {
          const current = res?.current
          if (current && selectedEmployee) {
            selectedEmployee.assign_weekend = {
              weekends: current.weekends || [],
              start_month: current.start_month,
              end_month: current.end_month
            }
          }
        }"
      />

      <ShiftAssignmentModal
        v-model="shiftModalOpen"
        :shifts="shifts"
        :employee="{ id: selectedEmployee?.id, name: selectedEmployee?.name }"
        :has-shift="selectedEmployee?.current_shift"
        :shift_history="userShiftHistory"  
        @close="shiftModalOpen = false"
      />
    </div>
  </div>
</template>
