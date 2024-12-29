<script setup>
import { ref, onMounted, watch } from 'vue'
import { useAttendanceStore } from '@/stores/attendance'
import { useUserStore } from '@/stores/user'
import { useRouter } from 'vue-router'
import LoaderView from '@/components/common/LoaderView.vue'

const router = useRouter()
const userStore = useUserStore()
const attendanceStore = useAttendanceStore()

const selectedUserId = ref('')
const selectedMonth = ref('')

const fetchAttendance = async () => {
  if (selectedUserId.value) {
    await attendanceStore.getMonthlyAttendanceByShift(
      selectedUserId.value,
      attendanceStore.selectedMonth,
    )
  }
}

onMounted(async () => {
  userStore.fetchUsers()
})

watch([selectedUserId, selectedMonth], fetchAttendance)

const goBack = () => router.go(-1)
</script>

<template>
  <div class="px-4 space-y-4">
    <div class="flex items-center justify-between gap-2">
      <button class="btn-3" @click="goBack">
        <i class="far fa-arrow-left"></i>
        <span class="hidden md:flex">Back</span>
      </button>
      <h1 class="title-md md:title-lg flex-wrap text-center">Monthly Attendance</h1>
      <div></div>
    </div>

    <div class="flex gap-4">
      <div>
        <select id="userSelect" v-model="selectedUserId" @change="fetchAttendance" class="input-1">
          <option value="" disabled>Select a user</option>
          <option v-for="user in userStore.users" :key="user?.id" :value="user?.id">
            {{ user?.name }}
          </option>
        </select>
      </div>
      <div>
        <input
          id="monthSelect"
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
            <tr class="bg-gray-200">
              <th class="border px-2 py-1">Date</th>
              <th class="border px-2 py-1">Shift</th>
              <th class="border px-2 py-1">Entry Time</th>
              <th class="border px-2 py-1">Exit Time</th>
              <th class="border px-2 py-1">Status</th>
              <th class="border px-2 py-1">Working Hours</th>
              <th class="border px-2 py-1">Remarks</th>
            </tr>
          </thead>
          <tbody class="text-center text-sm">
            <tr v-for="log in attendanceStore?.monthlyLogs" :key="log?.date">
              <td class="border px-2 py-1">{{ log.date }}</td>
              <td
                class="border px-2 py-1"
                :title="`${log.shift_start_time} to ${log.shift_end_time}`"
              >
                {{ log.shift_name }}
              </td>
              <td class="border px-2 py-1" :title="`Device: ${log.entry_device}`">
                {{ log.entry_time }}
              </td>
              <td class="border px-2 py-1" :title="`Device: ${log.exit_device}`">
                {{ log.exit_time }}
              </td>
              <td class="border px-2 py-1">{{ log.status }}</td>
              <td class="border px-2 py-1">{{ log.working_hours }}</td>
              <td class="border px-2 py-1">{{ log.remarks }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Summary -->
      <div class="p-4 card-bg">
        <h2 class="text-lg font-bold mb-2">Summary</h2>
        <div class="grid md:grid-cols-2 gap-4">
          <p>
            <strong>Total Working Days:</strong> {{ attendanceStore?.summary?.total_working_days }}
          </p>
          <p><strong>Present Days:</strong> {{ attendanceStore?.summary?.total_present_days }}</p>
          <p><strong>Absent Days:</strong> {{ attendanceStore?.summary?.total_absent_days }}</p>
          <p><strong>Late Days:</strong> {{ attendanceStore?.summary?.total_late_days }}</p>
          <p>
            <strong>Total Working Hours:</strong>
            {{ attendanceStore?.summary?.total_working_hours }}
          </p>
          <p>
            <strong>Total Overtime Hours:</strong>
            {{ attendanceStore?.summary?.total_overtime_hours }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
