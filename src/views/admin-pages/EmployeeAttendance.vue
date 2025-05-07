<script setup>
import LoaderView from '@/components/common/LoaderView.vue'
import MultiselectDropdown from '@/components/MultiselectDropdown.vue'
import { useAttendanceStore } from '@/stores/attendance'
import { useUserStore } from '@/stores/user'
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
const router = useRouter()
const route = useRoute()
const userStore = useUserStore()
const attendanceStore = useAttendanceStore()
const selectedUser = ref(null)
const selectedMonth = ref(route?.query?.date || attendanceStore.selectedMonth)
const userId = computed(() => selectedUser.value?.id)
const fetchAttendance = async () => {
  if (userId) {
    await attendanceStore.getMonthlyAttendanceByShift(userId.value, selectedMonth.value)
  }
}

onMounted(async () => {
  await userStore.fetchUsers()
  selectedUser.value = userStore.users.find((user) => user.id == route.query.user_id)
})

watch([selectedMonth], fetchAttendance)

watch(userId, (user) => {
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

watch(
  userId,
  (newValue, oldValue) => {
    console.log('sdf')

    if (newValue !== null) {
      fetchAttendance()
    }
  },
  { immediate: false },
)

const goBack = () => router.go(-1)
</script>

<template>
  <div class="px-4 space-y-4">
    <div class="flex items-center justify-between gap-2">
      <button class="btn-3" @click="goBack">
        <i class="far fa-arrow-left"></i>
        <span class="hidden md:flex">Back</span>
      </button>
      <h1 class="title-md md:title-lg flex-wrap text-center">Monthly Attendance</h1>
      <div></div>
    </div>
    <div class="w-1/2 flex gap-4">
      <div class="w-full">
        <MultiselectDropdown
          v-model="selectedUser"
          :options="userStore.users"
          :multiple="false"
          class="w-full"
          label="name"
          placeholder="Select Employee"
        />
      </div>
      <div class="w-full">
        <input
          id="monthSelect"
          type="month"
          v-model="selectedMonth"
          @change="fetchAttendance"
          class="input-1"
        />
      </div>
    </div>

    <LoaderView v-if="attendanceStore.isLoading" />

    <div v-else class="space-y-4">
      <div class="overflow-x-auto card-bg">
        <table class="min-w-full table-auto border-collapse border border-gray-300 bg-white">
          <thead>
            <tr class="bg-gray-200 text-xs">
              <th class="border p-1">Date</th>
              <th class="border p-1">Day</th>
              <th class="border p-1">Shift</th>
              <th class="border p-1">Entry Time</th>
              <th class="border p-1">Exit Time</th>
              <th class="border p-1">Working Hours</th>
              <th class="border p-1">OT Hours</th>
              <th class="border p-1">Late Entry</th>
              <th class="border p-1">Early Leave</th>
              <th class="border p-1">Status</th>
            </tr>
          </thead>
          <tbody class="text-center text-xs">
            <tr
              v-for="log in attendanceStore?.monthlyLogs"
              :key="log?.date"
              class="hover:border-b-2 hover:border-gray-200 hover:bg-blue-200"
            >
              <td class="border px-1 py-0.5">{{ log.date }}</td>
              <td class="border px-1 py-0.5">{{ log.weekday }}</td>
              <td
                class="border px-1 py-0.5"
                :title="`${log.shift_start_time} to ${log.shift_end_time}`"
              >
                {{ log.shift_name }}
              </td>
              <td
                class="border px-1 py-0.5"
                :class="{ 'bg-red-200': log.late_duration }"
                :title="`Device: ${log.entry_device}`"
              >
                {{ log.entry_time }}
              </td>
              <td
                class="border px-1 py-0.5"
                :class="{ 'bg-red-200': log.early_leave_duration }"
                :title="`Device: ${log.exit_device}`"
              >
                {{ log.exit_time }}
              </td>
              <td class="border px-1 py-0.5">{{ log.working_hours }}</td>
              <td class="border px-1 py-0.5">{{ log.overtime_hours }}</td>
              <td class="border px-1 py-0.5">
                <div v-if="log.late_duration">
                  {{ log.late_duration }}
                  <!-- <span
                    v-if="log.first_short_leave"
                    :class="{
                      'text-green-500': log.first_short_leave === 'Approved',
                      'text-yellow-500': log.first_short_leave === 'Pending',
                      'text-red-500': log.first_short_leave === 'Rejected',
                    }"
                  >
                    ({{ log.first_short_leave }})
                  </span> -->
                  <router-link v-if="log.first_short_leave"
                      :to="{
                        name: 'ShortLeaveShow',
                        params: {
                          id: log.first_short_leave_id,
                        },
                      }"
                      :class="{
                        'text-green-500': log.first_short_leave === 'Approved',
                        'text-yellow-500':
                          log.first_short_leave === 'Pending',
                        'text-red-500': log.first_short_leave === 'Rejected',
                      }">
                    ({{log.first_short_leave}})
                  </router-link>
                </div>
              </td>
              <td class="border px-1 py-0.5">
                <div v-if="log.early_leave_duration">
                  {{ log.early_leave_duration }}
                  <!-- 
                  <span
                    v-if="log.last_short_leave"
                    class="px-1"
                    :class="{
                      'text-green-500': log.last_short_leave === 'Approved',
                      'text-yellow-500': log.last_short_leave === 'Pending',
                      'text-red-500': log.last_short_leave === 'Rejected',
                    }"
                  >
                    ({{ log.last_short_leave }})
                  </span> -->
                  <router-link v-if="log.last_short_leave"
                      :to="{
                        name: 'ShortLeaveShow',
                        params: {
                          id: log.last_short_leave_id,
                        },
                      }"
                      class="px-1"
                      :class="{
                        'text-green-500':
                          log.last_short_leave === 'Approved',
                        'text-yellow-500':
                          log.last_short_leave === 'Pending',
                        'text-red-500':
                          log.last_short_leave === 'Rejected',
                      }"
                    >
                    ({{log.last_short_leave}})
                  </router-link>
                </div>
              </td>
              <td
                class="border px-1 py-0.5 font-semibold"
                :class="{
                  'text-red-600': log.status === 'Absent',
                  'text-green-600': log.status === 'Present',
                  'text-yellow-600': log.is_overtime_applicable,
                }"
              >
                {{ log.status }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    <div v-if="selectedUser" class="grid md:grid-cols-2 gap-4 text-sm">
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

      <div class="card-bg p-4 gap-1">
        <h2 class="title-md">Attendance Summary</h2>
        <hr />
        <div class="grid md:grid-cols-2">
          <p>
            <strong>Total Working Days:</strong>
            {{ attendanceStore?.summary?.total_working_days }}
          </p>
          <p><strong>Present Days:</strong> {{ attendanceStore?.summary?.total_present_days }}</p>
          <p><strong>Absent Days:</strong> {{ attendanceStore?.summary?.total_absent_days }}</p>
          <p><strong>Late Days:</strong> {{ attendanceStore?.summary?.total_late_days }}</p>
          <p>
            <strong>Total Working Hours:</strong>
            {{ attendanceStore?.summary?.total_working_hours }}
          </p>
          <p>
            <strong>Total Overtime Hours:</strong>
            {{ attendanceStore?.summary?.total_overtime_hours }}
          </p>
        </div>
      </div>
    </div>
    <div v-else>
      <p class="text-gray-400 text-center text-2xl italic">Select an employee, please.</p>
    </div>
  </div>
</template>
