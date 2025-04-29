<script setup>
import LoaderView from '@/components/common/LoaderView.vue'
import MultiselectDropdown from '@/components/MultiselectDropdown.vue'
import { useAttendanceStore } from '@/stores/attendance'
import { useUserStore } from '@/stores/user'
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const userStore = useUserStore()
const attendanceStore = useAttendanceStore()

const selectedUser = ref(null)
const selectedUserId = ref('')
const selectedMonth = ref('')

const userId = computed(() => selectedUser.value?.id)

const fetchAttendance = async () => {
  if (userId) {
    await attendanceStore.getMonthlyAttendanceLog(userId.value, attendanceStore.selectedMonth)
  }
}

onMounted(async () => {
  await userStore.fetchUsers()
})

watch([selectedUserId, selectedMonth], fetchAttendance)

watch(
  userId,
  (newValue, oldValue) => {
    if (newValue !== null) {
      fetchAttendance()
    }
  },
  { immediate: false },
)

const goBack = () => router.go(-1)

// time formatter
const formatTime = (timestamp) => {
  const d = new Date(timestamp)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}
</script>

<template>
  <div class="px-4 space-y-4">
    <div class="flex items-center justify-between gap-2">
      <button class="btn-3" @click="goBack">
        <i class="far fa-arrow-left"></i>
        <span class="hidden md:flex">Back</span>
      </button>
      <h1 class="title-md md:title-lg flex-wrap text-center">Attendance Log</h1>
      <div></div>
    </div>

    <div class="w-1/2 flex flex-wrap gap-4">
      <MultiselectDropdown
        v-model="selectedUser"
        :options="userStore.users"
        :multiple="false"
        label="name"
        placeholder="Select Employee"
      />
      <div>
        <input
          id="monthSelect"
          type="month"
          v-model="attendanceStore.selectedMonth"
          @change="fetchAttendance"
          class="input-1"
        />
      </div>
    </div>

    <LoaderView v-if="attendanceStore.isLoading" />

    <div v-else class="space-y-4">
      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        <div
          v-for="(logs, date) in attendanceStore.attendanceLogs"
          :key="date"
          class="bg-white shadow rounded-lg p-4"
        >
          <h3 class="text-sm font-semibold text-blue-700 border-b pb-1 mb-2">{{ date }}</h3>

          <div
            v-for="(log, index) in logs"
            :key="log.id"
            class="flex items-center justify-between text-xs mb-1"
          >
            <div class="flex items-center gap-1 text-gray-700">
              <i class="far fa-clock text-blue-500"></i>
              {{ formatTime(log.timestamp) }}
            </div>
            <div class="text-right text-gray-500 bg-blue-100 px-2 py-0.5 rounded text-[10px]">
              {{ log?.device?.name || 'Unknown' }}
            </div>
          </div>
        </div>
      </div>
    </div>
    <div v-if="selectedUser" class="flex justify-between gap-4 text-sm">
      <div class="card-bg p-4 gap-1">
        <h2 class="title-md">Selected Employee Info</h2>
        <hr />
        <div class="grid md:grid-cols-2">
          <p><strong>Name:</strong> {{ selectedUser.name }}</p>
          <p><strong>Designation:</strong> {{ selectedUser.designation?.title || 'N/A' }}</p>
          <p><strong>Department:</strong> {{ selectedUser.department?.name || 'N/A' }}</p>
          <p><strong>Company:</strong> {{ selectedUser.company?.name || 'N/A' }}</p>
          <p><strong>Phone:</strong> {{ selectedUser.phone }}</p>
          <p><strong>Email:</strong> {{ selectedUser.email || 'N/A' }}</p>
        </div>
      </div>
    </div>
    <div v-else>
      <p class="text-gray-400 text-center text-2xl italic">Select an employee, please.</p>
    </div>
  </div>
</template>
