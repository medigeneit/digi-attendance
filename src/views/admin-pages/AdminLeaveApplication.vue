<script setup>
import LeaveApplicationForm from '@/components/AdminLeaveApplicationAddForm.vue'
import EmployeeFilter from '@/components/common/EmployeeFilter.vue'
import LoaderView from '@/components/common/LoaderView.vue'
import FlexibleDatePicker from '@/components/FlexibleDatePicker.vue'
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

const { user, leaveApplications, loading } = storeToRefs(leaveApplicationStore)

const { userLeaveBalance } = storeToRefs(userStore)

const selectedYear = ref(route.query.year || leaveApplicationStore.selectedYear)
const search = ref(route.query.search || '')
const now = new Date()
const period = ref({
  year: Number(selectedYear.value) || now.getFullYear(),
  month: now.getMonth() + 1,
  day: now.getDate(),
})
const periodYear = computed(() => period.value?.year ?? now.getFullYear())

const filters = ref({
  company_id: route.query.company_id || '',
  department_id: route.query.department_id || 'all',
  line_type: route.query.line_type || 'all',
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
    await userStore.fetchUserLeaveBalances(route.query.employee_id, { year: periodYear.value })
  }
})

watch(
  () => route.query.employee_id,
  async (id) => {
    if (id) {
      await userStore.fetchUserLeaveBalances(id, { year: periodYear.value })
    }
  },
)

watch(periodYear, async (year) => {
  if (!year) return
  selectedYear.value = year
  await fetchApplicationsByUser()
  if (filters.value.employee_id) {
    await userStore.fetchUserLeaveBalances(filters.value.employee_id, { year })
  }
})

const filteredLeaveApplications = computed(() => leaveApplications.value || [])

const goBack = () => router.go(-1)

const handleFilterChange = async () => {
  router.replace({
    query: {
      ...route.query,
      company_id: filters.value.company_id,
      department_id: filters.value.department_id,
      line_type: filters.value.line_type,
      employee_id: filters.value.employee_id,
    },
  })
  await fetchApplicationsByUser()
}

const openAddModal = () => {
  showLeaveTypeModal.value = true
}

const handleFormSccessClosed = async () => {
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
  userStore.fetchUserLeaveBalances(route.query.employee_id, { year: periodYear.value })
}

const formatDate = (ts) => {
  if (!ts) return ''
  const d = new Date(ts)
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}
</script>

<template>
  <div class="space-y-2 px-4 overflow-x-hidden">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <button class="btn-3 order-1" @click="goBack">
        <i class="far fa-arrow-left"></i>
        <span class="hidden sm:inline">Back</span>
      </button>

      <h1 class="title-md md:title-lg flex-wrap text-center order-3 w-full md:w-auto md:order-2">
        Annual Leave Applications
      </h1>
      <div class="order-2 md:order-3" />
    </div>

    <div
      class="flex flex-wrap gap-2 p-3 rounded-2xl border border-white/20 bg-white/60 backdrop-blur-md shadow-sm supports-[backdrop-filter]:bg-white/50 sticky top-14 z-50 w-full"
    >
      <EmployeeFilter
        v-model:company_id="filters.company_id"
        v-model:department_id="filters.department_id"
        v-model:employee_id="filters.employee_id"
        v-model:line_type="filters.line_type"
        :with-type="true"
        :initial-value="$route.query"
        @filter-change="handleFilterChange"
        class="w-full"
      >
        <FlexibleDatePicker
          v-model="period"
          :show-year="true"
          :show-month="false"
          :show-date="false"
          label="Year"
        />
      </EmployeeFilter>
    </div>

    <div v-if="leaveApplicationStore.loading" class="text-center py-4">
      <LoaderView />
    </div>

    <div v-else class="space-y-4">
      <div v-if="filters?.employee_id" class="bg-sky-100/30 p-4 rounded-lg shadow mb-6 space-y-6">
        <!-- Section Title -->
        <!-- <h2 class="text-xl font-bold text-gray-800 text-center">Employee Overview</h2> -->

        <!-- Grid for Info and Leave -->
        <div class="grid md:grid-cols-2 gap-6">
          <SelectedEmployeeCard :user="user" />

          <!-- Leave Balance Card -->
          <div class="bg-white border rounded-lg p-4 shadow">
            <div class="flex justify-between items-start">
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
                    <th class="px-4 py-2 text-center">Pending</th>
                    <th class="px-4 py-2 text-center">Remaining</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="leave in userLeaveBalance"
                    :key="leave.id"
                    class="border-t hover:bg-gray-50"
                  >
                    <td class="px-4 py-1 text-center font-medium">{{ leave.name }}</td>
                    <td class="px-4 py-1 text-center">{{ leave.annual_quota }}</td>
                    <td class="px-4 py-1 text-center">{{ leave.used_days }}</td>
                    <td class="px-4 py-1 text-center">{{ leave?.pending_days }}</td>
                    <td class="px-4 py-1 text-center">{{ leave.remaining_days }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <!-- Mobile cards -->
      <div class="grid gap-3 md:hidden">
        <div
          v-for="(application, index) in filteredLeaveApplications"
          :key="index"
          class="bg-white border rounded-lg shadow-sm p-3 space-y-2 break-words"
        >
          <div class="flex items-center justify-between text-xs text-gray-500">
            <div class="font-semibold text-gray-800">#{{ index + 1 }}</div>
            <div>{{ formatDate(application?.created_at) }}</div>
          </div>
          <div class="text-sm text-gray-700">
            <div class="flex justify-between">
              <span class="text-gray-500">Last Working</span>
              <span class="font-medium">{{ formatDate(application?.last_working_date) }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-500">Resumption</span>
              <span class="font-medium">{{ formatDate(application?.resumption_date) }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-500">Period</span>
              <span class="font-medium">{{ application?.leave_period }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-500">Total Days</span>
              <span class="font-medium" v-html="application?.duration || application?.total_leave_days"></span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-500">Type</span>
              <span class="font-medium">
                {{
                  [
                    ...new Set(
                      application?.leave_days?.map((leave_day) => leave_day?.leave_type?.name),
                    ),
                  ].join(',')
                }}
              </span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-500">Status</span>
              <span class="font-semibold text-blue-700">{{ application?.status || 'N/A' }}</span>
            </div>
          </div>
          <div class="flex justify-end gap-2">
            <RouterLink
              :to="{ name: 'LeaveApplicationShow', params: { id: application?.id } }"
              class="btn-2 px-3 py-1 text-xs"
              target="_blank"
            >
              View
            </RouterLink>
            <RouterLink
              v-if="!['Approved', 'Rejected'].includes(application?.status)"
              :to="{ name: 'LeaveApplicationEdit', params: { id: application?.id } }"
              class="btn-3 px-3 py-1 text-xs"
              target="_blank"
            >
              Edit
            </RouterLink>
            <button @click="deleteApplication(application?.id)" class="btn-3 px-3 py-1 text-xs text-red-600">
              Delete
            </button>
          </div>
        </div>
        <div v-if="!filteredLeaveApplications.length" class="text-center text-red-500 text-sm">
          No application found
        </div>
      </div>

      <div class="overflow-x-auto hidden md:block">
        <table
          class="min-w-full table-auto border-collapse border border-gray-200 bg-white rounded-md text-sm"
        >
          <thead>
            <tr class="bg-gray-200">
              <th class="border border-gray-300 px-2 py-1 text-center">#</th>
              <th class="border border-gray-300 px-2 py-1 text-center">Created Date</th>
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
                {{ formatDate(application?.created_at) }}
              </td>
              <td class="border border-gray-300 px-2 py-2 text-center">
                {{ formatDate(application?.last_working_date) }}
              </td>
              <td class="border border-gray-300 px-2 py-2 text-center">
                {{ formatDate(application?.resumption_date) }}
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
              <td colspan="10" class="p-1 text-center text-red-500">No application found</td>
            </tr>
          </tbody>
          <tfoot>
            <tr v-if="filters?.employee_id">
              <th class="text-center py-2" colspan="10">
                <button
                  @click="showModal = true"
                  class="text-white font-semibold px-4 py-2 rounded-full shadow-md bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 transition"
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

  <UserLeaveBalanceModal :show="showLeaveTypeModal" :user="user" @close="closeLeaveTypeModal" />

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
