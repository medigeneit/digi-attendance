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
            <tr class="bg-gray-200 text-xs">
              <th class="border p-1">Emp/Worker Name</th>
              <th class="border p-1">Day</th>
              <th class="border p-1">Total Present</th>
              <th class="border p-1">Total Absent</th>
              <th class="border p-1">Remain Absent</th>
              <th class="border p-1">Total Weekend</th>
              <th class="border p-1">Actual Late Day</th>
              <th class="border p-1">Actual Late Hour</th>
              <th class="border p-1">Actual Early Day</th>
              <th class="border p-1">Actual Early Hour</th>
              <th class="border p-1">Shift Hour</th>
              <th class="border p-1">Working Hour</th>
              <th class="border p-1">OT Hour</th>
              <th class="border p-1">Short Leave Day</th>
              <th class="border p-1">Leave Day</th>
              <th class="border p-1">Total Present In Weekend</th>
            </tr>
          </thead>
          <tbody class="text-center text-xs">
            <tr v-for="log in monthly_company_summary" :key="log?.date">
              <td class="border px-1 py-0.5">{{ log?.user }}</td>
              <td class="border px-1 py-0.5">{{ log?.total_monthly_days }}</td>
              <td class="border px-1 py-0.5">{{ log?.total_present }}</td>
              <td class="border px-1 py-0.5">{{ log?.total_absent }}</td>
              <td class="border px-1 py-0.5">{{ log?.remain_total_absent }}</td>
              <td class="border px-1 py-0.5">{{ log?.total_weekend }}</td>
              <td class="border px-1 py-0.5">{{ log?.actual_late_day }}</td>
              <td class="border px-1 py-0.5">{{ log?.actual_late_hour }}</td>
              <td class="border px-1 py-0.5">{{ log?.actual_early_day }}</td>
              <td class="border px-1 py-0.5">{{ log?.actual_early_hour }}</td>
              <td class="border px-1 py-0.5">{{ log?.total_shift_hour }}</td>
              <td class="border px-1 py-0.5">{{ log?.total_working_hours }}</td>
              <td class="border px-1 py-0.5">{{ log?.total_overtime_hours }}</td>
              <td class="border px-1 py-0.5">{{ log?.total_short_leave }}</td>
              <td class="border px-1 py-0.5">
                <div v-if="log?.total_cl_leave">{{ log?.total_cl_leave }}CL</div>
                <div v-if="log?.total_ml_leave">{{ log?.total_ml_leave }}ML</div>
                <div v-if="log?.total_sl_leave">{{ log?.total_sl_leave }}SL</div>
                <div v-if="log?.total_wpl_leave">{{ log?.total_wpl_leave }}WPL</div>
              </td>
              <td class="border px-1 py-0.5">{{ log.total_present_in_weekend }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
