<script setup>
import EmployeeFilter from '@/components/common/EmployeeFilter.vue'
import LoaderView from '@/components/common/LoaderView.vue'
import StatusBadge from '@/components/common/StatusBadge.vue'
import { useAttendanceStore } from '@/stores/attendance'
import { useUserStore } from '@/stores/user'
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const router = useRouter()
const route = useRoute()
const attendanceStore = useAttendanceStore()
const userStore = useUserStore()

const selectedUser = ref(null)
const selectedMonth = ref(route.query.date || attendanceStore.selectedMonth)

const filters = ref({
  company_id: route.query.company_id || '',
  department_id: route.query.department_id || 'all',
  type: route.query.type || 'all',
  employee_id: route.query.employee_id || '',
  category: '',
})

// Fetch user when employee_id changes
const fetchUser = async (employeeId) => {
  if (employeeId) {
    await userStore.fetchUser(employeeId)
    selectedUser.value = userStore.user
  } else {
    selectedUser.value = null
  }
}

// Fetch attendance
const fetchAttendance = async () => {
  if (filters.value.employee_id && selectedMonth.value) {
    await attendanceStore.getMonthlyAttendanceByShift(filters.value.employee_id, selectedMonth.value)
  }
}

// Initial load
onMounted(async () => {
  if (filters.value.employee_id) {
    await fetchUser(filters.value.employee_id)
    await fetchAttendance()
  }
})

// Watch selectedMonth change
watch(selectedMonth, (date) => {
  router.replace({
    query: {
      ...route.query,
      date,
    },
  })
  fetchAttendance()
})

// Watch employee_id change
watch(
  () => filters.value.employee_id,
  async (newVal, oldVal) => {
    if (newVal && newVal !== oldVal) {
      await fetchUser(newVal)
      await fetchAttendance()
    }
  }
)

// Go back handler
const goBack = () => router.go(-1)

// Filter change handler
const handleFilterChange = () => {
  router.replace({
    query: {
      ...route.query,
      company_id: filters.value.company_id,
      department_id: filters.value.department_id,
      type: filters.value.type,
      employee_id: filters.value.employee_id,
    },
  })
}
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
    <div class="w-full flex flex-wrap  gap-4 items-center md:w-auto">
       <EmployeeFilter 
        v-model="filters" 
        :initial-value="route.query" 
        @filter-change="handleFilterChange" 
      />
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
          <p><strong>Employee ID :</strong> {{ selectedUser.employee_id || 'N/A' }}</p>
          <p><strong>Joining Date :</strong> {{ selectedUser.joining_date || 'N/A' }}</p>
          <p><strong>Employee ID :</strong> {{ selectedUser.blood || 'N/A' }}</p>
        </div>
      </div>

      <div class="card-bg p-4 gap-1">
        <div  class="flex justify-between items-center">
          <h2 class="title-md">Attendance Summary</h2>
          <router-link
          :to="{ name: 'MonthWiseApplicationLog', query: { ...route.query } }"
          class="btn-2"
          target="_blank"
          rel="noopener noreferrer"
        >
          Application History
        </router-link>
        </div>
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
              <th class="border p-1">Over Time</th>
              <th class="border p-1">Approved OT</th>
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
                class="border px-2 py-1 text-sm whitespace-nowrap"
                :title="`${log.shift_start_time} to ${log.shift_end_time}`"
              >
                <div class="flex flex-col gap-1">
                  <!-- Shift name -->
                  <div class="font-semibold text-gray-800">
                    {{ log.shift_name }}
                  </div>

                  <!-- Exchange status badge with link -->
                  <div
                    v-if="log.shift_exchange_application_status"
                    class="text-xs"
                  >
                    <router-link
                      :to="{ name: 'ExchangeShiftShow', params: { id: log.shift_exchange_application_id } }"
                      class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-medium transition hover:opacity-90"
                      :class="{
                        'bg-yellow-100 text-yellow-800': log.shift_exchange_application_status === 'Pending',
                        'bg-green-100 text-green-800': log.shift_exchange_application_status === 'Approved',
                        'bg-red-100 text-red-800': log.shift_exchange_application_status === 'Rejected',
                      }"
                    >
                      <i class="far fa-eye"></i>
                      {{ log.shift_exchange_application_status }}
                    </router-link>
                  </div>
                </div>
              </td>

              <td
                  class="border px-2 py-1 text-sm whitespace-nowrap"
                  :class="{
                    'bg-red-100 text-red-800': log.late_duration,
                    'bg-blue-100 text-blue-800': log?.manual_attendance?.check_in && log.entry_time,
                    'bg-gray-50': !log.entry_time
                  }"
                >
                  <div class="flex items-center gap-1" :title="`Device: ${log.entry_device}`">
                    <span v-if="log?.manual_attendance?.check_in && log.entry_time" class="font-semibold">M:</span>
                    <span>{{ log.entry_time || '--' }}</span>

                    <router-link
                      v-if="log?.manual_attendance?.id && log?.manual_attendance?.check_in"
                      :to="{ name: 'ManualAttendanceShow', params: { id: log.manual_attendance.id }}"
                      class="text-blue-600 hover:text-blue-800"
                    >
                      <i class="far fa-eye ml-1"></i>
                    </router-link>

                    <!-- <span v-if="log.late_duration" class="ml-2 bg-red-200 text-red-700 text-xs px-1.5 py-0.5 rounded-full">Late</span> -->
                  </div>
                </td>

                <td
                  class="border px-2 py-1 text-sm whitespace-nowrap"
                  :class="{
                    'bg-red-100 text-red-800': log.early_leave_duration,
                    'bg-blue-100 text-blue-800': log?.manual_attendance?.check_out && log.exit_time,
                    'bg-gray-50': !log.exit_time
                  }"
                >
                  <div class="flex items-center gap-1" :title="`Device: ${log.exit_device}`">
                    <span>{{ log.exit_time || '--' }}</span>

                    <router-link
                      v-if="log?.manual_attendance?.id && log?.manual_attendance?.check_out"
                      :to="{ name: 'ManualAttendanceShow', params: { id: log.manual_attendance.id }}"
                      class="text-blue-600 hover:text-blue-800"
                    >
                      <i class="far fa-eye ml-1"></i>
                    </router-link>

                    <!-- <span v-if="log.early_leave_duration" class="ml-2 bg-red-200 text-red-700 text-xs px-1.5 py-0.5 rounded-full">Early</span> -->
                  </div>
                </td>

              <td class="border px-1 py-0.5">{{ log.working_hours }}</td>
             <td class="border px-1 py-0.5">
                <template v-if="log.over_time_status === 'Approved'">
                  <router-link :to="{name:'MyOvertimeShow', params:{id:log.over_time_application_id}}" class="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-semibold">
                    {{ log.overtime_hours }} | Approved
                  </router-link>
                </template>

                <template v-else-if="log.over_time_status === 'Pending'">
                  <router-link :to="{name:'MyOvertimeShow', params:{id:log.over_time_application_id}}" class="bg-yellow-100 text-yellow-700 px-2 py-1 rounded text-xs font-semibold animate-pulse">
                    {{ log.overtime_hours ?? '--' }} | Pending
                  </router-link>
                </template>

                <template v-else-if="log.over_time_status === 'Rejected'">
                  <span class="bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-semibold">
                    Rejected
                  </span>
                </template>
                <template v-else-if="log.over_time_status && log.overtime_hours">
                  <span>
                     {{ log.overtime_hours }} 
                  </span>
                </template>
              </td>

              <td class="border px-1 py-0.5">{{ log?.approved_over_times ? log?.approved_over_times + ' H' : '' }}</td>
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
                  <router-link
                    v-if="log.first_short_leave"
                    :to="{
                      name: 'ShortLeaveShow',
                      params: {
                        id: log.first_short_leave_id,
                      },
                    }"
                    :class="{
                      'text-green-500': log.first_short_leave === 'Approved',
                      'text-yellow-500': log.first_short_leave === 'Pending',
                      'text-red-500': log.first_short_leave === 'Rejected',
                    }"
                  >
                    ({{ log.first_short_leave }})
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
                  <router-link
                    v-if="log.last_short_leave"
                    :to="{
                      name: 'ShortLeaveShow',
                      params: {
                        id: log.last_short_leave_id,
                      },
                    }"
                    class="px-1"
                    :class="{
                      'text-green-500': log.last_short_leave === 'Approved',
                      'text-yellow-500': log.last_short_leave === 'Pending',
                      'text-red-500': log.last_short_leave === 'Rejected',
                    }"
                  >
                    ({{ log.last_short_leave }})
                  </router-link>
                </div>
              </td>
              <td class="border py-0.5">
                <div class="flex  justify-center items-center gap-1">
                  <!-- Main Attendance Status Badge -->
                  <StatusBadge :status="log.status" />
                  <!-- Leave Application ID with view link -->
                 <div v-if="log.leave_application_id" class="flex items-center gap-2">
                      <!-- View Button -->
                      <router-link
                        :to="{ name: 'LeaveApplicationShow', params: { id: log.leave_application_id } }"
                        class="text-blue-600 text-xs inline-flex items-center gap-1 hover:underline hover:text-blue-800 transition"
                        title="View Leave Application"
                      >
                        <!-- Status Badge -->
                        <span
                          class="text-xs font-medium py-0.5  transition"
                          :class="{
                            ' text-green-700 border-green-200': log.application_status === 'Approved',
                            ' text-yellow-700 border-yellow-200': log.application_status === 'Pending',
                            ' text-red-700 border-red-200': log.application_status === 'Rejected',
                            ' text-gray-600 border-gray-200': !log.application_status,
                          }"
                        >
                           {{ log.status == 'Absent' ? log.leave_application_type : ''  }}( {{ log.application_status || 'Waiting Handover' }} )
                        </span>
                      </router-link>

                    </div>
                 <div v-if="log.day_exchange_id" class="flex items-center gap-2">
                      <!-- View Button -->
                      <router-link
                        :to="{ name: 'ExchangeOffdayShow', params: { id: log.day_exchange_id } }"
                        class="text-blue-600 text-xs inline-flex items-center gap-1 hover:underline hover:text-blue-800 transition"
                        title="View Leave Application"
                      >
                        <!-- Status Badge -->
                        <span
                          class="text-xs font-medium py-0.5  transition"
                          :class="{
                            ' text-green-700 border-green-200': log.day_exchange_status === 'Approved',
                            ' text-yellow-700 border-yellow-200': log.day_exchange_status === 'Pending',
                            ' text-red-700 border-red-200': log.day_exchange_status === 'Rejected',
                            ' text-gray-600 border-gray-200': !log.day_exchange_status,
                          }"
                        >
                          Offday ( {{ log.day_exchange_status || 'Waiting Handover' }} )
                        </span>
                      </router-link>

                    </div>

                </div>
              </td>

            </tr>
          </tbody>
        </table>
      </div>
    </div>
    
  </div>
</template>
