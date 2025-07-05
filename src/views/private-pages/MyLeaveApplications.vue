<script setup>
import LoaderView from '@/components/common/LoaderView.vue'
import { useLeaveApplicationStore } from '@/stores/leave-application'
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const leaveApplicationStore = useLeaveApplicationStore()

onMounted(() => {
  leaveApplicationStore.fetchMyLeaveApplications()
})

const goBack = () => {
  router.go(-1)
}

const myLeaveApplications = computed(() => {
  return leaveApplicationStore.leaveApplications
})

function deleteApplication(applicationId) {
  const confirmed = confirm('Are you sure you want to delete this application?')
  if (confirmed) {
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
              <th class="border border-gray-300 px-2 text-left">Last Working Date</th>
              <th class="border border-gray-300 px-2 text-left">Resumption Date</th>
              <th class="border border-gray-300 px-2 text-left">Total Days</th>
              <th class="border border-gray-300 px-2 text-left">Handover</th>
              <th class="border border-gray-300 px-2 text-left">Attach</th>
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
              <td class="border border-gray-300 px-2">{{ application?.last_working_date }}</td>
              <td class="border border-gray-300 px-2">{{ application?.resumption_date }}</td>
              <td class="border border-gray-300 px-2">{{ application?.total_leave_days }}</td>
              <td class="border border-gray-300 px-2">
                {{ application?.handover_user?.name || 'N/A' }}
              </td>
              <td class="border border-gray-300 px-2 text-center">
                <a
                  v-if="application.attachment"
                  :href="application?.attachment"
                  target="_blank"
                  class="text-blue-500 underline"
                >
                  <i class="fad fa-link"></i>
                </a>
              </td>
              <td class="border border-gray-300 px-2">{{ application?.status || 'N/A' }}</td>
              <td class="border border-gray-300 px-2">
                <div class="flex gap-2">
                  <RouterLink
                    :to="{ name: 'MyLeaveApplicationShow', params: { id: application?.id } }"
                    class="btn-icon"
                  >
                    <i class="far fa-eye"></i>
                  </RouterLink>
                  <button
                    type="button"
                    @click="deleteApplication(application?.id)"
                    class="btn-icon"
                    v-if="!application.status"
                  >
                    <i class="far fa-trash text-red-600"></i>
                  </button>
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
