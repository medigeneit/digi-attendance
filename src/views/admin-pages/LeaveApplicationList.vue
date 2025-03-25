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

onMounted(() => {
  userStore.fetchUsers()
  leaveApplicationStore.fetchLeaveApplications({ 
       selectedMonth: leaveApplicationStore.selectedMonth,
       selectedStatus: leaveApplicationStore.selectedStatus 
      })
})

const goBack = () => {
  router.go(-1)
}

const fetchApplicationsByUser = async () => {
   if (selectedUserId.value) {
    await leaveApplicationStore.fetchLeaveApplications({ 
        user_id: selectedUserId.value,
        selectedMonth: leaveApplicationStore.selectedMonth,
        selectedStatus: leaveApplicationStore.selectedStatus
      })
  } else {
    // Fetch all short leaves if no user is selected
    await leaveApplicationStore.fetchLeaveApplications({ 
      selectedMonth: leaveApplicationStore.selectedMonth,
       selectedStatus: leaveApplicationStore.selectedStatus 
      })
  }
}

const filteredLeaveApplications = computed(() => {
  return leaveApplicationStore.leaveApplications
})

onMounted(async () => {
  await leaveApplicationStore.fetchLeaveApplications({ query: route.query?.search })
})

watch([selectedUserId], fetchApplicationsByUser)
</script>

<template>
  <div class="space-y-2 px-4">
    <div class="flex items-center justify-between gap-2">
      <button class="btn-3" @click="goBack">
        <i class="far fa-arrow-left"></i>
        <span class="hidden md:flex">Back</span>
      </button>

      <h1 class="title-md md:title-lg flex-wrap text-center">Leave Applications</h1>

      <div class="flex gap-2">
        <div style="width: 300px;">
          <MultiselectDropdown
            v-model="selectedUser"
            :options="userStore.users"
            :multiple="false"
            label="Select User"
            labelFor="user"
          />
        </div>
        <div>
          <input
            id="monthSelect"
            type="month"
            v-model="leaveApplicationStore.selectedMonth"
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
              :key="application.id"
              class="border-b border-gray-200 hover:bg-blue-200"
            >
              <td class="border border-gray-300 px-2">{{ index + 1 }}</td>
              <td class="border border-gray-300 px-2">
                {{ application?.user?.name || 'Unknown' }}
              </td>
              <td class="border border-gray-300 px-2">{{ application?.last_working_date }}</td>
              <td class="border border-gray-300 px-2">{{ application?.resumption_date }}</td>
              <td class="border border-gray-300 px-2">{{ application?.total_leave_days }}</td>
              <td class="border border-gray-300 px-2">
                {{ application.status || 'N/A' }}
              </td>
              <td class="border border-gray-300 px-2">
                <div class="flex gap-2">
                  <RouterLink
                    :to="{ name: 'LeaveApplicationShow', params: { id: application.id } }"
                    class="btn-icon"
                  >
                    <i class="far fa-eye"></i>
                  </RouterLink>
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
