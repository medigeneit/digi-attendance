<script setup>
import { computed } from 'vue'
import { formatCurrency } from '@/utils/currency'

const props = defineProps({
  loan: { type: Object, required: true },
  // Optional: server-provided installments array
  installments: { type: Array, default: null },
})

const monthLabelFromAny = (value) => {
  if (value === null || value === undefined || value === '') return '-'
  const raw = String(value)
  if (/^\d{4}-\d{2}$/.test(raw)) return raw
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 7)
  const d = new Date(raw)
  if (!Number.isNaN(d.getTime())) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  }
  return raw
}

const toNumber = (v, fallback = 0) => {
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}

// Generate preview installments if not provided by server
const schedule = computed(() => {
  if (props.installments && props.installments.length) {
    return props.installments.map((inst, index) => {
      const no = inst.no ?? inst.serial ?? inst.installment_no ?? inst.sequence ?? index + 1
      const month = monthLabelFromAny(
        inst.month ??
          inst.installment_month ??
          inst.salary_month ??
          inst.due_month ??
          inst.payment_month ??
          inst.date,
      )
      const amount = toNumber(inst.amount ?? inst.installment_amount ?? inst.payable_amount)
      const remainingAfter = toNumber(
        inst.remaining_after ?? inst.remaining_balance ?? inst.balance,
      )

      return {
        ...inst,
        no,
        month,
        amount,
        remaining_after: remainingAfter,
      }
    })
  }

  const {
    loan_amount,
    installment_amount,
    total_installments,
    start_month,
    opening_paid_installments,
  } = props.loan
  if (!loan_amount || !installment_amount || !total_installments || !start_month) return []

  const result = []
  let remaining = parseFloat(loan_amount) || 0
  const [year, month] = start_month.split('-').map(Number)
  const total = parseInt(total_installments, 10)
  const openingPaid = Math.max(0, Math.min(parseInt(opening_paid_installments || 0, 10), total))

  for (let i = 0; i < total; i++) {
    const d = new Date(year, month - 1 + i, 1)
    const m = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const amount = Math.min(parseFloat(installment_amount) || 0, remaining)
    remaining = Math.max(0, remaining - amount)
    result.push({
      month: m,
      amount,
      remaining_after: remaining,
      no: i + 1,
      status: i < openingPaid ? 'Paid' : 'Pending',
    })
  }
  return result
})

const paid = computed(() => {
  return schedule.value.filter((i) =>
    ['paid', 'deducted'].includes(String(i.status || '').toLowerCase()),
  ).length
})

const showStatusColumn = computed(() => Boolean(props.installments) || paid.value > 0)

const isPaidInstallment = (status) =>
  ['paid', 'deducted'].includes(String(status || '').toLowerCase())
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-3">
      <h3 class="font-semibold text-blue-900">Installment Schedule</h3>
      <span v-if="showStatusColumn" class="text-xs text-gray-500">
        Paid: {{ paid }} / {{ schedule.length }}
      </span>
    </div>

    <div v-if="!schedule.length" class="text-center py-6 text-gray-400 text-sm">
      Fill in loan details to see installment preview.
    </div>

    <div v-else class="overflow-x-auto rounded-lg border border-gray-200">
      <table class="w-full text-sm">
        <thead>
          <tr class="bg-blue-50 text-blue-900 text-xs">
            <th class="px-3 py-2 text-center">#</th>
            <th class="px-3 py-2 text-left">Month</th>
            <th class="px-3 py-2 text-right">Installment</th>
            <th class="px-3 py-2 text-right">Remaining Balance</th>
            <th v-if="showStatusColumn" class="px-3 py-2 text-center">Status</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
          <tr
            v-for="inst in schedule"
            :key="`${inst.no}-${inst.month}`"
            class="hover:bg-gray-50 transition-colors"
            :class="isPaidInstallment(inst.status) ? 'bg-emerald-50/40' : ''"
          >
            <td class="px-3 py-2 text-center text-gray-500 text-xs">{{ inst.no || '—' }}</td>
            <td class="px-3 py-2 font-medium">{{ inst.month || '—' }}</td>
            <td class="px-3 py-2 text-right font-mono">{{ formatCurrency(inst.amount) }}</td>
            <td class="px-3 py-2 text-right font-mono text-gray-600">
              {{ formatCurrency(inst.remaining_after) }}
            </td>
            <td v-if="showStatusColumn" class="px-3 py-2 text-center">
              <span
                class="px-2 py-0.5 rounded-full text-xs border font-medium"
                :class="
                  isPaidInstallment(inst.status)
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-amber-50 text-amber-700 border-amber-200'
                "
              >
                {{ inst.status || 'pending' }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
