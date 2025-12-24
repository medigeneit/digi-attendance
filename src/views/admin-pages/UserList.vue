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
import { computed, onMounted, ref, reactive, watch } from 'vue'
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
const { users: storeUsers, isLoading } = storeToRefs(userStore)

/* ------------ filters (single source of truth) ------------ */
const filters = reactive({
  company: String(route.query.company ?? 'all'),
  department: String(route.query.department ?? 'all'),
  line_type: String(route.query.line_type ?? 'all'),
  status: String(route.query.status ?? 'active'), // 'all' | 'active' | 'in_active'
  employee_id: String(route.query.employee_id ?? ''),
  q: String(route.query.q ?? '')
})

/* ------------ query sync (debounced) ------------ */
let qTimer = null
const normalizedQuery = computed(() => {
  const q = {}
  if (filters.company && filters.company !== 'all') q.company = filters.company
  if (filters.department && filters.department !== 'all') q.department = filters.department
  if (filters.line_type && filters.line_type !== 'all') q.line_type = filters.line_type
  if (filters.status && filters.status !== 'all') q.status = filters.status
  if (filters.employee_id) q.employee_id = filters.employee_id
  if (filters.q) q.q = filters.q
  return q
})

function replaceQueryDebounced() {
  clearTimeout(qTimer)
  qTimer = setTimeout(() => {
    router.replace({ query: { ...normalizedQuery.value } })
  }, 250)
}

watch(filters, replaceQueryDebounced, { deep: true })

/* ------------ lifecycle ------------ */
onMounted(async () => {
  await companyStore.fetchCompanies()
  // if company preselected from URL → load its departments
  if (filters.company && filters.company !== 'all') {
    await departmentStore.fetchDepartments(filters.company)
  }
  // initial fetch from current URL
  fetchFromRoute()
})

/* ------------ react to URL (source of truth for fetch) ------------ */
watch(
  () => route.query,
  () => fetchFromRoute(),
  { deep: true }
)

function fetchFromRoute() {
  userStore.fetchUsers({
    company_id: route.query.company,
    department_id: route.query.department,
    line_type: route.query.line_type,
    status: route.query.status,
    user_id: route.query.employee_id,
    q: route.query.q
  })
}

/* ------------ dependent data ------------ */
watch(
  () => filters.company,
  async (nv, ov) => {
    if (nv === ov) return
    if (nv && nv !== 'all') {
      await departmentStore.fetchDepartments(nv)
    } else {
      departmentStore.$reset?.()
    }
  }
)

/* ------------ navigation ------------ */
const goBack = () => router.go(-1)

/* ------------ helpers ------------ */
const hasShift = (u) => !!u?.current_shift?.shift?.name
const shiftName = (u) => u?.current_shift?.shift?.name || 'Not Assigned'

const hasWeekend = (u) => Array.isArray(u?.assign_weekend?.weekends) && u.assign_weekend.weekends.length > 0
const weekendDays = (u) => hasWeekend(u) ? u.assign_weekend.weekends.join(', ') : 'Not Assigned'

const matchesQuickSearch = (u, q) => {
  if (!q) return true
  const s = q.toLowerCase()
  return [
    u?.name,
    u?.phone,
    u?.employee_id,
    u?.company?.name,
    u?.department?.name,
    u?.designation?.title
  ].some(val => String(val || '').toLowerCase().includes(s))
}

const statusMatches = (u) => {
  if (filters.status === 'all') return true
  const is_active = filters.status === 'active' ? 1 : 0
  return Number(u?.is_active ?? 0) === is_active
}

/* Base filtered list (before grouping) */
const filteredUsers = computed(() => {
  const list = Array.isArray(storeUsers.value) ? storeUsers.value : []
  return list.filter(u => {
    if (filters.company !== 'all' && String(u?.company?.id) !== String(filters.company)) return false
    // if (filters.department !== 'all' && String(u?.department?.id) !== String(filters.department)) return false
    if (filters.line_type !== 'all' && String(u?.type) !== String(filters.line_type)) return false
    if (filters.employee_id && String(u?.id) !== String(filters.employee_id)) return false
    if (!statusMatches(u)) return false
    if (!matchesQuickSearch(u, filters.q)) return false
    return true
  })
})

/* Summary chips */
const summary = computed(() => {
  const list = filteredUsers.value
  const total = list.length
  const active = list.filter(u => Number(u?.is_active ?? 0) === 1).length
  const withShift = list.filter(u => hasShift(u)).length
  const withWeekend = list.filter(u => hasWeekend(u)).length
  return {
    total,
    active,
    inactive: total - active,
    withShift,
    withoutShift: total - withShift,
    withWeekend,
    withoutWeekend: total - withWeekend
  }
})

/* Group by company name */
const groupedUsers = computed(() => {
  const grouped = {}
  for (const u of filteredUsers.value) {
    const key = u?.company?.name || 'Unknown Company'
    ;(grouped[key] ??= []).push(u)
  }
  return grouped
})

/* ------------ Modals ------------ */
const selectedEmployee = ref(null)
const userWeekendHistory = ref(null) // { history, current }
const userShiftHistory = ref(null)   // { history, current }

const shiftModalOpen = ref(false)
const weekendModalOpen = ref(false)
const kpiModalOpen = ref(false)

/* ------------ actions ------------ */
async function openShift(user) {
  selectedEmployee.value = user
  if (user?.company_id) {
    const res = await userStore.fetchUserShifts(user.id)
    userShiftHistory.value = res
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
  } catch {
    userWeekendHistory.value = { history: [], current: null }
  }
}

function openAssign(user) {
  selectedEmployee.value = user
  kpiModalOpen.value = true
}

async function excelDownload() {
  await userStore.fetchUsersExcelExport({
    data: {
      company_id: filters.company !== 'all' ? filters.company : undefined,
      department_id: filters.department !== 'all' ? filters.department : undefined,
      line_type: filters.line_type !== 'all' ? filters.line_type : undefined,
      status: filters.status !== 'all' ? filters.status : undefined,
      employee_id: filters.employee_id || undefined,
      q: filters.q || undefined
    }
  })
}

function afterAssigned() {
  kpiModalOpen.value = false
}

function resetFilters() {
  filters.company = 'all'
  filters.department = 'all'
  filters.line_type = 'all'
  filters.status = 'active'
  filters.employee_id = ''
  filters.q = ''
}
</script>

<template>
  <div class="space-y-3 p-5">
    <!-- header -->
    <div class="flex items-center justify-between gap-2">
      <button class="btn-3" @click="goBack">
        <i class="far fa-arrow-left"></i>
        <span class="hidden md:flex">Back</span>
      </button>

      <h1 class="title-md md:title-lg flex-wrap text-center">Employee List</h1>

      <div class="flex gap-3">
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
    <div class="sticky top-14 z-40 -mx-5 px-5 py-3 bg-white/90 supports-[backdrop-filter]:bg-white/70 backdrop-blur border-b border-zinc-200">
      <div class="flex flex-col md:flex-row md:items-end gap-2">
        <EmployeeFilter
          v-model:company_id="filters.company"
          v-model:department_id="filters.department"
          v-model:employee_id="filters.employee_id"
          v-model:line_type="filters.line_type"
          :with-type="true"
          :initial-value="$route.query"
          class="w-full"
        >
          <!-- Status segmented -->
          <div class="flex items-center gap-1">
            <button
              class="h-8 px-3 text-xs rounded-l-md border transition"
              :class="filters.status === 'all' ? 'bg-zinc-800 text-white border-zinc-800' : 'bg-white border-zinc-300 hover:bg-zinc-50'"
              @click.prevent="filters.status = 'all'"
            >All</button>
            <button
              class="h-8 px-3 text-xs border-y transition"
              :class="filters.status === 'active' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white border-zinc-300 hover:bg-zinc-50'"
              @click.prevent="filters.status = 'active'"
            >Active</button>
            <button
              class="h-8 px-3 text-xs rounded-r-md border transition"
              :class="filters.status === 'in_active' ? 'bg-rose-600 text-white border-rose-600' : 'bg-white border-zinc-300 hover:bg-zinc-50'"
              @click.prevent="filters.status = 'in_active'"
            >Inactive</button>
          </div>
        </EmployeeFilter>

        <!-- Quick search + Reset -->
        <div class="flex items-center gap-2 w-full md:w-auto">
          <input
            v-model.trim="filters.q"
            type="text"
            placeholder="Search name / phone / ID"
            class="input-1 h-8 text-sm w-full md:w-64"
          />
          <button
            type="button"
            @click="resetFilters"
            class="inline-flex h-8 items-center rounded-md border border-zinc-300 bg-zinc-50 px-3 text-[12px] font-medium text-zinc-700 hover:bg-white active:scale-[.99]"
            title="Reset filters"
          >
            <i class="far fa-undo mr-1"></i> Reset
          </button>
        </div>
      </div>

      <!-- summary chips -->
      <div class="mt-2 flex flex-wrap gap-2 text-[12px]">
        <span class="px-2 py-1 rounded-full bg-zinc-100 text-zinc-700">Total: {{ summary.total }}</span>
        <span class="px-2 py-1 rounded-full bg-emerald-100 text-emerald-700">Active: {{ summary.active }}</span>
        <span class="px-2 py-1 rounded-full bg-rose-100 text-rose-700">Inactive: {{ summary.inactive }}</span>
        <span class="px-2 py-1 rounded-full bg-amber-100 text-amber-800">With Shift: {{ summary.withShift }}</span>
        <span class="px-2 py-1 rounded-full bg-zinc-100 text-zinc-700">No Shift: {{ summary.withoutShift }}</span>
        <span class="px-2 py-1 rounded-full bg-emerald-100 text-emerald-800">With Weekend: {{ summary.withWeekend }}</span>
        <span class="px-2 py-1 rounded-full bg-zinc-100 text-zinc-700">No Weekend: {{ summary.withoutWeekend }}</span>
      </div>
    </div>

    <!-- loader -->
    <div v-if="isLoading" class="text-center py-6">
      <LoaderView />
    </div>

    <!-- results -->
    <div v-else class="space-y-4">
      <div
        v-if="Object.keys(groupedUsers).length === 0"
        class="text-center py-6 text-lg italic text-gray-500"
      >
        No users found 
      </div>

      <!-- per-company groups -->
      <div v-for="(users, companyName) in groupedUsers" :key="companyName" class="space-y-2">
        <div class="flex items-center justify-between">
          <h2 class="title-md">{{ companyName }} ({{ users.length }})</h2>
        </div>

        <!-- mobile cards -->
        <div class="grid grid-cols-1 gap-2 md:hidden">
          <div
            v-for="user in users"
            :key="user.id"
            class="rounded-lg border border-zinc-200 bg-white p-3 shadow-sm"
          >
            <div class="flex items-start gap-3">
              <div class="h-10 w-10 shrink-0 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold">
                {{ (user?.name || '?').charAt(0).toUpperCase() }}
              </div>
              <div class="min-w-0">
                <div class="font-medium leading-5 truncate">{{ user?.name }}</div>
                <div class="text-[12px] text-zinc-500">ID: {{ user?.employee_id }} • {{ user?.designation?.title || '—' }}</div>
                <div class="mt-1 text-[12px] text-zinc-600">Shift: {{ shiftName(user) }}</div>
                <div class="text-[12px] text-zinc-600">Weekend: {{ weekendDays(user) }}</div>
                <div class="mt-1 text-[12px]">
                  <a class="underline" :href="'tel:' + user?.phone" @click.stop>{{ user?.phone || '—' }}</a>
                  <span class="mx-1">•</span>
                  <a class="underline" :href="'mailto:' + (user?.email || '')" @click.stop>{{ user?.email || 'নেই' }}</a>
                </div>
                <div class="mt-2 flex gap-1">
                  <button class="btn-3 !px-2 !py-1" @click="openShift(user)">Shift</button>
                  <button class="btn-3 !px-2 !py-1" @click="openWeekend(user)">Weekend</button>
                  <button class="btn-3 !px-2 !py-1" @click="openAssign(user)">KPI</button>
                  <RouterLink :to="{ name: 'UserShow', params: { id: user.id }, query: { company: route.query.company } }" class="btn-3 !px-2 !py-1">View</RouterLink>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- desktop table -->
        <div class="overflow-x-auto hidden md:block">
          <table class="min-w-full table-auto bg-white shadow-md rounded-lg overflow-hidden">
            <thead>
              <tr class="bg-gray-100 text-sm font-medium text-gray-700">
                <th class="border border-gray-200 px-2 py-2 text-left">#</th>
                <th class="border border-gray-200 px-3 py-2 text-left">Name</th>
                <th class="border border-gray-200 px-2 py-2 text-left">Phone & Email</th>
                <!-- <th class="border border-gray-200 px-2 py-2 text-left">Email</th> -->
                <!-- <th class="border border-gray-200 px-3 py-2 text-left">Designation</th> -->
                <th class="border border-gray-200 px-2 py-2 text-left">Finger ID</th>
                <!-- <th class="border border-gray-200 px-2 py-2 text-left">Employee ID</th> -->
                <th class="border border-gray-200 px-2 py-2 text-left">Joining</th>
                <th class="border border-gray-200 px-2 py-2 text-left">Role</th>
                <th class="border border-gray-200 px-3 py-2 text-left">Shift</th>
                <th class="border border-gray-200 px-3 py-2 text-left">Weekend</th>
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

                <td class="border border-gray-100 px-3 py-2">
                  <div class="flex items-start gap-2">
                    <div v-if="user.photo" class="h-8 w-8 shrink-0 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold">
                      <img :src="user.photo" :alt="user?.name" class="h-8 w-8 rounded-full object-cover">
                    </div>
                    <div v-else class="h-8 w-8 shrink-0 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold">
                      {{ (user?.name || '?').charAt(0).toUpperCase() }}
                    </div>
                    <div class="min-w-0">
                      <div class="font-medium  truncate max-w-[220px]">{{ user?.name }}</div>
                      <div class="text-[11px] text-zinc-500">{{ user?.bn_name }}</div>
                      <div class="text-[11px] text-zinc-500">{{ user?.designation?.title || '—' }}</div>
                      <div class="text-[11px] text-zinc-500">ID: {{ user?.employee_id }}</div>
                    </div>
                  </div>
                </td>

                <td class="border border-gray-100 px-2 py-2">
                  <div class="flex items-center gap-2">
                    <a class="underline" :href="'tel:' + user?.phone">{{ user?.phone || '—' }}</a>
                  </div>
                  <div class="flex items-center gap-2">
                    <a class="underline" :href="'mailto:' + (user?.email || '')">{{ user?.email || 'নেই' }}</a>
                  </div>
                </td>

                <!-- <td class="border border-gray-100 px-2 py-2">
                </td> -->

                <!-- <td class="border border-gray-100 px-3 py-2">
                  <div class="max-w-[220px] truncate">{{ user?.designation?.title || '—' }}</div>
                </td> -->

                <td class="border border-gray-100 px-2 py-2 whitespace-nowrap">{{ user?.device_user_id }}</td>
                <!-- <td class="border border-gray-100 px-2 py-2 whitespace-nowrap">{{ user?.employee_id }}</td> -->
                <td class="border border-gray-100 px-2 py-2 whitespace-nowrap">{{ user?.joining_date }}</td>
                <td class="border border-gray-100 px-2 py-2 whitespace-nowrap">{{ user?.role }}</td>

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
                      {{ user?.shifts_count || (hasShift(user) ? 1 : 0) }}
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
                      {{ user?.assign_weekends_count || (hasWeekend(user) ? user?.assign_weekend?.weekends?.length || 0 : 0) }}
                    </span>
                  </button>
                  <div class="mt-1 text-[11px] text-gray-500">
                    {{ weekendDays(user) }}
                  </div>
                </td>

                

                <td class="border border-gray-100 px-2 py-2">
                  <span :class="user?.is_active ? 'text-emerald-600' : 'text-rose-500'">
                    {{ user?.is_active ? 'Active' : 'Inactive' }}
                  </span>
                </td>

                <!-- KPI -->
                <td class="border border-gray-100 px-3 py-2 whitespace-nowrap">
                  <button
                    @click="openAssign(user)"
                    :title="(user?.criteria_assignments?.length || 0) > 0 ? 'Manage KPI criteria' : 'Assign KPI criteria'"
                    :class="[
                      'group inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium transition',
                      'focus:outline-none focus:ring-2 focus:ring-offset-1',
                      (user?.criteria_assignments?.length || 0) > 0
                        ? 'border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 focus:ring-indigo-300'
                        : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-white focus:ring-slate-300'
                    ]"
                  >
                    <span class="ml-1 hidden lg:inline">
                      {{ (user?.criteria_assignments?.length || 0) > 0 ? 'Manage' : 'Assign' }}
                    </span>
                    <span
                      class="ml-1 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1 text-[10px] font-semibold"
                      :class="(user?.criteria_assignments?.length || 0) > 0 ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-700'"
                    >
                      {{ user?.criteria_assignments?.length || 0 }}
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
                    <RouterLink
                      :to="{ name: 'KpiReview', params: { employeeId: user.id } }"
                      class="btn-icon"
                      title="KPI"
                    >
                      KPI
                    </RouterLink>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Modals (once) -->
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
  </div>
</template>
