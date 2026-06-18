<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'
import { storeToRefs } from 'pinia'
import EmployeeFilter from '@/components/common/EmployeeFilter.vue'
import MultiselectDropdown from '@/components/MultiselectDropdown.vue'
import PaginationBar from '@/components/PaginationBar.vue'
import FlexibleDatePicker from '@/components/FlexibleDatePicker.vue'
import { formatCurrency, toNum } from '@/utils/currency'
import { usePayrollAdvanceDeductionStore } from '@/stores/payrollAdvanceDeduction'
import { useUserStore } from '@/stores/user'

const route = useRoute()
const router = useRouter()
const toast  = useToast()
const store  = usePayrollAdvanceDeductionStore()
const userStore = useUserStore()
const { list, loading, error, pagination } = storeToRefs(store)

// ─── Helpers ──────────────────────────────────────────────────────────────

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
const parseQueryInt = (v, fb = 1) => {
  const n = Number.parseInt(String(v ?? ''), 10)
  return Number.isNaN(n) ? fb : n
}

// ─── Filters ──────────────────────────────────────────────────────────────

const filters = ref({
  carry_on_month: defaultMonth(),
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
  get: () => monthToPeriod(filters.value.carry_on_month),
  set: (v) => { filters.value.carry_on_month = periodToMonth(v) },
})

const statusTabs = [
  { value: 'pending', label: 'Pending', dot: 'bg-amber-400'  },
  { value: 'applied', label: 'Applied', dot: 'bg-emerald-400' },
  { value: '',        label: 'All',     dot: 'bg-slate-400'  },
]

const buildFilterParams = () => {
  const p = { ...filters.value }
  if (!p.carry_on_month) delete p.carry_on_month
  if (!p.company_id)     delete p.company_id
  if (!p.department_id)  delete p.department_id
  if (!p.line_type || p.line_type === 'all') delete p.line_type
  if (!p.user_id)  delete p.user_id
  if (!p.status)   delete p.status
  return p
}

const hydrateFiltersFromQuery = () => {
  const q = route.query || {}
  filters.value = {
    ...filters.value,
    carry_on_month: q.carry_on_month || q.salary_month
      ? String(q.carry_on_month || q.salary_month).slice(0, 7)
      : defaultMonth(),
    company_id:  q.company_id  ? String(q.company_id)  : '',
    department_id: q.department_id ? String(q.department_id) : '',
    line_type:   q.line_type   ? String(q.line_type)   : 'all',
    user_id:     q.user_id || q.employee_id ? String(q.user_id || q.employee_id) : '',
    status:      q.status      ? String(q.status)      : 'pending',
    page:        parseQueryInt(q.page, 1),
    per_page:    parseQueryInt(q.per_page, 15),
  }
}

const load = async () => {
  const params = buildFilterParams()
  await router.replace({ query: params })
  await store.fetchList(params)
}

onMounted(async () => {
  hydrateFiltersFromQuery()
  await load()
  userStore.fetchTypeWiseEmployees({ status: 'active' })
})

const onFilterChange = (payload = {}) => {
  filters.value = {
    ...filters.value,
    company_id:    payload.company_id    || '',
    department_id: payload.department_id || '',
    line_type:     payload.line_type     || 'all',
    user_id:       payload.employee_id   || '',
    page: 1,
  }
  load()
}

const setTab = (status) => {
  filters.value.status = status
  filters.value.page   = 1
  load()
}

const resetFilters = () => {
  filters.value = {
    carry_on_month: defaultMonth(),
    company_id: '', department_id: '', line_type: 'all',
    user_id: '', status: 'pending', page: 1, per_page: 15,
  }
  load()
}

const deleteEntry = async (item) => {
  if (!item?.id || item.status === 'applied') return
  if (!confirm(`Delete advance for ${employeeName(item)}?`)) return
  deletingId.value = item.id
  try {
    await store.deleteItem(item.id)
    toast.success('Deleted.')
    await load()
  } catch (err) {
    toast.error(err.message || 'Failed to delete.')
  } finally {
    deletingId.value = null
  }
}

const pageChanged = (page) => { filters.value.page = page; load() }

// ─── Stats ────────────────────────────────────────────────────────────────

const pendingTotal = computed(() =>
  list.value.filter(i => i.status !== 'applied').reduce((s, i) => s + toNum(i.amount), 0))
const appliedTotal = computed(() =>
  list.value.filter(i => i.status === 'applied').reduce((s, i) => s + toNum(i.amount), 0))
const pendingCount = computed(() => list.value.filter(i => i.status !== 'applied').length)
const appliedCount = computed(() => list.value.filter(i => i.status === 'applied').length)

const monthLabel = computed(() => {
  const raw = filters.value.carry_on_month
  if (!raw) return ''
  const [y, m] = raw.split('-')
  return new Date(Number(y), Number(m) - 1).toLocaleString('en-US', { month: 'short', year: 'numeric' })
})

// ─── Row helpers ──────────────────────────────────────────────────────────

const employeeName   = (r) => r.employee?.name || r.user?.name || r.employee_name || `#${r.user_id}`
const employeeCode   = (r) => r.employee?.employee_id || r.employee_id || ''
const companyName    = (r) => r.employee?.company?.name || r.company?.name || '—'
const departmentName = (r) => r.employee?.department?.name || r.department?.name || '—'

const statusCfg = (s) =>
  s === 'applied'
    ? { label: 'Applied', cls: 'text-emerald-700 bg-emerald-50 ring-1 ring-emerald-200', dot: 'bg-emerald-400', border: 'border-l-emerald-400' }
    : { label: 'Pending', cls: 'text-amber-700  bg-amber-50  ring-1 ring-amber-200',     dot: 'bg-amber-400',   border: 'border-l-amber-300'   }

// ─── Quick-Add modal ──────────────────────────────────────────────────────

const showModal    = ref(false)
const selectedEmp  = ref(null)
const savingSingle = ref(false)
const singleErrors = ref({})
const singleForm   = ref({ carry_on_month: defaultMonth(), amount: '', note: '' })

const singleMonthPeriod = computed({
  get: () => monthToPeriod(singleForm.value.carry_on_month),
  set: (v) => { singleForm.value.carry_on_month = periodToMonth(v) },
})

const openModal = () => {
  selectedEmp.value  = null
  singleErrors.value = {}
  singleForm.value   = { carry_on_month: filters.value.carry_on_month || defaultMonth(), amount: '', note: '' }
  showModal.value    = true
}
const closeModal = () => { showModal.value = false }

const getEmpId = (u) => String(u?.employee_id || u?.employee_code || u?.emp_id || '').trim()

const saveSingle = async () => {
  singleErrors.value = {}
  if (!selectedEmp.value?.id)                                 { singleErrors.value.emp = 'Employee is required.'; return }
  if (!singleForm.value.carry_on_month)                       { singleErrors.value.month = 'Month is required.'; return }
  if (!singleForm.value.amount || toNum(singleForm.value.amount) <= 0) { singleErrors.value.amount = 'Enter a valid amount.'; return }

  savingSingle.value = true
  try {
    await store.createBulk({
      entries: [{
        user_id:        selectedEmp.value.id,
        employee_id:    getEmpId(selectedEmp.value) || null,
        carry_on_month: singleForm.value.carry_on_month,
        amount:         toNum(singleForm.value.amount),
        reason:         singleForm.value.note || 'Advance deduction',
      }],
    })
    toast.success(`Saved for ${selectedEmp.value.name}.`)
    closeModal()
    await load()
  } catch (err) {
    toast.error(err.message || 'Failed to save.')
  } finally {
    savingSingle.value = false
  }
}
</script>

<template>
  <div class="space-y-0 bg-slate-50 min-h-screen">

    <!-- ── Toolbar ─────────────────────────────────────────────────────── -->
    <div class="sticky top-0 z-20 border-b border-slate-200 bg-white px-4 py-2.5 shadow-sm">
      <div class="flex flex-wrap items-center justify-between gap-2">

        <!-- Left: title + meta -->
        <div class="flex items-center gap-3 min-w-0">
          <div class="min-w-0">
            <div class="flex items-center gap-2">
              <span class="text-[10px] font-bold uppercase tracking-[0.22em] text-rose-500">Payroll</span>
              <span class="text-slate-300">/</span>
              <span class="text-sm font-bold text-slate-800">Advance Deductions</span>
              <span v-if="monthLabel" class="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-600">
                {{ monthLabel }}
              </span>
              <!-- Inline loading spinner -->
              <svg v-if="loading" class="h-3.5 w-3.5 animate-spin text-rose-400" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
              </svg>
            </div>
            <!-- Mini stats row -->
            <div class="mt-0.5 flex items-center gap-3 text-[11px]">
              <span class="text-amber-600">
                <span class="font-bold">{{ pendingCount }}</span> pending ·
                <span class="font-bold font-mono">{{ formatCurrency(pendingTotal) }}</span>
              </span>
              <span class="text-slate-300">|</span>
              <span class="text-emerald-600">
                <span class="font-bold">{{ appliedCount }}</span> applied ·
                <span class="font-bold font-mono">{{ formatCurrency(appliedTotal) }}</span>
              </span>
            </div>
          </div>
        </div>

        <!-- Right: actions -->
        <div class="flex items-center gap-1.5">
          <button
            type="button"
            class="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
            @click="showFilters = !showFilters"
          >
            <i class="far fa-filter text-[10px]"></i>
            Filter
            <i :class="['far text-[10px] ml-0.5', showFilters ? 'fa-chevron-up' : 'fa-chevron-down']"></i>
          </button>
          <button
            type="button"
            class="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50"
            @click="router.push({ name: 'PayrollAdvanceDeductionCreate', query: buildFilterParams() })"
          >
            <i class="far fa-users text-[10px]"></i>
            Bulk
          </button>
          <button
            type="button"
            class="inline-flex items-center gap-1 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-rose-700"
            @click="openModal"
          >
            <i class="far fa-plus text-[10px]"></i>
            Add
          </button>
        </div>
      </div>

      <!-- ── Filter panel (collapsible) ─────────────────────────────── -->
      <div v-if="showFilters" class="mt-2.5 space-y-2 border-t border-slate-100 pt-2.5">
        <EmployeeFilter
          :company_id="filters.company_id"
          :department_id="filters.department_id"
          :employee_id="filters.user_id"
          :line_type="filters.line_type"
          @filter-change="onFilterChange"
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
          <button type="button" class="text-xs text-slate-400 hover:text-rose-600 transition" @click="resetFilters">
            <i class="far fa-undo mr-1"></i>Reset all filters
          </button>
        </div>
      </div>
    </div>

    <!-- ── Table card ──────────────────────────────────────────────────── -->
    <div class="bg-white">

      <!-- Status tab bar -->
      <div class="flex items-center justify-between border-b border-slate-100 px-4">
        <div class="flex">
          <button
            v-for="tab in statusTabs"
            :key="tab.value"
            type="button"
            :class="[
              'flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-xs font-semibold transition',
              filters.status === tab.value
                ? 'border-rose-500 text-rose-600'
                : 'border-transparent text-slate-500 hover:text-slate-700',
            ]"
            @click="setTab(tab.value)"
          >
            <span :class="['h-1.5 w-1.5 rounded-full', tab.dot]"></span>
            {{ tab.label }}
          </button>
        </div>
        <div class="flex items-center gap-2 py-2">
          <span class="text-[11px] text-slate-400">
            {{ pagination.total ?? list.length }} records
          </span>
          <button
            type="button"
            class="inline-flex h-6 w-6 items-center justify-center rounded border border-slate-200 text-slate-400 hover:bg-slate-50 hover:text-slate-600"
            :disabled="loading"
            @click="load"
          >
            <i :class="['far fa-sync-alt text-[10px]', loading ? 'animate-spin' : '']"></i>
          </button>
        </div>
      </div>

      <!-- Error -->
      <div v-if="error" class="border-b border-rose-100 bg-rose-50 px-4 py-2 text-xs text-rose-700">
        <i class="far fa-exclamation-circle mr-1"></i>{{ error }}
      </div>

      <!-- Table -->
      <div class="overflow-x-auto">
        <table class="min-w-full border-collapse text-xs">
          <thead>
            <tr class="bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              <th class="w-8 border-b border-slate-200 px-3 py-2 text-center">#</th>
              <th class="border-b border-slate-200 px-3 py-2 text-left">Employee</th>
              <th class="border-b border-slate-200 px-3 py-2 text-left">Company / Dept</th>
              <th class="border-b border-slate-200 px-3 py-2 text-center">Month</th>
              <th class="border-b border-slate-200 px-3 py-2 text-right">Amount</th>
              <th class="border-b border-slate-200 px-3 py-2 text-left">Note</th>
              <th class="border-b border-slate-200 px-3 py-2 text-center">Status</th>
              <th class="w-16 border-b border-slate-200 px-3 py-2 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>

            <!-- ── Skeleton rows ──────────────────────────────────────── -->
            <template v-if="loading && !list.length">
              <tr v-for="i in 8" :key="`sk-${i}`" class="animate-pulse border-b border-slate-100">
                <td class="px-3 py-2.5 text-center">
                  <div class="mx-auto h-3 w-4 rounded bg-slate-100"></div>
                </td>
                <td class="px-3 py-2.5">
                  <div class="h-3 w-28 rounded bg-slate-100"></div>
                  <div class="mt-1 h-2.5 w-16 rounded bg-slate-100"></div>
                </td>
                <td class="px-3 py-2.5">
                  <div class="h-3 w-24 rounded bg-slate-100"></div>
                  <div class="mt-1 h-2.5 w-16 rounded bg-slate-100"></div>
                </td>
                <td class="px-3 py-2.5 text-center">
                  <div class="mx-auto h-3 w-14 rounded bg-slate-100"></div>
                </td>
                <td class="px-3 py-2.5 text-right">
                  <div class="ml-auto h-3 w-16 rounded bg-slate-100"></div>
                </td>
                <td class="px-3 py-2.5">
                  <div class="h-3 w-20 rounded bg-slate-100"></div>
                </td>
                <td class="px-3 py-2.5 text-center">
                  <div class="mx-auto h-4 w-14 rounded-full bg-slate-100"></div>
                </td>
                <td class="px-3 py-2.5 text-center">
                  <div class="mx-auto flex gap-1 justify-center">
                    <div class="h-5 w-5 rounded bg-slate-100"></div>
                    <div class="h-5 w-5 rounded bg-slate-100"></div>
                  </div>
                </td>
              </tr>
            </template>

            <!-- ── Data rows ──────────────────────────────────────────── -->
            <tr
              v-for="(item, idx) in list"
              :key="item.id"
              :class="[
                'group border-b border-slate-100 border-l-2 transition hover:bg-rose-50/20',
                statusCfg(item.status).border,
                idx % 2 === 1 ? 'bg-slate-50/30' : 'bg-white',
              ]"
            >
              <td class="px-3 py-2 text-center font-mono text-[11px] text-slate-400">
                {{ (filters.page - 1) * filters.per_page + idx + 1 }}
              </td>
              <td class="px-3 py-2">
                <div class="font-semibold text-slate-800 leading-tight">{{ employeeName(item) }}</div>
                <div class="text-[10px] text-slate-400 mt-0.5">{{ employeeCode(item) || '—' }}</div>
              </td>
              <td class="px-3 py-2">
                <div class="text-slate-700 leading-tight">{{ companyName(item) }}</div>
                <div class="text-[10px] text-slate-400 mt-0.5">{{ departmentName(item) }}</div>
              </td>
              <td class="px-3 py-2 text-center">
                <span class="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-600">
                  {{ String(item.carry_on_month || '').slice(0, 7) }}
                </span>
              </td>
              <td class="px-3 py-2 text-right font-mono font-bold text-slate-800">
                {{ formatCurrency(item.amount) }}
              </td>
              <td class="max-w-[140px] truncate px-3 py-2 text-[11px] text-slate-500" :title="item.reason || item.note">
                {{ item.reason || item.note || '—' }}
              </td>
              <td class="px-3 py-2 text-center">
                <span :class="['inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold', statusCfg(item.status).cls]">
                  <span :class="['h-1 w-1 rounded-full', statusCfg(item.status).dot]"></span>
                  {{ statusCfg(item.status).label }}
                </span>
              </td>
              <td class="px-3 py-2">
                <div class="flex items-center justify-center gap-1">
                  <RouterLink
                    :to="{ name: 'PayrollAdvanceDeductionShow', params: { id: item.id } }"
                    class="inline-flex h-6 w-6 items-center justify-center rounded border border-slate-200 text-slate-400 transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600"
                    title="View slip"
                  >
                    <i class="far fa-file-alt text-[10px]"></i>
                  </RouterLink>
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

            <!-- ── Empty state ────────────────────────────────────────── -->
            <tr v-if="!loading && !list.length">
              <td colspan="8" class="py-16 text-center">
                <div class="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100">
                  <i class="far fa-inbox text-xl text-slate-300"></i>
                </div>
                <p class="mt-3 text-sm font-semibold text-slate-500">No records found</p>
                <p class="text-xs text-slate-400">Try a different month or status tab</p>
                <button type="button" class="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-rose-700" @click="openModal">
                  <i class="far fa-plus"></i> Add Advance
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

    <!-- ── Quick-Add Single Modal ──────────────────────────────────────── -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition duration-150 ease-out"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition duration-100 ease-in"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div
          v-if="showModal"
          class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
          @mousedown.self="closeModal"
        >
          <div class="w-full max-w-sm rounded-xl bg-white shadow-2xl ring-1 ring-slate-200">

            <!-- Modal header -->
            <div class="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <div>
                <p class="text-sm font-bold text-slate-900">Add Advance</p>
                <p class="text-[11px] text-slate-500">Single employee entry</p>
              </div>
              <button
                type="button"
                class="flex h-6 w-6 items-center justify-center rounded text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                @click="closeModal"
              >
                <i class="far fa-times text-xs"></i>
              </button>
            </div>

            <!-- Modal body -->
            <div class="space-y-3 px-4 py-4">
              <div>
                <MultiselectDropdown
                  v-model="selectedEmp"
                  :options="userStore.users"
                  :multiple="false"
                  :required="false"
                  label="name"
                  labelPrefix="employee_id"
                  top-label="Employee"
                  placeholder="Search employee..."
                />
                <p v-if="singleErrors.emp" class="mt-1 text-[11px] text-rose-600">{{ singleErrors.emp }}</p>
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div>
                  <FlexibleDatePicker
                    v-model="singleMonthPeriod"
                    :show-year="false"
                    :show-month="true"
                    :show-date="false"
                    label="Month"
                  />
                  <p v-if="singleErrors.month" class="mt-1 text-[11px] text-rose-600">{{ singleErrors.month }}</p>
                </div>

                <div>
                  <label class="mb-1 block text-[11px] font-semibold text-slate-600">Amount</label>
                  <div class="relative">
                    <span class="absolute inset-y-0 left-2.5 flex items-center text-xs text-slate-400">৳</span>
                    <input
                      v-model="singleForm.amount"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      class="w-full rounded-lg border border-slate-200 bg-white py-2 pl-7 pr-2.5 text-sm text-slate-800 focus:border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-100"
                    />
                  </div>
                  <p v-if="singleErrors.amount" class="mt-1 text-[11px] text-rose-600">{{ singleErrors.amount }}</p>
                </div>
              </div>

              <div>
                <label class="mb-1 block text-[11px] font-semibold text-slate-600">Note <span class="font-normal text-slate-400">(optional)</span></label>
                <input
                  v-model.trim="singleForm.note"
                  type="text"
                  placeholder="e.g. Salary advance recovery"
                  class="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-100"
                />
              </div>
            </div>

            <!-- Modal footer -->
            <div class="flex items-center justify-end gap-2 border-t border-slate-100 px-4 py-3">
              <button type="button" class="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50" @click="closeModal">Cancel</button>
              <button
                type="button"
                class="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-60"
                :disabled="savingSingle"
                @click="saveSingle"
              >
                <i class="far" :class="savingSingle ? 'fa-spinner fa-spin' : 'fa-save'"></i>
                {{ savingSingle ? 'Saving...' : 'Save' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>
