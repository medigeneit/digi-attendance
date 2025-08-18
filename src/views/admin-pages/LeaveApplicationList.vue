<script setup>
import EmployeeFilter from '@/components/common/EmployeeFilter.vue'
import LoaderView from '@/components/common/LoaderView.vue'
import { useAuthStore } from '@/stores/auth'
import { useLeaveApplicationStore } from '@/stores/leave-application'
import { useUserStore } from '@/stores/user'
import { storeToRefs } from 'pinia'
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const router = useRouter()
const route = useRoute()
const leaveApplicationStore = useLeaveApplicationStore()
const userStore = useUserStore()
const authStore = useAuthStore()

const { leaveApplications, loading } = storeToRefs(leaveApplicationStore)

const selectedUser = ref(null)
const selectedDate = ref(route.query.date || leaveApplicationStore.selectedMonth)
const search = ref(route.query.search || '')

const filters = ref({
  company_id: route.query.company_id || '',
  department_id: route.query.department_id || 'all',
  type: route.query.type || 'all',
  employee_id: route.query.employee_id || '',
  category: '',
})


const fetchApplicationsByUser = async () => {
  const payload = {
    company_id: filters.value.company_id,
    department_id: filters.value.department_id,
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

// Watch selectedUser and update apps + query
// watch(
//   () => filters.value.employee_id,
//   async (newId) => {
//     if (newId) {
//       filters.value.employee_id = newId
//     } else {
//       filters.value.employee_id = ''
//     }
//     await fetchApplicationsByUser()
//   }
// )

watch(
  () => [
    filters.value.company_id,
    filters.value.department_id,
    filters.value.employee_id,
    selectedDate.value,
  ],
  async () => {
    await fetchApplicationsByUser()
  }
)


watch(
  () => selectedDate.value,
  (newDate) => {
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
      type: filters.value.type,
      employee_id: filters.value.employee_id,
    },
  })
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
    <div class="flex flex-wrap gap-2">
       <EmployeeFilter
          v-model:company_id="filters.company_id"
          v-model:department_id="filters.department_id"
          v-model:employee_id="filters.employee_id"
          v-model:category="filters.category"
          :with-type="true"
          :initial-value="$route.query"
         @filter-change="handleFilterChange"
      />
      <!-- <div style="width: 300px">
        <MultiselectDropdown
          v-model="selectedUser"
          :options="userStore.users"
          :multiple="false"
          label="label"
          placeholder="Select user"
        />
      </div> -->
      <div>
        <input
          id="monthSelect"
          type="month"
          v-model="selectedDate"
          @change="fetchApplicationsByUser"
          class="input-1"
        />
      </div>
      <div>
        <select
          v-model="leaveApplicationStore.selectedStatus"
          @change="fetchApplicationsByUser"
          class="input-1"
        >
          <option value="" selected>All</option>
          <option value="Pending">Pending</option>
          <option value="Approved">Approved</option>
          <option value="Rejected">Rejected</option>
        </select>
      </div>
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
              <td class="border border-gray-300 px-2">{{ application?.last_working_date }}</td>
              <td class="border border-gray-300 px-2">{{ application?.resumption_date }}</td>
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
                  v-if="application?.status !== 'Approved'"
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
