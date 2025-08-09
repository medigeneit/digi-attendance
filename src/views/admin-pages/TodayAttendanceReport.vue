<script setup>
import { ref, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'

import LoaderView from '@/components/common/LoaderView.vue'
import EmployeeFilter from '@/components/common/EmployeeFilter.vue'
import { useAttendanceStore } from '@/stores/attendance'
import { useCompanyStore } from '@/stores/company'
import { useDepartmentStore } from '@/stores/department'

const router = useRouter()
const route = useRoute()

// Stores
const companyStore = useCompanyStore()
const departmentStore = useDepartmentStore()
const attendanceStore = useAttendanceStore()

// Store refs
const { dailyLogs } = storeToRefs(attendanceStore)

// Filter refs
const selectedCompanyId = ref(route.query.company_id || '')
const selectedDepartment = ref(route.query.department_id || '')
const selectedEmployeeId = ref(route.query.employee_id || '')
const selectedDate = ref(route.query.date || attendanceStore.selectedDate || '')
const status = ref(route.query.status || '')
const category = ref(route.query.type || 'all')

// Filter object for sync
const filters = ref({
  company_id: selectedCompanyId.value,
  department_id: selectedDepartment.value,
  type: category.value,
  employee_id: selectedEmployeeId.value,
})

// Fetch attendance based on filters
const fetchAttendance = async () => {
  const { company_id, department_id, employee_id, type } = filters.value

  // Only fetch if company or status is selected
  if (company_id || status.value) {
    await attendanceStore.getTodayAttendanceReport({
      companyId: filters.value.company_id,
      departmentId: department_id,
      employee_id: employee_id,
      category: type,
      month: selectedDate.value,
      status: status.value,
    })

  }
}


// Handle filter change → sync with query
const handleFilterChange = () => {
  const newQuery = {
    company_id: filters.value.company_id,
    department_id: filters.value.department_id,
    type: filters.value.type,
    employee_id: filters.value.employee_id,
    date: selectedDate.value,
    status: status.value,
  }

  const isDifferent = Object.entries(newQuery).some(
    ([key, value]) => route.query[key] !== String(value)
  )

  if (isDifferent) {
    router.replace({ query: newQuery })
  }
}

// Download actions
const getExportExcel = () =>
  attendanceStore.attendanceDownloadExcel(
    filters.value.company_id,
    selectedEmployeeId.value?.id,
    filters.value.type,
    selectedDate.value,
    status.value
  )

const getDownloadPDF = () =>
  attendanceStore.attendanceDownloadPdf(
    filters.value.company_id,
    selectedEmployeeId.value?.id,
    filters.value.type,
    selectedDate.value,
    status.value
  )

const goBack = () => router.go(-1)

// Lifecycle
onMounted(async () => {
  await companyStore.fetchCompanies()
  await fetchAttendance()
})

// Watchers
// watch(selectedCompanyId, (newCompanyId) => {
//   filters.value.company_id = newCompanyId
//   companyStore.fetchEmployee(newCompanyId)
//   departmentStore.fetchDepartments(newCompanyId)
//   handleFilterChange()
// })

watch(selectedDate, (newDate) => {
  handleFilterChange()
})

watch(status, () => {
  handleFilterChange()
})

// watch(
//   () => filters.value,
//   () => {
//     fetchAttendance()
//   },
//   { deep: true }
// )
</script>


<template>
  <div class="px-4 space-y-4">
    <div class="flex items-center justify-between gap-2">
      <button class="btn-3" @click="goBack">
        <i class="far fa-arrow-left"></i>
        <span class="hidden md:flex">Back</span>
      </button>
      <h1 class="title-md md:title-lg flex-wrap text-center">
        Daily {{ route?.query?.status === 'all' ? 'Attendance' : route?.query?.status }} Report
      </h1>
      <div class="flex gap-4">
        <button type="button" @click="getExportExcel" class="btn-1">
          <i class="far fa-file-excel text-2xl text-green-500"></i>
        </button>
        <button type="button" @click="getDownloadPDF" class="btn-1">
          <i class="fal fa-file-pdf text-2xl text-red-500"></i>
        </button>
      </div>
    </div>

    <div class="flex flex-wrap gap-4">
      <EmployeeFilter 
        v-model="filters" 
        :initial-value="route.query" 
        @filter-change="handleFilterChange" 
      />
      <div class="flex gap-4">
         <div>
          <select id="userSelect" v-model="status" class="input-1">
            <option value="all">All Status</option>
            <option value="Present">Present</option>
            <option value="Absent">Absent</option>
            <option value="Weekend">Weekend</option>
            <option value="Holiday">Holiday</option>
            <option value="Leave">Leave</option>
          </select>
        </div>
        <div>
          <input
            type="date"
            v-model="selectedDate"
            class="input-1"
            />
            <!-- @change="fetchAttendance" -->
        </div>
          <button type="button" @click="fetchAttendance" class="btn-2">Search</button>
        </div>
      <!-- <div>
        <select
          id="userSelect"
          v-model="selectedCompanyId"
          @change="fetchAttendance"
          class="input-1"
        >
          <option value="" disabled>Select a Company</option>
          <option v-for="company in companies" :key="company?.id" :value="company?.id">
            {{ company?.name }}
          </option>
        </select>
      </div>
      <div>
        <Multiselect
          v-model="selectedDepartment"
          :options="departments"
          :multiple="false"
          placeholder="Select department"
          label="name"
        />
      </div>
      <div>
        <Multiselect
          v-model="selectedEmployeeId"
          :options="employees"
          :multiple="false"
          placeholder="Select employee"
          label="label"
        />
      </div>
      <div>
        <select id="userSelect" v-model="category" @change="fetchAttendance" class="input-1">
          <option value="all">All Category</option>
          <option value="executive">Executive</option>
          <option value="support_staff">Support Staff</option>
          <option value="doctor">Doctor</option>
          <option value="academy_body">Academy Body</option>
        </select>
      </div> -->
     
    </div>

    <LoaderView v-if="attendanceStore.isLoading" />

    <div v-else class="space-y-4">
      <div class="overflow-x-auto card-bg">
        <table class="min-w-full table-auto border-collapse border border-gray-300 bg-white">
          <thead>
            <tr class="bg-gray-200 text-xs">
              <th class="border p-1">#</th>
              <th class="border p-1">Emp/Worker Name</th>
              <th class="border p-1">Department</th>
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
            <tr
              v-for="(log, index) in dailyLogs"
              :key="log?.date"
              class="border-b hover:bg-blue-100"
            >
              <td class="border px-1 py-0.5">{{ index += 1 }}</td>
              <td class="border px-1 py-0.5">{{ log.user_name }}</td>
              <td class="border px-1 py-0.5">{{ log.department }}</td>
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
              <td class="border px-1 py-0.5">{{ log.late_duration }}</td>
              <td class="border px-1 py-0.5">{{ log.early_leave_duration }}</td>
              <td class="border px-1 py-0.5">
                <span
                  v-if="log.absent_reason"
                  :class="[
                    'font-medium',
                    {
                      'text-green-600': log.absent_reason.includes('Approved'),
                      'text-orange-500': log.absent_reason.includes('Pending'),
                      'text-gray-600':
                        !log.absent_reason.includes('Approved') &&
                        !log.absent_reason.includes('Pending'),
                    },
                  ]"
                >
                  {{ log.absent_reason }} 
                  <router-link
                    v-if="log.application_id"
                    :to="{
                      name: 'LeaveApplicationShow',
                      params: {
                        id: log.application_id,
                      },
                    }"
                  >
                    <i class="far fa-eye"></i>
                  </router-link>
                  <router-link
                    v-if="log.exchange_application_id"
                    :to="{
                      name: 'ExchangeOffdayShow',
                      params: {
                        id: log.exchange_application_id,
                      },
                    }"
                  >
                    <i class="far fa-eye"></i>
                  </router-link>
                </span>
                <span
                  v-else
                  :class="[
                    'font-medium',
                    {
                      'text-red-600': log.status === 'Absent',
                      'text-blue-600': log.status === 'Holiday',
                      'text-green-600': log.status === 'Present',
                      'text-gray-600': log.status === 'Weekend' || log.status === 'Leave',
                    },
                  ]"
                >
                  {{ log.status }} 
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
