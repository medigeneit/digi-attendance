<script setup>
import EmployeeFilter from '@/components/common/EmployeeFilter.vue'
import FlexibleDatePicker from '@/components/FlexibleDatePicker.vue'
import LoaderView from '@/components/common/LoaderView.vue'
import { useOvertimeStore } from '@/stores/overtime'
import { storeToRefs } from 'pinia'
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const router = useRouter()
const route = useRoute()
const overtimeStore = useOvertimeStore()
const { reports, loading, selectedMonth } = storeToRefs(overtimeStore)

const now = new Date()
const pad = (value) => String(value || '').padStart(2, '0')

const parsePeriod = (value) => {
  if (!value) return { year: now.getFullYear(), month: now.getMonth() + 1 }
  const [year = '', month = ''] = value.split('-')
  if (!year || !month) return { year: now.getFullYear(), month: now.getMonth() + 1 }
  return { year: Number(year) || now.getFullYear(), month: Number(month) || now.getMonth() + 1 }
}

const period = ref(parsePeriod(route.query.date || selectedMonth.value))

const periodMonth = computed(() => {
  if (!period.value.year || !period.value.month) return ''
  return `${period.value.year}-${pad(period.value.month)}`
})

const filters = ref({
  company_id: route.query.company_id || '',
  department_id: route.query.department_id || 'all',
  line_type: route.query.line_type || 'all',
  employee_id: route.query.employee_id || '',
})

const syncQuery = (extra = {}) => {
  router.replace({
    query: {
      ...route.query,
      company_id: filters.value?.company_id,
      department_id: filters.value?.department_id,
      line_type: filters.value?.line_type,
      employee_id: filters.value?.employee_id,
      date: periodMonth.value,
      ...extra,
    },
  })
}

const fetchReport = () => {
  const month = periodMonth.value
  if (filters.value.company_id && month) {
    overtimeStore.getCompanyDepartmentOvertimeReport(month, filters.value)
  }
}

const handleFilterChange = () => {
  syncQuery()
  fetchReport()
}

const handleMonthChange = () => {
  syncQuery()
  fetchReport()
}

const goBack = () => router.go(-1)

const exportExcel = () => {
  if (!periodMonth.value) return
  overtimeStore.exportCompanyDepartmentOvertimeExcel(periodMonth.value, filters.value)
}

const exportPdf = () => {
  if (!periodMonth.value) return
  overtimeStore.exportCompanyDepartmentOvertimePdf(periodMonth.value, filters.value)
}

onMounted(() => {
  if (filters.value.company_id && periodMonth.value) {
    overtimeStore.getCompanyDepartmentOvertimeReport(periodMonth.value, filters.value)
  }
})

watch(
  periodMonth,
  (value, oldValue) => {
    if (!value || value === oldValue) return
    handleMonthChange()
  }
)

watch(
  periodMonth,
  (value) => {
    if (!value) return
    overtimeStore.selectedMonth = value
  },
  { immediate: true }
)

const toMinutes = (v) => {
  if (v == null || v === '') return 0
  if (typeof v === 'number') return Math.round(v * 60) 
  if (typeof v === 'string') {
    const s = v.trim()
    if (/^\d+:\d{1,2}$/.test(s)) {
      const [h, m] = s.split(':').map(n => Number(n) || 0)
      return h * 60 + m
    }
    const n = Number(s)
    if (!Number.isNaN(n)) return Math.round(n * 60)
  }
  return 0
}

const fmtHM = (min) => {
  const h = Math.floor(min / 60)
  const m = min % 60
  return `${h}h ${m}m`
}

const reportTotals = computed(() => {
  const list = reports.value || []
  return list.reduce(
    (acc, r) => {
      acc.entries += Number(r?.total_overtime_entries) || 0
      acc.requestedMin += toMinutes(r?.total_request_overtime_hours)
      acc.approvedMin += toMinutes(r?.total_approval_overtime_hours)
      return acc
    },
    { entries: 0, requestedMin: 0, approvedMin: 0 }
  )
})
</script>

<template>
  <div class="space-y-4 px-4">
    <div class="flex items-center justify-between gap-2">
      <button class="btn-3" @click="goBack">
        <i class="far fa-arrow-left"></i>
        <span class="hidden md:flex">Back</span>
      </button>

      <h1 class="title-md md:title-lg flex-wrap text-center">Monthly Overtime Report</h1>
      <div class="flex gap-2">
        <button @click="exportExcel" class="btn-1" title="Download Excel">
          <i class="far fa-file-excel text-2xl text-green-500"></i>
          Excel Download
        </button>
        <button @click="exportPdf" class="btn-1" title="Download PDF">
          <i class="far fa-file-pdf text-2xl text-red-500"></i>
          PDF Download
        </button>
      </div>
    </div>

    <div class="flex flex-wrap gap-4 p-3 bg-white rounded-md shadow-sm border border-slate-200 items-end">
      <EmployeeFilter
          v-model:company_id="filters.company_id"
          v-model:department_id="filters.department_id"
          v-model:employee_id="filters.employee_id"
          v-model:line_type="filters.line_type"
          :with-type="true"
          :initial-value="$route.query"
          @filter-change="handleFilterChange"
        >
        <div class="relative">
          <label class="top-label">Month</label>
          <FlexibleDatePicker
            v-model="period"
            :show-year="false"
            :show-month="true"
            :show-date="false"
          />
        </div>
      </EmployeeFilter>
      <button
        @click="fetchReport"
        class="btn-2"
      >
        <i class="far fa-sync"></i>
        <span>Run Report</span>
      </button>
    </div>

    <div v-if="loading" class="text-center py-4">
      <LoaderView />
    </div>

    <!-- Table -->
      <div v-else class="space-y-4">
        <div v-if="reports.length" class="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div class="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-3">
            <div>
              <p class="text-xs uppercase tracking-wide text-slate-500">Summary</p>
              <h2 class="text-base font-semibold text-slate-900">Overtime across departments</h2>
            </div>
            <div class="flex items-center gap-3 text-sm font-bold text-slate-500">
              <span>Entries: {{ reportTotals.entries }}</span>
              <span>Requested: {{ fmtHM(reportTotals.requestedMin) }}</span>
              <span>Approved: {{ fmtHM(reportTotals.approvedMin) }}</span>
            </div>
          </div>
          <div class="overflow-x-auto">
            <table class="min-w-full text-sm text-slate-600">
              <thead class="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500">
                <tr>
                  <th class="px-4 py-3 text-left">#</th>
                  <th class="px-4 py-3 text-left">Employee</th>
                  <th class="px-4 py-3 text-left">Company</th>
                  <th class="px-4 py-3 text-left">Department</th>
                  <th class="px-4 py-3 text-center">Entries</th>
                  <th class="px-4 py-3 text-center">Requested</th>
                  <th class="px-4 py-3 text-center">Approved</th>
                  <th class="px-4 py-3 text-center print:hidden">Actions</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 bg-white">
                <tr v-for="(report, index) in reports" :key="report.user_id || index" class="hover:bg-slate-50">
                  <td class="px-4 py-3 font-semibold text-slate-700">{{ index + 1 }}</td>
                  <td class="px-4 py-3 text-slate-800">{{ report.user_name || 'N/A' }}</td>
                  <td class="px-4 py-3">{{ report.company_name || 'N/A' }}</td>
                  <td class="px-4 py-3">{{ report.department_name || 'N/A' }}</td>
                  <td class="px-4 py-3 text-center">{{ report.total_overtime_entries }}</td>
                  <td class="px-4 py-3 text-center">{{ report.total_request_overtime_hours }}</td>
                  <td class="px-4 py-3 text-center">{{ report.total_approval_overtime_hours }}</td>
                  <td class="px-4 py-3 text-center print:hidden">
                    <RouterLink
                      :to="{
                        name: 'OvertimeList',
                        query: { ...filters, employee_id: report.user_id, date: periodMonth },
                      }"
                      class="inline-flex items-center justify-center rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-100"
                    >
                      <i class="far fa-eye"></i>
                    </RouterLink>
                  </td>
                </tr>
              </tbody>
              <tfoot class="bg-slate-100 text-sm font-semibold">
                <tr>
                  <td colspan="4" class="px-4 py-3 text-left">Totals</td>
                  <td class="px-4 py-3 text-center">{{ reportTotals.entries }}</td>
                  <td class="px-4 py-3 text-center">{{ fmtHM(reportTotals.requestedMin) }}</td>
                  <td class="px-4 py-3 text-center">{{ fmtHM(reportTotals.approvedMin) }}</td>
                  <td class="px-4 py-3 text-center print:hidden"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
        <div v-else class="text-center text-red-500 text-xl italic mt-10">
          No data available for this month.
        </div>
      </div>
  </div>
</template>
