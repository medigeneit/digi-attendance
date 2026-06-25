<script setup>
import { computed } from 'vue'
import PayrollStatusBadge from '@/components/payroll/PayrollStatusBadge.vue'
import { formatCurrency } from '@/utils/currency'

const props = defineProps({
  audit: { type: Object, default: null },
  loading: { type: Boolean, default: false },
})

const breakdownRows = computed(() => {
  const b = props.audit?.calculation_breakdown || {}
  return Object.entries(b).filter(([, value]) => !Array.isArray(value) && typeof value !== 'object')
})
</script>

<template>
  <div class="space-y-4">
    <div v-if="loading" class="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
      Loading audit trail...
    </div>
    <template v-else-if="audit">
      <div class="grid gap-3 md:grid-cols-3">
        <div class="rounded-2xl border border-slate-200 bg-white p-4">
          <p class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Batch</p>
          <p class="mt-2 font-semibold text-slate-900">#{{ audit.batch?.id || '-' }}</p>
          <p class="text-sm text-slate-500">{{ audit.batch?.salary_month || '-' }} &middot; {{ audit.batch?.salary_type || '-' }}</p>
        </div>
        <div class="rounded-2xl border border-slate-200 bg-white p-4">
          <p class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Payroll Mode</p>
          <p class="mt-2 font-semibold text-slate-900">{{ audit.payroll?.settlement_mode || audit.batch?.payroll_cycle || '-' }}</p>
        </div>
        <div class="rounded-2xl border border-slate-200 bg-white p-4">
          <p class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Status</p>
          <div class="mt-2"><PayrollStatusBadge :status="audit.payroll?.payment_status || audit.batch?.status" /></div>
        </div>
      </div>

      <div class="rounded-2xl border border-slate-200 bg-white p-4">
        <h3 class="font-semibold text-slate-900">Calculation Breakdown</h3>
        <div class="mt-3 grid gap-2 md:grid-cols-2">
          <div v-for="[key, value] in breakdownRows" :key="key" class="flex justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
            <span class="text-slate-500">{{ key.replace(/_/g, ' ') }}</span>
            <span class="font-medium text-slate-900">{{ value ?? '-' }}</span>
          </div>
        </div>
      </div>

      <div class="grid gap-4 lg:grid-cols-2">
        <div class="rounded-2xl border border-slate-200 bg-white p-4">
          <h3 class="font-semibold text-slate-900">Previous Advance Source</h3>
          <div v-if="audit.calculation_breakdown?.previous_advances?.length" class="mt-3 space-y-2">
            <div v-for="row in audit.calculation_breakdown.previous_advances" :key="`${row.source_payroll_id}-${row.amount}`" class="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
              <div class="flex justify-between gap-3">
                <span>{{ row.type }}</span>
                <span class="font-mono font-semibold">{{ formatCurrency(row.amount) }}</span>
              </div>
              <p class="mt-1 text-xs">Payroll #{{ row.source_payroll_id }} &middot; Batch #{{ row.source_batch_id }}</p>
            </div>
          </div>
          <p v-else class="mt-3 text-sm text-slate-400">No previous advance source.</p>
        </div>

        <div class="rounded-2xl border border-slate-200 bg-white p-4">
          <h3 class="font-semibold text-slate-900">Bonus Source</h3>
          <div v-if="audit.bonus_entry_source?.length" class="mt-3 space-y-2">
            <div v-for="row in audit.bonus_entry_source" :key="row.id" class="rounded-lg bg-blue-50 p-3 text-sm text-blue-900">
              <div class="flex justify-between gap-3">
                <span>{{ row.bonus_type || row.source || 'Bonus' }}</span>
                <span class="font-mono font-semibold">{{ formatCurrency(row.amount) }}</span>
              </div>
              <p class="mt-1 text-xs">{{ row.reason || '-' }}</p>
            </div>
          </div>
          <p v-else class="mt-3 text-sm text-slate-400">No bonus source.</p>
        </div>
      </div>

      <div class="rounded-2xl border border-slate-200 bg-white p-4">
        <h3 class="font-semibold text-slate-900">Ledger Entries</h3>
        <div class="mt-3 overflow-x-auto">
          <table class="min-w-[720px] w-full text-sm">
            <thead class="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th class="px-3 py-2 text-left">Type</th>
                <th class="px-3 py-2 text-left">Code</th>
                <th class="px-3 py-2 text-right">Amount</th>
                <th class="px-3 py-2 text-left">Direction</th>
                <th class="px-3 py-2 text-left">Source</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr v-for="entry in audit.ledger_entries || []" :key="entry.id">
                <td class="px-3 py-2">{{ entry.entry_type }}</td>
                <td class="px-3 py-2 font-semibold">{{ entry.code }}</td>
                <td class="px-3 py-2 text-right font-mono">{{ formatCurrency(entry.amount) }}</td>
                <td class="px-3 py-2">{{ entry.direction }}</td>
                <td class="px-3 py-2 text-xs text-slate-500">{{ entry.source_type || '-' }} #{{ entry.source_id || '-' }}</td>
              </tr>
              <tr v-if="!(audit.ledger_entries || []).length">
                <td colspan="5" class="px-3 py-6 text-center text-slate-400">No ledger entries.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="rounded-2xl border border-slate-200 bg-white p-4">
        <h3 class="font-semibold text-slate-900">Status Timeline</h3>
        <div class="mt-3 space-y-2">
          <div v-for="row in audit.status_history || []" :key="`${row.type}-${row.status}-${row.created_at}`" class="flex items-start gap-3 rounded-lg bg-slate-50 p-3 text-sm">
            <span class="mt-1 h-2 w-2 rounded-full bg-blue-500"></span>
            <div>
              <p class="font-medium text-slate-900">{{ row.status }}</p>
              <p class="text-xs text-slate-500">{{ row.created_at }} <span v-if="row.note">- {{ row.note }}</span></p>
            </div>
          </div>
          <p v-if="!(audit.status_history || []).length" class="text-sm text-slate-400">No timeline entries.</p>
        </div>
      </div>
    </template>
  </div>
</template>
