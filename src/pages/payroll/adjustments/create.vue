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
const payrollLoading = ref(false)
const payrollError = ref('')
const submitting = ref(false)

const form = ref({
  employee_id: '',
  payroll_id: '',
  ref_year: '',
  ref_month: '',
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
  if (!form.value.ref_year || !form.value.ref_month) return '-'
  const year = Number(form.value.ref_year)
  const month = Number(form.value.ref_month)
  const next = new Date(Date.UTC(year, month, 1))
  return new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric' }).format(next)
})

const payrollMonthLabel = computed(() => {
  if (!latestPayroll.value?.salary_month) return '-'
  const date = new Date(`${String(latestPayroll.value.salary_month).slice(0, 10)}T00:00:00`)
  if (Number.isNaN(date.getTime())) return String(latestPayroll.value.salary_month).slice(0, 10)
  return new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric' }).format(date)
})

const payrollNet = computed(() => Number(latestPayroll.value?.net_salary || 0))

const toNum = (value) => {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

const isOvertimeAdjustment = computed(() => form.value.adjustment_type === 'overtime')

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
  const rows = [
    { key: 'basic', label: 'Basic Salary', amount: toNum(earnings.basic ?? latestPayroll.value?.basic_salary) },
    { key: 'house_rent', label: 'House Rent', amount: toNum(earnings.house_rent ?? latestPayroll.value?.house_rent) },
    { key: 'medical', label: 'Medical', amount: toNum(earnings.medical ?? latestPayroll.value?.medical_allowance) },
    { key: 'conveyance', label: 'Conveyance', amount: toNum(earnings.conveyance ?? latestPayroll.value?.conveyance_allowance) },
    { key: 'gross', label: 'Gross', amount: toNum(earnings.gross ?? latestPayroll.value?.gross_salary), highlight: true },
    { key: 'others', label: 'Others', amount: toNum(earnings.others ?? latestPayroll.value?.other_allowance_total) },
    { key: 'pf_allowance', label: 'PF Allowance', amount: toNum(latestPayroll.value?.deductions?.pf_allowance) },
    { key: 'arrear', label: 'Arrear', amount: toNum(latestPayroll.value?.arrear ?? latestPayroll.value?.arrear_amount) },
  ]

  return rows.filter((row) => row.highlight || row.amount !== 0)
})

const slipDeductionRows = computed(() => {
  const deductions = latestPayroll.value?.deductions || {}
  const rows = [
    { key: 'pf', label: 'PF Both', amount: toNum(deductions.provident_fund) + toNum(deductions.pf_allowance ?? latestPayroll.value?.pf_deduction) },
    { key: 'meal', label: 'Meal Deduction', amount: toNum(deductions.meal ?? latestPayroll.value?.meal_deduction) },
    { key: 'tds', label: 'Tax', amount: toNum(deductions.tds ?? latestPayroll.value?.tax_deduction) },
    { key: 'loan', label: 'Loan', amount: toNum(deductions.loan ?? latestPayroll.value?.loan_deduction) },
    { key: 'security_money', label: 'Security Money', amount: toNum(deductions.security_money ?? latestPayroll.value?.security_money_deduction) },
    { key: 'other', label: 'Others', amount: toNum(deductions.other ?? latestPayroll.value?.other_deduction) },
    { key: 'advance', label: 'Advance', amount: toNum(deductions.advance ?? latestPayroll.value?.advance_deduction) },
    { key: 'paycut', label: 'Paycut', amount: toNum(deductions.paycut ?? latestPayroll.value?.paycut_deduction) },
  ]

  return rows.filter((row) => row.amount !== 0)
})

const slipRowCount = computed(() => Math.max(slipEarningRows.value.length, slipDeductionRows.value.length))
const slipTotalEarnings = computed(() => toNum(latestPayroll.value?.earnings?.total) || toNum(latestPayroll.value?.gross_salary) + toNum(latestPayroll.value?.other_allowance_total) + toNum(latestPayroll.value?.manual_addition))
const slipTotalDeductions = computed(() => toNum(latestPayroll.value?.deductions?.total) || toNum(latestPayroll.value?.total_deduction))
const slipNetPayment = computed(() => toNum(latestPayroll.value?.net_payment ?? latestPayroll.value?.net_salary))

const loadLatestPayroll = async (employeeId) => {
  payrollError.value = ''
  latestPayroll.value = null

  if (!employeeId) return

  payrollLoading.value = true
  try {
    const res = await apiClient.get('/payrolls', {
      params: {
        user_id: employeeId,
        per_page: 1,
      },
    })

    const payload = res.data?.data || []
    const payrollRow = Array.isArray(payload) ? payload[0] || null : payload?.[0] || null
    latestPayroll.value = payrollRow

    if (!latestPayroll.value) {
      payrollError.value = 'No payroll found for this employee.'
      return
    }

    const slipRes = await apiClient.get(`/payroll-cash-slips/${latestPayroll.value.id}`)
    const slip = slipRes.data?.data || null
    if (slip) {
      latestPayroll.value = { ...payrollRow, ...slip }
    }

    const month = String(latestPayroll.value.salary_month).slice(0, 7)
    form.value.payroll_id = latestPayroll.value.id
    form.value.ref_year = Number(month.slice(0, 4))
    form.value.ref_month = Number(month.slice(5, 7))
    employeeDisplay.value = {
      name: latestPayroll.value.user?.name || latestPayroll.value.employee_name || employeeDisplay.value.name,
      dept: latestPayroll.value.user?.department?.name || latestPayroll.value.department_name || employeeDisplay.value.dept,
    }
  } catch (e) {
    payrollError.value = e.message || 'Failed to load latest payroll.'
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
  latestPayroll.value = null
  employeeDisplay.value = { name: null, dept: null }
  await loadLatestPayroll(nextEmployeeId)
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
  if (!form.value.payroll_id) return toast.error('No payroll found for this employee.')
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
        <p class="text-sm text-slate-500">Link an adjustment to the employee's latest payroll month.</p>
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
          <h2 class="text-lg font-semibold text-slate-900">Latest Payroll</h2>
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
                  <span class="text-slate-500">Payroll Month</span>
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
            Choose an employee to load the latest payroll.
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
