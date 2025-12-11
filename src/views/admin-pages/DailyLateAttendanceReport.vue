<script setup>
import EmployeeFilter from '@/components/common/EmployeeFilter.vue'
import FlexibleDatePicker from '@/components/FlexibleDatePicker.vue'
import LoaderView from '@/components/common/LoaderView.vue'
import { useAttendanceStore } from '@/stores/attendance'
import { useCompanyStore } from '@/stores/company'
import { useDepartmentStore } from '@/stores/department'
import { storeToRefs } from 'pinia'
import Swal from 'sweetalert2'
import { onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const router = useRouter()
const route = useRoute()

// stores
const attendanceStore = useAttendanceStore()
const companyStore = useCompanyStore()
const departmentStore = useDepartmentStore()

const { dailyLateLogs, isLoading, selectedDate } = storeToRefs(attendanceStore)
const { companies } = storeToRefs(companyStore)
const { departments } = storeToRefs(departmentStore)

const filters = ref({
  company_id: route.query.company_id || '',
  department_id: route.query.department_id || '',
  line_type: route.query.line_type || 'all',
  employee_id: route.query.employee_id || '',
  date: route.query.date || '', // ISO yyyy-mm-dd
})

// normalize types
;['company_id','department_id','employee_id','date'].forEach(k => {
  filters.value[k] = filters.value[k] ? String(filters.value[k]) : ''
})

filters.value.line_type = filters.value.line_type || 'all'

const pad = (value) => String(value || '').padStart(2, '0')

const parseDate = (value) => {
  if (!value) {
    const today = new Date()
    return {
      year: today.getFullYear(),
      month: today.getMonth() + 1,
      day: today.getDate(),
    }
  }
  const [year = '0', month = '1', day = '1'] = value.split('-')
  return {
    year: Number(year) || new Date().getFullYear(),
    month: Number(month) || 1,
    day: Number(day) || 1,
  }
}

const period = ref(parseDate(filters.value.date || selectedDate.value))

watch(
  period,
  (value) => {
    if (!value) return
    const formatted = `${value.year}-${pad(value.month)}-${pad(value.day)}`
    if (filters.value.date !== formatted) {
      filters.value.date = formatted
    }
  },
  { deep: true }
)

// local state
const selectedEmployee = ref(null)
const filterEmployees = ref([])

// keep store date in sync initially (filters → store)
selectedDate.value = filters.value.date || ''

// -----------------------------
// Helpers
// -----------------------------
function ensureEmployeeIdFromObject() {
  if (selectedEmployee.value && selectedEmployee.value.id) {
    filters.value.employee_id = String(selectedEmployee.value.id)
  } else if (!selectedEmployee.value) {
    filters.value.employee_id = filters.value.employee_id || ''
  }
}

async function fetchLateReport() {
  await attendanceStore.getDailyLateReport(
    filters.value.company_id || '',
    filters.value.department_id || '',
    filters.value.line_type || 'all',
    filters.value.employee_id || '',
    filters.value.date || '',
    'daily'
  )
}

// Load deps + employees when company changes
async function onCompanyChange(companyId) {
  if (!companyId) {
    filterEmployees.value = []
    selectedEmployee.value = null
    filters.value.department_id = ''
    return
  }
  await Promise.all([
    departmentStore.fetchDepartments(companyId),
    companyStore.fetchEmployee(companyId),
  ])
  filterEmployees.value = companyStore.employees || []

  // validate dept against new company
  if (filters.value.department_id) {
    const ok = (companyStore.employees || []).some(
      e => String(e.department_id) === String(filters.value.department_id)
    )
    if (!ok) filters.value.department_id = ''
  }

  // hydrate selectedEmployee (if id exists)
  if (filters.value.employee_id) {
    const found = (companyStore.employees || []).find(
      e => String(e.id) === String(filters.value.employee_id)
    )
    selectedEmployee.value = found || null
    ensureEmployeeIdFromObject()
  }
}

function filterEmployeesByDepartmentOrCategory() {
  if (!filters.value.company_id) {
    filterEmployees.value = []
    selectedEmployee.value = null
    filters.value.employee_id = ''
    return
  }
  const base = companyStore.employees || []
  const department_id = filters.value.department_id
  const line_type = filters.value.line_type

  let list = base
  if (department_id) list = list.filter(e => String(e.department_id) === String(department_id))
  if (line_type && line_type !== 'all') list = list.filter(e => String(e.type) === String(line_type))
  filterEmployees.value = list

  if (filters.value.employee_id) {
    const exists = list.some(e => String(e.id) === String(filters.value.employee_id))
    if (!exists) {
      selectedEmployee.value = null
      filters.value.employee_id = ''
    }
  }
}

// Clean URL sync (debounced from apply cycle)
let qTimer = null
function syncQuery() {
  if (qTimer) clearTimeout(qTimer)
  qTimer = setTimeout(() => {
    const next = {}
    if (filters.value.company_id)    next.company_id    = String(filters.value.company_id)
    if (filters.value.department_id) next.department_id = String(filters.value.department_id)
    if (filters.value.employee_id)   next.employee_id   = String(filters.value.employee_id)
    if (filters.value.line_type && filters.value.line_type !== 'all') {
      next.line_type = String(filters.value.line_type)
    }
    if (filters.value.date)          next.date          = String(filters.value.date)

    router.replace({ query: next }).catch(() => {})
  }, 120)
}

// -----------------------------
// Single debounced apply cycle
// -----------------------------
let applyTimer = null
const prevCompanyId = ref(filters.value.company_id || '')
const lastFetchedKey = ref('')

async function runApply() {
  // 1) company change handling
  if ((filters.value.company_id || '') !== (prevCompanyId.value || '')) {
    await onCompanyChange(filters.value.company_id || '')
    prevCompanyId.value = filters.value.company_id || ''
  }

  // 2) local employee list filter (only if a company is selected)
  if (filters.value.company_id) {
    filterEmployeesByDepartmentOrCategory()
  } else {
    filterEmployees.value = []
    selectedEmployee.value = null
  }

  // 3) build fetch key & avoid unnecessary API calls
  const key = JSON.stringify({
    c: filters.value.company_id || '',
    d: filters.value.department_id || '',
    t: filters.value.line_type || 'all',
    e: filters.value.employee_id || '',
    dt: filters.value.date || '',
  })
  if (key !== lastFetchedKey.value) {
    await fetchLateReport()
    lastFetchedKey.value = key
  }

  // 4) update URL (debounced)
  syncQuery()
}

function scheduleApply() {
  if (applyTimer) clearTimeout(applyTimer)
  applyTimer = setTimeout(runApply, 200)
}

// Deep watcher → single entry point (debounced)
watch(
  () => ({ ...filters.value }),
  () => {
    ensureEmployeeIdFromObject()
    scheduleApply()
  },
  { deep: true }
)

// Mirror filters.date → store.selectedDate
watch(
  () => filters.value.date,
  (d) => { selectedDate.value = d || '' }
)

// Initial load
onMounted(async () => {
  await companyStore.fetchCompanies()
  scheduleApply()
})

/* -----------------------------
   Export / Back / Status utils
----------------------------- */
async function getExportExcel() {
  try {
    console.log('sdf');
    
    await attendanceStore.lateReportDownloadExcel(
      filters.value.company_id || '',
      filters.value.department_id || '',
      filters.value.line_type || 'all',
      filters.value.employee_id || '',
      filters.value.date || '',
      'daily'
    )
  } catch (e) {
    Swal.fire({
      icon: 'warning',
      title: 'Heads up',
      text: 'Exporting all companies may be restricted by backend.',
      confirmButtonText: 'OK',
    })
  }
}

const handleFilterChange = () => {
  const newQuery = {
    company_id: filters.value.company_id,
    department_id: filters.value.department_id,
    line_type: filters.value.line_type,
    employee_id: filters.value.employee_id,
  }

  const isDifferent = Object.entries(newQuery).some(
    ([key, value]) => route.query[key] !== String(value)
  )

  if (isDifferent) {
    router.replace({ query: newQuery })
  }
}
function goBack() {
  router.go(-1)
}
</script>

<template>
  <div class="space-y-4 px-4">
    <!-- Header -->
    <div class="flex flex-wrap items-center justify-between gap-3">
      <button class="btn-3 inline-flex items-center gap-2" @click="goBack" aria-label="Go back">
        <i class="fas fa-arrow-left"></i>
        <span class="hidden md:inline">Back</span>
      </button>

      <h1 class="title-md md:title-lg text-center flex-1">
        Daily Late Reports
      </h1>

      <div class="flex items-center gap-2">
        <button type="button" @click="getExportExcel" class="btn-1">
          <i class="fas fa-file-excel text-green-600"></i>
          <span class="hidden sm:inline">Export</span>
        </button>
      </div>
    </div>

    <!-- Filters -->
    <div class="rounded-xl border border-zinc-200 bg-white shadow-sm">
      <div class="flex flex-wrap gap-3 p-4">
        <EmployeeFilter
          v-model:company_id="filters.company_id"
          v-model:department_id="filters.department_id"
          v-model:employee_id="filters.employee_id"
          v-model:line_type="filters.line_type"
          :initial-value="$route.query"
          @filter-change="handleFilterChange"
        >
        <div class="relative">
          <label class="top-label">Date</label>
          <FlexibleDatePicker
            v-model="period"
            :show-year="false"
            :show-month="false"
            :show-date="true"
          />
        </div>
        </EmployeeFilter>
      </div>
    </div>

    <!-- Loader -->
    <div v-if="isLoading" class="py-10 text-center">
      <LoaderView />
    </div>

    <!-- Table (ALWAYS shows — all-company supported) -->
    <div v-else class="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
      <div class="overflow-x-auto">
        <table class="min-w-full text-sm">
          <thead class="bg-zinc-50 sticky top-0 z-10">
            <tr class="text-left text-zinc-700">
              <th class="px-3 py-2.5">#</th>
              <th class="px-3 py-2.5">Date</th>
              <th class="px-3 py-2.5">Weekday</th>
              <th class="px-3 py-2.5">Employee</th>
              <th class="px-3 py-2.5">Company</th>
              <th class="px-3 py-2.5">Department</th>
              <th class="px-3 py-2.5">Entry Time</th>
              <th class="px-3 py-2.5">Late Duration</th>
              <th class="px-3 py-2.5">Application</th>
              <th class="px-3 py-2.5">Shift</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(report, index) in dailyLateLogs"
              :key="report.id || index"
              class="border-t border-zinc-100 odd:bg-white even:bg-zinc-50 hover:bg-sky-50 transition-colors"
            >
              <td class="px-3 py-2 align-top">{{ index + 1 }}</td>
              <td class="px-3 py-2 align-top">
                <span class="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-700">
                  <i class="far fa-calendar-alt"></i> {{ report?.date || '-' }}
                </span>
              </td>
              <td class="px-3 py-2 align-top">
                <span class="inline-flex items-center gap-1 rounded-full bg-blue-50 text-blue-700 px-2 py-0.5 text-xs">
                  <i class="far fa-calendar-check"></i> {{ report?.weekday || '-' }}
                </span>
              </td>
              <td class="px-3 py-2 align-top">
                <div class="max-w-[220px] truncate font-medium text-zinc-800">
                  <i class="far fa-user mr-1 text-zinc-500"></i>{{ report?.user_name || 'Unknown' }}
                </div>
              </td>
              <td class="px-3 py-2 align-top">
                <div class="max-w-[220px] truncate text-zinc-700">
                  <i class="far fa-building mr-1 text-zinc-500"></i>{{ report?.company_name || 'Unknown' }}
                </div>
              </td>
              <td class="px-3 py-2 align-top">
                <div class="max-w-[220px] truncate text-zinc-700">
                  <i class="far fa-sitemap mr-1 text-zinc-500"></i>{{ report?.department_name || 'Unknown' }}
                </div>
              </td>
              <td class="px-3 py-2 align-top">
                <span class="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                  <i class="far fa-clock"></i>{{ report?.entry_time || '-' }}
                </span>
              </td>
              <td class="px-3 py-2 align-top">
                <span
                  class="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold"
                  :class="(report?.late_duration || '').trim() ? 'bg-rose-50 text-rose-700' : 'bg-zinc-100 text-zinc-500'"
                >
                  <i class="fas fa-stopwatch"></i>{{ report?.late_duration || '—' }}
                </span>
              </td>
              <td class="px-3 py-2 align-top">
                <template v-if="report?.short_leave">
                  <span
                    class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
                    :class="{
                      'bg-green-50 text-green-700': report.short_leave.status === 'Approved',
                      'bg-yellow-50 text-yellow-700': report.short_leave.status === 'Pending',
                      'bg-rose-50 text-rose-700': report.short_leave.status !== 'Approved' && report.short_leave.status !== 'Pending'
                    }"
                  >
                    <i
                      :class="[
                        report.short_leave.status === 'Approved' ? 'fas fa-check-circle' :
                        report.short_leave.status === 'Pending'  ? 'fas fa-hourglass-half' :
                        'fas fa-times-circle'
                      ]"
                    ></i>
                    {{ report.short_leave.status || 'Waiting' }}
                  </span>
                </template>
                <span v-else class="text-xs italic text-zinc-400">No Application</span>
              </td>
              <td class="px-3 py-2 align-top">
                <span class="inline-flex items-center gap-1 rounded-full bg-indigo-50 text-indigo-700 px-2 py-0.5 text-xs">
                  <i class="far fa-moon"></i>{{ report?.shift_name || '-' }}
                </span>
              </td>
            </tr>

            <!-- Empty state -->
            <tr v-if="!dailyLateLogs?.length">
              <td colspan="10" class="px-3 py-8 text-center text-zinc-500">
                <i class="far fa-folder-open mr-2"></i>No late entries found for the selected filters.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

  </div>
</template>
