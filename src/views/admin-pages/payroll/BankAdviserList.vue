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
  bank_name: '',
})

const rows = ref([])
const loading = ref(false)
const exporting = ref(false)
const error = ref('')

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

const bankNameOptions = computed(() => {
  const names = rows.value
    .map((row) => row.payable_account || '')
    .filter(Boolean)

  return [...new Set(names)].sort((a, b) => a.localeCompare(b))
})

const activeFilterChips = computed(() => {
  const chips = []

  if (filters.value.company_id) chips.push({ label: 'Company', value: filters.value.company_id })
  if (filters.value.department_id) chips.push({ label: 'Department', value: filters.value.department_id })
  if (filters.value.employee_id) chips.push({ label: 'Employee', value: filters.value.employee_id })
  if (filters.value.line_type && filters.value.line_type !== 'all') {
    chips.push({ label: 'Line Type', value: filters.value.line_type })
  }
  if (filters.value.bank_name) chips.push({ label: 'Bank', value: filters.value.bank_name })
  if (filters.value.salary_month) chips.push({ label: 'Month', value: formatMonth(filters.value.salary_month) })

  return chips
})

function formatMonth(value) {
  if (!value) return '—'
  return String(value).slice(0, 7)
}

function formatCompactCurrency(value) {
  if (value === null || value === undefined || value === '') return '—'
  const num = Number(value)
  if (!Number.isFinite(num)) return '—'

  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num)
}

const buildParams = () => {
  const params = {
    salary_month: filters.value.salary_month,
    ...(filters.value.company_id ? { company_id: filters.value.company_id } : {}),
    ...(filters.value.department_id ? { department_id: filters.value.department_id } : {}),
    ...(filters.value.line_type && filters.value.line_type !== 'all'
      ? { line_type: filters.value.line_type }
      : {}),
    ...(filters.value.employee_id ? { user_id: filters.value.employee_id } : {}),
    ...(filters.value.bank_name ? { bank_name: filters.value.bank_name } : {}),
  }

  return params
}

async function loadBankAdviserList() {
  error.value = ''

  if (!filters.value.salary_month) {
    error.value = 'Month is required.'
    rows.value = []
    return
  }

  loading.value = true
  try {
    rows.value = await fetchAllPages('/payroll-bank-advisers', buildParams())
  } catch (e) {
    error.value = e.message || 'Failed to load bank adviser list.'
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
    const params = {
      ...buildParams(),
      flag: 'excel',
    }

    const response = await apiClient.get('/payroll-bank-advisers', {
      params,
      responseType: 'blob',
    })

    const url = window.URL.createObjectURL(new Blob([response.data]))
    const link = document.createElement('a')
    link.href = url
    link.setAttribute(
      'download',
      `bank-adviser-list-${String(filters.value.salary_month).slice(0, 7)}.xlsx`,
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

function resetFilters() {
  filters.value = {
    company_id: '',
    department_id: '',
    employee_id: '',
    line_type: 'all',
    salary_month: currentMonth(),
    bank_name: '',
  }
  loadBankAdviserList()
}

onMounted(loadBankAdviserList)
</script>

<template>
  <div class="space-y-4 p-4 md:p-6 min-w-0 w-full max-w-full overflow-x-hidden">
    <div class="rounded-3xl border border-slate-200 bg-gradient-to-r from-slate-50 via-white to-blue-50 px-4 py-4 shadow-sm md:px-5">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 class="title-md md:title-lg">Bank Adviser List</h1>
          <p class="mt-1 text-sm text-slate-500">
            Payroll report data filtered by bank name, month and employee.
          </p>
        </div>
        <div class="flex flex-wrap gap-2">
          <button class="btn-3" @click="router.push({ name: 'PayrollList' })">
            <i class="far fa-arrow-left"></i> Back
          </button>
          <button class="btn-3" @click="downloadExcel" :disabled="loading || exporting || !rows.length">
            <i class="far" :class="exporting ? 'fa-spinner fa-spin' : 'fa-file-excel'"></i>
            Excel
          </button>
          <button class="btn-2" @click="loadBankAdviserList" :disabled="loading || exporting">
            <i class="far" :class="loading ? 'fa-spinner fa-spin' : 'fa-filter'"></i>
            Filter
          </button>
        </div>
      </div>
    </div>

    <div class="rounded-3xl border border-slate-200 bg-white p-3 shadow-sm md:p-4">
      <div class="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div>
          <h2 class="text-sm font-semibold text-slate-900">Filters</h2>
          <p class="text-xs text-slate-500">Keep it compact. Only bank transfer payrolls are included.</p>
        </div>
        <div class="flex flex-wrap items-center gap-2 text-xs text-slate-500">
          <span class="rounded-full bg-slate-100 px-2.5 py-1 font-medium">
            Active: {{ activeFilterChips.length }}
          </span>
          <span class="rounded-full bg-blue-50 px-2.5 py-1 font-medium text-blue-700">
            Month: {{ formatMonth(filters.salary_month) }}
          </span>
        </div>
      </div>

      <div class="mt-3 rounded-2xl border border-slate-200 bg-slate-50/80 p-3">
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
        <div class="flex gap-4 px-4 py-2">
          <div class="flex flex-col gap-1">
            <label class="block text-[11px] font-medium text-gray-600">Month</label>
            <input
              v-model="filters.salary_month"
              type="month"
              class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm"
            />
          </div>
          <div class="flex flex-col gap-1">
            <label class="block text-[11px] font-medium text-gray-600">Bank Name</label>
            <select
              v-model="filters.bank_name"
              class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm"
            >
              <option value="">All Banks</option>
              <option v-for="bank in bankNameOptions" :key="bank" :value="bank">
                {{ bank }}
              </option>
            </select>
          </div>
          <div class="flex items-end gap-2">
            <button class="btn-3 h-[38px]" @click="resetFilters">Reset</button>
            <button class="btn-2 h-[38px]" @click="loadBankAdviserList" :disabled="loading || exporting">
              <i class="far" :class="loading ? 'fa-spinner fa-spin' : 'fa-search'"></i>
              Load
            </button>
          </div>
        </div>

      <div v-if="activeFilterChips.length" class="mt-3 flex flex-wrap gap-2">
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
      <i class="far fa-building-columns text-3xl text-slate-300"></i>
      <p class="mt-2 text-sm font-medium text-slate-500">No bank adviser records found</p>
    </div>

    <div v-else class="overflow-x-auto rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div class="border-b border-slate-100 px-4 py-3">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 class="text-base font-semibold text-slate-800">Bank Adviser Table</h2>
            <p class="text-sm text-slate-500">Employee name, ID and bank account details only.</p>
          </div>
          <div class="flex items-center gap-2 text-xs text-slate-400">
            <span class="rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-600">Rows: {{ rows.length }}</span>
          </div>
        </div>
      </div>

      <div class="w-full overflow-x-auto overscroll-x-contain [scrollbar-width:thin]">
        <table class="min-w-[1100px] w-full border-collapse text-[11px] leading-tight">
          <thead class="sticky top-0 z-10 bg-slate-50 text-slate-700 text-[10px] uppercase">
            <tr>
              <th class="border border-slate-200 px-2 py-2 text-left">Employee Name</th>
              <th class="border border-slate-200 px-2 py-2 text-left">ID</th>
              <th class="border border-slate-200 px-2 py-2 text-left">Payable A/C</th>
              <th class="border border-slate-200 px-2 py-2 text-left">A/C Name</th>
              <th class="border border-slate-200 px-2 py-2 text-left">A/C Number</th>
              <th class="border border-slate-200 px-2 py-2 text-right">Payable Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="p in rows"
              :key="p.id"
              class="odd:bg-white even:bg-slate-50/40 hover:bg-blue-50/40 transition-colors"
            >
              <td class="border border-slate-200 px-2 py-2 align-top min-w-[220px]">
                <div class="font-semibold text-slate-900 leading-tight">
                  {{ p.employee_name || '-' }}
                </div>
              </td>
              <td class="border border-slate-200 px-2 py-2 text-[11px] text-slate-600 whitespace-nowrap">
                <span class="rounded-md bg-slate-100 px-1.5 py-0.5">
                  {{ p.employee_code || '-' }}
                </span>
              </td>
              <td class="border border-slate-200 px-2 py-2 text-xs text-slate-700">
                {{ p.payable_account || '-' }}
              </td>
              <td class="border border-slate-200 px-2 py-2 text-xs text-slate-700">
                {{ p.account_name || '-' }}
              </td>
              <td class="border border-slate-200 px-2 py-2 text-xs text-slate-700">
                {{ p.account_number || '-' }}
              </td>
              <td class="border border-slate-200 px-2 py-2 text-right font-mono font-semibold text-slate-800">
                {{ formatCompactCurrency(p.payable_amount) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
