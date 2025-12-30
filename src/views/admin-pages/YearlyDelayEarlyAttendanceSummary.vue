<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute, useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'

import { useCompanyStore } from '@/stores/company'
import { useDepartmentStore } from '@/stores/department'
import {
  exportYearlyDealyEarlyAttendanceSummary,
  fetchYearlyDealyEarlyAttendanceSummary,
} from '@/services/yearly-delay-early-attendance'
import LoaderView from '@/components/common/LoaderView.vue'
import SelectDropdown from '@/components/SelectDropdown.vue'
import EmployeeDropdownInput from '@/components/EmployeeDropdownInput.vue'

const route = useRoute()
const router = useRouter()
const toast = useToast()

const companyStore = useCompanyStore()
const departmentStore = useDepartmentStore()
const { companies, employees: companyEmployees } = storeToRefs(companyStore)
const { departments } = storeToRefs(departmentStore)

const now = new Date()
const currentYear = now.getFullYear()

const yearOptions = computed(() => {
  return Array.from({ length: 6 }, (_, index) => {
    const year = currentYear - index
    return { id: String(year), label: String(year) }
  })
})

const filters = ref({
  year: route.query.year || String(currentYear),
  company_id: route.query.company_id || '',
  department_id: route.query.department_id || '',
  line_type: route.query.line_type || 'all',
  employee_id: route.query.employee_id || '',
})

const rows = ref([])
const isLoading = ref(false)

const months = [
  { key: '01', label: 'Jan' },
  { key: '02', label: 'Feb' },
  { key: '03', label: 'Mar' },
  { key: '04', label: 'Apr' },
  { key: '05', label: 'May' },
  { key: '06', label: 'Jun' },
  { key: '07', label: 'Jul' },
  { key: '08', label: 'Aug' },
  { key: '09', label: 'Sep' },
  { key: '10', label: 'Oct' },
  { key: '11', label: 'Nov' },
  { key: '12', label: 'Dec' },
]

const typeOptions = [
  { id: 'all', label: 'All Types' },
  { id: 'executive', label: 'Executive' },
  { id: 'support_staff', label: 'Support Staff' },
  { id: 'doctor', label: 'Doctor' },
  { id: 'academy_body', label: 'Academy Body' },
]

const companyOptions = computed(() =>
  (companies.value || []).map((company) => ({
    id: String(company.id),
    label: company.name,
  })),
)

const departmentOptions = computed(() =>
  (departments.value || []).map((department) => ({
    id: String(department.id),
    label: department.name,
  })),
)

const rawEmployees = computed(() => companyEmployees.value || [])

const formatEmployee = (employee) => {
  return {
    ...employee,
    id: String(employee.id),
    label:
      employee.name ||
      employee.label ||
      `${employee.first_name ?? ''} ${employee.last_name ?? ''}`.trim(),
  }
}

const employeeOptions = computed(() => {
  let filtered = [...rawEmployees.value]

  if (filters.value.department_id && filters.value.department_id !== 'all') {
    filtered = filtered.filter(
      (emp) => String(emp.department_id) === String(filters.value.department_id),
    )
  }

  if (filters.value.line_type && filters.value.line_type !== 'all') {
    filtered = filtered.filter((emp) => String(emp.type) === String(filters.value.line_type))
  }

  let mapped = filtered.map(formatEmployee)

  if (filters.value.employee_id) {
    const exists = mapped.some((emp) => emp.id === String(filters.value.employee_id))
    if (!exists) {
      const found = rawEmployees.value.find(
        (emp) => String(emp.id) === String(filters.value.employee_id),
      )
      if (found) {
        mapped = [formatEmployee(found), ...mapped]
      }
    }
  }

  return mapped
})

const monthCell = (row, monthKey) =>
  row?.months?.[monthKey] || { score: null, late: 0, early: 0, total: 0 }

const scoreAvg = (row) => {
  const firstMonth = months[0]?.key
  if (!firstMonth) return null
  return row?.months?.[firstMonth]?.score ?? null
}

const formatScore = (value) => {
  const num = Number(value)
  if (!Number.isFinite(num)) return '-'
  return num.toFixed(2)
}

const monthGroupClass = (monthIndex) => (monthIndex % 2 === 0 ? 'month-group-odd' : 'month-group-even')

const syncQuery = () => {
  router.replace({
    query: {
      year: filters.value.year || undefined,
      company_id: filters.value.company_id || undefined,
      department_id: filters.value.department_id || undefined,
      line_type: filters.value.line_type || undefined,
      employee_id: filters.value.employee_id || undefined,
    },
  })
}

const fetchReport = async () => {
  if (!filters.value.company_id) {
    rows.value = []
    return
  }

  isLoading.value = true
  try {
    const params = {
      company_id: filters.value.company_id,
      department_id: filters.value.department_id || undefined,
      line_type: filters.value.line_type || undefined,
      employee_id: filters.value.employee_id || undefined,
      year: filters.value.year,
    }
    const res = await fetchYearlyDealyEarlyAttendanceSummary(params)
    rows.value = res?.data?.data ?? res?.data ?? []
    syncQuery()
  } catch (error) {
    toast.error(error?.response?.data?.message || 'Failed to load report')
  } finally {
    isLoading.value = false
  }
}

const handleFilterChange = async () => {
  await fetchReport()
}

const downloadExcel = async () => {
  if (!filters.value.company_id) {
    toast.info('Select a company first.')
    return
  }

  try {
    const params = {
      company_id: filters.value.company_id,
      department_id: filters.value.department_id || undefined,
      line_type: filters.value.line_type || undefined,
      employee_id: filters.value.employee_id || undefined,
      year: filters.value.year,
    }
    const response = await exportYearlyDealyEarlyAttendanceSummary(params)
    const blob = new Blob([response.data])
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    const dept = filters.value.department_id || 'all'
    const filename = `yearly_delay_early_attendance_${filters.value.company_id}_${filters.value.year}_${dept}.xlsx`
    link.setAttribute('download', filename)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  } catch (error) {
    toast.error(error?.response?.data?.message || 'Failed to export excel')
  }
}

onMounted(async () => {
  await companyStore.fetchCompanies()

  if (!filters.value.company_id && (companies.value || []).length === 1) {
    filters.value.company_id = String(companies.value[0].id)
  }

  if (filters.value.company_id) {
    await Promise.all([
      departmentStore.fetchDepartments(filters.value.company_id),
      companyStore.fetchEmployee(filters.value.company_id, { with: 'department,company' }),
    ])
  }

  if (filters.value.company_id) {
    await fetchReport()
  }
})

watch(
  () => filters.value.company_id,
  async (nextCompany) => {
    filters.value.department_id = ''
    filters.value.employee_id = ''
    if (!nextCompany) {
      departments.value = []
      return
    }
    await Promise.all([
      departmentStore.fetchDepartments(nextCompany),
      companyStore.fetchEmployee(nextCompany, { with: 'department,company' }),
    ])
  },
)
</script>

<template>
  <section class="space-y-3 px-3 pb-4">
    <header class="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <h1 class="text-base font-semibold text-slate-900">Yearly Delay Early Attendance Summary</h1>
      <p class="text-xs text-slate-500">
        Month-wise late, early, and total with yearly score average.
      </p>
    </header>

    <div class="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <div class="grid gap-2 items-end xl:grid-cols-[90px_1.1fr_1.1fr_1fr_1.1fr_110px_130px]">
        <div class="min-w-0 relative">
          <label class="top-label text-[10px] font-semibold uppercase tracking-wide text-slate-500">Year</label>
          <select v-model="filters.year" class="input-1 h-8 py-0 w-full text-xs">
            <option v-for="opt in yearOptions" :key="opt.id" :value="opt.id">
              {{ opt.label }}
            </option>
          </select>
        </div>

        <div class="min-w-0 relative">
          <label class="top-label text-[10px] font-semibold uppercase tracking-wide text-slate-500">Company</label>
          <SelectDropdown
            v-model="filters.company_id"
            :options="companyOptions"
            class="border border-gray-300 rounded h-8 w-full bg-white text-xs"
            clearable
          >
            <template #selected-option="{ option }">
              <div class="line-clamp-1 text-sm text-gray-900" :title="option?.label">
                <span v-if="option?.label">{{ option?.label }}</span>
                <span v-else class="text-gray-500 whitespace-nowrap">--Select Company--</span>
              </div>
            </template>
            <template #option="{ option }">
              <div class="line-clamp-1 text-sm text-gray-900 whitespace-nowrap" :title="option.label">
                {{ option.label }}
              </div>
            </template>
          </SelectDropdown>
        </div>

        <div class="min-w-0 relative">
          <label class="top-label text-[10px] font-semibold uppercase tracking-wide text-slate-500">Department</label>
          <SelectDropdown
            v-model="filters.department_id"
            :options="departmentOptions"
            class="border border-gray-300 rounded h-8 w-full bg-white text-xs"
            clearable
          >
            <template #selected-option="{ option }">
              <div class="line-clamp-1 text-sm text-gray-900" :title="option?.label">
                <span v-if="option?.label">{{ option?.label }}</span>
                <span v-else class="text-gray-500 whitespace-nowrap">--Select Department--</span>
              </div>
            </template>
            <template #option="{ option }">
              <div class="line-clamp-1 text-sm text-gray-900 whitespace-nowrap" :title="option.label">
                {{ option.label }}
              </div>
            </template>
          </SelectDropdown>
        </div>

        <div class="min-w-0 relative">
          <label class="top-label text-[10px] font-semibold uppercase tracking-wide text-slate-500">Line Type</label>
          <SelectDropdown
            v-model="filters.line_type"
            :options="typeOptions"
            class="border border-gray-300 rounded h-8 w-full bg-white text-xs"
          >
            <template #selected-option="{ option }">
              <div class="line-clamp-1 text-sm text-gray-900" :title="option?.label">
                <span v-if="option?.label">{{ option?.label }}</span>
                <span v-else class="text-gray-500 whitespace-nowrap">All Types</span>
              </div>
            </template>
            <template #option="{ option }">
              <div class="line-clamp-1 text-sm text-gray-900 whitespace-nowrap" :title="option.label">
                {{ option.label }}
              </div>
            </template>
          </SelectDropdown>
        </div>

        <div class="min-w-0 relative">
          <label class="top-label text-[10px] font-semibold uppercase tracking-wide text-slate-500">Employee</label>
          <EmployeeDropdownInput
            v-model="filters.employee_id"
            :employees="employeeOptions"
            class="border border-gray-300 rounded h-8 w-full bg-white text-xs"
          />
        </div>

        <div>
          <button class="btn-2 w-full rounded h-8 text-xs" :disabled="isLoading" @click="handleFilterChange">
            {{ isLoading ? 'Loading...' : 'Apply' }}
          </button>
        </div>

        <div>
          <button class="btn-1 rounded h-8 text-xs" :disabled="isLoading" @click="downloadExcel">
            Download Excel
          </button>
        </div>
      </div>
    </div>

    <div class="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div v-if="isLoading" class="py-8">
        <LoaderView />
      </div>

      <div v-else-if="rows.length === 0" class="empty-state">
        <p class="text-base font-semibold text-slate-700">No data found</p>
        <p class="text-xs text-slate-500">Try changing filters or year.</p>
      </div>

      <div v-else class="overflow-x-auto table-scroll">
        <table class="min-w-full table-auto border-collapse">
          <thead class="sticky top-0 bg-white shadow-sm">
            <tr class="bg-slate-50 text-[11px] text-left">
              <th class="th w-12" rowspan="2">#</th>
              <th class="th min-w-[180px]" rowspan="2">User</th>
              <th
                v-for="(month, monthIndex) in months"
                :key="month.key"
                class="th text-center"
                :class="monthGroupClass(monthIndex)"
                colspan="3"
              >
                {{ month.label }}
              </th>
              <th class="th text-center" rowspan="2">Score Avg</th>
            </tr>
            <tr class="bg-slate-50 text-[11px] text-left">
              <template v-for="(month, monthIndex) in months" :key="month.key">
                <th class="th text-center" :class="monthGroupClass(monthIndex)">Late</th>
                <th class="th text-center" :class="monthGroupClass(monthIndex)">Early</th>
                <th class="th text-center" :class="monthGroupClass(monthIndex)">Score</th>
              </template>
            </tr>
          </thead>
          <tbody class="text-[11px]">
            <tr
              v-for="(row, index) in rows"
              :key="row.user_id || index"
              class="border-b hover:bg-slate-100"
            >
              <td class="td">{{ index + 1 }}</td>
              <td class="td font-semibold text-slate-700 whitespace-nowrap">
                <div>
                  {{ row.user_name || '-' }}
                </div>
                <!-- <div class="text-xs">
                  <b>{{ row.department_name || '-' }}</b>
                </div> -->
              </td>
              <template v-for="(month, monthIndex) in months" :key="month.key">
                <td class="td text-center" :class="monthGroupClass(monthIndex)">
                  {{ monthCell(row, month.key).late }}
                </td>
                <td class="td text-center" :class="monthGroupClass(monthIndex)">
                  {{ monthCell(row, month.key).early }}
                </td>
                <td class="td text-center" :class="monthGroupClass(monthIndex)">
                  {{ monthCell(row, month.key).total }}
                </td>
              </template>
              <td class="td text-center font-semibold">{{ formatScore(scoreAvg(row)) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </section>
</template>

<style scoped>
.empty-state {
  @apply flex min-h-[140px] flex-col items-center justify-center gap-1 text-center;
}
.table-scroll {
  max-height: calc(100vh - 320px);
  max-width: 100%;
  overflow: auto;
}
.th {
  @apply border border-slate-200 px-1.5 py-1 font-semibold text-[11px] text-gray-700;
}
.td {
  @apply border border-slate-200 px-1.5 py-1 text-[11px] tabular-nums;
}
.month-group-odd {
  @apply bg-sky-100;
}
.month-group-even {
  @apply bg-emerald-50;
}
</style>
