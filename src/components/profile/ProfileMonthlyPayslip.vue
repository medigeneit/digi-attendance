<script setup>
import { computed } from 'vue'

const props = defineProps({
  user: { type: Object, default: () => ({}) },
  payrolls: { type: Array, default: () => [] },
  meals: { type: Array, default: () => [] },
  loans: { type: Array, default: () => [] },
  selectedMonth: { type: String, default: '' },
})

const monthKey = (value) => String(value || '').slice(0, 7)

const toNumber = (value) => {
  const num = Number(value)
  return Number.isFinite(num) ? num : 0
}

const formatMoney = (value) => {
  const num = toNumber(value)

  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num)
}

const formatMonth = (value) => {
  if (!value) return 'No month selected'

  const source = /^\d{4}-\d{2}$/.test(String(value)) ? `${value}-01` : value
  const date = /^\d{4}-\d{2}-\d{2}$/.test(String(source))
    ? new Date(`${source}T00:00:00`)
    : new Date(source)

  if (Number.isNaN(date.getTime())) return String(value).slice(0, 7) || 'No month selected'

  return new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric' }).format(date)
}

const paymentStatusClass = (status) => {
  const normalized = String(status || '').toLowerCase()

  if (normalized === 'paid') return 'border-emerald-300 bg-emerald-100 text-emerald-800'
  if (normalized === 'partial') return 'border-amber-300 bg-amber-100 text-amber-800'
  if (normalized === 'pending') return 'border-rose-300 bg-rose-100 text-rose-800'

  return 'border-stone-300 bg-stone-100 text-stone-700'
}

const currentPayroll = computed(() => {
  const items = Array.isArray(props.payrolls) ? props.payrolls : []

  if (!items.length) return null

  if (props.selectedMonth) {
    return items.find((item) =>
      monthKey(item.salary_month) === props.selectedMonth && String(item.salary_type || '').toLowerCase() === 'monthly',
    ) || items.find((item) => monthKey(item.salary_month) === props.selectedMonth) || null
  }

  return items.find((item) => String(item.salary_type || '').toLowerCase() === 'monthly') || items[0]
})

const currentMonth = computed(() => monthKey(currentPayroll.value?.salary_month || props.selectedMonth))

const currentMeal = computed(() => {
  if (!currentMonth.value) return null

  return (props.meals || []).find((item) => monthKey(item.salary_month) === currentMonth.value) || null
})

const monthInstallments = computed(() => {
  if (!currentMonth.value) return []

  return (props.loans || []).flatMap((loan) =>
    (loan.installments || [])
      .filter((item) => monthKey(item.salary_month) === currentMonth.value)
      .map((item) => ({
        ...item,
        loan_title: loan.loan_title,
        remaining_balance: loan.remaining_balance,
      })),
  )
})

const earningRows = computed(() => {
  if (!currentPayroll.value) return []

  const payroll = currentPayroll.value
  const rows = [
    { label: 'Basic', value: payroll.basic_salary },
    { label: 'House Rent', value: payroll.house_rent },
    { label: 'Medical Allowance', value: payroll.medical_allowance },
    { label: 'Transport', value: payroll.conveyance_allowance },
  ]

  ;(payroll.other_allowance_breakdown || []).forEach((item) => {
    rows.push({
      label: item.allowance_name || item.allowance_code || 'Allowance',
      value: item.amount,
    })
  })

  if (!(payroll.other_allowance_breakdown || []).length && toNumber(payroll.other_allowance_total) > 0) {
    rows.push({
      label: 'Other Allowance',
      value: payroll.other_allowance_total,
    })
  }

  if (toNumber(payroll.manual_addition) > 0) {
    rows.push({
      label: 'Overtime / Extra',
      value: payroll.manual_addition,
    })
  }

  return rows.filter((item) => toNumber(item.value) > 0)
})

const deductionRows = computed(() => {
  if (!currentPayroll.value) return []

  const payroll = currentPayroll.value
  const rows = [
    { label: 'PF Allowance', value: payroll.pf_allowance_deduction_total },
    { label: 'PF', value: payroll.pf_deduction },
    { label: 'Tax', value: payroll.tax_deduction },
    {
      label: 'Loan Installment',
      value: payroll.loan_deduction,
      note: monthInstallments.value.length ? `${monthInstallments.value.length} installment(s)` : '',
    },
    {
      label: 'Meal',
      value: payroll.meal_deduction,
      note: currentMeal.value ? `${currentMeal.value.total_meal || 0} meal(s)` : '',
    },
    { label: 'Others', value: payroll.other_deduction },
    { label: 'Advance', value: payroll.advance_deduction },
    { label: 'Paycut', value: payroll.paycut_deduction },
  ]

  return rows.filter((item) => toNumber(item.value) > 0)
})

const totalEarnings = computed(() => earningRows.value.reduce((sum, item) => sum + toNumber(item.value), 0))

const totalDeductions = computed(() => {
  if (currentPayroll.value?.total_deduction !== undefined && currentPayroll.value?.total_deduction !== null) {
    return toNumber(currentPayroll.value.total_deduction)
  }

  return deductionRows.value.reduce((sum, item) => sum + toNumber(item.value), 0)
})

const slipTitle = computed(() => {
  if (currentPayroll.value?.salary_month) return formatMonth(currentPayroll.value.salary_month)
  if (props.selectedMonth) return formatMonth(props.selectedMonth)

  return 'Latest Month'
})

const employeeName = computed(() => currentPayroll.value?.employee_name || props.user?.name || '-')
const employeeId = computed(() => currentPayroll.value?.employee_code || props.user?.employee_id || '-')
const designation = computed(() =>
  currentPayroll.value?.designation_name || props.user?.designation?.title || props.user?.post || '-',
)
const department = computed(() =>
  currentPayroll.value?.department_name || props.user?.department?.name || '-',
)
const paymentMethod = computed(() => currentPayroll.value?.payment_method || 'Not set')
const bankDetails = computed(() => {
  const bankName = currentPayroll.value?.bank_name || props.user?.bank_name || ''
  const accountNo = currentPayroll.value?.bank_account_no || props.user?.bank_account_no || ''

  if (!bankName && !accountNo) return ''

  return [bankName, accountNo].filter(Boolean).join(' | ')
})
</script>

<template>
  <section
    class="overflow-hidden rounded-[28px] border border-stone-300 bg-gradient-to-br from-stone-50 via-white to-stone-100 shadow-sm dark:border-slate-700 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950"
  >
    <div class="border-b border-stone-300 px-5 py-4 dark:border-slate-700">
      <div class="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p class="text-xs font-semibold uppercase tracking-[0.24em] text-stone-500 dark:text-slate-400">
            Monthly Salary Sheet
          </p>
          <h3 class="mt-1 text-xl font-semibold text-stone-900 dark:text-slate-100">
            For The Month Of {{ slipTitle }}
          </h3>
          <p class="mt-1 text-sm text-stone-600 dark:text-slate-400">
            Current month slip view with duplicate entries removed and only useful rows shown.
          </p>
        </div>

        <div
          v-if="currentPayroll"
          class="inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium"
          :class="paymentStatusClass(currentPayroll.payment_status)"
        >
          <i class="far fa-circle-dot"></i>
          {{ currentPayroll.payment_status || 'Unknown' }}
        </div>
      </div>
    </div>

    <div v-if="currentPayroll" class="space-y-5 px-5 py-5">
      <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div class="rounded-2xl border border-stone-300 bg-white/80 px-4 py-3 dark:border-slate-700 dark:bg-slate-900/80">
          <p class="text-xs uppercase tracking-[0.18em] text-stone-500 dark:text-slate-400">Name</p>
          <p class="mt-2 text-sm font-semibold text-stone-900 dark:text-slate-100">{{ employeeName }}</p>
        </div>
        <div class="rounded-2xl border border-stone-300 bg-white/80 px-4 py-3 dark:border-slate-700 dark:bg-slate-900/80">
          <p class="text-xs uppercase tracking-[0.18em] text-stone-500 dark:text-slate-400">Designation</p>
          <p class="mt-2 text-sm font-semibold text-stone-900 dark:text-slate-100">{{ designation }}</p>
        </div>
        <div class="rounded-2xl border border-stone-300 bg-white/80 px-4 py-3 dark:border-slate-700 dark:bg-slate-900/80">
          <p class="text-xs uppercase tracking-[0.18em] text-stone-500 dark:text-slate-400">Employee ID</p>
          <p class="mt-2 text-sm font-semibold text-stone-900 dark:text-slate-100">{{ employeeId }}</p>
        </div>
        <div class="rounded-2xl border border-stone-300 bg-white/80 px-4 py-3 dark:border-slate-700 dark:bg-slate-900/80">
          <p class="text-xs uppercase tracking-[0.18em] text-stone-500 dark:text-slate-400">Department</p>
          <p class="mt-2 text-sm font-semibold text-stone-900 dark:text-slate-100">{{ department }}</p>
        </div>
      </div>

      <div class="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,0.92fr)]">
        <div class="overflow-hidden rounded-3xl border border-stone-300 bg-white/90 dark:border-slate-700 dark:bg-slate-900/80">
          <div class="grid grid-cols-[minmax(0,1fr)_140px] border-b border-stone-300 bg-stone-100 px-4 py-3 text-sm font-semibold text-stone-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100">
            <span>Earnings</span>
            <span class="text-right">Amount</span>
          </div>

          <div v-if="earningRows.length" class="divide-y divide-stone-200 dark:divide-slate-800">
            <div
              v-for="item in earningRows"
              :key="item.label"
              class="grid grid-cols-[minmax(0,1fr)_140px] gap-3 px-4 py-3 text-sm"
            >
              <div class="min-w-0">
                <p class="truncate font-medium text-stone-900 dark:text-slate-100">{{ item.label }}</p>
              </div>
              <p class="text-right font-semibold text-stone-900 dark:text-slate-100">
                {{ formatMoney(item.value) }}
              </p>
            </div>
          </div>

          <div v-else class="px-4 py-8 text-center text-sm text-stone-500 dark:text-slate-400">
            No earning rows available for this month.
          </div>

          <div class="grid grid-cols-[minmax(0,1fr)_140px] border-t border-stone-300 bg-stone-100 px-4 py-3 text-sm font-semibold text-stone-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100">
            <span>Total Earnings</span>
            <span class="text-right">{{ formatMoney(totalEarnings) }}</span>
          </div>
        </div>

        <div class="overflow-hidden rounded-3xl border border-stone-300 bg-white/90 dark:border-slate-700 dark:bg-slate-900/80">
          <div class="grid grid-cols-[minmax(0,1fr)_140px] border-b border-stone-300 bg-stone-100 px-4 py-3 text-sm font-semibold text-stone-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100">
            <span>Deductions</span>
            <span class="text-right">Amount</span>
          </div>

          <div v-if="deductionRows.length" class="divide-y divide-stone-200 dark:divide-slate-800">
            <div
              v-for="item in deductionRows"
              :key="item.label"
              class="grid grid-cols-[minmax(0,1fr)_140px] gap-3 px-4 py-3 text-sm"
            >
              <div class="min-w-0">
                <p class="truncate font-medium text-stone-900 dark:text-slate-100">{{ item.label }}</p>
                <p v-if="item.note" class="mt-0.5 text-xs text-stone-500 dark:text-slate-400">{{ item.note }}</p>
              </div>
              <p class="text-right font-semibold text-stone-900 dark:text-slate-100">
                {{ formatMoney(item.value) }}
              </p>
            </div>
          </div>

          <div v-else class="px-4 py-8 text-center text-sm text-stone-500 dark:text-slate-400">
            No deduction rows for this month.
          </div>

          <div class="grid grid-cols-[minmax(0,1fr)_140px] border-t border-stone-300 bg-stone-100 px-4 py-3 text-sm font-semibold text-stone-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100">
            <span>Total Deduction</span>
            <span class="text-right">{{ formatMoney(totalDeductions) }}</span>
          </div>
        </div>
      </div>

      <div class="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_220px]">
        <div class="rounded-2xl border border-stone-300 bg-white/80 px-4 py-3 dark:border-slate-700 dark:bg-slate-900/80">
          <p class="text-xs uppercase tracking-[0.18em] text-stone-500 dark:text-slate-400">Payment Note</p>
          <p class="mt-2 text-sm font-medium text-stone-900 dark:text-slate-100">
            {{ currentPayroll.salary_type || 'Monthly' }} salary
            <span v-if="currentPayroll.remarks"> | {{ currentPayroll.remarks }}</span>
          </p>
          <p class="mt-1 text-xs text-stone-500 dark:text-slate-400">
            {{ paymentMethod }}
            <span v-if="bankDetails"> | {{ bankDetails }}</span>
          </p>
        </div>

        <div class="rounded-2xl border border-stone-300 bg-stone-900 px-4 py-3 text-white dark:border-slate-700 dark:bg-slate-800">
          <p class="text-xs uppercase tracking-[0.18em] text-stone-300 dark:text-slate-400">Gross Salary</p>
          <p class="mt-2 text-2xl font-semibold">{{ formatMoney(currentPayroll.gross_salary) }}</p>
        </div>

        <div class="rounded-2xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-100">
          <p class="text-xs uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300">Net Payment</p>
          <p class="mt-2 text-2xl font-semibold">{{ formatMoney(currentPayroll.net_salary) }}</p>
        </div>
      </div>

      <div v-if="monthInstallments.length || currentMeal" class="grid gap-3 lg:grid-cols-2">
        <div
          v-if="currentMeal"
          class="rounded-2xl border border-stone-300 bg-white/80 px-4 py-3 dark:border-slate-700 dark:bg-slate-900/80"
        >
          <p class="text-xs uppercase tracking-[0.18em] text-stone-500 dark:text-slate-400">Meal Info</p>
          <p class="mt-2 text-sm font-medium text-stone-900 dark:text-slate-100">
            {{ currentMeal.total_meal || 0 }} meal(s) x {{ formatMoney(currentMeal.meal_rate) }}
          </p>
          <p class="mt-1 text-xs text-stone-500 dark:text-slate-400">
            Additional {{ formatMoney(currentMeal.additional_amount) }} | Total {{ formatMoney(currentMeal.total_amount) }}
          </p>
        </div>

        <div
          v-if="monthInstallments.length"
          class="rounded-2xl border border-stone-300 bg-white/80 px-4 py-3 dark:border-slate-700 dark:bg-slate-900/80"
        >
          <p class="text-xs uppercase tracking-[0.18em] text-stone-500 dark:text-slate-400">Loan Installments</p>
          <div class="mt-2 space-y-2">
            <div
              v-for="item in monthInstallments.slice(0, 2)"
              :key="item.id"
              class="flex items-center justify-between gap-3 text-sm"
            >
              <div class="min-w-0">
                <p class="truncate font-medium text-stone-900 dark:text-slate-100">{{ item.loan_title || 'Loan' }}</p>
                <p class="text-xs text-stone-500 dark:text-slate-400">Remaining {{ formatMoney(item.remaining_balance) }}</p>
              </div>
              <p class="shrink-0 font-semibold text-stone-900 dark:text-slate-100">{{ formatMoney(item.amount) }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="px-5 py-12 text-center text-sm text-stone-600 dark:text-slate-400">
      No payroll sheet found
      <span v-if="selectedMonth">for {{ formatMonth(selectedMonth) }}</span>.
      Generate payroll for that month to show the salary sheet here.
    </div>
  </section>
</template>
