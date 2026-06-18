<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'
import { storeToRefs } from 'pinia'
import EmployeeFilter from '@/components/common/EmployeeFilter.vue'
import FlexibleDatePicker from '@/components/FlexibleDatePicker.vue'
import MultiselectDropdown from '@/components/MultiselectDropdown.vue'
import PaginationBar from '@/components/PaginationBar.vue'
import { formatCurrency, toNum } from '@/utils/currency'
import { usePayrollArrearEntryStore } from '@/stores/payrollArrearEntry'
import { useUserStore } from '@/stores/user'

const route = useRoute()
const router = useRouter()
const toast = useToast()
const arrearStore = usePayrollArrearEntryStore()
const userStore = useUserStore()
const { list, loading, error, pagination } = storeToRefs(arrearStore)

const defaultMonth = () => new Date().toISOString().slice(0, 7)
const monthToPeriod = (value) => {
  const month = String(value || '').slice(0, 7)
  if (!/^\d{4}-\d{2}$/.test(month)) return { year: null, month: null, day: 1 }
  return { year: Number(month.slice(0, 4)), month: Number(month.slice(5, 7)), day: 1 }
}
const periodToMonth = (value) => {
  if (!value?.year || !value?.month) return ''
  return `${value.year}-${String(value.month).padStart(2, '0')}`
}
const parseQueryInt = (value, fallback = 1) => {
  const parsed = Number.parseInt(String(value ?? ''), 10)
  return Number.isNaN(parsed) ? fallback : parsed
}

const filters = ref({
  salary_month: defaultMonth(),
  company_id: '',
  department_id: '',
  line_type: 'all',
  user_id: '',
  status: 'pending',
  page: 1,
  per_page: 15,
})
const deletingId = ref(null)
const showFilters = ref(false)

const salaryMonthPeriod = computed({
  get: () => monthToPeriod(filters.value.salary_month),
  set: (value) => {
    filters.value.salary_month = periodToMonth(value)
  },
})

const statusTabs = [
  { value: 'pending', label: 'Pending', dot: 'bg-amber-400' },
  { value: 'applied', label: 'Applied', dot: 'bg-emerald-400' },
  { value: '', label: 'All', dot: 'bg-slate-400' },
]

const buildFilterParams = () => {
  const params = { ...filters.value }
  if (!params.salary_month) delete params.salary_month
  if (!params.company_id) delete params.company_id
  if (!params.department_id) delete params.department_id
  if (!params.line_type || params.line_type === 'all') delete params.line_type
  if (!params.user_id) delete params.user_id
  if (!params.status) delete params.status
  return params
}

const hydrateFiltersFromQuery = () => {
  const q = route.query || {}
  filters.value = {
    ...filters.value,
    salary_month: q.salary_month ? String(q.salary_month).slice(0, 7) : defaultMonth(),
    company_id: q.company_id ? String(q.company_id) : '',
    department_id: q.department_id ? String(q.department_id) : '',
    line_type: q.line_type ? String(q.line_type) : 'all',
    user_id: q.user_id || q.employee_id ? String(q.user_id || q.employee_id) : '',
    status: q.status ? String(q.status) : 'pending',
    page: parseQueryInt(q.page, 1),
    per_page: parseQueryInt(q.per_page, 15),
  }
}

const load = async () => {
  const params = buildFilterParams()
  await router.replace({ query: params })
  await arrearStore.fetchList(params)
}

onMounted(async () => {
  hydrateFiltersFromQuery()
  await load()
  userStore.fetchTypeWiseEmployees({ status: 'active' })
})

const onListFilterChange = (payload = {}) => {
  filters.value = {
    ...filters.value,
    company_id: payload.company_id || '',
    department_id: payload.department_id || '',
    line_type: payload.line_type || 'all',
    user_id: payload.employee_id || '',
    page: 1,
  }
  load()
}

const setTab = (status) => {
  filters.value.status = status
  filters.value.page = 1
  load()
}

const resetFilters = () => {
  filters.value = {
    salary_month: defaultMonth(),
    company_id: '',
    department_id: '',
    line_type: 'all',
    user_id: '',
    status: 'pending',
    page: 1,
    per_page: 15,
  }
  load()
}

const deleteEntry = async (item) => {
  if (!item?.id || item.status === 'applied') return
  if (!confirm(`Delete arrear for ${employeeName(item)}?`)) return

  deletingId.value = item.id
  try {
    await arrearStore.deleteItem(item.id)
    toast.success('Payroll arrear deleted.')
    await load()
  } catch (err) {
    toast.error(err.message || 'Failed to delete payroll arrear.')
  } finally {
    deletingId.value = null
  }
}

const pageChanged = (page) => {
  filters.value.page = page
  load()
}

const goToBulkCreate = () => {
  router.push({ name: 'PayrollArrearEntryCreate', query: buildFilterParams() })
}

const pendingRows = computed(() => list.value.filter((item) => item.status !== 'applied'))
const appliedRows = computed(() => list.value.filter((item) => item.status === 'applied'))
const pendingTotal = computed(() => pendingRows.value.reduce((sum, item) => sum + toNum(item.amount), 0))
const appliedTotal = computed(() => appliedRows.value.reduce((sum, item) => sum + toNum(item.amount), 0))

const monthLabel = computed(() => {
  const raw = filters.value.salary_month
  if (!raw) return ''
  const [year, month] = raw.split('-')
  return new Date(Number(year), Number(month) - 1).toLocaleString('en-US', {
    month: 'long',
    year: 'numeric',
  })
})

const employeeName = (item) => item.employee?.name || item.user?.name || item.employee_name || `#${item.user_id}`
const employeeCode = (item) => item.employee?.employee_id || item.employee_id || ''
const companyName = (item) => item.employee?.company?.name || item.company?.name || item.company_name || '-'
const departmentName = (item) => item.employee?.department?.name || item.department?.name || item.department_name || '-'

const statusCfg = (status) =>
  status === 'applied'
    ? { label: 'Applied', cls: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200', dot: 'bg-emerald-400', border: 'border-l-emerald-400' }
    : { label: 'Pending', cls: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200', dot: 'bg-amber-400', border: 'border-l-amber-300' }

// ── Single-add modal ─────────────────────────────────────────────────────────
const showSingleModal = ref(false)
const selectedEmployee = ref(null)
const savingSingle = ref(false)
const singleErrors = ref({})
const singleForm = ref({ salary_month: defaultMonth(), amount: '', reason: '' })

const singleMonthPeriod = computed({
  get: () => monthToPeriod(singleForm.value.salary_month),
  set: (value) => { singleForm.value.salary_month = periodToMonth(value) },
})

const openSingleModal = () => {
  selectedEmployee.value = null
  singleErrors.value = {}
  singleForm.value = {
    salary_month: filters.value.salary_month || defaultMonth(),
    amount: '',
    reason: '',
  }
  showSingleModal.value = true
}

// Open modal pre-filled for a specific employee from the list
const openSingleModalForEmployee = (item) => {
  const userId = item.user_id || item.employee?.id || item.user?.id
  const foundUser = userStore.users?.find((u) => String(u.id) === String(userId))
  selectedEmployee.value = foundUser || item.employee || item.user || {
    id: userId,
    name: employeeName(item),
    employee_id: employeeCode(item),
  }
  singleErrors.value = {}
  singleForm.value = {
    salary_month: String(item.salary_month || '').slice(0, 7) || filters.value.salary_month || defaultMonth(),
    amount: '',
    reason: '',
  }
  showSingleModal.value = true
}

const closeSingleModal = () => { showSingleModal.value = false }

const getEmployeeCode = (user) => String(user?.employee_id || user?.employee_code || user?.emp_id || '').trim()

const saveSingle = async () => {
  singleErrors.value = {}
  if (!selectedEmployee.value?.id) singleErrors.value.employee = 'Employee is required.'
  if (!singleForm.value.salary_month) singleErrors.value.salary_month = 'Month is required.'
  if (!singleForm.value.amount || toNum(singleForm.value.amount) <= 0) {
    singleErrors.value.amount = 'Enter a valid amount.'
  }
  if (Object.keys(singleErrors.value).length) return

  savingSingle.value = true
  try {
    await arrearStore.createItem({
      user_id: selectedEmployee.value.id,
      employee_id: getEmployeeCode(selectedEmployee.value) || null,
      salary_month: singleForm.value.salary_month,
      amount: toNum(singleForm.value.amount),
      reason: singleForm.value.reason || 'Payroll arrear',
    })
    toast.success(`Arrear saved for ${selectedEmployee.value.name}.`)
    filters.value.salary_month = singleForm.value.salary_month
    filters.value.status = 'pending'
    filters.value.page = 1
    closeSingleModal()
    await load()
  } catch (err) {
    if (err.errors) singleErrors.value = err.errors
    toast.error(err.message || 'Failed to save payroll arrear.')
  } finally {
    savingSingle.value = false
  }
}

const initials = (name) => {
  if (!name) return '?'
  return name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase()
}
</script>

<template>
  <div class="min-h-screen bg-slate-50">
    <!-- ── Page Header ────────────────────────────────────────────────────── -->
    <div class="sticky top-0 z-20 border-b border-slate-200 bg-white shadow-sm">
      <div class="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
        <div class="min-w-0">
          <div class="flex flex-wrap items-center gap-2">
            <span class="text-[10px] font-bold uppercase tracking-widest text-indigo-500">Payroll</span>
            <svg class="h-3 w-3 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" /></svg>
            <h1 class="text-sm font-bold text-slate-900">Payroll Arrears</h1>
            <svg v-if="loading" class="h-3.5 w-3.5 animate-spin text-indigo-500" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
          </div>
          <p class="mt-0.5 text-[11px] text-slate-400">
            {{ monthLabel || 'All months' }}
            <span v-if="pagination.total" class="ml-1 text-slate-300">&middot; {{ pagination.total }} records</span>
          </p>
        </div>

        <div class="flex items-center gap-1.5">
          <button
            type="button"
            :class="[
              'inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold shadow-sm transition',
              showFilters
                ? 'border-indigo-200 bg-indigo-50 text-indigo-600'
                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50',
            ]"
            @click="showFilters = !showFilters"
          >
            <i class="far fa-sliders-h text-[10px]"></i>
            Filters
            <i :class="['far text-[10px] transition-transform', showFilters ? 'fa-chevron-up' : 'fa-chevron-down']"></i>
          </button>
          <button
            type="button"
            class="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50"
            @click="goToBulkCreate"
          >
            <i class="far fa-users text-[10px]"></i>
            Bulk Add
          </button>
          <button
            type="button"
            class="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-700 active:bg-indigo-800"
            @click="openSingleModal"
          >
            <i class="far fa-plus text-[10px]"></i>
            Add Arrear
          </button>
        </div>
      </div>

      <!-- Filter Panel -->
      <Transition
        enter-active-class="transition duration-150 ease-out"
        enter-from-class="opacity-0 -translate-y-1"
        enter-to-class="opacity-100 translate-y-0"
        leave-active-class="transition duration-100 ease-in"
        leave-from-class="opacity-100 translate-y-0"
        leave-to-class="opacity-0 -translate-y-1"
      >
        <div v-if="showFilters" class="border-t border-slate-100 bg-slate-50/80 px-4 pb-3 pt-3 space-y-2">
          <EmployeeFilter
            :company_id="filters.company_id"
            :department_id="filters.department_id"
            :employee_id="filters.user_id"
            :line_type="filters.line_type"
            @filter-change="onListFilterChange"
          >
            <FlexibleDatePicker
              v-model="salaryMonthPeriod"
              :show-year="false"
              :show-month="true"
              :show-date="false"
              label="Carry On Month"
              @change="filters.page = 1; load()"
            />
          </EmployeeFilter>
          <div class="flex justify-end">
            <button type="button" class="inline-flex items-center gap-1 text-xs text-slate-400 transition hover:text-indigo-600" @click="resetFilters">
              <i class="far fa-undo"></i> Reset filters
            </button>
          </div>
        </div>
      </Transition>
    </div>

    <!-- ── Summary Strip ──────────────────────────────────────────────────── -->
    <div class="grid grid-cols-2 gap-3 bg-white px-4 py-3 sm:grid-cols-4 border-b border-slate-100">
      <div class="flex items-center gap-3 rounded-xl border border-amber-100 bg-amber-50 px-3 py-2.5">
        <div class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-amber-100">
          <i class="far fa-clock text-amber-500 text-sm"></i>
        </div>
        <div>
          <div class="text-[10px] font-semibold uppercase tracking-wide text-amber-500">Pending</div>
          <div class="text-base font-bold leading-tight text-amber-700">{{ pendingRows.length }}</div>
          <div class="font-mono text-[10px] text-amber-400">{{ formatCurrency(pendingTotal) }}</div>
        </div>
      </div>
      <div class="flex items-center gap-3 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2.5">
        <div class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-emerald-100">
          <i class="far fa-check-circle text-emerald-500 text-sm"></i>
        </div>
        <div>
          <div class="text-[10px] font-semibold uppercase tracking-wide text-emerald-500">Applied</div>
          <div class="text-base font-bold leading-tight text-emerald-700">{{ appliedRows.length }}</div>
          <div class="font-mono text-[10px] text-emerald-400">{{ formatCurrency(appliedTotal) }}</div>
        </div>
      </div>
      <div class="col-span-2 hidden sm:flex items-center gap-3 rounded-xl border border-indigo-100 bg-indigo-50 px-3 py-2.5">
        <div class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-indigo-100">
          <i class="far fa-money-bill-wave text-indigo-500 text-sm"></i>
        </div>
        <div>
          <div class="text-[10px] font-semibold uppercase tracking-wide text-indigo-500">Total Amount</div>
          <div class="font-mono text-base font-bold leading-tight text-indigo-700">{{ formatCurrency(pendingTotal + appliedTotal) }}</div>
          <div class="text-[10px] text-indigo-400">{{ (pendingRows.length + appliedRows.length) }} entries · {{ monthLabel }}</div>
        </div>
      </div>
    </div>

    <!-- ── Table Card ─────────────────────────────────────────────────────── -->
    <div class="bg-white">
      <!-- Tabs + Refresh -->
      <div class="flex items-center justify-between border-b border-slate-100 px-4">
        <div class="flex">
          <button
            v-for="tab in statusTabs"
            :key="tab.value"
            type="button"
            :class="[
              'flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-xs font-semibold transition',
              filters.status === tab.value
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700',
            ]"
            @click="setTab(tab.value)"
          >
            <span :class="['h-1.5 w-1.5 rounded-full', tab.dot]"></span>
            {{ tab.label }}
          </button>
        </div>
        <button
          type="button"
          class="inline-flex h-7 w-7 items-center justify-center rounded border border-slate-200 text-slate-400 hover:bg-slate-50 hover:text-slate-600 disabled:opacity-50"
          :disabled="loading"
          title="Refresh"
          @click="load"
        >
          <i :class="['far fa-sync-alt text-[10px]', loading ? 'animate-spin' : '']"></i>
        </button>
      </div>

      <!-- Error -->
      <div v-if="error" class="flex items-center gap-2 border-b border-rose-100 bg-rose-50 px-4 py-2 text-xs text-rose-700">
        <i class="far fa-exclamation-circle flex-shrink-0"></i>
        {{ error }}
      </div>

      <!-- Table -->
      <div class="overflow-x-auto">
        <table class="min-w-full border-collapse text-xs">
          <thead>
            <tr class="bg-slate-50/80 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              <th class="w-8 border-b border-slate-200 px-3 py-2.5 text-center">#</th>
              <th class="border-b border-slate-200 px-3 py-2.5 text-left">Employee</th>
              <th class="border-b border-slate-200 px-3 py-2.5 text-left">Company / Dept</th>
              <th class="border-b border-slate-200 px-3 py-2.5 text-center">Month</th>
              <th class="border-b border-slate-200 px-3 py-2.5 text-right">Amount</th>
              <th class="border-b border-slate-200 px-3 py-2.5 text-left">Reason</th>
              <th class="border-b border-slate-200 px-3 py-2.5 text-center">Status</th>
              <th class="w-20 border-b border-slate-200 px-3 py-2.5 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            <!-- Skeleton -->
            <template v-if="loading && !list.length">
              <tr v-for="i in 8" :key="`sk-${i}`" class="animate-pulse border-b border-slate-100">
                <td class="px-3 py-3"><div class="mx-auto h-3 w-4 rounded bg-slate-100"></div></td>
                <td class="px-3 py-3">
                  <div class="flex items-center gap-2">
                    <div class="h-7 w-7 flex-shrink-0 rounded-full bg-slate-100"></div>
                    <div><div class="h-3 w-28 rounded bg-slate-100"></div><div class="mt-1 h-2.5 w-16 rounded bg-slate-100"></div></div>
                  </div>
                </td>
                <td class="px-3 py-3"><div class="h-3 w-24 rounded bg-slate-100"></div><div class="mt-1 h-2.5 w-16 rounded bg-slate-100"></div></td>
                <td class="px-3 py-3"><div class="mx-auto h-3 w-14 rounded bg-slate-100"></div></td>
                <td class="px-3 py-3"><div class="ml-auto h-3 w-16 rounded bg-slate-100"></div></td>
                <td class="px-3 py-3"><div class="h-3 w-20 rounded bg-slate-100"></div></td>
                <td class="px-3 py-3"><div class="mx-auto h-4 w-14 rounded-full bg-slate-100"></div></td>
                <td class="px-3 py-3"><div class="mx-auto h-5 w-14 rounded bg-slate-100"></div></td>
              </tr>
            </template>

            <!-- Rows -->
            <tr
              v-for="(item, idx) in list"
              :key="item.id"
              :class="[
                'group border-b border-l-2 border-slate-100 transition-colors hover:bg-indigo-50/30',
                statusCfg(item.status).border,
                idx % 2 === 1 ? 'bg-slate-50/40' : 'bg-white',
              ]"
            >
              <td class="px-3 py-2.5 text-center font-mono text-[11px] text-slate-400">
                {{ (filters.page - 1) * filters.per_page + idx + 1 }}
              </td>

              <!-- Employee -->
              <td class="px-3 py-2.5">
                <div class="flex items-center gap-2">
                  <div class="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-indigo-100 text-[10px] font-bold text-indigo-600">
                    {{ initials(employeeName(item)) }}
                  </div>
                  <div>
                    <div class="font-semibold leading-tight text-slate-800">{{ employeeName(item) }}</div>
                    <div class="mt-0.5 font-mono text-[10px] text-slate-400">{{ employeeCode(item) || '—' }}</div>
                  </div>
                </div>
              </td>

              <!-- Company / Dept -->
              <td class="px-3 py-2.5">
                <div class="leading-tight text-slate-700">{{ companyName(item) }}</div>
                <div class="mt-0.5 text-[10px] text-slate-400">{{ departmentName(item) }}</div>
              </td>

              <!-- Month -->
              <td class="px-3 py-2.5 text-center">
                <span class="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-600">
                  {{ String(item.salary_month || '').slice(0, 7) }}
                </span>
              </td>

              <!-- Amount -->
              <td class="px-3 py-2.5 text-right font-mono text-sm font-bold text-slate-800">
                {{ formatCurrency(item.amount) }}
              </td>

              <!-- Reason -->
              <td class="max-w-[160px] truncate px-3 py-2.5 text-[11px] text-slate-500" :title="item.reason || item.note">
                {{ item.reason || item.note || '—' }}
              </td>

              <!-- Status -->
              <td class="px-3 py-2.5 text-center">
                <span :class="['inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold', statusCfg(item.status).cls]">
                  <span :class="['h-1 w-1 rounded-full', statusCfg(item.status).dot]"></span>
                  {{ statusCfg(item.status).label }}
                </span>
              </td>

              <!-- Actions: Add + Delete -->
              <td class="px-3 py-2.5 text-center">
                <div class="inline-flex items-center gap-1">
                  <button
                    type="button"
                    class="inline-flex h-6 w-6 items-center justify-center rounded border border-indigo-100 text-indigo-400 transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600"
                    title="Add arrear for this employee"
                    @click="openSingleModalForEmployee(item)"
                  >
                    <i class="far fa-plus text-[10px]"></i>
                  </button>
                  <button
                    type="button"
                    :disabled="item.status === 'applied' || deletingId === item.id"
                    class="inline-flex h-6 w-6 items-center justify-center rounded border border-rose-100 text-rose-400 transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-30"
                    title="Delete"
                    @click="deleteEntry(item)"
                  >
                    <i :class="['far text-[10px]', deletingId === item.id ? 'fa-spinner fa-spin' : 'fa-trash-alt']"></i>
                  </button>
                </div>
              </td>
            </tr>

            <!-- Empty State -->
            <tr v-if="!loading && !list.length">
              <td colspan="8" class="py-20 text-center">
                <div class="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
                  <i class="far fa-inbox text-2xl text-slate-300"></i>
                </div>
                <p class="mt-4 text-sm font-semibold text-slate-600">No arrears found</p>
                <p class="mt-0.5 text-xs text-slate-400">Try a different month or status filter</p>
                <button
                  type="button"
                  class="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
                  @click="openSingleModal"
                >
                  <i class="far fa-plus"></i> Add First Arrear
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div class="border-t border-slate-100 px-4 py-2.5">
        <PaginationBar
          :page="Number(filters.page)"
          :per-page="Number(filters.per_page)"
          :total="Number(pagination.total || 0)"
          :last-page="Number(pagination.last_page || 1)"
          @page-change="pageChanged"
        />
      </div>
    </div>

    <!-- ── Single Arrear Modal ─────────────────────────────────────────────── -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition duration-150 ease-out"
        enter-from-class="opacity-0 scale-95"
        enter-to-class="opacity-100 scale-100"
        leave-active-class="transition duration-100 ease-in"
        leave-from-class="opacity-100 scale-100"
        leave-to-class="opacity-0 scale-95"
      >
        <div
          v-if="showSingleModal"
          class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
          @mousedown.self="closeSingleModal"
        >
          <div class="w-full max-w-md rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200">
            <!-- Modal Header -->
            <div class="flex items-center justify-between rounded-t-2xl border-b border-slate-100 bg-gradient-to-r from-indigo-50 to-slate-50 px-5 py-4">
              <div class="flex items-center gap-3">
                <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white shadow">
                  <i class="far fa-plus-circle"></i>
                </div>
                <div>
                  <p class="text-sm font-bold text-slate-900">
                    {{ selectedEmployee ? `Add Arrear — ${selectedEmployee.name}` : 'Add Single Arrear' }}
                  </p>
                  <p class="text-[11px] text-slate-500">One employee · one carry month</p>
                </div>
              </div>
              <button
                type="button"
                class="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-white hover:text-slate-700"
                @click="closeSingleModal"
              >
                <i class="far fa-times text-xs"></i>
              </button>
            </div>

            <!-- Modal Body -->
            <div class="space-y-4 px-5 py-5">
              <!-- Employee -->
              <div>
                <label class="mb-1.5 block text-[11px] font-semibold text-slate-600">Employee <span class="text-rose-400">*</span></label>
                <MultiselectDropdown
                  v-model="selectedEmployee"
                  :options="userStore.users"
                  :multiple="false"
                  :required="false"
                  label="name"
                  labelPrefix="employee_id"
                  top-label=""
                  placeholder="Search by name or ID..."
                />
                <p v-if="singleErrors.employee || singleErrors.user_id" class="mt-1 text-[11px] text-rose-600">
                  {{ singleErrors.employee || singleErrors.user_id?.[0] || singleErrors.user_id }}
                </p>
              </div>

              <div class="grid gap-4 sm:grid-cols-2">
                <!-- Month -->
                <div>
                  <label class="mb-1.5 block text-[11px] font-semibold text-slate-600">Carry On Month <span class="text-rose-400">*</span></label>
                  <FlexibleDatePicker
                    v-model="singleMonthPeriod"
                    :show-year="false"
                    :show-month="true"
                    :show-date="false"
                    label=""
                  />
                  <p v-if="singleErrors.salary_month" class="mt-1 text-[11px] text-rose-600">
                    {{ Array.isArray(singleErrors.salary_month) ? singleErrors.salary_month[0] : singleErrors.salary_month }}
                  </p>
                </div>

                <!-- Amount -->
                <div>
                  <label class="mb-1.5 block text-[11px] font-semibold text-slate-600">Amount <span class="text-rose-400">*</span></label>
                  <div class="relative">
                    <span class="pointer-events-none absolute inset-y-0 left-3 flex items-center text-xs font-semibold text-slate-400">৳</span>
                    <input
                      v-model="singleForm.amount"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      class="w-full rounded-lg border border-slate-200 bg-white py-2 pl-7 pr-3 text-right text-sm font-mono text-slate-800 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                    />
                  </div>
                  <p v-if="singleErrors.amount" class="mt-1 text-[11px] text-rose-600">
                    {{ Array.isArray(singleErrors.amount) ? singleErrors.amount[0] : singleErrors.amount }}
                  </p>
                </div>
              </div>

              <!-- Reason -->
              <div>
                <label class="mb-1.5 block text-[11px] font-semibold text-slate-600">
                  Reason
                  <span class="ml-1 font-normal text-slate-400">(optional)</span>
                </label>
                <input
                  v-model.trim="singleForm.reason"
                  type="text"
                  placeholder="e.g. Salary arrear for increment"
                  class="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                />
              </div>
            </div>

            <!-- Modal Footer -->
            <div class="flex items-center justify-end gap-2 rounded-b-2xl border-t border-slate-100 bg-slate-50/60 px-5 py-3">
              <button
                type="button"
                class="rounded-lg border border-slate-200 bg-white px-4 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                @click="closeSingleModal"
              >
                Cancel
              </button>
              <button
                type="button"
                :disabled="savingSingle"
                class="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-5 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-60"
                @click="saveSingle"
              >
                <i class="far" :class="savingSingle ? 'fa-spinner fa-spin' : 'fa-save'"></i>
                {{ savingSingle ? 'Saving...' : 'Save Arrear' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>
