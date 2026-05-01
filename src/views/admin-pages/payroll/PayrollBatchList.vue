<script setup>
import { computed, ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { usePayrollBatchStore } from '@/stores/payrollBatch'
import LoaderView from '@/components/common/LoaderView.vue'
import PaginationBar from '@/components/PaginationBar.vue'
import EmployeeFilter from '@/components/common/EmployeeFilter.vue'
import FlexibleDatePicker from '@/components/FlexibleDatePicker.vue'

const router = useRouter()
const route = useRoute()
const batchStore = usePayrollBatchStore()

const { list, loading, error, pagination, apiUnavailable } = storeToRefs(batchStore)

const filters = ref({
  company_id: '',
  department_id: '',
  line_type: 'all',
  salary_month: '',
  page: 1,
  per_page: 15,
})

const toMonthValue = (value) => {
  const v = String(value || '').trim()
  if (!v) return ''
  if (/^\d{4}-\d{2}$/.test(v)) return v
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v.slice(0, 7)
  return ''
}

const parseQueryInt = (value, fallback = 1) => {
  if (value === undefined || value === null || value === '') return fallback
  const parsed = Number.parseInt(String(value), 10)
  return Number.isNaN(parsed) ? fallback : parsed
}

const salaryMonthPicker = computed({
  get() {
    const monthValue = toMonthValue(filters.value.salary_month)
    if (!monthValue) return { year: null, month: null, day: 1 }

    const [year, month] = monthValue.split('-').map(Number)
    return { year, month, day: 1 }
  },
  set(value) {
    if (!value?.year || !value?.month) {
      filters.value.salary_month = ''
      return
    }

    filters.value.salary_month = `${value.year}-${String(value.month).padStart(2, '0')}`
  },
})

const buildFilterParams = () => {
  const params = {
    ...filters.value,
    salary_month: toMonthValue(filters.value.salary_month),
  }

  if (!params.company_id) delete params.company_id
  if (!params.department_id) delete params.department_id
  if (!params.line_type || params.line_type === 'all') delete params.line_type
  if (!params.salary_month) delete params.salary_month

  return params
}

const syncFiltersToQuery = async (params) => {
  await router.replace({ query: { ...params } })
}

const hydrateFiltersFromQuery = () => {
  const q = route.query || {}

  filters.value = {
    ...filters.value,
    company_id: q.company_id ? String(q.company_id) : '',
    department_id: q.department_id ? String(q.department_id) : '',
    line_type: q.line_type ? String(q.line_type) : 'all',
    salary_month: toMonthValue(q.salary_month),
    page: parseQueryInt(q.page, 1),
    per_page: parseQueryInt(q.per_page, 15),
  }
}

async function load() {
  const params = buildFilterParams()
  await syncFiltersToQuery(params)
  await batchStore.fetchList(params)
}

onMounted(async () => {
  hydrateFiltersFromQuery()
  await load()
})

const onEmployeeFilterChange = (payload = {}) => {
  filters.value = {
    ...filters.value,
    company_id: payload.company_id || '',
    department_id: payload.department_id || '',
    line_type: payload.line_type || 'all',
    page: 1,
  }
  load()
}

const applyMonthFilter = () => {
  filters.value.page = 1
  load()
}

const resetFilters = () => {
  filters.value = {
    company_id: '',
    department_id: '',
    line_type: 'all',
    salary_month: '',
    page: 1,
    per_page: 15,
  }
  load()
}

const goToGenerate = () => {
  router.push({
    name: 'PayrollBatchGenerate',
    query: buildFilterParams(),
  })
}

const goToShow = (batch) => {
  router.push({
    name: 'PayrollBatchShow',
    params: { id: batch.id },
    query: buildFilterParams(),
  })
}
</script>

<template>
  <div class="p-4 md:p-6 space-y-4">
    <div class="flex items-center justify-between gap-2">
      <h1 class="title-md md:title-lg">Payroll Batches</h1>
      <button class="btn-2" :disabled="apiUnavailable" :class="{ 'opacity-60 cursor-not-allowed': apiUnavailable }" @click="goToGenerate">
        <i class="far fa-cog"></i>
        <span class="hidden md:flex">Generate Payroll</span>
      </button>
    </div>

    <div v-if="apiUnavailable" class="bg-amber-50 border border-amber-200 text-amber-700 rounded-xl p-4 text-sm flex items-center gap-2">
      <i class="fas fa-info-circle"></i>
      Payroll batch API এখনো backend এ build করা হয়নি. এই অংশ আপাতত disabled রাখা হয়েছে.
    </div>

    <!-- Filters -->
    <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
      <div class="grid grid-cols-1 gap-3 xl:grid-cols-[1fr_220px]">
        <EmployeeFilter
          :company_id="filters.company_id"
          :department_id="filters.department_id"
          :line_type="filters.line_type"
          :with-employee="false"
          @update:company_id="(value) => (filters.company_id = value)"
          @update:department_id="(value) => (filters.department_id = value)"
          @update:line_type="(value) => (filters.line_type = value)"
          @filter-change="onEmployeeFilterChange"
        />
      <div>
        
        <div class="flex items-end justify-end gap-4">
          <FlexibleDatePicker
            v-model="salaryMonthPicker"
            label="Salary Month"
            :show-year="false"
            :show-month="true"
            :show-date="false"
            :show-summary="false"
            allow-empty
            @change="applyMonthFilter"
          />
          <button class="btn-1 rounded-md" @click="resetFilters">
            <i class="far fa-undo"></i> Reset
          </button>
        </div>
        </div>
      </div>
    </div>

    <LoaderView v-if="loading" />

    <div v-else-if="error"
      class="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm flex items-center gap-2">
      <i class="fas fa-exclamation-circle"></i> {{ error }}
    </div>

    <div v-else-if="!list.length" class="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
      <i class="fas fa-layer-group text-4xl text-gray-300 mb-3"></i>
      <p class="text-lg font-medium text-gray-500">{{ apiUnavailable ? 'Payroll batch module is not active yet' : 'No payroll batches found' }}</p>
      <button class="btn-2 mt-4" :disabled="apiUnavailable" :class="{ 'opacity-60 cursor-not-allowed': apiUnavailable }" @click="goToGenerate">
        <i class="far fa-cog"></i> Generate Payroll
      </button>
    </div>

    <div v-else class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
      <table class="w-full text-sm">
        <thead class="bg-blue-50 text-blue-900 text-xs uppercase">
          <tr>
            <th class="px-4 py-3 text-left">#</th>
            <th class="px-4 py-3 text-left">Batch ID</th>
            <th class="px-4 py-3 text-left">Company</th>
            <th class="px-4 py-3 text-center">Salary Month</th>
            <th class="px-4 py-3 text-center">Salary Type</th>
            <th class="px-4 py-3 text-left">Prepared By</th>
            <th class="px-4 py-3 text-center">Generated At</th>
            <th class="px-4 py-3 text-center">Payrolls</th>
            <th class="px-4 py-3 text-center">Actions</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-50">
          <tr v-for="(batch, i) in list" :key="batch.id" class="hover:bg-gray-50 transition-colors">
            <td class="px-4 py-3 text-gray-400 text-xs">{{ (filters.page - 1) * filters.per_page + i + 1 }}</td>
            <td class="px-4 py-3 font-mono text-blue-700 font-medium">#{{ batch.id }}</td>
            <td class="px-4 py-3 font-medium">{{ batch.company?.name || '—' }}</td>
            <td class="px-4 py-3 text-center">{{ batch.salary_month || '—' }}</td>
            <td class="px-4 py-3 text-center">
              <span class="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-medium">
                {{ batch.salary_type || '—' }}
              </span>
            </td>
            <td class="px-4 py-3 text-gray-600">{{ batch.prepared_by?.name || '—' }}</td>
            <td class="px-4 py-3 text-center text-gray-500 text-xs">{{ batch.created_at?.slice(0, 10) || '—' }}</td>
            <td class="px-4 py-3 text-center">
              <span class="font-semibold text-blue-800">{{ batch.payrolls_count ?? (batch.payrolls?.length ?? '—') }}</span>
            </td>
            <td class="px-4 py-3 text-center">
              <button @click="goToShow(batch)"
                class="p-1.5 text-indigo-500 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors" title="View">
                <i class="far fa-eye text-xs"></i>
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <PaginationBar v-if="pagination.total > 0" :page="pagination.current_page || filters.page"
      :per-page="pagination.per_page || filters.per_page" :total="pagination.total || list.length"
      :last-page="pagination.last_page || 1"
      @page-change="(p) => { filters.page = p; load() }" />
  </div>
</template>
