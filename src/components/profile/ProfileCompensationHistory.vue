<script setup>
import { formatCurrency } from '@/utils/currency'
import { ref } from 'vue'

import ProfileLoanInstallmentsModal from '@/components/profile/ProfileLoanInstallmentsModal.vue'

const props = defineProps({
  payrolls: { type: Array, default: () => [] },
  meals: { type: Array, default: () => [] },
  loans: { type: Array, default: () => [] },
  summary: { type: Object, default: () => ({}) },
  selectedMonth: { type: String, default: '' },
  hasMonthlyPayrolls: { type: Boolean, default: false },
})

const tab = ref('payroll')
const emit = defineEmits(['print-sheet'])
const loanModalOpen = ref(false)
const activeLoanForModal = ref(null)

const formatMonth = (value) => {
  if (!value) return '-'
  const date = /^\d{4}-\d{2}-\d{2}$/.test(String(value))
    ? new Date(`${value}T00:00:00`)
    : new Date(value)
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 7) || '-'

  return new Intl.DateTimeFormat('en-GB', { month: 'short', year: 'numeric' }).format(date)
}

const paymentStatusClass = (status) => {
  const s = String(status || '').toLowerCase()
  if (s === 'paid') return 'border-emerald-200 bg-emerald-50 text-emerald-700'
  if (s === 'partial') return 'border-amber-200 bg-amber-50 text-amber-700'
  if (s === 'pending') return 'border-rose-200 bg-rose-50 text-rose-700'
  return 'border-slate-200 bg-slate-100 text-slate-600'
}

const loanStatusClass = (status) => {
  const s = String(status || '').toLowerCase()
  if (s === 'active') return 'border-emerald-200 bg-emerald-50 text-emerald-700'
  if (s === 'pending') return 'border-amber-200 bg-amber-50 text-amber-700'
  if (s === 'closed') return 'border-slate-200 bg-slate-100 text-slate-600'
  return 'border-slate-200 bg-slate-100 text-slate-600'
}

const toNumber = (value) => {
  const number = Number(value)
  return Number.isFinite(number) ? number : 0
}

const specialMealAmount = (item) => toNumber(item?.special_meal_amount ?? item?.additional_amount)

const specialMealRate = (item) => {
  const explicitRate = item?.special_meal_rate ?? item?.additional_rate ?? item?.common_additional
  if (explicitRate !== undefined && explicitRate !== null && explicitRate !== '') return toNumber(explicitRate)

  const specialMealCount = toNumber(item?.total_additional_meal ?? item?.special_meal_count)
  if (specialMealCount > 0) return specialMealAmount(item) / specialMealCount

  return specialMealAmount(item)
}

const openLoanModal = (loan) => {
  if (!loan || String(loan.status || '').toLowerCase() === 'completed') return
  activeLoanForModal.value = loan
  loanModalOpen.value = true
}

const closeLoanModal = () => {
  loanModalOpen.value = false
  activeLoanForModal.value = null
}

const isLoanCompleted = (loan) => String(loan.status || '').toLowerCase() === 'completed'
</script>

<template>
  <section
    class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
  >
    <div class="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 dark:border-slate-800 md:flex-row md:items-center md:justify-between">
      <div>
        <h3 class="text-base font-semibold text-slate-900 dark:text-white">Recent Monthwise History</h3>
        <p class="text-sm text-slate-500 dark:text-slate-400">Latest unique months only. Duplicate rows are ignored.</p>
      </div>
      <div class="inline-flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
        <button
          type="button"
          class="rounded-lg px-3 py-1.5 text-sm font-medium transition"
          :class="tab === 'payroll' ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white' : 'text-slate-500 hover:text-slate-800 dark:text-slate-300 dark:hover:text-white'"
          @click="tab = 'payroll'"
        >
          Payroll
        </button>
        <button
          type="button"
          class="rounded-lg px-3 py-1.5 text-sm font-medium transition"
          :class="tab === 'meal' ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white' : 'text-slate-500 hover:text-slate-800 dark:text-slate-300 dark:hover:text-white'"
          @click="tab = 'meal'"
        >
          Meals
        </button>
        <button
          type="button"
          class="rounded-lg px-3 py-1.5 text-sm font-medium transition"
          :class="tab === 'loan' ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white' : 'text-slate-500 hover:text-slate-800 dark:text-slate-300 dark:hover:text-white'"
          @click="tab = 'loan'"
        >
          Loans
        </button>
      </div>
    </div>

    <div class="px-5 py-5">
      <div v-if="tab === 'payroll'" class="space-y-3">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p class="text-sm font-semibold text-slate-900 dark:text-white">Payroll Records</p>
            <p class="text-xs text-slate-500 dark:text-slate-400">Use the filtered list below for the selected month.</p>
          </div>
          <button
            v-if="hasMonthlyPayrolls"
            type="button"
            class="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
            @click="$emit('print-sheet')"
          >
            <i class="far fa-file-invoice-dollar"></i>
            Monthly Sheet
          </button>
        </div>
        <template v-if="hasMonthlyPayrolls && payrolls.length">
          <div
            v-for="item in payrolls"
            :key="item.id"
            class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 dark:border-slate-800 dark:bg-slate-950/30"
          >
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div class="flex flex-wrap items-center gap-2">
                  <h4 class="text-sm font-semibold text-slate-900 dark:text-slate-100">{{ formatMonth(item.salary_month) }}</h4>
                  <span class="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                    {{ item.salary_type || 'Monthly' }}
                  </span>
                </div>
                <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Gross {{ formatCurrency(item.gross_salary) }} - Deductions {{ formatCurrency(item.total_deduction) }}
                </p>
              </div>
              <span class="inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium" :class="paymentStatusClass(item.payment_status)">
                {{ item.payment_status || 'Unknown' }}
              </span>
            </div>

            <div class="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-5">
              <div>
                <p class="text-xs text-slate-500 dark:text-slate-400">Net Salary</p>
                <p class="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">{{ formatCurrency(item.net_salary) }}</p>
              </div>
              <div>
                <p class="text-xs text-slate-500 dark:text-slate-400">Meal Deduction</p>
                <p class="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">{{ formatCurrency(item.meal_deduction) }}</p>
              </div>
              <div>
                <p class="text-xs text-slate-500 dark:text-slate-400">Loan Deduction</p>
                <p class="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">{{ formatCurrency(item.loan_deduction) }}</p>
              </div>
              <div>
                <p class="text-xs text-slate-500 dark:text-slate-400">Advance Deduction</p>
                <p class="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">{{ formatCurrency(item.advance_deduction) }}</p>
              </div>
              <div>
                <p class="text-xs text-slate-500 dark:text-slate-400">Paycut</p>
                <p class="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">{{ formatCurrency(item.paycut_deduction) }}</p>
              </div>
            </div>
          </div>
        </template>

        <div
          v-else-if="hasMonthlyPayrolls"
          class="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-950/20 dark:text-slate-400"
        >
          No payroll records match the current filters. Try clearing the search or changing the month.
        </div>

        <div
          v-else
          class="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-950/20 dark:text-slate-400"
        >
          No payroll history found.
        </div>
      </div>

      <div v-else-if="tab === 'meal'" class="space-y-3">
        <template v-if="meals.length">
          <div
            v-for="item in meals"
            :key="item.id"
            class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 dark:border-slate-800 dark:bg-slate-950/30"
          >
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h4 class="text-sm font-semibold text-slate-900 dark:text-slate-100">{{ formatMonth(item.salary_month) }}</h4>
                <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {{ item.total_meal || 0 }} meal(s) x {{ formatCurrency(item.meal_rate) }}
                  <span v-if="specialMealAmount(item)"> + Special {{ formatCurrency(specialMealAmount(item)) }}</span>
                </p>
              </div>
              <div class="text-right">
                <p class="text-xs text-slate-500 dark:text-slate-400">Total</p>
                <p class="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">{{ formatCurrency(item.total_amount) }}</p>
              </div>
            </div>

            <div class="mt-4 grid grid-cols-2 gap-3 md:grid-cols-5">
              <div>
                <p class="text-xs text-slate-500 dark:text-slate-400">Meal Rate</p>
                <p class="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">{{ formatCurrency(item.meal_rate) }}</p>
              </div>
              <div>
                <p class="text-xs text-slate-500 dark:text-slate-400">Total Meal</p>
                <p class="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">{{ item.total_meal || 0 }}</p>
              </div>
              <div>
                <p class="text-xs text-slate-500 dark:text-slate-400">Special Meal</p>
                <p class="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">{{ formatCurrency(specialMealAmount(item)) }}</p>
              </div>
              <div>
                <p class="text-xs text-slate-500 dark:text-slate-400">Special Meal Rate</p>
                <p class="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">{{ formatCurrency(specialMealRate(item)) }}</p>
              </div>
              <div>
                <p class="text-xs text-slate-500 dark:text-slate-400">Total</p>
                <p class="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">{{ formatCurrency(item.total_amount) }}</p>
              </div>
            </div>
          </div>
        </template>

        <div
          v-else
          class="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-950/20 dark:text-slate-400"
        >
          No meal history found.
        </div>
      </div>

      <div v-else class="space-y-3">
        <ProfileLoanInstallmentsModal
          :open="loanModalOpen"
          :loan="activeLoanForModal"
          @update:open="(value) => { loanModalOpen = value; if (!value) activeLoanForModal = null }"
        />

        <template v-if="loans.length">
          <div
            v-for="item in loans"
            :key="item.id"
            class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/30"
          >
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div class="min-w-0">
                <div class="flex flex-wrap items-center gap-2">
                  <h4 class="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{{ item.loan_title || 'Loan' }}</h4>
                  <span class="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium capitalize" :class="loanStatusClass(item.status)">
                    {{ item.status || 'Unknown' }}
                  </span>
                </div>
                <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Start {{ formatMonth(item.start_month) }} · {{ item.deducted_installments_count || 0 }}/{{ item.total_installments || 0 }} installments deducted
                </p>
              </div>
              <div class="text-right">
                <p class="text-xs text-slate-500 dark:text-slate-400">Remaining</p>
                <p class="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">{{ formatCurrency(item.remaining_balance) }}</p>
              </div>
            </div>

            <div class="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3">
              <div>
                <p class="text-xs text-slate-500 dark:text-slate-400">Loan Amount</p>
                <p class="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">{{ formatCurrency(item.loan_amount) }}</p>
              </div>
              <div>
                <p class="text-xs text-slate-500 dark:text-slate-400">Installment</p>
                <p class="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">{{ formatCurrency(item.installment_amount) }}</p>
              </div>
              <div>
                <p class="text-xs text-slate-500 dark:text-slate-400">Paid Amount</p>
                <p class="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">{{ formatCurrency(item.deducted_amount) }}</p>
              </div>
            </div>

            <div class="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
              <div>
                <p class="text-xs text-slate-500 dark:text-slate-400">Pending Installments</p>
                <p class="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">{{ item.pending_installments_count || 0 }}</p>
              </div>
              <div>
                <p class="text-xs text-slate-500 dark:text-slate-400">Next Installment</p>
                <p class="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {{ item.next_installment_month ? formatMonth(item.next_installment_month) : 'N/A' }}
                </p>
              </div>
              <div>
                <p class="text-xs text-slate-500 dark:text-slate-400">Next Amount</p>
                <p class="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">{{ formatCurrency(item.next_installment_amount) }}</p>
              </div>
              <div class="flex items-center gap-2">
                <button
                  v-if="!isLoanCompleted(item)"
                  type="button"
                  class="ml-auto inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-700"
                  @click="openLoanModal(item)"
                >
                  <i class="far fa-file-invoice"></i>
                  View Installments
                </button>
                <span
                  v-else
                  class="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 dark:border-slate-700 dark:text-slate-300"
                >
                  Completed
                </span>
              </div>
            </div>
          </div>
        </template>

        <div
          v-else
          class="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-950/20 dark:text-slate-400"
        >
          No loan history found.
        </div>

        <div
          v-if="props.summary.active_loans_count"
          class="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-800"
        >
          {{ props.summary.active_loans_count }} active loan(s) running with combined remaining balance
          {{ formatCurrency(props.summary.active_loan_balance) }}.
        </div>
      </div>
    </div>
  </section>
</template>
