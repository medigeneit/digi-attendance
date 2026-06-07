<script setup>
import { computed, ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'
import { storeToRefs } from 'pinia'
import { usePayrollManagementStore } from '@/stores/payrollManagement'
import EmployeeFilter from '@/components/common/EmployeeFilter.vue'
import LoaderView from '@/components/common/LoaderView.vue'
import PaginationBar from '@/components/PaginationBar.vue'
import FlexibleDatePicker from '@/components/FlexibleDatePicker.vue'
import PayrollStatusBadge from '@/components/payroll/PayrollStatusBadge.vue'
import PaymentStatusModal from '@/components/payroll/PaymentStatusModal.vue'

const router = useRouter()
const route = useRoute()
const toast = useToast()
const payrollStore = usePayrollManagementStore()

const { list, loading, error, pagination } = storeToRefs(payrollStore)

const getCurrentMonth = () => new Date().toISOString().slice(0, 7)

const filters = ref({
  company_id: '',
  department_id: '',
  employee_id: '',
  line_type: 'all',
  salary_month: getCurrentMonth(),
  payroll_cycle: 'regular',
  payment_status: '',
  default_payment_method: '',
  page: 1,
  per_page: 15,
})

const showPaymentModal = ref(false)
const selectedPayroll = ref(null)

const cycleOptions = [
  { value: 'regular', label: 'Regular Monthly' },
  { value: 'half_salary_advance', label: 'Half Salary Advance' },
  { value: 'final_settlement', label: 'Final Settlement' },
  { value: 'bonus_only', label: 'Bonus Only' },
]

const statusOptions = ['Pending', 'Generated', 'Reviewed', 'Approved', 'Paid', 'Locked', 'Hold', 'Cancelled', 'Partial']

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

const handleSalaryMonthChange = () => {
  filters.value.page = 1
  load()
}

const summaryCards = computed(() => {
  const rows = list.value || []
  const totalGross = rows.reduce((sum, row) => sum + Number(row.gross_salary || 0), 0)
  const totalDeduction = rows.reduce((sum, row) => sum + Number(row.total_deduction || 0), 0)
  const totalNet = rows.reduce((sum, row) => sum + Number(row.net_salary || 0), 0)
  const paidCount = rows.filter((r) => ['paid', 'locked'].includes(String(r.payment_status || '').toLowerCase())).length

  return [
    {
      label: 'Total Employees',
      value: rows.length,
      sub: `${paidCount} paid`,
      icon: 'fa-users',
      iconBg: 'bg-blue-100 text-blue-600',
      tone: 'border-blue-200 bg-blue-50',
      labelColor: 'text-blue-600',
      valueColor: 'text-blue-900',
      subColor: 'text-blue-500',
      isCount: true,
    },
    {
      label: 'Gross Salary',
      value: totalGross,
      sub: `${rows.length} records`,
      icon: 'fa-coins',
      iconBg: 'bg-emerald-100 text-emerald-600',
      tone: 'border-emerald-200 bg-emerald-50',
      labelColor: 'text-emerald-600',
      valueColor: 'text-emerald-900',
      subColor: 'text-emerald-500',
      isCount: false,
    },
    {
      label: 'Total Deductions',
      value: totalDeduction,
      sub: `${formatCompactCurrency((totalDeduction / (totalGross || 1)) * 100)}% of gross`,
      icon: 'fa-minus-circle',
      iconBg: 'bg-rose-100 text-rose-600',
      tone: 'border-rose-200 bg-rose-50',
      labelColor: 'text-rose-600',
      valueColor: 'text-rose-900',
      subColor: 'text-rose-500',
      isCount: false,
    },
    {
      label: 'Net Payable',
      value: totalNet,
      sub: `${formatCompactCurrency((totalNet / (totalGross || 1)) * 100)}% of gross`,
      icon: 'fa-wallet',
      iconBg: 'bg-indigo-100 text-indigo-600',
      tone: 'border-indigo-200 bg-indigo-50',
      labelColor: 'text-indigo-600',
      valueColor: 'text-indigo-900',
      subColor: 'text-indigo-500',
      isCount: false,
    },
  ]
})

const columnTotals = computed(() => {
  const rows = list.value || []
  const sum = (key) => rows.reduce((s, r) => s + toNumber(r[key]), 0)
  return {
    basic_salary: sum('basic_salary'),
    house_rent: sum('house_rent'),
    medical_allowance: sum('medical_allowance'),
    conveyance_allowance: sum('conveyance_allowance'),
    gross_salary: sum('gross_salary'),
    other_allowance: rows.reduce((s, r) => s + getDisplayOtherAllowance(r), 0),
    pf_allowance: rows.reduce((s, r) => s + getPfAllowanceAmount(r), 0),
    arrear: rows.reduce((s, r) => s + getArrearAmount(r), 0),
    bonus_amount: sum('bonus_amount'),
    manual_addition: sum('manual_addition'),
    total_earnings: rows.reduce((s, r) => s + getTotalEarnings(r), 0),
    pf_deduction: sum('pf_deduction'),
    meal_deduction: sum('meal_deduction'),
    loan_deduction: sum('loan_deduction'),
    security_money_deduction: sum('security_money_deduction'),
    other_deduction: sum('other_deduction'),
    advance_deduction: sum('advance_deduction'),
    paycut_deduction: sum('paycut_deduction'),
    total_deduction: sum('total_deduction'),
    net_salary: sum('net_salary'),
  }
})

const buildRouteQuery = () => {
  const params = { ...filters.value }
  delete params.default_payment_method
  Object.keys(params).forEach((k) => { if (!params[k]) delete params[k] })
  return params
}

const buildApiParams = () => {
  const params = { ...filters.value }
  delete params.default_payment_method
  if (params.employee_id) {
    params.user_id = params.employee_id
  }
  delete params.employee_id
  Object.keys(params).forEach((k) => { if (!params[k]) delete params[k] })
  return params
}

const onEmployeeFilterChange = (payload = {}) => {
  filters.value = {
    ...filters.value,
    company_id: payload.company_id || '',
    department_id: payload.department_id || '',
    employee_id: payload.employee_id || '',
    line_type: payload.line_type || 'all',
    page: 1,
  }
  load()
}

const goToGenerate = () => {
  router.push({
    name: 'PayrollBatchGenerate',
    query: buildRouteQuery(),
  })
}

const resetFilters = () => {
  filters.value = {
    company_id: '',
    department_id: '',
    employee_id: '',
    line_type: 'all',
    salary_month: getCurrentMonth(),
    payroll_cycle: 'regular',
    payment_status: '',
    default_payment_method: '',
    page: 1,
    per_page: 15,
  }
  load()
}

const applyRouteQueryToFilters = () => {
  const q = route.query
  filters.value = {
    company_id: String(q.company_id || ''),
    department_id: String(q.department_id || ''),
    employee_id: String(q.employee_id || q.user_id || ''),
    line_type: String(q.line_type || 'all'),
    salary_month: String(q.salary_month || getCurrentMonth()),
    payroll_cycle: String(q.payroll_cycle || 'regular'),
    payment_status: String(q.payment_status || ''),
    default_payment_method: String(q.default_payment_method || ''),
    page: Number(q.page) > 0 ? Number(q.page) : 1,
    per_page: Number(q.per_page) > 0 ? Number(q.per_page) : 15,
  }
}

async function load() {
  await router.replace({ query: buildRouteQuery() })
  await payrollStore.fetchList(buildApiParams())
}

async function handleDownloadExcel() {
  try {
    const params = buildApiParams()
    delete params.page
    delete params.per_page
    await payrollStore.downloadExcel(params)
    toast.success('Payroll report downloaded.')
  } catch (e) {
    toast.error(e.message || 'Download failed.')
  }
}

onMounted(async () => {
  applyRouteQueryToFilters()
  await load()
})

const openPaymentModal = (p) => {
  selectedPayroll.value = p
  showPaymentModal.value = true
}

const handlePaymentSubmit = async ({ id, payload }) => {
  try {
    await payrollStore.updatePaymentStatus(id, payload)
    toast.success('Payment status updated.')
    showPaymentModal.value = false
    selectedPayroll.value = null
  } catch (e) {
    toast.error(e.message || 'Update failed.')
  }
}

const formatCompactCurrency = (value) => {
  if (value === null || value === undefined || value === '') return '—'
  const num = parseFloat(value)
  if (isNaN(num)) return '—'
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num)
}

const formatMonth = (value) => {
  if (!value) return '—'
  const m = String(value).slice(0, 7)
  if (!/^\d{4}-\d{2}$/.test(m)) return m
  const [y, mo] = m.split('-').map(Number)
  return new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric' }).format(new Date(Date.UTC(y, mo - 1, 1)))
}

const formatDate = (value) => {
  if (!value) return '-'
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-').map(Number)
    const date = new Date(Date.UTC(year, month - 1, day))
    return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(date)
  }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(date)
}

const toNumber = (value) => {
  const num = Number(value)
  return Number.isFinite(num) ? num : 0
}

const allowanceRows = (payroll) =>
  Array.isArray(payroll?.other_allowance_breakdown) ? payroll.other_allowance_breakdown : []

const getAllowanceAmountByCode = (payroll, code) => {
  const targetCode = String(code || '').trim().toUpperCase()
  const targetName = String(code || '').trim().toLowerCase()
  return allowanceRows(payroll)
    .filter((row) => {
      const allowanceCode = String(row?.allowance_code || '').trim().toUpperCase()
      const allowanceName = String(row?.allowance_name || '').trim().toLowerCase()
      return allowanceCode === targetCode || allowanceName === targetName
    })
    .reduce((sum, row) => sum + toNumber(row?.amount), 0)
}

const getArrearAmount = (payroll) => getAllowanceAmountByCode(payroll, 'ARREAR')
const getPfAllowanceAmount = (payroll) => getAllowanceAmountByCode(payroll, 'PF')
const getDisplayOtherAllowance = (payroll) =>
  Math.max(0, toNumber(payroll?.other_allowance_total) - getArrearAmount(payroll) - getPfAllowanceAmount(payroll))

const getTotalEarnings = (payroll) =>
  toNumber(payroll?.gross_salary) +
  toNumber(payroll?.other_allowance_total) +
  toNumber(payroll?.manual_addition) +
  toNumber(payroll?.bonus_amount)

const isLockedPayroll = (payroll) =>
  ['paid', 'locked'].includes(String(payroll?.payment_status || payroll?.status || '').toLowerCase())

const activeFiltersCount = computed(() => {
  let count = 0
  if (filters.value.company_id) count++
  if (filters.value.department_id) count++
  if (filters.value.employee_id) count++
  if (filters.value.line_type && filters.value.line_type !== 'all') count++
  if (filters.value.payment_status) count++
  if (filters.value.payroll_cycle && filters.value.payroll_cycle !== 'regular') count++
  return count
})
</script>

<template>
  <div class="min-h-screen space-y-2 p-3 md:p-4">

    <!-- ── Compact Toolbar ────────────────────────────── -->
    <div class="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 shadow-sm">
      <div class="flex items-center gap-2.5">
        <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
          <i class="far fa-file-invoice-dollar text-sm"></i>
        </div>
        <div class="leading-tight">
          <span class="text-sm font-bold text-slate-800">Payroll Report</span>
          <span class="ml-2 text-xs text-slate-400">{{ formatMonth(filters.salary_month) }}</span>
          <span v-if="activeFiltersCount" class="ml-1.5 rounded-full bg-indigo-100 px-1.5 py-0.5 text-[10px] font-bold text-indigo-600">
            {{ activeFiltersCount }} filters
          </span>
        </div>
      </div>
      <div class="flex items-center gap-1.5">
        <button class="btn-3 h-7 px-3 text-xs" @click="router.push({ name: 'DoctorPayrollList' })">
          <i class="far fa-user-md"></i> Doctor
        </button>
        <button class="btn-3 h-7 px-3 text-xs" :disabled="loading || !list.length" @click="handleDownloadExcel">
          <i class="far fa-file-excel"></i> Excel
        </button>
        <button class="btn-2 h-7 px-3 text-xs" @click="goToGenerate">
          <i class="far fa-plus"></i> Generate
        </button>
      </div>
    </div>

    <!-- ── Compact Filter Bar ─────────────────────────── -->
    <div class="rounded-2xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm">
      <EmployeeFilter
        :company_id="filters.company_id"
        :department_id="filters.department_id"
        :employee_id="filters.employee_id"
        :line_type="filters.line_type"
        :with-type="true"
        :with-employee="true"
        @update:company_id="(v) => (filters.company_id = v)"
        @update:department_id="(v) => (filters.department_id = v)"
        @update:employee_id="(v) => (filters.employee_id = v)"
        @update:line_type="(v) => (filters.line_type = v)"
        @filter-change="onEmployeeFilterChange"
      >
        <FlexibleDatePicker
          v-model="salaryMonthPeriod"
          :show-year="false"
          :show-month="true"
          :show-date="false"
          label="Month"
          @change="handleSalaryMonthChange"
        />
      </EmployeeFilter>

      <div class="mt-2 flex flex-wrap items-center gap-2">
        <select v-model="filters.payroll_cycle" class="erp-select-sm" @change="() => { filters.page = 1; load() }">
          <option value="">All Cycles</option>
          <option v-for="c in cycleOptions" :key="c.value" :value="c.value">{{ c.label }}</option>
        </select>
        <select v-model="filters.payment_status" class="erp-select-sm" @change="() => { filters.page = 1; load() }">
          <option value="">All Statuses</option>
          <option v-for="s in statusOptions" :key="s" :value="s">{{ s }}</option>
        </select>
        <select v-model="filters.per_page" class="erp-select-sm w-20" @change="() => { filters.page = 1; load() }">
          <option :value="15">15 / pg</option>
          <option :value="25">25 / pg</option>
          <option :value="50">50 / pg</option>
          <option :value="100">100 / pg</option>
        </select>
        <button class="inline-flex h-7 items-center gap-1 rounded-lg border border-slate-200 px-2.5 text-xs text-slate-500 hover:bg-slate-50" @click="resetFilters">
          <i class="far fa-undo text-[9px]"></i> Reset
        </button>
      </div>
    </div>

    <!-- ── Summary Strip ──────────────────────────────── -->
    <div class="grid grid-cols-2 gap-2 xl:grid-cols-4">
      <div
        v-for="card in summaryCards"
        :key="card.label"
        class="flex items-center gap-3 rounded-xl border px-3 py-2 shadow-sm"
        :class="card.tone"
      >
        <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm" :class="card.iconBg">
          <i :class="`far ${card.icon}`"></i>
        </div>
        <div class="min-w-0 flex-1">
          <p class="text-[10px] font-semibold uppercase tracking-wider truncate" :class="card.labelColor">{{ card.label }}</p>
          <p class="font-bold leading-none" :class="[card.valueColor, card.isCount ? 'text-xl' : 'text-base font-mono']">
            {{ card.isCount ? card.value : formatCompactCurrency(card.value) }}
          </p>
          <p class="text-[10px] truncate" :class="card.subColor">{{ card.sub }}</p>
        </div>
      </div>
    </div>

    <!-- ── Loading ─────────────────────────────────────── -->
    <LoaderView v-if="loading" />

    <!-- ── Error ───────────────────────────────────────── -->
    <div
      v-else-if="error"
      class="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
    >
      <i class="fas fa-exclamation-circle shrink-0 text-red-400"></i>
      {{ error }}
    </div>

    <!-- ── Empty State ─────────────────────────────────── -->
    <div v-else-if="!list.length" class="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white py-10 text-center shadow-sm">
      <div class="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-2xl text-slate-300">
        <i class="far fa-file-invoice-dollar"></i>
      </div>
      <p class="mt-3 text-sm font-semibold text-slate-600">No payrolls found</p>
      <p class="mt-1 text-xs text-slate-400">Generate a payroll batch to create records.</p>
      <button class="btn-2 mt-4 h-8 px-3 text-xs" @click="goToGenerate">
        <i class="far fa-plus"></i> Generate Payroll
      </button>
    </div>

    <!-- ── Data Table ──────────────────────────────────── -->
    <div v-else class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

      <!-- Table Header Bar -->
      <div class="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/60 px-3 py-2">
        <div class="flex items-center gap-2">
          <span class="text-xs font-semibold text-slate-700">Detailed Payroll Breakdown</span>
          <span class="text-[10px] text-slate-400">· {{ formatMonth(filters.salary_month) }}</span>
        </div>
        <div class="flex items-center gap-1.5 text-[11px] text-slate-500">
          <span class="rounded border border-slate-200 bg-white px-2 py-0.5 font-medium">
            {{ pagination.total || list.length }} records
          </span>
          <span class="rounded border border-slate-200 bg-white px-2 py-0.5 font-medium">
            pg {{ filters.page }}/{{ pagination.last_page || 1 }}
          </span>
        </div>
      </div>

      <div class="w-full overflow-x-auto overscroll-x-contain [scrollbar-width:thin]">
        <table class="prl-table min-w-[1560px] w-full table-fixed border-collapse text-[10px] leading-tight">
          <colgroup>
            <col class="w-[32px]" />
            <col class="w-[116px]" />
            <col class="w-[78px]" />
            <col class="w-[66px]" />
            <!-- earnings ×11 -->
            <col v-for="i in 11" :key="`e${i}`" class="w-[56px]" />
            <!-- deductions ×8 -->
            <col v-for="i in 8" :key="`d${i}`" class="w-[56px]" />
            <!-- net + status + action -->
            <col class="w-[68px]" />
            <col class="w-[110px]" />
            <col class="w-[44px]" />
          </colgroup>

          <thead class="sticky top-0 z-10">
            <!-- Group Row -->
            <tr class="text-[9px] font-bold uppercase tracking-wider">
              <th class="border border-slate-200 bg-slate-100 px-1 py-2 text-slate-500" rowspan="2">#</th>
              <th class="border border-slate-200 bg-slate-100 px-1.5 py-2 text-left text-slate-600" rowspan="2">Employee</th>
              <th class="border border-slate-200 bg-slate-100 px-1 py-2 text-slate-500" rowspan="2">Emp ID</th>
              <th class="border border-slate-200 bg-slate-100 px-1 py-2 text-slate-500" rowspan="2">Joining</th>
              <th class="border border-emerald-300 bg-emerald-100 px-1 py-2 text-center text-emerald-700" colspan="11">
                <i class="far fa-arrow-up mr-0.5 text-[8px]"></i> Earnings
              </th>
              <th class="border border-rose-300 bg-rose-100 px-1 py-2 text-center text-rose-700" colspan="8">
                <i class="far fa-arrow-down mr-0.5 text-[8px]"></i> Deductions
              </th>
              <th class="border border-indigo-300 bg-indigo-100 px-1 py-2 text-center text-indigo-700" rowspan="2">
                Net Pay
              </th>
              <th class="border border-slate-200 bg-slate-100 px-1 py-2 text-slate-500" rowspan="2">Status</th>
              <th class="border border-slate-200 bg-slate-100 px-1 py-2 text-slate-500" rowspan="2">Act.</th>
            </tr>

            <!-- Sub-header Row -->
            <tr class="text-[9px] font-semibold uppercase tracking-wider text-slate-600">
              <!-- Earnings -->
              <th class="border border-emerald-200 bg-emerald-50 px-1 py-1.5 text-right text-emerald-700">Basic</th>
              <th class="border border-emerald-200 bg-emerald-50 px-1 py-1.5 text-right text-emerald-700">House</th>
              <th class="border border-emerald-200 bg-emerald-50 px-1 py-1.5 text-right text-emerald-700">Med.</th>
              <th class="border border-emerald-200 bg-emerald-50 px-1 py-1.5 text-right text-emerald-700">Conv.</th>
              <th class="border border-emerald-200 bg-emerald-50 px-1 py-1.5 text-right font-bold text-emerald-800">Gross</th>
              <th class="border border-emerald-200 bg-emerald-50 px-1 py-1.5 text-right text-emerald-700">Other</th>
              <th class="border border-emerald-200 bg-emerald-50 px-1 py-1.5 text-right text-emerald-700">PF+</th>
              <th class="border border-emerald-200 bg-emerald-50 px-1 py-1.5 text-right text-emerald-700">Arr.</th>
              <th class="border border-emerald-200 bg-emerald-50 px-1 py-1.5 text-right text-emerald-700">Bonus</th>
              <th class="border border-emerald-200 bg-emerald-50 px-1 py-1.5 text-right text-emerald-700">OT</th>
              <th class="border border-emerald-200 bg-emerald-50 px-1 py-1.5 text-right font-bold text-emerald-900">E.Tot</th>
              <!-- Deductions -->
              <th class="border border-rose-200 bg-rose-50 px-1 py-1.5 text-right text-rose-700">PF−</th>
              <th class="border border-rose-200 bg-rose-50 px-1 py-1.5 text-right text-rose-700">Meal</th>
              <th class="border border-rose-200 bg-rose-50 px-1 py-1.5 text-right text-rose-700">Loan</th>
              <th class="border border-rose-200 bg-rose-50 px-1 py-1.5 text-right text-rose-700">S.M.</th>
              <th class="border border-rose-200 bg-rose-50 px-1 py-1.5 text-right text-rose-700">Other</th>
              <th class="border border-rose-200 bg-rose-50 px-1 py-1.5 text-right text-rose-700">Adv.</th>
              <th class="border border-rose-200 bg-rose-50 px-1 py-1.5 text-right text-rose-700">Cut</th>
              <th class="border border-rose-200 bg-rose-50 px-1 py-1.5 text-right font-bold text-rose-900">D.Tot</th>
            </tr>
          </thead>

          <tbody>
            <tr
              v-for="(p, i) in list"
              :key="p.id"
              class="group transition-colors duration-75 hover:bg-indigo-50/40"
              :class="i % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'"
            >
              <!-- # -->
              <td class="border border-slate-100 px-1 py-1.5 text-center text-slate-400">
                {{ (filters.page - 1) * filters.per_page + i + 1 }}
              </td>

              <!-- Employee -->
              <td class="border border-slate-100 px-1.5 py-1.5">
                <div class="truncate font-semibold leading-tight text-slate-900" :title="p.user?.name || p.employee_name || '-'">
                  {{ p.user?.name || p.employee_name || '-' }}
                </div>
                <div class="mt-0.5 truncate text-[9px] text-slate-400" :title="p.user?.designation?.title || p.company_name || '-'">
                  {{ p.user?.designation?.title || p.company_name || '-' }}
                </div>
              </td>

              <!-- Emp ID -->
              <td class="border border-slate-100 px-1 py-1.5">
                <span class="inline-flex rounded-md bg-slate-100 px-1.5 py-0.5 font-mono leading-none text-slate-700">
                  {{ p.user?.employee_id || p.employee_code || '-' }}
                </span>
              </td>

              <!-- Joining -->
              <td class="border border-slate-100 px-1 py-1.5 text-[9px] text-slate-500">
                {{ formatDate(p.user?.joining_date || p.joining_date) }}
              </td>

              <!-- ── Earnings ── -->
              <td class="border border-emerald-100 bg-emerald-50/20 px-1 py-1.5 text-right font-mono text-slate-700">{{ formatCompactCurrency(p.basic_salary) }}</td>
              <td class="border border-emerald-100 bg-emerald-50/20 px-1 py-1.5 text-right font-mono text-slate-700">{{ formatCompactCurrency(p.house_rent) }}</td>
              <td class="border border-emerald-100 bg-emerald-50/20 px-1 py-1.5 text-right font-mono text-slate-700">{{ formatCompactCurrency(p.medical_allowance) }}</td>
              <td class="border border-emerald-100 bg-emerald-50/20 px-1 py-1.5 text-right font-mono text-slate-700">{{ formatCompactCurrency(p.conveyance_allowance) }}</td>
              <td class="border border-emerald-200 bg-emerald-50/40 px-1 py-1.5 text-right font-mono font-semibold text-emerald-800">{{ formatCompactCurrency(p.gross_salary) }}</td>
              <td class="border border-emerald-100 bg-emerald-50/20 px-1 py-1.5 text-right font-mono text-slate-700">{{ formatCompactCurrency(getDisplayOtherAllowance(p)) }}</td>
              <td class="border border-emerald-100 bg-emerald-50/20 px-1 py-1.5 text-right font-mono text-emerald-700">{{ formatCompactCurrency(getPfAllowanceAmount(p)) }}</td>
              <td class="border border-emerald-100 bg-emerald-50/20 px-1 py-1.5 text-right font-mono text-emerald-700">{{ formatCompactCurrency(getArrearAmount(p)) }}</td>
              <td class="border border-emerald-100 bg-emerald-50/20 px-1 py-1.5 text-right font-mono text-emerald-700">{{ formatCompactCurrency(p.bonus_amount) }}</td>
              <td class="border border-emerald-100 bg-emerald-50/20 px-1 py-1.5 text-right font-mono text-slate-700">{{ formatCompactCurrency(p.manual_addition) }}</td>
              <td class="border border-emerald-300 bg-emerald-100/60 px-1 py-1.5 text-right font-mono font-bold text-emerald-900">{{ formatCompactCurrency(getTotalEarnings(p)) }}</td>

              <!-- ── Deductions ── -->
              <td class="border border-rose-100 bg-rose-50/20 px-1 py-1.5 text-right font-mono text-rose-600">{{ formatCompactCurrency(p.pf_deduction) }}</td>
              <td class="border border-rose-100 bg-rose-50/20 px-1 py-1.5 text-right font-mono text-rose-600">{{ formatCompactCurrency(p.meal_deduction) }}</td>
              <td class="border border-rose-100 bg-rose-50/20 px-1 py-1.5 text-right font-mono text-rose-600">{{ formatCompactCurrency(p.loan_deduction) }}</td>
              <td class="border border-rose-100 bg-rose-50/20 px-1 py-1.5 text-right font-mono text-rose-600">{{ formatCompactCurrency(p.security_money_deduction) }}</td>
              <td class="border border-rose-100 bg-rose-50/20 px-1 py-1.5 text-right font-mono text-rose-600">{{ formatCompactCurrency(p.other_deduction) }}</td>
              <td class="border border-rose-100 bg-rose-50/20 px-1 py-1.5 text-right font-mono text-rose-600">{{ formatCompactCurrency(p.advance_deduction) }}</td>
              <td class="border border-rose-100 bg-rose-50/20 px-1 py-1.5 text-right font-mono text-rose-600">{{ formatCompactCurrency(p.paycut_deduction) }}</td>
              <td class="border border-rose-300 bg-rose-100/60 px-1 py-1.5 text-right font-mono font-bold text-rose-800">{{ formatCompactCurrency(p.total_deduction) }}</td>

              <!-- Net Pay -->
              <td class="border border-indigo-200 bg-indigo-50/40 px-1 py-1.5 text-right font-mono font-bold text-indigo-800">
                {{ formatCompactCurrency(p.net_salary) }}
              </td>

              <!-- Status -->
              <td class="border border-slate-100 px-1.5 py-1.5 text-center">
                <div class="flex flex-col items-center gap-1">
                  <PayrollStatusBadge :status="p.payment_status" />
                  <button
                    v-if="!isLockedPayroll(p)"
                    class="inline-flex h-4 items-center gap-0.5 rounded px-1.5 text-[9px] font-medium text-indigo-400 transition hover:bg-indigo-50 hover:text-indigo-600"
                    title="Change payment status"
                    @click="openPaymentModal(p)"
                  >
                    <i class="far fa-pencil text-[8px]"></i> Change
                  </button>
                  <span v-else class="text-[9px] text-slate-300">
                    <i class="fas fa-lock text-[8px]"></i> Locked
                  </span>
                </div>
              </td>

              <!-- Actions -->
              <td class="border border-slate-100 px-1 py-1.5 text-center">
                <button
                  class="inline-flex h-6 w-6 items-center justify-center rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-500 transition hover:border-indigo-300 hover:bg-indigo-100 hover:text-indigo-700"
                  title="View details"
                  @click="router.push({ name: 'PayrollShow', params: { id: p.id } })"
                >
                  <i class="far fa-eye text-[10px]"></i>
                </button>
              </td>
            </tr>
          </tbody>

          <!-- ── Totals Footer ── -->
          <tfoot v-if="list.length">
            <tr class="bg-slate-100 text-[10px] font-bold">
              <td class="border border-slate-300 px-1 py-2 text-center text-slate-500" colspan="4">
                Totals ({{ list.length }})
              </td>
              <!-- Earnings -->
              <td class="border border-emerald-200 bg-emerald-100/80 px-1 py-2 text-right font-mono text-emerald-800">{{ formatCompactCurrency(columnTotals.basic_salary) }}</td>
              <td class="border border-emerald-200 bg-emerald-100/80 px-1 py-2 text-right font-mono text-emerald-800">{{ formatCompactCurrency(columnTotals.house_rent) }}</td>
              <td class="border border-emerald-200 bg-emerald-100/80 px-1 py-2 text-right font-mono text-emerald-800">{{ formatCompactCurrency(columnTotals.medical_allowance) }}</td>
              <td class="border border-emerald-200 bg-emerald-100/80 px-1 py-2 text-right font-mono text-emerald-800">{{ formatCompactCurrency(columnTotals.conveyance_allowance) }}</td>
              <td class="border border-emerald-300 bg-emerald-200/80 px-1 py-2 text-right font-mono text-emerald-900">{{ formatCompactCurrency(columnTotals.gross_salary) }}</td>
              <td class="border border-emerald-200 bg-emerald-100/80 px-1 py-2 text-right font-mono text-emerald-800">{{ formatCompactCurrency(columnTotals.other_allowance) }}</td>
              <td class="border border-emerald-200 bg-emerald-100/80 px-1 py-2 text-right font-mono text-emerald-800">{{ formatCompactCurrency(columnTotals.pf_allowance) }}</td>
              <td class="border border-emerald-200 bg-emerald-100/80 px-1 py-2 text-right font-mono text-emerald-800">{{ formatCompactCurrency(columnTotals.arrear) }}</td>
              <td class="border border-emerald-200 bg-emerald-100/80 px-1 py-2 text-right font-mono text-emerald-800">{{ formatCompactCurrency(columnTotals.bonus_amount) }}</td>
              <td class="border border-emerald-200 bg-emerald-100/80 px-1 py-2 text-right font-mono text-emerald-800">{{ formatCompactCurrency(columnTotals.manual_addition) }}</td>
              <td class="border border-emerald-300 bg-emerald-200/80 px-1 py-2 text-right font-mono text-emerald-900">{{ formatCompactCurrency(columnTotals.total_earnings) }}</td>
              <!-- Deductions -->
              <td class="border border-rose-200 bg-rose-100/80 px-1 py-2 text-right font-mono text-rose-800">{{ formatCompactCurrency(columnTotals.pf_deduction) }}</td>
              <td class="border border-rose-200 bg-rose-100/80 px-1 py-2 text-right font-mono text-rose-800">{{ formatCompactCurrency(columnTotals.meal_deduction) }}</td>
              <td class="border border-rose-200 bg-rose-100/80 px-1 py-2 text-right font-mono text-rose-800">{{ formatCompactCurrency(columnTotals.loan_deduction) }}</td>
              <td class="border border-rose-200 bg-rose-100/80 px-1 py-2 text-right font-mono text-rose-800">{{ formatCompactCurrency(columnTotals.security_money_deduction) }}</td>
              <td class="border border-rose-200 bg-rose-100/80 px-1 py-2 text-right font-mono text-rose-800">{{ formatCompactCurrency(columnTotals.other_deduction) }}</td>
              <td class="border border-rose-200 bg-rose-100/80 px-1 py-2 text-right font-mono text-rose-800">{{ formatCompactCurrency(columnTotals.advance_deduction) }}</td>
              <td class="border border-rose-200 bg-rose-100/80 px-1 py-2 text-right font-mono text-rose-800">{{ formatCompactCurrency(columnTotals.paycut_deduction) }}</td>
              <td class="border border-rose-300 bg-rose-200/80 px-1 py-2 text-right font-mono text-rose-900">{{ formatCompactCurrency(columnTotals.total_deduction) }}</td>
              <!-- Net -->
              <td class="border border-indigo-300 bg-indigo-200/80 px-1 py-2 text-right font-mono text-indigo-900">{{ formatCompactCurrency(columnTotals.net_salary) }}</td>
              <td class="border border-slate-300 bg-slate-100 px-1 py-2" colspan="2"></td>
            </tr>
          </tfoot>
        </table>
      </div>

      <!-- Table Footer Bar -->
      <div class="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 bg-slate-50/50 px-3 py-1.5 text-[10px] text-slate-400">
        <span>
          Showing <strong class="text-slate-600">{{ list.length }}</strong> of <strong class="text-slate-600">{{ pagination.total || list.length }}</strong> · {{ formatMonth(filters.salary_month) }}
        </span>
        <div class="flex items-center gap-2.5">
          <span class="flex items-center gap-1"><span class="inline-block h-2 w-2 rounded-sm bg-emerald-200 ring-1 ring-emerald-300"></span>Earnings</span>
          <span class="flex items-center gap-1"><span class="inline-block h-2 w-2 rounded-sm bg-rose-200 ring-1 ring-rose-300"></span>Deductions</span>
          <span class="flex items-center gap-1"><span class="inline-block h-2 w-2 rounded-sm bg-indigo-200 ring-1 ring-indigo-300"></span>Net Pay</span>
        </div>
      </div>
    </div>

    <!-- ── Pagination ───────────────────────────────────── -->
    <PaginationBar
      v-if="pagination.total > 0"
      :page="pagination.current_page || filters.page"
      :per-page="pagination.per_page || filters.per_page"
      :total="pagination.total || list.length"
      :last-page="pagination.last_page || 1"
      @page-change="(p) => { filters.page = p; load() }"
    />

    <!-- ── Payment Status Modal ─────────────────────────── -->
    <PaymentStatusModal
      :show="showPaymentModal"
      :payroll-id="selectedPayroll?.id"
      :current-status="selectedPayroll?.payment_status"
      @close="() => { showPaymentModal = false; selectedPayroll = null }"
      @submit="handlePaymentSubmit"
    />

  </div>
</template>

<style scoped>
.prl-table {
  table-layout: fixed;
}

.prl-table th,
.prl-table td {
  padding: 0.2rem 0.25rem !important;
  line-height: 1.1 !important;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.erp-select {
  width: 100%;
  border-radius: 0.75rem;
  border: 1px solid #e2e8f0;
  background-color: #fff;
  padding: 0.5rem 0.75rem;
  font-size: 0.875rem;
  color: #334155;
  box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  transition: border-color 0.15s, box-shadow 0.15s;
}
.erp-select:focus {
  outline: none;
  border-color: #818cf8;
  box-shadow: 0 0 0 3px rgb(99 102 241 / 0.15);
}
.erp-select-sm {
  border-radius: 0.5rem;
  border: 1px solid #e2e8f0;
  background-color: #fff;
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;
  color: #475569;
  height: 1.75rem;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.erp-select-sm:focus {
  outline: none;
  border-color: #818cf8;
  box-shadow: 0 0 0 2px rgb(99 102 241 / 0.15);
}
</style>
