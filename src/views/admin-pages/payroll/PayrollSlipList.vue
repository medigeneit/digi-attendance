<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import apiClient from '@/axios'
import EmployeeFilter from '@/components/common/EmployeeFilter.vue'
import LoaderView from '@/components/common/LoaderView.vue'

const router = useRouter()

const currentMonth = () => new Date().toISOString().slice(0, 7)

const filters = ref({
  company_id: '',
  department_id: '',
  employee_id: '',
  line_type: 'all',
  salary_month: currentMonth(),
  payment_status: '',
})

const rows = ref([])
const loading = ref(false)
const exporting = ref(false)
const error = ref('')
const pdfExporting = ref(false)

const toArray = (data) => {
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.data)) return data.data
  return []
}

const fetchAllPages = async (url, params = {}) => {
  const items = []
  let page = 1
  let lastPage = 1

  do {
    const response = await apiClient.get(url, {
      params: {
        ...params,
        page,
        per_page: 200,
      },
    })

    const data = response.data
    items.push(...toArray(data))
    lastPage = data?.last_page || 1
    page += 1
  } while (page <= lastPage)

  return items
}

const activeFilterChips = computed(() => {
  const chips = []

  if (filters.value.company_id) chips.push({ label: 'Company', value: filters.value.company_id })
  if (filters.value.department_id) chips.push({ label: 'Department', value: filters.value.department_id })
  if (filters.value.employee_id) chips.push({ label: 'Employee', value: filters.value.employee_id })
  if (filters.value.line_type && filters.value.line_type !== 'all') {
    chips.push({ label: 'Line Type', value: filters.value.line_type })
  }
  if (filters.value.payment_status) chips.push({ label: 'Status', value: filters.value.payment_status })
  if (filters.value.salary_month) chips.push({ label: 'Month', value: formatMonth(filters.value.salary_month) })

  return chips
})

function formatMonth(value) {
  if (!value) return '-'
  return String(value).slice(0, 7)
}

function formatDate(value) {
  if (!value) return '-'
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`)
  if (Number.isNaN(date.getTime())) return String(value)

  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

function formatCompactCurrency(value) {
  if (value === null || value === undefined || value === '') return '-'
  const num = Number(value)
  if (!Number.isFinite(num)) return '-'

  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num)
}

function viewSlip(id) {
  router.push({ name: 'PayrollSlipShow', params: { id } })
}

const buildParams = () => ({
  salary_month: filters.value.salary_month,
  ...(filters.value.company_id ? { company_id: filters.value.company_id } : {}),
  ...(filters.value.department_id ? { department_id: filters.value.department_id } : {}),
  ...(filters.value.line_type && filters.value.line_type !== 'all'
    ? { line_type: filters.value.line_type }
    : {}),
  ...(filters.value.employee_id ? { user_id: filters.value.employee_id } : {}),
  ...(filters.value.payment_status ? { payment_status: filters.value.payment_status } : {}),
})

async function loadSlipList() {
  error.value = ''

  if (!filters.value.salary_month) {
    error.value = 'Month is required.'
    rows.value = []
    return
  }

  loading.value = true
  try {
    rows.value = await fetchAllPages('/payroll-cash-slips', buildParams())
  } catch (e) {
    error.value = e.message || 'Failed to load payroll slip list.'
    rows.value = []
  } finally {
    loading.value = false
  }
}

async function downloadExcel() {
  error.value = ''

  if (!filters.value.salary_month) {
    error.value = 'Month is required.'
    return
  }

  exporting.value = true
  try {
    const response = await apiClient.get('/payroll-cash-slips', {
      params: { ...buildParams(), flag: 'excel' },
      responseType: 'blob',
    })

    const url = window.URL.createObjectURL(new Blob([response.data]))
    const link = document.createElement('a')
    link.href = url
    link.setAttribute(
      'download',
      `cash-slip-list-${String(filters.value.salary_month).slice(0, 7)}.xlsx`,
    )
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  } catch (e) {
    error.value = e.message || 'Excel download failed.'
  } finally {
    exporting.value = false
  }
}

async function downloadPdf() {
  error.value = ''

  if (!filters.value.salary_month) {
    error.value = 'Month is required.'
    return
  }

  pdfExporting.value = true
  try {
    const response = await apiClient.get('/payroll-cash-slips', {
      params: { ...buildParams(), flag: 'pdf' },
      responseType: 'blob',
    })

    const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }))
    const link = document.createElement('a')
    link.href = url
    link.setAttribute(
      'download',
      `cash-slip-list-${String(filters.value.salary_month).slice(0, 7)}.pdf`,
    )
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  } catch (e) {
    error.value = e.message || 'PDF download failed.'
  } finally {
    pdfExporting.value = false
  }
}

function resetFilters() {
  filters.value = {
    company_id: '',
    department_id: '',
    employee_id: '',
    line_type: 'all',
    salary_month: currentMonth(),
    payment_status: '',
  }
  loadSlipList()
}

onMounted(loadSlipList)
</script>

<template>
  <div class="space-y-4 p-4 md:p-6 min-w-0 w-full max-w-full overflow-x-hidden">
    <div
      class="rounded-3xl border border-slate-200 bg-gradient-to-r from-slate-50 via-white to-amber-50 px-4 py-4 shadow-sm md:px-5"
    >
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 class="title-md md:title-lg">Payroll Slip List</h1>
          <p class="mt-1 text-sm text-slate-500">
            Cash payroll slips filtered by month and employee.
          </p>
        </div>
        <div class="flex flex-wrap gap-2">
          <button class="btn-3" @click="router.push({ name: 'PayrollList' })">
            <i class="far fa-arrow-left"></i> Back
          </button>
          <button
            class="btn-3"
            @click="downloadExcel"
            :disabled="loading || exporting || pdfExporting || !rows.length"
          >
            <i class="far" :class="exporting ? 'fa-spinner fa-spin' : 'fa-file-excel'"></i>
            Export Excel
          </button>
          <button
            class="btn-3"
            @click="downloadPdf"
            :disabled="loading || exporting || pdfExporting || !rows.length"
          >
            <i class="far" :class="pdfExporting ? 'fa-spinner fa-spin' : 'fa-file-pdf'"></i>
            Export PDF
          </button>
          <button class="btn-2" @click="loadSlipList" :disabled="loading || exporting || pdfExporting">
            <i class="far" :class="loading ? 'fa-spinner fa-spin' : 'fa-filter'"></i>
            Filter
          </button>
        </div>
      </div>
    </div>

    <div class="rounded-3xl border border-slate-200 bg-white p-3 shadow-sm md:p-4">
      <div class="rounded-2xl border border-slate-200 bg-slate-50/80 p-3 space-y-3">
        <EmployeeFilter
          :company_id="filters.company_id"
          :department_id="filters.department_id"
          :employee_id="filters.employee_id"
          :line_type="filters.line_type"
          :with-type="true"
          @update:company_id="(value) => (filters.company_id = value)"
          @update:department_id="(value) => (filters.department_id = value)"
          @update:employee_id="(value) => (filters.employee_id = value)"
          @update:line_type="(value) => (filters.line_type = value)"
        />

        <div class="flex flex-wrap gap-3">
          <div class="flex flex-col gap-1">
            <label class="block text-[11px] font-medium text-gray-600">Month</label>
            <input
              v-model="filters.salary_month"
              type="month"
              class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm"
            />
          </div>
          <div class="flex flex-col gap-1">
            <label class="block text-[11px] font-medium text-gray-600">Status</label>
            <select
              v-model="filters.payment_status"
              class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm"
            >
              <option value="">All Status</option>
              <option value="Pending">Pending</option>
              <option value="Partial">Partial</option>
              <option value="Paid">Paid</option>
            </select>
          </div>
          <div class="flex items-end gap-2">
            <button class="btn-3 h-[38px]" @click="resetFilters">Reset</button>
            <button class="btn-2 h-[38px]" @click="loadSlipList" :disabled="loading || exporting || pdfExporting">
              <i class="far" :class="loading ? 'fa-spinner fa-spin' : 'fa-search'"></i>
              Load
            </button>
          </div>
        </div>

        <div v-if="activeFilterChips.length" class="flex flex-wrap gap-2">
          <span
            v-for="chip in activeFilterChips"
            :key="`${chip.label}-${chip.value}`"
            class="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-700 shadow-sm"
          >
            <span class="font-medium text-slate-500">{{ chip.label }}:</span>
            <span class="font-semibold">{{ chip.value }}</span>
          </span>
        </div>
      </div>
    </div>

    <p v-if="error" class="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      {{ error }}
    </p>

    <LoaderView v-if="loading" />

    <div
      v-else-if="!rows.length"
      class="rounded-3xl border border-dashed border-slate-200 bg-white p-10 text-center shadow-sm"
    >
      <i class="far fa-receipt text-3xl text-slate-300"></i>
      <p class="mt-2 text-sm font-medium text-slate-500">No payroll slip records found</p>
    </div>

    <div v-else class="overflow-x-auto rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div class="border-b border-slate-100 px-4 py-3">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 class="text-base font-semibold text-slate-800">Payroll Slip Table</h2>
            <p class="text-sm text-slate-500">Cash employees only. Open a row for the full payslip.</p>
          </div>
          <div class="flex items-center gap-2 text-xs text-slate-400">
            <span class="rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-600">
              Rows: {{ rows.length }}
            </span>
          </div>
        </div>
      </div>

      <div class="w-full overflow-x-auto overscroll-x-contain [scrollbar-width:thin]">
        <table class="min-w-[1120px] w-full border-collapse text-[11px] leading-tight">
          <thead class="sticky top-0 z-10 bg-slate-50 text-slate-700 text-[10px] uppercase">
            <tr>
              <th rowspan="2" class="border border-slate-200 px-2 py-2 text-left align-middle">Employee Name</th>
              <th rowspan="2" class="border border-slate-200 px-2 py-2 text-left align-middle">ID</th>
              <th rowspan="2" class="border border-slate-200 px-2 py-2 text-left align-middle">Joining Date</th>
              <th rowspan="2" class="border border-slate-200 px-2 py-2 text-right align-middle">Earnings Total</th>
              <th rowspan="2" class="border border-slate-200 px-2 py-2 text-right align-middle">Deductions Total</th>
              <th rowspan="2" class="border border-slate-200 px-2 py-2 text-right align-middle">Net Payment</th>
              <th rowspan="2" class="border border-slate-200 px-2 py-2 text-center align-middle">Action</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="p in rows"
              :key="p.id"
              class="odd:bg-white even:bg-slate-50/40 hover:bg-blue-50/40 transition-colors"
            >
              <td class="border border-slate-200 px-4 py-2 align-top min-w-[220px]">
                <div class="font-semibold text-slate-900 leading-tight">
                  {{ p.employee_name || '-' }}
                </div>
              </td>
              <td class="border border-slate-200 px-2 py-2 text-[11px] text-slate-600 whitespace-nowrap">
                <span class="rounded-md bg-slate-100 px-1.5 py-0.5">
                  {{ p.employee_code || '-' }}
                </span>
              </td>
              <td class="border border-slate-200 px-2 py-2 text-xs text-slate-700 whitespace-nowrap">
                {{ formatDate(p.joining_date) }}
              </td>
              <td class="border border-slate-200 px-2 py-2 text-right font-mono font-semibold text-slate-800">
                {{ formatCompactCurrency(p.earnings?.total) }}
              </td>
              <td class="border border-slate-200 px-2 py-2 text-right font-mono font-semibold text-slate-800">
                {{ formatCompactCurrency(p.deductions?.total) }}
              </td>
              <td class="border border-slate-200 px-4 py-2 text-right font-mono font-bold text-emerald-700">
                {{ formatCompactCurrency(p.net_payment) }}
              </td>
              <td class="border border-slate-200 px-2 py-2 text-center">
                <button class="btn-3 h-8 text-[11px]" @click="viewSlip(p.id)">
                  <i class="far fa-eye"></i>
                  View Slip
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
