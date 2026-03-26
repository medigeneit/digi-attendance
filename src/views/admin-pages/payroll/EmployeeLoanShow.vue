<script setup>
import { onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'
import { storeToRefs } from 'pinia'
import { useEmployeeLoanStore } from '@/stores/employeeLoan'
import LoaderView from '@/components/common/LoaderView.vue'
import LoanInstallmentPreview from '@/components/payroll/LoanInstallmentPreview.vue'
import { formatCurrency, toNum } from '@/utils/currency'

const props = defineProps({ id: { type: [String, Number], required: true } })
const router = useRouter()
const toast = useToast()
const loanStore = useEmployeeLoanStore()
const { item, loading, error } = storeToRefs(loanStore)

onMounted(() => loanStore.fetchItem(props.id))

const paidInstallments = computed(() => {
  if (!item.value) return 0
  if (Array.isArray(item.value.installments)) {
    return item.value.installments.filter(
      (i) => (i.status || '').toLowerCase() === 'paid',
    ).length
  }
  return 0
})

const remainingBalance = computed(() => {
  if (!item.value) return 0
  const paid = paidInstallments.value * toNum(item.value.installment_amount)
  return Math.max(0, toNum(item.value.loan_amount) - paid)
})

const statusClass = (status) => {
  const s = (status || '').toLowerCase()
  if (s === 'active') return 'bg-emerald-100 text-emerald-700'
  if (s === 'closed') return 'bg-gray-100 text-gray-500'
  if (s === 'pending') return 'bg-amber-100 text-amber-700'
  return 'bg-slate-100 text-slate-600'
}
</script>

<template>
  <div class="p-4 md:p-6 space-y-5">
    <!-- Back + Header -->
    <div class="flex items-center gap-3">
      <button @click="router.back()" class="btn-3">
        <i class="far fa-arrow-left"></i>
      </button>
      <h1 class="title-md md:title-lg">Loan Details</h1>
    </div>

    <LoaderView v-if="loading" />

    <div v-else-if="error" class="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm flex items-center gap-2">
      <i class="fas fa-exclamation-circle"></i> {{ error }}
    </div>

    <template v-else-if="item">
      <!-- Info Card -->
      <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <div class="flex flex-wrap items-start justify-between gap-4 mb-5">
          <div>
            <h2 class="text-xl font-bold text-blue-900">{{ item.loan_title }}</h2>
            <p class="text-sm text-gray-500 mt-0.5">
              {{ item.user?.name }} &middot; {{ item.user?.employee_id }}
            </p>
          </div>
          <span class="px-3 py-1 rounded-full text-sm font-semibold" :class="statusClass(item.status)">
            {{ item.status }}
          </span>
        </div>

        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div class="bg-blue-50 rounded-xl p-4 text-center">
            <div class="text-xs text-blue-600 font-medium mb-1">Loan Amount</div>
            <div class="text-lg font-bold text-blue-900 font-mono">{{ formatCurrency(item.loan_amount) }}</div>
          </div>
          <div class="bg-emerald-50 rounded-xl p-4 text-center">
            <div class="text-xs text-emerald-600 font-medium mb-1">Installment</div>
            <div class="text-lg font-bold text-emerald-800 font-mono">{{ formatCurrency(item.installment_amount) }}</div>
          </div>
          <div class="bg-amber-50 rounded-xl p-4 text-center">
            <div class="text-xs text-amber-600 font-medium mb-1">Remaining Balance</div>
            <div class="text-lg font-bold text-amber-800 font-mono">{{ formatCurrency(remainingBalance) }}</div>
          </div>
          <div class="bg-indigo-50 rounded-xl p-4 text-center">
            <div class="text-xs text-indigo-600 font-medium mb-1">Progress</div>
            <div class="text-lg font-bold text-indigo-800">{{ paidInstallments }} / {{ item.total_installments }}</div>
          </div>
        </div>

        <div class="mt-4 grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
          <div><span class="text-gray-500">Start Month:</span> <span class="font-medium ml-1">{{ item.start_month || '—' }}</span></div>
          <div><span class="text-gray-500">Remarks:</span> <span class="font-medium ml-1">{{ item.remarks || '—' }}</span></div>
          <div><span class="text-gray-500">Created At:</span> <span class="font-medium ml-1">{{ item.created_at?.slice(0, 10) || '—' }}</span></div>
        </div>
      </div>

      <!-- Installment Schedule -->
      <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <h3 class="font-bold text-blue-800 mb-3 flex items-center gap-2">
          <i class="far fa-calendar-alt text-blue-500"></i>
          Installment Schedule
        </h3>
        <LoanInstallmentPreview :loan="item" :installments="item.installments" />
      </div>

      <!-- Actions -->
      <div class="flex gap-3">
        <button class="btn-3" @click="router.push({ name: 'PayrollEmployeeLoanList' })">
          <i class="far fa-list"></i> Back to List
        </button>
      </div>
    </template>

    <div v-else class="bg-gray-50 rounded-xl p-12 text-center text-gray-400">
      <i class="fas fa-search text-4xl mb-3"></i>
      <p>Loan not found.</p>
    </div>
  </div>
</template>
