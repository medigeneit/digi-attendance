<script setup>
import LoaderView from '@/components/common/LoaderView.vue'
import { useAttendanceStore } from '@/stores/attendance'
import { useCompanyStore } from '@/stores/company'
import { storeToRefs } from 'pinia'
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const router = useRouter()
const route = useRoute()
const lateAttendanceStore = useAttendanceStore()
const companyStore = useCompanyStore()
const { dailyLateLogs, isLoading } = storeToRefs(lateAttendanceStore)
const { companies } = storeToRefs(companyStore)
const selectedUserId = ref('')

onMounted(() => {
  companyStore.fetchCompanies()
})

const goBack = () => {
  router.go(-1)
}

const fetchApplicationsByUser = async () => {
  if (selectedUserId.value) {
    await lateAttendanceStore.getAttendanceLateReport(selectedUserId.value)
  }
}

const filteredLeaveApplications = computed(() => {
  return []
  // return leaveApplicationStore.leaveApplications
})

onMounted(async () => {
  await lateAttendanceStore.getAttendanceLateReport({ query: route.query?.search })
})
</script>

<template>
  <div class="space-y-2 px-4">
    <div class="flex items-center justify-between gap-2">
      <button class="btn-3" @click="goBack">
        <i class="far fa-arrow-left"></i>
        <span class="hidden md:flex">Back</span>
      </button>

      <h1 class="title-md md:title-lg flex-wrap text-center">Late Reports</h1>

      <div>
        <select
          id="user-filter"
          v-model="selectedUserId"
          class="input-1"
          @change="fetchApplicationsByUser"
        >
          <option value="">Select Company</option>
          <option v-for="user in companies" :key="user.id" :value="user.id">
            {{ user.name }}
          </option>
        </select>
      </div>
    </div>

    <div v-if="isLoading" class="text-center py-4">
      <LoaderView />
    </div>

    <div v-else class="space-y-4">
      <div class="overflow-x-auto">
        <table
          class="min-w-full table-auto border-collapse border border-gray-200 bg-white rounded-md text-sm"
        >
          <thead>
            <tr class="bg-gray-200">
              <th class="border border-gray-300 px-2 text-left">#</th>
              <th class="border border-gray-300 px-2 text-left">Date</th>
              <th class="border border-gray-300 px-2 text-left">Employee Name</th>
              <th class="border border-gray-300 px-2 text-left">Company</th>
              <th class="border border-gray-300 px-2 text-left">Department</th>
              <th class="border border-gray-300 px-2 text-left">Entry Time</th>
              <th class="border border-gray-300 px-2 text-left">Late Duration</th>
              <th class="border border-gray-300 px-2 text-left">Shift</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(report, index) in dailyLateLogs"
              :key="report.id"
              class="border-b border-gray-200 hover:bg-gray-100"
            >
              <td class="border border-gray-300 px-2">{{ index + 1 }}</td>
              <td class="border border-gray-300 px-2">{{ report?.date }}</td>
              <td class="border border-gray-300 px-2">{{ report?.user_name || 'Unknown' }}</td>
              <td class="border border-gray-300 px-2">{{ report?.company_name || 'Unknown' }}</td>
              <td class="border border-gray-300 px-2">
                {{ report?.department_name || 'Unknown' }}
              </td>
              <td class="border border-gray-300 px-2">{{ report.entry_time }}</td>
              <td class="border border-gray-300 px-2">{{ report.late_duration }}</td>
              <td class="border border-gray-300 px-2">{{ report.shift_name }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
