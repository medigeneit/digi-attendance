<script setup>
import { computed } from 'vue'
import { formatCurrency } from '@/utils/currency'

const props = defineProps({
  items: { type: Array, default: () => [] },
  mode: { type: String, default: 'regular' },
})

const isHalfSalaryAdvance = computed(() => props.mode === 'half_salary_advance' || props.mode === 'half_month' || props.mode === 'advance')
const isRegular = computed(() => !isHalfSalaryAdvance.value)

// Month name helper (ref_month = 1-12)
const monthName = (m) => m ? new Date(2000, m - 1).toLocaleString('en-US', { month: 'short' }) : ''

// Classify an adjustment as earning or deduction
const adjSide = (adj) => {
  const type = String(adj.adjustment_type || '').toLowerCase()
  if (type === 'deduction') return 'deduction'
  if (['paycut_reversal', 'overtime', 'bonus'].includes(type)) return 'earning'
  // 'other': positive = earning, negative = deduction
  return adj.amount >= 0 ? 'earning' : 'deduction'
}

const adjLabel = (adj) => {
  const type = String(adj.adjustment_type || '')
  const map = {
    paycut_reversal: 'Paycut Reversal',
    overtime:        'Overtime',
    bonus:           'Bonus',
    deduction:       'Deduction',
    other:           'Other',
  }
  const base = map[type] || type.replace(/_/g, ' ')
  const month = monthName(adj.ref_month)
  return month ? `${base} (${month})` : base
}

// Net adjustment impact per item (earning - deduction)
const adjNet = (item) =>
  (item.pending_adjustments || []).reduce((sum, adj) => {
    const side = adjSide(adj)
    return sum + (side === 'earning' ? Math.abs(adj.amount) : -Math.abs(adj.amount))
  }, 0)

const totals = computed(() =>
  props.items.reduce(
    (acc, item) => {
      acc.base              += Number(item.base_payable || 0)
      acc.arrear            += Number(item.arrear_amount || 0)
      acc.bonus             += Number(item.bonus || 0)
      acc.deductions        += Number(item.deductions?.total || 0)
      acc.advance_deduction += Number(item.deductions?.advance || 0)
      acc.advance           += Number(isHalfSalaryAdvance.value
        ? item.month_end_adjustable_amount || item.base_payable || 0
        : item.previous_advance_adjustment || 0)
      acc.nonAdjustableBonus += Number(isHalfSalaryAdvance.value ? item.non_adjustable_bonus_amount || item.bonus || 0 : 0)
      acc.net               += Number(item.net_payable || 0)
      acc.adjNet            += adjNet(item)
      return acc
    },
    { base: 0, arrear: 0, bonus: 0, deductions: 0, advance_deduction: 0, advance: 0, nonAdjustableBonus: 0, net: 0, adjNet: 0 },
  )
)

const hasAnyAdjustments = computed(() =>
  props.items.some(item => (item.pending_adjustments || []).length > 0)
)

defineExpose({ totals })
</script>

<template>
  <div class="overflow-x-auto">
    <table class="w-full min-w-[860px] text-xs">

      <!-- ── HEAD ──────────────────────────────────────────────── -->
      <thead>
        <tr class="bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500">
          <th class="px-2.5 py-2 text-left">#</th>
          <th class="px-2.5 py-2 text-left">Employee</th>
          <th class="px-2.5 py-2 text-right">
            {{ isHalfSalaryAdvance ? 'Salary Advance' : 'Base Payable' }}
          </th>
          <!-- Arrear — regular only -->
          <th v-if="isRegular" class="px-2.5 py-2 text-right text-emerald-600">
            <span class="inline-flex items-center gap-1">
              <i class="far fa-coins"></i> Arrear
            </span>
          </th>
          <th class="px-2.5 py-2 text-right">Bonus</th>
          <th class="px-2.5 py-2 text-right text-rose-600">Deductions</th>
          <!-- Merged adjustments column -->
          <th class="px-2.5 py-2 text-right text-amber-600">
            <span class="inline-flex items-center gap-1">
              <i class="far fa-adjust"></i>
              {{ isHalfSalaryAdvance ? 'Month-end Adj.' : 'Adjustments' }}
            </span>
          </th>
          <!-- Post-payroll adjustments column (only if any exist) -->
          <th v-if="hasAnyAdjustments" class="px-2.5 py-2 text-right text-violet-600">
            <span class="inline-flex items-center gap-1">
              <i class="far fa-layer-group"></i> Post Adj.
            </span>
          </th>
          <th v-if="isHalfSalaryAdvance" class="px-2.5 py-2 text-right text-emerald-600">Non-adj. Bonus</th>
          <th class="px-2.5 py-2 text-right font-bold text-blue-700">Net Payable</th>
          <th class="px-2.5 py-2 text-left">Warnings</th>
        </tr>
      </thead>

      <!-- ── BODY ──────────────────────────────────────────────── -->
      <tbody class="divide-y divide-slate-100">
        <tr
          v-for="(item, index) in items"
          :key="item.employee?.id ?? index"
          class="transition hover:bg-slate-50/80"
        >
          <td class="px-2.5 py-1.5 text-slate-400">{{ index + 1 }}</td>

          <!-- Employee -->
          <td class="px-2.5 py-1.5">
            <div class="font-semibold text-slate-900">{{ item.employee?.name || '-' }}</div>
            <div class="text-[10px] text-slate-400">{{ item.employee?.employee_id || '-' }}</div>
          </td>

          <!-- Base / Salary Advance -->
          <td class="px-2.5 py-1.5 text-right font-mono font-semibold text-slate-800">{{ formatCurrency(item.base_payable) }}</td>

          <!-- Arrear (regular only) -->
          <td v-if="isRegular" class="px-2.5 py-1.5 text-right font-mono">
            <span v-if="Number(item.arrear_amount) > 0" class="font-semibold text-emerald-600">
              +{{ formatCurrency(item.arrear_amount) }}
            </span>
            <span v-else class="text-slate-200">—</span>
          </td>

          <!-- Bonus -->
          <td class="px-2.5 py-1.5 text-right font-mono text-slate-700">{{ formatCurrency(item.bonus) }}</td>

          <!-- Deductions total -->
          <td class="px-2.5 py-1.5 text-right font-mono text-rose-700">{{ formatCurrency(item.deductions?.total) }}</td>

          <!-- Merged: Adjustments column -->
          <td class="px-2.5 py-1.5 text-right font-mono">
            <!-- Half mode: month-end adjustable amount -->
            <template v-if="isHalfSalaryAdvance">
              <span
                v-if="Number(item.month_end_adjustable_amount || item.base_payable) > 0"
                class="text-amber-700"
              >{{ formatCurrency(item.month_end_adjustable_amount || item.base_payable) }}</span>
              <span v-else class="text-slate-200">—</span>
            </template>

            <!-- Regular mode: adv deduct + prev adj stacked in one cell -->
            <template v-else>
              <div
                v-if="Number(item.deductions?.advance) > 0 || Number(item.previous_advance_adjustment) > 0"
                class="space-y-0.5"
              >
                <div v-if="Number(item.deductions?.advance) > 0" class="flex items-center justify-end gap-1">
                  <span class="rounded bg-rose-50 px-1 py-px text-[9px] font-bold uppercase text-rose-500">Adv</span>
                  <span class="text-rose-600">−{{ formatCurrency(item.deductions?.advance) }}</span>
                </div>
                <div v-if="Number(item.previous_advance_adjustment) > 0" class="flex items-center justify-end gap-1">
                  <span class="rounded bg-amber-50 px-1 py-px text-[9px] font-bold uppercase text-amber-500">½Adj</span>
                  <span class="text-amber-700">−{{ formatCurrency(item.previous_advance_adjustment) }}</span>
                </div>
              </div>
              <span v-else class="text-slate-200">—</span>
            </template>
          </td>

          <!-- Post-payroll adjustments -->
          <td v-if="hasAnyAdjustments" class="px-2.5 py-1.5 text-right">
            <div v-if="item.pending_adjustments?.length" class="space-y-0.5">
              <div
                v-for="(adj, ai) in item.pending_adjustments"
                :key="ai"
                class="flex items-center justify-end gap-1"
              >
                <span class="max-w-[90px] truncate text-[9px] font-semibold"
                  :class="adjSide(adj) === 'earning' ? 'text-emerald-500' : 'text-rose-500'"
                  :title="adjLabel(adj)"
                >{{ adjLabel(adj) }}</span>
                <span class="font-mono font-semibold"
                  :class="adjSide(adj) === 'earning' ? 'text-emerald-700' : 'text-rose-700'"
                >
                  {{ adjSide(adj) === 'earning' ? '+' : '−' }}{{ formatCurrency(Math.abs(adj.amount)) }}
                </span>
              </div>
            </div>
            <span v-else class="text-slate-200">—</span>
          </td>

          <!-- Non-adj bonus (half only) -->
          <td v-if="isHalfSalaryAdvance" class="px-2.5 py-1.5 text-right font-mono text-emerald-700">
            {{ formatCurrency(item.non_adjustable_bonus_amount || item.bonus) }}
          </td>

          <!-- Net Payable -->
          <td class="px-2.5 py-1.5 text-right font-mono font-bold text-blue-800">{{ formatCurrency(item.net_payable) }}</td>

          <!-- Warnings -->
          <td class="px-2.5 py-1.5">
            <span v-if="item.warnings?.length" class="text-amber-700">{{ item.warnings.join(', ') }}</span>
            <span v-else class="text-slate-300">—</span>
          </td>
        </tr>
      </tbody>

      <!-- ── FOOT ──────────────────────────────────────────────── -->
      <tfoot class="border-t-2 border-slate-200 bg-slate-50 text-[10px] font-bold">
        <tr>
          <td colspan="2" class="px-2.5 py-2 uppercase tracking-wider text-slate-400">Totals</td>
          <td class="px-2.5 py-2 text-right font-mono text-slate-800">{{ formatCurrency(totals.base) }}</td>

          <!-- Arrear total -->
          <td v-if="isRegular" class="px-2.5 py-2 text-right font-mono">
            <span v-if="totals.arrear > 0" class="text-emerald-600">+{{ formatCurrency(totals.arrear) }}</span>
            <span v-else class="text-slate-300">—</span>
          </td>

          <td class="px-2.5 py-2 text-right font-mono text-slate-700">{{ formatCurrency(totals.bonus) }}</td>
          <td class="px-2.5 py-2 text-right font-mono text-rose-700">{{ formatCurrency(totals.deductions) }}</td>

          <!-- Merged Adjustments total -->
          <td class="px-2.5 py-2 text-right font-mono">
            <template v-if="isHalfSalaryAdvance">
              <span v-if="totals.advance > 0" class="text-amber-700">{{ formatCurrency(totals.advance) }}</span>
              <span v-else class="text-slate-300">—</span>
            </template>
            <template v-else>
              <div v-if="totals.advance_deduction > 0 || totals.advance > 0" class="space-y-0.5">
                <div v-if="totals.advance_deduction > 0" class="flex items-center justify-end gap-1">
                  <span class="rounded bg-rose-50 px-1 py-px text-[9px] font-bold uppercase text-rose-500">Adv</span>
                  <span class="text-rose-600">−{{ formatCurrency(totals.advance_deduction) }}</span>
                </div>
                <div v-if="totals.advance > 0" class="flex items-center justify-end gap-1">
                  <span class="rounded bg-amber-50 px-1 py-px text-[9px] font-bold uppercase text-amber-500">½Adj</span>
                  <span class="text-amber-700">−{{ formatCurrency(totals.advance) }}</span>
                </div>
              </div>
              <span v-else class="text-slate-300">—</span>
            </template>
          </td>

          <!-- Post adj total -->
          <td v-if="hasAnyAdjustments" class="px-2.5 py-2 text-right font-mono">
            <span v-if="totals.adjNet !== 0"
              :class="totals.adjNet > 0 ? 'text-emerald-700' : 'text-rose-700'">
              {{ totals.adjNet > 0 ? '+' : '−' }}{{ formatCurrency(Math.abs(totals.adjNet)) }}
            </span>
            <span v-else class="text-slate-300">—</span>
          </td>

          <td v-if="isHalfSalaryAdvance" class="px-2.5 py-2 text-right font-mono text-emerald-700">{{ formatCurrency(totals.nonAdjustableBonus) }}</td>
          <td class="px-2.5 py-2 text-right font-mono text-blue-800">{{ formatCurrency(totals.net) }}</td>
          <td></td>
        </tr>
      </tfoot>

    </table>
  </div>
</template>
