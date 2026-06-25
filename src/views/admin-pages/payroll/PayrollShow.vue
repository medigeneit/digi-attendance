<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'
import { storeToRefs } from 'pinia'
import { usePayrollManagementStore } from '@/stores/payrollManagement'
import LoaderView from '@/components/common/LoaderView.vue'
import PayrollStatusBadge from '@/components/payroll/PayrollStatusBadge.vue'
import PayrollAuditTrail from '@/components/payroll/PayrollAuditTrail.vue'
import PaymentStatusModal from '@/components/payroll/PaymentStatusModal.vue'
import { formatCurrency } from '@/utils/currency'
import { isPfAllowanceRow } from '@/utils/salaryPolicy'

const props = defineProps({ id: { type: [String, Number], required: true } })
const router = useRouter()
const toast = useToast()
const payrollStore = usePayrollManagementStore()
const { item, loading, error } = storeToRefs(payrollStore)

const showPaymentModal = ref(false)
const activeTab = ref('breakdown')
const audit = ref(null)
const auditLoading = ref(false)
const netPaymentUpdating = ref(false)

onMounted(() => payrollStore.fetchItem(props.id))

const isLockedPayroll = computed(() => ['paid', 'locked'].includes(String(item.value?.payment_status || '').toLowerCase()))

const loadAudit = async () => {
  if (audit.value || auditLoading.value) return
  auditLoading.value = true
  try {
    audit.value = await payrollStore.fetchAudit(props.id)
  } catch (e) {
    toast.error(e.message || 'Failed to load audit trail.')
  } finally {
    auditLoading.value = false
  }
}

const setTab = (tab) => {
  activeTab.value = tab
  if (tab === 'audit') loadAudit()
}

const handlePaymentSubmit = async ({ id, payload }) => {
  try {
    await payrollStore.updatePaymentStatus(id, payload)
    toast.success('Payment status updated.')
    showPaymentModal.value = false
  } catch (e) {
    toast.error(e.message || 'Update failed.')
  }
}

const handleNetPaymentRecalculate = async () => {
  const recalc = netPaymentRecalculation.value
  if (!recalc?.can_update || netPaymentUpdating.value) return
  const confirmed = window.confirm(
    `Update stored net payment from ${formatCurrency(recalc.current_net_salary)} to ${formatCurrency(recalc.recalculated_net_salary)}?`,
  )
  if (!confirmed) return
  netPaymentUpdating.value = true
  try {
    await payrollStore.recalculateNetPayment(props.id)
    toast.success('Net payment updated.')
  } catch (e) {
    toast.error(e.message || 'Failed to update net payment.')
  } finally {
    netPaymentUpdating.value = false
  }
}

const toNum = (value) => {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

const formatKeyLabel = (key) =>
  key.replace(/_/g, ' ').replace(/\b\w/g, (ch) => ch.toUpperCase())

const deductionLabelMap = {
  pf_deduction: 'PF Deduction',
  meal_deduction: 'Meal Deduction',
  tax_deduction: 'Tax Deduction',
  loan_deduction: 'Loan Deduction',
  security_money_deduction: 'Security Money',
  other_deduction: 'Other Deduction',
}

const cycleLabels = {
  regular: 'Regular Monthly',
  half_salary_advance: 'Half Salary Advance',
  half_month: 'Half Salary Advance',
  advance: 'Half Salary Advance',
  final_settlement: 'Final Settlement',
  bonus_only: 'Bonus Only',
}

const normalizedDeductions = computed(() => {
  const rows = Array.isArray(item.value?.deductions) ? item.value.deductions : []
  return rows.map((d, index) => ({
    key: d.id || d.deduction_code || `${d.deduction_name || 'deduction'}-${index}`,
    name: d.deduction_name || d.name || d.title || `Deduction ${index + 1}`,
    amount: toNum(d.amount ?? d.total ?? 0),
    category: d.deduction_type || d.type || d.category || d.deduction_code || 'General',
    source: d.source || d.module || d.reference_type || null,
    reference: d.reference_no || d.reference || d.ref || null,
    reason: d.reason || d.remarks || d.note || d.description || null,
  }))
})

const earningsData = computed(() => (item.value && typeof item.value.earnings === 'object' ? item.value.earnings : {}))
const deductionsData = computed(() => (item.value && typeof item.value.deductions === 'object' ? item.value.deductions : {}))
const appliedAdjustments = computed(() =>
  Array.isArray(item.value?.adjustments_applied) ? item.value.adjustments_applied : []
)

const contraEntries = computed(() => {
  const preferred = item.value?.contra_entries
  if (Array.isArray(preferred)) return preferred
  const raw = item.value?.other_allowance_breakdown
  const rows = Array.isArray(raw) ? raw : []
  return rows.filter((row) => row?.type === 'contra_entry')
})

const pfAllowanceAmount = computed(() => {
  const d = deductionsData.value
  if (d && Object.prototype.hasOwnProperty.call(d, 'pf_allowance')) return toNum(d.pf_allowance)
  const raw = item.value || {}
  return toNum(raw.pf_allowance_deduction_total ?? raw.pf_allowance_total ?? 0)
})

const contraEarningTotal = computed(() =>
  contraEntries.value.filter((row) => row?.side === 'earning').reduce((sum, row) => sum + toNum(row?.amount), 0),
)

const earningContraRows = computed(() =>
  contraEntries.value
    .filter((row) => row?.side === 'earning')
    .map((row, index) => ({
      key: `contra_earning_${row.ref || row.label || index}`,
      label: row.label || 'Manual Adj',
      amount: toNum(row.amount),
    })),
)

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
  String(value || '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())

const labelWithMonth = (base, adj) => {
  const month = refMonthShortLabel(adj) || adj?.ref_month_label
  return month ? `${base} (${month})` : base
}

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
  })),
)

const manualSettledFallbackDeductionRows = computed(() =>
  manualSettledFallback.value.map((adj) => ({
    key: `manual_settled_deduction_${adj.id}`,
    label: labelWithMonth('Adj Recovery', adj),
    amount: Math.abs(toNum(adj.amount)),
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
    })),
)

const deductionFieldRows = computed(() => {
  const d = deductionsData.value || {}
  const pfTotal = toNum(d.provident_fund) + toNum(d.pf_allowance)

  const baseRows = [
    { key: 'pf_deduction', label: 'PF Deduction', amount: pfTotal },
    { key: 'advance_deduction', label: 'Advance Deduction', amount: toNum(d.advance ?? d.advance_deduction ?? item.value?.advance_deduction) },
    { key: 'meal_deduction', label: 'Meal Deduction', amount: toNum(d.meal) },
    { key: 'tax_deduction', label: 'Tax Deduction', amount: toNum(d.tds) },
    { key: 'loan_deduction', label: 'Loan Deduction', amount: toNum(d.loan) },
    { key: 'security_money_deduction', label: 'Security Money', amount: toNum(d.security_money) },
    { key: 'other_deduction', label: 'Other Deduction', amount: toNum(d.other) },
    { key: 'half_salary_advance_adjustment', label: 'Half Salary Advance Adjustment', amount: toNum(d.half_salary_advance_adjustment ?? item.value?.advance_adjusted_amount) },
  ]

  const contraRows = contraEntries.value
    .filter((row) => row?.side === 'deduction')
    .map((row, index) => ({
      key: `contra_deduction_${row.ref || row.label || index}`,
      label: row.label || 'Adj Recovery',
      amount: toNum(row.amount),
    }))

  return [...baseRows, ...contraRows].filter((row) => toNum(row.amount) !== 0)
})

const paymentMethodDisplay = computed(() =>
  item.value?.payment_method || item.value?.user?.default_payment_method || item.value?.user?.payment_method || null
)
const bankNameDisplay = computed(() => item.value?.bank_name || item.value?.user?.bank_name || null)
const companyBankAccountDisplay = computed(() => {
  const account = item.value?.bank_account || item.value?.user?.bank_account
  if (!account) return null
  return [account.bank_name, account.account_number].filter(Boolean).join(' - ')
})
const accountNumberDisplay = computed(() =>
  item.value?.account_number || item.value?.account_no || item.value?.bank_account_no ||
  item.value?.user?.bank_account_no || item.value?.user?.account_number || null
)

const baseEarningRows = computed(() => [
  { key: 'gross', label: 'Gross Salary', amount: toNum(earningsData.value.gross ?? item.value?.gross_salary) },
  { key: 'arrear', label: 'Arrear', amount: toNum(item.value?.arrear) },
])

const grossSalaryBase = computed(() => baseEarningRows.value.reduce((sum, row) => sum + toNum(row.amount), 0))
const manualAdditionAmount = computed(() => toNum(item.value?.manual_addition) - contraEarningTotal.value)
const otherAllowanceTotalEffective = computed(() => Math.max(0, toNum(earningsData.value.others) - manualAdditionAmount.value))
const totalEarnings = computed(() => toNum(earningsData.value.total))

const dynamicAllowances = computed(() => {
  const rows = Array.isArray(item.value?.allowances) ? item.value.allowances : []
  return rows
    .filter((a) => !isPfAllowanceRow(a))
    .map((a, index) => ({
      key: a.allowance_code || a.allowance_name || `allowance-${index}`,
      label: a.allowance_name || `Allowance ${index + 1}`,
      amount: toNum(a.amount),
    }))
})

const totalDeductionAmount = computed(() => toNum(deductionsData.value.total) || toNum(item.value?.total_deduction))
const totalEarningsDisplay = computed(() => totalEarnings.value)
const totalDeductionsDisplay = computed(() => totalDeductionAmount.value)
const netSalaryAmount = computed(() => toNum(item.value?.net_payment ?? item.value?.net_salary))
const netPaymentRecalculation = computed(() => item.value?.net_payment_recalculation || null)
const canRecalculateNetPayment = computed(() => Boolean(netPaymentRecalculation.value?.can_update && netPaymentRecalculation.value?.has_difference))
const payrollCycle = computed(() => item.value?.payroll_cycle || item.value?.settlement_mode || item.value?.payrollBatch?.payroll_cycle || item.value?.payroll_batch?.payroll_cycle || 'regular')
const payrollCycleLabel = computed(() => item.value?.payroll_cycle_label || cycleLabels[payrollCycle.value] || formatKeyLabel(payrollCycle.value))
const isAdvanceCycle = computed(() => ['half_salary_advance', 'half_month', 'advance'].includes(String(payrollCycle.value || '').toLowerCase()))
const isBonusOnlyCycle = computed(() => String(payrollCycle.value || '').toLowerCase() === 'bonus_only')
const grossReferenceAmount = computed(() =>
  toNum(
    item.value?.gross_reference_amount ?? item.value?.monthly_gross_salary ?? item.value?.gross_salary ??
    item.value?.calculation_breakdown?.gross_salary ?? earningsData.value.gross ?? grossSalaryBase.value,
  ),
)
const salaryAdvancePayable = computed(() => toNum(item.value?.base_payable_amount ?? earningsData.value.basic))
const advancePercentage = computed(() => {
  const configured = item.value?.advance_percentage ?? item.value?.salary_percentage
  if (configured !== null && configured !== undefined && configured !== '') return toNum(configured)
  return grossReferenceAmount.value > 0 ? (salaryAdvancePayable.value / grossReferenceAmount.value) * 100 : 0
})
const formatPercent = (value) => {
  const amount = toNum(value)
  if (!amount) return '0%'
  return `${new Intl.NumberFormat('en-US', { minimumFractionDigits: amount % 1 === 0 ? 0 : 2, maximumFractionDigits: 2 }).format(amount)}%`
}
const salaryAdvanceLabel = computed(() =>
  advancePercentage.value > 0 ? `Salary Advance Payable (${formatPercent(advancePercentage.value)} of Gross)` : 'Salary Advance Payable',
)
const advanceAdjustedAmount = computed(() => toNum(item.value?.advance_adjusted_amount ?? item.value?.calculation_breakdown?.advance_adjusted_amount))
const paycutDeductionLabel = computed(() => {
  const paycutAmount = paycutReductionAmount.value
  if (advanceAdjustedAmount.value > 0 && Math.abs(paycutAmount - advanceAdjustedAmount.value) < 1) return 'Half Salary Advance Adjustment'
  return 'Attendance Paycut'
})
const paycutReductionAmount = computed(() => toNum(earningsData.value.paycut_reduction ?? item.value?.paycut_deduction))

const earningsTableRows = computed(() => {
  if (isAdvanceCycle.value) {
    return [
      ...(grossReferenceAmount.value > 0 ? [{ key: 'gross_reference', label: 'Gross Salary (Reference)', amount: grossReferenceAmount.value }] : []),
      { key: 'salary_advance', label: salaryAdvanceLabel.value, amount: salaryAdvancePayable.value },
      ...(toNum(item.value?.bonus_amount ?? earningsData.value.bonus) > 0
        ? [{ key: 'bonus', label: 'Bonus', amount: toNum(item.value?.bonus_amount ?? earningsData.value.bonus) }] : []),
      ...earningContraRows.value.map((r) => ({ ...r, is_delta: true })),
      ...manualSettledFallbackEarningRows.value.map((r) => ({ ...r, is_delta: true })),
      ...carryForwardEarningRows.value.map((r) => ({ ...r, is_delta: true })),
    ].filter((r) => toNum(r?.amount) !== 0)
  }

  if (isBonusOnlyCycle.value) {
    return [
      { key: 'bonus', label: 'Bonus', amount: toNum(item.value?.bonus_amount ?? earningsData.value.bonus) },
      ...earningContraRows.value.map((r) => ({ ...r, is_delta: true })),
      ...manualSettledFallbackEarningRows.value.map((r) => ({ ...r, is_delta: true })),
      ...carryForwardEarningRows.value.map((r) => ({ ...r, is_delta: true })),
    ].filter((r) => toNum(r?.amount) !== 0)
  }

  return [
    ...baseEarningRows.value,
    { key: 'others', label: 'Other Allowance', amount: otherAllowanceTotalEffective.value },
    ...(toNum(item.value?.bonus_amount ?? earningsData.value.bonus) > 0
      ? [{ key: 'bonus', label: 'Bonus', amount: toNum(item.value?.bonus_amount ?? earningsData.value.bonus) }] : []),
    ...(pfAllowanceAmount.value > 0 ? [{ key: 'pf_allowance_display', label: 'PF Office', amount: pfAllowanceAmount.value }] : []),
    ...(paycutReductionAmount.value > 0
      ? [{ key: 'paycut_reduction', label: paycutDeductionLabel.value, amount: -paycutReductionAmount.value, is_delta: true }] : []),
    ...earningContraRows.value.map((r) => ({ ...r, is_delta: true })),
    ...manualSettledFallbackEarningRows.value.map((r) => ({ ...r, is_delta: true })),
    ...carryForwardEarningRows.value.map((r) => ({ ...r, is_delta: true })),
  ].filter((r) => toNum(r?.amount) !== 0)
})

const deductionTableRows = computed(() =>
  [
    ...deductionFieldRows.value,
    ...manualSettledFallbackDeductionRows.value.map((r) => ({ ...r, is_delta: true })),
    ...carryForwardDeductionRows.value.map((r) => ({ ...r, is_delta: true })),
  ].filter((r) => toNum(r?.amount) !== 0)
)

const formatRowAmount = (row) => {
  if (!row) return ''
  const amount = toNum(row.amount)
  if (row.is_delta) {
    const sign = amount >= 0 ? '+' : '-'
    return `${sign} ${formatCurrency(Math.abs(amount))}`
  }
  return formatCurrency(amount)
}

const employeeInitial = computed(() => item.value?.user?.name?.[0]?.toUpperCase() || '?')
</script>

<template>
  <div class="min-h-screen bg-slate-50">

    <!-- Sticky top nav -->
    <div class="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-slate-200 bg-white/95 px-4 py-2.5 backdrop-blur-sm md:px-6">
      <div class="flex items-center gap-3">
        <button
          class="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 transition"
          @click="router.back()"
        >
          <i class="far fa-arrow-left text-sm"></i>
        </button>
        <div>
          <h1 class="text-sm font-bold text-slate-900">Payroll Details</h1>
          <p v-if="item" class="text-[10px] text-slate-400">{{ item.user?.name }} · {{ item.salary_month }}</p>
        </div>
      </div>
      <div v-if="item" class="flex items-center gap-2">
        <PayrollStatusBadge :status="item.payment_status" />
        <button
          class="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm hover:bg-slate-50 disabled:opacity-50"
          :disabled="isLockedPayroll"
          @click="showPaymentModal = true"
        >
          <i class="far" :class="isLockedPayroll ? 'fa-lock' : 'fa-edit'"></i>
          Update Status
        </button>
      </div>
    </div>

    <div class="p-4 md:p-5 space-y-4 max-w-6xl mx-auto">

      <LoaderView v-if="loading" />

      <div v-else-if="error" class="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        <i class="fas fa-exclamation-circle"></i> {{ error }}
      </div>

      <template v-else-if="item">

        <!-- ── Employee Hero Card ── -->
        <div class="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div class="flex flex-wrap items-start gap-4 p-5">
            <!-- Avatar + info -->
            <div class="flex flex-1 min-w-0 items-start gap-4">
              <div class="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-blue-600 text-xl font-bold text-white shadow-sm">
                {{ employeeInitial }}
              </div>
              <div class="min-w-0">
                <h2 class="text-lg font-bold text-slate-900">{{ item.user?.name || '-' }}</h2>
                <p class="mt-0.5 text-xs text-slate-500">
                  {{ item.user?.employee_id }}
                  <span v-if="item.user?.department?.name"> · {{ item.user.department.name }}</span>
                  <span v-if="item.user?.designation?.name"> · {{ item.user.designation.name }}</span>
                </p>
                <p v-if="item.company?.name" class="text-xs text-slate-400">{{ item.company.name }}</p>
                <div class="mt-2 flex flex-wrap gap-1.5">
                  <span class="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[10px] font-semibold text-slate-600">
                    {{ item.salary_month }}
                  </span>
                  <span class="rounded-full border border-blue-100 bg-blue-50 px-2.5 py-0.5 text-[10px] font-semibold text-blue-700">
                    {{ payrollCycleLabel }}
                  </span>
                  <span v-if="item.salary_type" class="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[10px] text-slate-500">
                    {{ item.salary_type }}
                  </span>
                </div>
              </div>
            </div>
            <!-- Net payable hero number -->
            <div class="flex flex-col items-end gap-1.5">
              <p class="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Net Payable</p>
              <p class="font-mono text-3xl font-bold text-blue-700">{{ formatCurrency(netSalaryAmount) }}</p>
              <PayrollStatusBadge :status="item.payment_status" />
            </div>
          </div>

          <!-- Quick stats bar -->
          <div class="grid grid-cols-3 divide-x divide-slate-100 border-t border-slate-100 bg-slate-50/50">
            <div class="px-4 py-2.5 text-center">
              <p class="text-[10px] uppercase tracking-wide text-slate-400">Total Earnings</p>
              <p class="mt-0.5 font-mono text-sm font-bold text-emerald-700">{{ formatCurrency(totalEarningsDisplay) }}</p>
            </div>
            <div class="px-4 py-2.5 text-center">
              <p class="text-[10px] uppercase tracking-wide text-slate-400">Total Deductions</p>
              <p class="mt-0.5 font-mono text-sm font-bold text-rose-700">{{ formatCurrency(totalDeductionsDisplay) }}</p>
            </div>
            <div class="px-4 py-2.5 text-center">
              <p class="text-[10px] uppercase tracking-wide text-slate-400">Net Payment</p>
              <p class="mt-0.5 font-mono text-sm font-bold text-blue-700">{{ formatCurrency(netSalaryAmount) }}</p>
            </div>
          </div>
        </div>

        <!-- ── Tabs ── -->
        <div class="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
          <button
            class="flex flex-1 items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition"
            :class="activeTab === 'breakdown' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'"
            @click="setTab('breakdown')"
          >
            <i class="far fa-balance-scale"></i> Salary Breakdown
          </button>
          <button
            class="flex flex-1 items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition"
            :class="activeTab === 'audit' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'"
            @click="setTab('audit')"
          >
            <i class="far fa-history"></i> Audit Trail
          </button>
        </div>

        <!-- ── Salary Breakdown Tab ── -->
        <template v-if="activeTab === 'breakdown'">

          <!-- Two-column Earnings / Deductions -->
          <div class="grid gap-4 md:grid-cols-2">

            <!-- Earnings card -->
            <div class="overflow-hidden rounded-xl border border-emerald-200 bg-white shadow-sm">
              <div class="flex items-center justify-between border-b border-emerald-100 bg-emerald-50 px-4 py-2.5">
                <div class="flex items-center gap-2 text-sm font-bold text-emerald-800">
                  <i class="far fa-arrow-circle-up text-emerald-600"></i> Earnings
                </div>
                <span class="font-mono text-sm font-bold text-emerald-700">{{ formatCurrency(totalEarningsDisplay) }}</span>
              </div>
              <div class="divide-y divide-slate-50">
                <div
                  v-for="row in earningsTableRows"
                  :key="row.key"
                  class="flex items-center justify-between px-4 py-2.5"
                >
                  <span class="text-xs text-slate-600">{{ row.label }}</span>
                  <span
                    class="font-mono text-xs font-semibold"
                    :class="row.is_delta && toNum(row.amount) < 0 ? 'text-rose-600' : row.is_delta ? 'text-emerald-600' : 'text-slate-800'"
                  >
                    {{ formatRowAmount(row) }}
                  </span>
                </div>
                <div v-if="!earningsTableRows.length" class="px-4 py-5 text-center text-xs text-slate-300">
                  No earnings data
                </div>
              </div>
              <div class="flex items-center justify-between border-t-2 border-emerald-200 bg-emerald-50/50 px-4 py-2.5">
                <span class="text-xs font-bold uppercase tracking-wide text-emerald-800">Total Earnings</span>
                <span class="font-mono text-sm font-bold text-emerald-700">{{ formatCurrency(totalEarningsDisplay) }}</span>
              </div>
            </div>

            <!-- Deductions card -->
            <div class="overflow-hidden rounded-xl border border-rose-200 bg-white shadow-sm">
              <div class="flex items-center justify-between border-b border-rose-100 bg-rose-50 px-4 py-2.5">
                <div class="flex items-center gap-2 text-sm font-bold text-rose-800">
                  <i class="far fa-arrow-circle-down text-rose-600"></i> Deductions
                </div>
                <span class="font-mono text-sm font-bold text-rose-700">{{ formatCurrency(totalDeductionsDisplay) }}</span>
              </div>
              <div class="divide-y divide-slate-50">
                <div
                  v-for="row in deductionTableRows"
                  :key="row.key"
                  class="flex items-center justify-between px-4 py-2.5"
                >
                  <span class="text-xs text-slate-600">{{ row.label }}</span>
                  <span class="font-mono text-xs font-semibold text-rose-700">{{ formatRowAmount(row) }}</span>
                </div>
                <div v-if="!deductionTableRows.length" class="px-4 py-5 text-center text-xs text-slate-300">
                  No deductions
                </div>
              </div>
              <div class="flex items-center justify-between border-t-2 border-rose-200 bg-rose-50/50 px-4 py-2.5">
                <span class="text-xs font-bold uppercase tracking-wide text-rose-800">Total Deductions</span>
                <span class="font-mono text-sm font-bold text-rose-700">{{ formatCurrency(totalDeductionsDisplay) }}</span>
              </div>
            </div>
          </div>

          <!-- Net Payment Banner -->
          <div class="overflow-hidden rounded-xl border border-blue-200 bg-gradient-to-r from-blue-600 to-blue-700 shadow-sm">
            <div class="flex flex-wrap items-center justify-between gap-4 px-5 py-4">
              <div>
                <p class="text-xs font-bold uppercase tracking-widest text-blue-200">Net Payment</p>
                <p class="mt-0.5 text-[11px] text-blue-300">
                  Earnings ({{ formatCurrency(totalEarningsDisplay) }}) − Deductions ({{ formatCurrency(totalDeductionsDisplay) }})
                </p>
              </div>
              <p class="font-mono text-3xl font-bold text-white">{{ formatCurrency(netSalaryAmount) }}</p>
            </div>
          </div>

          <!-- Recalculation notice -->
          <div
            v-if="netPaymentRecalculation?.has_difference"
            class="grid gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900 md:grid-cols-3"
          >
            <div>
              <span class="block text-[10px] uppercase tracking-wide text-amber-600">Stored Net</span>
              <strong class="font-mono text-sm">{{ formatCurrency(netPaymentRecalculation.current_net_salary) }}</strong>
            </div>
            <div>
              <span class="block text-[10px] uppercase tracking-wide text-amber-600">Corrected Net</span>
              <strong class="font-mono text-sm">{{ formatCurrency(netPaymentRecalculation.recalculated_net_salary) }}</strong>
            </div>
            <div class="flex items-end justify-between gap-2 md:flex-col md:items-start">
              <div>
                <span class="block text-[10px] uppercase tracking-wide text-amber-600">Difference</span>
                <strong class="font-mono text-sm">{{ formatCurrency(netPaymentRecalculation.difference) }}</strong>
              </div>
              <button
                v-if="canRecalculateNetPayment"
                class="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
                :disabled="netPaymentUpdating"
                @click="handleNetPaymentRecalculate"
              >
                <i class="far" :class="netPaymentUpdating ? 'fa-spinner fa-spin' : 'fa-calculator'"></i>
                {{ netPaymentUpdating ? 'Updating…' : 'Apply Correction' }}
              </button>
            </div>
          </div>

          <!-- ── Payment Info ── -->
          <div class="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div class="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <div class="flex items-center gap-2 text-sm font-bold text-slate-800">
                <i class="far fa-credit-card text-blue-500"></i> Payment Info
              </div>
              <button
                class="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm hover:bg-slate-50 disabled:opacity-50"
                :disabled="isLockedPayroll"
                :title="isLockedPayroll ? 'Paid/locked payroll cannot be modified.' : 'Update Payment Status'"
                @click="showPaymentModal = true"
              >
                <i class="far" :class="isLockedPayroll ? 'fa-lock' : 'fa-edit'"></i> Update Status
              </button>
            </div>
            <!-- Info grid -->
            <div class="grid grid-cols-2 gap-px bg-slate-100 md:grid-cols-3">
              <div class="bg-white px-4 py-3">
                <p class="text-[10px] uppercase tracking-wide text-slate-400 mb-1">Status</p>
                <PayrollStatusBadge :status="item.payment_status" />
              </div>
              <div class="bg-white px-4 py-3">
                <p class="text-[10px] uppercase tracking-wide text-slate-400 mb-1">Payment Method</p>
                <p class="text-sm font-medium capitalize text-slate-700">{{ paymentMethodDisplay || '—' }}</p>
              </div>
              <div class="bg-white px-4 py-3">
                <p class="text-[10px] uppercase tracking-wide text-slate-400 mb-1">Bank Name</p>
                <p class="text-sm font-medium text-slate-700">{{ bankNameDisplay || '—' }}</p>
              </div>
              <div class="bg-white px-4 py-3">
                <p class="text-[10px] uppercase tracking-wide text-slate-400 mb-1">Company Bank A/C</p>
                <p class="text-xs font-medium text-slate-700">{{ companyBankAccountDisplay || '—' }}</p>
              </div>
              <div class="bg-white px-4 py-3">
                <p class="text-[10px] uppercase tracking-wide text-slate-400 mb-1">Account No.</p>
                <p class="font-mono text-sm font-medium text-slate-700">{{ accountNumberDisplay || '—' }}</p>
              </div>
              <div class="bg-white px-4 py-3">
                <p class="text-[10px] uppercase tracking-wide text-slate-400 mb-1">Payroll Batch</p>
                <button
                  v-if="item.payroll_batch_id"
                  class="text-xs font-medium text-blue-600 underline hover:text-blue-800"
                  @click="router.push({ name: 'PayrollBatchShow', params: { id: item.payroll_batch_id } })"
                >
                  Batch #{{ item.payroll_batch_id }}
                </button>
                <span v-else class="text-sm text-slate-400">—</span>
              </div>
            </div>
          </div>

        </template>

        <!-- ── Audit Trail Tab ── -->
        <PayrollAuditTrail v-if="activeTab === 'audit'" :audit="audit" :loading="auditLoading" />

        <!-- Bottom action -->
        <div class="flex gap-3 pb-4">
          <button
            class="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm hover:bg-slate-50"
            @click="router.push({ name: 'PayrollList' })"
          >
            <i class="far fa-list"></i> All Payrolls
          </button>
        </div>

      </template>

      <div v-else class="rounded-xl bg-slate-100 p-12 text-center text-sm text-slate-400">
        Payroll not found.
      </div>
    </div>

    <PaymentStatusModal
      :show="showPaymentModal"
      :payroll-id="item?.id"
      :current-status="item?.payment_status"
      @close="showPaymentModal = false"
      @submit="handlePaymentSubmit"
    />

  </div>
</template>
