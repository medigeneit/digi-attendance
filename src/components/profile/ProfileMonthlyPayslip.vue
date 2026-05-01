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
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num)
}

const formatDate = (value) => {
  if (!value) return '-'

  const source = String(value).slice(0, 10)
  const date = /^\d{4}-\d{2}-\d{2}$/.test(source)
    ? new Date(`${source}T00:00:00`)
    : new Date(value)

  if (Number.isNaN(date.getTime())) return String(value)

  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(date)
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

const numberToWords = (value) => {
  const n = Math.floor(Math.abs(toNumber(value)))
  if (!n) return 'Zero Only'

  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine']
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']

  const chunkToWords = (num) => {
    let out = ''
    const hundred = Math.floor(num / 100)
    const rest = num % 100

    if (hundred) {
      out += `${ones[hundred]} Hundred`
      if (rest) out += ' '
    }

    if (rest >= 20) {
      out += tens[Math.floor(rest / 10)]
      if (rest % 10) out += ` ${ones[rest % 10]}`
    } else if (rest >= 10) {
      out += teens[rest - 10]
    } else if (rest > 0) {
      out += ones[rest]
    }

    return out
  }

  const parts = []
  const crore = Math.floor(n / 10000000)
  const lakh = Math.floor((n % 10000000) / 100000)
  const thousand = Math.floor((n % 100000) / 1000)
  const remainder = n % 1000

  if (crore) parts.push(`${chunkToWords(crore)} Crore`)
  if (lakh) parts.push(`${chunkToWords(lakh)} Lakh`)
  if (thousand) parts.push(`${chunkToWords(thousand)} Thousand`)
  if (remainder) parts.push(chunkToWords(remainder))

  return `${parts.join(' ')} Only`
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

const contraEntries = computed(() => {
  const preferred = currentPayroll.value?.contra_entries
  if (Array.isArray(preferred)) return preferred

  const rows = Array.isArray(currentPayroll.value?.other_allowance_breakdown)
    ? currentPayroll.value.other_allowance_breakdown
    : []

  return rows.filter((row) => row?.type === 'contra_entry')
})

const contraEarningTotal = computed(() =>
  contraEntries.value
    .filter((row) => row?.side === 'earning')
    .reduce((sum, row) => sum + toNumber(row?.amount), 0),
)

const contraDeductionTotal = computed(() =>
  contraEntries.value
    .filter((row) => row?.side === 'deduction')
    .reduce((sum, row) => sum + toNumber(row?.amount), 0),
)

const contraEarningRows = computed(() =>
  contraEntries.value
    .filter((row) => row?.side === 'earning')
    .map((row, index) => ({
      label: row.label || 'Manual Adj',
      value: row.amount,
      key: `contra-earning-${row.ref || row.label || index}`,
    })),
)

const contraDeductionRows = computed(() =>
  contraEntries.value
    .filter((row) => row?.side === 'deduction')
    .map((row, index) => ({
      label: row.label || 'Adj Recovery',
      value: row.amount,
      key: `contra-deduction-${row.ref || row.label || index}`,
    })),
)

const earningRows = computed(() => {
  if (!currentPayroll.value) return []

  const payroll = currentPayroll.value
  const manualAdditionBase = Math.max(0, toNumber(payroll.manual_addition) - contraEarningTotal.value)
  const rows = [
    { label: 'Basic Salary', value: payroll.basic_salary },
    { label: 'House Rent', value: payroll.house_rent },
    { label: 'Medical', value: payroll.medical_allowance },
    { label: 'Conveyance', value: payroll.conveyance_allowance },
  ]

  const allowanceTotal = toNumber(payroll.other_allowance_total)
  rows.push({ label: 'Other Allowance', value: allowanceTotal })

  if (manualAdditionBase > 0) rows.push({ label: 'Manual Addition', value: manualAdditionBase })

  rows.push(...contraEarningRows.value)

  return rows
})

const deductionRows = computed(() => {
  if (!currentPayroll.value) return []

  const payroll = currentPayroll.value
  const otherDeductionBase = Math.max(0, toNumber(payroll.other_deduction) - contraDeductionTotal.value)
  const securityMoneyDeduction = toNumber(payroll.security_money_deduction)
  const rows = [
    {
      label: 'PF Both',
      value: toNumber(payroll.pf_deduction) + toNumber(payroll.pf_allowance_deduction_total),
    },
    { label: 'Meal Deduction', value: payroll.meal_deduction },
    { label: 'Tax', value: payroll.tax_deduction },
    { label: 'Loan', value: payroll.loan_deduction },
    ...(securityMoneyDeduction > 0 ? [{ label: 'Security Money', value: securityMoneyDeduction }] : []),
    { label: 'Others', value: otherDeductionBase },
    { label: 'Advance', value: payroll.advance_deduction },
    { label: 'Paycut', value: payroll.paycut_deduction },
  ]

  rows.push(...contraDeductionRows.value)

  return rows
})

const totalEarnings = computed(() => earningRows.value.reduce((sum, item) => sum + toNumber(item.value), 0))

const totalDeductions = computed(() => {
  if (currentPayroll.value?.total_deduction !== undefined && currentPayroll.value?.total_deduction !== null) {
    return toNumber(currentPayroll.value.total_deduction)
  }

  return deductionRows.value.reduce((sum, item) => sum + toNumber(item.value), 0)
})

const netPayment = computed(() => toNumber(currentPayroll.value?.net_salary))

const salaryTableRowCount = computed(() =>
  Math.max(earningRows.value.length, deductionRows.value.length),
)

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
  currentPayroll.value?.departm32t_name || props.user?.department?.name || '-',
)
const companyName = computed(() =>
  currentPayroll.value?.company?.name || currentPayroll.value?.company_name || props.user?.company?.name || 'DigitGate IT',
)
const joiningDate = computed(() =>
  currentPayroll.value?.joining_date || currentPayroll.value?.user?.joining_date || props.user?.joining_date || '',
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
    class="bg-slate-100 px-2 py-3 print:bg-white print:p-0 dark:bg-slate-950"
  >
    <div v-if="currentPayroll" class="mx-auto max-w-[760px] bg-white ring-1 ring-slate-300 print:max-w-none print:shadow-none print:ring-0">
      <div class="p-4 print:p-0">
        <div class="salary-paper mx-auto">
          <div class="text-center">
            <div class="text-[14px] font-medium text-slate-700">{{ companyName }}</div>
            <div class="mt-0.5 text-[12px] text-slate-600">System generated payslip</div>
          </div>

          <div class="salary-info-grid mt-6 text-[13px] text-slate-800">
            <div class="space-y-1">
              <div class="flex gap-2">
                <span class="w-28 text-slate-600">Employee name</span>
                <span>: {{ employeeName }}</span>
              </div>
              <div class="flex gap-2">
                <span class="w-28 text-slate-600">Designation</span>
                <span>: {{ designation }}</span>
              </div>
              <div class="flex gap-2">
                <span class="w-28 text-slate-600">Department</span>
                <span>: {{ department }}</span>
              </div>
            </div>
            <div class="space-y-1">
              <div class="flex gap-2">
                <span class="w-28 text-slate-600">Date of Joining</span>
                <span>: {{ formatDate(joiningDate) }}</span>
              </div>
              <div class="flex gap-2">
                <span class="w-28 text-slate-600">Pay Period</span>
                <span>: {{ slipTitle }}</span>
              </div>
              <div class="flex gap-2">
                <span class="w-28 text-slate-600">Employee ID</span>
                <span>: {{ employeeId }}</span>
              </div>
            </div>
          </div>

          <div class="mt-5 overflow-hidden border border-slate-700">
            <table class="salary-slip-table w-full border-collapse text-[12px]">
              <thead>
                <tr class="bg-slate-100 text-slate-900">
                  <th class="border border-slate-700 px-2.5 py-1.5 text-center font-semibold">Earnings</th>
                  <th class="border border-slate-700 px-2.5 py-1.5 text-center font-semibold">Amount</th>
                  <th class="border border-slate-700 px-2.5 py-1.5 text-center font-semibold">Deductions</th>
                  <th class="border border-slate-700 px-2.5 py-1.5 text-center font-semibold">Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="index in salaryTableRowCount" :key="index">
                  <td class="border border-slate-700 px-2.5 py-1.5">{{ earningRows[index - 1]?.label || '' }}</td>
                  <td class="border border-slate-700 px-2.5 py-1.5 text-right font-mono font-semibold">
                    {{ earningRows[index - 1] ? formatMoney(earningRows[index - 1].value) : '' }}
                  </td>
                  <td class="border border-slate-700 px-2.5 py-1.5">{{ deductionRows[index - 1]?.label || '' }}</td>
                  <td class="border border-slate-700 px-2.5 py-1.5 text-right font-mono font-semibold">
                    {{ deductionRows[index - 1] ? formatMoney(deductionRows[index - 1].value) : '' }}
                  </td>
                </tr>
                <tr class="font-semibold">
                  <td class="border border-slate-700 px-2.5 py-1.5 text-right">Total Earnings</td>
                  <td class="border border-slate-700 px-2.5 py-1.5 text-right font-mono">
                    {{ formatMoney(totalEarnings) }}
                  </td>
                  <td class="border border-slate-700 px-2.5 py-1.5 text-right">Total Deductions</td>
                  <td class="border border-slate-700 px-2.5 py-1.5 text-right font-mono">
                    {{ formatMoney(totalDeductions) }}
                  </td>
                </tr>
                <tr class="font-semibold">
                  <td class="border border-slate-700 px-2.5 py-1.5 text-right" colspan="3">Net Pay</td>
                  <td class="border border-slate-700 px-2.5 py-1.5 text-right font-mono">
                    {{ formatMoney(netPayment) }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="mt-4">
            <div class="w-3/4 text-left">
              <div class="text-[14px] font-semibold text-slate-800">{{ numberToWords(netPayment) }}</div>
              <div class="mt-1 text-[15px] font-bold text-slate-600">{{ formatMoney(netPayment) }}</div>
            </div>
          </div>

          <div class="mt-6 border-t border-slate-200 pt-2 text-center text-xs text-slate-600">
            Payment Method: {{ paymentMethod }}<span v-if="bankDetails"> | {{ bankDetails }}</span>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="mx-auto max-w-[820px] rounded-xl bg-white px-5 py-12 text-center text-sm text-slate-600 shadow-sm dark:bg-slate-900 dark:text-slate-400">
      No payroll sheet found
      <span v-if="selectedMonth">for {{ formatMonth(selectedMonth) }}</span>.
      Generate payroll for that month to show the salary sheet here.
    </div>
  </section>
</template>

<style scoped>
.salary-paper {
  width: 172mm;
  min-height: 190mm;
  padding: 5mm;
  color: #111827;
}

.salary-info-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0 10mm;
}

.salary-slip-table {
  table-layout: fixed;
}

.salary-slip-table th,
.salary-slip-table td {
  word-break: break-word;
}

@media (max-width: 767px) {
  .salary-paper {
    width: 100%;
    min-height: auto;
    padding: 16px 0 0;
  }

  .salary-info-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }
}

@media print {
  .salary-paper {
    width: auto;
    min-height: auto;
    padding: 0;
  }

  .salary-info-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
