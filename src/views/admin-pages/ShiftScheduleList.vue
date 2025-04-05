<template>
  <div class="p-6 max-w-6xl mx-auto">
    <div class="flex items-center justify-between mb-4">
      <h1 class="text-2xl font-bold">Shift Schedule List</h1>
      <router-link
        to="/shift-schedules/create"
        class="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
      >
        + Add Schedule
      </router-link>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <select v-model="employeeId" class="border p-2 rounded">
        <option value="">Select Employee</option>
        <option v-for="emp in store.employees" :key="emp.id" :value="emp.id">{{ emp.name }}</option>
      </select>

      <input type="month" v-model="month" class="border p-2 rounded" />

      <button @click="fetchData" class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
        Search
      </button>
    </div>

    <div v-if="schedules.length" class="overflow-x-auto">
      <table class="w-full border border-gray-300">
        <thead class="bg-gray-100">
          <tr>
            <th class="p-2 border">Date</th>
            <th class="p-2 border">Shift</th>
            <th class="p-2 border">Holiday</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in schedules" :key="item.id">
            <td class="p-2 border">{{ item.date }}</td>
            <td class="p-2 border">{{ item.shift?.name || '—' }}</td>
            <td class="p-2 border">{{ item.is_holiday ? '✅' : '❌' }}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <div v-else class="text-center text-gray-500 mt-10">No data found.</div>
  </div>
</template>

<script setup>
import { useShiftScheduleStore } from '@/stores/shiftScheduleStore'
import { onMounted, ref } from 'vue'

const store = useShiftScheduleStore()
const employeeId = ref('')
const month = ref(new Date().toISOString().substring(0, 7))
const schedules = ref([])

onMounted(() => {
  store.fetchEmployees()
  store.fetchShifts()
})

const fetchData = async () => {
  await store.fetchSchedules(employeeId.value, month.value)
  schedules.value = store.schedules
}
</script>
