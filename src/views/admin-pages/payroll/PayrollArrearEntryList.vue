<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'
import { storeToRefs } from 'pinia'
import EmployeeFilter from '@/components/common/EmployeeFilter.vue'
import PaginationBar from '@/components/PaginationBar.vue'
import LoaderView from '@/components/common/LoaderView.vue'
import { formatCurrency, toNum } from '@/utils/currency'
import { usePayrollArrearEntryStore } from '@/stores/payrollArrearEntry'

const route = useRoute()
const router = useRouter()
const toast = useToast()
const arrearStore = usePayrollArrearEntryStore()
const { list, loading, error, pagination } = storeToRefs(arrearStore)

const inputClass =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100'

const defaultMonth = () => new Date().toISOString().slice(0, 7)
const filters = ref({
  salary_month: defaultMonth(),
  company_id: '',
  department_id: '',
  line_type: 'all',
  user_id: '',
  status: 'pending',
  page: 1,
  per_page: 15,
})
const deletingId = ref(null)

const parseQueryInt = (value, fallback = 1) => {
  const parsed = Number.parseInt(String(value ?? ''), 10)
  return Number.isNaN(parsed) ? fallback : parsed
}

const buildFilterParams = () => {
  const params = { ...filters.value }
  if (!params.salary_month) delete params.salary_month
  if (!params.company_id) delete params.company_id
  if (!params.department_id) delete params.department_id
  if (!params.line_type || params.line_type === 'all') delete params.line_type
  if (!params.user_id) delete params.user_id
  if (!params.status) delete params.status
  return params
}

const hydrateFiltersFromQuery = () => {
  const q = route.query || {}
  filters.value = {
    ...filters.value,
    salary_month: q.salary_month ? String(q.salary_month).slice(0, 7) : defaultMonth(),
    company_id: q.company_id ? String(q.company_id) : '',
    department_id: q.department_id ? String(q.department_id) : '',
    line_type: q.line_type ? String(q.line_type) : 'all',
    user_id: q.user_id || q.employee_id ? String(q.user_id || q.employee_id) : '',
    status: q.status ? String(q.status) : 'pending',
    page: parseQueryInt(q.page, 1),
    per_page: parseQueryInt(q.per_page, 15),
  }
}

const load = async () => {
  const params = buildFilterParams()
  await router.replace({ query: params })
  await arrearStore.fetchList(params)
}

onMounted(async () => {
  hydrateFiltersFromQuery()
  await load()
})

const onListFilterChange = (payload = {}) => {
  filters.value = {
    ...filters.value,
    company_id: payload.company_id || '',
    department_id: payload.department_id || '',
    line_type: payload.line_type || 'all',
    user_id: payload.employee_id || '',
    page: 1,
  }
  load()
}

const resetFilters = () => {
  filters.value = {
    salary_month: defaultMonth(),
    company_id: '',
    department_id: '',
    line_type: 'all',
    user_id: '',
    status: 'pending',
    page: 1,
    per_page: 15,
  }
  load()
}

const deleteEntry = async (item) => {
  if (!item?.id || item.status === 'applied') return
  deletingId.value = item.id
  try {
    await arrearStore.deleteItem(item.id)
    toast.success('Payroll arrear deleted.')
    await load()
  } catch (err) {
    toast.error(err.message || 'Failed to delete payroll arrear.')
  } finally {
    deletingId.value = null
  }
}

const pageChanged = (page) => {
  filters.value.page = page
  load()
}

const goToCreate = () => {
  router.push({ name: 'PayrollArrearEntryCreate', query: buildFilterParams() })
}

const totalPendingAmount = computed(() =>
  list.value
    .filter((item) => item.status !== 'applied')
    .reduce((sum, item) => sum + toNum(item.amount), 0),
)

const employeeName = (item) => item.employee?.name || item.user?.name || item.employee_name || `#${item.user_id}`
const employeeCode = (item) => item.employee?.employee_id || item.employee_id || ''
const companyName = (item) => item.employee?.company?.name || item.company?.name || item.company_name || '-'
const departmentName = (item) => item.employee?.department?.name || item.department?.name || item.department_name || '-'
</script>

<template>
  <div class="p-3 md:p-4 space-y-3">
    <div class="flex flex-wrap items-start justify-between gap-2">
      <div>
        <p class="text-[11px] font-semibold uppercase tracking-[0.22em] text-indigo-700">Payroll</p>
        <h1 class="mt-1 text-xl font-semibold text-slate-900">Payroll Arrears</h1>
        <p class="mt-1 text-xs text-slate-500">Pending arrears will be adjusted automatically when payroll is generated.</p>
      </div>
      <button type="button" class="btn-2" @click="goToCreate">
        <i class="far fa-plus"></i> Bulk Arrear Entry
      </button>
    </div>

    <div class="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div class="border-b border-slate-200 p-4">
        <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 class="text-sm font-semibold text-slate-900">Arrear List</h2>
            <p class="mt-0.5 text-xs text-slate-500">Pending total on this page: {{ formatCurrency(totalPendingAmount) }}</p>
          </div>
          <LoaderView v-if="loading" />
        </div>
        <div class="grid gap-3 lg:grid-cols-[1fr_auto_auto]">
          <EmployeeFilter
            :company_id="filters.company_id"
            :department_id="filters.department_id"
            :employee_id="filters.user_id"
            :line_type="filters.line_type"
            @filter-change="onListFilterChange"
          />
          <div class="grid grid-cols-2 gap-2 lg:w-72">
            <div>
              <label class="mb-1 block text-xs font-semibold text-slate-600">Month</label>
              <input v-model="filters.salary_month" type="month" :class="inputClass" @change="filters.page = 1; load()" />
            </div>
            <div>
              <label class="mb-1 block text-xs font-semibold text-slate-600">Status</label>
              <select v-model="filters.status" :class="inputClass" @change="filters.page = 1; load()">
                <option value="">All</option>
                <option value="pending">Pending</option>
                <option value="applied">Applied</option>
              </select>
            </div>
          </div>
          <div class="flex items-end gap-2"><button type="button" class="btn-3" @click="resetFilters">Reset</button></div>
        </div>
      </div>

      <div v-if="error" class="m-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{{ error }}</div>

      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-slate-200 text-sm">
          <thead class="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th class="px-3 py-2 text-left font-semibold">Employee</th>
              <th class="px-3 py-2 text-left font-semibold">Company</th>
              <th class="px-3 py-2 text-left font-semibold">Department</th>
              <th class="px-3 py-2 text-left font-semibold">Carry On Month</th>
              <th class="px-3 py-2 text-right font-semibold">Arrear Amount</th>
              <th class="px-3 py-2 text-left font-semibold">Note</th>
              <th class="px-3 py-2 text-left font-semibold">Status</th>
              <th class="px-3 py-2 text-right font-semibold">Action</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-for="item in list" :key="item.id" class="hover:bg-slate-50">
              <td class="px-3 py-2"><div class="font-medium text-slate-800">{{ employeeName(item) }}</div><div class="text-xs text-slate-500">{{ employeeCode(item) }}</div></td>
              <td class="px-3 py-2 text-slate-600">{{ companyName(item) }}</td>
              <td class="px-3 py-2 text-slate-600">{{ departmentName(item) }}</td>
              <td class="px-3 py-2 font-mono text-slate-700">{{ String(item.salary_month || '').slice(0, 7) }}</td>
              <td class="px-3 py-2 text-right font-mono font-semibold text-slate-800">{{ formatCurrency(item.amount) }}</td>
              <td class="max-w-xs px-3 py-2 text-slate-600">{{ item.reason || item.note || '-' }}</td>
              <td class="px-3 py-2">
                <span class="rounded-full px-2 py-1 text-[11px] font-semibold" :class="item.status === 'applied' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'">
                  {{ item.status || 'pending' }}
                </span>
              </td>
              <td class="px-3 py-2 text-right">
                <button type="button" class="rounded-md border border-rose-200 px-2 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-50" :disabled="item.status === 'applied' || deletingId === item.id" @click="deleteEntry(item)">
                  <i :class="deletingId === item.id ? 'fas fa-spinner fa-spin' : 'far fa-trash-alt'"></i>
                </button>
              </td>
            </tr>
            <tr v-if="!loading && !list.length">
              <td colspan="8" class="px-3 py-8 text-center text-sm text-slate-500">No payroll arrears found.</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="border-t border-slate-200 p-3">
        <PaginationBar
          :page="Number(filters.page)"
          :per-page="Number(filters.per_page)"
          :total="Number(pagination.total || 0)"
          :last-page="Number(pagination.last_page || 1)"
          @page-change="pageChanged"
        />
      </div>
    </div>
  </div>
</template>
