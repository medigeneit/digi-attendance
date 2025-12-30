<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute, useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'

import { useCompanyStore } from '@/stores/company'
import { useDepartmentStore } from '@/stores/department'
import YearlyAttendanceSummaryTable from '@/components/attendance/YearlyAttendanceSummaryTable.vue'
import {
  exportYearlyAttendanceSummary,
  fetchYearlyAttendanceSummary,
} from '@/services/yearly-attendance-summary'
import EmployeeFilter from '@/components/common/EmployeeFilter.vue'

const route = useRoute()
const router = useRouter()
const toast = useToast()

const companyStore = useCompanyStore()
const departmentStore = useDepartmentStore()
const { companies } = storeToRefs(companyStore)

const now = new Date()
const currentYear = now.getFullYear()

const yearOptions = computed(() =>
  Array.from({ length: 6 }, (_, index) => {
    const year = currentYear - index
    return { id: String(year), label: String(year) }
  }),
)

const filters = ref({
  year: route.query.year || String(currentYear),
  company_id: route.query.company_id || '',
  department_id: route.query.department_id || '',
  department_id_is_null: route.query.department_id_is_null === '1',
  line_type: route.query.line_type || 'all',
  employee_id: route.query.employee_id || route.query.user_id || '',
  user_id: route.query.user_id || route.query.employee_id || '',
  search: route.query.search || '',
  page: route.query.page ? Number(route.query.page) : 1,
  per_page: route.query.per_page ? Number(route.query.per_page) : 25,
  sort_by: route.query.sort_by || 'attendance_score_avg',
  sort_dir: route.query.sort_dir || 'desc',
})

const rows = ref([])
const meta = ref({ total: 0, current_page: 1, last_page: 1, per_page: 25 })
const isLoading = ref(false)
const isBusy = computed(() => isLoading.value)

const selectedRow = ref(null)
const drawerOpen = ref(false)

const closeDrawer = () => {
  drawerOpen.value = false
  selectedRow.value = null
}

const formatPercent = (value) => {
  const pct = Number(value)
  if (!Number.isFinite(pct)) return '—'
  return `${pct.toFixed(1)}%`
}

const formatScore = (value) => {
  const score = Number(value)
  if (!Number.isFinite(score)) return { label: '—', pct: 0 }
  const bounded = Math.max(0, Math.min(5, score))
  return { label: `${bounded.toFixed(2)} / 5`, pct: (bounded / 5) * 100 }
}

const presentBadgeClass = (value) => {
  const pct = Number(value || 0)
  if (pct >= 95) return 'bg-emerald-50 text-emerald-700'
  if (pct >= 80) return 'bg-amber-50 text-amber-700'
  return 'bg-rose-50 text-rose-700'
}

const userLabel = (row) => {
  const name = row?.user_name || row?.name || row?.user || row?.employee_name || ''
  if (name && row?.user_id) return `${name} (${row.user_id})`
  return row?.user_id ? `#${row.user_id}` : name || '—'
}

const departmentLabel = (row) => {
  if (row?.department_name) return row.department_name
  if (row?.department_id == null) return 'Unassigned'
  return String(row?.department_id || 'Unassigned')
}

const syncQuery = () => {
  router
    .replace({
      query: {
        year: filters.value.year || undefined,
        company_id: filters.value.company_id || undefined,
        department_id: filters.value.department_id || undefined,
        department_id_is_null: filters.value.department_id_is_null ? '1' : undefined,
        line_type:
          filters.value.line_type && filters.value.line_type !== 'all'
            ? filters.value.line_type
            : undefined,
        user_id: filters.value.user_id || undefined,
        employee_id: filters.value.employee_id || undefined,
        search: filters.value.search || undefined,
        page: filters.value.page > 1 ? String(filters.value.page) : undefined,
        per_page: filters.value.per_page !== 10 ? String(filters.value.per_page) : undefined,
        sort_by:
          filters.value.sort_by && filters.value.sort_by !== 'attendance_score_avg'
            ? filters.value.sort_by
            : undefined,
        sort_dir: filters.value.sort_dir !== 'desc' ? filters.value.sort_dir : undefined,
      },
    })
    .catch(() => {})
}

const normalizeResponse = (payload) => {
  if (!payload) return { data: [], meta: {} }
  if (Array.isArray(payload)) return { data: payload, meta: {} }
  if (Array.isArray(payload.data)) return { data: payload.data, meta: payload.meta || {} }
  if (Array.isArray(payload?.data?.data)) {
    return { data: payload.data.data, meta: payload.data.meta || {} }
  }
  return { data: [], meta: payload.meta || {} }
}

const fetchSummary = async () => {
  if (!filters.value.company_id) {
    rows.value = []
    meta.value = { total: 0, current_page: 1, last_page: 1, per_page: filters.value.per_page }
    return
  }

  const params = {
    company_id: filters.value.company_id,
    year: filters.value.year || undefined,
    department_id: filters.value.department_id || undefined,
    department_id_is_null: filters.value.department_id_is_null ? 1 : undefined,
    line_type:
      filters.value.line_type && filters.value.line_type !== 'all'
        ? filters.value.line_type
        : undefined,
    user_id: filters.value.user_id || undefined,
    search: filters.value.search || undefined,
    page: filters.value.page,
    per_page: filters.value.per_page,
    sort_by: filters.value.sort_by,
    sort_dir: filters.value.sort_dir,
  }

  if (filters.value.department_id_is_null) {
    delete params.department_id
  }

  isLoading.value = true
  try {
    const res = await fetchYearlyAttendanceSummary(params)
    const normalized = normalizeResponse(res?.data)
    rows.value = normalized.data || []
    meta.value = {
      total: normalized.meta?.total ?? normalized.data?.length ?? 0,
      current_page: normalized.meta?.current_page ?? filters.value.page,
      last_page: normalized.meta?.last_page ?? 1,
      per_page: normalized.meta?.per_page ?? filters.value.per_page,
    }
  } catch (error) {
    toast.error(error?.response?.data?.message || 'Failed to load yearly attendance summary')
  } finally {
    isLoading.value = false
  }
}

const applyFilters = async () => {
  filters.value.page = 1
  filters.value.user_id = filters.value.employee_id || ''
  await fetchSummary()
  syncQuery()
}

const resetFilters = async () => {
  const defaultCompanyId =
    (companies.value || []).length === 1 ? String(companies.value[0].id) : ''

  filters.value = {
    year: String(currentYear),
    company_id: defaultCompanyId,
    department_id: '',
    department_id_is_null: false,
    line_type: 'all',
    employee_id: '',
    user_id: '',
    search: '',
    page: 1,
    per_page: 25,
    sort_by: 'attendance_score_avg',
    sort_dir: 'desc',
  }
  if (defaultCompanyId) {
    await departmentStore.fetchDepartments(defaultCompanyId)
  }
  await fetchSummary()
  syncQuery()
}

const handleSortChange = async ({ sort_by, sort_dir }) => {
  filters.value.sort_by = sort_by
  filters.value.sort_dir = sort_dir
  filters.value.page = 1
  await fetchSummary()
  syncQuery()
}

const handlePageChange = async (page) => {
  filters.value.page = page
  await fetchSummary()
  syncQuery()
}

const handlePerPageChange = async (perPage) => {
  filters.value.per_page = perPage
  filters.value.page = 1
  await fetchSummary()
  syncQuery()
}

const handleRowClick = (row) => {
  selectedRow.value = row
  drawerOpen.value = true
}

const handleExport = async () => {
  if (!filters.value.company_id) return
  try {
    const params = {
      company_id: filters.value.company_id,
      year: filters.value.year || undefined,
      department_id: filters.value.department_id || undefined,
      department_id_is_null: filters.value.department_id_is_null ? 1 : undefined,
      line_type:
        filters.value.line_type && filters.value.line_type !== 'all'
          ? filters.value.line_type
          : undefined,
      user_id: filters.value.user_id || undefined,
      search: filters.value.search || undefined,
      sort_by: filters.value.sort_by,
      sort_dir: filters.value.sort_dir,
    }

    if (filters.value.department_id_is_null) {
      delete params.department_id
    }

    const response = await exportYearlyAttendanceSummary(params)
    const blob = new Blob([response.data], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `yearly_attendance_summary_${filters.value.year}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  } catch (error) {
    toast.error(error?.response?.data?.message || 'Failed to export summary')
  }
}

watch(
  () => filters.value.company_id,
  async (companyId) => {
    if (!companyId) {
      rows.value = []
      filters.value.department_id = ''
      filters.value.department_id_is_null = false
      filters.value.employee_id = ''
      filters.value.user_id = ''
      return
    }
    filters.value.department_id = ''
    filters.value.department_id_is_null = false
    filters.value.employee_id = ''
    filters.value.user_id = ''
    await departmentStore.fetchDepartments(companyId)
  },
)

const onEmpFilterChange = () => {
  filters.value.user_id = filters.value.employee_id || ''
  if (filters.value.department_id) {
    filters.value.department_id_is_null = false
  }
}

onMounted(async () => {
  await companyStore.fetchCompanies({ ignore_permission: true })
  if (!filters.value.company_id && (companies.value || []).length === 1) {
    filters.value.company_id = String(companies.value[0].id)
  }
  if (filters.value.company_id) {
    await departmentStore.fetchDepartments(filters.value.company_id)
  }
  await fetchSummary()
})
</script>

<template>
  <div class="space-y-6 px-4 pb-10">
    <div class="report-hero glass-panel px-5 py-4">
      <div class="space-y-2">
        <p class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
          At a glance
        </p>
        <h1 class="title-md">Yearly Attendance Summary</h1>
        <p class="text-sm text-slate-500">
          Calculated from view yearly_attendance_summary
        </p>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <button
          type="button"
          class="btn-2 inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold shadow-sm"
          :disabled="!filters.company_id"
          @click="handleExport"
        >
          <i class="far fa-file-csv text-base text-emerald-500"></i>
          Export CSV
        </button>
      </div>
    </div>

    <EmployeeFilter
      v-model:company_id="filters.company_id"
      v-model:department_id="filters.department_id"
      v-model:employee_id="filters.employee_id"
      v-model:line_type="filters.line_type"
      :with-type="true"
      :initial-value="{ ...$route.query, employee_id: $route.query.employee_id || $route.query.user_id }"
      @filter-change="onEmpFilterChange"
      class="w-full"
    >
      <div class="md:col-span-1 flex  gap-2">
        <div class="min-w-0 relative">
          <label class="top-label text-[10px] font-semibold uppercase tracking-wide text-slate-500">Year</label>
          <select v-model="filters.year" class="input-1 h-8 py-0 w-full text-xs">
            <option v-for="opt in yearOptions" :key="opt.id" :value="opt.id">
              {{ opt.label }}
            </option>
          </select>
        </div>
        <button
          type="button"
          class="h-9 rounded-md border border-slate-300 px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          :disabled="isBusy"
          @click="resetFilters"
        >
          Reset
        </button>
        <button
          type="button"
          class="h-9 rounded-md bg-slate-900 px-3 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
          :disabled="isBusy"
          @click="applyFilters"
        >
          Apply
        </button>
      </div>
    </EmployeeFilter>

    <!-- <YearlyAttendanceSummaryFilters
      v-model:year="filters.year"
      v-model:company-id="filters.company_id"
      v-model:department-id="filters.department_id"
      v-model:line_type="filters.line_type"
      v-model:department-id-is-null="filters.department_id_is_null"
      v-model:search="filters.search"
      :years="yearOptions"
      :company-options="companyOptions"
      :department-options="departmentOptions"
      :show-company-select="showCompanySelect"
      :is-busy="isLoading"
      @apply="applyFilters"
      @reset="resetFilters"
    /> -->

    <YearlyAttendanceSummaryTable
      :rows="rows"
      :meta="meta"
      :is-loading="isLoading"
      :sort-by="filters.sort_by"
      :sort-dir="filters.sort_dir"
      :page="filters.page"
      :per-page="filters.per_page"
      @sort-change="handleSortChange"
      @update:page="handlePageChange"
      @update:per-page="handlePerPageChange"
      @row-click="handleRowClick"
    />

    <div v-if="drawerOpen && selectedRow" class="drawer">
      <div class="drawer__overlay" @click="closeDrawer"></div>
      <aside class="drawer__panel">
        <div class="flex items-center justify-between border-b pb-3">
          <div>
            <p class="text-xs uppercase tracking-wide text-slate-400">User Detail</p>
            <h2 class="text-lg font-semibold text-slate-800">
              {{ userLabel(selectedRow) }}
            </h2>
          </div>
          <button class="btn-3" type="button" @click="closeDrawer">Close</button>
        </div>

        <div class="mt-4 space-y-4">
          <div class="rounded-xl border border-slate-100 bg-slate-50 p-3">
            <p class="text-xs font-semibold uppercase tracking-wide text-slate-400">Department</p>
            <p class="text-sm font-medium text-slate-800">{{ departmentLabel(selectedRow) }}</p>
          </div>

          <div class="grid gap-3 sm:grid-cols-2">
            <div class="rounded-xl border border-slate-100 bg-white p-3">
              <p class="text-xs font-semibold uppercase tracking-wide text-slate-400">Year</p>
              <p class="text-base font-semibold text-slate-800">{{ selectedRow.year }}</p>
            </div>
            <div class="rounded-xl border border-slate-100 bg-white p-3">
              <p class="text-xs font-semibold uppercase tracking-wide text-slate-400">Present %</p>
              <span
                class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold"
                :class="presentBadgeClass(selectedRow?.yearly_present_pct)"
              >
                {{ formatPercent(selectedRow?.yearly_present_pct) }}
              </span>
            </div>
            <div class="rounded-xl border border-slate-100 bg-white p-3">
              <p class="text-xs font-semibold uppercase tracking-wide text-slate-400">Early & Delay Score Avg</p>
              <div class="mt-2 space-y-1">
                <div class="h-2 w-full rounded-full bg-slate-100">
                  <div
                    class="h-2 rounded-full bg-emerald-500"
                    :style="{ width: `${formatScore(selectedRow?.attendance_score_avg).pct}%` }"
                  ></div>
                </div>
                <p class="text-xs text-slate-500">
                  {{ formatScore(selectedRow?.attendance_score_avg).label }}
                </p>
              </div>
            </div>
            <div class="rounded-xl border border-slate-100 bg-white p-3">
              <p class="text-xs font-semibold uppercase tracking-wide text-slate-400">Score Months</p>
              <p class="text-base font-semibold text-slate-800">
                {{ selectedRow?.score_months ?? '—' }}
              </p>
            </div>

            <div class="rounded-xl border border-slate-100 bg-white p-3">
              <p class="text-xs font-semibold uppercase tracking-wide text-slate-400">Present Avg Score</p>
              <p class="text-base font-semibold text-slate-800">
                {{ selectedRow?.yearly_present_score_avg ?? '—' }}
              </p>
            </div>

            <div class="rounded-xl border border-slate-100 bg-white p-3">
              <p class="text-xs font-semibold uppercase tracking-wide text-slate-400">Total Months</p>
              <p class="text-base font-semibold text-slate-800">
                {{ selectedRow?.total_months ?? '—' }}
              </p>
            </div>
            
          </div>

          <div class="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
            Trend placeholder: monthly performance sparkline coming soon.
          </div>
        </div>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.glass-panel { @apply rounded-2xl border border-slate-100 bg-white/70 shadow-sm; }
.report-hero { @apply flex flex-col gap-4 md:flex-row md:items-center md:justify-between; }
.drawer { @apply fixed inset-0 top-5 z-40; }
.drawer__overlay { @apply absolute inset-0 bg-black/30; }
.drawer__panel { @apply absolute right-0 top-0 h-full w-full max-w-md overflow-y-auto bg-white p-5 shadow-xl; }
</style>
