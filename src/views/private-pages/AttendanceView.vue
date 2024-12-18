<script setup>
import { ref, onMounted } from 'vue';
import { useAuthStore } from '@/stores/auth';

const authStore = useAuthStore();
const attendanceLogs = ref([]);
const loading = ref(true);
const errorMessage = ref(null);

const fetchAttendance = async () => {
    loading.value = true;
    errorMessage.value = null;
    try {
        const data = await authStore.fetchAttendance();
        attendanceLogs.value = data || [];
    } catch (error) {
        errorMessage.value = 'Failed to fetch attendance logs.';
    } finally {
        loading.value = false;
    }
};

onMounted(() => {
    fetchAttendance();
});
</script>

<template>
  <div class="p-6 bg-gray-100 min-h-screen">
    <h1 class="text-2xl font-bold text-gray-700 mb-4">Attendance Logs</h1>

    <div v-if="loading" class="text-center py-6">
      <p class="text-lg text-gray-500">Loading...</p>
    </div>

    <div v-else>
      <div v-if="errorMessage" class="text-center py-6">
        <p class="text-lg text-red-500">{{ errorMessage }}</p>
      </div>

      <div v-else-if="attendanceLogs.length === 0" class="text-center py-6">
        <p class="text-lg text-gray-500">No attendance logs found.</p>
      </div>

      <div v-else class="overflow-x-auto">
        <table class="table-auto w-full border border-gray-300 bg-white">
          <thead class="bg-gray-200 text-gray-700">
            <tr>
              <th class="px-4 py-2 border">Date</th>
              <th class="px-4 py-2 border">Entry</th>
              <th class="px-4 py-2 border">Exit</th>
              <th class="px-4 py-2 border">Working Hour</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(log, date) in attendanceLogs" :key="date" class="text-gray-700">
              <td class="px-4 py-2 border text-center">{{ date }}</td>
              <td class="px-4 py-2 border text-center">{{ log.entry }} ({{ log.entry_device }})</td>
              <td class="px-4 py-2 border text-center">{{ log.exit }} ({{ log.exit_device }})</td>
              <td class="px-4 py-2 border text-center">{{ log.working_hours }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
