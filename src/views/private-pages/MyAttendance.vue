<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useAttendanceStore } from '@/stores/attendance'
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'
import LoaderView from '@/components/common/LoaderView.vue'

const router = useRouter()
const authStore = useAuthStore()
const attendanceStore = useAttendanceStore()

const selectedMonth = ref(attendanceStore.selectedMonth)

const formattedMonthName = computed(() => {
  if (!selectedMonth.value) return ''
  const [year, month] = selectedMonth.value.split('-')
  const date = new Date(year, month - 1)
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
})

const fetchAttendance = async () => {
  if (authStore.user?.id && selectedMonth.value) {
    await attendanceStore.getMonthlyAttendanceByShift(authStore.user.id, selectedMonth.value)
  }
}

onMounted(async () => {
  if (!authStore.isAuthenticated) {
    router.push('/login')
  } else {
    await authStore.fetchUser()
    fetchAttendance()
  }
})

watch(selectedMonth, async (newMonth) => {
  attendanceStore.selectedMonth = newMonth
  await fetchAttendance()
})

const goBack = () => router.go(-1)
</script>

<template>
  <div class="px-4 space-y-4">
    <div class="md:flex items-center justify-between gap-2">
      <button class="btn-3" @click="goBack">
        <i class="far fa-arrow-left"></i>
        <span class="hidden md:flex">Back</span>
      </button>
      <h1 class="title-lg md:title-lg flex-wrap text-center">
        My Attendance of {{ formattedMonthName }}
      </h1>
      <div class="flex gap-4">
        <div>
          <input
            id="monthSelect"
            type="month"
            v-model="selectedMonth"
            @change="fetchAttendance"
            class="input-1"
          />
        </div>
      </div>
    </div>

    <div class="grid md:grid-cols-2 gap-4 text-sm">
      <div class="card-bg p-4 gap-1">
        <h2 class="title-md">User Info</h2>
        <hr />
        <div class="grid md:grid-cols-2">
          <p><strong>Name:</strong> {{ authStore.user?.name }}</p>
          <p><strong>Designation:</strong> {{ authStore.user?.designation.title }}</p>
          <p><strong>Department:</strong> {{ authStore.user?.department?.name }}</p>
          <p><strong>Company:</strong> {{ authStore.user?.company?.name }}</p>
          <p><strong>Phone:</strong> {{ authStore.user?.phone }}</p>
          <p><strong>Email:</strong> {{ authStore.user?.email }}</p>
        </div>
      </div>
      <div class="card-bg p-4 gap-1">
        <h2 class="title-md">Attendance Summary</h2>
        <hr />
        <div class="grid md:grid-cols-2">
          <p>
            <strong>Total Working Days:</strong> {{ attendanceStore?.summary?.total_working_days }}
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
              <th class="border p-1">Late Entry</th>
              <th class="border p-1">Early Leave</th>
              <th class="border p-1">Status</th>
            </tr>
          </thead>
          <tbody class="text-center text-xs">
            <tr v-for="log in attendanceStore?.monthlyLogs" :key="log?.date">
              <td class="border px-1 py-0.5">{{ log.date }}</td>
              <td class="border px-1 py-0.5">{{ log.weekday }}</td>
              <td
                class="border px-1 py-0.5"
                :title="`${log.shift_start_time} to ${log.shift_end_time}`"
              >
                {{ log.shift_name }}
              </td>
              <td class="border px-1 py-0.5" :title="`Device: ${log.entry_device}`">
                {{ log.entry_time }}
              </td>
              <td class="border px-1 py-0.5" :title="`Device: ${log.exit_device}`">
                {{ log.exit_time }}
              </td>
              <td class="border px-1 py-0.5">{{ log.working_hours }}</td>

              <td class="border px-1 py-0.5" :class="{ 'bg-red-100': log.late_duration }">
                <div v-if="log.late_duration">
                  {{ log.late_duration }}
                  <span v-if="log.first_short_leave">
                    <i
                      :class="{
                        'fas fa-check-circle text-green-500': log.first_short_leave === 'Approved',
                        'fas fa-hourglass-half text-yellow-500':
                          log.first_short_leave === 'Pending',
                        'fas fa-times-circle text-red-500': log.first_short_leave === 'Rejected',
                      }"
                      :title="log.first_short_leave"
                    ></i>
                  </span>
                  <router-link
                    v-if="log.late_duration && !log.first_short_leave"
                    :to="{
                      name: 'ShortLeaveAdd',
                      query: {
                        type: 'First',
                        start_time: log.shift_start_time,
                        end_time: log.entry_time,
                      },
                    }"
                    class="btn-link"
                  >
                    (Apply)
                  </router-link>
                </div>
              </td>
              <td class="border px-1 py-0.5" :class="{ 'bg-red-100': log.early_leave_duration }">
                <div v-if="log.early_leave_duration">
                  {{ log.early_leave_duration }}
                  <span v-if="log.last_short_leave">
                    <i
                      :class="{
                        'fas fa-check-circle text-green-500': log.last_short_leave === 'Approved',
                        'fas fa-hourglass-half text-yellow-500': log.last_short_leave === 'Pending',
                        'fas fa-times-circle text-red-500': log.last_short_leave === 'Rejected',
                      }"
                      :title="log.last_short_leave"
                    ></i>
                  </span>
                  <router-link
                    v-if="log.early_leave_duration && !log.last_short_leave"
                    :to="{
                      name: 'ShortLeaveAdd',
                      query: {
                        type: 'Last',
                        start_time: log.exit_time,
                        end_time: log.shift_end_time,
                      },
                    }"
                    class="btn-link"
                  >
                    (Apply)
                  </router-link>
                </div>
              </td>
              <td
                class="border px-1 py-0.5"
                :class="{
                  'text-red-600': log.status === 'Absent',
                  'text-green-600': log.status === 'Present',
                }"
              >
                {{ log.status }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
