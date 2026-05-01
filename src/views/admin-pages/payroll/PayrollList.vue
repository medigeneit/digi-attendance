<script setup>
import { computed, ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'
import { storeToRefs } from 'pinia'
import { usePayrollManagementStore } from '@/stores/payrollManagement'
import { useCompanyStore } from '@/stores/company'
import LoaderView from '@/components/common/LoaderView.vue'
import PaginationBar from '@/components/PaginationBar.vue'
import PayrollStatusBadge from '@/components/payroll/PayrollStatusBadge.vue'
import PaymentStatusModal from '@/components/payroll/PaymentStatusModal.vue'

const router = useRouter()
const route = useRoute()
const toast = useToast()
const payrollStore = usePayrollManagementStore()
const companyStore = useCompanyStore()

const { list, loading, error, pagination } = storeToRefs(payrollStore)
const { companies } = storeToRefs(companyStore)

const getCurrentMonth = () => new Date().toISOString().slice(0, 7)

const filters = ref({
  company_id: '',
  salary_month: getCurrentMonth(),
  salary_type: '',
  payment_status: '',
  default_payment_method: 'Cash',
  page: 1,
  per_page: 15,
})

const showPaymentModal = ref(false)
const selectedPayroll = ref(null)
const showArrearModal = ref(false)
const selectedArrearPayroll = ref(null)
const arrearSaving = ref(false)
const arrearForm = ref({
  amount: '',
  reason: '',
  note: '',
})

const typeOptions = ['Monthly', 'Bonus', 'Final']

const statusOptions = ['Pending', 'Paid', 'Partial']

const summaryCards = computed(() => {
  const rows = list.value || []
  const totalGross = rows.reduce((sum, row) => sum + Number(row.gross_salary || 0), 0)
  const totalDeduction = rows.reduce((sum, row) => sum + Number(row.total_deduction || 0), 0)
  const totalNet = rows.reduce((sum, row) => sum + Number(row.net_salary || 0), 0)

  return [
    {
      label: 'Payrolls',
      value: rows.length,
      tone: 'border-blue-200 bg-blue-50 text-blue-800',
      formatter: (value) => value,
    },
    {
      label: 'Gross Total',
      value: totalGross,
      tone: 'border-emerald-200 bg-emerald-50 text-emerald-800',
      formatter: (value) => formatCompactCurrency(value),
    },
    {
      label: 'Deduction Total',
      value: totalDeduction,
      tone: 'border-rose-200 bg-rose-50 text-rose-800',
      formatter: (value) => formatCompactCurrency(value),
    },
    {
      label: 'Net Payable',
      value: totalNet,
      tone: 'border-indigo-200 bg-indigo-50 text-indigo-800',
      formatter: (value) => formatCompactCurrency(value),
    },
  ]
})

const resetFilters = () => {
  filters.value = {
    company_id: '',
    salary_month: getCurrentMonth(),
    salary_type: '',
    payment_status: '',
    default_payment_method: 'Cash',
    page: 1,
    per_page: 15,
  }
  load()
}

const applyRouteQueryToFilters = () => {
  const q = route.query
  filters.value = {
    company_id: String(q.company_id || ''),
    salary_month: String(q.salary_month || getCurrentMonth()),
    salary_type: String(q.salary_type || ''),
    payment_status: String(q.payment_status || ''),
    default_payment_method: String(q.default_payment_method || 'Cash'),
    page: Number(q.page) > 0 ? Number(q.page) : 1,
    per_page: Number(q.per_page) > 0 ? Number(q.per_page) : 15,
  }
}

async function load() {
  const params = { ...filters.value }
  Object.keys(params).forEach((k) => { if (!params[k]) delete params[k] })
  await router.replace({ query: params })
  await payrollStore.fetchList(params)
}

async function handleDownloadExcel() {
  try {
    const params = { ...filters.value }
    delete params.page
    delete params.per_page
    Object.keys(params).forEach((k) => { if (!params[k]) delete params[k] })
    await payrollStore.downloadExcel(params)
    toast.success('Payroll report downloaded.')
  } catch (e) {
    toast.error(e.message || 'Download failed.')
  }
}

onMounted(async () => {
  applyRouteQueryToFilters()
  await Promise.all([companyStore.fetchCompanies(), load()])
})

const openPaymentModal = (p) => {
  selectedPayroll.value = p
  showPaymentModal.value = true
}

const openArrearModal = (p) => {
  selectedArrearPayroll.value = p
  arrearForm.value = {
    amount: '',
    reason: '',
    note: '',
  }
  showArrearModal.value = true
}

const closeArrearModal = () => {
  showArrearModal.value = false
  selectedArrearPayroll.value = null
  arrearForm.value = {
    amount: '',
    reason: '',
    note: '',
  }
}

const handlePaymentSubmit = async ({ id, payload }) => {
  try {
    await payrollStore.updatePaymentStatus(id, payload)
    toast.success('Payment status updated.')
    showPaymentModal.value = false
    selectedPayroll.value = null
  } catch (e) {
    toast.error(e.message || 'Update failed.')
  }
}

const handleArrearSubmit = async () => {
  if (!selectedArrearPayroll.value) return

  const amount = toNumber(arrearForm.value.amount)
  const reason = String(arrearForm.value.reason || '').trim()

  if (amount <= 0) {
    toast.error('Arrear amount must be greater than zero.')
    return
  }

  if (!reason) {
    toast.error('Arrear reason is required.')
    return
  }

  try {
    arrearSaving.value = true
    await payrollStore.addArrear(selectedArrearPayroll.value.id, {
      amount,
      reason,
      note: String(arrearForm.value.note || '').trim() || undefined,
    })
    toast.success('Arrear added.')
    closeArrearModal()
  } catch (e) {
    const firstError = Object.values(e.errors || {})?.[0]?.[0]
    toast.error(firstError || e.message || 'Arrear add failed.')
  } finally {
    arrearSaving.value = false
  }
}

const formatCompactCurrency = (value) => {
  if (value === null || value === undefined || value === '') return '—'
  const num = parseFloat(value)
  if (isNaN(num)) return '—'

  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num)
}

const formatMonth = (value) => {
  if (!value) return '—'
  return String(value).slice(0, 7)
}
const formatDate = (value) => {
  if (!value) return '-'

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-').map(Number)
    const date = new Date(Date.UTC(year, month - 1, day))
    return new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(date)
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'

  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

const formatDateTime = (value) => {
  if (!value) return '-'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'

  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

const toNumber = (value) => {
  const num = Number(value)
  return Number.isFinite(num) ? num : 0
}

const allowanceRows = (payroll) =>
  Array.isArray(payroll?.other_allowance_breakdown) ? payroll.other_allowance_breakdown : []

const getAllowanceAmountByCode = (payroll, code) => {
  const targetCode = String(code || '').trim().toUpperCase()
  const targetName = String(code || '').trim().toLowerCase()

  return allowanceRows(payroll)
    .filter((row) => {
      const allowanceCode = String(row?.allowance_code || '').trim().toUpperCase()
      const allowanceName = String(row?.allowance_name || '').trim().toLowerCase()
      return allowanceCode === targetCode || allowanceName === targetName
    })
    .reduce((sum, row) => sum + toNumber(row?.amount), 0)
}

const getArrearAmount = (payroll) => getAllowanceAmountByCode(payroll, 'ARREAR')
const getPfAllowanceAmount = (payroll) => getAllowanceAmountByCode(payroll, 'PF')
const getDisplayOtherAllowance = (payroll) =>
  Math.max(0, toNumber(payroll?.other_allowance_total) - getArrearAmount(payroll) - getPfAllowanceAmount(payroll))

const getArrearEntries = (payroll) => {
  const entries = payroll?.arrear_entries || payroll?.arrearEntries
  return Array.isArray(entries) ? entries : []
}

const getTotalEarnings = (payroll) =>
  toNumber(payroll?.gross_salary) +
  toNumber(payroll?.other_allowance_total) +
  toNumber(payroll?.manual_addition)
</script>

<template>
  <div class="space-y-4 p-4 md:p-6 min-w-0 w-full max-w-full overflow-x-hidden">
    <div class="rounded-3xl border border-slate-200 bg-gradient-to-r from-slate-50 via-white to-blue-50 p-5 shadow-sm">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 class="title-md md:title-lg">Payroll Report List</h1>
          <p class="mt-1 text-sm text-slate-500">Detailed earnings, deductions and payable amounts in one report view.</p>
        </div>
        <div class="flex flex-wrap gap-2">
          <button class="btn-3" @click="router.push({ name: 'DoctorPayrollList' })">
            <i class="far fa-user-md"></i> Doctor Payroll
          </button>
          <button class="btn-3" @click="handleDownloadExcel" :disabled="loading || !list.length">
            <i class="far fa-file-excel"></i> Excel
          </button>
          <button class="btn-2" @click="router.push({ name: 'PayrollBatchGenerate' })">
            <i class="far fa-plus"></i> Generate
          </button>
        </div>
      </div>
    </div>

    <!-- Filters -->
    <div class="rounded-3xl border border-slate-200 bg-white p-3 shadow-sm">
      <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-[1.4fr_1fr_1fr_1fr_auto] items-end">
      <div>
        <label class="block text-xs font-medium text-gray-600 mb-1">Company</label>
        <select v-model="filters.company_id" @change="() => { filters.page = 1; load() }"
          class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
          <option value="">All Companies</option>
          <option v-for="c in companies" :key="c.id" :value="c.id">{{ c.name }}</option>
        </select>
      </div>
      <div>
        <label class="block text-xs font-medium text-gray-600 mb-1">Salary Month</label>
        <input v-model="filters.salary_month" type="month" @change="() => { filters.page = 1; load() }"
          class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
      </div>
      <div>
        <label class="block text-xs font-medium text-gray-600 mb-1">Salary Type</label>
        <select v-model="filters.salary_type" @change="() => { filters.page = 1; load() }"
          class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
          <option value="">All Types</option>
          <option v-for="type in typeOptions" :key="type" :value="type">{{ type }}</option>
        </select>
      </div>
      <div>
        <label class="block text-xs font-medium text-gray-600 mb-1">Payment Status</label>
        <select v-model="filters.payment_status" @change="() => { filters.page = 1; load() }"
          class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
          <option value="">All Statuses</option>
          <option v-for="status in statusOptions" :key="status" :value="status">{{ status }}</option>
        </select>
      </div>
      <button class="btn-3 h-[42px]" @click="resetFilters">
        <i class="far fa-undo"></i> Reset
      </button>
      </div>
    </div>

    <div class="grid gap-2.5 md:grid-cols-2 xl:grid-cols-4">
      <div
        v-for="card in summaryCards"
        :key="card.label"
        class="rounded-2xl border p-3 shadow-sm"
        :class="card.tone"
      >
        <p class="text-xs font-semibold uppercase tracking-[0.18em] opacity-80">{{ card.label }}</p>
        <p class="mt-1 text-lg font-bold">{{ card.formatter(card.value) }}</p>
      </div>
    </div>

    <LoaderView v-if="loading" />

    <div v-else-if="error"
      class="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm flex items-center gap-2">
      <i class="fas fa-exclamation-circle"></i> {{ error }}
    </div>

    <div v-else-if="!list.length" class="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
      <i class="fas fa-file-invoice-dollar text-4xl text-gray-300 mb-3"></i>
      <p class="text-lg font-medium text-gray-500">No payrolls found</p>
      <p class="text-sm text-gray-400 mt-1">Generate a payroll batch to create payroll records.</p>
    </div>

    <div
      v-else
      class="min-w-0 w-full max-w-full overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
    >
      <div class="border-b border-slate-100 px-4 py-3">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 class="text-base font-semibold text-slate-800">Detailed Payroll Report</h2>
            <p class="text-sm text-slate-500">Reference-style breakdown for each employee.</p>
          </div>
          <div class="flex flex-wrap items-center gap-2 text-xs">
            <span class="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 font-medium text-slate-600">
              Month: {{ formatMonth(filters.salary_month) }}
            </span>
            <span class="text-slate-400">Rows: {{ pagination.total || list.length }}</span>
          </div>
        </div>
      </div>
      <div class="w-full overflow-x-auto overscroll-x-contain [scrollbar-width:thin]">
      <table class="payroll-list-table min-w-[1520px] w-full table-fixed border-collapse text-[10px] leading-tight">
        <colgroup>
          <col class="w-[34px]" />
          <col class="w-[112px]" />
          <col class="w-[92px]" />
          <col class="w-[74px]" />
          <col class="w-[56px]" />
          <col class="w-[56px]" />
          <col class="w-[56px]" />
          <col class="w-[56px]" />
          <col class="w-[56px]" />
          <col class="w-[56px]" />
          <col class="w-[56px]" />
          <col class="w-[56px]" />
          <col class="w-[56px]" />
          <col class="w-[56px]" />
          <col class="w-[56px]" />
          <col class="w-[56px]" />
          <col class="w-[56px]" />
          <col class="w-[56px]" />
          <col class="w-[56px]" />
          <col class="w-[56px]" />
          <col class="w-[56px]" />
          <col class="w-[56px]" />
          <col class="w-[72px]" />
          <col class="w-[62px]" />
          <col class="w-[56px]" />
        </colgroup>
        <thead class="sticky top-0 z-10 bg-slate-50 text-slate-700 text-[10px] uppercase">
          <tr>
            <th class="border border-slate-200 px-1 py-2 text-left" rowspan="2">#</th>
            <th class="border border-slate-200 px-1 py-2 text-left" rowspan="2">Employee</th>
            <th class="border border-slate-200 px-1 py-2 text-left" rowspan="2">Emp ID</th>
            <th class="border border-slate-200 px-1 py-2 text-left" rowspan="2">Joining</th>
            <!-- <th class="border border-slate-200 px-2 py-2 text-center" rowspan="2">Type</th> -->
            <th class="border border-slate-200 bg-emerald-50 px-1 py-2 text-center" colspan="10">Earnings</th>
            <th class="border border-slate-200 bg-rose-50 px-1 py-2 text-center" colspan="8">Deductions</th>
            <th class="border border-slate-200 px-1 py-2 text-right" rowspan="2">Payable</th>
            <th class="border border-slate-200 px-1 py-2 text-center" rowspan="2">Status</th>
            <th class="border border-slate-200 px-1 py-2 text-center" rowspan="2">Actions</th>
          </tr>
          <tr>
            <th class="border border-slate-200 px-1 py-1.5 text-right">Basic</th>
            <th class="border border-slate-200 px-1 py-1.5 text-right">House</th>
            <th class="border border-slate-200 px-1 py-1.5 text-right">Medical</th>
            <th class="border border-slate-200 px-1 py-1.5 text-right">Conv.</th>
            <th class="border border-slate-200 px-1 py-1.5 text-right">Gross</th>
            <th class="border border-slate-200 px-1 py-1.5 text-right">Others</th>
            <th class="border border-slate-200 px-1 py-1.5 text-right">PF</th>
            <th class="border border-slate-200 px-1 py-1.5 text-right">Arrear</th>
            <th class="border border-slate-200 px-1 py-1.5 text-right">OT/Add</th>
            <th class="border border-slate-200 px-1 py-1.5 text-right">E.Total</th>
            <th class="border border-slate-200 px-1 py-1.5 text-right">PF</th>
            <th class="border border-slate-200 px-1 py-1.5 text-right">Meal</th>
            <th class="border border-slate-200 px-1 py-1.5 text-right">Loan</th>
            <th class="border border-slate-200 px-1 py-1.5 text-right">S.M</th>
            <th class="border border-slate-200 px-1 py-1.5 text-right">Other</th>
            <th class="border border-slate-200 px-1 py-1.5 text-right">Advance</th>
            <th class="border border-slate-200 px-1 py-1.5 text-right">Paycut</th>
            <th class="border border-slate-200 px-1 py-1.5 text-right">D.Total</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(p, i) in list" :key="p.id" class="odd:bg-white even:bg-slate-50/40 hover:bg-blue-50/40 transition-colors">
            <td class="border border-slate-200 px-1 py-1.5 text-gray-400 text-[10px] whitespace-nowrap">{{ (filters.page - 1) * filters.per_page + i + 1 }}</td>
            <td class="border border-slate-200 px-1 py-1.5 align-top w-[112px] max-w-[112px]">
              <div class="truncate font-semibold text-slate-900 leading-tight" :title="p.user?.name || p.employee_name || '-'">{{ p.user?.name || p.employee_name || '-' }}</div>
              <div class="mt-0.5 truncate text-[10px] text-slate-500" :title="p.user?.designation?.title || p.company_name || '-'">{{ p.user?.designation?.title || p.company_name || '-' }}</div>
            </td>
            <td class="emp-id-cell border border-slate-200 px-1 py-1.5 text-[10px] text-slate-700 whitespace-nowrap">
              <span class="inline-flex rounded-md bg-slate-100 px-1.5 py-0.5 leading-none whitespace-nowrap">{{ p.user?.employee_id || p.employee_code || '-' }}</span>
            </td>
            <td class="border border-slate-200 px-1 py-1.5 text-[10px] text-slate-500 whitespace-nowrap">{{ formatDate(p.user?.joining_date || p.joining_date) }}</td>
            <!-- <td class="border border-slate-200 px-2 py-2 text-center">
              <span class="rounded-full bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-700">{{ p.salary_type || '—' }}</span>
            </td> -->
            <td class="border border-slate-200 px-1 py-1.5 text-right font-mono whitespace-nowrap">{{ formatCompactCurrency(p.basic_salary) }}</td>
            <td class="border border-slate-200 px-1 py-1.5 text-right font-mono whitespace-nowrap">{{ formatCompactCurrency(p.house_rent) }}</td>
            <td class="border border-slate-200 px-1 py-1.5 text-right font-mono whitespace-nowrap">{{ formatCompactCurrency(p.medical_allowance) }}</td>
            <td class="border border-slate-200 px-1 py-1.5 text-right font-mono whitespace-nowrap">{{ formatCompactCurrency(p.conveyance_allowance) }}</td>
            <td class="border border-slate-200 px-1 py-1.5 text-right whitespace-nowrap">
              <div class="font-mono font-semibold text-emerald-700">{{ formatCompactCurrency(p.gross_salary) }}</div>
            </td>
            <td class="border border-slate-200 px-1 py-1.5 text-right font-mono whitespace-nowrap">{{ formatCompactCurrency(getDisplayOtherAllowance(p)) }}</td>
            <td class="border border-slate-200 px-1 py-1.5 text-right font-mono text-emerald-700 whitespace-nowrap">
              {{ formatCompactCurrency(getPfAllowanceAmount(p)) }}
            </td>
            <td class="border border-slate-200 px-1 py-1.5 text-right font-mono text-emerald-700 whitespace-nowrap">
              <button
                type="button"
                class="w-full text-right font-mono hover:underline"
                :title="getArrearEntries(p).length ? 'View arrear audit' : 'Save arrear'"
                @click="openArrearModal(p)"
              >
                {{ formatCompactCurrency(getArrearAmount(p)) }}
              </button>
            </td>
            <td class="border border-slate-200 px-1 py-1.5 text-right font-mono whitespace-nowrap">
              {{ formatCompactCurrency(p.manual_addition) }}
            </td>
            <td class="border border-slate-200 px-1 py-1.5 text-right font-mono font-semibold text-emerald-800 whitespace-nowrap">
              {{ formatCompactCurrency(getTotalEarnings(p)) }}
            </td>
            <td class="border border-slate-200 px-1 py-1.5 text-right font-mono text-rose-600 whitespace-nowrap">{{ formatCompactCurrency(p.pf_deduction) }}</td>
            <td class="border border-slate-200 px-1 py-1.5 text-right font-mono text-rose-600 whitespace-nowrap">{{ formatCompactCurrency(p.meal_deduction) }}</td>
            <td class="border border-slate-200 px-1 py-1.5 text-right font-mono text-rose-600 whitespace-nowrap">{{ formatCompactCurrency(p.loan_deduction) }}</td>
            <td class="border border-slate-200 px-1 py-1.5 text-right font-mono text-rose-600 whitespace-nowrap">{{ formatCompactCurrency(p.security_money_deduction) }}</td>
            <td class="border border-slate-200 px-1 py-1.5 text-right font-mono text-rose-600 whitespace-nowrap">{{ formatCompactCurrency(p.other_deduction) }}</td>
            <td class="border border-slate-200 px-1 py-1.5 text-right font-mono text-rose-600 whitespace-nowrap">{{ formatCompactCurrency(p.advance_deduction) }}</td>
            <td class="border border-slate-200 px-1 py-1.5 text-right font-mono text-rose-600 whitespace-nowrap">{{ formatCompactCurrency(p.paycut_deduction) }}</td>
            <td class="border border-slate-200 px-1 py-1.5 text-right font-mono font-semibold text-rose-700 whitespace-nowrap">{{ formatCompactCurrency(p.total_deduction) }}</td>
            <td class="border border-slate-200 px-1 py-1.5 text-right font-mono font-bold text-blue-800 whitespace-nowrap">{{ formatCompactCurrency(p.net_salary) }}</td>
            <td class="border border-slate-200 px-1 py-1.5 text-center whitespace-nowrap">
              <div class="flex items-center justify-center gap-1">
                <PayrollStatusBadge :status="p.payment_status" />
                <button
                  v-if="p.payment_status !== 'Paid'"
                  @click="openPaymentModal(p)"
                  class="inline-flex h-5 w-5 items-center justify-center rounded-md text-emerald-500 hover:bg-emerald-50 hover:text-emerald-700"
                  title="Update Payment Status"
                >
                  <i class="far fa-credit-card text-xs"></i>
                </button>
              </div>
            </td>
            <td class="border border-slate-200 px-1 py-1.5 text-center whitespace-nowrap">
              <div class="flex items-center justify-center gap-0.5">
                <button @click="router.push({ name: 'PayrollShow', params: { id: p.id } })"
                  class="p-0.5 text-indigo-500 hover:text-indigo-700 hover:bg-indigo-50 rounded-md" title="View">
                  <i class="far fa-eye text-xs"></i>
                </button>
                <button
                  v-if="p.payment_status !== 'Paid'"
                  @click="openArrearModal(p)"
                  class="p-0.5 text-emerald-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-md"
                  title="Save Arrear"
                >
                  <i class="far fa-plus text-xs"></i>
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
      </div>
    </div>

    <PaginationBar v-if="pagination.total > 0" :page="pagination.current_page || filters.page"
      :per-page="pagination.per_page || filters.per_page" :total="pagination.total || list.length"
      :last-page="pagination.last_page || 1"
      @page-change="(p) => { filters.page = p; load() }" />

    <PaymentStatusModal
      :show="showPaymentModal"
      :payroll-id="selectedPayroll?.id"
      :current-status="selectedPayroll?.payment_status"
      @close="() => { showPaymentModal = false; selectedPayroll = null }"
      @submit="handlePaymentSubmit"
    />

    <div
      v-if="showArrearModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      @click.self="closeArrearModal"
    >
      <div class="w-full max-w-3xl rounded-2xl bg-white shadow-xl">
        <div class="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <div class="min-w-0">
            <h3 class="text-base font-semibold text-slate-900">Arrear</h3>
            <p class="mt-0.5 truncate text-sm text-slate-500">
              {{ selectedArrearPayroll?.user?.employee_id || selectedArrearPayroll?.employee_code || '-' }}
              &middot; {{ selectedArrearPayroll?.user?.name || selectedArrearPayroll?.employee_name || '-' }}
            </p>
          </div>
          <button
            type="button"
            class="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700"
            @click="closeArrearModal"
            title="Close"
          >
            <i class="far fa-times"></i>
          </button>
        </div>

        <form class="grid gap-4 px-5 py-4 md:grid-cols-[160px_1fr]" @submit.prevent="handleArrearSubmit">
          <div>
            <label class="mb-1 block text-xs font-semibold text-slate-600">Amount</label>
            <input
              v-model="arrearForm.amount"
              type="number"
              min="0.01"
              step="0.01"
              class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
              placeholder="0.00"
            />
          </div>
          <div>
            <label class="mb-1 block text-xs font-semibold text-slate-600">Reason</label>
            <input
              v-model="arrearForm.reason"
              type="text"
              maxlength="255"
              class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
              placeholder="Adjustment reason"
            />
          </div>
          <div class="md:col-span-2">
            <label class="mb-1 block text-xs font-semibold text-slate-600">Note</label>
            <textarea
              v-model="arrearForm.note"
              rows="2"
              class="w-full resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
              placeholder="Optional audit note"
            ></textarea>
          </div>
          <div class="flex justify-end gap-2 md:col-span-2">
            <button type="button" class="btn-3" @click="closeArrearModal">Cancel</button>
            <button
              type="submit"
              class="btn-2"
              :disabled="arrearSaving || selectedArrearPayroll?.payment_status === 'Paid'"
            >
              <i class="far fa-plus"></i>
              {{ arrearSaving ? 'Saving...' : 'Save Arrear' }}
            </button>
          </div>
        </form>

        <div class="border-t border-slate-200 px-5 py-4">
          <div class="mb-2 flex items-center justify-between gap-2">
            <h4 class="text-sm font-semibold text-slate-800">Audit History</h4>
            <span class="text-xs text-slate-500">Total: {{ formatCompactCurrency(getArrearAmount(selectedArrearPayroll)) }}</span>
          </div>
          <div v-if="getArrearEntries(selectedArrearPayroll).length" class="max-h-56 overflow-auto rounded-xl border border-slate-200">
            <table class="w-full border-collapse text-xs">
              <thead class="bg-slate-50 text-slate-600">
                <tr>
                  <th class="border-b border-slate-200 px-3 py-2 text-left">Amount</th>
                  <th class="border-b border-slate-200 px-3 py-2 text-left">Reason</th>
                  <th class="border-b border-slate-200 px-3 py-2 text-left">Added By</th>
                  <th class="border-b border-slate-200 px-3 py-2 text-left">Added At</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="entry in getArrearEntries(selectedArrearPayroll)" :key="entry.id" class="odd:bg-white even:bg-slate-50/60">
                  <td class="border-b border-slate-100 px-3 py-2 font-mono font-semibold text-emerald-700">
                    {{ formatCompactCurrency(entry.amount) }}
                  </td>
                  <td class="border-b border-slate-100 px-3 py-2">
                    <div class="font-medium text-slate-800">{{ entry.reason || '-' }}</div>
                    <div v-if="entry.note" class="mt-0.5 text-slate-500">{{ entry.note }}</div>
                  </td>
                  <td class="border-b border-slate-100 px-3 py-2 text-slate-700">
                    {{ entry.creator?.name || entry.created_by?.name || '-' }}
                  </td>
                  <td class="border-b border-slate-100 px-3 py-2 text-slate-600">
                    {{ formatDateTime(entry.created_at) }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div v-else class="rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-500">
            No arrear entries yet.
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.payroll-list-table {
  table-layout: fixed;
}

.payroll-list-table th,
.payroll-list-table td {
  padding: 0.22rem 0.28rem !important;
  line-height: 1 !important;
}

.payroll-list-table thead th,
.payroll-list-table tbody td {
  overflow: hidden;
  text-overflow: ellipsis;
}

.payroll-list-table tbody td {
  white-space: nowrap;
}

.payroll-list-table td.emp-id-cell {
  overflow: visible !important;
  text-overflow: clip !important;
}

.payroll-list-table .truncate {
  min-width: 0;
}
</style>
