<script setup>
import { formatCurrency } from '@/utils/currency'
import { computed, ref } from 'vue'

const props = defineProps({
  structure: { type: Object, default: null },
  summary: { type: Object, default: () => ({}) },
})

const activeAllowances = computed(() =>
  (props.structure?.allowances || []).filter((item) => item.is_active),
)

const inactiveAllowanceCount = computed(
  () => (props.structure?.allowances || []).filter((item) => !item.is_active).length,
)

const totalActiveAllowance = computed(() =>
  activeAllowances.value.reduce((sum, item) => sum + Number(item.amount || 0), 0),
)

const allowanceTotal = computed(() => {
  const fromSummary = props.summary?.active_allowance_total
  if (fromSummary !== undefined && fromSummary !== null) {
    const parsed = Number(fromSummary)
    if (Number.isFinite(parsed)) return parsed
  }
  return totalActiveAllowance.value
})

const grossSalary = computed(() => Number(props.structure?.gross_salary) || 0)
const netSalaryMonth = computed(
  () => props.summary?.latest_payroll_month || props.structure?.effective_from,
)
const netSalary = computed(() => grossSalary.value + allowanceTotal.value)

const salaryBreakdown = computed(() => {
  if (!props.structure) return []

  const rows = [
    { label: 'Basic', value: props.structure.basic_salary },
    { label: 'House Rent', value: props.structure.house_rent },
    { label: 'Medical', value: props.structure.medical_allowance },
    { label: 'Conveyance', value: props.structure.conveyance_allowance },
    { label: 'PF Deduction', value: props.structure.pf_deduction },
  ]

  if (allowanceTotal.value) {
    rows.push({ label: 'Allowances', value: allowanceTotal.value })
  }

  return rows
})

const showDetails = ref(false)

const formatShortDate = (value) => {
  if (!value) return '-'
  const date = /^\d{4}-\d{2}-\d{2}$/.test(String(value))
    ? new Date(`${value}T00:00:00`)
    : new Date(value)
  if (Number.isNaN(date.getTime())) return '-'

  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

const toggleDetails = () => {
  showDetails.value = !showDetails.value
}
</script>

<template>
  <section class="overflow-hidden rounded-xl bg-white border border-slate-200 dark:border-slate-800">
    <div class="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-800">
      <div>
        <h3 class="text-base font-semibold text-slate-900 dark:text-white">Current Salary Structure</h3>
        <p class="text-sm text-slate-500 dark:text-slate-400">Compact salary overview.</p>
      </div>
      <span
        v-if="structure"
        class="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium"
        :class="structure.is_active ? 'border-emerald-200 text-emerald-700 dark:border-emerald-800 dark:text-emerald-400' : 'border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300'"
      >
        <i class="far fa-circle-dot"></i>
        {{ structure.is_active ? 'Active' : 'Archived' }}
      </span>
    </div>

    <div v-if="structure" class="space-y-4 px-4 py-4 ">
      <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p class="text-[11px] font-medium uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">Net Salary</p>
          <p class="mt-1 text-2xl font-semibold text-slate-900 dark:text-white">{{ formatCurrency(netSalary) }}</p>
          <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {{ formatCurrency(grossSalary) }} gross +
            {{ formatCurrency(allowanceTotal) }} allowances
          </p>
        </div>

        <button
          type="button"
          class="inline-flex items-center gap-2 self-start rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-900 dark:border-slate-700 dark:text-slate-200 dark:hover:border-slate-500 dark:hover:text-white"
          @click="toggleDetails"
          :aria-expanded="showDetails"
        >
          <span>{{ showDetails ? 'Hide' : 'Show' }} Details</span>
          <i class="far" :class="showDetails ? 'fa-chevron-up' : 'fa-chevron-down'"></i>
        </button>
      </div>

      <div class="grid gap-2 sm:grid-cols-3">
        <div class="rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-800">
          <p class="text-[11px] uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">Gross</p>
          <p class="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{{ formatCurrency(grossSalary) }}</p>
        </div>
        <div class="rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-800">
          <p class="text-[11px] uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">Allowances</p>
          <p class="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{{ formatCurrency(allowanceTotal) }}</p>
        </div>
        <div class="rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-800">
          <p class="text-[11px] uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">Latest payroll</p>
          <p class="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{{ formatShortDate(netSalaryMonth) }}</p>
        </div>
      </div>

      <transition name="fade">
        <div
          v-if="showDetails"
          class="space-y-4 rounded-xl border border-slate-200 p-4 dark:border-slate-800"
        >
          <div class="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            <div
              v-for="item in salaryBreakdown"
              :key="item.label"
              class="rounded-lg border border-slate-200 px-3 py-3 dark:border-slate-800"
            >
              <p class="text-xs text-slate-500 dark:text-slate-400">{{ item.label }}</p>
              <p class="mt-1 text-sm font-semibold text-slate-900 dark:text-white">
                {{ formatCurrency(item.value) }}
              </p>
            </div>
          </div>

          <div class="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
            <div class="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h4 class="text-sm font-semibold text-slate-900 dark:text-white">Allowances</h4>
                <p class="text-xs text-slate-500 dark:text-slate-400">Active values are shown here.</p>
              </div>
              <span class="rounded-full border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600 dark:border-slate-700 dark:text-slate-300">
                {{ activeAllowances.length }} active
              </span>
            </div>

            <div v-if="activeAllowances.length" class="mt-3 divide-y divide-slate-200 dark:divide-slate-800">
              <div
                v-for="item in activeAllowances"
                :key="item.id"
                class="flex items-center justify-between gap-3 py-2"
              >
                <div class="min-w-0">
                  <p class="truncate text-sm font-medium text-slate-800 dark:text-white">
                    {{ item.allowance_name || 'Allowance' }}
                  </p>
                  <p class="text-xs text-slate-500 dark:text-slate-400">{{ item.allowance_code || 'No code' }}</p>
                </div>
                <p class="shrink-0 text-sm font-semibold text-slate-900 dark:text-white">
                  {{ formatCurrency(item.amount) }}
                </p>
              </div>
            </div>

            <div
              v-else
              class="mt-3 rounded-lg border border-dashed border-slate-300 px-4 py-4 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400"
            >
              No active allowance found for the current package.
            </div>

            <p v-if="inactiveAllowanceCount" class="mt-3 text-xs text-slate-500 dark:text-slate-400">
              {{ inactiveAllowanceCount }} inactive allowance item(s) hidden.
            </p>
          </div>
        </div>
      </transition>
    </div>

    <div v-else class="px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
      No salary structure found for this user.
    </div>
  </section>
</template>
