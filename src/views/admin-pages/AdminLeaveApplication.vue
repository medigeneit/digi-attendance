<script setup>
import EmployeeFilter from '@/components/common/EmployeeFilter.vue'
import LoaderView from '@/components/common/LoaderView.vue'
import LeaveApplicationForm from '@/components/AdminLeaveApplicationAddForm.vue'
import { useLeaveApplicationStore } from '@/stores/leave-application'
import { useUserStore } from '@/stores/user'
import { storeToRefs } from 'pinia'
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const router = useRouter()
const route = useRoute()
const leaveApplicationStore = useLeaveApplicationStore()
const userStore = useUserStore()

const { user, leave_balances, leaveApplications, loading } = storeToRefs(leaveApplicationStore)

const selectedYear = ref(route.query.year || leaveApplicationStore.selectedYear)
const search = ref(route.query.search || '')

const filters = ref({
  company_id: route.query.company_id || '',
  department_id: route.query.department_id || 'all',
  type: route.query.type || 'all',
  employee_id: route.query.employee_id || '',
})

const showModal = ref(false)

const fetchApplicationsByUser = async () => {
  const payload = {
    selectedYear: selectedYear.value,
    selectedStatus: leaveApplicationStore.selectedStatus,
    query: search.value,
  }
  if (filters.value.employee_id) {
    payload.user_id = filters.value.employee_id
    loading.value = true
    await leaveApplicationStore.fetchYearlyUserLeaveApplications(payload)
    loading.value = false
  } else {
    leaveApplications.value = []
  }
}

onMounted(async () => {
  await fetchApplicationsByUser()
})

const filteredLeaveApplications = computed(() => leaveApplications.value || [])

const goBack = () => router.go(-1)

const handleFilterChange = async () => {
  router.replace({
    query: {
      ...route.query,
      company_id: filters.value.company_id,
      department_id: filters.value.department_id,
      type: filters.value.type,
      employee_id: filters.value.employee_id,
    },
  })
  await fetchApplicationsByUser()
}

const handleFormSccessClosed = async () => {
  console.log('test close')
  showModal.value = false
  await fetchApplicationsByUser()
}

const currentYear = new Date().getFullYear()
const yearOptions = ref([])
for (let y = 2023; y <= currentYear; y++) {
  yearOptions.value.push(y)
}

const deleteApplication = async (applicationId) => {
  if (confirm('Are you sure to delete this application?')) {
    await leaveApplicationStore.deleteLeaveApplication(applicationId)
    await fetchApplicationsByUser()
  }
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

    <div class="flex gap-2">
      <EmployeeFilter 
        v-model="filters" 
        :initial-value="route.query" 
        @filter-change="handleFilterChange" 
      />
      <div>
        <select v-model="selectedYear" @change="fetchApplicationsByUser" class="input-1">
          <option v-for="year in yearOptions" :key="year" :value="year">{{ year }}</option>
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
            <tr class="bg-sky-200/20 text-center" v-if="filters?.employee_id">
              <th class="border border-gray-300 py-2 text-center" colspan="3">
                <div class="">
                  <h2 class="text-lg font-semibold text-center py-2">User Info</h2>
                  <hr />
                  <div class="grid md:grid-cols-2">
                    <p class="py-1"><strong>Name:</strong> {{ user?.name }}</p>
                    <p class="py-1"><strong>Designation:</strong> {{ user?.designation?.title }}</p>
                    <p class="py-1"><strong>Department:</strong> {{ user?.department?.name }}</p>
                    <p class="py-1"><strong>Company:</strong> {{ user?.company?.name }}</p>
                    <p class="py-1"><strong>Phone:</strong> {{ user?.phone }}</p>
                    <p class="py-1"><strong>Email:</strong> {{ user?.email }}</p>
                  </div>
                </div>
              </th>
              <th class="border border-gray-300 py-2 text-center" colspan="4">
                  <div class="">
                    <!-- <h2 class="text-lg font-semibold text-center py-2">Leave Balance</h2> -->
                    <div class="overflow-x-auto min-h-max">
                      <table class="min-w-full text-sm text-left text-gray-500">
                        <thead class="text-xs text-gray-700 uppercase bg-gray-50">
                          <tr>
                            <th scope="col" class="px-6 text-center py-1">Type</th>
                            <th scope="col" class="px-6 text-center py-1">Total Days</th>
                            <th scope="col" class="px-6 text-center py-1">Used Days</th>
                            <th scope="col" class="px-6 text-center py-1">Remaining Days</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr
                            v-for="leave_balance in leave_balances"
                            :key="leave_balance.id"
                            class="border-b hover:bg-gray-100"
                          >
                            <td class="px-6 text-center font-medium text-gray-900">
                              {{ leave_balance.leave_type }}
                            </td>
                            <td class="px-6 text-center">{{ leave_balance.total_leave_days }}</td>
                            <td class="px-6 text-center">{{ leave_balance.used_days }}</td>
                            <td class="px-6 text-center">{{ leave_balance.remaining_days }}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                </div>
              </th>
            </tr>
            <tr class="bg-gray-200">
              <th class="border border-gray-300 px-2 py-1 text-center">#</th>
              <th class="border border-gray-300 px-2 py-1 text-center">Last Working Day</th>
              <th class="border border-gray-300 px-2 py-1 text-center">Resumption Date</th>
              <th class="border border-gray-300 px-2 py-1 text-center">Leave Period</th>
              <th class="border border-gray-300 px-2 py-1 text-center">Total Days</th>
              <th class="border border-gray-300 px-2 py-1 text-center">Status</th>
              <th class="border border-gray-300 px-2 py-1 text-center">Action</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(application, index) in filteredLeaveApplications"
              :key="index"
              class="border-b border-gray-200 hover:bg-blue-200"
            >
              <td class="border border-gray-300 px-2 py-2">{{ index + 1 }}</td>
              <td class="border border-gray-300 px-2 py-2">{{ application?.last_working_date }}</td>
              <td class="border border-gray-300 px-2 py-2">{{ application?.resumption_date }}</td>
              <td class="border border-gray-300 px-2 py-2">{{ application?.leave_period }}</td>
              <td class="border border-gray-300 px-2 py-2">
                <div v-html="application?.duration || application?.total_leave_days"></div>
              </td>
              <td class="border border-gray-300 px-2 py-2">
                {{ application?.status || 'N/A' }}
              </td>
              <td class="border border-gray-300 px-2">
                <div class="flex justify-center gap-2">
                  <RouterLink
                    :to="{ name: 'LeaveApplicationShow', params: { id: application?.id } }"
                    class="btn-icon"
                    target="_blank"
                  >
                    <i class="far fa-eye"></i>
                  </RouterLink>
                  <RouterLink
                    v-if="application?.status !== 'Approved'"
                    :to="{ name: 'LeaveApplicationEdit', params: { id: application?.id } }"
                    class="btn-icon"
                    target="_blank"
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
          <tfoot>
            <tr v-if="filters?.employee_id">
              <th class="text-center py-2" colspan="6">
                <button
                  @click="showModal = true"
                  class="text-white font-semibold px-4 py-2 rounded-lg shadow-md bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 transition"
                >
                  + Add Application
                </button>
              </th>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  </div>

  <!-- ✅ MODAL -->
  <Teleport to="body">
    <div
      v-if="showModal"
      class="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center"
    >
      <div class="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-lg p-4 relative">
        <button
          class="absolute top-2 right-2 text-gray-500 hover:text-red-500 text-xl font-bold"
          @click="showModal = false"
        >
          &times;
        </button>
        <LeaveApplicationForm :userInfo="user" @close="showModal = false" @formSuccessClosed="handleFormSccessClosed" />
      </div>
    </div>
  </Teleport>
</template>
