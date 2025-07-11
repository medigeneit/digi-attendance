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

const { user, leaveApplications, loading } = storeToRefs(leaveApplicationStore)

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
        <input
          id="yearSelect"
          type="year"
          v-model="selectedYear"
          @change="fetchApplicationsByUser"
          class="input-1"
        />
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
              <th class="border border-gray-300 py-2 text-center" colspan="6">
                <span class="text-sky-600 text-lg">{{ user?.name }}</span>
              </th>
            </tr>
            <tr class="bg-gray-200">
              <th class="border border-gray-300 px-2 py-1 text-left">#</th>
              <th class="border border-gray-300 px-2 py-1 text-left">Last Working Day</th>
              <th class="border border-gray-300 px-2 py-1 text-left">Resumption Date</th>
              <th class="border border-gray-300 px-2 py-1 text-left">Leave Period</th>
              <th class="border border-gray-300 px-2 py-1 text-left">Total Days</th>
              <th class="border border-gray-300 px-2 py-1 text-left">Status</th>
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
                <div v-html="application.duration || application?.total_leave_days"></div>
              </td>
              <td class="border border-gray-300 px-2 py-2">
                {{ application?.status || 'N/A' }}
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
        <LeaveApplicationForm  @close="showModal = false" />
      </div>
    </div>
  </Teleport>
</template>
