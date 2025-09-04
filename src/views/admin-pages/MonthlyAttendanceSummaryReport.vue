<script setup>
import EmployeeFilter from '@/components/common/EmployeeFilter.vue'
import LoaderView from '@/components/common/LoaderView.vue'
import { useAttendanceStore } from '@/stores/attendance'
import { useAuthStore } from '@/stores/auth'
import { storeToRefs } from 'pinia'
import { ref, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import UpdateApprovalTime from '@/components/paycut/UpdateOrCreate.vue'
import DisplayFormattedWorkingHours from '@/components/paycut/DisplayFormattedWorkingHours.vue'
const router = useRouter()
const route = useRoute()

const authStore = useAuthStore()
const attendanceStore = useAttendanceStore()
const selectedMonth = ref(route.query.date || attendanceStore.selectedMonth)

const { monthly_company_summary } = storeToRefs(attendanceStore)

const filters = ref({
  company_id: route.query.company_id || '',
  department_id: route.query.department_id || 'all',
  line_type: route.query.line_type || 'all',
  employee_id: route.query.employee_id || '',
})

// ✅ Fetch attendance data
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


// ✅ Sync filters with query only when changed
const handleFilterChange = () => {
  const currentQuery = route.query
  const newQuery = {
    ...currentQuery,
    company_id: filters.value.company_id,
    department_id: filters.value.department_id,
    line_type: filters.value.line_type,
    employee_id: filters.value.employee_id,
    date: selectedMonth.value
  }

  // only replace if query actually changed
  const isDifferent = Object.keys(newQuery).some(
    (key) => currentQuery[key] !== String(newQuery[key])
  )

  if (isDifferent) {
    router.replace({ query: newQuery })
  }
}

watch(selectedMonth, (date) => {
  if (route.query.date !== date) {
    router.replace({
      query: {
        ...route.query,
        date
      }
    })
  }
})

// ✅ Initial load
onMounted(() => {
  if (filters.value.company_id) {
    fetchAttendance()
  }
})

// Export handlers
const getExportExcel = async () => {
  if (filters.value.company_id) {
    const line_type = filters.value.line_type !== 'all' ? filters.value.line_type : ''
    await attendanceStore.downloadExcel(
      filters.value.company_id,
      line_type,
      selectedMonth.value
    )
  }
}

const getDownloadPDF = async () => {
  if (filters.value.company_id) {
    const line_type = filters.value.line_type !== 'all' ? filters.value.line_type : ''
    await attendanceStore.downloadPDF(
      filters.value.company_id,
      line_type,
      selectedMonth.value
    )
  }
}

const goBack = () => router.go(-1)

const refreshPaycutList = async () => {
  await fetchAttendance()
}
</script>



<template>
  <div class="px-4 space-y-4">
    <div class="flex items-center justify-between gap-2">
      <button class="btn-3" @click="goBack">
        <i class="far fa-arrow-left"></i>
        <span class="hidden md:flex">Back</span>
      </button>
      <h1 class="title-md md:title-lg flex-wrap text-center">Monthly Attendance Summary Report</h1>
      <div class="flex gap-4">
        <button type="button" @click="getExportExcel" class="btn-1">
          <i class="far fa-file-excel text-2xl text-green-500"></i>
        </button>
        <button type="button" @click="getDownloadPDF" class="btn-1">
          <i class="fal fa-file-pdf text-2xl text-red-500"></i>
        </button>
      </div>
    </div>

    <div class="flex flex-wrap gap-4">
      <EmployeeFilter 
          v-model:company_id="filters.company_id"
          v-model:department_id="filters.department_id"
          v-model:employee_id="filters.employee_id"
          v-model:line_type="filters.line_type"
          :with-type="true"
          :initial-value="$route.query"
         @filter-change="handleFilterChange" 
      />
      <div class="flex gap-4">
        <input type="month" v-model="selectedMonth" class="input-1" />
        <button type="button" @click="fetchAttendance()" class="btn-2">Search</button>
      </div>
    </div>

    <LoaderView v-if="attendanceStore.isLoading" />

    <div v-else class="space-y-4">
      <div class="overflow-x-auto card-bg" v-if="filters.company_id">
        <table class="min-w-full table-auto border-collapse border border-gray-300 bg-white">
          <thead class="sticky top-0 z-10 bg-white shadow-sm">
            <tr class="bg-gray-100 text-sm">
              <th rowspan="2" class="border px-1 py-0.5">#</th>
              <th rowspan="2" class="border px-1 py-0.5">Employee Name</th>
              <th rowspan="2" class="border px-1 py-0.5">Designation</th>
              <th colspan="5" class="border px-1 py-0.5">Attendance Summary</th>
              <th colspan="2" class="border px-1 py-0.5">Actual Late</th>
              <th colspan="2" class="border px-1 py-0.5">Remaining Late</th>
              <th colspan="2" class="border px-1 py-0.5">Actual Early</th>
              <th colspan="2" class="border px-1 py-0.5">Remaining Early</th>
              <th rowspan="2" class="border px-1 py-0.5">Working Hour</th>
              <th colspan="4" class="border px-1 py-0.5">Leave Day</th>
              <th colspan="2" class="border px-1 py-0.5">Short Leave</th>
              <th rowspan="2" class="border px-1 py-0.5">OT Hour</th>
              <th colspan="4" class="border px-1 py-0.5">Deduction</th>
              <th rowspan="2" class="border px-8 py-0.5">Action</th>
            </tr>
            <tr class="bg-gray-100 text-xs">
              <th class="border px-2 py-0.5">TD</th>
              <th class="border px-2 py-0.5">TP</th>
              <th class="border px-2 py-0.5">TW</th>
              <th class="border px-2 py-0.5">TL</th>
              <th class="border px-2 py-0.5">TA</th>
              <th class="border px-1 py-0.5">Day</th>
              <th class="border px-2 py-0.5">Hour</th>
              <th class="border px-1 py-0.5">Day</th>
              <th class="border px-2 py-0.5">Hour</th>
              <th class="border px-1 py-0.5">Day</th>
              <th class="border px-2 py-0.5">Hour</th>
              <th class="border px-1 py-0.5">Day</th>
              <th class="border px-2 py-0.5">Hour</th>
              <th class="border px-2 py-0.5">CL</th>
              <th class="border px-2 py-0.5">ML</th>
              <th class="border px-2 py-0.5">SL</th>
              <th class="border px-2 py-0.5">WPL</th>
              <th class="border px-2 py-0.5">Delay</th>
              <th class="border px-2 py-0.5">Early</th>
              <th class="border px-2 py-0.5">Absent Hour</th>
              <th class="border px-2 py-0.5">WPL(Hour)</th>
              <th class="border px-2 py-0.5">Pay Cut</th>
              <th class="border px-2 py-0.5">Payable Hour</th>
            </tr>
          </thead>
          <tbody class="text-center text-sm">
            <tr
              v-for="(log, index) in monthly_company_summary"
              :key="log?.date"
              class="border-b border-gray-200 hover:bg-blue-200"
            >
              <td class="border px-2 py-0.5">{{ index + 1 }}</td>
              <td class="border px-2 py-0.5">{{ log?.user }}</td>
              <td class="border px-2 py-0.5">{{ log?.designation }}</td>
              <td class="border px-2 py-0.5">{{ log?.total_monthly_days }}</td>
              <td class="border px-2 py-0.5">{{ log?.total_present }}</td>
              <td class="border px-2 py-0.5">{{ log?.total_weekend }}</td>
              <td class="border px-2 py-0.5">{{ log?.total_leave }}</td>
              <td class="border px-2 py-0.5">{{ log?.total_absent }}</td>
              <td class="border px-2 py-0.5">{{ log?.actual_late_day }}</td>
              <td class="border px-2 py-0.5">{{ log?.actual_late_hour }}</td>
              <td class="border px-2 py-0.5">{{ log?.total_remain_late_day }}</td>
              <td class="border px-2 py-0.5">{{ log?.total_remain_late_hour }}</td>
              <td class="border px-2 py-0.5">{{ log?.actual_early_day }}</td>
              <td class="border px-2 py-0.5">{{ log?.actual_early_hour }}</td>
              <td class="border px-2 py-0.5">{{ log?.total_remain_early_day }}</td>
              <td class="border px-2 py-0.5">{{ log?.total_remain_early_hour }}</td>
              <td class="border py-0.5">
                <div class="border-b border-black font-semibold text-green-600">
                  {{ log?.total_working_hours || 0 }}
                </div>
                <div class="text-gray-600">{{ log?.total_shift_hour || 0 }}</div>
              </td>
              <td class="border px-2 py-0.5">{{ log?.total_cl_leave }}</td>
              <td class="border px-2 py-0.5">{{ log?.total_ml_leave }}</td>
              <td class="border px-2 py-0.5">{{ log?.total_sl_leave }}</td>
              <td class="border px-2 py-0.5">{{ log?.total_wpl_leave }}</td>
              <td class="border px-2 py-0.5">{{ log?.total_first_short_leave }}</td>
              <td class="border px-2 py-0.5">{{ log?.total_last_short_leave }}</td>
              <td class="border px-2 py-0.5">
                {{ log?.total_overtime_hours ? log?.total_overtime_hours + ' H' : '' }}
              </td>
              <td class="border px-2 py-0.5">{{ log?.total_absent * 9 }}H</td>
              <td class="border px-2 py-0.5">{{ log?.total_wpl_hour }}H</td>
              <td class="border px-2 py-0.5">
                <div class="flex gap-2 items-center">
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
              <td class="border px-2 py-0.5">{{ log?.payable_hour }}H</td>
              <td class="border">
                <router-link
                  :to="{
                    name: 'EmployeeAttendance',
                    query: {
                      ...route.query,
                      employee_id: log?.user_id,
                      date: selectedMonth
                    }
                  }"
                  target="_blank"
                  class="inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm font-medium bg-blue-50 text-blue-700 hover:bg-blue-100"
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
        </table>
      </div>
      <div v-else class="text-center text-red-500 text-xl italic mt-10">Please select company</div>
    </div>
  </div>
</template>


<style setup>
.card-bg {
  max-height: 80vh;
  overflow: auto;
}
</style>