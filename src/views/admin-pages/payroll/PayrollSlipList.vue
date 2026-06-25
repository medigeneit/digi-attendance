<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import apiClient from '@/axios'
import EmployeeFilter from '@/components/common/EmployeeFilter.vue'
import FlexibleDatePicker from '@/components/FlexibleDatePicker.vue'
import LoaderView from '@/components/common/LoaderView.vue'

const router = useRouter()
const route = useRoute()

const currentMonth = () => new Date().toISOString().slice(0, 7)

const filters = ref({
  company_id: '',
  department_id: '',
  employee_id: '',
  line_type: 'all',
  salary_month: currentMonth(),
  payment_status: '',
  payroll_cycle: 'regular',
  payment_mode: '',
})

const cycleOptions = [
  { value: 'regular', label: 'Regular Monthly' },
  { value: 'half_salary_advance', label: 'Half Salary Advance' },
  { value: 'final_settlement', label: 'Final Settlement' },
  { value: 'bonus_only', label: 'Bonus Only' },
]

const rows = ref([])
const loading = ref(false)
const exporting = ref(false)
const error = ref('')
const pdfExporting = ref(false)

const monthToPeriod = (value) => {
  const month = String(value || '').slice(0, 7)
  if (!/^\d{4}-\d{2}$/.test(month)) return { year: null, month: null, day: 1 }
  return { year: Number(month.slice(0, 4)), month: Number(month.slice(5, 7)), day: 1 }
}

const periodToMonth = (value) => {
  if (!value?.year || !value?.month) return ''
  return `${value.year}-${String(value.month).padStart(2, '0')}`
}

const salaryMonthPeriod = computed({
  get: () => monthToPeriod(filters.value.salary_month),
  set: (value) => {
    filters.value.salary_month = periodToMonth(value)
  },
})

const toArray = (data) => {
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.data)) return data.data
  return []
}

const fetchAllPages = async (url, params = {}) => {
  const items = []
  let page = 1
  let lastPage = 1

  do {
    const response = await apiClient.get(url, {
      params: {
        ...params,
        page,
        per_page: 200,
      },
    })

    const data = response.data
    items.push(...toArray(data))
    lastPage = data?.last_page || 1
    page += 1
  } while (page <= lastPage)

  return items
}

const activeFilterChips = computed(() => {
  const chips = []

  if (filters.value.company_id) chips.push({ label: 'Company', value: filters.value.company_id })
  if (filters.value.department_id) chips.push({ label: 'Department', value: filters.value.department_id })
  if (filters.value.employee_id) chips.push({ label: 'Employee', value: filters.value.employee_id })
  if (filters.value.line_type && filters.value.line_type !== 'all') {
    chips.push({ label: 'Line Type', value: filters.value.line_type })
  }
  if (filters.value.payment_status) chips.push({ label: 'Status', value: filters.value.payment_status })
  if (filters.value.payroll_cycle) chips.push({ label: 'Cycle', value: cycleLabel(filters.value.payroll_cycle) })
  if (filters.value.salary_month) chips.push({ label: 'Month', value: formatMonth(filters.value.salary_month) })

  return chips
})

function formatMonth(value) {
  if (!value) return '-'
  return String(value).slice(0, 7)
}

function formatDate(value) {
  if (!value) return '-'
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`)
  if (Number.isNaN(date.getTime())) return String(value)

  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

function formatCompactCurrency(value) {
  if (value === null || value === undefined || value === '') return '-'
  const num = Number(value)
  if (!Number.isFinite(num)) return '-'

  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num)
}

function cycleLabel(value) {
  const option = cycleOptions.find((item) => item.value === value)
  return option?.label || String(value || 'Regular Monthly').replace(/_/g, ' ')
}

function viewSlip(id) {
  router.push({ name: 'PayrollSlipShow', params: { id } })
}

const isCash = (p) => (p.payment_method || p.user?.default_payment_method || 'Cash').toLowerCase() === 'cash'

const cashRows  = computed(() => rows.value.filter(p => isCash(p)))
const bankRows  = computed(() => rows.value.filter(p => !isCash(p)))
const cashTotal = computed(() => cashRows.value.reduce((s, p) => s + Number(p.net_payment || 0), 0))
const bankTotal = computed(() => bankRows.value.reduce((s, p) => s + Number(p.net_payment || 0), 0))
const grandTotal = computed(() => rows.value.reduce((s, p) => s + Number(p.net_payment || 0), 0))

const monthLabel = computed(() => {
  const raw = filters.value.salary_month
  if (!raw) return ''
  const [y, m] = String(raw).split('-')
  return new Date(Number(y), Number(m) - 1).toLocaleString('en-US', { month: 'short', year: 'numeric' })
})

const showFilters = ref(false)

const buildParams = () => ({
  salary_month: filters.value.salary_month,
  ...(filters.value.company_id ? { company_id: filters.value.company_id } : {}),
  ...(filters.value.department_id ? { department_id: filters.value.department_id } : {}),
  ...(filters.value.line_type && filters.value.line_type !== 'all'
    ? { line_type: filters.value.line_type }
    : {}),
  ...(filters.value.employee_id ? { user_id: filters.value.employee_id } : {}),
  ...(filters.value.payment_status ? { payment_status: filters.value.payment_status } : {}),
  ...(filters.value.payroll_cycle ? { payroll_cycle: filters.value.payroll_cycle } : {}),
  ...(filters.value.payment_mode ? { payment_mode: filters.value.payment_mode } : {}),
})

const buildRouteQuery = () => {
  const params = { ...filters.value }
  Object.keys(params).forEach((key) => {
    if (!params[key] || (key === 'line_type' && params[key] === 'all')) {
      delete params[key]
    }
  })
  return params
}

const applyRouteQueryToFilters = () => {
  const query = route.query
  filters.value = {
    company_id: String(query.company_id || ''),
    department_id: String(query.department_id || ''),
    employee_id: String(query.employee_id || query.user_id || ''),
    line_type: String(query.line_type || 'all'),
    salary_month: String(query.salary_month || currentMonth()),
    payment_status: String(query.payment_status || ''),
    payroll_cycle: String(query.payroll_cycle || 'regular'),
    payment_mode: String(query.payment_mode || ''),
  }
}

async function loadSlipList() {
  await router.replace({ query: buildRouteQuery() })
  error.value = ''

  if (!filters.value.salary_month) {
    error.value = 'Month is required.'
    rows.value = []
    return
  }

  loading.value = true
  try {
    rows.value = await fetchAllPages('/payroll-cash-slips', buildParams())
  } catch (e) {
    error.value = e.message || 'Failed to load payroll slip list.'
    rows.value = []
  } finally {
    loading.value = false
  }
}

async function downloadExcel() {
  error.value = ''

  if (!filters.value.salary_month) {
    error.value = 'Month is required.'
    return
  }

  exporting.value = true
  try {
    const response = await apiClient.get('/payroll-cash-slips', {
      params: { ...buildParams(), flag: 'excel' },
      responseType: 'blob',
    })

    const url = window.URL.createObjectURL(new Blob([response.data]))
    const link = document.createElement('a')
    link.href = url
    link.setAttribute(
      'download',
      `cash-slip-list-${String(filters.value.salary_month).slice(0, 7)}.xlsx`,
    )
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  } catch (e) {
    error.value = e.message || 'Excel download failed.'
  } finally {
    exporting.value = false
  }
}

async function downloadPdf() {
  error.value = ''

  if (!filters.value.salary_month) {
    error.value = 'Month is required.'
    return
  }

  pdfExporting.value = true
  try {
    const response = await apiClient.get('/payroll-cash-slips', {
      params: { ...buildParams(), flag: 'pdf' },
      responseType: 'blob',
    })

    const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }))
    const link = document.createElement('a')
    link.href = url
    link.setAttribute(
      'download',
      `cash-slip-list-${String(filters.value.salary_month).slice(0, 7)}.pdf`,
    )
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  } catch (e) {
    error.value = e.message || 'PDF download failed.'
  } finally {
    pdfExporting.value = false
  }
}

function resetFilters() {
  filters.value = {
    company_id: '',
    department_id: '',
    employee_id: '',
    line_type: 'all',
    salary_month: currentMonth(),
    payment_status: '',
    payroll_cycle: 'regular',
    payment_mode: '',
  }
  loadSlipList()
}

onMounted(() => {
  applyRouteQueryToFilters()
  loadSlipList()
})
</script>

<template>
  <div class="bg-slate-50 min-h-screen">

    <!-- ── Sticky Toolbar ──────────────────────────────────────────────── -->
    <div class="sticky top-0 z-20 border-b border-slate-200 bg-white shadow-sm">
      <div class="px-4 py-2.5">
        <div class="flex flex-wrap items-center justify-between gap-2">

          <!-- Left: back + title + meta -->
          <div class="flex items-center gap-3 min-w-0">
            <button
              class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-500 hover:bg-slate-50 transition"
              @click="router.push({ name: 'PayrollList' })"
            >
              <i class="far fa-arrow-left text-xs"></i>
            </button>
            <div class="min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <span class="text-[10px] font-bold uppercase tracking-[0.22em] text-rose-500">Payroll</span>
                <span class="text-slate-300">/</span>
                <span class="text-sm font-bold text-slate-800">Cash Slips</span>
                <span v-if="monthLabel" class="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-600">{{ monthLabel }}</span>
                <svg v-if="loading" class="h-3.5 w-3.5 animate-spin text-rose-400" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
                </svg>
              </div>
              <!-- mini stats -->
              <div v-if="rows.length" class="mt-0.5 flex items-center gap-3 text-[11px] flex-wrap">
                <span class="text-emerald-600">
                  <i class="far fa-money-bill-wave mr-0.5"></i>
                  Cash <span class="font-bold">{{ cashRows.length }}</span> · <span class="font-mono font-bold">{{ formatCompactCurrency(cashTotal) }}</span>
                </span>
                <span class="text-slate-300">|</span>
                <span class="text-blue-600">
                  <i class="far fa-university mr-0.5"></i>
                  Bank <span class="font-bold">{{ bankRows.length }}</span> · <span class="font-mono font-bold">{{ formatCompactCurrency(bankTotal) }}</span>
                </span>
                <span class="text-slate-300">|</span>
                <span class="text-slate-700 font-semibold">
                  Total <span class="font-mono">{{ formatCompactCurrency(grandTotal) }}</span>
                </span>
              </div>
            </div>
          </div>

          <!-- Right: actions -->
          <div class="flex items-center gap-1.5 flex-wrap">
            <button
              class="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm hover:bg-slate-50 transition disabled:opacity-40"
              :disabled="loading || exporting || pdfExporting || !rows.length"
              @click="downloadExcel"
            >
              <i class="far text-[10px]" :class="exporting ? 'fa-spinner fa-spin' : 'fa-file-excel'"></i>
              Excel
            </button>
            <button
              class="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm hover:bg-slate-50 transition disabled:opacity-40"
              :disabled="loading || exporting || pdfExporting || !rows.length"
              @click="downloadPdf"
            >
              <i class="far text-[10px]" :class="pdfExporting ? 'fa-spinner fa-spin' : 'fa-file-pdf'"></i>
              PDF
            </button>
            <button
              class="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm hover:bg-slate-50 transition"
              @click="showFilters = !showFilters"
            >
              <i class="far fa-filter text-[10px]"></i>
              Filter
              <i :class="['far text-[10px] ml-0.5', showFilters ? 'fa-chevron-up' : 'fa-chevron-down']"></i>
            </button>
            <button
              class="inline-flex items-center gap-1 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-rose-700 transition disabled:opacity-40"
              :disabled="loading"
              @click="loadSlipList"
            >
              <i class="far text-[10px]" :class="loading ? 'fa-spinner fa-spin' : 'fa-sync-alt'"></i>
              Load
            </button>
          </div>
        </div>

        <!-- ── Collapsible filter panel ──────────────────────────────── -->
        <div v-if="showFilters" class="mt-2.5 space-y-2.5 border-t border-slate-100 pt-2.5">
          <EmployeeFilter
            :company_id="filters.company_id"
            :department_id="filters.department_id"
            :employee_id="filters.employee_id"
            :line_type="filters.line_type"
            :with-type="true"
            @update:company_id="v => filters.company_id = v"
            @update:department_id="v => filters.department_id = v"
            @update:employee_id="v => filters.employee_id = v"
            @update:line_type="v => filters.line_type = v"
          >
            <FlexibleDatePicker
              v-model="salaryMonthPeriod"
              :show-year="false"
              :show-month="true"
              :show-date="false"
              label="Month"
            />
          </EmployeeFilter>

          <div class="flex flex-wrap items-end gap-3">
            <!-- Payroll Cycle -->
            <div class="flex flex-col gap-1">
              <label class="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Payroll Cycle</label>
              <select
                v-model="filters.payroll_cycle"
                class="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 shadow-sm focus:border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-100"
              >
                <option value="">All Cycles</option>
                <option v-for="c in cycleOptions" :key="c.value" :value="c.value">{{ c.label }}</option>
              </select>
            </div>
            <!-- Payment Status -->
            <div class="flex flex-col gap-1">
              <label class="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Pay Status</label>
              <select
                v-model="filters.payment_status"
                class="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 shadow-sm focus:border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-100"
              >
                <option value="">All</option>
                <option value="Pending">Pending</option>
                <option value="Partial">Partial</option>
                <option value="Paid">Paid</option>
              </select>
            </div>
            <button
              type="button"
              class="inline-flex items-center gap-1 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-rose-700 disabled:opacity-40"
              :disabled="loading"
              @click="loadSlipList"
            >
              <i class="far text-[10px]" :class="loading ? 'fa-spinner fa-spin' : 'fa-sync-alt'"></i>
              Load
            </button>
            <button class="text-xs text-slate-400 hover:text-rose-600 transition pb-1.5" @click="resetFilters">
              <i class="far fa-undo mr-1"></i>Reset all
            </button>
          </div>
        </div>
      </div>

      <!-- ── Payment Mode tab bar ──────────────────────────────────────── -->
      <div class="flex items-center border-t border-slate-100 px-4">
        <button
          v-for="tab in [
            { value: '', label: 'All', dot: 'bg-slate-400', active: 'border-slate-700 text-slate-800' },
            { value: 'cash', label: 'Cash', dot: 'bg-emerald-400', active: 'border-emerald-600 text-emerald-700' },
            { value: 'bank', label: 'Bank', dot: 'bg-blue-400', active: 'border-blue-600 text-blue-700' },
          ]"
          :key="tab.value"
          type="button"
          :class="[
            'flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-xs font-semibold transition',
            filters.payment_mode === tab.value
              ? tab.active + ' border-b-2'
              : 'border-transparent text-slate-500 hover:text-slate-700',
          ]"
          @click="filters.payment_mode = tab.value; loadSlipList()"
        >
          <span :class="['h-1.5 w-1.5 rounded-full', tab.dot]"></span>
          {{ tab.label }}
          <span
            v-if="tab.value === '' && rows.length"
            class="ml-0.5 rounded bg-slate-100 px-1 py-0.5 text-[10px] font-bold text-slate-600"
          >{{ rows.length }}</span>
          <span
            v-else-if="tab.value === 'cash' && cashRows.length"
            class="ml-0.5 rounded bg-emerald-50 px-1 py-0.5 text-[10px] font-bold text-emerald-600"
          >{{ cashRows.length }}</span>
          <span
            v-else-if="tab.value === 'bank' && bankRows.length"
            class="ml-0.5 rounded bg-blue-50 px-1 py-0.5 text-[10px] font-bold text-blue-600"
          >{{ bankRows.length }}</span>
        </button>

        <div class="ml-auto flex items-center gap-2 py-2 text-[11px] text-slate-400">
          <span>{{ rows.length }} records</span>
          <button
            class="inline-flex h-6 w-6 items-center justify-center rounded border border-slate-200 hover:bg-slate-50"
            :disabled="loading"
            @click="loadSlipList"
          >
            <i :class="['far fa-sync-alt text-[10px]', loading ? 'animate-spin' : '']"></i>
          </button>
        </div>
      </div>
    </div>

    <!-- Error -->
    <div v-if="error" class="mx-4 mt-3 rounded-lg border border-rose-100 bg-rose-50 px-4 py-2 text-xs text-rose-700">
      <i class="far fa-exclamation-circle mr-1"></i>{{ error }}
    </div>

    <!-- ── Table card ──────────────────────────────────────────────────── -->
    <div class="bg-white">
      <div class="w-full overflow-x-auto overscroll-x-contain [scrollbar-width:thin]">
        <table class="min-w-[1080px] w-full border-collapse text-xs leading-tight">
          <thead>
            <tr class="bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              <th class="w-8 border-b border-slate-200 px-3 py-2 text-center">#</th>
              <th class="border-b border-slate-200 px-3 py-2 text-left">Employee</th>
              <th class="border-b border-slate-200 px-3 py-2 text-left">ID</th>
              <th class="border-b border-slate-200 px-3 py-2 text-center">Mode</th>
              <th class="border-b border-slate-200 px-3 py-2 text-left">Cycle</th>
              <th class="border-b border-slate-200 px-3 py-2 text-left">Joining</th>
              <th class="border-b border-slate-200 px-3 py-2 text-right">Earnings</th>
              <th class="border-b border-slate-200 px-3 py-2 text-right">Deductions</th>
              <th class="border-b border-slate-200 px-3 py-2 text-right">Net Pay</th>
              <th class="w-20 border-b border-slate-200 px-3 py-2 text-center">Slip</th>
            </tr>
          </thead>
          <tbody>

            <!-- Skeleton -->
            <template v-if="loading && !rows.length">
              <tr v-for="i in 10" :key="`sk-${i}`" class="animate-pulse border-b border-slate-100">
                <td class="px-3 py-2.5"><div class="mx-auto h-3 w-4 rounded bg-slate-100"></div></td>
                <td class="px-3 py-2.5">
                  <div class="h-3 w-32 rounded bg-slate-100"></div>
                  <div class="mt-1 h-2.5 w-20 rounded bg-slate-100"></div>
                </td>
                <td class="px-3 py-2.5"><div class="h-3 w-16 rounded bg-slate-100"></div></td>
                <td class="px-3 py-2.5"><div class="mx-auto h-4 w-12 rounded-full bg-slate-100"></div></td>
                <td class="px-3 py-2.5"><div class="h-3 w-24 rounded bg-slate-100"></div></td>
                <td class="px-3 py-2.5"><div class="h-3 w-18 rounded bg-slate-100"></div></td>
                <td class="px-3 py-2.5"><div class="ml-auto h-3 w-16 rounded bg-slate-100"></div></td>
                <td class="px-3 py-2.5"><div class="ml-auto h-3 w-16 rounded bg-slate-100"></div></td>
                <td class="px-3 py-2.5"><div class="ml-auto h-3 w-16 rounded bg-slate-100"></div></td>
                <td class="px-3 py-2.5"><div class="mx-auto h-6 w-14 rounded bg-slate-100"></div></td>
              </tr>
            </template>

            <!-- Data rows -->
            <tr
              v-for="(p, idx) in rows"
              :key="p.id"
              :class="[
                'group border-b border-slate-100 border-l-2 transition hover:bg-rose-50/20',
                isCash(p) ? 'border-l-emerald-300' : 'border-l-blue-300',
                idx % 2 === 1 ? 'bg-slate-50/30' : 'bg-white',
              ]"
            >
              <td class="px-3 py-1.5 text-center font-mono text-[10px] text-slate-400">{{ idx + 1 }}</td>
              <td class="px-3 py-1.5">
                <div class="font-semibold text-slate-800 leading-tight">{{ p.employee_name || '-' }}</div>
                <div class="text-[10px] text-slate-400 mt-0.5">{{ p.department_name || '—' }}</div>
              </td>
              <td class="px-3 py-1.5">
                <span class="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-600">{{ p.employee_code || '-' }}</span>
              </td>
              <td class="px-3 py-1.5 text-center">
                <span
                  v-if="!isCash(p)"
                  class="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700"
                >
                  <i class="far fa-university text-[9px]"></i> Bank
                </span>
                <span
                  v-else
                  class="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700"
                >
                  <i class="far fa-money-bill-wave text-[9px]"></i> Cash
                </span>
              </td>
              <td class="px-3 py-1.5">
                <span class="rounded border border-violet-100 bg-violet-50 px-1.5 py-0.5 text-[10px] font-semibold text-violet-700">
                  {{ p.payroll_cycle_label || cycleLabel(p.payroll_cycle || p.settlement_mode) }}
                </span>
              </td>
              <td class="px-3 py-1.5 font-mono text-[11px] text-slate-500 whitespace-nowrap">{{ formatDate(p.joining_date) }}</td>
              <td class="px-3 py-1.5 text-right font-mono text-[11px] font-semibold text-slate-700">{{ formatCompactCurrency(p.earnings?.total) }}</td>
              <td class="px-3 py-1.5 text-right font-mono text-[11px] font-semibold text-rose-600">{{ formatCompactCurrency(p.deductions?.total) }}</td>
              <td class="px-3 py-1.5 text-right font-mono text-[12px] font-bold text-emerald-700">{{ formatCompactCurrency(p.net_payment) }}</td>
              <td class="px-3 py-1.5 text-center">
                <button
                  class="inline-flex h-6 w-6 items-center justify-center rounded border border-slate-200 text-slate-400 transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600"
                  title="View Slip"
                  @click="viewSlip(p.id)"
                >
                  <i class="far fa-file-alt text-[10px]"></i>
                </button>
              </td>
            </tr>

            <!-- Empty -->
            <tr v-if="!loading && !rows.length">
              <td colspan="10" class="py-16 text-center">
                <div class="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100">
                  <i class="far fa-receipt text-xl text-slate-300"></i>
                </div>
                <p class="mt-3 text-sm font-semibold text-slate-500">No payroll slip records found</p>
                <p class="text-xs text-slate-400">Try a different month or payment mode</p>
              </td>
            </tr>

            <!-- Totals footer -->
            <tr v-if="rows.length" class="bg-slate-50 font-bold text-xs">
              <td colspan="6" class="px-3 py-2 text-right text-slate-600 uppercase tracking-wide text-[10px]">Grand Total</td>
              <td class="px-3 py-2 text-right font-mono text-slate-700">{{ formatCompactCurrency(rows.reduce((s,p) => s + Number(p.earnings?.total||0), 0)) }}</td>
              <td class="px-3 py-2 text-right font-mono text-rose-600">{{ formatCompactCurrency(rows.reduce((s,p) => s + Number(p.deductions?.total||0), 0)) }}</td>
              <td class="px-3 py-2 text-right font-mono text-emerald-700 text-[13px]">{{ formatCompactCurrency(grandTotal) }}</td>
              <td></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
