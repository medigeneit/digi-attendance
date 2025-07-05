<script setup>
import LoaderView from '@/components/common/LoaderView.vue'
import { useAuthStore } from '@/stores/auth'
import { useManualAttendanceStore } from '@/stores/manual-attendance'
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const manualAttendanceStore = useManualAttendanceStore()
const authStore = useAuthStore()

onMounted(() => {
  manualAttendanceStore.fetchUserManualAttendances()
})

const goBack = () => {
  router.go(-1)
}

const myManualAttendances = computed(() => {
  return manualAttendanceStore.manualAttendances
})
</script>

<template>
  <div class="space-y-2 px-4">
    <div class="flex items-center justify-between gap-2">
      <button class="btn-3" @click="goBack">
        <i class="far fa-arrow-left"></i>
        <span class="hidden md:flex">Back</span>
      </button>

      <h1 class="title-md md:title-lg flex-wrap text-center">Manual Attendances</h1>
      <div>
        <RouterLink :to="{ name: 'ManualAttendanceAdd' }" class="btn-2">Request</RouterLink>
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
              <th class="border border-gray-300 px-2 text-left">Create Date</th>
              <th class="border border-gray-300 px-2 text-left">Type</th>
              <th class="border border-gray-300 px-2 text-left">Check-In</th>
              <th class="border border-gray-300 px-2 text-left">Check-Out</th>
              <th class="border border-gray-300 px-2 text-left">Status</th>
              <th class="border border-gray-300 px-2 text-left">Action</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(attendance, index) in myManualAttendances"
              :key="attendance?.id"
              class="border-b border-gray-200 hover:bg-blue-200"
            >
              <td class="border border-gray-300 px-2">{{ index + 1 }}</td>
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
                </div>
              </td>
            </tr>
            <tr v-if="myManualAttendances.length === 0">
              <td colspan="7" class="p-2 text-center text-red-500">No manual attendances found</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
