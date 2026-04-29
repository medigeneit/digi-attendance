<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'
import { storeToRefs } from 'pinia'
import { usePayrollManagementStore } from '@/stores/payrollManagement'
import LoaderView from '@/components/common/LoaderView.vue'
import PayrollStatusBadge from '@/components/payroll/PayrollStatusBadge.vue'
import PaymentStatusModal from '@/components/payroll/PaymentStatusModal.vue'
import { formatCurrency } from '@/utils/currency'
import { isPfAllowanceRow } from '@/utils/salaryPolicy'

const props = defineProps({ id: { type: [String, Number], required: true } })
const router = useRouter()
const toast = useToast()
const payrollStore = usePayrollManagementStore()
const { item, loading, error } = storeToRefs(payrollStore)

const showPaymentModal = ref(false)
const advanceDeduction = ref(0)
const advanceSaving = ref(false)

onMounted(() => payrollStore.fetchItem(props.id))

watch(
  item,
  (value) => {
    advanceDeduction.value = Number(value?.deductions?.advance ?? value?.advance_deduction ?? 0)
  },
  { immediate: true }
)

const handlePaymentSubmit = async ({ id, payload }) => {
  try {
    await payrollStore.updatePaymentStatus(id, payload)
    toast.success('Payment status updated.')
    showPaymentModal.value = false
  } catch (e) {
    toast.error(e.message || 'Update failed.')
  }
}

const saveAdvanceDeduction = async () => {
  try {
    advanceSaving.value = true
    await payrollStore.updateAdvanceDeduction(props.id, {
      advance_deduction: toNum(advanceDeduction.value),
    })
    toast.success('Advance deduction updated.')
  } catch (e) {
    toast.error(e.message || 'Advance update failed.')
  } finally {
    advanceSaving.value = false
  }
}

const toNum = (value) => {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

const formatKeyLabel = (key) =>
  key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (ch) => ch.toUpperCase())

const deductionLabelMap = {
  pf_deduction: 'PF Deduction',
  meal_deduction: 'Meal Deduction',
  tax_deduction: 'Tax Deduction',
  loan_deduction: 'Loan Deduction',
  security_money_deduction: 'Security Money',
  other_deduction: 'Other Deduction',
  advance_deduction: 'Advance Deduction',
  paycut_deduction: 'Paycut Deduction',
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
  contraEntries.value
    .filter((row) => row?.side === 'earning')
    .reduce((sum, row) => sum + toNum(row?.amount), 0),
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
  String(value || '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())

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

// Totals are now adjusted on API via CashSlipResource (earnings.total, deductions.total).

const deductionFieldRows = computed(() => {
  const d = deductionsData.value || {}
  const pfTotal = toNum(d.provident_fund) + toNum(d.pf_allowance)

  const baseRows = [
    {
      key: 'pf_deduction',
      label: deductionLabelMap.pf_deduction || 'PF Deduction',
      amount: pfTotal,
    },
    {
      key: 'meal_deduction',
      label: deductionLabelMap.meal_deduction || 'Meal Deduction',
      amount: toNum(d.meal),
    },
    { key: 'tax_deduction', label: deductionLabelMap.tax_deduction || 'Tax Deduction', amount: toNum(d.tds) },
    { key: 'loan_deduction', label: deductionLabelMap.loan_deduction || 'Loan Deduction', amount: toNum(d.loan) },
    {
      key: 'security_money_deduction',
      label: deductionLabelMap.security_money_deduction || 'Security Money',
      amount: toNum(d.security_money),
    },
    {
      key: 'other_deduction',
      label: deductionLabelMap.other_deduction || 'Other Deduction',
      amount: toNum(d.other),
    },
    { key: 'advance_deduction', label: deductionLabelMap.advance_deduction || 'Advance Deduction', amount: toNum(d.advance) },
    { key: 'paycut_deduction', label: deductionLabelMap.paycut_deduction || 'Paycut Deduction', amount: toNum(d.paycut) },
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

const paymentMethodDisplay = computed(() => {
  return (
    item.value?.payment_method ||
    item.value?.user?.default_payment_method ||
    item.value?.user?.payment_method ||
    null
  )
})

const bankNameDisplay = computed(() => {
  return item.value?.bank_name || item.value?.user?.bank_name || null
})

const companyBankAccountDisplay = computed(() => {
  const account = item.value?.bank_account || item.value?.user?.bank_account
  if (!account) return null
  return [account.bank_name, account.account_number].filter(Boolean).join(' - ')
})

const accountNumberDisplay = computed(() => {
  return (
    item.value?.account_number ||
    item.value?.account_no ||
    item.value?.bank_account_no ||
    item.value?.user?.bank_account_no ||
    item.value?.user?.account_number ||
    null
  )
})

const baseEarningRows = computed(() => [
  { key: 'basic', label: 'Basic Salary', amount: toNum(earningsData.value.basic) },
  { key: 'house_rent', label: 'House Rent', amount: toNum(earningsData.value.house_rent) },
  { key: 'medical', label: 'Medical', amount: toNum(earningsData.value.medical) },
  { key: 'conveyance', label: 'Conveyance', amount: toNum(earningsData.value.conveyance) },
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
const deductionItemCount = computed(
  () =>
    normalizedDeductions.value.length +
    deductionFieldRows.value.length +
    manualSettledFallbackDeductionRows.value.length +
    carryForwardDeductionRows.value.length
)

const earningsTableRows = computed(() => {
  const rows = [
    ...baseEarningRows.value,
    { key: 'others', label: 'Other Allowance', amount: otherAllowanceTotalEffective.value },
    ...(pfAllowanceAmount.value > 0
      ? [{ key: 'pf_allowance_display', label: 'PF Allowance', amount: pfAllowanceAmount.value }]
      : []),
    ...earningContraRows.value.map((r) => ({ ...r, is_delta: true })),
    ...manualSettledFallbackEarningRows.value.map((r) => ({ ...r, is_delta: true })),
    ...carryForwardEarningRows.value.map((r) => ({ ...r, is_delta: true })),
  ]

  return rows.filter((r) => toNum(r?.amount) !== 0)
})

const deductionTableRows = computed(() => {
  const rows = [
    ...deductionFieldRows.value,
    ...manualSettledFallbackDeductionRows.value.map((r) => ({ ...r, is_delta: true })),
    ...carryForwardDeductionRows.value.map((r) => ({ ...r, is_delta: true })),
  ]

  return rows.filter((r) => toNum(r?.amount) !== 0)
})

const salaryTableRowCount = computed(() =>
  Math.max(earningsTableRows.value.length, deductionTableRows.value.length),
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
</script>

<template>
  <div class="p-4 md:p-5 space-y-4">
    <div class="flex items-center gap-3">
      <button @click="router.back()" class="btn-3"><i class="far fa-arrow-left"></i></button>
      <h1 class="title-md md:title-lg">Payroll Details</h1>
    </div>

    <LoaderView v-if="loading" />

    <div v-else-if="error"
      class="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm flex items-center gap-2">
      <i class="fas fa-exclamation-circle"></i> {{ error }}
    </div>

    <template v-else-if="item">
      <!-- Employee + Status Header -->
      <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 class="text-xl font-bold text-blue-900">{{ item.user?.name || '-' }}</h2>
            <p class="text-sm text-gray-500 mt-0.5">
              {{ item.user?.employee_id }}
              <span v-if="item.user?.department?.name"> &middot; {{ item.user.department.name }}</span>
              <span v-if="item.user?.designation?.name"> &middot; {{ item.user.designation.name }}</span>
            </p>
            <p class="text-sm text-gray-500 mt-0.5">{{ item.company?.name }}</p>
          </div>
          <div class="flex flex-col items-end gap-2">
            <PayrollStatusBadge :status="item.payment_status" />
            <div class="text-xs text-gray-400">{{ item.salary_month }} &middot; {{ item.salary_type }}</div>
          </div>
        </div>
      </div>

      <!-- Salary Breakdown -->
      <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
          <h3 class="font-bold text-blue-800 flex items-center gap-2">
            <i class="far fa-balance-scale text-slate-600"></i> Salary Breakdown
          </h3>
          <div class="flex flex-wrap gap-2 text-[11px]">
            <span class="text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-full px-2 py-0.5">Earnings</span>
            <span class="text-red-700 bg-red-50 border border-red-100 rounded-full px-2 py-0.5">Deductions</span>
          </div>
        </div>

        <div class="overflow-hidden rounded-lg border border-slate-200">
          <table class="w-full border-collapse text-[13px]">
            <thead class="bg-slate-100 text-slate-800">
              <tr>
                <th class="border border-slate-200 px-3 py-2 text-left font-semibold">Earnings</th>
                <th class="border border-slate-200 px-3 py-2 text-right font-semibold">Amount</th>
                <th class="border border-slate-200 px-3 py-2 text-left font-semibold">Deductions</th>
                <th class="border border-slate-200 px-3 py-2 text-right font-semibold">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="i in salaryTableRowCount" :key="i" class="bg-white">
                <td class="border border-slate-200 px-3 py-2">
                  {{ earningsTableRows[i - 1]?.label || '' }}
                </td>
                <td class="border border-slate-200 px-3 py-2 text-right font-mono font-semibold">
                  {{ formatRowAmount(earningsTableRows[i - 1]) }}
                </td>
                <td class="border border-slate-200 px-3 py-2">
                  {{ deductionTableRows[i - 1]?.label || '' }}
                </td>
                <td class="border border-slate-200 px-3 py-2 text-right font-mono font-semibold">
                  {{ formatRowAmount(deductionTableRows[i - 1]) }}
                </td>
              </tr>
              <tr class="bg-slate-50 font-bold">
                <td class="border border-slate-200 px-3 py-2 text-right">Total Earnings</td>
                <td class="border border-slate-200 px-3 py-2 text-right font-mono text-emerald-700">
                  {{ formatCurrency(totalEarningsDisplay) }}
                </td>
                <td class="border border-slate-200 px-3 py-2 text-right">Total Deductions</td>
                <td class="border border-slate-200 px-3 py-2 text-right font-mono text-red-700">
                  {{ formatCurrency(totalDeductionsDisplay) }}
                </td>
              </tr>
              <tr class="bg-white font-bold">
                <td class="border border-slate-200 px-3 py-2 text-right" colspan="3">Net Salary</td>
                <td class="border border-slate-200 px-3 py-2 text-right font-mono text-blue-800">
                  {{ formatCurrency(netSalaryAmount) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div class="flex flex-wrap items-end gap-3">
          <div class="min-w-[220px] flex-1">
            <label class="mb-1 block text-sm font-medium text-slate-700">Advance Deduction</label>
            <input
              v-model="advanceDeduction"
              type="number"
              min="0"
              step="0.01"
              class="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 shadow-sm transition focus:border-blue-400 focus:outline-none focus:ring-4 focus:ring-blue-100"
              placeholder="0.00"
            />
          </div>
          <button
            type="button"
            class="btn-2 inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold shadow-sm disabled:opacity-50"
            :disabled="advanceSaving || loading"
            @click="saveAdvanceDeduction"
          >
            <i class="far fa-save"></i>
            {{ advanceSaving ? 'Saving...' : 'Save Advance' }}
          </button>
        </div>
      </div>

      <!-- Payment Info -->
      <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <div class="flex items-center justify-between mb-3">
          <h3 class="font-bold text-blue-800 flex items-center gap-2">
            <i class="far fa-credit-card text-blue-500"></i> Payment Info
          </h3>
          <button class="btn-3 text-xs" @click="showPaymentModal = true">
            <i class="far fa-edit"></i> Update Status
          </button>
        </div>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
          <div class="rounded-lg bg-slate-50 border border-slate-200 p-2">
            <span class="text-gray-500 block mb-0.5">Status</span>
            <PayrollStatusBadge :status="item.payment_status" />
          </div>
          <div class="rounded-lg bg-slate-50 border border-slate-200 p-2">
            <span class="text-gray-500 block mb-0.5">Payment Method</span>
            <span class="font-medium capitalize">{{ paymentMethodDisplay || '-' }}</span>
          </div>
          <div class="rounded-lg bg-slate-50 border border-slate-200 p-2">
            <span class="text-gray-500 block mb-0.5">Bank Name</span>
            <span class="font-medium">{{ bankNameDisplay || '-' }}</span>
          </div>
          <div class="rounded-lg bg-slate-50 border border-slate-200 p-2">
            <span class="text-gray-500 block mb-0.5">Company Bank A/C</span>
            <span class="font-medium">{{ companyBankAccountDisplay || '-' }}</span>
          </div>
          <div class="rounded-lg bg-slate-50 border border-slate-200 p-2">
            <span class="text-gray-500 block mb-0.5">Account No.</span>
            <span class="font-medium font-mono">{{ accountNumberDisplay || '-' }}</span>
          </div>
          <!-- <div class="col-span-2">
            <span class="text-gray-500 block mb-0.5">Payment Remarks</span>
            <span class="font-medium">{{ item.payment_remarks || '-' }}</span>
          </div> -->
          <div class="rounded-lg bg-slate-50 border border-slate-200 p-2">
            <span class="text-gray-500 block mb-0.5">Payroll Batch</span>
            <button v-if="item.payroll_batch_id"
              @click="router.push({ name: 'PayrollBatchShow', params: { id: item.payroll_batch_id } })"
              class="text-blue-600 hover:text-blue-800 underline text-xs">
              Batch #{{ item.payroll_batch_id }}
            </button>
            <span v-else class="text-gray-400">-</span>
          </div>
        </div>
      </div>

      <!-- Actions -->
      <div class="flex gap-3">
        <button class="btn-3" @click="router.push({ name: 'PayrollList' })">
          <i class="far fa-list"></i> All Payrolls
        </button>
      </div>
    </template>

    <div v-else class="bg-gray-50 rounded-xl p-12 text-center text-gray-400">
      <p>Payroll not found.</p>
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
