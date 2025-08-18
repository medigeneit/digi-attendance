<script setup>
import EmployeeFilter from '@/components/common/EmployeeFilter.vue'
import LoaderView from '@/components/common/LoaderView.vue'
import DisplayFormattedWorkingHours from '@/components/overtime/DisplayFormattedWorkingHours.vue'
import SelectedEmployeeCard from '@/components/user/SelectedEmployeeCard.vue'
import { useAttendanceStore } from '@/stores/attendance'
import { useLeaveApplicationStore } from '@/stores/leave-application'
import { useUserStore } from '@/stores/user'
import { onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()
const leaveApplicationStore = useLeaveApplicationStore()

const selectedUser = ref(null)
const selectedMonth = ref(route.query.date || leaveApplicationStore.selectedMonth)

const filters = ref({
  company_id: route.query.company_id || '',
  department_id: route.query.department_id || 'all',
  type: route.query.type || 'all',
  employee_id: route.query.employee_id || '',
  category: '',
})

// Fetch selected user info
const fetchUser = async (employeeId) => {
  if (employeeId) {
    await userStore.fetchUser(employeeId)
    selectedUser.value = userStore.user
  } else {
    selectedUser.value = null
  }
}

// Fetch attendance
const fetchApplications = async () => {
  if (filters.value.employee_id && selectedMonth.value) {
    await leaveApplicationStore.getMonthlyApplicationLog(filters.value.employee_id, selectedMonth.value)
  }
}

// Initial fetch on mount
onMounted(async () => {
  if (filters.value.employee_id) {
    await fetchUser(filters.value.employee_id)
  }
})

// Watch employee_id changes
watch(
  () => filters.value.employee_id,
  async (newVal, oldVal) => {
    if (newVal && newVal !== oldVal) {
      await fetchUser(newVal)
      await fetchApplications()
      router.replace({
        query: {
          ...route.query,
          employee_id: newVal,
        },
      })
    }
  }
)

// Watch month change
watch(selectedMonth, (newDate) => {
  router.replace({
    query: {
      ...route.query,
      date: newDate,
    },
  })
  fetchApplications()
})

// Go back
const goBack = () => router.go(-1)

// Format time
const formatTime = (timestamp) => {
  const d = new Date(timestamp)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

const formatOnlyTime = (timeStr) => {
  const d = new Date(`1970-01-01T${timeStr}`);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};


const formatDateTime = (timestamp) => {
  const d = new Date(timestamp)
  const date = d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }) // e.g., "19 Jul 2025"

  // const time = d.toLocaleTimeString('en-US', {
  //   hour: '2-digit',
  //   minute: '2-digit',
  //   hour12: true
  // }) // e.g., "04:30 PM"

  return `${date}`
}

// Apply filters from EmployeeFilter component
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

const specifications = {
  exchange_shift: 'ExchangeShiftShow',
  exchange_offday: 'ExchangeOffdayShow',
}

</script>


<template>
  <div class="px-4 space-y-4">
    <div class="flex items-center justify-between gap-2">
      <button class="btn-3" @click="goBack">
        <i class="far fa-arrow-left"></i>
        <span class="hidden md:flex">Back</span>
      </button>
      <h1 class="title-md md:title-lg flex-wrap text-center">Monthly Application Log</h1>
      <div></div>
    </div>

    <div class="flex flex-wrap gap-4">

        <EmployeeFilter
          v-model:company_id="filters.company_id"
          v-model:department_id="filters.department_id"
          v-model:employee_id="filters.employee_id"
          v-model:category="filters.category"
          :with-type="true"
          :initial-value="$route.query"
         @filter-change="handleFilterChange"
      />
      <!-- <MultiselectDropdown
        v-model="selectedUser"
        :options="userStore.users"
        :multiple="false"
        label="label"
        placeholder="Select Employee"
      /> -->
      <div>
        <input
          id="monthSelect"
          type="month"
          v-model="selectedMonth"
          @change="fetchApplications"
          class="input-1"
        />
      </div>
    </div>

    <div v-if="selectedUser" class="flex justify-between gap-4 text-sm">
        <SelectedEmployeeCard :user="selectedUser"/>
    </div>

    <LoaderView v-if="leaveApplicationStore.loading" />

    <div class="space-y-5">
    <div
      v-for="(items, groupKey) in leaveApplicationStore.applicationLog"
      :key="groupKey"
      class="bg-gray-50 p-4 rounded shadow"
    >
      <!-- Group Title -->
      <h2 class="text-base font-semibold text-blue-400 mb-2 text-center capitalize">
        {{ groupKey.replaceAll('_', ' ') }} <span class="text-gray-500">({{ items.length }})</span>
      </h2>

      <!-- Group Table -->
       <div class="overflow-x-auto rounded border bg-white" v-if="groupKey === 'overtime'">
          <table
                  class="min-w-full table-auto border-collapse border border-gray-200 bg-white rounded-md text-sm"
                >
                  <thead>
                    <tr class="bg-gray-200 *:py-1">
                      <th class="border border-gray-300 px-2 text-center">#</th>
                      <th class="border border-gray-300 px-2 text-center">Date</th>
                      <th class="border border-gray-300 px-2 text-center">Type</th>
                      <th class="border border-gray-300 px-2 text-center">Shift</th>
                      <th class="border border-gray-300 px-2 text-center">Check-In</th>
                      <th class="border border-gray-300 px-2 text-center">Check-Out</th>
                      <th class="border border-gray-300 px-2 text-center">Working (hour)</th>
                      <th class="border border-gray-300 px-2 text-center">Request (hour)</th>
                      <th class="border border-gray-300 px-2 text-center">Approved (hour)</th>
                      <th class="border border-gray-300 px-2 text-center">Details</th>
                      <th class="border border-gray-300 px-2 text-center">Status</th>
                      <th class="border border-gray-300 px-2 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="(overtime, index) in items"
                        :key="`${groupKey}-${index}`"
                      class="border-b border-gray-200 hover:bg-blue-200 *:py-2"
                    >
                      <td class="border border-gray-300 px-2 text-center">{{ index + 1 }}</td>
                      <td class="border border-gray-300 px-2 text-center">
                        {{
                          new Date(overtime.date).toLocaleDateString('en-GB', {
                            day: '2-digit',
                            month: 'long',
                            year: 'numeric',
                          })
                        }}
                      </td>
                      <td class="border border-gray-300 px-2 text-center">
                        {{ overtime.duty_type }}
                      </td>
                      <td class="border border-gray-300 px-2 text-center">
                        {{ overtime.shift }}
                      </td>
                      <td class="border border-gray-300 px-2 text-center">
                        {{ overtime.check_in || '- : -' }}
                      </td>
                      <td class="border border-gray-300 px-2 text-center">
                        {{ overtime.check_out || '- : -' }}
                      </td>
                      <td class="border border-gray-300 px-2 text-center">
                        <DisplayFormattedWorkingHours :workingHours="overtime.working_hours" />
                      </td>
                      <td class="border border-gray-300 px-2 text-center">
                        <DisplayFormattedWorkingHours :workingHours="overtime.request_overtime_hours" />
                      </td>
                      <td class="border border-gray-300 px-2 text-center">
                        <DisplayFormattedWorkingHours :workingHours="overtime.approval_overtime_hours" />
                      </td>
                      <td class="border border-gray-300 px-2 text-center">
                        {{ overtime.work_details || '' }}
                      </td>
                      <td class="border border-gray-300 px-2 text-center">
                        {{ overtime.status || 'Pending' }}
                      </td>
                      <td class="border border-gray-300 px-2 text-center !py-0.5">
                        <RouterLink
                          :to="{
                            name: 'MyOvertimeShow',
                            params: { id: overtime.id },
                          }"
                          class="text-blue-800"
                        >
                          <i class="far fa-eye text-lg"></i>
                        </RouterLink>
                      </td>
                    </tr>
                  </tbody>
                </table>
       </div>
      <div class="overflow-x-auto rounded border bg-white" v-if="groupKey === 'leave_application'">
        <table class="min-w-full text-sm text-left">
          <thead class="bg-gray-100 text-gray-700 text-xs uppercase">
            <tr>
              <!-- <th class="p-2">Type</th> -->
              <th class="p-2">#</th>
              <th class="p-2">Create Date</th>
              <th class="p-2">Last Working Date</th>
              <th class="p-2">Resumption Date</th>
              <th class="p-2">Type</th>
              <th class="p-2">Status</th>
              <th class="p-2">Action</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(item, index) in items"
              :key="`${groupKey}-${index}`"
              class="border-t hover:bg-gray-50 text-sm"
            >
              <td class="p-2">{{ index+=1 }}</td>
              <td class="p-2">{{ formatDateTime(item.create_date)  }}</td>
              <td class="p-2">{{ item.from  }}</td>
              <td class="p-2">{{ item.to  }}</td>
              <td class="p-2 whitespace-pre-line">
                {{ item.application_types }}
              </td>
              <td class="p-2 whitespace-pre-line">
                {{ item.status }}
              </td>
              <td class="p-2 text-sm text-gray-600">
                <RouterLink
                  :to="{
                    name: 'LeaveApplicationShow',
                    params: { id: item.id },
                  }"
                  class="inline-flex items-center gap-1 text-blue-600 hover:underline"
                >
                  <i class="far fa-eye"></i> View
                </RouterLink>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="overflow-x-auto rounded border bg-white" v-if="groupKey === 'short_leave'">
        <table class="min-w-full text-sm text-left">
          <thead class="bg-gray-100 text-gray-700 text-xs uppercase">
            <tr>
              <!-- <th class="p-2">Type</th> -->
              <th class="p-2">#</th>
              <th class="p-2">Create Date</th>
              <th class="p-2">Type</th>
              <th class="p-2">Date</th>
              <th class="p-2">Check In</th>
              <th class="p-2">Check Out</th>
              <th class="p-2">Duration</th>
              <th class="p-2">Attachment</th>
              <th class="p-2">Status</th>
              <th class="p-2">Action</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(item, index) in items"   :key="`${groupKey}-${index}`"  class="border-t hover:bg-gray-50 text-sm" >
              <td class="p-2">{{ index+=1 }}</td>
              <td class="p-2">{{ formatDateTime(item.create_date)  }}</td>
              <td class="p-2">{{ item.application_types  }}</td>
              <td class="p-2">{{ item.date  }}</td>
              <td class="p-2 whitespace-pre-line">
                {{ formatOnlyTime(item.start_time) }}
                
              </td>
              <td class="p-2 whitespace-pre-line">
                {{ formatOnlyTime(item.end_time) }}
              </td>
              <td class="p-2 whitespace-pre-line">
                {{ item.duration }} m
              </td>
              <td class="p-2 whitespace-pre-line  text-center">
                <a
                  v-if="item.attachment"
                  :href="item.attachment"
                  target="_blank"
                  rel="noopener"
                  class="text-blue-600 hover:underline"
                >
                 <i class="far fa-eye"></i> 
                </a>
                <span v-else class="text-gray-400">No file</span>
              </td>

              <td class="p-2 whitespace-pre-line">
                {{ item.status }}
              </td>
              <td class="p-2 text-sm text-gray-600">
                <RouterLink
                  :to="{
                    name: 'ShortLeaveShow',
                    params: { id: item.id },
                  }"
                  class="inline-flex items-center gap-1 text-blue-600 hover:underline"
                >
                  <i class="far fa-eye"></i> View
                </RouterLink>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="overflow-x-auto rounded border bg-white" v-if="groupKey === 'exchange_offday' || groupKey === 'exchange_shift'">
        <table class="min-w-full text-sm text-left">
          <thead class="bg-gray-100 text-gray-700 text-xs uppercase">
            <tr>
              <!-- <th class="p-2">Type</th> -->
              <th class="p-2">#</th>
              <th class="p-2">Create Date</th>
              <th class="p-2">Current Date</th>
              <th class="p-2">Exchange Date</th>
              <th class="p-2">Shift</th>
              <th class="p-2">Status</th>
              <th class="p-2">Action</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(item, index) in items"   :key="`${groupKey}-${index}`"  class="border-t hover:bg-gray-50 text-sm" >
              <td class="p-2">{{ index+=1 }}</td>
              <td class="p-2">{{ formatDateTime(item.create_date)  }}</td>
              <td class="p-2">{{ item.current_date  }}</td>
              <td class="p-2">{{ item.exchange_date  }}</td>
              <td class="p-2 whitespace-pre-line">
                {{  item?.shift || 'N/A' }}
                
              </td>
              <td class="p-2 whitespace-pre-line">
                {{ item.status }}
              </td>
              <td class="p-2 text-sm text-gray-600">
                <RouterLink
                  :to="{
                    name: specifications[item.type],
                    params: { id: item.id },
                  }"
                  class="inline-flex items-center gap-1 text-blue-600 hover:underline"
                >
                  <i class="far fa-eye"></i> View
                </RouterLink>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="overflow-x-auto rounded border bg-white" v-if="groupKey === 'manual_attendance'">
        <table class="min-w-full text-sm text-left">
          <thead class="bg-gray-100 text-gray-700 text-xs uppercase">
            <tr>
              <!-- <th class="p-2">Type</th> -->
              <th class="p-2">#</th>
              <th class="p-2">Create Date</th>
              <th class="p-2">Date</th>
              <th class="p-2">Type</th>
              <th class="p-2">Check In</th>
              <th class="p-2">Check Out</th>
              <th class="p-2">Status</th>
              <th class="p-2">Action</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(item, index) in items"   :key="`${groupKey}-${index}`"  class="border-t hover:bg-gray-50 text-sm" >
              <td class="p-2">{{ index+=1 }}</td>
              <td class="p-2">{{ formatDateTime(item.create_date)  }}</td>
              <td class="p-2"> {{ formatDateTime(item.check_in  || item.check_out)  }}</td>
              <td class="p-2">{{ item.application_types  }}</td>
              <td class="p-2">{{ formatTime(item.check_in) || 'N/A' }}</td>
              <td class="p-2">{{ formatTime(item.check_out) || 'N/A' }}</td>
              <td class="p-2 whitespace-pre-line">
                {{ item.status }}
              </td>
              <td class="p-2 text-sm text-gray-600">
                <RouterLink
                  :to="{
                    name: 'ManualAttendanceShow',
                    params: { id: item.id },
                  }"
                  class="inline-flex items-center gap-1 text-blue-600 hover:underline"
                >
                  <i class="far fa-eye"></i> View
                </RouterLink>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>

    
  </div>
</template>
