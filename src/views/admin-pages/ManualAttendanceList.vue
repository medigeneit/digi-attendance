<script setup>
import LoaderView from '@/components/common/LoaderView.vue'
import MultiselectDropdown from '@/components/MultiselectDropdown.vue'
import { useManualAttendanceStore } from '@/stores/manual-attendance'
import { useUserStore } from '@/stores/user'
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const router = useRouter()
const route = useRoute()
const manualAttendanceStore = useManualAttendanceStore()
const userStore = useUserStore()
const selectedUser = ref(null)
const selectedUserId = computed(() => selectedUser.value?.id)
const selectedMonth = ref(route?.query?.date || manualAttendanceStore.selectedMonth)

onMounted( async () => {
  userStore.fetchUsers()
  selectedUser.value = userStore.users.find((user) => user.id == route?.query?.user_id)
  await fetchManualAttendancesByUser()
})

watch(selectedUserId, (user) => {
  router.replace({
    query: {
      ...route.query,
      user_id: user,
    },
  })
})

watch(selectedMonth, (date) => {
  router.replace({
    query: {
      ...route.query,
      date: date,
    },
  })
})

const fetchManualAttendancesByUser = async () => {
  if (selectedUserId.value) {
    await manualAttendanceStore.fetchManualAttendances({
      user_id: selectedUserId.value,
      selectedMonth: selectedMonth.value,
      selectedStatus: manualAttendanceStore.selectedStatus,
    })
  } else {
    // Fetch all short leaves if no user is selected
    await manualAttendanceStore.fetchManualAttendances({
      selectedMonth: manualAttendanceStore.selectedMonth,
      selectedStatus: manualAttendanceStore.selectedStatus,
    })
  }
}

watch([selectedUserId], fetchManualAttendancesByUser)

const filteredManualAttendances = computed(() => {
  return manualAttendanceStore.manualAttendances
})

const goBack = () => {
  router.go(-1)
}
const deleteApplication = async (applicationId) => {
  if (confirm('Are you sure to delete this application?')) {
    manualAttendanceStore.deleteManualAttendance(applicationId)
  }
}
</script>

<template>
  <div class="space-y-2 px-4">
    <div class="flex items-center justify-between gap-2">
      <button class="btn-3" @click="goBack">
        <i class="far fa-arrow-left"></i>
        <span class="hidden md:flex">Back</span>
      </button>

      <h1 class="title-md md:title-lg flex-wrap text-center">My Manual Attendances</h1>
      <div></div>
    </div>
    <div class="flex gap-4">
      <div style="width: 300px">
        <MultiselectDropdown
          v-model="selectedUser"
          :options="userStore.users"
          :multiple="false"
          label="name"
          label-prefix="employee_id"
          placeholder="Select user"
        />
      </div>
      <div>
        <input
          id="monthSelect"
          type="month"
          v-model="selectedMonth"
          @change="fetchManualAttendancesByUser"
          class="input-1"
        />
      </div>
      <div>
        <select
          v-model="manualAttendanceStore.selectedStatus"
          @change="fetchManualAttendancesByUser"
          class="input-1"
        >
          <option value="" selected>All</option>
          <option value="Pending">Pending</option>
          <option value="Approved">Approved</option>
          <option value="Rejected">Rejected</option>
        </select>
      </div>
    </div>

    <div v-if="manualAttendanceStore?.loading" class="text-center py-4">
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
              <th class="border border-gray-300 px-2 text-left">Employee Name</th>
              <th class="border border-gray-300 px-2 text-left">Department</th>
              <th class="border border-gray-300 px-2 text-left">Date</th>
              <th class="border border-gray-300 px-2 text-left">Type</th>
              <th class="border border-gray-300 px-2 text-left">Check-In</th>
              <th class="border border-gray-300 px-2 text-left">Check-Out</th>
              <th class="border border-gray-300 px-2 text-left">Status</th>
              <th class="border border-gray-300 px-2 text-left">Action</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(attendance, index) in filteredManualAttendances"
              :key="attendance?.id"
              class="border-b border-gray-200 hover:bg-blue-200"
            >
              <td class="border border-gray-300 px-2">{{ index + 1 }}</td>
              <td class="border border-gray-300 px-2">{{ attendance?.user?.name }}</td>
              <td class="border border-gray-300 px-2">{{ attendance?.user?.department?.name }}</td>
              <td class="border border-gray-300 px-2">
                {{
                  new Date(attendance.created_at).toLocaleDateString('en-GB', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                  })
                }}
              </td>
              <td class="border border-gray-300 px-2">{{ attendance.type }}</td>
              <td class="border border-gray-300 px-2">{{ attendance.check_in || 'N/A' }}</td>
              <td class="border border-gray-300 px-2">{{ attendance.check_out || 'N/A' }}</td>
              <td class="border border-gray-300 px-2">{{ attendance.status || 'Pending' }}</td>
              <td class="border border-gray-300 px-2">
                <div class="flex gap-2">
                  <RouterLink
                    :to="{ name: 'ManualAttendanceShow', params: { id: attendance?.id } }"
                    class="btn-icon"
                  >
                    <i class="far fa-eye"></i>
                  </RouterLink>

                  <button @click="deleteApplication(attendance?.id)" class="btn-icon text-red-500">
                    <i class="far fa-trash"></i>
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="filteredManualAttendances.length === 0">
              <td colspan="7" class="p-2 text-center text-red-500">No manual attendances found</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
