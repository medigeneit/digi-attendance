<script setup>
import EmployeeFilter from '@/components/common/EmployeeFilter.vue'
import LoaderView from '@/components/common/LoaderView.vue'
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
    await fetchApplications()
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
  leave_applications: 'LeaveApplicationShow',
  short_leave: 'ShortLeaveShow',
  exchange_shift: 'ExchangeShiftShow',
  exchange_offday: 'ExchangeOffdayShow',
  manual_attendance: 'ManualAttendanceShow',
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
        v-model="filters" 
        :initial-value="route.query" 
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

    <LoaderView v-if="leaveApplicationStore.loading" />

    <table class="w-full border bg-white rounded">
      <thead>
        <tr class="text-left">
          <th class="p-2">Type</th>
          <th class="p-2">Status</th>
          <th class="p-2">Date(s)</th>
          <th class="p-2">Details</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="(item, index) in leaveApplicationStore.applicationLog"
          :key="index"
          class="border-b hover:bg-gray-50"
        >
          <td class="p-2 capitalize">{{ item.type.replace('_', ' ') }}</td>
          <td class="p-2">{{ item.status }}</td>
          <td class="p-2">
            <div v-if="item.date">{{ item.date }}</div>
            <div v-else-if="item.from && item.to">From {{ item.from }} to {{ item.to }}</div>
            <div v-else-if="item.current_date && item.exchange_date">
              {{ item.current_date }} ⇄ {{ item.exchange_date }}
            </div>
            <div v-else>—</div>
          </td>
          <td class="p-2 text-sm text-gray-600">
             <RouterLink
              :to="{
                name: specifications[item.type],
                params: { id: item.id },
              }"
              class="btn-1 px-3"
            >
              <i class="far fa-eye"></i>
            </RouterLink>
          </td>
        </tr>
      </tbody>
    </table>

    
  </div>
</template>
