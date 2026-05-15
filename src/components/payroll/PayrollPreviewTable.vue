<script setup>
import { computed } from 'vue'
import { formatCurrency } from '@/utils/currency'

const props = defineProps({
  items: { type: Array, default: () => [] },
  mode: { type: String, default: 'regular' },
})

const isHalfSalaryAdvance = computed(() => props.mode === 'half_salary_advance' || props.mode === 'half_month' || props.mode === 'advance')

const totals = computed(() =>
  props.items.reduce(
    (acc, item) => {
      acc.base += Number(item.base_payable || 0)
      acc.bonus += Number(item.bonus || 0)
      acc.deductions += Number(item.deductions?.total || 0)
      acc.advance += Number(isHalfSalaryAdvance.value ? item.month_end_adjustable_amount || item.base_payable || 0 : item.previous_advance_adjustment || 0)
      acc.nonAdjustableBonus += Number(isHalfSalaryAdvance.value ? item.non_adjustable_bonus_amount || item.bonus || 0 : 0)
      acc.net += Number(item.net_payable || 0)
      return acc
    },
    { base: 0, bonus: 0, deductions: 0, advance: 0, nonAdjustableBonus: 0, net: 0 },
  )
)

defineExpose({ totals })
</script>

<template>
  <div class="overflow-hidden rounded-2xl border border-slate-200 bg-white">
    <div class="overflow-x-auto">
      <table class="min-w-[980px] w-full text-sm">
        <thead class="bg-slate-50 text-xs uppercase text-slate-600">
          <tr>
            <th class="px-3 py-3 text-left">Employee</th>
            <th class="px-3 py-3 text-right">Gross Salary</th>
            <th class="px-3 py-3 text-right">{{ isHalfSalaryAdvance ? 'Salary Advance' : 'Base Payable' }}</th>
            <th class="px-3 py-3 text-right">Bonus</th>
            <th class="px-3 py-3 text-right">Deductions</th>
            <th class="px-3 py-3 text-right">{{ isHalfSalaryAdvance ? 'Month-end Adjustable Amount' : 'Previous Advance Adjustment' }}</th>
            <th v-if="isHalfSalaryAdvance" class="px-3 py-3 text-right">Non-adjustable Bonus</th>
            <th class="px-3 py-3 text-right">Net Payable</th>
            <th class="px-3 py-3 text-left">Warnings</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          <tr v-for="item in items" :key="item.employee?.id" class="hover:bg-slate-50">
            <td class="px-3 py-3">
              <div class="font-semibold text-slate-900">{{ item.employee?.name || '-' }}</div>
              <div class="text-xs text-slate-500">{{ item.employee?.employee_id || '-' }}</div>
            </td>
            <td class="px-3 py-3 text-right font-mono">{{ formatCurrency(item.gross) }}</td>
            <td class="px-3 py-3 text-right font-mono">{{ formatCurrency(item.base_payable) }}</td>
            <td class="px-3 py-3 text-right font-mono">{{ formatCurrency(item.bonus) }}</td>
            <td class="px-3 py-3 text-right font-mono text-rose-700">{{ formatCurrency(item.deductions?.total) }}</td>
            <td class="px-3 py-3 text-right font-mono text-amber-700">{{ formatCurrency(isHalfSalaryAdvance ? item.month_end_adjustable_amount || item.base_payable : item.previous_advance_adjustment) }}</td>
            <td v-if="isHalfSalaryAdvance" class="px-3 py-3 text-right font-mono text-emerald-700">{{ formatCurrency(item.non_adjustable_bonus_amount || item.bonus) }}</td>
            <td class="px-3 py-3 text-right font-mono font-bold text-blue-800">{{ formatCurrency(item.net_payable) }}</td>
            <td class="px-3 py-3 text-xs text-amber-700">
              <span v-if="item.warnings?.length">{{ item.warnings.join(', ') }}</span>
              <span v-else class="text-slate-400">-</span>
            </td>
          </tr>
        </tbody>
        <tfoot class="bg-slate-50 font-semibold">
          <tr>
            <td class="px-3 py-3 text-right">Totals</td>
            <td></td>
            <td class="px-3 py-3 text-right font-mono">{{ formatCurrency(totals.base) }}</td>
            <td class="px-3 py-3 text-right font-mono">{{ formatCurrency(totals.bonus) }}</td>
            <td class="px-3 py-3 text-right font-mono text-rose-700">{{ formatCurrency(totals.deductions) }}</td>
            <td class="px-3 py-3 text-right font-mono text-amber-700">{{ formatCurrency(totals.advance) }}</td>
            <td v-if="isHalfSalaryAdvance" class="px-3 py-3 text-right font-mono text-emerald-700">{{ formatCurrency(totals.nonAdjustableBonus) }}</td>
            <td class="px-3 py-3 text-right font-mono text-blue-800">{{ formatCurrency(totals.net) }}</td>
            <td></td>
          </tr>
        </tfoot>
      </table>
    </div>
  </div>
</template>
