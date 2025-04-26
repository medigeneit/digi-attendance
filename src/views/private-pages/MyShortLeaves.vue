<script setup>
import LoaderView from '@/components/common/LoaderView.vue'
import { useShortLeaveStore } from '@/stores/short-leave'
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const shortLeaveStore = useShortLeaveStore()

onMounted(() => {
  shortLeaveStore.fetchMyShortLeaves()
})

const goBack = () => {
  router.go(-1)
}

const myShortLeaves = computed(() => {
  return shortLeaveStore.shortLeaves
})

const fetchShortLeaves = async () => {
  shortLeaveStore.fetchMyShortLeaves({ date: shortLeaveStore.selectedMonth })
}

function deleteApplication(applicationId) {
  const confirmed = confirm('Are you sure you want to delete this application?')
  if (confirmed) {
    shortLeaveStore.deleteShortLeave(applicationId)
  }
}

const formatTime = (timeString) => {
  if (!timeString) return 'N/A'
  const [hour, minute] = timeString.split(':').map(Number) // Extract hour & minute
  const date = new Date()
  date.setHours(hour, minute)

  return date.toLocaleString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true, // Ensures AM/PM format
  })
}
</script>

<template>
  <div class="space-y-2 px-4">
    <div class="flex items-center justify-between gap-2">
      <button class="btn-3" @click="goBack">
        <i class="far fa-arrow-left"></i>
        <span class="hidden md:flex">Back</span>
      </button>

      <h1 class="title-md md:title-lg flex-wrap text-center">My Short Leaves</h1>
      <div>
        <RouterLink :to="{ name: 'ShortLeaveAdd' }" class="btn-2">New Short Leave</RouterLink>
      </div>
    </div>

    <div class="grid grid-cols-3 gap-2">
      <input
        id="monthSelect"
        type="month"
        v-model="shortLeaveStore.selectedMonth"
        @change="fetchShortLeaves"
        class="input-1"
      />
    </div>

    <div v-if="shortLeaveStore?.loading" class="text-center py-4">
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
              <th class="border border-gray-300 px-2 text-left">Type</th>
              <th class="border border-gray-300 px-2 text-left">Start Time</th>
              <th class="border border-gray-300 px-2 text-left">End Time</th>
              <th class="border border-gray-300 px-2 text-left">Total Minutes</th>
              <th class="border border-gray-300 px-2 text-left">Attachment</th>
              <th class="border border-gray-300 px-2 text-left">Status</th>
              <th class="border border-gray-300 px-2 text-left">Action</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(leave, index) in myShortLeaves"
              :key="leave?.id"
              class="border-b border-gray-200 hover:bg-blue-200"
            >
              <td class="border border-gray-300 px-2">{{ index + 1 }}</td>
              <td class="border border-gray-300 px-2">{{ leave?.date }}</td>
              <td class="border border-gray-300 px-2">{{ leave?.type }}</td>
              <td class="border border-gray-300 px-2">{{ formatTime(leave?.start_time) }}</td>
              <td class="border border-gray-300 px-2">{{ formatTime(leave?.end_time) }}</td>
              <td class="border border-gray-300 px-2">{{ leave?.total_minutes }}</td>
              <td class="border border-gray-300 px-2 text-center">
                <a
                  v-if="leave.attachment"
                  :href="leave?.attachment"
                  target="_blank"
                  class="text-blue-500 underline"
                >
                  <i class="fad fa-link"></i>
                </a>
              </td>
              <td class="border border-gray-300 px-2">{{ leave?.status || 'N/A' }}</td>
              <td class="border border-gray-300 px-2">
                <div class="flex gap-2">
                  <RouterLink
                    :to="{ name: 'ShortLeaveShow', params: { id: leave?.id } }"
                    class="btn-icon"
                  >
                    <i class="far fa-eye"></i>
                  </RouterLink>

                  <button
                    type="button"
                    @click="deleteApplication(leave?.id)"
                    class="btn-icon"
                    v-if="!leave.status"
                  >
                    <i class="far fa-trash text-red-600"></i>
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="myShortLeaves.length === 0">
              <td colspan="8" class="p-2 text-center text-red-500">No short leaves found</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
