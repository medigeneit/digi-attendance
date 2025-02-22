<script setup>
import LoaderView from '@/components/common/LoaderView.vue'
import { useAuthStore } from '@/stores/auth'
import { useLeaveApplicationStore } from '@/stores/leave-application'
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const leaveApplicationStore = useLeaveApplicationStore()
const authStore = useAuthStore()

onMounted(() => {
  leaveApplicationStore.fetchLeaveApplications({ user_id: authStore?.user?.id })
})

const goBack = () => {
  router.go(-1)
}

const myLeaveApplications = computed(() => {
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

      <h1 class="title-md md:title-lg flex-wrap text-center">My Leave Applications</h1>
      <div>
        <RouterLink :to="{ name: 'LeaveApplicationAdd' }" class="btn-2">Apply for Leave</RouterLink>
      </div>
    </div>

    <div v-if="leaveApplicationStore?.loading" class="text-center py-4">
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
              <th class="border border-gray-300 px-2 text-left">Start Date</th>
              <th class="border border-gray-300 px-2 text-left">End Date</th>
              <th class="border border-gray-300 px-2 text-left">Total Days</th>
              <th class="border border-gray-300 px-2 text-left">Handover</th>
              <th class="border border-gray-300 px-2 text-left">Status</th>
              <th class="border border-gray-300 px-2 text-left">Action</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(application, index) in myLeaveApplications"
              :key="application?.id"
              class="border-b border-gray-200 hover:bg-blue-200"
            >
              <td class="border border-gray-300 px-2">{{ index + 1 }}</td>
              <td class="border border-gray-300 px-2">{{ application.start_date }}</td>
              <td class="border border-gray-300 px-2">{{ application.end_date }}</td>
              <td class="border border-gray-300 px-2">{{ application.total_days }}</td>
              <td class="border border-gray-300 px-2">
                {{ application?.handover_user?.name || 'N/A' }}
              </td>
              <td class="border border-gray-300 px-2">{{ application.status || 'N/A' }}</td>
              <td class="border border-gray-300 px-2">
                <div class="flex gap-2">
                  <RouterLink
                    :to="{ name: 'MyLeaveApplicationShow', params: { id: application?.id } }"
                    class="btn-icon"
                  >
                    <i class="far fa-eye"></i>
                  </RouterLink>
                </div>
              </td>
            </tr>
            <tr v-if="myLeaveApplications.length === 0">
              <td colspan="6" class="p-2 text-center text-red-500">No applications found</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
