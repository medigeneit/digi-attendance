<script setup>
import LeaveApplicationForm from '@/components/AdminLeaveApplicationAddForm.vue'
import EmployeeFilter from '@/components/common/EmployeeFilter.vue'
import LoaderView from '@/components/common/LoaderView.vue'
import LeaveTypeModal from '@/components/LeaveTypeModal.vue'
import SelectedEmployeeCard from '@/components/user/SelectedEmployeeCard.vue'
import UserLeaveBalanceModal from '@/components/UserLeaveBalanceModal.vue'
import { useLeaveApplicationStore } from '@/stores/leave-application'
import { useUserStore } from '@/stores/user'
import { storeToRefs } from 'pinia'
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const router = useRouter()
const route = useRoute()
const leaveApplicationStore = useLeaveApplicationStore()
const userStore = useUserStore()

const { user, leave_balances, leaveApplications, loading } = storeToRefs(leaveApplicationStore)

const { userLeaveBalance } = storeToRefs(userStore)

const selectedYear = ref(route.query.year || leaveApplicationStore.selectedYear)
const search = ref(route.query.search || '')

const filters = ref({
  company_id: route.query.company_id || '',
  department_id: route.query.department_id || 'all',
  type: route.query.type || 'all',
  employee_id: route.query.employee_id || '',
})

const showModal = ref(false)
const showLeaveTypeModal = ref(false)

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

  if (route.query.employee_id) {
    await userStore.fetchUserLeaveBalances(route.query.employee_id)
  }
})

watch(
  () => route.query.employee_id,
  async (id) => {
    if (id) {
      await userStore.fetchUserLeaveBalances(id)
    }
  }
)


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

const openAddModal = () => {
  showLeaveTypeModal.value = true
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

const closeLeaveTypeModal = () => {
  showLeaveTypeModal.value = false
  userStore.fetchUserLeaveBalances(route.query.employee_id)
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
      <div v-if="filters?.employee_id" class="bg-sky-100/30 p-4 rounded-lg shadow mb-6 space-y-6">
        <!-- Section Title -->
        <h2 class="text-xl font-bold text-gray-800 text-center">Employee Overview</h2>

        <!-- Grid for Info and Leave -->
        <div class="grid md:grid-cols-2 gap-6">
          <SelectedEmployeeCard :user="user" />
          <!-- <div class="bg-white border rounded-lg p-4 shadow">
            <h3 class="text-lg font-semibold text-gray-700 mb-4">User Info</h3>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-y-2 text-sm text-gray-600">
              <p><strong>Name:</strong> {{ user?.name }}</p>
              <p><strong>Designation:</strong> {{ user?.designation?.title }}</p>
              <p><strong>Department:</strong> {{ user?.department?.name }}</p>
              <p><strong>Company:</strong> {{ user?.company?.name }}</p>
              <p><strong>Phone:</strong> {{ user?.phone }}</p>
              <p><strong>Email:</strong> {{ user?.email }}</p>
              <p><strong>Joining Date:</strong> {{ user?.joining_date }}</p>
              <p><strong>Blood Group:</strong> {{ user?.blood || 'N/A' }}</p>
            </div>
          </div> -->

          <!-- Leave Balance Card -->
          <div class="bg-white border rounded-lg p-4 shadow">
            <div class="flex justify-between items-center">
              <h3 class="text-lg font-semibold text-gray-700 mb-4">Leave Balance</h3>
              <button @click="openAddModal" type="button" class="btn-2">Set Leave Balance</button>
            </div>
            <div class="overflow-x-auto">
              <table class="min-w-full text-sm text-left text-gray-700 border">
                <thead class="bg-gray-100 text-xs uppercase">
                  <tr>
                    <th class="px-4 py-2 text-center">Type</th>
                    <th class="px-4 py-2 text-center">Total</th>
                    <th class="px-4 py-2 text-center">Used</th>
                    <th class="px-4 py-2 text-center">Remaining</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="leave in userLeaveBalance"
                    :key="leave.id"
                    class="border-t hover:bg-gray-50"
                  >
                    <td class="px-4 py-1 text-center font-medium">{{ leave.leave_type }}</td>
                    <td class="px-4 py-1 text-center">{{ leave.annual_quota }}</td>
                    <td class="px-4 py-1 text-center">{{ leave.used_days }}</td>
                    <td class="px-4 py-1 text-center">{{ leave.remaining_days }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      

      <div class="overflow-x-auto">
        <table
          class="min-w-full table-auto border-collapse border border-gray-200 bg-white rounded-md text-sm"
        >
          <thead>
            <tr class="bg-gray-200">
              <th class="border border-gray-300 px-2 py-1 text-center">#</th>
              <th class="border border-gray-300 px-2 py-1 text-center">Last Working Day</th>
              <th class="border border-gray-300 px-2 py-1 text-center">Resumption Date</th>
              <th class="border border-gray-300 px-2 py-1 text-center">Leave Period</th>
              <th class="border border-gray-300 px-2 py-1 text-center">Total Days</th>
              <th class="border border-gray-300 px-2 py-1 text-center">Leave Type</th>
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
              <td class="border border-gray-300 px-2 py-2 text-center">
                {{ application?.last_working_date }}
              </td>
              <td class="border border-gray-300 px-2 py-2 text-center">
                {{ application?.resumption_date }}
              </td>
              <td class="border border-gray-300 px-2 py-2">{{ application?.leave_period }}</td>
              <td class="border border-gray-300 px-2 py-2">
                <div v-html="application?.duration || application?.total_leave_days"></div>
              </td>
              <td class="border border-gray-300 px-2 py-2 text-center">
                {{
                  [
                    ...new Set(
                      application?.leave_days?.map((leave_day) => leave_day?.leave_type?.name),
                    ),
                  ].join(',')
                }}
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
                    v-if="!['Approved', 'Rejected'].includes(application?.status)"
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

  <UserLeaveBalanceModal
      :show="showLeaveTypeModal"
      :user="user"
      @close="closeLeaveTypeModal"
    />





  <!-- ✅ MODAL -->
  <Teleport to="body">
    <div
      v-if="showModal"
      class="fixed inset-0 z-[1000] bg-black bg-opacity-50 flex items-center justify-center"
    >
      <div
        class="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-lg p-4 relative"
      >
        <button
          class="absolute top-2 right-2 text-gray-500 hover:text-red-500 text-xl font-bold"
          @click="showModal = false"
        >
          &times;
        </button>
        <LeaveApplicationForm
          :userInfo="user"
          @close="showModal = false"
          @formSuccessClosed="handleFormSccessClosed"
        />
      </div>
    </div>
  </Teleport>
</template>
