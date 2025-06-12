<script setup>
import LoaderView from '@/components/common/LoaderView.vue'
import MultiselectDropdown from '@/components/MultiselectDropdown.vue'
import { useLeaveApplicationStore } from '@/stores/leave-application'
import { useUserStore } from '@/stores/user'
import { storeToRefs } from 'pinia'
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const router = useRouter()
const route = useRoute()
const leaveApplicationStore = useLeaveApplicationStore()
const userStore = useUserStore()
const { leaveApplications } = storeToRefs(leaveApplicationStore)
const selectedUser = ref('')
const selectedUserId = computed(() => selectedUser.value?.id)
const selectedDate = ref(route?.query?.date || leaveApplicationStore.selectedMonth)

onMounted( async () => {
  await userStore.fetchUsers()
  selectedUser.value = userStore.users.find((user) => user.id == route?.query?.user_id)
  await fetchApplicationsByUser()
})

const goBack = () => {
  router.go(-1)
}

const fetchApplicationsByUser = async () => {
  if (selectedUserId.value) {
    await leaveApplicationStore.fetchLeaveApplications({
      user_id: selectedUserId.value,
      selectedDate: selectedDate.value,
      selectedStatus: leaveApplicationStore.selectedStatus,
    })
  } else {
    // Fetch all short leaves if no user is selected
    await leaveApplicationStore.fetchLeaveApplications({
      selectedStatus: leaveApplicationStore.selectedStatus,
      selectedDate: selectedDate.value,
    })
  }
}

const filteredLeaveApplications = computed(() => {
  return leaveApplicationStore.leaveApplications
})

watch([selectedUserId], fetchApplicationsByUser)

watch(selectedUserId, (user) => {
  router.replace({
    query: {
      ...route.query,
      user_id: user,
    },
  })
})

watch(selectedDate, (date) => {
  router.replace({
    query: {
      ...route.query,
      date: date,
    },
  })
})

const deleteApplication = async (applicationId) => {
  if (confirm('Are you sure to delete this application?')) {
    leaveApplicationStore.deleteLeaveApplication(applicationId)
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

      <h1 class="title-md md:title-lg flex-wrap text-center">Leave Applications</h1>
      <div></div>
    </div>
    <div class="flex gap-2">
      <div style="width: 300px">
        <MultiselectDropdown
          v-model="selectedUser"
          :options="userStore.users"
          :multiple="false"
          label="label"
          placeholder="Select user"
        />
      </div>
      <div>
        <input
          id="monthSelect"
          type="month"
          v-model="selectedDate"
          @change="fetchApplicationsByUser"
          class="input-1"
        />
      </div>
      <div>
        <select
          v-model="leaveApplicationStore.selectedStatus"
          @change="fetchApplicationsByUser"
          class="input-1"
        >
          <option value="" selected>All</option>
          <option value="Pending">Pending</option>
          <option value="Approved">Approved</option>
          <option value="Rejected">Rejected</option>
        </select>
      </div>
    </div>

    <div v-if="leaveApplicationStore.loading" class="text-center py-4">
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
              <th class="border border-gray-300 px-2 text-left">Last Working Day</th>
              <th class="border border-gray-300 px-2 text-left">Resumption Date</th>
              <th class="border border-gray-300 px-2 text-left">Total Days</th>
              <th class="border border-gray-300 px-2 text-left">Status</th>
              <th class="border border-gray-300 px-2 text-left">Action</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(application, index) in filteredLeaveApplications"
              :key="index"
              class="border-b border-gray-200 hover:bg-blue-200"
            >
              <td class="border border-gray-300 px-2">{{ index + 1 }}</td>
              <td class="border border-gray-300 px-2">
                {{ application?.user?.name || 'Unknown' }}
              </td>
              <td class="border border-gray-300 px-2">{{ application?.last_working_date }}</td>
              <td class="border border-gray-300 px-2">{{ application?.resumption_date }}</td>
              <td class="border border-gray-300 px-2">
                <div v-html="application.duration || application?.total_leave_days"></div>
              </td>
              <td class="border border-gray-300 px-2">
                {{ application?.status || 'N/A' }}
              </td>
              <td class="border border-gray-300 px-2">
                <div class="flex justify-center gap-2">
                  <RouterLink
                    :to="{ name: 'LeaveApplicationShow', params: { id: application?.id } }"
                    class="btn-icon"
                  >
                    <i class="far fa-eye"></i>
                  </RouterLink>
                  <RouterLink
                    v-if="application?.status !== 'Approved'"
                    :to="{ name: 'LeaveApplicationEdit', params: { id: application?.id } }"
                    class="btn-icon"
                  >
                    <i class="far fa-edit text-orange-600"></i>
                  </RouterLink>
                  <button @click="deleteApplication(application?.id)" class="btn-icon text-red-500">
                    <i class="far fa-trash"></i>
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="filteredLeaveApplications.length === 0">
              <td colspan="7" class="p-1 text-center text-red-500">No application found</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
