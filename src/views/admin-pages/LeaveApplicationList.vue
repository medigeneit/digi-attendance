<script setup>
import EmployeeFilter from '@/components/common/EmployeeFilter.vue'
import LoaderView from '@/components/common/LoaderView.vue'
import FlexibleDatePicker from '@/components/FlexibleDatePicker.vue'
import { useLeaveApplicationStore } from '@/stores/leave-application'
import { useUserStore } from '@/stores/user'
import { storeToRefs } from 'pinia'
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
const router = useRouter()
const route = useRoute()
const leaveApplicationStore = useLeaveApplicationStore()
const userStore = useUserStore()
const { leaveApplications, loading } = storeToRefs(leaveApplicationStore)
const selectedUser = ref(null)
const initialMonth = route.query.date || leaveApplicationStore.selectedMonth || new Date().toISOString().slice(0, 7)
const selectedDate = ref(initialMonth)
const now = new Date()
const pad = (value) => value.toString().padStart(2, '0')
const period = ref({
  year: Number(initialMonth.split('-')[0] || now.getFullYear()),
  month: Number(initialMonth.split('-')[1] || now.getMonth() + 1),
  day: 1,
})
const periodMonth = computed(() => {
  if (!period.value?.year || !period.value?.month) return ''
  return `${period.value.year}-${pad(period.value.month)}`
})
const search = ref(route.query.search || '')

const filters = ref({
  company_id: route.query.company_id || '',
  department_id: route.query.department_id || 'all',
  line_type: route.query.line_type || 'all',
  employee_id: route.query.employee_id || '',
  category: '',
})

const fetchApplicationsByUser = async () => {
  const payload = {
    company_id: filters.value.company_id,
    department_id: filters.value.department_id,
    line_type: filters.value.line_type,
    selectedDate: selectedDate.value,
    selectedStatus: leaveApplicationStore.selectedStatus,
    query: search.value,
  }

  if (filters.value.employee_id) {
    payload.user_id = filters.value.employee_id
  }

  loading.value = true
  await leaveApplicationStore.fetchLeaveApplications(payload)
  loading.value = false
}

// On mount: load user and apps
onMounted(async () => {
  if (filters.value.employee_id) {
    await userStore.fetchUser(filters.value.employee_id)
    selectedUser.value = userStore.user || null
  }
  await fetchApplicationsByUser()
})

watch(
  () => [
    filters.value.company_id,
    filters.value.department_id,
    filters.value.line_type,
    filters.value.employee_id,
  ],
  async () => {
    await fetchApplicationsByUser()
  }
)

watch(
  periodMonth,
  (newDate) => {
    if (!newDate) return
    selectedDate.value = newDate
    router.replace({
      query: {
        ...route.query,
        date: newDate,
      },
    })
    fetchApplicationsByUser()
  }
)

const filteredLeaveApplications = computed(() => leaveApplications.value || [])

const deleteApplication = async (applicationId) => {
  if (confirm('Are you sure to delete this application?')) {
    await leaveApplicationStore.deleteLeaveApplication(applicationId)
    await fetchApplicationsByUser()
  }
}

const goBack = () => router.go(-1)

const handleFilterChange = () => {
  router.replace({
    query: {
      ...route.query,
      company_id: filters.value.company_id,
      department_id: filters.value.department_id,
      line_type: filters.value.line_type,
      employee_id: filters.value.employee_id,
    },
  })
}

const formatDate = (ts) => {
  if (!ts) return ''
  const d = new Date(ts)
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}
</script>



<template>
  <div class="space-y-2 px-4">
    <div class="flex items-center justify-between gap-2">
      <button class="btn-3" @click="goBack">
        <i class="far fa-arrow-left"></i>
        <span class="hidden md:flex">Back</span>
      </button>

      <h1 class="title-md md:title-lg flex-wrap text-center">Leave Applications</h1>
      <div></div>
    </div>
    <div class="flex flex-wrap gap-2 p-3">
       <EmployeeFilter
          v-model:company_id="filters.company_id"
          v-model:department_id="filters.department_id"
          v-model:employee_id="filters.employee_id"
          v-model:line_type="filters.line_type"
          :with-type="true"
          :initial-value="$route.query"
         @filter-change="handleFilterChange"
      >
      <div class="flex gap-4 items-center flex-wrap">
       <div>
         <select
           v-model="leaveApplicationStore.selectedStatus"
           @change="fetchApplicationsByUser"
           class="input-1 py-0.5"
         >
           <option value="" selected>All</option>
           <option value="Pending">Pending</option>
           <option value="Approved">Approved</option>
           <option value="Rejected">Rejected</option>
         </select>
       </div>

         <FlexibleDatePicker
          v-model="period"
          :show-year="false"
          :show-month="true"
          :show-date="false"
        />
      </div>
      </EmployeeFilter>
    </div>

    <div v-if="leaveApplicationStore.loading" class="text-center py-4">
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
              <th class="border border-gray-300 px-2 text-left">Employee Name</th>
              <th class="border border-gray-300 px-2 text-left">Created Date</th>
              <th class="border border-gray-300 px-2 text-left">Last Working Day</th>
              <th class="border border-gray-300 px-2 text-left">Resumption Date</th>
              <th class="border border-gray-300 px-2 text-left">Leave Period</th>
              <th class="border border-gray-300 px-2 text-left">Total Days</th>
              <th class="border border-gray-300 px-2 text-left">Type</th>
              <th class="border border-gray-300 px-2 text-left">Status</th>
              <th class="border border-gray-300 px-2 text-left">Action</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(application, index) in filteredLeaveApplications"
              :key="index"
              class="border-b border-gray-200 hover:bg-blue-200"
            >
              <td class="border border-gray-300 px-2">{{ index + 1 }}</td>
              <td class="border border-gray-300 px-2">
                {{ application?.user?.name || 'Unknown' }}
              </td>
              <td class="border border-gray-300 px-2">{{ formatDate(application?.created_at) }}</td>
              <td class="border border-gray-300 px-2">{{ formatDate(application?.last_working_date) }}</td>
              <td class="border border-gray-300 px-2">{{ formatDate(application?.resumption_date) }}</td>
              <td class="border border-gray-300 px-2">{{ application?.leave_period }}</td>
              <td class="border border-gray-300 px-2">
                <div v-html="application.duration || application?.total_leave_days"></div>
              </td>
              <td class="border border-gray-300 px-2">
                {{ application?.application_types }}
              </td>
              <td class="border border-gray-300 px-2">
                {{ application?.status || 'N/A' }}
              </td>
              <td class="border border-gray-300 px-2">
                <div class="flex justify-center gap-2">
                  <RouterLink
                    :to="{ name: 'LeaveApplicationShow', params: { id: application?.id } }"
                    class="btn-icon"
                  >
                    <i class="far fa-eye"></i>
                  </RouterLink>
                  <RouterLink
                  v-if="application?.status !== 'Rejected'"
                  :to="{ name: 'LeaveApplicationEdit', params: { id: application?.id } }"
                  class="btn-icon"
                >
                  <i class="far fa-edit text-orange-600"></i>
                </RouterLink>
                  <button @click="deleteApplication(application?.id)" class="btn-icon text-red-500">
                    <i class="far fa-trash"></i>
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="!filteredLeaveApplications.length">
              <td colspan="7" class="p-1 text-center text-red-500">No application found</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
