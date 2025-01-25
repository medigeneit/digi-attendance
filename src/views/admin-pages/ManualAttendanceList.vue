<script setup>
import { onMounted, computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useManualAttendanceStore } from '@/stores/manual-attendance'
import { useUserStore } from '@/stores/user'
import LoaderView from '@/components/common/LoaderView.vue'

const router = useRouter()
const manualAttendanceStore = useManualAttendanceStore()
const userStore = useUserStore()

const selectedUserId = ref('')

onMounted(() => {
  userStore.fetchUsers()
  manualAttendanceStore.fetchManualAttendances()
})

const fetchManualAttendancesByUser = async () => {
  if (selectedUserId.value) {
    await manualAttendanceStore.fetchManualAttendances({ user_id: selectedUserId.value })
  } else {
    await manualAttendanceStore.fetchManualAttendances()
  }
}

const filteredManualAttendances = computed(() => {
  return manualAttendanceStore.manualAttendances
})

const goBack = () => {
  router.go(-1)
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

      <div>
        <select
          id="user-filter"
          v-model="selectedUserId"
          class="input-1"
          @change="fetchManualAttendancesByUser"
        >
          <option value="">All Users</option>
          <option v-for="user in userStore.users" :key="user.id" :value="user.id">
            {{ user.name }}
          </option>
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
              class="border-b border-gray-200 hover:bg-gray-100"
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
            <tr v-if="filteredManualAttendances.length === 0">
              <td colspan="7" class="p-2 text-center text-red-500">No manual attendances found</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
