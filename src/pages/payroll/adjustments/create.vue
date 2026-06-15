<script setup>
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'
import apiClient from '@/axios'
import EmployeeFilter from '@/components/common/EmployeeFilter.vue'
import LoaderView from '@/components/common/LoaderView.vue'
import { useAdjustmentStore } from '@/stores/adjustmentStore'
import { formatCurrency } from '@/utils/currency'

defineOptions({ name: 'PayrollAdjustmentCreate' })

const router = useRouter()
const toast = useToast()
const store = useAdjustmentStore()

const employeeDisplay = ref({ name: null, dept: null })
const employeeFilters = ref({
  company_id: '',
  department_id: '',
  employee_id: '',
  line_type: 'all',
})
const latestPayroll = ref(null)
const payrollOptions = ref([])
const payrollLoading = ref(false)
const payrollError = ref('')
const submitting = ref(false)

const form = ref({
  employee_id: '',
  payroll_id: '',
  ref_year: '',
  ref_month: '',
  carry_to_year: '',
  carry_to_month: '',
  adjustment_type: 'overtime',
  settlement_type: 'carry_forward',
  overtime_hours: '',
  amount: '',
  reason: '',
})

const adjustmentTypes = [
  { value: 'overtime', label: 'Overtime' },
  { value: 'paycut_reversal', label: 'Paycut Reversal' },
  { value: 'bonus', label: 'Bonus' },
  { value: 'deduction', label: 'Deduction' },
  { value: 'other', label: 'Other' },
]

const settlementTypes = [
  { value: 'carry_forward', label: 'Carry Forward (affects net salary)' },
  { value: 'manual_settled', label: 'Manual Settled (contra entry next month, net unchanged)' },
]

const carryToLabel = computed(() => {
  if (!form.value.carry_to_year || !form.value.carry_to_month) return '-'
  return formatMonthLabel(`${form.value.carry_to_year}-${String(form.value.carry_to_month).padStart(2, '0')}`)
})

const payrollMonthLabel = computed(() => {
  if (!latestPayroll.value?.salary_month) return '-'
  return formatMonthLabel(latestPayroll.value.salary_month)
})

const payrollNet = computed(() => Number(latestPayroll.value?.net_salary || 0))

const toNum = (value) => {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

const monthValue = (value) => String(value || '').slice(0, 7)
const currentMonthValue = () => {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}
const monthIndex = (month) => {
  const normalized = monthValue(month)
  if (!normalized) return 0
  return Number(normalized.slice(0, 4)) * 12 + Number(normalized.slice(5, 7))
}

const formatMonthLabel = (value) => {
  const month = monthValue(value)
  if (!month) return '-'
  const date = new Date(`${month}-01T00:00:00`)
  if (Number.isNaN(date.getTime())) return month
  return new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric' }).format(date)
}

const formatPercent = (value) => {
  const amount = toNum(value)
  if (!amount) return '0%'
  return `${new Intl.NumberFormat('en-US', {
    minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amount)}%`
}

const addMonths = (month, count = 1) => {
  const normalized = monthValue(month)
  if (!normalized) return ''
  const date = new Date(`${normalized}-01T00:00:00`)
  if (Number.isNaN(date.getTime())) return ''
  date.setMonth(date.getMonth() + count)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

const maxMonth = (...months) => months.filter(Boolean).sort((a, b) => monthIndex(a) - monthIndex(b)).at(-1) || ''
const minMonth = (...months) => months.filter(Boolean).sort((a, b) => monthIndex(a) - monthIndex(b))[0] || ''

const referencePayrollMonth = computed(() => {
  if (!form.value.ref_year || !form.value.ref_month) return ''
  return `${form.value.ref_year}-${String(form.value.ref_month).padStart(2, '0')}`
})

const setRefMonth = (month) => {
  const normalized = monthValue(month)
  if (!normalized) {
    form.value.ref_year = ''
    form.value.ref_month = ''
    return
  }

  form.value.ref_year = Number(normalized.slice(0, 4))
  form.value.ref_month = Number(normalized.slice(5, 7))
}

const setCarryMonth = (month, clampToMinimum = false) => {
  let normalized = monthValue(month)
  if (!normalized) {
    form.value.carry_to_year = ''
    form.value.carry_to_month = ''
    return
  }

  if (clampToMinimum && monthIndex(normalized) < monthIndex(carryToMonthMinimum.value)) {
    normalized = carryToMonthMinimum.value
  }

  form.value.carry_to_year = Number(normalized.slice(0, 4))
  form.value.carry_to_month = Number(normalized.slice(5, 7))
}

const carryToMonthInput = computed({
  get: () => {
    if (!form.value.carry_to_year || !form.value.carry_to_month) return ''
    return `${form.value.carry_to_year}-${String(form.value.carry_to_month).padStart(2, '0')}`
  },
  set: (value) => setCarryMonth(value, true),
})

const payrollCycle = (payroll) => String(payroll?.payroll_cycle || payroll?.settlement_mode || payroll?.payroll_batch?.payroll_cycle || payroll?.payrollBatch?.payroll_cycle || '').toLowerCase()
const allowsSameMonthCarryForPayroll = (payroll) =>
  ['half_salary_advance', 'half_month', 'advance', 'bonus_only'].includes(payrollCycle(payroll))

const isRegularPayroll = (payroll) => {
  const cycle = payrollCycle(payroll)
  const salaryType = String(payroll?.salary_type || '').toLowerCase()
  return cycle === 'regular' || salaryType === 'monthly'
}

const isPaidOrLockedPayroll = (payroll) =>
  ['paid', 'locked'].includes(String(payroll?.payment_status || payroll?.status || payroll?.payroll_batch?.status || payroll?.payrollBatch?.status || '').toLowerCase())

const hasRegularPayrollForMonth = (month, ignoredPayrollId = null) => payrollOptions.value.some((payroll) => {
  if (ignoredPayrollId && String(payroll.id) === String(ignoredPayrollId)) return false
  if (!isRegularPayroll(payroll)) return false
  return monthValue(payroll.salary_month) === monthValue(month)
})

const hasLockedRegularPayrollForMonth = (month) => payrollOptions.value.some((payroll) => {
  if (!isRegularPayroll(payroll)) return false
  return monthValue(payroll.salary_month) === monthValue(month) && isPaidOrLockedPayroll(payroll)
})

const minCarryToMonth = computed(() => {
  let month = currentMonthValue()
  let guard = 0

  while (hasRegularPayrollForMonth(month) && guard < 120) {
    month = addMonths(month, 1)
    guard += 1
  }

  return month
})

const selectedReferencePayroll = computed(() =>
  payrollOptions.value.find((payroll) => String(payroll.id) === String(form.value.payroll_id)) || latestPayroll.value,
)
const allowsSameMonthCarry = computed(() => allowsSameMonthCarryForPayroll(selectedReferencePayroll.value))
const isSameReferenceCarry = computed(() => monthValue(carryToMonthInput.value) === monthValue(referencePayrollMonth.value))
const carryToMonthMinimum = computed(() => {
  if (allowsSameMonthCarry.value && referencePayrollMonth.value) return referencePayrollMonth.value
  return maxMonth(addMonths(referencePayrollMonth.value, 1), minCarryToMonth.value) || minCarryToMonth.value
})

const payrollOptionLabel = (payroll) => {
  const cycle = payrollCycle(payroll)
  const type = payroll?.salary_type || (cycle ? cycle.replace(/_/g, ' ') : 'Payroll')
  return `${formatMonthLabel(payroll?.salary_month)} - ${type}`
}

const isOvertimeAdjustment = computed(() => form.value.adjustment_type === 'overtime')
const selectedPayrollCycle = computed(() => payrollCycle(latestPayroll.value))
const isAdvanceCycle = computed(() => ['half_salary_advance', 'half_month', 'advance'].includes(selectedPayrollCycle.value))
const isBonusOnlyCycle = computed(() => selectedPayrollCycle.value === 'bonus_only')
const grossReferenceAmount = computed(() =>
  toNum(
    latestPayroll.value?.gross_reference_amount
      ?? latestPayroll.value?.monthly_gross_salary
      ?? latestPayroll.value?.gross_salary
      ?? latestPayroll.value?.calculation_breakdown?.gross_salary
      ?? latestPayroll.value?.earnings?.gross,
  ),
)
const salaryAdvancePayable = computed(() => toNum(latestPayroll.value?.base_payable_amount ?? latestPayroll.value?.earnings?.basic))
const advancePercentage = computed(() => {
  const configured = latestPayroll.value?.advance_percentage ?? latestPayroll.value?.salary_percentage
  if (configured !== null && configured !== undefined && configured !== '') return toNum(configured)
  return grossReferenceAmount.value > 0 ? (salaryAdvancePayable.value / grossReferenceAmount.value) * 100 : 0
})
const salaryAdvanceLabel = computed(() =>
  advancePercentage.value > 0
    ? `Advance Payable (${formatPercent(advancePercentage.value)} of Gross)`
    : 'Advance Payable',
)
const advanceAdjustedAmount = computed(() => toNum(latestPayroll.value?.advance_adjusted_amount ?? latestPayroll.value?.calculation_breakdown?.advance_adjusted_amount))
const paycutDeductionLabel = computed(() => {
  const paycutAmount = paycutReductionAmount.value
  if (advanceAdjustedAmount.value > 0 && Math.abs(paycutAmount - advanceAdjustedAmount.value) < 1) {
    return 'Half Salary Advance Adjustment'
  }

  return 'Attendance Paycut'
})
const paycutReductionAmount = computed(() =>
  toNum(latestPayroll.value?.earnings?.paycut_reduction ?? latestPayroll.value?.paycut_deduction)
)

const payrollGrossSalary = computed(() => {
  const payroll = latestPayroll.value || {}
  const directGross = Number(payroll.gross_salary || 0)
  if (directGross > 0) return directGross

  return (
    Number(payroll.basic_salary || 0)
    + Number(payroll.house_rent || 0)
    + Number(payroll.medical_allowance || 0)
    + Number(payroll.conveyance_allowance || 0)
  )
})

const payrollDaysInMonth = computed(() => {
  if (!latestPayroll.value?.salary_month) return 0
  const salaryMonth = new Date(`${String(latestPayroll.value.salary_month).slice(0, 10)}T00:00:00`)
  if (Number.isNaN(salaryMonth.getTime())) return 0
  return new Date(salaryMonth.getFullYear(), salaryMonth.getMonth() + 1, 0).getDate()
})

const overtimeHourlyRate = computed(() => {
  const monthlyHours = payrollDaysInMonth.value * 9
  if (payrollGrossSalary.value <= 0 || monthlyHours <= 0) return 0
  return Math.round((payrollGrossSalary.value / monthlyHours) * 100) / 100
})

const overtimeAmount = computed(() => {
  const hours = Number(form.value.overtime_hours || 0)
  if (!isOvertimeAdjustment.value || overtimeHourlyRate.value <= 0 || hours <= 0) return 0
  return Math.round(overtimeHourlyRate.value * hours * 100) / 100
})

const slipEarningRows = computed(() => {
  const earnings = latestPayroll.value?.earnings || {}

  if (isAdvanceCycle.value) {
    return [
      ...(grossReferenceAmount.value > 0
        ? [{ key: 'gross_reference', label: 'Gross Salary (Reference)', amount: grossReferenceAmount.value, reference: true }]
        : []),
      { key: 'salary_advance', label: salaryAdvanceLabel.value, amount: salaryAdvancePayable.value, highlight: true },
      ...(toNum(earnings.bonus ?? latestPayroll.value?.bonus_amount) > 0
        ? [{ key: 'bonus', label: 'Bonus', amount: toNum(earnings.bonus ?? latestPayroll.value?.bonus_amount) }]
        : []),
    ]
  }

  if (isBonusOnlyCycle.value) {
    return [
      { key: 'bonus', label: 'Bonus', amount: toNum(earnings.bonus ?? latestPayroll.value?.bonus_amount), highlight: true },
    ]
  }

  const rows = [
    { key: 'basic', label: 'Basic Salary', amount: toNum(earnings.basic ?? latestPayroll.value?.basic_salary) },
    { key: 'house_rent', label: 'House Rent', amount: toNum(earnings.house_rent ?? latestPayroll.value?.house_rent) },
    { key: 'medical', label: 'Medical', amount: toNum(earnings.medical ?? latestPayroll.value?.medical_allowance) },
    { key: 'conveyance', label: 'Conveyance', amount: toNum(earnings.conveyance ?? latestPayroll.value?.conveyance_allowance) },
    { key: 'gross', label: 'Gross', amount: toNum(earnings.gross ?? latestPayroll.value?.gross_salary), highlight: true },
    { key: 'others', label: 'Others', amount: toNum(earnings.others ?? latestPayroll.value?.other_allowance_total) },
    ...(toNum(earnings.bonus ?? latestPayroll.value?.bonus_amount) > 0
      ? [{ key: 'bonus', label: 'Bonus', amount: toNum(earnings.bonus ?? latestPayroll.value?.bonus_amount) }]
      : []),
    { key: 'pf_allowance', label: 'PF Office', amount: toNum(latestPayroll.value?.deductions?.pf_allowance) },
    ...(paycutReductionAmount.value > 0
      ? [{ key: 'paycut_reduction', label: paycutDeductionLabel.value, amount: -paycutReductionAmount.value }]
      : []),
    { key: 'arrear', label: 'Arrear', amount: toNum(latestPayroll.value?.arrear ?? latestPayroll.value?.arrear_amount) },
  ]

  return rows.filter((row) => row.highlight || row.amount !== 0)
})

const slipDeductionRows = computed(() => {
  const deductions = latestPayroll.value?.deductions || {}
  const pfBoth = toNum(deductions.provident_fund) + toNum(deductions.pf_allowance ?? latestPayroll.value?.pf_deduction)

  if (isAdvanceCycle.value) {
    return [
      { key: 'pf', label: 'PF Both', amount: pfBoth },
      { key: 'meal', label: 'Meal Deduction', amount: toNum(deductions.meal ?? latestPayroll.value?.meal_deduction) },
      { key: 'tds', label: 'Tax', amount: toNum(deductions.tds ?? latestPayroll.value?.tax_deduction) },
      { key: 'loan', label: 'Loan', amount: toNum(deductions.loan ?? latestPayroll.value?.loan_deduction) },
      { key: 'other', label: 'Others', amount: toNum(deductions.other ?? latestPayroll.value?.other_deduction) },
      {
        key: 'half_salary_advance_adjustment',
        label: 'Half Salary Advance Adjustment',
        amount: toNum(deductions.half_salary_advance_adjustment ?? latestPayroll.value?.advance_adjusted_amount),
      },
      { key: 'advance', label: 'Advance', amount: toNum(deductions.advance ?? latestPayroll.value?.advance_deduction) },
      { key: 'paycut', label: paycutDeductionLabel.value, amount: toNum(deductions.paycut ?? latestPayroll.value?.paycut_deduction) },
    ]
  }

  const rows = [
    { key: 'pf', label: 'PF Both', amount: pfBoth },
    { key: 'meal', label: 'Meal Deduction', amount: toNum(deductions.meal ?? latestPayroll.value?.meal_deduction) },
    { key: 'tds', label: 'Tax', amount: toNum(deductions.tds ?? latestPayroll.value?.tax_deduction) },
    { key: 'loan', label: 'Loan', amount: toNum(deductions.loan ?? latestPayroll.value?.loan_deduction) },
    { key: 'security_money', label: 'Security Money', amount: toNum(deductions.security_money ?? latestPayroll.value?.security_money_deduction) },
    { key: 'other', label: 'Others', amount: toNum(deductions.other ?? latestPayroll.value?.other_deduction) },
    {
      key: 'half_salary_advance_adjustment',
      label: 'Half Salary Advance Adjustment',
      amount: toNum(
        deductions.half_salary_advance_adjustment
          ?? latestPayroll.value?.advance_adjusted_amount
          ?? latestPayroll.value?.calculation_breakdown?.advance_adjusted_amount,
      ),
    },
    { key: 'advance', label: 'Advance', amount: toNum(deductions.advance ?? latestPayroll.value?.advance_deduction) },
    { key: 'paycut', label: paycutDeductionLabel.value, amount: toNum(deductions.paycut ?? latestPayroll.value?.paycut_deduction) },
  ]

  return rows.filter((row) => row.amount !== 0)
})

const slipRowCount = computed(() => Math.max(slipEarningRows.value.length, slipDeductionRows.value.length))
const slipTotalEarnings = computed(() => toNum(latestPayroll.value?.earnings?.total) || toNum(latestPayroll.value?.gross_salary) + toNum(latestPayroll.value?.other_allowance_total) + toNum(latestPayroll.value?.manual_addition))
const slipTotalDeductions = computed(() => toNum(latestPayroll.value?.deductions?.total) || toNum(latestPayroll.value?.total_deduction))
const slipNetPayment = computed(() => toNum(latestPayroll.value?.net_payment ?? latestPayroll.value?.net_salary))

const loadPayrollSlip = async (payrollRow) => {
  latestPayroll.value = payrollRow
  if (!payrollRow?.id) return

  const slipRes = await apiClient.get(`/payroll-cash-slips/${payrollRow.id}`)
  const slip = slipRes.data?.data || null
  if (slip && String(form.value.payroll_id) === String(payrollRow.id)) {
    latestPayroll.value = { ...payrollRow, ...slip }
  }
}

const selectReferencePayroll = async (payrollRow) => {
  if (!payrollRow) return

  form.value.payroll_id = payrollRow.id
  latestPayroll.value = payrollRow
  const refMonth = monthValue(payrollRow.salary_month)
  setRefMonth(refMonth)
  setCarryMonth(
    allowsSameMonthCarryForPayroll(payrollRow)
      ? refMonth
      : maxMonth(addMonths(refMonth, 1), minCarryToMonth.value),
    true,
  )

  employeeDisplay.value = {
    name: payrollRow.user?.name || payrollRow.employee_name || employeeDisplay.value.name,
    dept: payrollRow.user?.department?.name || payrollRow.department_name || employeeDisplay.value.dept,
  }

  await loadPayrollSlip(payrollRow)
}

const onReferencePayrollChange = async () => {
  const selected = payrollOptions.value.find((payroll) => String(payroll.id) === String(form.value.payroll_id))
  if (!selected) return
  await selectReferencePayroll(selected)
}

const loadEmployeePayrolls = async (employeeId) => {
  payrollError.value = ''
  latestPayroll.value = null
  payrollOptions.value = []

  if (!employeeId) return

  payrollLoading.value = true
  try {
    const res = await apiClient.get('/payrolls', {
      params: {
        user_id: employeeId,
        per_page: 24,
      },
    })

    const payload = res.data?.data || []
    payrollOptions.value = Array.isArray(payload) ? payload : []

    if (!payrollOptions.value.length) {
      payrollError.value = 'No payroll found for this employee.'
      return
    }

    const defaultPayroll = payrollOptions.value.find(isRegularPayroll) || payrollOptions.value[0]
    await selectReferencePayroll(defaultPayroll)
  } catch (e) {
    payrollError.value = e.message || 'Failed to load payrolls.'
  } finally {
    payrollLoading.value = false
  }
}

const onEmployeeFilterChange = async (payload = {}) => {
  employeeFilters.value = {
    company_id: payload.company_id || '',
    department_id: payload.department_id || '',
    employee_id: payload.employee_id || '',
    line_type: payload.line_type || 'all',
  }

  const nextEmployeeId = payload.employee_id || ''
  if (String(nextEmployeeId || '') === String(form.value.employee_id || '')) return

  form.value.employee_id = nextEmployeeId
  form.value.payroll_id = ''
  form.value.ref_year = ''
  form.value.ref_month = ''
  form.value.carry_to_year = ''
  form.value.carry_to_month = ''
  latestPayroll.value = null
  payrollOptions.value = []
  employeeDisplay.value = { name: null, dept: null }
  await loadEmployeePayrolls(nextEmployeeId)
}

watch(
  () => [form.value.adjustment_type, form.value.overtime_hours, overtimeHourlyRate.value],
  () => {
    if (!isOvertimeAdjustment.value) return
    form.value.amount = overtimeAmount.value > 0 ? overtimeAmount.value.toFixed(2) : ''
  },
)

const submit = async () => {
  if (!form.value.employee_id) return toast.error('Select an employee.')
  if (!form.value.payroll_id) return toast.error('Select a reference payroll month.')
  if (!form.value.carry_to_year || !form.value.carry_to_month) return toast.error('Select a carry month.')
  if (monthIndex(carryToMonthInput.value) < monthIndex(carryToMonthMinimum.value)) {
    setCarryMonth(carryToMonthMinimum.value)
    return toast.error(`Carry month must be ${formatMonthLabel(carryToMonthMinimum.value)} or later.`)
  }
  if (allowsSameMonthCarry.value && isSameReferenceCarry.value && hasLockedRegularPayrollForMonth(carryToMonthInput.value)) {
    return toast.error('Regular payroll for that month is already paid or locked. Select a later open month.')
  }
  if (!(allowsSameMonthCarry.value && isSameReferenceCarry.value) && hasRegularPayrollForMonth(carryToMonthInput.value, form.value.payroll_id)) {
    setCarryMonth(carryToMonthMinimum.value)
    return toast.error('Regular payroll already exists for that carry month. Select an open month.')
  }
  if (!form.value.adjustment_type) return toast.error('Select adjustment type.')
  if (isOvertimeAdjustment.value && Number(form.value.overtime_hours || 0) <= 0) return toast.error('Enter overtime hours.')
  if (!form.value.amount || Number(form.value.amount) === 0) return toast.error('Enter a valid amount.')
  if (!form.value.reason) return toast.error('Reason is required.')

  submitting.value = true
  try {
    const payload = {
      employee_id: form.value.employee_id,
      payroll_id: form.value.payroll_id,
      ref_year: form.value.ref_year,
      ref_month: form.value.ref_month,
      carry_to_year: form.value.carry_to_year,
      carry_to_month: form.value.carry_to_month,
      adjustment_type: form.value.adjustment_type,
      settlement_type: form.value.settlement_type,
      amount: form.value.amount,
      reason: form.value.reason,
    }

    const created = await store.create(payload)
    toast.success('Adjustment created successfully.')
    router.push({ name: 'PayrollAdjustmentShow', params: { id: created.id } })
  } catch (e) {
    toast.error(e.message || 'Failed to create adjustment.')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="space-y-4 p-4 md:p-6">
    <div class="flex items-center gap-3">
      <button class="btn-3" @click="router.back()"><i class="far fa-arrow-left"></i></button>
      <div>
        <h1 class="text-2xl font-bold text-slate-900">Create Adjustment</h1>
        <p class="text-sm text-slate-500">Link an adjustment to a selected reference payroll month.</p>
      </div>
    </div>

    <div class="grid gap-4 xl:grid-cols-[1.3fr_0.9fr]">
      <div class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div class="space-y-4">
          <div>
            <label class="mb-1 block text-xs font-medium text-slate-600">Employee</label>
            <EmployeeFilter
              v-model:company_id="employeeFilters.company_id"
              v-model:department_id="employeeFilters.department_id"
              v-model:employee_id="employeeFilters.employee_id"
              v-model:line_type="employeeFilters.line_type"
              :with-type="true"
              @filter-change="onEmployeeFilterChange"
            />
          </div>

          <div class="grid gap-4 md:grid-cols-2">
            <div>
              <label class="mb-1 block text-xs font-medium text-slate-600">Reference Payroll Month</label>
              <select
                v-model="form.payroll_id"
                :disabled="payrollLoading || !payrollOptions.length"
                class="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm focus:border-blue-400 focus:outline-none focus:ring-4 focus:ring-blue-100 disabled:bg-slate-50 disabled:text-slate-400"
                @change="onReferencePayrollChange"
              >
                <option value="">--Select Payroll Month--</option>
                <option v-for="payroll in payrollOptions" :key="payroll.id" :value="payroll.id">
                  {{ payrollOptionLabel(payroll) }}
                </option>
              </select>
            </div>
            <div>
              <label class="mb-1 block text-xs font-medium text-slate-600">Carry To Month</label>
              <input
                v-model="carryToMonthInput"
                type="month"
                :min="carryToMonthMinimum"
                class="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm focus:border-blue-400 focus:outline-none focus:ring-4 focus:ring-blue-100"
              />
              <p class="mt-1 text-xs text-slate-500">
                Minimum selectable month: {{ formatMonthLabel(carryToMonthMinimum) }}
              </p>
            </div>
          </div>

          <div class="grid gap-4 md:grid-cols-2">
            <div>
              <label class="mb-1 block text-xs font-medium text-slate-600">Adjustment Type</label>
              <select
                v-model="form.adjustment_type"
                class="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm focus:border-blue-400 focus:outline-none focus:ring-4 focus:ring-blue-100"
              >
                <option v-for="type in adjustmentTypes" :key="type.value" :value="type.value">
                  {{ type.label }}
                </option>
              </select>
            </div>
            <div>
              <label class="mb-1 block text-xs font-medium text-slate-600">Settlement Type</label>
              <select
                v-model="form.settlement_type"
                class="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm focus:border-blue-400 focus:outline-none focus:ring-4 focus:ring-blue-100"
              >
                <option v-for="type in settlementTypes" :key="type.value" :value="type.value">
                  {{ type.label }}
                </option>
              </select>
            </div>
            <div v-if="!isOvertimeAdjustment">
              <label class="mb-1 block text-xs font-medium text-slate-600">Amount</label>
              <input
                v-model="form.amount"
                type="number"
                step="0.01"
                class="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm focus:border-blue-400 focus:outline-none focus:ring-4 focus:ring-blue-100"
                placeholder="Use positive or negative value"
              />
            </div>
          </div>

          <div v-if="isOvertimeAdjustment" class="grid gap-4 md:grid-cols-3">
            <div>
              <label class="mb-1 block text-xs font-medium text-slate-600">Hourly Rate</label>
              <input
                :value="overtimeHourlyRate ? overtimeHourlyRate.toFixed(2) : ''"
                type="number"
                step="0.01"
                readonly
                class="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold text-slate-700 shadow-sm"
                placeholder="Auto"
              />
            </div>
            <div>
              <label class="mb-1 block text-xs font-medium text-slate-600">Hour</label>
              <input
                v-model="form.overtime_hours"
                type="number"
                min="0"
                step="0.01"
                class="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm focus:border-blue-400 focus:outline-none focus:ring-4 focus:ring-blue-100"
                placeholder="Enter hour"
              />
            </div>
            <div>
              <label class="mb-1 block text-xs font-medium text-slate-600">Amount</label>
              <input
                v-model="form.amount"
                type="number"
                step="0.01"
                readonly
                class="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold text-slate-700 shadow-sm"
                placeholder="Auto"
              />
            </div>
          </div>

          <div>
            <label class="mb-1 block text-xs font-medium text-slate-600">Reason</label>
            <textarea
              v-model="form.reason"
              rows="5"
              class="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm focus:border-blue-400 focus:outline-none focus:ring-4 focus:ring-blue-100"
              placeholder="Explain why this adjustment is needed"
            />
          </div>

          <div class="flex flex-wrap items-center gap-3">
            <button class="btn-2" :disabled="submitting || store.loading || payrollLoading" @click="submit">
              <i class="far" :class="submitting ? 'fa-spinner fa-spin' : 'fa-save'"></i>
              {{ submitting ? 'Saving...' : 'Submit Adjustment' }}
            </button>
            <button class="btn-3" @click="router.push({ name: 'PayrollAdjustmentList' })">Cancel</button>
          </div>
        </div>
      </div>

      <div class="space-y-4">
        <div class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 class="text-lg font-semibold text-slate-900">Reference Payroll</h2>
          <LoaderView v-if="payrollLoading" />
          <div v-else-if="payrollError" class="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            {{ payrollError }}
          </div>
          <div v-else-if="latestPayroll" class="mt-3 space-y-3 text-sm">
            <div class="rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <div class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Selection</div>
              <div class="mt-1 font-semibold text-slate-900">{{ employeeDisplay?.name || 'No employee selected' }}</div>
              <div class="text-sm text-slate-500">{{ employeeDisplay?.dept || ' ' }}</div>
              <div class="mt-2 grid gap-2 text-xs sm:grid-cols-2">
                <div class="flex items-center justify-between gap-2">
                  <span class="text-slate-500">Ref Month</span>
                  <span class="font-semibold text-slate-800">{{ payrollMonthLabel }}</span>
                </div>
                <div class="flex items-center justify-between gap-2">
                  <span class="text-slate-500">Carry To</span>
                  <span class="font-semibold text-slate-800">{{ carryToLabel }}</span>
                </div>
              </div>
            </div>

            <div class="overflow-hidden rounded-2xl border border-slate-200">
              <table class="w-full border-collapse text-[12px]">
                <thead class="bg-slate-100 text-slate-800">
                  <tr>
                    <th class="border border-slate-200 px-2 py-2 text-left font-semibold">Earnings</th>
                    <th class="border border-slate-200 px-2 py-2 text-right font-semibold">Amount</th>
                    <th class="border border-slate-200 px-2 py-2 text-left font-semibold">Deductions</th>
                    <th class="border border-slate-200 px-2 py-2 text-right font-semibold">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="i in slipRowCount" :key="i" class="bg-white">
                    <td
                      class="border border-slate-200 px-2 py-1.5"
                      :class="slipEarningRows[i - 1]?.highlight ? 'bg-slate-50 font-semibold' : ''"
                    >
                      {{ slipEarningRows[i - 1]?.label || '' }}
                    </td>
                    <td
                      class="border border-slate-200 px-2 py-1.5 text-right font-mono font-semibold"
                      :class="slipEarningRows[i - 1]?.highlight ? 'bg-slate-50' : ''"
                    >
                      {{ slipEarningRows[i - 1] ? formatCurrency(slipEarningRows[i - 1].amount) : '' }}
                    </td>
                    <td class="border border-slate-200 px-2 py-1.5">
                      {{ slipDeductionRows[i - 1]?.label || '' }}
                    </td>
                    <td class="border border-slate-200 px-2 py-1.5 text-right font-mono font-semibold">
                      {{ slipDeductionRows[i - 1] ? formatCurrency(slipDeductionRows[i - 1].amount) : '' }}
                    </td>
                  </tr>
                  <tr class="bg-slate-50 font-bold">
                    <td class="border border-slate-200 px-2 py-2 text-right">Total Earnings</td>
                    <td class="border border-slate-200 px-2 py-2 text-right font-mono text-emerald-700">
                      {{ formatCurrency(slipTotalEarnings) }}
                    </td>
                    <td class="border border-slate-200 px-2 py-2 text-right">Total Deductions</td>
                    <td class="border border-slate-200 px-2 py-2 text-right font-mono text-red-700">
                      {{ formatCurrency(slipTotalDeductions) }}
                    </td>
                  </tr>
                  <tr class="bg-white font-bold">
                    <td class="border border-slate-200 px-2 py-2 text-right" colspan="3">Net Salary</td>
                    <td class="border border-slate-200 px-2 py-2 text-right font-mono text-blue-800">
                      {{ formatCurrency(slipNetPayment || payrollNet) }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          <div v-else class="mt-3 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
            Choose an employee to load payroll months.
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
