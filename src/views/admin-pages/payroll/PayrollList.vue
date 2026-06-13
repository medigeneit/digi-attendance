<script setup>
import { computed, ref, reactive, watch, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'
import { storeToRefs } from 'pinia'
import apiClient from '@/axios'
import { usePayrollManagementStore } from '@/stores/payrollManagement'
import { useUnitStore } from '@/stores/unit'
import EmployeeFilter from '@/components/common/EmployeeFilter.vue'
import LoaderView from '@/components/common/LoaderView.vue'
import FlexibleDatePicker from '@/components/FlexibleDatePicker.vue'
import PayrollStatusBadge from '@/components/payroll/PayrollStatusBadge.vue'
import PaymentStatusModal from '@/components/payroll/PaymentStatusModal.vue'

const router = useRouter()
const route = useRoute()
const toast = useToast()
const payrollStore = usePayrollManagementStore()
const unitStore = useUnitStore()

const { units } = storeToRefs(unitStore)

const rows = ref([])
const loading = ref(false)
const error = ref('')

const getCurrentMonth = () => new Date().toISOString().slice(0, 7)

const filters = ref({
  company_id: '',
  department_id: '',
  unit_id: '',
  employee_id: '',
  line_type: 'all',
  salary_month: getCurrentMonth(),
  payroll_cycle: 'regular',
  payment_status: '',
  default_payment_method: '',
})

const showPaymentModal = ref(false)
const selectedPayroll = ref(null)

const cycleOptions = [
  { value: 'regular', label: 'Regular Monthly' },
  { value: 'half_salary_advance', label: 'Half Salary Advance' },
  { value: 'final_settlement', label: 'Final Settlement' },
  { value: 'bonus_only', label: 'Bonus Only' },
]

const statusOptions = [
  'Pending',
  'Generated',
  'Reviewed',
  'Approved',
  'Paid',
  'Locked',
  'Hold',
  'Cancelled',
  'Partial',
]
const paymentMethodOptions = [
  'Cash',
  'Bank Transfer',
  'bKash',
  'Nagad',
  'Rocket',
  'Cheque',
  'Other',
]

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
  load()
}

const summaryCards = computed(() => {
  const data = rows.value || []
  const totalGross = data.reduce((sum, row) => sum + Number(row.gross_salary || 0), 0)
  const totalDeduction = data.reduce((sum, row) => sum + getTotalDeductions(row), 0)
  const totalNet = data.reduce((sum, row) => sum + Number(row.net_salary || 0), 0)
  const paidCount = data.filter((r) =>
    ['paid', 'locked'].includes(String(r.payment_status || '').toLowerCase()),
  ).length

  return [
    {
      label: 'Total Employees',
      value: data.length,
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
      sub: `${data.length} records`,
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

const buildColumnTotals = (data) => {
  const sum = (key) => data.reduce((s, r) => s + toNumber(r[key]), 0)
  return {
    basic_salary: sum('basic_salary'),
    house_rent: sum('house_rent'),
    medical_allowance: sum('medical_allowance'),
    conveyance_allowance: sum('conveyance_allowance'),
    gross_salary: sum('gross_salary'),
    other_allowance: data.reduce((s, r) => s + getDisplayOtherAllowance(r), 0),
    pf_allowance: data.reduce((s, r) => s + getPfAllowanceAmount(r), 0),
    arrear: data.reduce((s, r) => s + getArrearAmount(r), 0),
    bonus_amount: sum('bonus_amount'),
    manual_addition: data.reduce((s, r) => s + getEarningAdjustmentAmount(r), 0),
    paycut_deduction: data.reduce((s, r) => s - toNumber(r.paycut_deduction), 0),
    total_earnings: data.reduce((s, r) => s + getTotalEarnings(r), 0),
    pf_deduction: sum('pf_deduction'),
    meal_deduction: sum('meal_deduction'),
    loan_deduction: sum('loan_deduction'),
    security_money_deduction: sum('security_money_deduction'),
    other_deduction: sum('other_deduction'),
    advance_deduction: data.reduce((s, r) => s + getTotalAdvanceAmount(r), 0),
    total_deduction: data.reduce((s, r) => s + getTotalDeductions(r), 0),
    net_salary: sum('net_salary'),
  }
}

const columnTotals = computed(() => buildColumnTotals(rows.value || []))

const COST_CENTER = 'Administrative'

const getCostCenter = () => COST_CENTER
const getUnitCode = (payroll) => payroll?.user?.unit?.short_name || 'Unassigned'
const getProjectCode = (payroll) => payroll?.user?.unit?.project_code || '-'
const getUnitName = (payroll) => payroll?.user?.unit?.name || '-'
const getUnitLabel = (payroll) => getUnitCode(payroll)

const sortedRows = computed(() => {
  return [...rows.value].sort((a, b) => {
    const unitA = getUnitLabel(a).toLowerCase()
    const unitB = getUnitLabel(b).toLowerCase()
    if (unitA !== unitB) return unitA.localeCompare(unitB)
    const nameA = (a.user?.name || a.employee_name || '').toLowerCase()
    const nameB = (b.user?.name || b.employee_name || '').toLowerCase()
    return nameA.localeCompare(nameB)
  })
})

const groupedByUnit = computed(() => {
  const groups = []
  let current = null
  let offset = 0
  for (const p of sortedRows.value) {
    const unitName = getUnitLabel(p)
    if (!current || current.unitName !== unitName) {
      current = { unitName, rows: [], offset }
      groups.push(current)
    }
    current.rows.push(p)
    offset++
  }
  return groups.map((g) => ({ ...g, totals: buildColumnTotals(g.rows) }))
})

const buildRouteQuery = () => {
  const params = { ...filters.value }
  Object.keys(params).forEach((k) => {
    if (!params[k]) delete params[k]
  })
  return params
}

const buildApiParams = () => {
  const params = { ...filters.value }
  if (params.employee_id) {
    params.user_id = params.employee_id
  }
  delete params.employee_id
  Object.keys(params).forEach((k) => {
    if (!params[k]) delete params[k]
  })
  return params
}

const onEmployeeFilterChange = (payload = {}) => {
  filters.value = {
    ...filters.value,
    company_id: payload.company_id || '',
    department_id: payload.department_id || '',
    employee_id: payload.employee_id || '',
    line_type: payload.line_type || 'all',
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
    unit_id: '',
    employee_id: '',
    line_type: 'all',
    salary_month: getCurrentMonth(),
    payroll_cycle: 'regular',
    payment_status: '',
    default_payment_method: '',
  }
  load()
}

const applyRouteQueryToFilters = () => {
  const q = route.query
  filters.value = {
    company_id: String(q.company_id || ''),
    department_id: String(q.department_id || ''),
    unit_id: String(q.unit_id || ''),
    employee_id: String(q.employee_id || q.user_id || ''),
    line_type: String(q.line_type || 'all'),
    salary_month: String(q.salary_month || getCurrentMonth()),
    payroll_cycle: String(q.payroll_cycle || 'regular'),
    payment_status: String(q.payment_status || ''),
    default_payment_method: String(q.default_payment_method || ''),
  }
}

async function fetchAllPayrolls(params) {
  const items = []
  let page = 1
  let lastPage = 1
  do {
    const { data } = await apiClient.get('/payrolls', {
      params: { ...params, page, per_page: 200 },
    })
    const pageItems = Array.isArray(data?.data) ? data.data : []
    items.push(...pageItems)
    lastPage = data?.last_page ?? data?.meta?.last_page ?? 1
    page++
  } while (page <= lastPage)
  return items
}

async function load() {
  await router.replace({ query: buildRouteQuery() })
  loading.value = true
  error.value = ''
  try {
    rows.value = await fetchAllPayrolls(buildApiParams())
  } catch (e) {
    error.value = e.message || 'Failed to load payrolls.'
    rows.value = []
  } finally {
    loading.value = false
  }
}

async function handleDownloadExcel() {
  try {
    await payrollStore.downloadExcel(buildApiParams())
    toast.success('Payroll report downloaded.')
  } catch (e) {
    toast.error(e.message || 'Download failed.')
  }
}

onMounted(async () => {
  applyRouteQueryToFilters()
  await Promise.all([unitStore.fetchUnits(), load()])
})

const openPaymentModal = (p) => {
  selectedPayroll.value = p
  showPaymentModal.value = true
}

const handlePaymentSubmit = async ({ id, payload }) => {
  try {
    const res = await payrollStore.updatePaymentStatus(id, payload)
    const updated = res?.data || res
    const idx = rows.value.findIndex((r) => r.id === id)
    if (idx !== -1) {
      rows.value[idx] = { ...rows.value[idx], ...updated }
    }
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
  return new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric' }).format(
    new Date(Date.UTC(y, mo - 1, 1)),
  )
}

const formatDate = (value) => {
  if (!value) return '-'
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-').map(Number)
    const date = new Date(Date.UTC(year, month - 1, day))
    return new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(date)
  }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

const toNumber = (value) => {
  const num = Number(value)
  return Number.isFinite(num) ? num : 0
}

// ── Column customization ──────────────────────────────────
const INFO_COLUMNS = [
  { key: 'emp_id', label: 'Emp ID' },
  { key: 'cost_center', label: 'Cost-Center' },
  { key: 'unit_code', label: 'Unit Code' },
  { key: 'project_code', label: 'Project Code' },
  { key: 'unit', label: 'Unit' },
  { key: 'joining', label: 'Joining' },
]

const EARNINGS_COLUMNS = [
  { key: 'basic_salary', label: 'Basic', tone: 'neutral' },
  { key: 'house_rent', label: 'House', tone: 'neutral' },
  { key: 'medical_allowance', label: 'Med.', tone: 'neutral' },
  { key: 'conveyance_allowance', label: 'Conv.', tone: 'neutral' },
  { key: 'gross_salary', label: 'Gross', tone: 'strong' },
  { key: 'other_allowance', label: 'Other', tone: 'neutral' },
  { key: 'pf_allowance', label: 'PF+', tone: 'highlight' },
  { key: 'arrear', label: 'Arr.', tone: 'highlight' },
  { key: 'bonus_amount', label: 'Bonus', tone: 'highlight' },
  { key: 'manual_addition', label: 'OT', tone: 'neutral' },
  { key: 'paycut_deduction', label: 'Cut', tone: 'reduction' },
]

const DEDUCTION_COLUMNS = [
  { key: 'pf_deduction', label: 'PF−' },
  { key: 'meal_deduction', label: 'Meal' },
  { key: 'loan_deduction', label: 'Loan' },
  { key: 'security_money_deduction', label: 'S.M.' },
  { key: 'other_deduction', label: 'Other' },
  {
    key: 'advance_deduction',
    label: 'Adv.',
    title: 'Advance deduction + advance adjusted (combined)',
  },
]

const TOGGLEABLE_COLUMN_KEYS = [
  ...INFO_COLUMNS.map((c) => c.key),
  ...EARNINGS_COLUMNS.map((c) => c.key),
  ...DEDUCTION_COLUMNS.map((c) => c.key),
]

const COLUMN_VISIBILITY_STORAGE_KEY = 'payroll-list:column-visibility:v1'

const defaultColumnVisibility = () => {
  const visibility = {}
  TOGGLEABLE_COLUMN_KEYS.forEach((key) => {
    visibility[key] = true
  })
  return visibility
}

const loadColumnVisibility = () => {
  const defaults = defaultColumnVisibility()
  try {
    const raw = localStorage.getItem(COLUMN_VISIBILITY_STORAGE_KEY)
    if (raw) {
      const saved = JSON.parse(raw)
      TOGGLEABLE_COLUMN_KEYS.forEach((key) => {
        if (typeof saved[key] === 'boolean') defaults[key] = saved[key]
      })
    }
  } catch (e) {
    /* ignore corrupt storage */
  }
  return defaults
}

const columnVisibility = reactive(loadColumnVisibility())
const showColumnPicker = ref(false)
const columnPickerRef = ref(null)
const columnPickerToggleRef = ref(null)

const handleColumnPickerOutsideClick = (event) => {
  if (!showColumnPicker.value) return
  const panel = columnPickerRef.value
  const toggle = columnPickerToggleRef.value
  if (panel && panel.contains(event.target)) return
  if (toggle && toggle.contains(event.target)) return
  showColumnPicker.value = false
}

onMounted(() => document.addEventListener('mousedown', handleColumnPickerOutsideClick))
onUnmounted(() => document.removeEventListener('mousedown', handleColumnPickerOutsideClick))

watch(
  columnVisibility,
  (val) => {
    try {
      localStorage.setItem(COLUMN_VISIBILITY_STORAGE_KEY, JSON.stringify(val))
    } catch (e) {
      /* ignore storage errors */
    }
  },
  { deep: true },
)

const visibleEarningsColumns = computed(() =>
  EARNINGS_COLUMNS.filter((c) => columnVisibility[c.key]),
)
const visibleDeductionColumns = computed(() =>
  DEDUCTION_COLUMNS.filter((c) => columnVisibility[c.key]),
)

const visibleColumnCount = computed(
  () => TOGGLEABLE_COLUMN_KEYS.filter((key) => columnVisibility[key]).length,
)

const leadingColspan = computed(
  () => 2 + INFO_COLUMNS.filter((c) => columnVisibility[c.key]).length,
)

const toggleColumn = (key) => {
  columnVisibility[key] = !columnVisibility[key]
}

const showAllColumns = () => {
  TOGGLEABLE_COLUMN_KEYS.forEach((key) => {
    columnVisibility[key] = true
  })
}

const resetColumns = () => {
  const defaults = defaultColumnVisibility()
  TOGGLEABLE_COLUMN_KEYS.forEach((key) => {
    columnVisibility[key] = defaults[key]
  })
}

const earningCellClass = (tone) => {
  if (tone === 'strong')
    return 'border border-emerald-200 bg-emerald-50/40 px-1 py-1.5 text-right font-mono font-semibold text-emerald-800'
  if (tone === 'highlight')
    return 'border border-emerald-100 bg-emerald-50/20 px-1 py-1.5 text-right font-mono text-emerald-700'
  if (tone === 'reduction')
    return 'border border-emerald-100 bg-emerald-50/20 px-1 py-1.5 text-right font-mono text-rose-600'
  return 'border border-emerald-100 bg-emerald-50/20 px-1 py-1.5 text-right font-mono text-slate-700'
}
const earningHeadClass = (tone) =>
  tone === 'strong'
    ? 'border border-emerald-200 bg-emerald-50 px-1 py-1.5 text-right font-bold text-emerald-800'
    : tone === 'reduction'
      ? 'border border-emerald-200 bg-emerald-50 px-1 py-1.5 text-right text-rose-700'
      : 'border border-emerald-200 bg-emerald-50 px-1 py-1.5 text-right text-emerald-700'
const earningSubtotalClass = (tone) =>
  tone === 'strong'
    ? 'border border-emerald-300 bg-emerald-200/70 px-1 py-1.5 text-right font-mono text-emerald-900'
    : tone === 'reduction'
      ? 'border border-emerald-200 bg-emerald-100/70 px-1 py-1.5 text-right font-mono text-rose-700'
      : 'border border-emerald-200 bg-emerald-100/70 px-1 py-1.5 text-right font-mono text-emerald-800'
const earningGrandClass = (tone) =>
  tone === 'strong'
    ? 'border border-emerald-300 bg-emerald-200/80 px-1 py-2 text-right font-mono text-emerald-900'
    : tone === 'reduction'
      ? 'border border-emerald-200 bg-emerald-100/80 px-1 py-2 text-right font-mono text-rose-700'
      : 'border border-emerald-200 bg-emerald-100/80 px-1 py-2 text-right font-mono text-emerald-800'

const DEDUCTION_CELL_CLASS =
  'border border-rose-100 bg-rose-50/20 px-1 py-1.5 text-right font-mono text-rose-600'
const DEDUCTION_HEAD_CLASS =
  'border border-rose-200 bg-rose-50 px-1 py-1.5 text-right text-rose-700'
const DEDUCTION_SUBTOTAL_CLASS =
  'border border-rose-200 bg-rose-100/70 px-1 py-1.5 text-right font-mono text-rose-800'
const DEDUCTION_GRAND_CLASS =
  'border border-rose-200 bg-rose-100/80 px-1 py-2 text-right font-mono text-rose-800'

const allowanceRows = (payroll) =>
  Array.isArray(payroll?.other_allowance_breakdown) ? payroll.other_allowance_breakdown : []

const getAllowanceAmountByCode = (payroll, code) => {
  const targetCode = String(code || '')
    .trim()
    .toUpperCase()
  const targetName = String(code || '')
    .trim()
    .toLowerCase()
  return allowanceRows(payroll)
    .filter((row) => {
      const allowanceCode = String(row?.allowance_code || '')
        .trim()
        .toUpperCase()
      const allowanceName = String(row?.allowance_name || '')
        .trim()
        .toLowerCase()
      return allowanceCode === targetCode || allowanceName === targetName
    })
    .reduce((sum, row) => sum + toNumber(row?.amount), 0)
}

const getTotalAdvanceAmount = (payroll) =>
  toNumber(payroll?.advance_deduction) + toNumber(payroll?.advance_adjusted_amount)

const getArrearAmount = (payroll) => getAllowanceAmountByCode(payroll, 'ARREAR')
const getPfAllowanceAmount = (payroll) => getAllowanceAmountByCode(payroll, 'PF')
const getDisplayOtherAllowance = (payroll) =>
  payroll?.earnings && Object.prototype.hasOwnProperty.call(payroll.earnings, 'others')
    ? toNumber(payroll.earnings.others)
    : Math.max(
        0,
        toNumber(payroll?.other_allowance_total) -
          getArrearAmount(payroll) -
          getPfAllowanceAmount(payroll),
      )

const getEarningAdjustmentAmount = (payroll) => {
  const adjustments = Array.isArray(payroll?.adjustments_applied) ? payroll.adjustments_applied : []
  return adjustments.reduce((sum, adjustment) => {
    const settlementType = String(adjustment?.settlement_type || 'carry_forward').toLowerCase()
    if (settlementType !== 'carry_forward') return sum

    const type = String(adjustment?.adjustment_type || '').toLowerCase()
    const amount = toNumber(adjustment?.amount)
    if (type === 'deduction') return sum
    if (['overtime', 'paycut_reversal', 'bonus'].includes(type)) return sum + amount
    if (type === 'other') return amount >= 0 ? sum + amount : sum
    return amount >= 0 ? sum + amount : sum
  }, 0)
}

const getTotalEarnings = (payroll) =>
  payroll?.earnings && Object.prototype.hasOwnProperty.call(payroll.earnings, 'total')
    ? toNumber(payroll.earnings.total)
    : toNumber(payroll?.gross_salary) +
      toNumber(payroll?.other_allowance_total) +
      toNumber(payroll?.manual_addition) +
      toNumber(payroll?.bonus_amount) -
      toNumber(payroll?.paycut_deduction)

const getTotalDeductions = (payroll) =>
  payroll?.deductions && Object.prototype.hasOwnProperty.call(payroll.deductions, 'total')
    ? toNumber(payroll.deductions.total)
    : toNumber(payroll?.pf_deduction) +
      toNumber(payroll?.meal_deduction) +
      toNumber(payroll?.loan_deduction) +
      toNumber(payroll?.security_money_deduction) +
      toNumber(payroll?.other_deduction) +
      getTotalAdvanceAmount(payroll)

const isLockedPayroll = (payroll) =>
  ['paid', 'locked'].includes(
    String(payroll?.payment_status || payroll?.status || '').toLowerCase(),
  )

const earningGetters = {
  basic_salary: (p) => toNumber(p?.basic_salary),
  house_rent: (p) => toNumber(p?.house_rent),
  medical_allowance: (p) => toNumber(p?.medical_allowance),
  conveyance_allowance: (p) => toNumber(p?.conveyance_allowance),
  gross_salary: (p) => toNumber(p?.gross_salary),
  other_allowance: getDisplayOtherAllowance,
  pf_allowance: getPfAllowanceAmount,
  arrear: getArrearAmount,
  bonus_amount: (p) => toNumber(p?.bonus_amount),
  manual_addition: getEarningAdjustmentAmount,
  paycut_deduction: (p) => -toNumber(p?.paycut_deduction),
}

const deductionGetters = {
  pf_deduction: (p) => toNumber(p?.pf_deduction),
  meal_deduction: (p) => toNumber(p?.meal_deduction),
  loan_deduction: (p) => toNumber(p?.loan_deduction),
  security_money_deduction: (p) => toNumber(p?.security_money_deduction),
  other_deduction: (p) => toNumber(p?.other_deduction),
  advance_deduction: getTotalAdvanceAmount,
}

const earningValue = (payroll, key) => (earningGetters[key] ? earningGetters[key](payroll) : 0)
const deductionValue = (payroll, key) =>
  deductionGetters[key] ? deductionGetters[key](payroll) : 0

const activeFiltersCount = computed(() => {
  let count = 0
  if (filters.value.company_id) count++
  if (filters.value.department_id) count++
  if (filters.value.unit_id) count++
  if (filters.value.employee_id) count++
  if (filters.value.line_type && filters.value.line_type !== 'all') count++
  if (filters.value.payment_status) count++
  if (filters.value.default_payment_method) count++
  if (filters.value.payroll_cycle && filters.value.payroll_cycle !== 'regular') count++
  return count
})
</script>

<template>
  <div class="min-h-screen space-y-2 p-3 md:p-4">
    <!-- ── Compact Toolbar ────────────────────────────── -->
    <div
      class="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 shadow-sm"
    >
      <div class="flex items-center gap-2.5">
        <div
          class="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600"
        >
          <i class="far fa-file-invoice-dollar text-sm"></i>
        </div>
        <div class="leading-tight">
          <span class="text-sm font-bold text-slate-800">Payroll Report</span>
          <span class="ml-2 text-xs text-slate-400">{{ formatMonth(filters.salary_month) }}</span>
          <span
            v-if="activeFiltersCount"
            class="ml-1.5 rounded-full bg-indigo-100 px-1.5 py-0.5 text-[10px] font-bold text-indigo-600"
          >
            {{ activeFiltersCount }} filters
          </span>
        </div>
      </div>
      <div class="flex items-center gap-1.5">
        <button class="btn-3 h-7 px-3 text-xs" @click="router.push({ name: 'DoctorPayrollList' })">
          <i class="far fa-user-md"></i> Doctor
        </button>
        <button
          class="btn-3 h-7 px-3 text-xs"
          :disabled="loading || !rows.length"
          @click="handleDownloadExcel"
        >
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
        <select v-model="filters.unit_id" class="erp-select-sm" @change="load">
          <option value="">All Units</option>
          <option v-for="u in units" :key="u.id" :value="String(u.id)">
            {{ u.short_name || u.name }}
          </option>
        </select>
        <select v-model="filters.payroll_cycle" class="erp-select-sm" @change="load">
          <option value="">All Cycles</option>
          <option v-for="c in cycleOptions" :key="c.value" :value="c.value">{{ c.label }}</option>
        </select>
        <select v-model="filters.payment_status" class="erp-select-sm" @change="load">
          <option value="">All Statuses</option>
          <option v-for="s in statusOptions" :key="s" :value="s">{{ s }}</option>
        </select>
        <select v-model="filters.default_payment_method" class="erp-select-sm" @change="load">
          <option value="">All Payment Methods</option>
          <option v-for="method in paymentMethodOptions" :key="method" :value="method">
            {{ method }}
          </option>
        </select>
        <button
          class="inline-flex h-7 items-center gap-1 rounded-lg border border-slate-200 px-2.5 text-xs text-slate-500 hover:bg-slate-50"
          @click="resetFilters"
        >
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
        <div
          class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm"
          :class="card.iconBg"
        >
          <i :class="`far ${card.icon}`"></i>
        </div>
        <div class="min-w-0 flex-1">
          <p
            class="text-[10px] font-semibold uppercase tracking-wider truncate"
            :class="card.labelColor"
          >
            {{ card.label }}
          </p>
          <p
            class="font-bold leading-none"
            :class="[card.valueColor, card.isCount ? 'text-xl' : 'text-base font-mono']"
          >
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
    <div
      v-else-if="!rows.length"
      class="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white py-10 text-center shadow-sm"
    >
      <div
        class="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-2xl text-slate-300"
      >
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
      <div
        class="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/60 px-3 py-2"
      >
        <div class="flex items-center gap-2">
          <span class="text-xs font-semibold text-slate-700">Detailed Payroll Breakdown</span>
          <span class="text-[10px] text-slate-400">· {{ formatMonth(filters.salary_month) }}</span>
        </div>
        <div class="flex items-center gap-1.5 text-[11px] text-slate-500">
          <span class="rounded border border-slate-200 bg-white px-2 py-0.5 font-medium">
            {{ rows.length }} records
          </span>
          <span class="rounded border border-slate-200 bg-white px-2 py-0.5 font-medium">
            {{ groupedByUnit.length }} units
          </span>

          <!-- Column Customizer -->
          <div class="relative">
            <button
              ref="columnPickerToggleRef"
              type="button"
              class="inline-flex items-center gap-1 rounded border border-slate-200 bg-white px-2 py-0.5 font-medium text-slate-600 transition hover:border-indigo-300 hover:text-indigo-600"
              @click="showColumnPicker = !showColumnPicker"
            >
              <i class="far fa-columns text-[10px]"></i> Columns
              <span class="rounded-full bg-indigo-100 px-1 text-[9px] font-bold text-indigo-600"
                >{{ visibleColumnCount }}/{{ TOGGLEABLE_COLUMN_KEYS.length }}</span
              >
            </button>

            <div
              v-if="showColumnPicker"
              ref="columnPickerRef"
              class="absolute right-0 z-20 mt-1.5 w-[460px] max-w-[90vw] rounded-xl border border-slate-200 bg-white p-3 text-left shadow-xl"
            >
              <div class="mb-2 flex items-center justify-between">
                <span class="text-xs font-bold text-slate-700">Customize Columns</span>
                <div class="flex items-center gap-2">
                  <button
                    type="button"
                    class="text-[10px] font-semibold text-indigo-500 hover:text-indigo-700"
                    @click="showAllColumns"
                  >
                    Show all
                  </button>
                  <button
                    type="button"
                    class="text-[10px] font-semibold text-slate-400 hover:text-slate-600"
                    @click="resetColumns"
                  >
                    Reset
                  </button>
                  <button
                    type="button"
                    class="flex h-5 w-5 items-center justify-center rounded text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                    @click="showColumnPicker = false"
                  >
                    <i class="far fa-times text-[10px]"></i>
                  </button>
                </div>
              </div>

              <div class="grid grid-cols-3 gap-3 text-[11px]">
                <div>
                  <p class="mb-1 text-[9px] font-bold uppercase tracking-wide text-slate-400">
                    Employee Info
                  </p>
                  <label
                    v-for="col in INFO_COLUMNS"
                    :key="`pick-info-${col.key}`"
                    class="flex cursor-pointer items-center gap-1.5 rounded px-1 py-0.5 hover:bg-slate-50"
                  >
                    <input
                      type="checkbox"
                      class="h-3 w-3 rounded border-slate-300 text-indigo-500 focus:ring-indigo-300"
                      :checked="columnVisibility[col.key]"
                      @change="toggleColumn(col.key)"
                    />
                    <span class="text-slate-600">{{ col.label }}</span>
                  </label>
                </div>
                <div>
                  <p class="mb-1 text-[9px] font-bold uppercase tracking-wide text-emerald-500">
                    Earnings
                  </p>
                  <label
                    v-for="col in EARNINGS_COLUMNS"
                    :key="`pick-earn-${col.key}`"
                    class="flex cursor-pointer items-center gap-1.5 rounded px-1 py-0.5 hover:bg-emerald-50"
                  >
                    <input
                      type="checkbox"
                      class="h-3 w-3 rounded border-slate-300 text-emerald-500 focus:ring-emerald-300"
                      :checked="columnVisibility[col.key]"
                      @change="toggleColumn(col.key)"
                    />
                    <span class="text-slate-600">{{ col.label }}</span>
                  </label>
                </div>
                <div>
                  <p class="mb-1 text-[9px] font-bold uppercase tracking-wide text-rose-500">
                    Deductions
                  </p>
                  <label
                    v-for="col in DEDUCTION_COLUMNS"
                    :key="`pick-ded-${col.key}`"
                    class="flex cursor-pointer items-center gap-1.5 rounded px-1 py-0.5 hover:bg-rose-50"
                    :title="col.title || ''"
                  >
                    <input
                      type="checkbox"
                      class="h-3 w-3 rounded border-slate-300 text-rose-500 focus:ring-rose-300"
                      :checked="columnVisibility[col.key]"
                      @change="toggleColumn(col.key)"
                    />
                    <span class="text-slate-600">{{ col.label }}</span>
                  </label>
                </div>
              </div>

              <p class="mt-2 border-t border-slate-100 pt-2 text-[10px] text-slate-400">
                <i class="far fa-info-circle mr-1"></i>Group totals (E.Tot / D.Tot), Net Pay, Status
                and Action columns always stay visible. Your selection is remembered on this device.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div class="w-full overflow-x-auto overscroll-x-contain [scrollbar-width:thin]">
        <table
          class="prl-table min-w-[1810px] w-full table-fixed border-collapse text-[10px] leading-tight"
        >
          <colgroup>
            <col class="w-[32px]" />
            <col class="w-[116px]" />
            <col v-if="columnVisibility.emp_id" class="w-[78px]" />
            <col v-if="columnVisibility.cost_center" class="w-[82px]" />
            <col v-if="columnVisibility.unit_code" class="w-[64px]" />
            <col v-if="columnVisibility.project_code" class="w-[72px]" />
            <col v-if="columnVisibility.unit" class="w-[72px]" />
            <col v-if="columnVisibility.joining" class="w-[66px]" />
            <!-- earnings (toggleable + E.Tot) -->
            <col v-for="col in visibleEarningsColumns" :key="`col-e-${col.key}`" class="w-[56px]" />
            <col class="w-[56px]" />
            <!-- deductions (toggleable + D.Tot) -->
            <col
              v-for="col in visibleDeductionColumns"
              :key="`col-d-${col.key}`"
              class="w-[56px]"
            />
            <col class="w-[56px]" />
            <!-- net + status + action -->
            <col class="w-[68px]" />
            <col class="w-[110px]" />
            <col class="w-[44px]" />
          </colgroup>

          <thead class="sticky top-0 z-10">
            <!-- Group Row -->
            <tr class="text-[9px] font-bold uppercase tracking-wider">
              <th class="border border-slate-200 bg-slate-100 px-1 py-2 text-slate-500" rowspan="2">
                #
              </th>
              <th
                class="border border-slate-200 bg-slate-100 px-1.5 py-2 text-left text-slate-600"
                rowspan="2"
              >
                Employee
              </th>
              <th
                v-if="columnVisibility.emp_id"
                class="border border-slate-200 bg-slate-100 px-1 py-2 text-slate-500"
                rowspan="2"
              >
                Emp ID
              </th>
              <th
                v-if="columnVisibility.cost_center"
                class="border border-slate-200 bg-slate-100 px-1 py-2 text-slate-500"
                rowspan="2"
              >
                Cost-Center
              </th>
              <th
                v-if="columnVisibility.unit_code"
                class="border border-slate-200 bg-slate-100 px-1 py-2 text-slate-500"
                rowspan="2"
              >
                Unit Code
              </th>
              <th
                v-if="columnVisibility.project_code"
                class="border border-slate-200 bg-slate-100 px-1 py-2 text-slate-500"
                rowspan="2"
              >
                Project Code
              </th>
              <th
                v-if="columnVisibility.unit"
                class="border border-slate-200 bg-slate-100 px-1 py-2 text-slate-500"
                rowspan="2"
              >
                Unit
              </th>
              <th
                v-if="columnVisibility.joining"
                class="border border-slate-200 bg-slate-100 px-1 py-2 text-slate-500"
                rowspan="2"
              >
                Joining
              </th>
              <th
                class="border border-emerald-300 bg-emerald-100 px-1 py-2 text-center text-emerald-700"
                :colspan="visibleEarningsColumns.length + 1"
              >
                <i class="far fa-arrow-up mr-0.5 text-[8px]"></i> Earnings
              </th>
              <th
                class="border border-rose-300 bg-rose-100 px-1 py-2 text-center text-rose-700"
                :colspan="visibleDeductionColumns.length + 1"
              >
                <i class="far fa-arrow-down mr-0.5 text-[8px]"></i> Deductions
              </th>
              <th
                class="border border-indigo-300 bg-indigo-100 px-1 py-2 text-center text-indigo-700"
                rowspan="2"
              >
                Net Pay
              </th>
              <th class="border border-slate-200 bg-slate-100 px-1 py-2 text-slate-500" rowspan="2">
                Status
              </th>
              <th class="border border-slate-200 bg-slate-100 px-1 py-2 text-slate-500" rowspan="2">
                Act.
              </th>
            </tr>

            <!-- Sub-header Row -->
            <tr class="text-[9px] font-semibold uppercase tracking-wider text-slate-600">
              <!-- Earnings -->
              <th
                v-for="col in visibleEarningsColumns"
                :key="`th-e-${col.key}`"
                :class="earningHeadClass(col.tone)"
              >
                {{ col.label }}
              </th>
              <th
                class="border border-emerald-200 bg-emerald-50 px-1 py-1.5 text-right font-bold text-emerald-900"
              >
                E.Tot
              </th>
              <!-- Deductions -->
              <th
                v-for="col in visibleDeductionColumns"
                :key="`th-d-${col.key}`"
                :class="DEDUCTION_HEAD_CLASS"
                :title="col.title || ''"
              >
                {{ col.label }}
              </th>
              <th
                class="border border-rose-200 bg-rose-50 px-1 py-1.5 text-right font-bold text-rose-900"
              >
                D.Tot
              </th>
            </tr>
          </thead>

          <tbody>
            <template v-for="group in groupedByUnit" :key="group.unitName">
              <tr
                v-for="(p, i) in group.rows"
                :key="p.id"
                class="group transition-colors duration-75 hover:bg-indigo-50/40"
                :class="i % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'"
              >
                <!-- # -->
                <td class="border border-slate-100 px-1 py-1.5 text-center text-slate-400">
                  {{ group.offset + i + 1 }}
                </td>

                <!-- Employee -->
                <td class="border border-slate-100 px-1.5 py-1.5">
                  <div
                    class="truncate font-semibold leading-tight text-slate-900"
                    :title="p.user?.name || p.employee_name || '-'"
                  >
                    {{ p.user?.name || p.employee_name || '-' }}
                  </div>
                  <div
                    class="mt-0.5 truncate text-[9px] text-slate-400"
                    :title="p.user?.designation?.title || p.company_name || '-'"
                  >
                    {{ p.user?.designation?.title || p.company_name || '-' }}
                  </div>
                </td>

                <!-- Emp ID -->
                <td v-if="columnVisibility.emp_id" class="border border-slate-100 px-1 py-1.5">
                  <span
                    class="inline-flex rounded-md bg-slate-100 px-1.5 py-0.5 font-mono leading-none text-slate-700"
                  >
                    {{ p.user?.employee_id || p.employee_code || '-' }}
                  </span>
                </td>

                <!-- Cost-Center -->
                <td
                  v-if="columnVisibility.cost_center"
                  class="border border-slate-100 px-1 py-1.5 text-slate-600"
                >
                  {{ getCostCenter(p) }}
                </td>

                <!-- Unit Code -->
                <td
                  v-if="columnVisibility.unit_code"
                  class="border border-slate-100 px-1 py-1.5 text-slate-600"
                >
                  {{ getUnitCode(p) }}
                </td>

                <!-- Project Code -->
                <td
                  v-if="columnVisibility.project_code"
                  class="border border-slate-100 px-1 py-1.5 text-slate-600"
                >
                  {{ getProjectCode(p) }}
                </td>

                <!-- Unit -->
                <td
                  v-if="columnVisibility.unit"
                  class="border border-slate-100 px-1 py-1.5 text-slate-600"
                >
                  {{ getUnitName(p) }}
                </td>

                <!-- Joining -->
                <td
                  v-if="columnVisibility.joining"
                  class="border border-slate-100 px-1 py-1.5 text-[9px] text-slate-500"
                >
                  {{ formatDate(p.user?.joining_date || p.joining_date) }}
                </td>

                <!-- ── Earnings ── -->
                <td
                  v-for="col in visibleEarningsColumns"
                  :key="`td-e-${p.id}-${col.key}`"
                  :class="earningCellClass(col.tone)"
                >
                  {{ formatCompactCurrency(earningValue(p, col.key)) }}
                </td>
                <td
                  class="border border-emerald-300 bg-emerald-100/60 px-1 py-1.5 text-right font-mono font-bold text-emerald-900"
                >
                  {{ formatCompactCurrency(getTotalEarnings(p)) }}
                </td>

                <!-- ── Deductions ── -->
                <td
                  v-for="col in visibleDeductionColumns"
                  :key="`td-d-${p.id}-${col.key}`"
                  :class="DEDUCTION_CELL_CLASS"
                >
                  {{ formatCompactCurrency(deductionValue(p, col.key)) }}
                </td>
                <td
                  class="border border-rose-300 bg-rose-100/60 px-1 py-1.5 text-right font-mono font-bold text-rose-800"
                >
                  {{ formatCompactCurrency(getTotalDeductions(p)) }}
                </td>

                <!-- Net Pay -->
                <td
                  class="border border-indigo-200 bg-indigo-50/40 px-1 py-1.5 text-right font-mono font-bold text-indigo-800"
                >
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

              <!-- ── Unit Subtotal ── -->
              <tr class="bg-indigo-50/70 text-[10px] font-bold">
                <td
                  class="border border-indigo-200 px-1.5 py-1.5 text-left text-indigo-700"
                  :colspan="leadingColspan"
                >
                  <i class="far fa-sitemap mr-1 text-[9px]"></i>{{ group.unitName }} — Subtotal ({{
                    group.rows.length
                  }})
                </td>
                <!-- Earnings -->
                <td
                  v-for="col in visibleEarningsColumns"
                  :key="`sub-e-${group.unitName}-${col.key}`"
                  :class="earningSubtotalClass(col.tone)"
                >
                  {{ formatCompactCurrency(group.totals[col.key]) }}
                </td>
                <td
                  class="border border-emerald-300 bg-emerald-200/70 px-1 py-1.5 text-right font-mono text-emerald-900"
                >
                  {{ formatCompactCurrency(group.totals.total_earnings) }}
                </td>
                <!-- Deductions -->
                <td
                  v-for="col in visibleDeductionColumns"
                  :key="`sub-d-${group.unitName}-${col.key}`"
                  :class="DEDUCTION_SUBTOTAL_CLASS"
                >
                  {{ formatCompactCurrency(group.totals[col.key]) }}
                </td>
                <td
                  class="border border-rose-300 bg-rose-200/70 px-1 py-1.5 text-right font-mono text-rose-900"
                >
                  {{ formatCompactCurrency(group.totals.total_deduction) }}
                </td>
                <!-- Net -->
                <td
                  class="border border-indigo-300 bg-indigo-200/70 px-1 py-1.5 text-right font-mono text-indigo-900"
                >
                  {{ formatCompactCurrency(group.totals.net_salary) }}
                </td>
                <td class="border border-indigo-200 bg-indigo-100/70 px-1 py-1.5" colspan="2"></td>
              </tr>
            </template>
          </tbody>

          <!-- ── Totals Footer ── -->
          <tfoot v-if="rows.length">
            <tr class="bg-slate-100 text-[10px] font-bold">
              <td
                class="border border-slate-300 px-1 py-2 text-center text-slate-500"
                :colspan="leadingColspan"
              >
                Grand Totals ({{ rows.length }})
              </td>
              <!-- Earnings -->
              <td
                v-for="col in visibleEarningsColumns"
                :key="`grand-e-${col.key}`"
                :class="earningGrandClass(col.tone)"
              >
                {{ formatCompactCurrency(columnTotals[col.key]) }}
              </td>
              <td
                class="border border-emerald-300 bg-emerald-200/80 px-1 py-2 text-right font-mono text-emerald-900"
              >
                {{ formatCompactCurrency(columnTotals.total_earnings) }}
              </td>
              <!-- Deductions -->
              <td
                v-for="col in visibleDeductionColumns"
                :key="`grand-d-${col.key}`"
                :class="DEDUCTION_GRAND_CLASS"
              >
                {{ formatCompactCurrency(columnTotals[col.key]) }}
              </td>
              <td
                class="border border-rose-300 bg-rose-200/80 px-1 py-2 text-right font-mono text-rose-900"
              >
                {{ formatCompactCurrency(columnTotals.total_deduction) }}
              </td>
              <!-- Net -->
              <td
                class="border border-indigo-300 bg-indigo-200/80 px-1 py-2 text-right font-mono text-indigo-900"
              >
                {{ formatCompactCurrency(columnTotals.net_salary) }}
              </td>
              <td class="border border-slate-300 bg-slate-100 px-1 py-2" colspan="2"></td>
            </tr>
          </tfoot>
        </table>
      </div>

      <!-- Table Footer Bar -->
      <div
        class="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 bg-slate-50/50 px-3 py-1.5 text-[10px] text-slate-400"
      >
        <span>
          Showing all <strong class="text-slate-600">{{ rows.length }}</strong> records across
          <strong class="text-slate-600">{{ groupedByUnit.length }}</strong> units ·
          {{ formatMonth(filters.salary_month) }}
        </span>
        <div class="flex items-center gap-2.5">
          <span class="flex items-center gap-1"
            ><span
              class="inline-block h-2 w-2 rounded-sm bg-emerald-200 ring-1 ring-emerald-300"
            ></span
            >Earnings</span
          >
          <span class="flex items-center gap-1"
            ><span class="inline-block h-2 w-2 rounded-sm bg-rose-200 ring-1 ring-rose-300"></span
            >Deductions</span
          >
          <span class="flex items-center gap-1"
            ><span
              class="inline-block h-2 w-2 rounded-sm bg-indigo-200 ring-1 ring-indigo-300"
            ></span
            >Net Pay</span
          >
        </div>
      </div>
    </div>

    <!-- ── Payment Status Modal ─────────────────────────── -->
    <PaymentStatusModal
      :show="showPaymentModal"
      :payroll-id="selectedPayroll?.id"
      :current-status="selectedPayroll?.payment_status"
      @close="
        () => {
          showPaymentModal = false
          selectedPayroll = null
        }
      "
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
  transition:
    border-color 0.15s,
    box-shadow 0.15s;
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
  transition:
    border-color 0.15s,
    box-shadow 0.15s;
}
.erp-select-sm:focus {
  outline: none;
  border-color: #818cf8;
  box-shadow: 0 0 0 2px rgb(99 102 241 / 0.15);
}
</style>
