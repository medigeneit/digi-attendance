<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'
import { storeToRefs } from 'pinia'
import { usePayrollManagementStore } from '@/stores/payrollManagement'
import LoaderView from '@/components/common/LoaderView.vue'
import PayrollStatusBadge from '@/components/payroll/PayrollStatusBadge.vue'
import PaymentStatusModal from '@/components/payroll/PaymentStatusModal.vue'
import { formatCurrency } from '@/utils/currency'

const props = defineProps({ id: { type: [String, Number], required: true } })
const router = useRouter()
const toast = useToast()
const payrollStore = usePayrollManagementStore()
const { item, loading, error } = storeToRefs(payrollStore)

const showPaymentModal = ref(false)

onMounted(() => payrollStore.fetchItem(props.id))

const handlePaymentSubmit = async ({ id, payload }) => {
  try {
    await payrollStore.updatePaymentStatus(id, payload)
    toast.success('Payment status updated.')
    showPaymentModal.value = false
  } catch (e) {
    toast.error(e.message || 'Update failed.')
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
  other_deduction: 'Other Deduction',
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

const deductionFieldRows = computed(() => {
  const raw = item.value || {}
  return Object.entries(raw)
    .filter(([key, value]) => {
      const amount = toNum(value)
      if (!amount) return false
      if (key === 'total_deduction') return false
      if (key === 'deductions') return false
      return key.includes('deduction')
    })
    .map(([key, value]) => ({
      key,
      label: deductionLabelMap[key] || formatKeyLabel(key),
      amount: toNum(value),
    }))
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

const grossSalaryBase = computed(() => toNum(item.value?.gross_salary))
const otherAllowanceTotal = computed(() => toNum(item.value?.other_allowance_total))
const manualAdditionAmount = computed(() => toNum(item.value?.manual_addition))
const totalEarnings = computed(
  () => grossSalaryBase.value + otherAllowanceTotal.value + manualAdditionAmount.value
)
const baseEarningRows = computed(() => [
  { key: 'basic_salary', label: 'Basic Salary', amount: toNum(item.value?.basic_salary) },
  { key: 'house_rent', label: 'House Rent', amount: toNum(item.value?.house_rent) },
  { key: 'medical_allowance', label: 'Medical Allowance', amount: toNum(item.value?.medical_allowance) },
  { key: 'conveyance_allowance', label: 'Conveyance', amount: toNum(item.value?.conveyance_allowance) },
])

const dynamicAllowances = computed(() => {
  const rows = Array.isArray(item.value?.allowances) ? item.value.allowances : []
  return rows.map((a, index) => ({
    key: a.allowance_code || a.allowance_name || `allowance-${index}`,
    label: a.allowance_name || `Allowance ${index + 1}`,
    amount: toNum(a.amount),
  }))
})

const totalDeductionAmount = computed(() => toNum(item.value?.total_deduction))
const netSalaryAmount = computed(() => toNum(item.value?.net_salary))
const deductionItemCount = computed(
  () => normalizedDeductions.value.length + deductionFieldRows.value.length
)
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
      <div class="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <!-- Earnings -->
        <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <div class="flex items-center justify-between gap-2 mb-3">
            <h3 class="font-bold text-blue-800 flex items-center gap-2">
              <i class="far fa-plus-circle text-emerald-500"></i> Earnings
            </h3>
            <span class="text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-full px-2 py-0.5">
              Base + Other + Manual
            </span>
          </div>

          <div class="grid grid-cols-3 gap-2 mb-3">
            <div class="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5">
              <div class="text-[10px] uppercase tracking-wide text-slate-500">Base</div>
              <div class="font-mono font-semibold text-slate-800 text-sm">{{ formatCurrency(grossSalaryBase) }}</div>
            </div>
            <div class="rounded-lg border border-amber-200 bg-amber-50 px-2 py-1.5">
              <div class="text-[10px] uppercase tracking-wide text-amber-700">Other</div>
              <div class="font-mono font-semibold text-amber-700 text-sm">{{ formatCurrency(otherAllowanceTotal) }}</div>
            </div>
            <div class="rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1.5">
              <div class="text-[10px] uppercase tracking-wide text-emerald-700">Manual</div>
              <div class="font-mono font-semibold text-emerald-700 text-sm">{{ formatCurrency(manualAdditionAmount) }}</div>
            </div>
          </div>

          <div class="space-y-1 text-sm">
            <div
              v-for="row in baseEarningRows"
              :key="row.key"
              class="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-slate-50"
            >
              <span class="text-gray-600">{{ row.label }}</span>
              <span class="font-mono font-medium text-slate-800">{{ formatCurrency(row.amount) }}</span>
            </div>

            <div
              v-for="row in dynamicAllowances"
              :key="row.key"
              class="flex items-center justify-between py-1.5 px-2 rounded-lg bg-blue-50/40"
            >
              <span class="text-gray-700">{{ row.label }}</span>
              <span class="font-mono font-medium text-blue-700">{{ formatCurrency(row.amount) }}</span>
            </div>

            <div class="h-px bg-slate-200 my-1"></div>

            <div class="flex items-center justify-between py-1.5 px-2 rounded-lg bg-slate-50 font-semibold">
              <span class="text-slate-700">Gross Salary (Base)</span>
              <span class="font-mono text-slate-800">{{ formatCurrency(grossSalaryBase) }}</span>
            </div>
            <div class="flex items-center justify-between py-1.5 px-2 rounded-lg border border-dashed border-amber-200">
              <span class="text-amber-800">Other Allowance Total</span>
              <span class="font-mono font-semibold text-amber-700">+ {{ formatCurrency(otherAllowanceTotal) }}</span>
            </div>
            <div class="flex items-center justify-between py-1.5 px-2 rounded-lg border border-dashed border-emerald-200">
              <span class="text-emerald-800">Manual Addition (Overtime + Add-on)</span>
              <span class="font-mono font-semibold text-emerald-700">+ {{ formatCurrency(manualAdditionAmount) }}</span>
            </div>
            <div class="flex items-center justify-between py-2 px-2 rounded-lg bg-emerald-50 border border-emerald-200 font-bold">
              <span class="text-emerald-800">Total Earnings</span>
              <span class="font-mono text-emerald-800">{{ formatCurrency(totalEarnings) }}</span>
            </div>
          </div>
        </div>

        <!-- Deductions -->
        <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <div class="flex items-center justify-between mb-3">
            <h3 class="font-bold text-blue-800 flex items-center gap-2">
              <i class="far fa-minus-circle text-red-400"></i> Deductions
            </h3>
            <span class="text-[11px] text-red-700 bg-red-50 border border-red-100 rounded-full px-2 py-0.5">
              {{ deductionItemCount }} item(s)
            </span>
          </div>
          <div class="space-y-1.5 text-sm">
            <template v-if="normalizedDeductions.length">
              <div
                v-for="d in normalizedDeductions"
                :key="d.key"
                class="rounded-lg border border-red-100 bg-red-50/60 px-2.5 py-2"
              >
                <div class="flex items-start justify-between gap-3">
                  <div class="min-w-0">
                    <div class="font-medium text-red-900 truncate">{{ d.name }}</div>
                    <div class="mt-1 text-[11px] text-red-700/80 truncate">
                      {{ d.category }}<span v-if="d.source"> | {{ d.source }}</span><span v-if="d.reference"> | {{ d.reference }}</span>
                    </div>
                    <div v-if="d.reason" class="text-[11px] text-slate-600 mt-1 break-words">
                      <span class="font-medium">Reason:</span> {{ d.reason }}
                    </div>
                  </div>
                  <div class="font-mono font-semibold text-red-700 whitespace-nowrap">
                    - {{ formatCurrency(d.amount) }}
                  </div>
                </div>
              </div>
            </template>

            <template v-if="deductionFieldRows.length">
              <div
                v-for="row in deductionFieldRows"
                :key="row.key"
                class="flex items-center justify-between py-1.5 px-2 rounded-lg bg-slate-50"
              >
                <span class="text-gray-600" :class="{ 'font-semibold text-rose-700': row.key === 'paycut_deduction' }">
                  {{ row.label }}
                </span>
                <span class="font-mono font-medium text-red-600" :class="{ 'font-bold': row.key === 'paycut_deduction' }">
                  {{ formatCurrency(row.amount) }}
                </span>
              </div>
            </template>

            <div
              v-if="!normalizedDeductions.length && !deductionFieldRows.length"
              class="text-gray-400 text-sm py-3 text-center"
            >
              No deductions
            </div>

            <div class="mt-2 grid grid-cols-2 gap-2">
              <div class="rounded-lg bg-red-50 border border-red-200 px-2 py-1.5">
                <div class="text-[11px] uppercase tracking-wide text-red-600">Total Deductions</div>
                <div class="font-mono font-bold text-red-700">{{ formatCurrency(totalDeductionAmount) }}</div>
              </div>
              <div class="rounded-lg bg-blue-50 border border-blue-200 px-2 py-1.5">
                <div class="text-[11px] uppercase tracking-wide text-blue-700">Net Salary</div>
                <div class="font-mono font-bold text-blue-800">{{ formatCurrency(netSalaryAmount) }}</div>
              </div>
            </div>
          </div>
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
