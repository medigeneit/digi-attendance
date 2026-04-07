<script setup>
import apiClient from '@/axios'
import LoaderView from '@/components/common/LoaderView.vue'
import ProfileCompensationHistory from '@/components/profile/ProfileCompensationHistory.vue'
import ProfileSalarySheetModal from '@/components/profile/ProfileSalarySheetModal.vue'
import ProfileSalaryStructureCard from '@/components/profile/ProfileSalaryStructureCard.vue'
import { computed, onMounted, ref } from 'vue'

const props = defineProps({
  user: { type: Object, default: () => ({}) },
})

const loading = ref(false)
const error = ref('')

const formatMonthInput = (value = new Date()) => {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

const defaultMonthKey = formatMonthInput()

const selectedMonth = ref(defaultMonthKey)
const searchQuery = ref('')
const paySheetOpen = ref(false)
const overview = ref({
  summary: {},
  salary_structure: null,
  meals: [],
  loans: [],
  payrolls: [],
})

const currentSalary = computed(() => overview.value.salary_structure)
const allSummary = computed(() => overview.value.summary || {})
const normalizedSearch = computed(() => searchQuery.value.trim().toLowerCase())

const matchMonth = (value) => {
  if (!selectedMonth.value) return true
  return String(value || '').slice(0, 7) === selectedMonth.value
}

const matchSearch = (...values) => {
  if (!normalizedSearch.value) return true

  return values.some((value) => String(value || '').toLowerCase().includes(normalizedSearch.value))
}

const monthScopedPayrolls = computed(() =>
  (overview.value.payrolls || []).filter((item) => matchMonth(item.salary_month)),
)

const hasMonthlyPayrolls = computed(() => monthScopedPayrolls.value.length > 0)

const monthScopedMeals = computed(() =>
  (overview.value.meals || []).filter((item) => matchMonth(item.salary_month)),
)

const monthScopedLoans = computed(() =>
  (overview.value.loans || []).filter((item) => {
    const installmentMatch = (item.installments || []).some((installment) =>
      matchMonth(installment.salary_month),
    )

    return !selectedMonth.value || matchMonth(item.start_month) || installmentMatch
  }),
)

const filteredPayrolls = computed(() =>
  monthScopedPayrolls.value.filter((item) =>
    matchSearch(item.salary_month, item.salary_type, item.payment_status),
  ),
)

const filteredMeals = computed(() =>
  monthScopedMeals.value.filter((item) =>
    matchSearch(item.salary_month, item.total_meal, item.total_amount, item.meal_rate),
  ),
)

const filteredLoans = computed(() =>
  monthScopedLoans.value.filter((item) =>
    matchSearch(
      item.loan_title,
      item.status,
      item.remarks,
      item.start_month,
      ...(item.installments || []).flatMap((installment) => [
        installment.salary_month,
        installment.status,
        installment.remarks,
      ]),
    )
  ),
)

const summary = computed(() => {
  if (!selectedMonth.value) return allSummary.value

  const monthPayroll = monthScopedPayrolls.value[0] || null
  const monthMeal = monthScopedMeals.value[0] || null
  const activeLoans = monthScopedLoans.value.filter((item) => String(item.status || '').toLowerCase() === 'active')

  return {
    gross_salary: currentSalary.value?.gross_salary,
    active_allowance_total: allSummary.value.active_allowance_total || 0,
    active_loans_count: activeLoans.length,
    active_loan_balance: activeLoans.reduce((sum, item) => sum + Number(item.remaining_balance || 0), 0),
    latest_net_salary: monthPayroll?.net_salary ?? null,
    latest_payroll_month: monthPayroll?.salary_month ?? selectedMonth.value,
    latest_meal_total: monthMeal?.total_amount ?? null,
    latest_meal_month: monthMeal?.salary_month ?? selectedMonth.value,
  }
})

const formatCompactCurrency = (value) => {
  if (value === null || value === undefined || value === '') return '-'
  const num = Number(value)
  if (!Number.isFinite(num)) return '-'

  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num)
}

const formatMonth = (value) => {
  if (!value) return 'No data'
  const date = /^\d{4}-\d{2}-\d{2}$/.test(String(value))
    ? new Date(`${value}T00:00:00`)
    : new Date(value)
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 7) || 'No data'

  return new Intl.DateTimeFormat('en-GB', { month: 'short', year: 'numeric' }).format(date)
}

const cards = computed(() => [
  {
    label: 'Current Gross',
    value: currentSalary.value?.gross_salary,
    hint: currentSalary.value?.effective_from ? `From ${formatMonth(currentSalary.value.effective_from)}` : 'No structure',
    tone: 'border-emerald-200 bg-emerald-50 text-emerald-900',
    icon: 'fa-sack-dollar',
  },
  {
    label: 'Latest Net Pay',
    value: summary.value.latest_net_salary,
    hint: summary.value.latest_payroll_month ? formatMonth(summary.value.latest_payroll_month) : selectedMonth.value ? 'No payroll in month' : 'No payroll yet',
    tone: 'border-sky-200 bg-sky-50 text-sky-900',
    icon: 'fa-wallet',
  },
  {
    label: 'Meal Total',
    value: summary.value.latest_meal_total,
    hint: summary.value.latest_meal_month ? formatMonth(summary.value.latest_meal_month) : selectedMonth.value ? 'No meal in month' : 'No meal entry',
    tone: 'border-amber-200 bg-amber-50 text-amber-900',
    icon: 'fa-utensils',
  },
  {
    label: 'Active Loan Balance',
    value: summary.value.active_loan_balance,
    hint: `${summary.value.active_loans_count || 0} active loan(s)`,
    tone: 'border-rose-200 bg-rose-50 text-rose-900',
    icon: 'fa-hand-holding-dollar',
  },
])

const load = async () => {
  loading.value = true
  error.value = ''

  try {
    const res = await apiClient.get('/my-profile/payroll-overview')
    overview.value = {
      summary: res?.data?.data?.summary || {},
      salary_structure: res?.data?.data?.salary_structure || null,
      meals: res?.data?.data?.meals || [],
      loans: res?.data?.data?.loans || [],
      payrolls: res?.data?.data?.payrolls || [],
    }
  } catch (err) {
    error.value = err?.response?.data?.message || err?.message || 'Failed to load compensation data.'
  } finally {
    loading.value = false
  }
}

const clearFilters = () => {
  selectedMonth.value = defaultMonthKey
  searchQuery.value = ''
}

onMounted(load)
</script>

<template>
  <section class="space-y-4">
    <div class="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
      <div>
        <h2 class="text-lg font-semibold text-slate-900 dark:text-white">Compensation Overview</h2>
        <p class="text-sm text-slate-500 dark:text-slate-400">
          Current salary structure with recent monthwise meal, loan, and payroll records.
        </p>
      </div>
      <div class="flex flex-wrap gap-2">
        <button
          v-if="hasMonthlyPayrolls"
          type="button"
          class="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          @click="paySheetOpen = true"
        >
          <i class="far fa-file-invoice-dollar"></i>
          Monthly Salary Sheet
        </button>
        <button
          type="button"
          class="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          :disabled="loading"
          @click="load"
        >
          <i class="far" :class="loading ? 'fa-spinner fa-spin' : 'fa-rotate-right'"></i>
          Refresh
        </button>
      </div>
    </div>

    <div class="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 md:grid-cols-[180px_minmax(0,1fr)_auto]">
      <div>
        <label class="mb-1 block text-xs font-medium uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
          Month Filter
        </label>
        <input
          v-model="selectedMonth"
          type="month"
          class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
        />
      </div>

      <div>
        <label class="mb-1 block text-xs font-medium uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
          Search
        </label>
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search by month, status, title, remarks..."
          class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
        />
      </div>

      <div class="flex items-end">
        <button
          type="button"
          class="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700 md:w-auto"
          @click="clearFilters"
        >
          <i class="far fa-filter-circle-xmark"></i>
          Clear
        </button>
      </div>
    </div>

    <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <article
        v-for="card in cards"
        :key="card.label"
        class="rounded-2xl border px-4 py-3 shadow-sm"
        :class="card.tone"
      >
        <div class="flex items-start justify-between gap-3">
          <div>
            <p class="text-xs font-semibold uppercase tracking-[0.18em] opacity-75">{{ card.label }}</p>
            <p class="mt-2 text-xl font-bold">{{ formatCompactCurrency(card.value) }}</p>
            <p class="mt-1 text-xs opacity-80">{{ card.hint }}</p>
          </div>
          <span class="rounded-xl bg-white/60 p-2 text-sm">
            <i class="far" :class="card.icon"></i>
          </span>
        </div>
      </article>
    </div>

    <div
      v-if="error"
      class="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-700"
    >
      <div class="flex items-start gap-3">
        <i class="fas fa-circle-exclamation mt-0.5"></i>
        <div>
          <p class="font-medium">Compensation data could not be loaded.</p>
          <p class="mt-1">{{ error }}</p>
        </div>
      </div>
    </div>

    <LoaderView v-else-if="loading" class="shadow-none" />

    <div v-else class="space-y-6">
      <div class="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.15fr)]">
        <ProfileSalaryStructureCard :structure="overview.salary_structure" :summary="overview.summary" />
        <ProfileCompensationHistory
          :loans="filteredLoans"
          :meals="filteredMeals"
          :payrolls="filteredPayrolls"
          :selected-month="selectedMonth"
          :summary="summary"
          :has-monthly-payrolls="hasMonthlyPayrolls"
          @print-sheet="paySheetOpen = true"
        /> 
      </div> 
    </div>

    <ProfileSalarySheetModal
      :open="paySheetOpen"
      :user="props.user"
      :payrolls="monthScopedPayrolls"
      :meals="monthScopedMeals"
      :loans="monthScopedLoans"
      :selected-month="selectedMonth"
      @update:open="paySheetOpen = $event"
    />
  </section>
</template>
