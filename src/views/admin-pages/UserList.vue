<script setup>
import EmployeeFilter from '@/components/common/EmployeeFilter.vue'
import LoaderView from '@/components/common/LoaderView.vue'
import ShiftAssignmentModal from '@/components/common/ShiftAssignmentModal.vue'
import ShiftWeekendModal from '@/components/common/WeekendAssignModal.vue'
import CriteriaAssignModal from '@/components/CriteriaAssignModal.vue'
import FlexibleDatePicker from '@/components/FlexibleDatePicker.vue'

import apiClient from '@/axios'
import { useAuthStore } from '@/stores/auth'
import { useCompanyStore } from '@/stores/company'
import { useDepartmentStore } from '@/stores/department'
import { useShiftStore } from '@/stores/shift'
import { useUserStore } from '@/stores/user'
import { useUserClearanceStore } from '@/stores/userClearance'

import { storeToRefs } from 'pinia'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, reactive, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'

/* ------------ stores & router ------------ */
const router = useRouter()
const route = useRoute()
const toast = useToast()

const authStore = useAuthStore()
const companyStore = useCompanyStore()
const departmentStore = useDepartmentStore()
const userStore = useUserStore()
const shiftStore = useShiftStore()
const clearanceStore = useUserClearanceStore()

const { companies } = storeToRefs(companyStore)
const { departments } = storeToRefs(departmentStore)
const { shifts } = storeToRefs(shiftStore)
const { users: storeUsers, isLoading } = storeToRefs(userStore)
const { items: clearanceItems, loading: clearanceLoading, error: clearanceError } = storeToRefs(clearanceStore)

/* ------------ helpers ------------ */
const normalizeDate = (value) => {
  if (!value) return ''
  if (typeof value === 'string') return value.slice(0, 10)
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10)
}

const todayKey = () => {
  const now = new Date()
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 10)
}

const isExitInactive = (u) => {
  const d = normalizeDate(u?.last_working_date)
  return !!d && d <= todayKey()
}

const isInactiveUser = (u) => {
  if (u?.is_inactive) return true
  if (isExitInactive(u)) return true
  return Number(u?.is_active ?? 0) === 0
}

const hasShift = (u) => !!u?.current_shift?.shift?.name
const shiftName = (u) => u?.current_shift?.shift?.name || 'Not Assigned'

const hasWeekend = (u) => Array.isArray(u?.assign_weekend?.weekends) && u.assign_weekend.weekends.length > 0
const weekendDays = (u) => (hasWeekend(u) ? u.assign_weekend.weekends.join(', ') : 'Not Assigned')

const matchesQuickSearch = (u, q) => {
  if (!q) return true
  const s = q.toLowerCase()
  return [u?.name, u?.phone, u?.employee_id, u?.company?.name, u?.department?.name, u?.designation?.title].some((val) =>
    String(val || '')
      .toLowerCase()
      .includes(s)
  )
}

/* ------------ exit button UI ------------ */
const hasExitInfo = (u) => !!normalizeDate(u?.last_working_date)

const exitBtnUI = (u) => {
  const has = hasExitInfo(u)
  const exited = isExitInactive(u)

  const base =
    'inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-[12px] font-semibold transition ' +
    'focus:outline-none focus:ring-2 focus:ring-offset-1 active:scale-[.99]'

  if (!has) {
    return {
      label: 'Set Exit',
      icon: 'far fa-door-open',
      cls: `${base} border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 focus:ring-zinc-300`,
      badgeCls: 'bg-zinc-100 text-zinc-700'
    }
  }

  if (exited) {
    return {
      label: 'Edit Exit',
      icon: 'far fa-circle-xmark',
      cls: `${base} border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 focus:ring-rose-300`,
      badgeCls: 'bg-white/70 text-rose-800'
    }
  }

  return {
    label: 'Edit Exit',
    icon: 'far fa-pen-to-square',
    cls: `${base} border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100 focus:ring-amber-300`,
    badgeCls: 'bg-white/70 text-amber-800'
  }
}

const isClearanceContext = computed(() => route.query.action === 'clearance')
const canManageExit = computed(() => {
  const role = String(authStore.user?.role || '').toLowerCase()
  return ['admin', 'super_admin', 'developer'].includes(role)
})

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
  if (route.query.action) q.action = route.query.action
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
  if (filters.company && filters.company !== 'all') {
    await departmentStore.fetchDepartments(filters.company)
  }
  fetchFromRoute()
})

watch(
  () => route.query,
  () => fetchFromRoute(),
  { deep: true }
)

async function fetchFromRoute() {
  await userStore.fetchUsers({
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

const goBack = () => router.go(-1)

/* ------------ status filter logic ------------ */
const statusMatches = (u) => {
  if (filters.status === 'all') return true
  const inactive = isInactiveUser(u)
  return filters.status === 'active' ? !inactive : inactive
}

/* Base filtered list (before grouping) */
const filteredUsers = computed(() => {
  const list = Array.isArray(storeUsers.value) ? storeUsers.value : []
  return list.filter((u) => {
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
  const active = list.filter((u) => Number(u?.is_active ?? 0) === 1).length
  const withShift = list.filter((u) => hasShift(u)).length
  const withWeekend = list.filter((u) => hasWeekend(u)).length
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

/* ------------ selection / modals ------------ */
const selectedUser = ref(null)

const selectedEmployee = ref(null)
const userWeekendHistory = ref(null) // { history, current }
const userShiftHistory = ref(null) // { history, current }

const shiftModalOpen = ref(false)
const weekendModalOpen = ref(false)
const kpiModalOpen = ref(false)

/* ------------ Exit modal ------------ */
const showExitModal = ref(false)
const selectedExitUser = ref(null)
const exitForm = reactive({
  last_working_date: '',
  exit_reason: ''
})

const exitDatePickerValue = computed({
  get() {
    if (!exitForm.last_working_date) {
      return { year: null, month: null, day: null }
    }
    const [yearStr, monthStr, dayStr] = exitForm.last_working_date.split('-')
    return {
      year: Number(yearStr) || null,
      month: Number(monthStr) || null,
      day: Number(dayStr) || 1,
    }
  },
  set(next) {
    if (!next) {
      exitForm.last_working_date = ''
      return
    }
    const year = Number(next.year) || null
    const month = Number(next.month) || null
    const day = Number(next.day) || 1
    if (!year || !month) {
      exitForm.last_working_date = ''
      return
    }
    const formattedMonth = String(month).padStart(2, '0')
    const formattedDay = String(Math.min(day, 31)).padStart(2, '0')
    exitForm.last_working_date = `${year}-${formattedMonth}-${formattedDay}`
  },
})
const exitLoading = ref(false)
const exitError = ref('')
const printLoading = ref(false)
const printError = ref('')

/* ------------ print computed ------------ */
const printUser = computed(() => selectedExitUser.value)
const printCompanyName = computed(() => printUser.value?.company?.name || 'Digi Attendance')
const printClearanceRows = computed(() => {
  const list = Array.isArray(clearanceItems.value) ? clearanceItems.value : []
  return list.map((row) => {
    const latest = row.latest || {}
    return {
      label: row.label || row.template_item_name || row.item_key || `#${row.template_item_id ?? row.id ?? ''}`,
      status: latest.status || row.status || (row.is_cleared ? 'COMPLETED' : 'PENDING'),
      remarks: latest.remarks || row.remarks || ''
    }
  })
})

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

function closeWeekendModal() {
  weekendModalOpen.value = false
  userWeekendHistory.value = null
}

function handleWeekendSaved(res) {
  weekendModalOpen.value = false
  const current = res?.current
  if (current && selectedEmployee.value) {
    selectedEmployee.value.assign_weekend = {
      weekends: current.weekends || [],
      start_month: current.start_month,
      end_month: current.end_month,
    }
  }

  userWeekendHistory.value = null
}

function openAssign(user) {
  selectedEmployee.value = user
  kpiModalOpen.value = true
}

function openExitModal(user) {
  if (!user?.id) return
  selectedExitUser.value = user
  exitForm.last_working_date = normalizeDate(user?.last_working_date)
  exitForm.exit_reason = user?.exit_reason || ''
  exitError.value = ''
  printError.value = ''
  showExitModal.value = true
}

function closeExitModal() {
  showExitModal.value = false
  exitError.value = ''
  printError.value = ''
}

function onExitKeydown(e) {
  if (e.key === 'Escape') closeExitModal()
}

const showPrintPreview = ref(false)

async function openPrintPreview() {
  if (!selectedExitUser.value?.id || !selectedExitUser.value?.last_working_date) return
  printLoading.value = true
  printError.value = ''
  try {
    clearanceStore.resetFilters?.()
    clearanceStore.setUser?.(selectedExitUser.value.id)
    await clearanceStore.fetch?.()
    showPrintPreview.value = true
  } catch (err) {
    printError.value = err?.response?.data?.message || 'Failed to load clearance for print.'
    toast.error(printError.value)
  } finally {
    printLoading.value = false
  }
}

async function executePrint() {
  document.body.classList.add('printing-exit')
  try {
    await nextTick()
    window.print()
  } finally {
    showPrintPreview.value = false
    setTimeout(() => document.body.classList.remove('printing-exit'), 0)
  }
}

function closePrintPreview() {
  showPrintPreview.value = false
}

async function saveExitInfo() {
  if (!selectedExitUser.value?.id) {
    exitError.value = 'Select a user first.'
    return
  }
  if (!exitForm.last_working_date) {
    exitError.value = 'Last working date is required.'
    return
  }

  exitLoading.value = true
  exitError.value = ''
  try {
    await apiClient.put(`/users/${selectedExitUser.value.id}/exit`, {
      last_working_date: exitForm.last_working_date,
      exit_reason: exitForm.exit_reason || null
    })

    const applyExit = (u) => {
      if (!u) return
      u.last_working_date = exitForm.last_working_date
      u.exit_reason = exitForm.exit_reason || ''
      u.is_inactive = isExitInactive(u)
    }

    applyExit(selectedExitUser.value)
    const list = Array.isArray(storeUsers.value) ? storeUsers.value : []
    const match = list.find((u) => u.id === selectedExitUser.value?.id)
    applyExit(match)

    showExitModal.value = false
    toast.success('Exit information updated.')
  } catch (err) {
    exitError.value = err?.response?.data?.message || 'Failed to update exit info.'
    toast.error(exitError.value)
  } finally {
    exitLoading.value = false
  }
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

watch(showExitModal, (open) => {
  if (open) {
    window.addEventListener('keydown', onExitKeydown)
  } else {
    window.removeEventListener('keydown', onExitKeydown)
    selectedExitUser.value = null
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onExitKeydown)
})
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
        <RouterLink :to="{ name: 'UserAdd', query: { company: route.query.company } }" class="btn-2">
          <span class="hidden md:flex">Add New</span>
          <i class="far fa-plus"></i>
        </RouterLink>
        <button type="button" @click="excelDownload" class="btn-3">
          <i class="far fa-file-excel text-2xl text-green-500"></i>Excel
        </button>
      </div>
    </div>

    <div v-if="isClearanceContext" class="rounded-md border border-indigo-200 bg-indigo-50 p-3 text-sm text-indigo-800">
      Select a user to view clearance & print.
    </div>

    <!-- filters -->
    <div
      class="sticky top-14 z-40 -mx-5 px-5 py-3 bg-white/90 supports-[backdrop-filter]:bg-white/70 backdrop-blur border-b border-zinc-200"
    >
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
              :class="filters.status === 'all'
                ? 'bg-zinc-800 text-white border-zinc-800'
                : 'bg-white border-zinc-300 hover:bg-zinc-50'"
              @click.prevent="filters.status = 'all'"
            >All</button>

            <button
              class="h-8 px-3 text-xs border-y transition"
              :class="filters.status === 'active'
                ? 'bg-emerald-600 text-white border-emerald-600'
                : 'bg-white border-zinc-300 hover:bg-zinc-50'"
              @click.prevent="filters.status = 'active'"
            >Active</button>

            <button
              class="h-8 px-3 text-xs rounded-r-md border transition"
              :class="filters.status === 'in_active'
                ? 'bg-rose-600 text-white border-rose-600'
                : 'bg-white border-zinc-300 hover:bg-zinc-50'"
              @click.prevent="filters.status = 'in_active'"
            >Inactive</button>
          </div>
        </EmployeeFilter>

        <!-- Quick search + Reset -->
        <div class="flex items-center gap-2 w-full md:w-auto">
          <input v-model.trim="filters.q" type="text" placeholder="Search name / phone / ID" class="input-1 h-8 text-sm w-full md:w-64" />
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
      <div v-if="Object.keys(groupedUsers).length === 0" class="text-center py-6 text-lg italic text-gray-500">
        No users found
      </div>

      <!-- per-company groups -->
      <div v-for="(users, companyName) in groupedUsers" :key="companyName" class="space-y-2">
        <!-- mobile cards -->
        <div class="grid grid-cols-1 gap-2 md:hidden">
          <div v-for="user in users" :key="user.id" class="rounded-lg border border-zinc-200 bg-white p-3 shadow-sm">
            <div class="flex items-start gap-3">
              <div class="h-10 w-10 shrink-0 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold">
                {{ (user?.name || '?').charAt(0).toUpperCase() }}
              </div>

              <div class="min-w-0">
                <div class="font-medium leading-5 truncate">{{ user?.name }}</div>
                <div class="text-[12px] text-zinc-500">ID: {{ user?.employee_id }} • {{ user?.designation?.title || '—' }}</div>
                <div class="mt-1 text-[12px] text-zinc-600">Shift: {{ shiftName(user) }}</div>
                <div class="text-[12px] text-zinc-600">Weekend: {{ weekendDays(user) }}</div>

                <div class="mt-1">
                  <span
                    class="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium"
                    :class="isInactiveUser(user) ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'"
                  >
                    {{ isInactiveUser(user) ? 'Inactive' : 'Active' }}
                  </span>
                </div>

                <div class="mt-1 text-[12px]">
                  <a class="underline" :href="'tel:' + user?.phone" @click.stop>{{ user?.phone || '—' }}</a>
                  <span class="mx-1">•</span>
                  <a class="underline" :href="'mailto:' + (user?.email || '')" @click.stop>{{ user?.email || 'নেই' }}</a>
                </div>

                <div class="mt-2 flex flex-wrap gap-1">
                  <button
                    class="btn-3 !px-2 !py-1"
                    :class="isInactiveUser(user) ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''"
                    :disabled="isInactiveUser(user)"
                    @click="openShift(user)"
                  >Shift</button>

                  <button
                    class="btn-3 !px-2 !py-1"
                    :class="isInactiveUser(user) ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''"
                    :disabled="isInactiveUser(user)"
                    @click="openWeekend(user)"
                  >Weekend</button>

                  <button
                    class="btn-3 !px-2 !py-1"
                    :class="isInactiveUser(user) ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''"
                    :disabled="isInactiveUser(user)"
                    @click="openAssign(user)"
                  >KPI</button>

                  <button
                    v-if="canManageExit"
                    type="button"
                    :class="exitBtnUI(user).cls"
                    @click="openExitModal(user)"
                    :title="hasExitInfo(user) ? 'Update exit info' : 'Set exit info'"
                  >
                    <i :class="exitBtnUI(user).icon"></i>
                    <span class="hidden lg:inline">{{ exitBtnUI(user).label }}</span>
                    <span class="lg:hidden">Exit</span>

                    <span
                      v-if="hasExitInfo(user)"
                      class="ml-1 rounded px-1.5 py-0.5 text-[10px] font-bold tabular-nums"
                      :class="exitBtnUI(user).badgeCls"
                    >
                      {{ normalizeDate(user?.last_working_date) }}
                    </span>
                  </button>

                  <RouterLink
                    :to="{ name: 'UserShow', params: { id: user.id }, query: { company: route.query.company } }"
                    class="btn-3 !px-2 !py-1"
                  >View</RouterLink>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- desktop table (UPDATED for sticky group title + sticky head) -->
        <div class="hidden md:block">
          <!-- ONE scroll container: group title + thead sticky works together -->
          <div class="group-scroll relative overflow-auto max-h-[70vh] rounded-md border border-zinc-200 bg-white shadow-sm">
            <!-- Sticky group title INSIDE scroll -->
            <div class="group-sticky sticky top-0 z-40 flex items-center justify-between h-11 px-3 bg-white/95 backdrop-blur border-b border-zinc-200">
              <h2 class="title-md">{{ companyName }} ({{ users.length }})</h2>
            </div>

            <table class="min-w-full table-auto">
              <thead class="user-group-table-head">
                <tr>
                  <th class="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">#</th>
                  <th class="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">Name</th>
                  <th class="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">Phone & Email</th>
                  <th class="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">Finger ID</th>
                  <th class="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">Joining</th>
                  <th class="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">Role</th>
                  <th class="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">Shift</th>
                  <th class="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">Weekend</th>
                  <th class="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">Status</th>
                  <th class="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">KPI Criteria</th>
                  <th class="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">Action</th>
                </tr>
              </thead>

              <tbody>
                <tr
                  v-for="(user, index) in users"
                  :key="user.id"
                  :class="['border-b text-sm border-gray-100 hover:bg-indigo-50/50', isInactiveUser(user) ? 'opacity-70' : '']"
                >
                  <td class="border border-gray-100 px-2 py-2">{{ index + 1 }}</td>

                  <td class="border border-gray-100 px-3 py-2">
                    <div class="flex items-start gap-2">
                      <div v-if="user.photo" class="h-8 w-8 shrink-0 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold overflow-hidden">
                        <img :src="user.photo" :alt="user?.name" class="h-8 w-8 rounded-full object-cover" />
                      </div>
                      <div v-else class="h-8 w-8 shrink-0 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold">
                        {{ (user?.name || '?').charAt(0).toUpperCase() }}
                      </div>

                      <div class="min-w-0">
                        <div class="font-medium truncate max-w-[220px]">{{ user?.name }}</div>
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

                  <td class="border border-gray-100 px-2 py-2 whitespace-nowrap">{{ user?.device_user_id }}</td>
                  <td class="border border-gray-100 px-2 py-2 whitespace-nowrap">{{ user?.joining_date }}</td>
                  <td class="border border-gray-100 px-2 py-2 whitespace-nowrap">{{ user?.role }}</td>

                  <!-- SHIFT -->
                  <td class="border border-gray-100 px-3 py-2 whitespace-nowrap">
                    <button
                      @click="openShift(user)"
                      :title="hasShift(user) ? 'Manage Shift' : 'Assign Shift'"
                      :class="[
                        'group inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium transition',
                        'focus:outline-none focus:ring-2 focus:ring-offset-1',
                        isInactiveUser(user) ? 'opacity-50 cursor-not-allowed pointer-events-none' : '',
                        hasShift(user)
                          ? 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 focus:ring-amber-300'
                          : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-white focus:ring-slate-300'
                      ]"
                      :disabled="isInactiveUser(user)"
                    >
                      <span class="ml-1 hidden lg:inline">{{ hasShift(user) ? 'Manage' : 'Assign' }}</span>
                      <span
                        class="ml-1 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1 text-[10px] font-semibold"
                        :class="hasShift(user) ? 'bg-amber-600 text-white' : 'bg-slate-200 text-slate-700'"
                      >
                        {{ user?.shifts_count || (hasShift(user) ? 1 : 0) }}
                      </span>
                    </button>
                    <div class="mt-1 text-[11px] text-gray-500">{{ shiftName(user) }}</div>
                  </td>

                  <!-- WEEKEND -->
                  <td class="border border-gray-100 px-3 py-2 whitespace-nowrap">
                    <button
                      @click="openWeekend(user)"
                      :title="hasWeekend(user) ? 'Manage Weekend' : 'Assign Weekend'"
                      :class="[
                        'group inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium transition',
                        'focus:outline-none focus:ring-2 focus:ring-offset-1',
                        isInactiveUser(user) ? 'opacity-50 cursor-not-allowed pointer-events-none' : '',
                        hasWeekend(user)
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 focus:ring-emerald-300'
                          : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-white focus:ring-slate-300'
                      ]"
                      :disabled="isInactiveUser(user)"
                    >
                      <span class="ml-1 hidden lg:inline">{{ hasWeekend(user) ? 'Manage' : 'Assign' }}</span>
                      <span
                        class="ml-1 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1 text-[10px] font-semibold"
                        :class="hasWeekend(user) ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'"
                      >
                        {{ user?.assign_weekends_count || (hasWeekend(user) ? user?.assign_weekend?.weekends?.length || 0 : 0) }}
                      </span>
                    </button>
                    <div class="mt-1 text-[11px] text-gray-500">{{ weekendDays(user) }}</div>
                  </td>

                  <!-- STATUS -->
                  <td class="border border-gray-100 px-2 py-2">
                    <span
                      class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
                      :class="isInactiveUser(user) ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'"
                    >
                      {{ isInactiveUser(user) ? 'Inactive' : 'Active' }}
                    </span>
                    <div v-if="isExitInactive(user)" class="mt-1 text-[11px] text-rose-600">
                      Exit: {{ normalizeDate(user?.last_working_date) }}
                    </div>
                  </td>

                  <!-- KPI -->
                  <td class="border border-gray-100 px-3 py-2 whitespace-nowrap">
                    <button
                      @click="openAssign(user)"
                      :title="(user?.criteria_assignments?.length || 0) > 0 ? 'Manage KPI criteria' : 'Assign KPI criteria'"
                      :class="[
                        'group inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium transition',
                        'focus:outline-none focus:ring-2 focus:ring-offset-1',
                        isInactiveUser(user) ? 'opacity-50 cursor-not-allowed pointer-events-none' : '',
                        (user?.criteria_assignments?.length || 0) > 0
                          ? 'border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 focus:ring-indigo-300'
                          : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-white focus:ring-slate-300'
                      ]"
                      :disabled="isInactiveUser(user)"
                    >
                      <span class="ml-1 hidden lg:inline">{{ (user?.criteria_assignments?.length || 0) > 0 ? 'Manage' : 'Assign' }}</span>
                      <span
                        class="ml-1 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1 text-[10px] font-semibold"
                        :class="(user?.criteria_assignments?.length || 0) > 0 ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-700'"
                      >
                        {{ user?.criteria_assignments?.length || 0 }}
                      </span>
                    </button>
                  </td>

                  <!-- ACTION -->
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
                        :class="['btn-icon', isInactiveUser(user) ? 'pointer-events-none opacity-50' : '']"
                        :tabindex="isInactiveUser(user) ? -1 : 0"
                        title="Edit"
                      >
                        <i class="far fa-edit"></i>
                      </RouterLink>

                      <RouterLink
                        :to="{ name: 'KpiReview', params: { employeeId: user.id } }"
                        :class="['btn-icon', isInactiveUser(user) ? 'pointer-events-none opacity-50' : '']"
                        :tabindex="isInactiveUser(user) ? -1 : 0"
                        title="KPI"
                      >
                        KPI
                      </RouterLink>

                      <button
                        v-if="canManageExit"
                        type="button"
                        :class="exitBtnUI(user).cls"
                        @click="openExitModal(user)"
                        :title="hasExitInfo(user) ? 'Update exit info' : 'Set exit info'"
                      >
                        <i :class="exitBtnUI(user).icon"></i>
                        <span class="hidden lg:inline">{{ exitBtnUI(user).label }}</span>
                        <span class="lg:hidden">Exit</span>

                        <span
                          v-if="hasExitInfo(user)"
                          class="ml-1 rounded px-1.5 py-0.5 text-[10px] font-bold tabular-nums"
                          :class="exitBtnUI(user).badgeCls"
                        >
                          {{ normalizeDate(user?.last_working_date) }}
                        </span>
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        
      </div>
    </div>

    <!-- Exit / Leave Modal -->
    <div v-if="showExitModal" class="fixed inset-0 z-[9999] flex items-center justify-center">
      <div class="absolute inset-0 bg-black/40" @click="closeExitModal"></div>

      <div class="relative w-full max-w-lg rounded-lg bg-white shadow-xl">
        <div class="flex items-center justify-between border-b px-4 py-3">
          <h3 class="text-lg font-semibold text-gray-900">User Exit Information</h3>
          <button type="button" class="text-gray-500 hover:text-gray-700" aria-label="Close" @click="closeExitModal">
            <i class="far fa-times"></i>
          </button>
        </div>

        <div class="space-y-4 p-4">
          <div class="text-sm text-gray-600">
            User: <span class="font-semibold text-gray-900">{{ selectedExitUser?.name || 'N/A' }}</span>
          </div>

          <div class="space-y-1">
            <label class="text-sm font-medium text-gray-700">
              Last Working Date <span class="text-red-500">*</span>
            </label>
            <FlexibleDatePicker
              v-model="exitDatePickerValue"
              :show-year="false"
              :show-month="false"
              :show-date="true"
              label="Date"
              class="w-full"
              required
            />
          </div>

          <div class="space-y-1">
            <label class="text-sm font-medium text-gray-700">Exit Reason</label>
            <textarea
              v-model.trim="exitForm.exit_reason"
              class="input-1 w-full min-h-[90px]"
              placeholder="Optional"
            ></textarea>
          </div>

          <div v-if="exitError" class="rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-700">
            {{ exitError }}
          </div>
          <div v-if="printError" class="rounded-md border border-amber-200 bg-amber-50 p-2 text-sm text-amber-800">
            {{ printError }}
          </div>
        </div>

        <div class="flex items-center justify-end gap-2 border-t bg-gray-50 px-4 py-3">
          <button type="button" class="btn-3" @click="closeExitModal">Cancel</button>
          <button
            type="button"
            class="btn-2"
            :disabled="printLoading || !selectedExitUser?.last_working_date"
            @click="openPrintPreview"
            title="Print Exit + Clearance"
          >
            <span v-if="printLoading">Preparing...</span>
            <span v-else>Print Exit Sheet</span>
          </button>
          <button type="button" class="btn-1" :disabled="exitLoading" @click="saveExitInfo">
            <span v-if="exitLoading">Saving...</span>
            <span v-else>Save Exit Info</span>
          </button>
        </div>
      </div>
    </div>

    <div v-if="showPrintPreview" class="fixed inset-0 z-[9998] flex items-center justify-center">
      <div class="absolute inset-0 bg-black/40" @click="closePrintPreview"></div>
      <div class="relative w-full max-w-2xl rounded-lg bg-white shadow-xl">
        <div class="flex items-center justify-between border-b px-4 py-3">
          <h3 class="text-lg font-semibold text-gray-900">Exit & Clearance Preview</h3>
          <button
            type="button"
            class="text-gray-500 hover:text-gray-700"
            aria-label="Close"
            @click="closePrintPreview"
          >
            <i class="far fa-times"></i>
          </button>
        </div>
        <div class="space-y-4 p-4">
          <div class="space-y-1 text-sm text-gray-600">
            <div>
              <span class="text-gray-500">User:</span>
              <span class="font-semibold text-gray-900">{{ selectedExitUser?.name || 'N/A' }}</span>
            </div>
            <div>
              <span class="text-gray-500">Employee ID:</span>
              <span class="font-medium">{{ selectedExitUser?.employee_id || 'N/A' }}</span>
            </div>
            <div>
              <span class="text-gray-500">Department:</span>
              <span class="font-medium">{{ selectedExitUser?.department?.name || 'N/A' }}</span>
            </div>
            <div>
              <span class="text-gray-500">Last Working Date:</span>
              <span class="font-medium">{{ normalizeDate(selectedExitUser?.last_working_date) || 'N/A' }}</span>
            </div>
          </div>
          <div>
            <p class="text-sm text-gray-600">The clearance summary will be printed based on the latest data below.</p>
          </div>
          <div v-if="printError" class="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {{ printError }}
          </div>
        </div>
        <div class="flex items-center justify-end gap-2 border-t px-4 py-3 bg-gray-50">
          <button type="button" class="btn-3" @click="closePrintPreview">Close</button>
          <button
            type="button"
            class="btn-1"
            @click="executePrint"
          >
            Print Exit Sheet
          </button>
        </div>
      </div>
    </div>

    <!-- Print Area (Exit + Clearance Summary) -->
    <div id="print-area" class="print-area">
      <div class="text-center">
        <h1 class="text-xl font-bold tracking-wide">{{ printCompanyName }}</h1>
        <p class="text-xs text-gray-500">User Exit & Clearance Summary</p>
      </div>

      <div class="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div><span class="text-gray-500">Name:</span> <span class="font-medium">{{ printUser?.name || 'N/A' }}</span></div>
        <div><span class="text-gray-500">Employee ID:</span> <span class="font-medium">{{ printUser?.employee_id || 'N/A' }}</span></div>
        <div><span class="text-gray-500">Department:</span> <span class="font-medium">{{ printUser?.department?.name || 'N/A' }}</span></div>
        <div><span class="text-gray-500">Designation:</span> <span class="font-medium">{{ printUser?.designation?.title || 'N/A' }}</span></div>
      </div>

      <div class="mt-4 rounded-md border border-gray-200 p-3 text-sm">
        <div><span class="text-gray-500">Last Working Date:</span> <span class="font-medium">{{ normalizeDate(printUser?.last_working_date) || 'N/A' }}</span></div>
        <div class="mt-1"><span class="text-gray-500">Exit Reason:</span> <span class="font-medium">{{ printUser?.exit_reason || 'N/A' }}</span></div>
      </div>

      <div class="mt-4">
        <div class="mb-2 text-sm font-semibold text-gray-700">Clearance Items Summary</div>
        <div v-if="clearanceLoading" class="text-sm text-gray-600">Loading clearance...</div>
        <div v-else-if="clearanceError" class="text-sm text-rose-600">{{ clearanceError }}</div>

        <table v-else class="w-full border border-gray-300 text-sm" style="border-collapse:collapse">
          <thead>
            <tr class="bg-gray-100 text-gray-700">
              <th class="border border-gray-300 px-2 py-1 text-left">Item</th>
              <th class="border border-gray-300 px-2 py-1 text-left w-[120px]">Status</th>
              <th class="border border-gray-300 px-2 py-1 text-left">Remarks</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, idx) in printClearanceRows" :key="idx">
              <td class="border border-gray-300 px-2 py-1">{{ row.label || 'N/A' }}</td>
              <td class="border border-gray-300 px-2 py-1">{{ row.status || 'N/A' }}</td>
              <td class="border border-gray-300 px-2 py-1">{{ row.remarks || '—' }}</td>
            </tr>
            <tr v-if="!printClearanceRows.length">
              <td colspan="3" class="border border-gray-300 px-2 py-4 text-center text-gray-500">
                No clearance items found.
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="mt-6 text-xs text-gray-500">Printed: {{ new Date().toLocaleString() }}</div>
    </div>

    <!-- Modals (once per group ok, but better globally; keeping as your style) -->
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
          @saved="handleWeekendSaved"
          @close="closeWeekendModal"
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
</template>

<style>
.print-area {
  position: absolute;
  left: -9999px;
  top: 0;
  width: 100%;
}

@media print {
  body.printing-exit * {
    visibility: hidden;
  }
  body.printing-exit #print-area,
  body.printing-exit #print-area * {
    visibility: visible;
  }
  body.printing-exit #print-area {
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    padding: 12mm;
    background: white;
  }
  body.printing-exit {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  body.printing-clearance * {
    visibility: hidden;
  }
  body.printing-clearance #print-clearance,
  body.printing-clearance #print-clearance * {
    visibility: visible;
  }
  body.printing-clearance #print-clearance {
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    padding: 12mm;
  }
  body.printing-clearance {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
}
</style>

<style scoped>
/* keep sticky math in one place */
.group-scroll {
  --group-header-h: 44px; /* h-11 */
}

/* table head sticky: sits under group title */
.user-group-table-head th {
  position: sticky;
  top: var(--group-header-h);
  z-index: 30;
  background: #f8fafc;
  border-bottom: 1px solid #e5e7eb;
  text-align: left;
}

/* optional: nicer row align */
table td {
  vertical-align: middle;
}
</style>
