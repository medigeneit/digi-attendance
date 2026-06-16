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
  return [u?.name, u?.phone, u?.employee_id, u?.company?.name, u?.unit?.name, u?.department?.name, u?.designation?.title].some((val) =>
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
  q: String(route.query.q ?? ''),
  no_unit: route.query.no_unit === '1',
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
  if (filters.no_unit) q.no_unit = '1'
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
  loadTableColumnVisibility()
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

const hasNoUnit = (u) => !u?.unit_id && !u?.unit?.id

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
    if (filters.no_unit && !hasNoUnit(u)) return false
    return true
  })
})

/* Summary chips */
const summary = computed(() => {
  const list = filteredUsers.value
  const allList = Array.isArray(storeUsers.value) ? storeUsers.value : []
  const total = list.length
  const active = list.filter((u) => Number(u?.is_active ?? 0) === 1).length
  const withShift = list.filter((u) => hasShift(u)).length
  const withWeekend = list.filter((u) => hasWeekend(u)).length
  const withoutUnit = allList.filter((u) => hasNoUnit(u) && statusMatches(u)).length
  return {
    total,
    active,
    inactive: total - active,
    withShift,
    withoutShift: total - withShift,
    withWeekend,
    withoutWeekend: total - withWeekend,
    withoutUnit,
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

const TABLE_COLUMNS = [
  { key: 'sl', label: 'SL', locked: true },
  { key: 'employee', label: 'Employee Info', locked: true },
  { key: 'employeeId', label: 'Employee ID', defaultVisible: false },
  { key: 'department', label: 'Department', defaultVisible: false },
  { key: 'designation', label: 'Designation', defaultVisible: false },
  { key: 'unit', label: 'Unit', defaultVisible: true },
  { key: 'lineType', label: 'Line Type', defaultVisible: false },
  { key: 'contact', label: 'Contact', defaultVisible: false },
  { key: 'phone', label: 'Phone' },
  { key: 'email', label: 'Email' },
  { key: 'fingerId', label: 'Finger ID' },
  { key: 'joining', label: 'Joining' },
  { key: 'role', label: 'Role' },
  { key: 'exitDate', label: 'Exit Date', defaultVisible: false },
  { key: 'shift', label: 'Shift' },
  { key: 'weekend', label: 'Weekend' },
  { key: 'status', label: 'Status' },
  { key: 'kpi', label: 'KPI' },
  { key: 'actions', label: 'Actions', locked: true },
]

const TABLE_COLUMN_STORAGE_KEY = 'settings.user-list.table-columns.v1'
const tableColumnVisible = reactive(Object.fromEntries(TABLE_COLUMNS.map((column) => [column.key, column.defaultVisible !== false])))
const visibleTableColumns = computed(() => TABLE_COLUMNS.filter((column) => tableColumnVisible[column.key]))
const showColumnMenu = ref(false)

function isTableColumnVisible(key) {
  return !!tableColumnVisible[key]
}

function normalizeTableColumnVisibility(next = {}) {
  for (const column of TABLE_COLUMNS) {
    tableColumnVisible[column.key] = column.locked ? true : next[column.key] ?? column.defaultVisible !== false
  }
}

function loadTableColumnVisibility() {
  try {
    const saved = JSON.parse(localStorage.getItem(TABLE_COLUMN_STORAGE_KEY) || '{}')
    normalizeTableColumnVisibility(saved)
  } catch {
    normalizeTableColumnVisibility()
  }
}

watch(
  tableColumnVisible,
  (value) => {
    for (const column of TABLE_COLUMNS) {
      if (column.locked) value[column.key] = true
    }
    localStorage.setItem(TABLE_COLUMN_STORAGE_KEY, JSON.stringify({ ...value }))
  },
  { deep: true }
)

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
  filters.no_unit = false
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
  <div class="min-h-screen bg-slate-50 px-3 py-3 text-slate-800 md:px-5">
    <!-- header -->
    <div class="mb-3 rounded-md border border-slate-200 bg-white shadow-sm">
      <div class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
        <div class="flex min-w-0 items-center gap-3">
          <button
            class="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            title="Back"
            @click="goBack"
          >
            <i class="far fa-arrow-left"></i>
          </button>
          <div class="min-w-0">
            <div class="text-[10px] font-bold uppercase tracking-[0.22em] text-blue-700">Settings / Employee Master</div>
            <h1 class="mt-0.5 truncate text-xl font-semibold leading-tight text-slate-950">Employee Directory</h1>
            <p class="mt-1 text-xs text-slate-500">
              Shift, weekend, KPI, status and exit controls in one operational grid.
            </p>
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <button
            type="button"
            @click="excelDownload"
            class="inline-flex h-8 items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
          >
            <i class="far fa-file-excel"></i>
            Excel
          </button>
          <RouterLink
            :to="{ name: 'UserAdd', query: { company: route.query.company } }"
            class="inline-flex h-8 items-center gap-2 rounded-md bg-blue-700 px-3 text-xs font-semibold text-white shadow-sm hover:bg-blue-800"
          >
            <i class="far fa-user-plus"></i>
            Add Employee
          </RouterLink>
        </div>
      </div>
    </div>

    <div v-if="isClearanceContext" class="mb-3 rounded-md border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm text-indigo-800">
      Select a user to view clearance & print.
    </div>

    <!-- filters -->
    <div
      class="sticky top-14 z-40 mb-3 rounded-md border border-slate-200 bg-white/95 shadow-sm supports-[backdrop-filter]:bg-white/80 backdrop-blur"
    >
      <div class="flex flex-col gap-2 border-b border-slate-100 p-3 md:flex-row md:items-end">
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
          <div class="flex items-center overflow-hidden rounded-md border border-slate-200 bg-slate-50">
            <button
              class="h-8 px-3 text-xs font-semibold transition"
              :class="filters.status === 'all'
                ? 'bg-slate-800 text-white'
                : 'bg-white text-slate-600 hover:bg-slate-50'"
              @click.prevent="filters.status = 'all'"
            >All</button>

            <button
              class="h-8 border-l border-slate-200 px-3 text-xs font-semibold transition"
              :class="filters.status === 'active'
                ? 'bg-emerald-600 text-white'
                : 'bg-white text-slate-600 hover:bg-slate-50'"
              @click.prevent="filters.status = 'active'"
            >Active</button>

            <button
              class="h-8 border-l border-slate-200 px-3 text-xs font-semibold transition"
              :class="filters.status === 'in_active'
                ? 'bg-rose-600 text-white'
                : 'bg-white text-slate-600 hover:bg-slate-50'"
              @click.prevent="filters.status = 'in_active'"
            >Inactive</button>
          </div>

          <!-- No Unit filter toggle -->
          <button
            type="button"
            class="inline-flex h-8 items-center gap-1.5 rounded-md border px-3 text-xs font-semibold transition"
            :class="filters.no_unit
              ? 'border-orange-400 bg-orange-500 text-white shadow-sm'
              : 'border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100'"
            :title="filters.no_unit ? 'Showing only employees without unit' : 'Filter: no unit assigned'"
            @click.prevent="filters.no_unit = !filters.no_unit"
          >
            <i class="far fa-exclamation-triangle text-[10px]"></i>
            No Unit
            <span
              v-if="summary.withoutUnit > 0"
              class="inline-flex h-4 min-w-[18px] items-center justify-center rounded-full px-1 text-[9px] font-bold"
              :class="filters.no_unit ? 'bg-white/30 text-white' : 'bg-orange-200 text-orange-800'"
            >{{ summary.withoutUnit }}</span>
          </button>
        </EmployeeFilter>

        <!-- Quick search + Reset -->
        <div class="flex w-full items-center gap-2 md:w-auto">
          <div class="relative w-full md:w-72">
            <i class="far fa-search pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400"></i>
            <input
              v-model.trim="filters.q"
              type="text"
              placeholder="Search name, phone, ID"
              class="h-8 w-full rounded-md border border-slate-200 bg-white pl-8 pr-3 text-xs text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
          </div>
          <button
            type="button"
            @click="resetFilters"
            class="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            title="Reset filters"
          >
            <i class="far fa-undo"></i> Reset
          </button>
          <div class="relative">
            <button
              type="button"
              class="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md border border-blue-200 bg-blue-50 px-3 text-xs font-semibold text-blue-700 hover:bg-blue-100"
              title="Show/hide table columns"
              @click="showColumnMenu = !showColumnMenu"
            >
              <i class="far fa-table-columns"></i>
              Columns
            </button>
            <div
              v-if="showColumnMenu"
              class="absolute right-0 top-9 z-50 max-h-80 w-56 overflow-y-auto rounded-md border border-slate-200 bg-white p-2 text-xs shadow-lg"
            >
              <div class="mb-1 border-b border-slate-100 px-2 pb-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                Table columns
              </div>
              <label
                v-for="column in TABLE_COLUMNS"
                :key="column.key"
                class="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-slate-700 hover:bg-slate-50"
                :class="column.locked ? 'cursor-not-allowed opacity-60' : ''"
              >
                <input
                  v-model="tableColumnVisible[column.key]"
                  type="checkbox"
                  class="h-3.5 w-3.5 rounded border-slate-300 text-blue-600"
                  :disabled="column.locked"
                />
                <span class="flex-1">{{ column.label }}</span>
                <i v-if="column.locked" class="far fa-lock text-[10px] text-slate-400"></i>
              </label>
            </div>
          </div>
        </div>
      </div>

      <!-- summary chips -->
      <div class="grid gap-px bg-slate-100 text-xs sm:grid-cols-2 lg:grid-cols-8">
        <div class="bg-white px-3 py-2"><div class="text-[10px] font-bold uppercase text-slate-400">Total</div><div class="text-base font-semibold text-slate-950">{{ summary.total }}</div></div>
        <div class="bg-white px-3 py-2"><div class="text-[10px] font-bold uppercase text-slate-400">Active</div><div class="text-base font-semibold text-emerald-700">{{ summary.active }}</div></div>
        <div class="bg-white px-3 py-2"><div class="text-[10px] font-bold uppercase text-slate-400">Inactive</div><div class="text-base font-semibold text-rose-700">{{ summary.inactive }}</div></div>
        <div class="bg-white px-3 py-2"><div class="text-[10px] font-bold uppercase text-slate-400">With Shift</div><div class="text-base font-semibold text-amber-700">{{ summary.withShift }}</div></div>
        <div class="bg-white px-3 py-2"><div class="text-[10px] font-bold uppercase text-slate-400">No Shift</div><div class="text-base font-semibold text-slate-700">{{ summary.withoutShift }}</div></div>
        <div class="bg-white px-3 py-2"><div class="text-[10px] font-bold uppercase text-slate-400">Weekend</div><div class="text-base font-semibold text-emerald-700">{{ summary.withWeekend }}</div></div>
        <div class="bg-white px-3 py-2"><div class="text-[10px] font-bold uppercase text-slate-400">No Weekend</div><div class="text-base font-semibold text-slate-700">{{ summary.withoutWeekend }}</div></div>
        <button
          type="button"
          class="px-3 py-2 text-left transition"
          :class="filters.no_unit ? 'bg-orange-500' : 'bg-white hover:bg-orange-50'"
          :title="filters.no_unit ? 'Click to clear No Unit filter' : 'Click to filter employees without unit'"
          @click="filters.no_unit = !filters.no_unit"
        >
          <div class="text-[10px] font-bold uppercase" :class="filters.no_unit ? 'text-orange-100' : 'text-orange-500'">No Unit</div>
          <div class="text-base font-semibold" :class="filters.no_unit ? 'text-white' : 'text-orange-600'">{{ summary.withoutUnit }}</div>
        </button>
      </div>
    </div>

    <!-- loader -->
    <div v-if="isLoading" class="rounded-md border border-slate-200 bg-white py-10 text-center">
      <LoaderView />
    </div>

    <!-- results -->
    <div v-else class="space-y-3">
      <div v-if="Object.keys(groupedUsers).length === 0" class="rounded-md border border-dashed border-slate-300 bg-white px-4 py-10 text-center">
        <div class="mx-auto flex h-10 w-10 items-center justify-center rounded-md bg-slate-100 text-slate-500">
          <i class="far fa-user-slash"></i>
        </div>
        <div class="mt-3 text-sm font-semibold text-slate-800">No users found</div>
        <div class="mt-1 text-xs text-slate-500">Adjust filters or reset the search criteria.</div>
      </div>

      <!-- per-company groups -->
      <section v-for="(users, companyName) in groupedUsers" :key="companyName" class="rounded-md border border-slate-200 bg-white shadow-sm">
        <!-- mobile cards -->
        <div class="grid grid-cols-1 gap-2 md:hidden">
          <div v-for="user in users" :key="user.id" class="rounded-md border border-slate-200 bg-white p-3 shadow-sm">
            <div class="flex items-start gap-3">
              <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-blue-50 font-bold text-blue-700">
                {{ (user?.name || '?').charAt(0).toUpperCase() }}
              </div>

              <div class="min-w-0">
                <div class="truncate font-semibold leading-5 text-slate-950">{{ user?.name }}</div>
                <div class="text-[12px] text-zinc-500">ID: {{ user?.employee_id }} • {{ user?.designation?.title || '—' }}</div>
                <div class="mt-1 text-[12px] text-zinc-600">Shift: {{ shiftName(user) }}</div>
                <div class="text-[12px] text-zinc-600">Weekend: {{ weekendDays(user) }}</div>

                <div class="mt-1">
                  <span
                    class="inline-flex items-center rounded px-2 py-0.5 text-[11px] font-semibold"
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
                    class="rounded border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
                    :class="isInactiveUser(user) ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''"
                    :disabled="isInactiveUser(user)"
                    @click="openShift(user)"
                  >Shift</button>

                  <button
                    class="rounded border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
                    :class="isInactiveUser(user) ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''"
                    :disabled="isInactiveUser(user)"
                    @click="openWeekend(user)"
                  >Weekend</button>

                  <button
                    class="rounded border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
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
                    class="rounded border border-blue-200 bg-blue-50 px-2 py-1 text-[11px] font-semibold text-blue-700 hover:bg-blue-100"
                  >View</RouterLink>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- desktop table (UPDATED for sticky group title + sticky head) -->
        <div class="hidden md:block">
          <div class="group-sticky sticky top-[11.5rem] z-30 flex h-9 items-center justify-between border-b border-blue-200 bg-blue-700 px-3 text-white">
            <h2 class="truncate text-xs font-bold uppercase tracking-wide">{{ companyName }}</h2>
            <span class="shrink-0 rounded bg-white/15 px-2 py-0.5 text-[10px] font-semibold">{{ users.length }} employees</span>
          </div>
          <!-- ONE scroll container: group title + thead sticky works together -->
          <div class="group-scroll relative bg-white">
            <table class="min-w-full table-auto text-slate-700">
              <thead class="user-group-table-head">
                <tr>
                  <th
                    v-for="column in visibleTableColumns"
                    :key="column.key"
                    class="px-2 py-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-500"
                    :class="column.key === 'sl' ? 'text-center' : ''"
                  >
                    {{ column.label }}
                  </th>
                </tr>
              </thead>

              <tbody>
                <tr
                  v-for="(user, index) in users"
                  :key="user.id"
                  :class="[
                    'border-b border-slate-100 text-[11px]',
                    isInactiveUser(user) ? 'opacity-70' : '',
                    hasNoUnit(user) ? 'bg-orange-50/60 hover:bg-orange-50' : 'hover:bg-blue-50/60',
                  ]"
                >
                  <td v-if="isTableColumnVisible('sl')" class="px-2 py-1.5 text-center font-semibold text-slate-500">{{ index + 1 }}</td>

                  <td v-if="isTableColumnVisible('employee')" class="px-2 py-1.5">
                    <div class="flex items-start gap-1.5">
                      <div v-if="user.photo" class="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded bg-blue-50 font-bold text-blue-700">
                        <img :src="user.photo" :alt="user?.name" class="h-7 w-7 rounded object-cover" />
                      </div>
                      <div v-else class="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-blue-50 font-bold text-blue-700">
                        {{ (user?.name || '?').charAt(0).toUpperCase() }}
                      </div>

                      <div class="min-w-0">
                        <div class="max-w-[260px] truncate font-semibold leading-4 text-slate-950">
                          {{ user?.name || '-' }}
                          <span v-if="user?.bn_name" class="font-medium text-slate-500">({{ user.bn_name }})</span>
                        </div>
                        <div class="text-[11px] text-zinc-500">{{ user?.designation?.title || '—' }}</div>
                        <div class="hidden text-[10px] text-zinc-500">ID: {{ user?.employee_id }}</div>
                      </div>
                    </div>
                  </td>

                  <td v-if="isTableColumnVisible('employeeId')" class="whitespace-nowrap px-2 py-1.5 font-semibold text-slate-700">
                    {{ user?.employee_id || '-' }}
                  </td>
                  <td v-if="isTableColumnVisible('department')" class="whitespace-nowrap px-2 py-1.5">
                    {{ user?.department?.name || '-' }}
                  </td>
                  <td v-if="isTableColumnVisible('designation')" class="whitespace-nowrap px-2 py-1.5">
                    {{ user?.designation?.title || '-' }}
                  </td>
                  <td v-if="isTableColumnVisible('unit')" class="whitespace-nowrap px-2 py-1.5">
                    <span v-if="user?.unit?.name">{{ user.unit.name }}</span>
                    <span v-else class="inline-flex items-center gap-1 rounded border border-orange-200 bg-orange-50 px-1.5 py-0.5 text-[10px] font-semibold text-orange-600">
                      <i class="far fa-exclamation-triangle text-[9px]"></i> Not Assigned
                    </span>
                  </td>
                  <td v-if="isTableColumnVisible('lineType')" class="whitespace-nowrap px-2 py-1.5">
                    {{ user?.type || '-' }}
                  </td>

                  <td v-if="isTableColumnVisible('contact')" class="px-2 py-1.5">
                    <div class="flex items-center gap-2">
                      <a class="underline" :href="'tel:' + user?.phone">{{ user?.phone || '—' }}</a>
                    </div>
                    <div class="flex items-center gap-2">
                      <a class="underline" :href="'mailto:' + (user?.email || '')">{{ user?.email || 'নেই' }}</a>
                    </div>
                  </td>

                  <td v-if="isTableColumnVisible('phone')" class="whitespace-nowrap px-2 py-1.5">
                    <a v-if="user?.phone" class="underline" :href="'tel:' + user.phone">{{ user.phone }}</a>
                    <span v-else>-</span>
                  </td>
                  <td v-if="isTableColumnVisible('email')" class="whitespace-nowrap px-2 py-1.5">
                    <a v-if="user?.email" class="underline" :href="'mailto:' + user.email">{{ user.email }}</a>
                    <span v-else>-</span>
                  </td>
                  <td v-if="isTableColumnVisible('fingerId')" class="whitespace-nowrap px-2 py-1.5">{{ user?.device_user_id || '-' }}</td>
                  <td v-if="isTableColumnVisible('joining')" class="whitespace-nowrap px-2 py-1.5">{{ user?.joining_date || '-' }}</td>
                  <td v-if="isTableColumnVisible('role')" class="whitespace-nowrap px-2 py-1.5">{{ user?.role || '-' }}</td>
                  <td v-if="isTableColumnVisible('exitDate')" class="whitespace-nowrap px-2 py-1.5">
                    {{ normalizeDate(user?.last_working_date) || '-' }}
                  </td>

                  <!-- SHIFT -->
                  <td v-if="isTableColumnVisible('shift')" class="whitespace-nowrap px-2 py-1.5">
                    <button
                      @click="openShift(user)"
                      :title="hasShift(user) ? 'Manage Shift' : 'Assign Shift'"
                      :class="[
                        'group inline-flex h-6 items-center rounded border px-1.5 text-[10px] font-semibold transition',
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
                        class="ml-1 inline-flex h-4 min-w-[18px] items-center justify-center rounded-full px-1 text-[9px] font-semibold"
                        :class="hasShift(user) ? 'bg-amber-600 text-white' : 'bg-slate-200 text-slate-700'"
                      >
                        {{ user?.shifts_count || (hasShift(user) ? 1 : 0) }}
                      </span>
                    </button>
                    <div class="mt-0.5 max-w-[130px] truncate text-[10px] text-slate-500">{{ shiftName(user) }}</div>
                  </td>

                  <!-- WEEKEND -->
                  <td v-if="isTableColumnVisible('weekend')" class="whitespace-nowrap px-2 py-1.5">
                    <button
                      @click="openWeekend(user)"
                      :title="hasWeekend(user) ? 'Manage Weekend' : 'Assign Weekend'"
                      :class="[
                        'group inline-flex h-6 items-center rounded border px-1.5 text-[10px] font-semibold transition',
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
                        class="ml-1 inline-flex h-4 min-w-[18px] items-center justify-center rounded-full px-1 text-[9px] font-semibold"
                        :class="hasWeekend(user) ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'"
                      >
                        {{ user?.assign_weekends_count || (hasWeekend(user) ? user?.assign_weekend?.weekends?.length || 0 : 0) }}
                      </span>
                    </button>
                    <div class="mt-0.5 max-w-[130px] truncate text-[10px] text-slate-500">{{ weekendDays(user) }}</div>
                  </td>

                  <!-- STATUS -->
                  <td v-if="isTableColumnVisible('status')" class="px-2 py-1.5">
                    <span
                      class="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold"
                      :class="isInactiveUser(user) ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'"
                    >
                      {{ isInactiveUser(user) ? 'Inactive' : 'Active' }}
                    </span>
                    <div v-if="isExitInactive(user)" class="mt-0.5 text-[10px] text-rose-600">
                      Exit: {{ normalizeDate(user?.last_working_date) }}
                    </div>
                  </td>

                  <!-- KPI -->
                  <td v-if="isTableColumnVisible('kpi')" class="whitespace-nowrap px-2 py-1.5">
                    <button
                      @click="openAssign(user)"
                      :title="(user?.criteria_assignments?.length || 0) > 0 ? 'Manage KPI criteria' : 'Assign KPI criteria'"
                      :class="[
                        'group inline-flex h-6 items-center rounded border px-1.5 text-[10px] font-semibold transition',
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
                        class="ml-1 inline-flex h-4 min-w-[18px] items-center justify-center rounded-full px-1 text-[9px] font-semibold"
                        :class="(user?.criteria_assignments?.length || 0) > 0 ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-700'"
                      >
                        {{ user?.criteria_assignments?.length || 0 }}
                      </span>
                    </button>
                  </td>

                  <!-- ACTION -->
                  <td v-if="isTableColumnVisible('actions')" class="px-2 py-1.5">
                    <div class="flex items-center gap-1">
                      <RouterLink
                        :to="{ name: 'UserShow', params: { id: user.id }, query: { company: route.query.company } }"
                        class="btn-icon !h-7 !w-7"
                        title="View"
                      >
                        <i class="far fa-eye"></i>
                      </RouterLink>

                      <RouterLink
                        :to="{ name: 'UserEdit', params: { id: user.id }, query: { company: route.query.company } }"
                        :class="['btn-icon !h-7 !w-7', isInactiveUser(user) ? 'pointer-events-none opacity-50' : '']"
                        :tabindex="isInactiveUser(user) ? -1 : 0"
                        title="Edit"
                      >
                        <i class="far fa-edit"></i>
                      </RouterLink>

                      <RouterLink
                        :to="{ name: 'KpiReview', params: { employeeId: user.id } }"
                        :class="['btn-icon !h-7 !min-w-7 !px-2 !text-[10px]', isInactiveUser(user) ? 'pointer-events-none opacity-50' : '']"
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

        
      </section>
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
.group-scroll {
  --group-sticky-top: 11.5rem;
  --group-header-h: 36px;
}

.user-group-table-head th {
  position: sticky;
  top: calc(var(--group-sticky-top) + var(--group-header-h));
  z-index: 20;
  background: #f8fafc;
  border-bottom: 1px solid #e5e7eb;
  text-align: left;
}

.user-group-table-head th:first-child {
  text-align: center;
}

/* optional: nicer row align */
table td {
  vertical-align: middle;
}
</style>
