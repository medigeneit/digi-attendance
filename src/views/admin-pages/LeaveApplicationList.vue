<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useLeaveApplicationStore } from '@/stores/leave-application'
import { useUserStore } from '@/stores/user'
import LoaderView from '@/components/common/LoaderView.vue'

const router = useRouter()
const leaveApplicationStore = useLeaveApplicationStore()
const userStore = useUserStore()

const selectedUserId = ref('')

onMounted(() => {
  userStore.fetchUsers()
})

const goBack = () => {
  router.go(-1)
}

const fetchApplicationsByUser = async () => {
  if (selectedUserId.value) {
    await leaveApplicationStore.fetchLeaveApplications({ user_id: selectedUserId.value })
  }
}

const filteredLeaveApplications = computed(() => {
  return leaveApplicationStore.leaveApplications
})
</script>

<template>
  <div class="space-y-2 px-4">
    <div class="flex items-center justify-between gap-2">
      <button class="btn-3" @click="goBack">
        <i class="far fa-arrow-left"></i>
        <span class="hidden md:flex">Back</span>
      </button>

      <h1 class="title-md md:title-lg flex-wrap text-center">Leave Applications</h1>

      <div>
        <select
          id="user-filter"
          v-model="selectedUserId"
          class="input-1"
          @change="fetchApplicationsByUser"
        >
          <option value="">Select User</option>
          <option v-for="user in userStore.users" :key="user.id" :value="user.id">
            {{ user.name }}
          </option>
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
              <th class="border border-gray-300 px-2 text-left">Start Date</th>
              <th class="border border-gray-300 px-2 text-left">End Date</th>
              <th class="border border-gray-300 px-2 text-left">Total Days</th>
              <th class="border border-gray-300 px-2 text-left">Status</th>
              <th class="border border-gray-300 px-2 text-left">Action</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(application, index) in filteredLeaveApplications"
              :key="application.id"
              class="border-b border-gray-200 hover:bg-gray-100"
            >
              <td class="border border-gray-300 px-2">{{ index + 1 }}</td>
              <td class="border border-gray-300 px-2">{{ application.user?.name || 'Unknown' }}</td>
              <td class="border border-gray-300 px-2">{{ application.start_date }}</td>
              <td class="border border-gray-300 px-2">{{ application.end_date }}</td>
              <td class="border border-gray-300 px-2">{{ application.total_days }}</td>
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
