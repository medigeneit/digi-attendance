<script setup>
import { ref, onMounted } from 'vue';
import { useAttendanceStore } from '@/stores/attendance';
import { useUserStore } from '@/stores/user';
import { useToast } from 'vue-toastification';

const attendanceStore = useAttendanceStore();
const userStore = useUserStore();
const toast = useToast();

const selectedUserId = ref('');
const selectedMonth = ref('');
const attendanceLogs = ref([]);
const summary = ref({
  total_working_days: 0,
  present_days: 0,
  absent_days: 0,
  late_entries: 0,
  on_time_entries: 0,
  total_working_hours: '00:00',
  remarks: '',
});
const isLoading = ref(false);


const fetchAttendance = async () => {
  if (!selectedUserId.value || !selectedMonth.value) {
    return;
  }
  try {
    isLoading.value = true;
    const response = await attendanceStore.getMonthlyAttendanceByShift(selectedUserId.value, selectedMonth.value);
    attendanceLogs.value = response.monthly_logs || [];
    summary.value = response.summary || {};
  } catch (error) {
    toast.error('Failed to fetch attendance data.');
    console.error(error);
  } finally {
    isLoading.value = false;
  }
};


const users = userStore.users


onMounted(async () => {
  const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format
  selectedMonth.value = currentMonth;
  await userStore.fetchUsers()
});
</script>

<template>
  <div class="my-container space-y-4">
    <!-- Header Section -->
    <div class="flex justify-between items-center mb-4">
      <h1 class="title-lg">Monthly Attendance</h1>
      <div class="flex gap-4">
        <select
          id="user-select"
          v-model="selectedUserId"
          class="p-2 border rounded"
          @change="fetchAttendance"
        >
          <option value="" disabled>Select User</option>
          <option v-for="user in users" :key="user.id" :value="user.id">
            {{ user.name }}
          </option>
        </select>
        <input
          id="month"
          type="month"
          v-model="selectedMonth"
          class="p-2 border rounded"
          @change="fetchAttendance"
        />
      </div>
    </div>

    <!-- Loader -->
    <div v-if="isLoading" class="flex justify-center items-center h-64">
      <p>Loading attendance data...</p>
    </div>

    <!-- Summary Section -->
    <div v-else>
      <div class="border p-4 rounded-md bg-gray-100 mb-4">
        <h2 class="text-lg font-bold mb-2">Summary</h2>
        <div class="grid md:grid-cols-2 gap-4">
          <p><strong>Total Working Days:</strong> {{ summary.total_working_days }}</p>
          <p><strong>Present Days:</strong> {{ summary.present_days }}</p>
          <p><strong>Absent Days:</strong> {{ summary.absent_days }}</p>
          <p><strong>Late Entries:</strong> {{ summary.late_entries }}</p>
          <p><strong>On Time Entries:</strong> {{ summary.on_time_entries }}</p>
          <p><strong>Total Working Hours:</strong> {{ summary.total_working_hours }}</p>
          <p class="md:col-span-2"><strong>Remarks:</strong> {{ summary.remarks }}</p>
        </div>
      </div>

      <!-- Daily Logs Section -->
      <div>
        <h2 class="text-lg font-bold mb-2">Daily Logs</h2>
        <table class="min-w-full table-auto border-collapse border border-gray-300 bg-white">
          <thead>
            <tr class="bg-gray-200">
              <th class="border px-4 py-2">Date</th>
              <th class="border px-4 py-2">Entry Time</th>
              <th class="border px-4 py-2">Exit Time</th>
              <th class="border px-4 py-2">Entry Device</th>
              <th class="border px-4 py-2">Exit Device</th>
              <th class="border px-4 py-2">Status</th>
              <th class="border px-4 py-2">Working Hours</th>
              <th class="border px-4 py-2">Remarks</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="log in attendanceLogs" :key="log.date">
              <td class="border px-4 py-2">{{ log.date }}</td>
              <td class="border px-4 py-2">{{ log.entry_time }}</td>
              <td class="border px-4 py-2">{{ log.exit_time }}</td>
              <td class="border px-4 py-2">{{ log.entry_device }}</td>
              <td class="border px-4 py-2">{{ log.exit_device }}</td>
              <td class="border px-4 py-2">{{ log.status }}</td>
              <td class="border px-4 py-2">{{ log.working_hours }}</td>
              <td class="border px-4 py-2">{{ log.remarks }}</td>
            </tr>
            <tr v-if="attendanceLogs.length === 0">
              <td colspan="8" class="text-center text-gray-500 p-4">No attendance records found.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
