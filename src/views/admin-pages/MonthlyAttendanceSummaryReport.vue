<script setup>
import LoaderView from '@/components/common/LoaderView.vue'
import { useAttendanceStore } from '@/stores/attendance'
import { useCompanyStore } from '@/stores/company'
import { storeToRefs } from 'pinia'
import { onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const companyStore = useCompanyStore()
const attendanceStore = useAttendanceStore()
const selectedCompanyId = ref('')
const selectedMonth = ref('')
const { companies } = storeToRefs(companyStore)
const { monthly_company_summary } = storeToRefs(attendanceStore)

const fetchAttendance = async () => {
  if (selectedCompanyId.value) {
    await attendanceStore.getMonthlyAttendanceSummaryReport(
      selectedCompanyId.value,
      attendanceStore.selectedMonth,
    )
  }
}

onMounted(async () => {
  await companyStore.fetchCompanies()
})

watch([selectedCompanyId, selectedMonth], fetchAttendance)

const goBack = () => router.go(-1)
</script>

<template>
  <div class="px-4 space-y-4">
    <div class="flex items-center justify-between gap-2">
      <button class="btn-3" @click="goBack">
        <i class="far fa-arrow-left"></i>
        <span class="hidden md:flex">Back</span>
      </button>
      <h1 class="title-md md:title-lg flex-wrap text-center">Today Attendance Report Summary</h1>
      <div></div>
    </div>

    <div class="flex gap-4">
      <div>
        <select
          id="userSelect"
          v-model="selectedCompanyId"
          @change="fetchAttendance"
          class="input-1"
        >
          <option value="" disabled>Select a Company</option>
          <option v-for="company in companies" :key="company?.id" :value="company?.id">
            {{ company?.name }}
          </option>
        </select>
      </div>
      <div>
        <input
          type="month"
          v-model="attendanceStore.selectedMonth"
          @change="fetchAttendance"
          class="input-1"
        />
      </div>
    </div>

    <LoaderView v-if="attendanceStore.isLoading" />

    <div v-else class="space-y-4">
      <div class="overflow-x-auto card-bg">
        <table class="min-w-full table-auto border-collapse border border-gray-300 bg-white">
          <thead>
            <tr class="bg-gray-100 text-sm">
              <th rowspan="2" class="border px-1 py-0.5">Employee Name</th>
              <th rowspan="2" class="border px-1 py-0.5">Designation</th>
              <th colspan="4" class="border px-1 py-0.5">Attendance Summary</th>
              <!-- <th rowspan="2" class="border px-1 py-0.5">Total Present</th>
              <th rowspan="2" class="border px-1 py-0.5">Total Absent</th>
              <th rowspan="2" class="border px-1 py-0.5">Remain Absent</th>
              <th rowspan="2" class="border px-1 py-0.5">Total Weekend</th> -->
              <th colspan="2" class="border px-1 py-0.5">Actual Late</th>
              <th colspan="2" class="border px-1 py-0.5">Remaining Late</th>
              <th colspan="2" class="border px-1 py-0.5">Actual Early</th>
              <th colspan="2" class="border px-1 py-0.5">Remaining Early</th>
              <!-- <th rowspan="2" class="border px-1 py-0.5">Shift Hour</th> -->
              <th rowspan="2" class="border px-1 py-0.5">Working Hour</th>
              <th rowspan="2" class="border px-1 py-0.5">OT Hour</th>
              <th colspan="4" class="border px-1 py-0.5">Leave Day</th>
              <th colspan="2" class="border px-1 py-0.5">Short Leave</th>
              <th rowspan="2" class="border px-1 py-0.5">Duty in Weekend</th>
              <th rowspan="2" class="border px-2 py-0.5">Comment</th>
            </tr>
            <tr class="bg-gray-100 text-xs">
              <th class="border px-2 py-0.5">TD</th>
              <th class="border px-2 py-0.5">TP</th>
              <th class="border px-2 py-0.5">TW</th>
              <th class="border px-2 py-0.5">TA</th>
              <th class="border px-1 py-0.5">Day</th>
              <th class="border px-2 py-0.5">Hour</th>
              <th class="border px-1 py-0.5">Day</th>
              <th class="border px-2 py-0.5">Hour</th>
              <th class="border px-1 py-0.5">Day</th>
              <th class="border px-2 py-0.5">Hour</th>
              <th class="border px-2 py-0.5">Day</th>
              <th class="border px-2 py-0.5">Hour</th>
              <th class="border px-2 py-0.5">CL</th>
              <th class="border px-2 py-0.5">ML</th>
              <th class="border px-2 py-0.5">SL</th>
              <th class="border px-2 py-0.5">WPL</th>
              <th class="border px-2 py-0.5">Entry</th>
              <th class="border px-2 py-0.5">Exist</th>
            </tr>
          </thead>
          <tbody class="text-center text-sm">
            <tr
              v-for="log in monthly_company_summary"
              :key="log?.date"
              class="hover:bg-blue-500 hover:text-white"
            >
              <td class="border px-2 py-0.5">{{ log?.user }}</td>
              <td class="border px-2 py-0.5">{{ log?.designation }}</td>
              <td class="border px-2 py-0.5">{{ log?.total_monthly_days }}</td>
              <td class="border px-2 py-0.5">{{ log?.total_present }}</td>
              <td class="border px-2 py-0.5">{{ log?.total_weekend }}</td>
              <td class="border px-2 py-0.5">{{ log?.total_absent }}</td>
              <!-- <td class="border px-2 py-0.5">{{ log?.remain_total_absent }}</td> -->
              <td class="border px-2 py-0.5">{{ log?.actual_late_day }}</td>
              <td class="border px-2 py-0.5">{{ log?.actual_late_hour }}</td>
              <td class="border px-2 py-0.5">{{ log?.total_remain_late_day }}</td>
              <td class="border px-2 py-0.5">{{ log?.total_remain_late_hour }}</td>
              <td class="border px-2 py-0.5">{{ log?.actual_early_day }}</td>
              <td class="border px-2 py-0.5">{{ log?.actual_early_hour }}</td>
              <td class="border px-2 py-0.5">{{ log?.total_remain_early_day }}</td>
              <td class="border px-2 py-0.5">{{ log?.total_remain_early_hour }}</td>
              <td class="border px-2 py-0.5">
                {{ log?.total_working_hours || 0 }} / {{ log?.total_shift_hour || 0 }}
              </td>
              <td class="border px-2 py-0.5">{{ log?.total_overtime_hours }}</td>
              <td class="border px-2 py-0.5">{{ log?.total_cl_leave }}</td>
              <td class="border px-2 py-0.5">{{ log?.total_ml_leave }}</td>
              <td class="border px-2 py-0.5">{{ log?.total_sl_leave }}</td>
              <td class="border px-2 py-0.5">{{ log?.total_wpl_leave }}</td>
              <td class="border px-2 py-0.5">{{ log?.total_first_short_leave }}</td>
              <td class="border px-2 py-0.5">{{ log?.total_last_short_leave }}</td>
              <td class="border px-2 py-0.5">{{ log.total_present_in_weekend }}</td>
              <td class="border px-2 py-0.5"></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
