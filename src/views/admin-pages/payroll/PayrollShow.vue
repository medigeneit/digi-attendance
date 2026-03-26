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
      label: formatKeyLabel(key),
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
</script>

<template>
  <div class="p-4 md:p-6 space-y-5">
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
      <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 class="text-xl font-bold text-blue-900">{{ item.user?.name || '—' }}</h2>
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
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <!-- Earnings -->
        <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h3 class="font-bold text-blue-800 mb-3 flex items-center gap-2">
            <i class="far fa-plus-circle text-emerald-500"></i> Earnings
          </h3>
          <div class="space-y-2 text-sm">
            <div class="flex justify-between py-1.5 border-b border-dashed">
              <span class="text-gray-600">Basic Salary</span>
              <span class="font-mono font-medium">{{ formatCurrency(item.basic_salary) }}</span>
            </div>
            <div class="flex justify-between py-1.5 border-b border-dashed">
              <span class="text-gray-600">House Rent</span>
              <span class="font-mono font-medium">{{ formatCurrency(item.house_rent) }}</span>
            </div>
            <div class="flex justify-between py-1.5 border-b border-dashed">
              <span class="text-gray-600">Medical Allowance</span>
              <span class="font-mono font-medium">{{ formatCurrency(item.medical_allowance) }}</span>
            </div>
            <div class="flex justify-between py-1.5 border-b border-dashed">
              <span class="text-gray-600">Conveyance</span>
              <span class="font-mono font-medium">{{ formatCurrency(item.conveyance_allowance) }}</span>
            </div>

            <!-- Dynamic Allowances -->
            <template v-if="item.allowances?.length">
              <div v-for="a in item.allowances" :key="a.allowance_code || a.allowance_name"
                class="flex justify-between py-1.5 border-b border-dashed">
                <span class="text-gray-600">{{ a.allowance_name }}</span>
                <span class="font-mono font-medium">{{ formatCurrency(a.amount) }}</span>
              </div>
            </template>

            <div v-if="item.other_allowance_total"
              class="flex justify-between py-1.5 border-b border-dashed">
              <span class="text-gray-600">Other Allowance Total</span>
              <span class="font-mono font-medium">{{ formatCurrency(item.other_allowance_total) }}</span>
            </div>

            <div v-if="item.manual_addition" class="flex justify-between py-1.5 border-b border-dashed">
              <span class="text-gray-600">Manual Addition</span>
              <span class="font-mono font-medium text-emerald-600">+ {{ formatCurrency(item.manual_addition) }}</span>
            </div>

            <div class="flex justify-between py-2 bg-emerald-50 rounded-lg px-2 font-bold mt-1">
              <span class="text-emerald-800">Gross Salary</span>
              <span class="font-mono text-emerald-800">{{ formatCurrency(item.gross_salary) }}</span>
            </div>
          </div>
        </div>

        <!-- Deductions -->
        <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h3 class="font-bold text-blue-800 mb-3 flex items-center gap-2">
            <i class="far fa-minus-circle text-red-400"></i> Deductions
          </h3>
          <div class="space-y-2 text-sm">
            <template v-if="normalizedDeductions.length">
              <div
                v-for="d in normalizedDeductions"
                :key="d.key"
                class="rounded-xl border border-red-100 bg-red-50/50 px-3 py-2"
              >
                <div class="flex items-start justify-between gap-3">
                  <div class="min-w-0">
                    <div class="font-medium text-red-900 break-words">{{ d.name }}</div>
                    <div class="mt-1 flex flex-wrap gap-1 text-[11px]">
                      <span class="px-1.5 py-0.5 rounded-full bg-white border border-red-200 text-red-700">
                        {{ d.category }}
                      </span>
                      <span
                        v-if="d.source"
                        class="px-1.5 py-0.5 rounded-full bg-white border border-slate-200 text-slate-600"
                      >
                        Source: {{ d.source }}
                      </span>
                      <span
                        v-if="d.reference"
                        class="px-1.5 py-0.5 rounded-full bg-white border border-slate-200 text-slate-600"
                      >
                        Ref: {{ d.reference }}
                      </span>
                    </div>
                    <div v-if="d.reason" class="text-xs text-slate-600 mt-1 break-words">
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
                class="flex justify-between py-1.5 border-b border-dashed"
              >
                <span class="text-gray-600">{{ row.label }}</span>
                <span class="font-mono font-medium text-red-600">{{ formatCurrency(row.amount) }}</span>
              </div>
            </template>

            <div
              v-if="!normalizedDeductions.length && !deductionFieldRows.length"
              class="text-gray-400 text-sm py-3 text-center"
            >
              No deductions
            </div>

            <div class="flex justify-between py-2 bg-red-50 rounded-lg px-2 font-bold mt-1">
              <span class="text-red-700">Total Deductions</span>
              <span class="font-mono text-red-700">{{ formatCurrency(item.total_deduction) }}</span>
            </div>

            <div class="flex justify-between py-2 bg-blue-50 rounded-lg px-2 font-bold mt-1">
              <span class="text-blue-800 text-base">Net Salary</span>
              <span class="font-mono text-blue-800 text-base">{{ formatCurrency(item.net_salary) }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Payment Info -->
      <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <div class="flex items-center justify-between mb-3">
          <h3 class="font-bold text-blue-800 flex items-center gap-2">
            <i class="far fa-credit-card text-blue-500"></i> Payment Info
          </h3>
          <button class="btn-3 text-xs" @click="showPaymentModal = true">
            <i class="far fa-edit"></i> Update Status
          </button>
        </div>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span class="text-gray-500 block mb-0.5">Status</span>
            <PayrollStatusBadge :status="item.payment_status" />
          </div>
          <div>
            <span class="text-gray-500 block mb-0.5">Payment Method</span>
            <span class="font-medium capitalize">{{ paymentMethodDisplay || '—' }}</span>
          </div>
          <div>
            <span class="text-gray-500 block mb-0.5">Bank Name</span>
            <span class="font-medium">{{ bankNameDisplay || '—' }}</span>
          </div>
          <div>
            <span class="text-gray-500 block mb-0.5">Account No.</span>
            <span class="font-medium font-mono">{{ accountNumberDisplay || '—' }}</span>
          </div>
          <!-- <div class="col-span-2">
            <span class="text-gray-500 block mb-0.5">Payment Remarks</span>
            <span class="font-medium">{{ item.payment_remarks || '—' }}</span>
          </div> -->
          <div>
            <span class="text-gray-500 block mb-0.5">Payroll Batch</span>
            <button v-if="item.payroll_batch_id"
              @click="router.push({ name: 'PayrollBatchShow', params: { id: item.payroll_batch_id } })"
              class="text-blue-600 hover:text-blue-800 underline text-xs">
              Batch #{{ item.payroll_batch_id }}
            </button>
            <span v-else class="text-gray-400">—</span>
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
