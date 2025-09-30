<script setup>
import EmployeeFilter from '@/components/common/EmployeeFilter.vue'
import LoaderView from '@/components/common/LoaderView.vue'
import UpdateApprovalTime from '@/components/paycut/UpdateOrCreate.vue'
import DisplayFormattedWorkingHours from '@/components/paycut/DisplayFormattedWorkingHours.vue'

import { useAttendanceStore } from '@/stores/attendance'
import { useAuthStore } from '@/stores/auth'
import { storeToRefs } from 'pinia'
import { ref, watch, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const router = useRouter()
const route = useRoute()

const authStore = useAuthStore()
const attendanceStore = useAttendanceStore()
const { monthly_company_summary } = storeToRefs(attendanceStore)

// ---------- utils ----------
const toNum = (v) => {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}
const sumBy = (rows, keyPath) => {
  // keyPath can be 'total_cl_leave' or 'paycut.paycut_hours'
  return rows.reduce((acc, row) => {
    try {
      const val = keyPath.split('.').reduce((o, k) => (o ? o[k] : undefined), row)
      return acc + toNum(val)
    } catch {
      return acc
    }
  }, 0)
}

// ---------- reactive state ----------
const selectedMonth = ref(
  (route.query.date && String(route.query.date)) || attendanceStore.selectedMonth || ''
)

const filters = ref({
  company_id: route.query.company_id || '',
  department_id: route.query.department_id || 'all',
  line_type: route.query.line_type || 'all',
  employee_id: route.query.employee_id || '',
})

// normalize store data → always an array to avoid reduce null error
const summaryRows = computed(() =>
  Array.isArray(monthly_company_summary.value) ? monthly_company_summary.value : []
)

// footer totals (safe)
const totals = computed(() => {
  const rows = summaryRows.value
  return {
    cl:  sumBy(rows, 'total_cl_leave'),
    ml:  sumBy(rows, 'total_ml_leave'),
    sl:  sumBy(rows, 'total_sl_leave'),
    wplDays: sumBy(rows, 'total_wpl_leave'),
    otHour:  sumBy(rows, 'total_overtime_hours'),
    absentDays: sumBy(rows, 'total_absent'),
    wplHour: sumBy(rows, 'total_wpl_hour'),
    paycutHour: sumBy(rows, 'paycut.paycut_hours'),
    payableHour: sumBy(rows, 'payable_hour'),
  }
})

// ---------- data actions ----------
const fetchAttendance = async () => {
  const companyId = filters.value.company_id
  const employeeId = filters.value.employee_id || ''
  const line_type = filters.value.line_type !== 'all' ? filters.value.line_type : ''

  if (!companyId) {
    alert('⚠️ Please select a company first.')
    return
  }

  try {
    await attendanceStore.getMonthlyAttendanceSummaryReport(
      companyId,
      line_type,
      employeeId,
      selectedMonth.value
    )
  } catch (error) {
    console.error('❌ Failed to load attendance:', error)
    alert('❌ Failed to load attendance data.')
  }
}

// keep URL query in sync when filters or month change
const replaceQueryIfChanged = (nextQuery) => {
  const current = route.query
  const changed = Object.keys(nextQuery).some((k) => String(current[k] ?? '') !== String(nextQuery[k] ?? ''))
  if (changed) router.replace({ query: nextQuery })
}

const handleFilterChange = () => {
  replaceQueryIfChanged({
    ...route.query,
    company_id: filters.value.company_id || '',
    department_id: filters.value.department_id || 'all',
    line_type: filters.value.line_type || 'all',
    employee_id: filters.value.employee_id || '',
    date: selectedMonth.value || '',
  })
}

watch(selectedMonth, (date) => {
  replaceQueryIfChanged({ ...route.query, date: date || '' })
})

onMounted(() => {
  if (filters.value.company_id) fetchAttendance()
})

// exports
const getExportExcel = async () => {
  if (!filters.value.company_id) return
  const line_type = filters.value.line_type !== 'all' ? filters.value.line_type : ''
  await attendanceStore.downloadExcel(filters.value.company_id, line_type, selectedMonth.value)
}
const getDownloadPDF = async () => {
  if (!filters.value.company_id) return
  const line_type = filters.value.line_type !== 'all' ? filters.value.line_type : ''
  await attendanceStore.downloadPDF(filters.value.company_id, line_type, selectedMonth.value)
}
const goBack = () => router.go(-1)
const refreshPaycutList = async () => { await fetchAttendance() }
</script>

<template>
  <div class="px-4 space-y-4">
    <!-- Top Bar -->
    <div class="flex items-center justify-between gap-2">
      <button class="btn-3" @click="goBack">
        <i class="far fa-arrow-left"></i>
        <span class="hidden md:flex">Back</span>
      </button>

      <h1 class="title-md md:title-lg flex-wrap text-center">
        Monthly Attendance Summary Report
      </h1>

      <div class="flex gap-2">
        <button type="button" @click="getExportExcel" class="btn-1" :disabled="!filters.company_id">
          <i class="far fa-file-excel text-2xl text-green-500"></i>
        </button>
        <button type="button" @click="getDownloadPDF" class="btn-1" :disabled="!filters.company_id">
          <i class="fal fa-file-pdf text-2xl text-red-500"></i>
        </button>
      </div>
    </div>

    <!-- Filters -->
    <div class="flex flex-wrap items-end gap-4">
      <EmployeeFilter
        v-model:company_id="filters.company_id"
        v-model:department_id="filters.department_id"
        v-model:employee_id="filters.employee_id"
        v-model:line_type="filters.line_type"
        :with-type="true"
        :initial-value="$route.query"
        @filter-change="handleFilterChange"
      />

      <div class="flex items-end gap-3">
        <div class="flex flex-col">
          <label class="text-xs text-gray-600 mb-1">Month</label>
          <input type="month" v-model="selectedMonth" class="input-1" />
        </div>
        <button type="button" @click="fetchAttendance()" class="btn-2">Search</button>
      </div>
    </div>

    <!-- Loading -->
    <LoaderView v-if="attendanceStore.isLoading" />

    <!-- Empty / Select prompt -->
    <div v-else-if="!filters.company_id" class="text-center text-red-500 text-lg italic mt-10">
      Please select company
    </div>

    <!-- Empty state -->
    <div v-else-if="summaryRows.length === 0" class="card-bg p-8 border rounded-lg text-center text-gray-600">
      No attendance found for the selected month & filters.
    </div>

    <!-- Table -->
    <div v-else class="overflow-x-auto card-bg border rounded-lg">
      <table class="min-w-full table-auto border-collapse">
        <thead class="sticky top-0 z-10 bg-white shadow-sm">
          <tr class="bg-gray-50 text-sm">
            <th rowspan="2" class="th">#</th>
            <th rowspan="2" class="th text-left">Employee Name</th>
            <th rowspan="2" class="th text-left">Designation</th>
            <th colspan="5" class="th">Attendance Summary</th>
            <th colspan="2" class="th">Actual Late</th>
            <th colspan="2" class="th">Remaining Late</th>
            <th colspan="2" class="th">Actual Early</th>
            <th colspan="2" class="th">Remaining Early</th>
            <th rowspan="2" class="th">Working Hour</th>
            <th colspan="4" class="th">Leave Day</th>
            <th colspan="2" class="th">Short Leave</th>
            <th rowspan="2" class="th">OT Hour</th>
            <th colspan="4" class="th">Deduction</th>
            <th rowspan="2" class="th">Action</th>
          </tr>
          <tr class="bg-gray-50 text-xs">
            <th class="th">TD</th>
            <th class="th">TP</th>
            <th class="th">TW</th>
            <th class="th">TL</th>
            <th class="th">TA</th>
            <th class="th">Day</th>
            <th class="th">Hour</th>
            <th class="th">Day</th>
            <th class="th">Hour</th>
            <th class="th">Day</th>
            <th class="th">Hour</th>
            <th class="th">Day</th>
            <th class="th">Hour</th>
            <th class="th">CL</th>
            <th class="th">ML</th>
            <th class="th">SL</th>
            <th class="th">WPL</th>
            <th class="th">Delay</th>
            <th class="th">Early</th>
            <th class="th">Absent Hour</th>
            <th class="th">WPL(Hour)</th>
            <th class="th">Pay Cut</th>
            <th class="th">Payable Hour</th>
          </tr>
        </thead>

        <tbody class="text-center text-xs">
          <tr
            v-for="(log, index) in summaryRows"
            :key="`${log?.user_id || 'u'}-${index}`"
            class="border-b hover:bg-blue-50"
          >
            <td class="td">{{ index + 1 }}</td>
            <td class="td text-left">{{ log?.user }}</td>
            <td class="td text-left">{{ log?.designation }}</td>
            <td class="td">{{ log?.total_monthly_days }}</td>
            <td class="td">{{ log?.total_present }}</td>
            <td class="td">{{ log?.total_weekend }}</td>
            <td class="td">{{ log?.total_leave }}</td>
            <td class="td">{{ log?.total_absent }}</td>

            <td class="td">{{ log?.actual_late_day }}</td>
            <td class="td">{{ log?.actual_late_hour }}</td>
            <td class="td">{{ log?.total_remain_late_day }}</td>
            <td class="td">{{ log?.total_remain_late_hour }}</td>

            <td class="td">{{ log?.actual_early_day }}</td>
            <td class="td">{{ log?.actual_early_hour }}</td>
            <td class="td">{{ log?.total_remain_early_day }}</td>
            <td class="td">{{ log?.total_remain_early_hour }}</td>
            
            <td class="td text-xs" :class="{ '!text-red-500': log?.under_target }">
                <div class="font-semibold" :class="log?.under_target ? 'text-red-600' : 'text-green-600'">
                  {{ log?.total_working_hours }}
                </div>
                <div class="text-gray-500">
                  of {{ log?.total_shift_hour }}
                </div>
              </td>

            <!-- <td class="td">
              <div class="border-b border-black font-semibold text-green-600">
                {{ log?.total_working_hours || 0 }}
              </div>
              <div class="text-gray-600">{{ log?.total_shift_hour || 0 }}</div>
            </td> -->

            <td class="td">{{ log?.total_cl_leave }}</td>
            <td class="td">{{ log?.total_ml_leave }}</td>
            <td class="td">{{ log?.total_sl_leave }}</td>
            <td class="td">{{ log?.total_wpl_leave }}</td>

            <td class="td">
              <p class="text-xs w-10 text-gray-600">
                {{ log?.total_first_short_leave || 0 }} of {{ log?.actual_late_day || 0 }}
              </p>
            </td>

            <!-- Short Leave vs Actual Early -->
            <td class="td">
              <p class="text-xs w-10 text-gray-600">
                {{ log?.total_last_short_leave || 0 }} of {{ log?.actual_early_day || 0 }}
              </p>
            </td>

            <td class="td">
              {{ log?.total_overtime_hours ? `${log?.total_overtime_hours} H` : '' }}
            </td>

            <td class="td">{{ toNum(log?.total_absent) * 9 }}H</td>
            <td class="td">{{ log?.total_wpl_hour }}H</td>

            <td class="td">
              <div class="flex gap-2 items-center justify-center">
                <DisplayFormattedWorkingHours :workingHours="log?.paycut?.paycut_hours" />
                <UpdateApprovalTime
                  class="mr-2"
                  :userId="log?.user_id"
                  :month="selectedMonth"
                  v-if="authStore.user?.id === 8"
                  @updated="refreshPaycutList"
                />
              </div>
            </td>

            <td class="td">{{ log?.payable_hour }}H</td>

            <td class="td ">
              <router-link
                :to="{
                  name: 'EmployeeAttendance',
                  query: { ...route.query, employee_id: log?.user_id, date: selectedMonth }
                }"
                target="_blank"
                class="inline-flex w-20 items-center gap-1 rounded-md px-1 py-1 font-medium bg-blue-50 text-blue-700 hover:bg-blue-100"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="none"
                     stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M15 3h6v6"></path><path d="M10 14 21 3"></path><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                </svg>
                Job Card
              </router-link>
            </td>
          </tr>
        </tbody>

        <tfoot>
          <tr class="bg-gray-100 font-semibold text-sm text-center">
            <td colspan="17" class="td">Total</td>

            <td class="td">{{ totals.cl }}</td>
            <td class="td">{{ totals.ml }}</td>
            <td class="td">{{ totals.sl }}</td>
            <td class="td">{{ totals.wplDays }}</td>

            <td class="td"></td>
            <td class="td"></td>

            <td class="td">{{ totals.otHour }}</td>
            <td class="td">{{ totals.absentDays }} day</td>
            <td class="td">{{ totals.wplHour }}</td>
            <td class="td">{{ totals.paycutHour }}</td>
            <td class="td">{{ totals.payableHour }}</td>
            <td class="td"></td>
          </tr>
        </tfoot>
      </table>
    </div>
  </div>
</template>

<style scoped>
.card-bg { max-height: 80vh; overflow: auto; }
.th { @apply border px-2 py-1 text-xs font-semibold text-gray-700; }
.td { @apply border px-2 py-1; }
</style>
