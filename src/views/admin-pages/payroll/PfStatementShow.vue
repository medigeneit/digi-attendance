<script setup>
import LoaderView from '@/components/common/LoaderView.vue'
import { usePfHistoricalBalanceStore } from '@/stores/pfHistoricalBalance'
import { formatCurrency } from '@/utils/currency'
import { storeToRefs } from 'pinia'
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route  = useRoute()
const router = useRouter()
const store  = usePfHistoricalBalanceStore()
const { statement, statementLoading, statementError } = storeToRefs(store)

const userId     = route.params.userId
const filterYear = ref('')

const currentYear = new Date().getFullYear()
const yearOptions = Array.from({ length: 15 }, (_, i) => String(currentYear - i))

const load = () => store.fetchStatement(userId, { year: filterYear.value || undefined })

onMounted(load)
</script>

<template>
  <div class="min-h-screen bg-slate-50">

    <!-- ── Toolbar ─────────────────────────────────────────────────────── -->
    <div class="sticky top-0 z-20 border-b border-slate-200 bg-white px-4 py-2.5 shadow-sm print:hidden">
      <div class="flex flex-wrap items-center justify-between gap-2">

        <div class="flex min-w-0 items-center gap-2">
          <button
            type="button"
            class="flex h-6 w-6 items-center justify-center rounded border border-slate-200 text-slate-400 hover:bg-slate-50 hover:text-slate-700"
            @click="router.back()"
          >
            <i class="far fa-arrow-left text-[10px]"></i>
          </button>
          <span class="text-[10px] font-bold uppercase tracking-[0.22em] text-indigo-500">Payroll</span>
          <span class="text-slate-300">/</span>
          <span class="text-sm font-bold text-slate-800">PF Statement</span>
          <span v-if="statement?.user?.name" class="rounded bg-slate-100 px-2 py-0.5 font-mono text-[11px] text-slate-600">
            {{ statement.user.name }}
          </span>
          <svg v-if="statementLoading" class="h-3.5 w-3.5 animate-spin text-indigo-400" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
          </svg>
        </div>

        <div class="flex items-center gap-1.5">
          <select
            v-model="filterYear"
            class="h-7 rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-700 shadow-sm focus:border-indigo-400 focus:outline-none"
            @change="load"
          >
            <option value="">All years</option>
            <option v-for="y in yearOptions" :key="y" :value="y">{{ y }}</option>
          </select>
          <button
            type="button"
            class="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50"
            @click="window.print()"
          >
            <i class="far fa-print text-[10px]"></i> Print
          </button>
        </div>
      </div>
    </div>

    <!-- ── Loading ────────────────────────────────────────────────────── -->
    <div v-if="statementLoading && !statement" class="flex items-center justify-center py-24">
      <LoaderView />
    </div>

    <!-- ── Error ──────────────────────────────────────────────────────── -->
    <div v-else-if="statementError" class="m-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
      <i class="far fa-exclamation-circle mr-1.5"></i>{{ statementError }}
    </div>

    <template v-else-if="statement">

      <!-- ── Employee banner ────────────────────────────────────────── -->
      <div class="border-b border-slate-200 bg-white px-4 py-3">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div class="flex items-center gap-3">
            <div class="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-600">
              {{ (statement.user.name || '?')[0].toUpperCase() }}
            </div>
            <div>
              <div class="font-bold text-slate-900">{{ statement.user.name }}</div>
              <div class="text-[11px] text-slate-400">Employee ID: {{ statement.user.employee_id || statement.user.id }}</div>
            </div>
          </div>
          <div class="flex flex-wrap items-center gap-3 text-[11px]">
            <div class="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-center">
              <div class="text-slate-400">Employee Total</div>
              <div class="font-bold font-mono text-slate-800">{{ formatCurrency(statement.summary.employee_total) }}</div>
            </div>
            <div class="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-center">
              <div class="text-slate-400">Employer Total</div>
              <div class="font-bold font-mono text-slate-800">{{ formatCurrency(statement.summary.employer_total) }}</div>
            </div>
            <div class="rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-1.5 text-center">
              <div class="text-indigo-400 text-[10px] uppercase font-semibold tracking-wide">Total Accumulated</div>
              <div class="font-bold font-mono text-indigo-700 text-base">{{ formatCurrency(statement.summary.total_accumulated) }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- ── Historical section ─────────────────────────────────────── -->
      <div v-if="statement.historical.rows.length" class="mt-4 mx-4 rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div class="flex items-center justify-between border-b border-slate-100 px-4 py-2.5">
          <div class="flex items-center gap-2">
            <span class="inline-flex h-5 w-5 items-center justify-center rounded bg-slate-100">
              <i class="far fa-archive text-[9px] text-slate-500"></i>
            </span>
            <span class="text-sm font-bold text-slate-800">Historical PF Balance</span>
            <span class="text-[11px] text-slate-400">Pre-software records</span>
          </div>
          <span class="rounded-full bg-slate-100 px-2.5 py-0.5 font-mono text-[11px] font-semibold text-slate-700">
            {{ formatCurrency(statement.historical.total) }}
          </span>
        </div>
        <div class="overflow-x-auto">
          <table class="min-w-full border-collapse text-xs">
            <thead>
              <tr class="bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                <th class="border-b border-slate-200 px-4 py-2 text-center">#</th>
                <th class="border-b border-slate-200 px-4 py-2 text-center">Year</th>
                <th class="border-b border-slate-200 px-4 py-2 text-left">Period</th>
                <th class="border-b border-slate-200 px-4 py-2 text-right">Employee PF</th>
                <th class="border-b border-slate-200 px-4 py-2 text-right">Employer PF</th>
                <th class="border-b border-slate-200 px-4 py-2 text-right">Total</th>
                <th class="border-b border-slate-200 px-4 py-2 text-left">Source</th>
                <th class="border-b border-slate-200 px-4 py-2 text-left">Reference</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(row, idx) in statement.historical.rows"
                :key="`h-${idx}`"
                class="border-b border-slate-100 transition hover:bg-slate-50/60"
              >
                <td class="px-4 py-2 text-center font-mono text-[11px] text-slate-400">{{ idx + 1 }}</td>
                <td class="px-4 py-2 text-center">
                  <span class="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-600">{{ row.year }}</span>
                </td>
                <td class="px-4 py-2 text-slate-600">
                  {{ row.period_from }} <span class="mx-0.5 text-slate-300">–</span> {{ row.period_to }}
                </td>
                <td class="px-4 py-2 text-right font-mono text-slate-700">{{ formatCurrency(row.employee_amount) }}</td>
                <td class="px-4 py-2 text-right font-mono text-slate-700">{{ formatCurrency(row.employer_amount) }}</td>
                <td class="px-4 py-2 text-right font-mono font-bold text-slate-800">{{ formatCurrency(row.total) }}</td>
                <td class="px-4 py-2">
                  <span class="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold capitalize text-slate-600">
                    {{ row.source?.replace('_', ' ') || '—' }}
                  </span>
                </td>
                <td class="max-w-[140px] truncate px-4 py-2 text-[11px] text-slate-500" :title="row.reference_no">
                  {{ row.reference_no || '—' }}
                </td>
              </tr>
              <!-- Subtotal row -->
              <tr class="bg-indigo-50/40 font-semibold text-slate-700">
                <td colspan="3" class="px-4 py-2 text-right text-[10px] uppercase tracking-wide text-slate-500">Historical Total</td>
                <td class="px-4 py-2 text-right font-mono">{{ formatCurrency(statement.historical.employee_total) }}</td>
                <td class="px-4 py-2 text-right font-mono">{{ formatCurrency(statement.historical.employer_total) }}</td>
                <td class="px-4 py-2 text-right font-mono">{{ formatCurrency(statement.historical.total) }}</td>
                <td colspan="2"></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- ── Monthly payroll section ────────────────────────────────── -->
      <div v-if="statement.monthly.rows.length" class="mx-4 mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div class="flex items-center justify-between border-b border-slate-100 px-4 py-2.5">
          <div class="flex items-center gap-2">
            <span class="inline-flex h-5 w-5 items-center justify-center rounded bg-emerald-100">
              <i class="far fa-calendar-check text-[9px] text-emerald-600"></i>
            </span>
            <span class="text-sm font-bold text-slate-800">Monthly Payroll PF</span>
            <span class="text-[11px] text-slate-400">
              from payroll records
              <span v-if="statement.monthly.cutoff_after" class="ml-1 rounded bg-amber-50 border border-amber-200 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
                after {{ statement.monthly.cutoff_after }}
              </span>
            </span>
          </div>
          <span class="rounded-full bg-emerald-100 px-2.5 py-0.5 font-mono text-[11px] font-semibold text-emerald-700">
            {{ formatCurrency(statement.monthly.total) }}
          </span>
        </div>
        <div class="overflow-x-auto">
          <table class="min-w-full border-collapse text-xs">
            <thead>
              <tr class="bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                <th class="border-b border-slate-200 px-4 py-2 text-center">#</th>
                <th class="border-b border-slate-200 px-4 py-2 text-left">Month</th>
                <th class="border-b border-slate-200 px-4 py-2 text-right">Employee PF</th>
                <th class="border-b border-slate-200 px-4 py-2 text-right">Employer PF</th>
                <th class="border-b border-slate-200 px-4 py-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(row, idx) in statement.monthly.rows"
                :key="`m-${row.month}`"
                class="border-b border-slate-100 transition hover:bg-slate-50/60"
              >
                <td class="px-4 py-2 text-center font-mono text-[11px] text-slate-400">{{ idx + 1 }}</td>
                <td class="px-4 py-2 font-medium text-slate-700">
                  <span class="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-600">{{ row.month }}</span>
                </td>
                <td class="px-4 py-2 text-right font-mono text-slate-700">{{ formatCurrency(row.employee_amount) }}</td>
                <td class="px-4 py-2 text-right font-mono text-slate-700">{{ formatCurrency(row.employer_amount) }}</td>
                <td class="px-4 py-2 text-right font-mono font-bold text-slate-800">{{ formatCurrency(row.total) }}</td>
              </tr>
              <!-- Subtotal row -->
              <tr class="bg-emerald-50/40 font-semibold text-slate-700">
                <td colspan="2" class="px-4 py-2 text-right text-[10px] uppercase tracking-wide text-slate-500">Monthly Total</td>
                <td class="px-4 py-2 text-right font-mono">{{ formatCurrency(statement.monthly.employee_total) }}</td>
                <td class="px-4 py-2 text-right font-mono">{{ formatCurrency(statement.monthly.employer_total) }}</td>
                <td class="px-4 py-2 text-right font-mono">{{ formatCurrency(statement.monthly.total) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- ── Empty state ────────────────────────────────────────────── -->
      <div
        v-if="!statement.historical.rows.length && !statement.monthly.rows.length"
        class="mx-4 mt-4 rounded-xl border border-slate-200 bg-white py-16 text-center"
      >
        <div class="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100">
          <i class="far fa-inbox text-xl text-slate-300"></i>
        </div>
        <p class="mt-3 text-sm font-semibold text-slate-500">No PF data found</p>
        <p class="text-xs text-slate-400">
          {{ filterYear ? `No records for ${filterYear}.` : 'No historical or payroll PF records exist for this employee.' }}
        </p>
      </div>

      <!-- ── Grand total footer ─────────────────────────────────────── -->
      <div class="mx-4 my-4 overflow-hidden rounded-xl border border-indigo-200 bg-indigo-50">
        <div class="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
          <div>
            <div class="text-[10px] font-bold uppercase tracking-wider text-indigo-400">Grand Total</div>
            <div class="text-[11px] text-slate-500">
              Employee <span class="font-semibold font-mono text-slate-800">{{ formatCurrency(statement.summary.employee_total) }}</span>
              <span class="mx-1.5 text-slate-300">+</span>
              Employer <span class="font-semibold font-mono text-slate-800">{{ formatCurrency(statement.summary.employer_total) }}</span>
            </div>
          </div>
          <div class="text-right">
            <div class="text-[10px] text-indigo-400 uppercase font-semibold tracking-wide">Total Accumulated PF</div>
            <div class="text-2xl font-bold font-mono text-indigo-700">{{ formatCurrency(statement.summary.total_accumulated) }}</div>
          </div>
        </div>
      </div>

    </template>

    <!-- No data fallback -->
    <div v-else-if="!statementLoading" class="m-4 rounded-xl border border-slate-200 bg-white py-12 text-center text-sm text-slate-400">
      No statement data available.
    </div>

  </div>
</template>
