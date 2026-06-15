<script setup>
import { computed, nextTick, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'
import apiClient from '@/axios'
import LoaderView from '@/components/common/LoaderView.vue'

const props = defineProps({ id: { type: [String, Number], required: true } })
const router = useRouter()

const item = ref(null)
const loading = ref(false)
const error = ref('')
const slipPaper = ref(null)
const showPadConfig = ref(false)
const downloadingPdf = ref(false)

const PAD_KEY = 'payroll-cash-slip-pad'
const pad = reactive({
  headerHeight: 0,
  footerHeight: 0,
})

let pageStyleEl = null

const toNum = (value) => {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

const formatMoney = (value) =>
  new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(toNum(value))

const formatPercent = (value) => {
  const amount = toNum(value)
  if (!amount) return '0%'
  return `${new Intl.NumberFormat('en-US', {
    minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amount)}%`
}

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
const payrollCycleLabel = computed(() => item.value?.payroll_cycle_label || titleize(item.value?.payroll_cycle || item.value?.settlement_mode || 'regular'))
const slipTitle = computed(() => item.value?.slip_title || 'Payroll Cash Slip')
const isAdvanceCycle = computed(() =>
  ['half_salary_advance', 'half_month', 'advance'].includes(String(item.value?.payroll_cycle || item.value?.settlement_mode || '').toLowerCase()),
)
const isBonusOnlyCycle = computed(() => String(item.value?.payroll_cycle || item.value?.settlement_mode || '').toLowerCase() === 'bonus_only')
const grossReferenceAmount = computed(() =>
  toNum(
    item.value?.gross_reference_amount
      ?? item.value?.monthly_gross_salary
      ?? item.value?.gross_salary
      ?? item.value?.calculation_breakdown?.gross_salary
      ?? item.value?.earnings?.gross,
  ),
)
const salaryAdvancePayable = computed(() => toNum(item.value?.base_payable_amount ?? item.value?.earnings?.basic))
const advancePercentage = computed(() => {
  const configured = item.value?.advance_percentage ?? item.value?.salary_percentage
  if (configured !== null && configured !== undefined && configured !== '') return toNum(configured)
  return grossReferenceAmount.value > 0 ? (salaryAdvancePayable.value / grossReferenceAmount.value) * 100 : 0
})
const salaryAdvanceLabel = computed(() =>
  advancePercentage.value > 0
    ? `Advance Payable (${formatPercent(advancePercentage.value)} of Gross)`
    : 'Advance Payable',
)
const advanceAdjustedAmount = computed(() => toNum(item.value?.advance_adjusted_amount ?? item.value?.calculation_breakdown?.advance_adjusted_amount))
const paycutDeductionLabel = computed(() => {
  const paycutAmount = paycutReductionAmount.value
  if (advanceAdjustedAmount.value > 0 && Math.abs(paycutAmount - advanceAdjustedAmount.value) < 1) {
    return 'Half Salary Advance Adjustment'
  }

  return 'Attendance Paycut'
})
const paycutReductionAmount = computed(() =>
  toNum(item.value?.earnings?.paycut_reduction ?? item.value?.paycut_deduction)
)
const payPeriodLabel = computed(() => {
  if (item.value?.period_start && item.value?.period_end) {
    return `${formatDate(item.value.period_start)} - ${formatDate(item.value.period_end)}`
  }
  return item.value?.pay_period || formatMonth(item.value?.salary_month)
})

const earningsRows = computed(() => {
  const raw = item.value?.earnings || {}
  const pfAllowance = toNum(item.value?.deductions?.pf_allowance)

  if (isAdvanceCycle.value) {
    return [
      ...(grossReferenceAmount.value > 0
        ? [{ key: 'gross_reference', label: 'Gross Salary (Reference)', amount: grossReferenceAmount.value, reference: true }]
        : []),
      { key: 'salary_advance', label: salaryAdvanceLabel.value, amount: salaryAdvancePayable.value, highlight: true },
      ...(toNum(raw.bonus ?? item.value?.bonus_amount) > 0
        ? [{ key: 'bonus', label: 'Bonus', amount: toNum(raw.bonus ?? item.value?.bonus_amount) }]
        : []),
    ]
  }

  if (isBonusOnlyCycle.value) {
    return [
      { key: 'bonus', label: 'Bonus', amount: toNum(raw.bonus ?? item.value?.bonus_amount), highlight: true },
    ]
  }

  return [
    { key: 'gross', label: 'Gross Salary', amount: toNum(raw.gross ?? item.value?.gross_salary), highlight: true },
    { key: 'others', label: 'Others', amount: toNum(raw.others) },
    ...(toNum(raw.bonus ?? item.value?.bonus_amount) > 0
      ? [{ key: 'bonus', label: 'Bonus', amount: toNum(raw.bonus ?? item.value?.bonus_amount) }]
      : []),
    ...(pfAllowance > 0
      ? [{ key: 'pf_allowance', label: 'PF Allowance', amount: pfAllowance }]
      : []),
    { key: 'arrear', label: 'Arrear', amount: toNum(item.value?.arrear) },
    ...(paycutReductionAmount.value > 0
      ? [{ key: 'paycut_reduction', label: paycutDeductionLabel.value, amount: -paycutReductionAmount.value, is_delta: true }]
      : []),
  ].filter((row) => toNum(row?.amount) !== 0)
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
    {
      key: 'half_salary_advance_adjustment',
      label: 'Half Salary Advance Adjustment',
      amount: toNum(raw.half_salary_advance_adjustment ?? item.value?.advance_adjusted_amount),
    },
    { key: 'advance', label: 'Advance', amount: toNum(raw.advance) },
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
    const sign = amount >= 0 ? '+' : '-'
    return `${sign} ${formatMoney(Math.abs(amount))}`
  }
  return formatMoney(amount)
}

const loadPad = () => {
  try {
    Object.assign(pad, JSON.parse(localStorage.getItem(PAD_KEY) || '{}'))
  } catch {
    // Ignore malformed local storage values.
  }
}

const updatePageStyle = () => {
  if (!pageStyleEl) {
    pageStyleEl = document.createElement('style')
    pageStyleEl.id = 'payroll-cash-slip-page-margins'
    document.head.appendChild(pageStyleEl)
  }

  pageStyleEl.textContent = `@page { size: A4 portrait; margin: ${Number(pad.headerHeight) || 0}cm 0 ${Number(pad.footerHeight) || 0}cm; }`
}

watch(pad, () => {
  localStorage.setItem(PAD_KEY, JSON.stringify({ ...pad }))
  updatePageStyle()
}, { deep: true })

const printPage = () => {
  updatePageStyle()
  window.print()
}

const safeFilePart = (value) =>
  String(value || '')
    .trim()
    .replace(/[\\/:*?"<>|]+/g, '-')
    .replace(/\s+/g, '-')
    .toLowerCase()

const downloadPdf = async () => {
  if (downloadingPdf.value || !slipPaper.value) return
  downloadingPdf.value = true

  try {
    await nextTick()
    const canvas = await html2canvas(slipPaper.value, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
    })

    const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' })
    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()
    const topPad = (Number(pad.headerHeight) || 0) * 28.3465
    const bottomPad = (Number(pad.footerHeight) || 0) * 28.3465
    const availableHeight = Math.max(1, pageHeight - topPad - bottomPad)
    let imageWidth = pageWidth
    let imageHeight = (canvas.height * imageWidth) / canvas.width

    if (imageHeight > availableHeight) {
      imageHeight = availableHeight
      imageWidth = (canvas.width * imageHeight) / canvas.height
    }

    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', (pageWidth - imageWidth) / 2, topPad, imageWidth, imageHeight)
    pdf.save(`payroll-cash-slip-${safeFilePart(employeeId.value || props.id)}.pdf`)
  } finally {
    downloadingPdf.value = false
  }
}

onMounted(() => {
  loadPad()
  updatePageStyle()
  fetchSlip()
})

onUnmounted(() => {
  pageStyleEl?.remove()
  pageStyleEl = null
})
</script>

<template>
  <div class="min-h-screen bg-slate-100 px-4 py-6 print:bg-white print:p-0">
    <div class="mx-auto max-w-[820px] print:max-w-none">
      <div class="mb-4 flex flex-wrap items-center justify-between gap-2 print:hidden">
        <button class="btn-3" @click="router.back()">
          <i class="far fa-arrow-left"></i> Back
        </button>
        <div class="flex flex-wrap items-center gap-2">
          <button
            type="button"
            class="btn-3"
            :class="showPadConfig ? '!border-blue-200 !bg-blue-50 !text-blue-700' : ''"
            @click="showPadConfig = !showPadConfig"
          >
            <i class="far fa-image"></i> Pad
          </button>
          <button class="btn-3" :disabled="downloadingPdf" @click="downloadPdf">
            <i class="far" :class="downloadingPdf ? 'fa-spinner fa-spin' : 'fa-download'"></i>
            {{ downloadingPdf ? 'Downloading...' : 'Download PDF' }}
          </button>
          <button class="btn-2" @click="printPage">
            <i class="far fa-print"></i> Print
          </button>
        </div>
      </div>

      <div v-if="showPadConfig" class="mb-4 flex flex-wrap items-end gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm print:hidden">
        <div>
          <label class="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Header pad</label>
          <div class="flex items-center gap-2">
            <input v-model.number="pad.headerHeight" type="number" min="0" max="10" step="0.5" class="h-9 w-24 rounded border border-slate-300 px-2 text-center text-sm font-semibold" />
            <span class="text-sm text-slate-500">cm</span>
          </div>
        </div>
        <div>
          <label class="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Footer pad</label>
          <div class="flex items-center gap-2">
            <input v-model.number="pad.footerHeight" type="number" min="0" max="10" step="0.5" class="h-9 w-24 rounded border border-slate-300 px-2 text-center text-sm font-semibold" />
            <span class="text-sm text-slate-500">cm</span>
          </div>
        </div>
        <p class="text-xs text-slate-500">
          Pre-printed pad/letterhead space. Print and downloaded PDF both use this spacing.
        </p>
      </div>

      <LoaderView v-if="loading" />

      <div v-else-if="error" class="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        {{ error }}
      </div>

      <div v-else-if="item" class="bg-white shadow-xl ring-1 ring-slate-300 print:shadow-none print:ring-0">
        <div class="p-8 print:p-0">
          <div ref="slipPaper" class="paper mx-auto">
            <div class="slip-title text-center">
              <div class="text-[18px] font-bold uppercase tracking-wide text-slate-950">{{ companyName }}</div>
              <div class="mt-1 text-[13px] font-semibold uppercase tracking-[0.16em] text-slate-600">{{ slipTitle }}</div>
              <div class="mt-1 text-[13px] font-medium text-slate-600">{{ payPeriodLabel }}</div>
              <div class="mt-2 inline-flex border border-slate-200 bg-slate-50 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                {{ payrollCycleLabel }}
              </div>
            </div>

            <div class="info-grid mt-8 text-[13px] text-slate-800">
              <div class="space-y-1.5">
                <div class="info-row">
                  <span>Employee name</span>
                  <strong>{{ employeeName }}</strong>
                </div>
                <div class="info-row">
                  <span>Date of Joining</span>
                  <strong>{{ formatDate(joiningDate) }}</strong>
                </div>
                <div class="info-row">
                  <span>Employee ID</span>
                  <strong>{{ employeeId }}</strong>
                </div>
              </div>
              <div class="space-y-1.5">
                <div class="info-row">
                  <span>Designation</span>
                  <strong>{{ designation }}</strong>
                </div>
                <div class="info-row">
                  <span>Department</span>
                  <strong>{{ department }}</strong>
                </div>
              </div>
            </div>

            <div class="mt-6 overflow-hidden border border-slate-300">
              <table class="slip-table w-full border-collapse text-[12px]">
                <thead>
                  <tr class="text-slate-950">
                    <th class="border border-slate-300 px-3 py-2.5 text-left font-semibold">Earnings</th>
                    <th class="border border-slate-300 px-3 py-2.5 text-right font-semibold">Amount</th>
                    <th class="border border-slate-300 px-3 py-2.5 text-left font-semibold">Deductions</th>
                    <th class="border border-slate-300 px-3 py-2.5 text-right font-semibold">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="index in slipRowCount" :key="index">
                    <td
                      class="border border-slate-300 px-3 py-2"
                      :class="[
                        earningsRowsFinal[index - 1]?.highlight ? 'bg-emerald-50 font-semibold text-emerald-950' : '',
                        earningsRowsFinal[index - 1]?.reference ? 'text-slate-600' : '',
                      ]"
                    >
                      {{ earningsRowsFinal[index - 1]?.label || '' }}
                    </td>
                    <td
                      class="border border-slate-300 px-3 py-2 text-right font-mono font-semibold"
                      :class="[
                        earningsRowsFinal[index - 1]?.highlight ? 'bg-emerald-50 text-emerald-950' : '',
                        earningsRowsFinal[index - 1]?.reference ? 'text-slate-600' : '',
                      ]"
                    >
                      {{ formatRowAmount(earningsRowsFinal[index - 1]) }}
                    </td>
                    <td class="border border-slate-300 px-3 py-2">
                      {{ deductionRowsFinal[index - 1]?.label || '' }}
                    </td>
                    <td class="border border-slate-300 px-3 py-2 text-right font-mono font-semibold">
                      {{ formatRowAmount(deductionRowsFinal[index - 1]) }}
                    </td>
                  </tr>
                  <tr class="font-bold text-slate-950">
                    <td class="border border-slate-300 px-3 py-2.5 text-right">Total Earnings</td>
                    <td class="border border-slate-300 px-3 py-2.5 text-right font-mono text-emerald-800">
                      {{ formatMoney(totalEarningsDisplay) }}
                    </td>
                    <td class="border border-slate-300 px-3 py-2.5 text-right">Total Deductions</td>
                    <td class="border border-slate-300 px-3 py-2.5 text-right font-mono text-red-800">
                      {{ formatMoney(totalDeductionsDisplay) }}
                    </td>
                  </tr>
                  <tr class="font-bold text-slate-950">
                    <td class="border border-slate-300 px-3 py-3 text-right" colspan="3">Net Payment</td>
                    <td class="border border-slate-300 px-3 py-3 text-right font-mono text-[15px]">
                      {{ formatMoney(netPayment) }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div class="mt-5">
              <div class="amount-box">
                <div class="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Amount in Words</div>
                <div class="mt-1 text-[15px] font-bold text-slate-900">
                  {{ amountWords }}
                </div>
                <div class="mt-2 text-[16px] font-bold text-slate-900">
                  {{ formatMoney(netPayment) }}
                </div>
              </div>
            </div>

            <div class="signature-grid mt-14">
              <div>
                <div class="signature-line"></div>
                <div class="mt-2 text-center text-sm text-slate-700">Accounts Officer / Authority Signature</div>
              </div>
              <div>
                <div class="signature-line"></div>
                <div class="mt-2 text-center text-sm text-slate-700">Employee Signature</div>
              </div>
            </div>

            <div class="payment-footer mt-8 text-center text-sm text-slate-600">
              Payment Method: <strong>{{ paymentMethod }}</strong><span v-if="bankName !== '-'"> | {{ bankName }}</span
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
  padding: 7mm 7mm 6mm;
  color: #111827;
  background: #fff;
}

.slip-title {
  border-bottom: 2px solid #0f172a;
  padding-bottom: 4mm;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0 10mm;
  padding: 0 4mm;
}

.info-row {
  display: grid;
  grid-template-columns: 34mm minmax(0, 1fr);
  gap: 3mm;
  align-items: start;
}

.info-row span {
  color: #64748b;
  font-weight: 600;
}

.info-row strong {
  color: #0f172a;
  font-weight: 700;
}

.info-row strong::before {
  content: ": ";
  color: #64748b;
  font-weight: 500;
}

.amount-box {
  width: 75%;
  padding: 0;
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

.slip-table tbody tr:nth-child(even) {
  background: #f8fafc;
}

.slip-table th,
.slip-table td {
  word-break: break-word;
}

.signature-line {
  border-top: 1px solid #6b7280;
  margin-top: 4.5rem;
}

.payment-footer {
  border-top: 1px solid #cbd5e1;
  padding-top: 3mm;
}

.payment-footer strong {
  color: #0f172a;
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
    background: #fff;
  }

  .amount-box {
    width: 75%;
    background: #fff;
  }

  .signature-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .slip-table tbody tr:nth-child(even) {
    background: #fff;
  }
}
</style>
