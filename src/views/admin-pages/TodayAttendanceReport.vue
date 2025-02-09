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
const selectedDate = ref('')
const status = ref('')
const { companies } = storeToRefs(companyStore)
const { dailyLogs } = storeToRefs(attendanceStore)

const fetchAttendance = async () => {
  if (selectedCompanyId.value || status.value) {
    await attendanceStore.getTodayAttendanceReport(
      selectedCompanyId.value,
      attendanceStore.selectedDate,
      status.value,
    )
  }
}

onMounted(async () => {
  await companyStore.fetchCompanies()
  await attendanceStore.getTodayAttendanceReport(
    selectedCompanyId.value,
    attendanceStore.selectedDate,
  )
})

watch([selectedCompanyId, selectedDate], fetchAttendance)

const goBack = () => router.go(-1)
</script>

<template>
  <div class="px-4 space-y-4">
    <div class="flex items-center justify-between gap-2">
      <button class="btn-3" @click="goBack">
        <i class="far fa-arrow-left"></i>
        <span class="hidden md:flex">Back</span>
      </button>
      <h1 class="title-md md:title-lg flex-wrap text-center">Today Attendance Report</h1>
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
        <select id="userSelect" v-model="status" @change="fetchAttendance" class="input-1">
          <option value="">All Status</option>
          <option value="Present">Present</option>
          <option value="Absent">Absent</option>
          <option value="Weekend">Weekend</option>
          <option value="Holiday">Holiday</option>
          <option value="Leave">Leave</option>
        </select>
      </div>
      <div>
        <input
          type="date"
          v-model="attendanceStore.selectedDate"
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
              <th class="border p-1">Date</th>
              <th class="border p-1">Day</th>
              <th class="border p-1">Shift</th>
              <th class="border p-1">Entry Time</th>
              <th class="border p-1">Exit Time</th>
              <th class="border p-1">Working Hours</th>
              <th class="border p-1">Late Entry</th>
              <th class="border p-1">Early Leave</th>
              <th class="border p-1">Status</th>
            </tr>
          </thead>
          <tbody class="text-center text-xs">
            <tr v-for="log in dailyLogs" :key="log?.date">
              <td class="border px-1 py-0.5">{{ log.user_name }}</td>
              <td class="border px-1 py-0.5">{{ log.date }}</td>
              <td class="border px-1 py-0.5">{{ log.weekday }}</td>
              <td
                class="border px-1 py-0.5"
                :title="`${log.shift_start_time} to ${log.shift_end_time}`"
              >
                {{ log.shift_name }}
              </td>
              <td
                class="border px-1 py-0.5"
                :class="{ 'bg-red-200': log.late_duration }"
                :title="`Device: ${log.entry_device}`"
              >
                {{ log.entry_time }}
              </td>
              <td
                class="border px-1 py-0.5"
                :class="{ 'bg-red-200': log.early_leave_duration }"
                :title="`Device: ${log.exit_device}`"
              >
                {{ log.exit_time }}
              </td>
              <td class="border px-1 py-0.5">{{ log.working_hours }}</td>
              <td class="border px-1 py-0.5">{{ log.late_duration }}</td>
              <td class="border px-1 py-0.5">{{ log.early_leave_duration }}</td>
              <td
                class="border px-1 py-0.5"
                :class="{
                  'text-red-600': log.status === 'Absent',
                  'text-green-600': log.status === 'Present',
                }"
              >
                {{ log.status }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
