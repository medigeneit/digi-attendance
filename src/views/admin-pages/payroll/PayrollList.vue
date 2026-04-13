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
  page: 1,
  per_page: 15,
})

const showPaymentModal = ref(false)
const selectedPayroll = ref(null)

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

const toNumber = (value) => {
  const num = Number(value)
  return Number.isFinite(num) ? num : 0
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
          <p class="text-xs text-slate-400">Rows: {{ pagination.total || list.length }}</p>
        </div>
      </div>
      <div class="w-full overflow-x-auto overscroll-x-contain [scrollbar-width:thin]">
      <table class="payroll-list-table min-w-[1420px] w-full table-fixed border-collapse text-[10px] leading-tight">
        <colgroup>
          <col class="w-[34px]" />
          <col class="w-[112px]" />
          <col class="w-[92px]" />
          <col class="w-[74px]" />
          <col class="w-[52px]" />
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
            <th class="border border-slate-200 px-1 py-2 text-center" rowspan="2">Month</th>
            <!-- <th class="border border-slate-200 px-2 py-2 text-center" rowspan="2">Type</th> -->
            <th class="border border-slate-200 bg-emerald-50 px-1 py-2 text-center" colspan="8">Earnings</th>
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
            <th class="border border-slate-200 px-1 py-1.5 text-right">OT/Add</th>
            <th class="border border-slate-200 px-1 py-1.5 text-right">E.Total</th>
            <th class="border border-slate-200 px-1 py-1.5 text-right">PF</th>
            <th class="border border-slate-200 px-1 py-1.5 text-right">Meal</th>
            <th class="border border-slate-200 px-1 py-1.5 text-right">Tax</th>
            <th class="border border-slate-200 px-1 py-1.5 text-right">Loan</th>
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
            <td class="border border-slate-200 px-1 py-1.5 text-center text-slate-600 whitespace-nowrap">{{ formatMonth(p.salary_month) }}</td>
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
            <td class="border border-slate-200 px-1 py-1.5 text-right font-mono whitespace-nowrap">{{ formatCompactCurrency(p.other_allowance_total) }}</td>
            <td class="border border-slate-200 px-1 py-1.5 text-right font-mono whitespace-nowrap">
              {{ formatCompactCurrency(p.manual_addition) }}
            </td>
            <td class="border border-slate-200 px-1 py-1.5 text-right font-mono font-semibold text-emerald-800 whitespace-nowrap">
              {{ formatCompactCurrency(getTotalEarnings(p)) }}
            </td>
            <td class="border border-slate-200 px-1 py-1.5 text-right font-mono text-rose-600 whitespace-nowrap">{{ formatCompactCurrency(p.pf_deduction) }}</td>
            <td class="border border-slate-200 px-1 py-1.5 text-right font-mono text-rose-600 whitespace-nowrap">{{ formatCompactCurrency(p.meal_deduction) }}</td>
            <td class="border border-slate-200 px-1 py-1.5 text-right font-mono text-rose-600 whitespace-nowrap">{{ formatCompactCurrency(p.tax_deduction) }}</td>
            <td class="border border-slate-200 px-1 py-1.5 text-right font-mono text-rose-600 whitespace-nowrap">{{ formatCompactCurrency(p.loan_deduction) }}</td>
            <td class="border border-slate-200 px-1 py-1.5 text-right font-mono text-rose-600 whitespace-nowrap">{{ formatCompactCurrency(p.other_deduction) }}</td>
            <td class="border border-slate-200 px-1 py-1.5 text-right font-mono text-rose-600 whitespace-nowrap">{{ formatCompactCurrency(p.advance_deduction) }}</td>
            <td class="border border-slate-200 px-1 py-1.5 text-right font-mono text-rose-600 whitespace-nowrap">{{ formatCompactCurrency(p.paycut_deduction) }}</td>
            <td class="border border-slate-200 px-1 py-1.5 text-right font-mono font-semibold text-rose-700 whitespace-nowrap">{{ formatCompactCurrency(p.total_deduction) }}</td>
            <td class="border border-slate-200 px-1 py-1.5 text-right font-mono font-bold text-blue-800 whitespace-nowrap">{{ formatCompactCurrency(p.net_salary) }}</td>
            <td class="border border-slate-200 px-1 py-1.5 text-center whitespace-nowrap"><PayrollStatusBadge :status="p.payment_status" /></td>
            <td class="border border-slate-200 px-1 py-1.5 text-center whitespace-nowrap">
              <div class="flex items-center justify-center gap-0.5">
                <button @click="router.push({ name: 'PayrollShow', params: { id: p.id } })"
                  class="p-0.5 text-indigo-500 hover:text-indigo-700 hover:bg-indigo-50 rounded-md" title="View">
                  <i class="far fa-eye text-xs"></i>
                </button>
                <button @click="openPaymentModal(p)"
                  class="p-0.5 text-emerald-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-md" title="Update Payment">
                  <i class="far fa-credit-card text-xs"></i>
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
