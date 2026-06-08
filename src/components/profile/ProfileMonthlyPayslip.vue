<script setup>
import { computed, ref, watch } from 'vue'

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
  const num = Math.round(toNumber(value))

  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num)
}

const formatPercent = (value) => {
  const amount = toNumber(value)
  if (!amount) return '0%'

  return `${new Intl.NumberFormat('en-US', {
    minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amount)}%`
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
  const n = Math.round(Math.abs(toNumber(value)))
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

const payrollCycle = (payroll) =>
  String(payroll?.payroll_cycle || payroll?.settlement_mode || payroll?.calculation_breakdown?.cycle || 'regular').toLowerCase()

const cycleLabel = (payroll) => {
  if (payroll?.payroll_cycle_label) return payroll.payroll_cycle_label

  const cycle = payrollCycle(payroll)
  if (['half_salary_advance', 'half_month', 'advance'].includes(cycle)) return 'Half Salary Advance'
  if (cycle === 'bonus_only') return 'Bonus Only'
  if (cycle === 'final_settlement') return 'Final Settlement'

  return 'Regular Monthly'
}

const cycleSort = (payroll) => {
  const cycle = payrollCycle(payroll)
  if (cycle === 'regular') return 1
  if (['half_salary_advance', 'half_month', 'advance'].includes(cycle)) return 2
  if (cycle === 'bonus_only') return 3
  if (cycle === 'final_settlement') return 4
  return 9
}

// const paymentStatusClass = (status) => {
//   const normalized = String(status || '').toLowerCase()

//   if (normalized === 'paid') return 'border-emerald-300 bg-emerald-100 text-emerald-800'
//   if (normalized === 'partial') return 'border-amber-300 bg-amber-100 text-amber-800'
//   if (normalized === 'pending') return 'border-rose-300 bg-rose-100 text-rose-800'

//   return 'border-stone-300 bg-stone-100 text-stone-700'
// }

const selectedPayrollId = ref('')

const slipPayrolls = computed(() => {
  const items = Array.isArray(props.payrolls) ? props.payrolls : []

  return [...items].sort((a, b) => cycleSort(a) - cycleSort(b) || Number(b.id || 0) - Number(a.id || 0))
})

watch(
  slipPayrolls,
  (items) => {
    if (!items.length) {
      selectedPayrollId.value = ''
      return
    }

    if (items.some((item) => String(item.id) === String(selectedPayrollId.value))) return

    const regular = items.find((item) => payrollCycle(item) === 'regular' || String(item.salary_type || '').toLowerCase() === 'monthly')
    selectedPayrollId.value = String((regular || items[0]).id)
  },
  { immediate: true },
)

const currentPayroll = computed(() => {
  if (!slipPayrolls.value.length) return null

  if (selectedPayrollId.value) {
    const selected = slipPayrolls.value.find((item) => String(item.id) === String(selectedPayrollId.value))
    if (selected) return selected
  }

  return slipPayrolls.value[0]
})

const currentMonth = computed(() => monthKey(currentPayroll.value?.salary_month || props.selectedMonth))

// const currentMeal = computed(() => {
//   if (!currentMonth.value) return null

//   return (props.meals || []).find((item) => monthKey(item.salary_month) === currentMonth.value) || null
// })

// const monthInstallments = computed(() => {
//   if (!currentMonth.value) return []

//   return (props.loans || []).flatMap((loan) =>
//     (loan.installments || [])
//       .filter((item) => monthKey(item.salary_month) === currentMonth.value)
//       .map((item) => ({
//         ...item,
//         loan_title: loan.loan_title,
//         remaining_balance: loan.remaining_balance,
//       })),
//   )
// })

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

const pfAllowanceTotal = computed(() => {
  const payroll = currentPayroll.value
  if (!payroll) return 0

  return toNumber(payroll.pf_allowance_total ?? payroll.pf_allowance_deduction_total)
})

const grossSalary = computed(() => {
  const payroll = currentPayroll.value
  if (!payroll) return 0

  return toNumber(payroll.gross_salary)
})

const currentCycle = computed(() => payrollCycle(currentPayroll.value))
const isAdvanceCycle = computed(() => ['half_salary_advance', 'half_month', 'advance'].includes(currentCycle.value))
const isBonusOnlyCycle = computed(() => currentCycle.value === 'bonus_only')
const grossReferenceAmount = computed(() =>
  toNumber(
    currentPayroll.value?.gross_reference_amount
      ?? currentPayroll.value?.monthly_gross_salary
      ?? currentPayroll.value?.calculation_breakdown?.gross_salary
      ?? currentPayroll.value?.gross_salary,
  ),
)
const salaryAdvancePayable = computed(() =>
  toNumber(currentPayroll.value?.base_payable_amount ?? currentPayroll.value?.advance_paid_amount ?? currentPayroll.value?.basic_salary),
)
const bonusAmount = computed(() =>
  toNumber(currentPayroll.value?.bonus_amount ?? currentPayroll.value?.calculation_breakdown?.bonus_amount ?? currentPayroll.value?.calculation_breakdown?.additions?.bonus),
)
const advancePercentage = computed(() => {
  const configured = currentPayroll.value?.advance_percentage ?? currentPayroll.value?.salary_percentage ?? currentPayroll.value?.calculation_breakdown?.salary_percentage
  if (configured !== null && configured !== undefined && configured !== '') return toNumber(configured)

  return grossReferenceAmount.value > 0 ? (salaryAdvancePayable.value / grossReferenceAmount.value) * 100 : 0
})
const salaryAdvanceLabel = computed(() =>
  advancePercentage.value > 0
    ? `Advance Payable (${formatPercent(advancePercentage.value)} of Gross)`
    : 'Advance Payable',
)
const advanceAdjustedAmount = computed(() =>
  toNumber(currentPayroll.value?.advance_adjusted_amount ?? currentPayroll.value?.calculation_breakdown?.advance_adjusted_amount),
)
const attendanceDeductionAmount = computed(() => {
  const paycutAmount = toNumber(currentPayroll.value?.paycut_deduction)
  if (advanceAdjustedAmount.value > 0 && Math.abs(paycutAmount - advanceAdjustedAmount.value) < 1) {
    return 0
  }

  return paycutAmount
})

const earningRows = computed(() => {
  if (!currentPayroll.value) return []

  const payroll = currentPayroll.value

  if (isAdvanceCycle.value) {
    return [
      ...(grossReferenceAmount.value > 0
        ? [{ label: 'Gross Salary (Reference)', value: grossReferenceAmount.value, reference: true }]
        : []),
      { label: salaryAdvanceLabel.value, value: salaryAdvancePayable.value, highlight: true },
      ...(bonusAmount.value > 0 ? [{ label: 'Bonus', value: bonusAmount.value }] : []),
    ]
  }

  if (isBonusOnlyCycle.value) {
    return [{ label: 'Bonus', value: bonusAmount.value, highlight: true }]
  }

  const manualAdditionBase = Math.max(0, toNumber(payroll.manual_addition) - contraEarningTotal.value)
  const rows = [
    { label: 'Basic Salary', value: payroll.basic_salary, totalable: false },
    { label: 'House Rent', value: payroll.house_rent, totalable: false },
    { label: 'Medical', value: payroll.medical_allowance, totalable: false },
    { label: 'Conveyance', value: payroll.conveyance_allowance, totalable: false },
    { label: 'Gross', value: grossSalary.value, highlight: true, totalable: true },
  ]

  const otherAllowanceTotal = toNumber(payroll.other_allowance_display_total ?? payroll.other_allowance_total)

  rows.push({ label: 'Others Allowance', value: otherAllowanceTotal, totalable: true })
  if (pfAllowanceTotal.value > 0) {
    rows.push({ label: 'PF Allowance', value: pfAllowanceTotal.value, totalable: true })
  }
  if (bonusAmount.value > 0) rows.push({ label: 'Bonus', value: bonusAmount.value, totalable: true })
  rows.push({ label: 'Arrear', value: toNumber(payroll.arrear), totalable: true })


  if (manualAdditionBase > 0) rows.push({ label: 'Manual Addition', value: manualAdditionBase, totalable: true })

  rows.push(...contraEarningRows.value)

  return rows
})

const deductionRows = computed(() => {
  if (!currentPayroll.value) return []

  const payroll = currentPayroll.value
  if (isAdvanceCycle.value || isBonusOnlyCycle.value) return []

  const otherDeductionBase = Math.max(0, toNumber(payroll.other_deduction) - contraDeductionTotal.value)
  const securityMoneyDeduction = toNumber(payroll.security_money_deduction)
  const rows = [
    {
      label: 'PF Both',
      value: toNumber(payroll.pf_deduction),
    },
    { label: 'Meal Deduction', value: payroll.meal_deduction },
    { label: 'Tax', value: payroll.tax_deduction },
    { label: 'Loan', value: payroll.loan_deduction },
    ...(securityMoneyDeduction > 0 ? [{ label: 'Security Money', value: securityMoneyDeduction }] : []),
    { label: 'Others', value: otherDeductionBase },
    ...(advanceAdjustedAmount.value > 0 ? [{ label: 'Half Salary Advance Adjustment', value: advanceAdjustedAmount.value }] : []),
    { label: 'Advance', value: payroll.advance_deduction },
    { label: 'Attendance Deduction', value: attendanceDeductionAmount.value },
  ]

  rows.push(...contraDeductionRows.value)

  return rows
})

const totalEarnings = computed(() => {
  const payroll = currentPayroll.value
  if (!payroll) return 0

  if (isAdvanceCycle.value || isBonusOnlyCycle.value) {
    return earningRows.value.reduce((sum, item) => sum + (item.reference ? 0 : toNumber(item.value)), 0)
  }

  return earningRows.value.reduce((sum, item) => {
    if (item.totalable === false || item.reference) return sum
    return sum + toNumber(item.value)
  }, 0)
})

const totalDeductions = computed(() => {
  if (isAdvanceCycle.value || isBonusOnlyCycle.value) return 0

  return deductionRows.value.reduce((sum, item) => sum + toNumber(item.value), 0)
})

const netPayment = computed(() => toNumber(currentPayroll.value?.net_salary))

const salaryTableRowCount = computed(() =>
  Math.max(earningRows.value.length, deductionRows.value.length),
)

const slipTitle = computed(() => {
  if (currentPayroll.value?.slip_title) return currentPayroll.value.slip_title
  if (isAdvanceCycle.value) return 'Half Salary Advance Slip'
  if (isBonusOnlyCycle.value) return 'Bonus Payment Slip'

  return 'Payroll Cash Slip'
})

const payPeriodLabel = computed(() => {
  if (currentPayroll.value?.period_start && currentPayroll.value?.period_end) {
    return `${formatDate(currentPayroll.value.period_start)} - ${formatDate(currentPayroll.value.period_end)}`
  }

  return currentPayroll.value?.pay_period || formatMonth(currentPayroll.value?.salary_month || props.selectedMonth)
})

const employeeName = computed(() => currentPayroll.value?.employee_name || props.user?.name || '-')
const employeeId = computed(() => currentPayroll.value?.employee_code || props.user?.employee_id || '-')
const designation = computed(() =>
  currentPayroll.value?.designation_name || props.user?.designation?.title || props.user?.post || '-',
)
const department = computed(() =>
  currentPayroll.value?.department_name || props.user?.department?.name || '-',
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
    <div v-if="currentPayroll" class="mx-auto max-w-[760px] bg-white shadow-lg ring-1 ring-slate-200 print:max-w-none print:shadow-none print:ring-0">
      <div class="p-4 print:p-0 sm:p-5">
        <div
          v-if="slipPayrolls.length > 1"
          class="mb-3 flex flex-wrap gap-1.5 print:hidden"
        >
          <button
            v-for="payroll in slipPayrolls"
            :key="payroll.id"
            type="button"
            class="rounded-md border px-3 py-1.5 text-xs font-medium transition"
            :class="String(payroll.id) === String(selectedPayrollId)
              ? 'border-blue-500 bg-blue-50 text-blue-700'
              : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'"
            @click="selectedPayrollId = String(payroll.id)"
          >
            {{ payroll.slip_title || cycleLabel(payroll) }}
          </button>
        </div>
        <div class="salary-paper mx-auto">
          <div class="salary-header">
            <div>
              <div class="text-[15px] font-semibold text-slate-900">{{ companyName }}</div>
              <div class="mt-0.5 text-[12px] text-slate-500">{{ slipTitle }} | {{ payPeriodLabel }}</div>
            </div>
            <div class="net-summary">
              <span class="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">Net Payment</span>
              <strong class="font-mono text-[18px] text-slate-900">{{ formatMoney(netPayment) }}</strong>
            </div>
          </div>

          <div class="salary-info-grid mt-4 text-[12px] text-slate-800">
            <div class="space-y-0.5">
              <div class="salary-info-row">
                <span class="salary-info-label text-slate-600">Employee name</span>
                <span>: {{ employeeName }}</span>
              </div>
              <div class="salary-info-row">
                <span class="salary-info-label text-slate-600">Date of Joining</span>
                <span>: {{ formatDate(joiningDate) }}</span>
              </div>
              <div class="salary-info-row">
                <span class="salary-info-label text-slate-600">Employee ID</span>
                <span>: {{ employeeId }}</span>
              </div>
            </div>
            <div class="space-y-0.5">
              <div class="salary-info-row">
                <span class="salary-info-label text-slate-600">Designation</span>
                <span>: {{ designation }}</span>
              </div>
              <div class="salary-info-row">
                <span class="salary-info-label text-slate-600">Department</span>
                <span>: {{ department }}</span>
              </div>
              <div class="salary-info-row">
                <span class="salary-info-label text-slate-600">Payroll Type</span>
                <span>: {{ cycleLabel(currentPayroll) }}</span>
              </div>
            </div>
          </div>

          <div class="mt-4 overflow-hidden border border-slate-700">
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
                  <td
                    class="border border-slate-700 px-2.5 py-1.5"
                    :class="[
                      earningRows[index - 1]?.highlight ? 'bg-slate-100 font-semibold' : '',
                      earningRows[index - 1]?.reference ? 'text-slate-600' : '',
                    ]"
                  >
                    {{ earningRows[index - 1]?.label || '' }}
                  </td>
                  <td
                    class="border border-slate-700 px-2.5 py-1.5 text-right font-mono font-semibold"
                    :class="[
                      earningRows[index - 1]?.highlight ? 'bg-slate-100' : '',
                      earningRows[index - 1]?.reference ? 'text-slate-600' : '',
                    ]"
                  >
                    {{ earningRows[index - 1] ? formatMoney(earningRows[index - 1].value) : '' }}
                  </td>
                  <td class="border border-slate-700 px-2.5 py-1.5">{{ deductionRows[index - 1]?.label || '' }}</td>
                  <td class="border border-slate-700 px-2.5 py-1.5 text-right font-mono font-semibold">
                    {{ deductionRows[index - 1] ? formatMoney(deductionRows[index - 1].value) : '' }}
                  </td>
                </tr>
                <tr class="bg-slate-50 font-semibold">
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
                  <td class="border border-slate-700 px-2.5 py-1.5 text-right" colspan="3">Net Payment</td>
                  <td class="border border-slate-700 px-2.5 py-1.5 text-right font-mono">
                    {{ formatMoney(netPayment) }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="salary-footer mt-4">
            <div class="min-w-0">
              <div class="text-[12px] font-semibold text-slate-800">{{ numberToWords(netPayment) }}</div>
              <div class="mt-0.5 text-[11px] text-slate-500">
                Payment Method: {{ paymentMethod }}<span v-if="bankDetails"> | {{ bankDetails }}</span>
              </div>
            </div>
            <div class="text-right">
              <span class="block text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">Amount</span>
              <strong class="font-mono text-[16px] text-slate-900">{{ formatMoney(netPayment) }}</strong>
            </div>
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
  width: 100%;
  max-width: 178mm;
  padding: 0;
  color: #111827;
}

.salary-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  border-bottom: 1px solid #e2e8f0;
  padding-bottom: 12px;
}

.net-summary {
  flex: none;
  min-width: 132px;
  border: 1px solid #cbd5e1;
  background: #f8fafc;
  padding: 8px 10px;
  text-align: right;
}

.salary-info-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px 24px;
  border-bottom: 1px solid #e2e8f0;
  padding-bottom: 12px;
}

.salary-info-row {
  display: flex;
  gap: 8px;
  min-width: 0;
}

.salary-info-label {
  width: 6.75rem;
  flex: none;
}

.salary-slip-table {
  table-layout: fixed;
}

.salary-slip-table th,
.salary-slip-table td {
  word-break: break-word;
}

.salary-footer {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  border: 1px solid #e2e8f0;
  background: #f8fafc;
  padding: 10px 12px;
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

  .salary-header,
  .salary-footer {
    flex-direction: column;
  }

  .net-summary {
    width: 100%;
    text-align: left;
  }

  .salary-info-row {
    align-items: flex-start;
  }
}

@media print {
  .salary-paper {
    max-width: none;
    padding: 0;
  }

  .salary-info-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
