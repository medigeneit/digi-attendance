<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import apiClient from '@/axios'
import LoaderView from '@/components/common/LoaderView.vue'

const props = defineProps({ id: { type: [String, Number], required: true } })
const router = useRouter()

const item = ref(null)
const loading = ref(false)
const error = ref('')

const toNum = (value) => {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

const formatMoney = (value) =>
  new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(toNum(value))

const formatDate = (value) => {
  if (!value) return '-'
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`)
  if (Number.isNaN(date.getTime())) return String(value)

  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(date)
}

const formatMonth = (value) => {
  if (!value) return '-'
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`)
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 7)

  return new Intl.DateTimeFormat('en-GB', {
    month: 'long',
    year: 'numeric',
  }).format(date)
}

const numberToWords = (value) => {
  const n = Math.floor(Math.abs(toNum(value)))
  if (!n) return 'Zero'

  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine']
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']

  const chunkToWords = (num) => {
    let out = ''
    const hundred = Math.floor(num / 100)
    const rest = num % 100

    if (hundred) {
      out += `${ones[hundred]} Hundred`
      if (rest) out += ' '
    }

    if (rest >= 20) {
      out += tens[Math.floor(rest / 10)]
      if (rest % 10) out += ` ${ones[rest % 10]}`
    } else if (rest >= 10) {
      out += teens[rest - 10]
    } else if (rest > 0) {
      out += ones[rest]
    }

    return out
  }

  const parts = []
  const crore = Math.floor(n / 10000000)
  const lakh = Math.floor((n % 10000000) / 100000)
  const thousand = Math.floor((n % 100000) / 1000)
  const remainder = n % 1000

  if (crore) parts.push(`${chunkToWords(crore)} Crore`)
  if (lakh) parts.push(`${chunkToWords(lakh)} Lakh`)
  if (thousand) parts.push(`${chunkToWords(thousand)} Thousand`)
  if (remainder) parts.push(chunkToWords(remainder))

  return `${parts.join(' ')} Only`
}

const fetchSlip = async () => {
  error.value = ''
  loading.value = true

  try {
    const response = await apiClient.get(`/payroll-cash-slips/${props.id}`)
    item.value = response.data?.data ?? response.data ?? null
  } catch (e) {
    error.value = e.message || 'Failed to load payroll slip.'
    item.value = null
  } finally {
    loading.value = false
  }
}

const companyName = computed(() => item.value?.user?.company?.name || item.value?.company_name || '-')
const employeeName = computed(() => item.value?.employee_name || item.value?.user?.name || '-')
const employeeId = computed(() => item.value?.employee_code || item.value?.user?.employee_id || '-')
const designation = computed(() => item.value?.designation_name || item.value?.user?.designation?.name || '-')
const department = computed(() => item.value?.department_name || item.value?.user?.department?.name || '-')
const joiningDate = computed(() => item.value?.joining_date || item.value?.user?.joining_date || null)

const earningsRows = computed(() => {
  const raw = item.value?.earnings || {}
  return [
    { key: 'basic', label: 'Basic Salary', amount: toNum(raw.basic) },
    { key: 'house_rent', label: 'House Rent', amount: toNum(raw.house_rent) },
    { key: 'medical', label: 'Medical', amount: toNum(raw.medical) },
    { key: 'conveyance', label: 'Conveyance', amount: toNum(raw.conveyance) },
    { key: 'others', label: 'Other Allowance', amount: toNum(raw.others) },
  ]
})

const deductionRows = computed(() => {
  const raw = item.value?.deductions || {}
  const pfAllowance = toNum(item.value?.deductions?.pf_allowance)
  const securityMoney = toNum(raw.security_money)
  return [
    { key: 'pf', label: 'PF Both', amount: toNum(raw.provident_fund) + pfAllowance },
    { key: 'meal', label: 'Meal Deduction', amount: toNum(raw.meal) },
    { key: 'tax', label: 'Tax', amount: toNum(raw.tds) },
    { key: 'loan', label: 'Loan', amount: toNum(raw.loan) },
    ...(securityMoney > 0 ? [{ key: 'security_money', label: 'Security Money', amount: securityMoney }] : []),
    { key: 'other', label: 'Others', amount: toNum(raw.other) },
    { key: 'advance', label: 'Advance', amount: toNum(raw.advance) },
    { key: 'paycut', label: 'Paycut', amount: toNum(raw.paycut) },
  ]
})

const totalEarnings = computed(() => toNum(item.value?.earnings?.total))
const totalDeductions = computed(() => toNum(item.value?.deductions?.total))
const netPayment = computed(() => toNum(item.value?.net_payment))
const paymentMethod = computed(() => item.value?.payment_method || item.value?.user?.default_payment_method || 'Cash')
const bankName = computed(() => item.value?.bank_name || item.value?.user?.bank_name || '-')
const accountNumber = computed(() => item.value?.bank_account_no || item.value?.user?.bank_account_no || '-')
const amountWords = computed(() => numberToWords(netPayment.value))
const appliedAdjustments = computed(() => Array.isArray(item.value?.adjustments_applied) ? item.value.adjustments_applied : [])
const contraEntries = computed(() => (Array.isArray(item.value?.contra_entries) ? item.value.contra_entries : []))

const normalizeSettlementType = (value) => (value === 'manual_settled' ? 'manual_settled' : 'carry_forward')

const refMonthShortLabel = (adj) => {
  const year = Number(adj?.ref_year)
  const month = Number(adj?.ref_month)

  if (Number.isFinite(year) && Number.isFinite(month) && month >= 1 && month <= 12) {
    return new Intl.DateTimeFormat('en-GB', { month: 'short' }).format(new Date(year, month - 1, 1))
  }

  const refLabel = String(adj?.ref_month_label || '').trim()
  if (/^\d{4}-\d{2}$/.test(refLabel)) {
    const [y, m] = refLabel.split('-').map(Number)
    if (Number.isFinite(y) && Number.isFinite(m) && m >= 1 && m <= 12) {
      return new Intl.DateTimeFormat('en-GB', { month: 'short' }).format(new Date(y, m - 1, 1))
    }
  }

  return ''
}

const titleize = (value) =>
  String(value || '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())

const labelWithMonth = (base, adj) => {
  const month = refMonthShortLabel(adj) || adj?.ref_month_label
  return month ? `${base} (${month})` : base
}

const earningContraRows = computed(() =>
  contraEntries.value
    .filter((row) => row?.side === 'earning')
    .map((row) => ({ key: `contra_earning_${row.ref || row.label}`, label: row.label, amount: toNum(row.amount), is_delta: true })),
)

const deductionContraRows = computed(() =>
  contraEntries.value
    .filter((row) => row?.side === 'deduction')
    .map((row) => ({ key: `contra_deduction_${row.ref || row.label}`, label: row.label, amount: toNum(row.amount), is_delta: true })),
)

const manualSettledFallback = computed(() =>
  appliedAdjustments.value.filter(
    (adj) => normalizeSettlementType(adj?.settlement_type) === 'manual_settled' && !adj?.contra_injected,
  ),
)

const manualSettledFallbackEarningRows = computed(() =>
  manualSettledFallback.value.map((adj) => ({
    key: `manual_settled_earning_${adj.id}`,
    label: labelWithMonth('Manual Adj', adj),
    amount: Math.abs(toNum(adj.amount)),
    is_delta: true,
  })),
)

const manualSettledFallbackDeductionRows = computed(() =>
  manualSettledFallback.value.map((adj) => ({
    key: `manual_settled_deduction_${adj.id}`,
    label: labelWithMonth('Adj Recovery', adj),
    amount: Math.abs(toNum(adj.amount)),
    is_delta: true,
  })),
)

const carryForwardAdjustments = computed(() =>
  appliedAdjustments.value.filter((adj) => normalizeSettlementType(adj?.settlement_type) === 'carry_forward'),
)

const carryForwardEarningRows = computed(() =>
  carryForwardAdjustments.value
    .filter((adj) => {
      const type = String(adj?.adjustment_type || '')
      const amount = toNum(adj?.amount)
      if (type === 'deduction') return false
      if (['overtime', 'paycut_reversal', 'bonus'].includes(type)) return true
      if (type === 'other') return amount >= 0
      return amount >= 0
    })
    .map((adj) => ({
      key: `carry_forward_earning_${adj.id}`,
      label: labelWithMonth(`${titleize(adj.adjustment_type)} Adj`, adj),
      amount: toNum(adj.amount),
      is_delta: true,
    })),
)

const carryForwardDeductionRows = computed(() =>
  carryForwardAdjustments.value
    .filter((adj) => {
      const type = String(adj?.adjustment_type || '')
      const amount = toNum(adj?.amount)
      if (type === 'deduction') return true
      if (['overtime', 'paycut_reversal', 'bonus'].includes(type)) return false
      if (type === 'other') return amount < 0
      return amount < 0
    })
    .map((adj) => ({
      key: `carry_forward_deduction_${adj.id}`,
      label: labelWithMonth(`${titleize(adj.adjustment_type)} Adj`, adj),
      amount: Math.abs(toNum(adj.amount)),
      is_delta: true,
    })),
)

const earningsRowsFinal = computed(() => [
  ...earningsRows.value,
  ...earningContraRows.value,
  ...manualSettledFallbackEarningRows.value,
  ...carryForwardEarningRows.value,
])

const deductionRowsFinal = computed(() => [
  ...deductionRows.value,
  ...deductionContraRows.value,
  ...manualSettledFallbackDeductionRows.value,
  ...carryForwardDeductionRows.value,
])

// CashSlipResource now returns totals already adjusted by adjustments_applied.
const totalEarningsDisplay = computed(() => totalEarnings.value)
const totalDeductionsDisplay = computed(() => totalDeductions.value)

const slipRowCount = computed(() => Math.max(earningsRowsFinal.value.length, deductionRowsFinal.value.length))

const formatRowAmount = (row) => {
  if (!row) return ''
  const amount = toNum(row.amount)
  if (row.is_delta) {
    return `${formatMoney(Math.abs(amount))}`
  }
  return formatMoney(amount)
}

const printPage = () => window.print()

onMounted(fetchSlip)
</script>

<template>
  <div class="min-h-screen bg-slate-100 px-4 py-6 print:bg-white print:p-0">
    <div class="mx-auto max-w-[820px] print:max-w-none">
      <div class="mb-4 flex flex-wrap items-center justify-between gap-2 print:hidden">
        <button class="btn-3" @click="router.back()">
          <i class="far fa-arrow-left"></i> Back
        </button>
        <button class="btn-2" @click="printPage">
          <i class="far fa-print"></i> Print
        </button>
      </div>

      <LoaderView v-if="loading" />

      <div v-else-if="error" class="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        {{ error }}
      </div>

      <div v-else-if="item" class="bg-white shadow-xl ring-1 ring-slate-300 print:shadow-none print:ring-0">
        <div class="p-8 print:p-0">
          <div class="paper mx-auto">
            <div class="text-center">
              <div class="mt-1 text-[15px] font-medium text-slate-700">{{ companyName }}</div>
              <div class="mt-1 text-[13px] text-slate-600">System generated payslip</div>
            </div>

            <div class="info-grid mt-8 text-[14px] text-slate-800">
              
              <div class="space-y-1">
                <div class="flex gap-2">
                  <span class="w-36 text-slate-600">Employee name</span>
                  <span>: {{ employeeName }}</span>
                </div>
                <div class="flex gap-2">
                  <span class="w-36 text-slate-600">Designation</span>
                  <span>: {{ designation }}</span>
                </div>
                <div class="flex gap-2">
                  <span class="w-36 text-slate-600">Department</span>
                  <span>: {{ department }}</span>
                </div>
              </div>
              <div class="space-y-1">
                <div class="flex gap-2">
                  <span class="w-36 text-slate-600">Date of Joining</span>
                  <span>: {{ formatDate(joiningDate) }}</span>
                </div>
                <div class="flex gap-2">
                  <span class="w-36 text-slate-600">Pay Period</span>
                  <span>: {{ formatMonth(item.salary_month) }}</span>
                </div>
                <div class="flex gap-2">
                  <span class="w-36 text-slate-600">Employee ID</span>
                  <span>: {{ employeeId }}</span>
                </div>
              </div>
            </div>

            <div class="mt-6 overflow-hidden border border-slate-700">
              <table class="slip-table w-full border-collapse text-[13px]">
                <thead>
                  <tr class="bg-slate-100 text-slate-900">
                    <th class="border border-slate-700 px-3 py-2 text-center font-semibold">Earnings</th>
                    <th class="border border-slate-700 px-3 py-2 text-center font-semibold">Amount</th>
                    <th class="border border-slate-700 px-3 py-2 text-center font-semibold">Deductions</th>
                    <th class="border border-slate-700 px-3 py-2 text-center font-semibold">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="index in slipRowCount" :key="index">
	                    <td class="border border-slate-700 px-3 py-2">{{ earningsRowsFinal[index - 1]?.label || '' }}</td>
	                    <td class="border border-slate-700 px-3 py-2 text-right font-mono font-semibold">
	                      {{ formatRowAmount(earningsRowsFinal[index - 1]) }}
	                    </td>
	                    <td class="border border-slate-700 px-3 py-2">{{ deductionRowsFinal[index - 1]?.label || '' }}</td>
	                    <td class="border border-slate-700 px-3 py-2 text-right font-mono font-semibold">
	                      {{ formatRowAmount(deductionRowsFinal[index - 1]) }}
	                    </td>
	                  </tr>
                  <tr class="font-semibold">
                    <td class="border border-slate-700 px-3 py-2 text-right">Total Earnings</td>
                    <td class="border border-slate-700 px-3 py-2 text-right font-mono">
                      {{ formatMoney(totalEarningsDisplay) }}
                    </td>
                    <td class="border border-slate-700 px-3 py-2 text-right">Total Deductions</td>
                    <td class="border border-slate-700 px-3 py-2 text-right font-mono">
                      {{ formatMoney(totalDeductionsDisplay) }}
                    </td>
                  </tr>
                  <tr class="font-semibold">
                    <td class="border border-slate-700 px-3 py-2 text-right" colspan="3">Net Pay</td>
                    <td class="border border-slate-700 px-3 py-2 text-right font-mono">
                      {{ formatMoney(netPayment) }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div class="mt-5">
              <div class="amount-box">
                <div class="text-[15px] font-semibold text-slate-800">
                  {{ amountWords }}
                </div>
                <div class="mt-1 text-[16px] font-bold text-slate-600">
                  {{ formatMoney(netPayment) }}
                </div>
              </div>
            </div>

            <div class="signature-grid mt-14">
              <div>
                <div class="signature-line"></div>
                <div class="mt-2 text-center text-sm text-slate-700">Employer Signature</div>
              </div>
              <div>
                <div class="signature-line"></div>
                <div class="mt-2 text-center text-sm text-slate-700">Employee Signature</div>
              </div>
            </div>

            <div class="mt-8 border-t border-slate-200 pt-3 text-center text-sm text-slate-600">
              Payment Method: {{ paymentMethod }}<span v-if="bankName !== '-'"> | {{ bankName }}</span
              ><span v-if="accountNumber !== '-'"> | {{ accountNumber }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.paper {
  width: 190mm;
  min-height: 277mm;
  padding: 0 6mm 6mm;
  color: #111827;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0 10mm;
}

.amount-box {
  width: 75%;
  text-align: left;
}

.signature-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10mm;
}

.slip-table {
  table-layout: fixed;
}

.slip-table th,
.slip-table td {
  word-break: break-word;
}

.signature-line {
  border-top: 1px solid #6b7280;
  margin-top: 4.5rem;
}

@media print {
  :global(body) {
    background: #fff !important;
  }

  .paper {
    width: auto;
    min-height: auto;
    padding: 0;
  }

  .info-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .amount-box {
    width: 75%;
  }

  .signature-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
