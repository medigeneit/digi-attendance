<script setup>
import EmployeeFilter from '@/components/common/EmployeeFilter.vue'
import LoaderView from '@/components/common/LoaderView.vue'
import { useExchangeStore } from '@/stores/exchange'
import { useUserStore } from '@/stores/user'
import { storeToRefs } from 'pinia'
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const router = useRouter()
const route = useRoute()
const exchangeStore = useExchangeStore()
const userStore = useUserStore()
const type = 'shift'
const selectedUser = ref(null)
const selectedMonth = ref(route.query.date || exchangeStore.selectedMonth)
const { loading } = storeToRefs(exchangeStore)

const filters = ref({
  company_id: route.query.company_id || '',
  department_id: route.query.department_id || 'all',
  line_type: route.query.line_type || 'all',
  type: route.query.type || 'all',
  employee_id: route.query.employee_id || '',
  line_type: '',
})
// Fetch all users and exchanges
onMounted( async () => {
  loading.value = true
  await userStore.fetchUsers()
  selectedUser.value = userStore.users.find((user) => user.id == route?.query?.employee_id)
  await fetchOffDayExchangeByUser()
})

const fetchOffDayExchangeByUser = async () => {

  if (filters.value.employee_id) {
    await exchangeStore.fetchAllExchanges({
      company_id: filters.value.company_id,
      department_id: filters.value.department_id,
      user_id: filters.value.employee_id,
      line_type: filters.value.line_type,
      type: type,
      selectedMonth: selectedMonth.value,
      selectedStatus: exchangeStore.selectedStatus,
    })
    
  } else {
    // Fetch all short leaves if no user is selected
    await exchangeStore.fetchAllExchanges({
      company_id: filters.value.company_id,
      department_id: filters.value.department_id,
      line_type: filters.value.line_type,
      type: type,
      selectedMonth: selectedMonth.value,
      selectedStatus: exchangeStore.selectedStatus,
    })
  }
}

watch(
  () => [
    filters.value.company_id,
    filters.value.department_id,
    filters.value.employee_id,
    filters.value.line_type,
    selectedMonth.value
  ],
  async () => {
    await fetchOffDayExchangeByUser()
  }
)

watch(selectedMonth, (date) => {
  router.replace({
    query: {
      ...route.query,
      date: date,
    },
  })
})

const goBack = () => {
  router.go(-1)
}

const deleteApplication = async (applicationId) => {
  if (confirm('Are you sure to delete this application?')) {
    exchangeStore.deleteExchange(applicationId)
  }
}

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
</script>

<template>
  <div class="space-y-2 px-4">
    <div class="flex items-center justify-between gap-2">
      <button class="btn-3" @click="goBack">
        <i class="far fa-arrow-left"></i>
        <span class="hidden md:flex">Back</span>
      </button>

      <h1 class="title-md md:title-lg flex-wrap text-center">Shift Exchanges</h1>
      <div></div>
    </div>
    <div class="flex flex-wrap gap-4">
       
        <EmployeeFilter
         v-model:company_id="filters.company_id"
          v-model:department_id="filters.department_id"
          v-model:employee_id="filters.employee_id"
          v-model:line_type="filters.line_type"
          :with-type="true"
          :initial-value="$route.query"
         @filter-change="handleFilterChange"
      />
      <div>
        <input
          id="monthSelect"
          type="month"
          v-model="selectedMonth"
          @change="fetchOffDayExchangeByUser"
          class="input-1"
        />
      </div>
      <div>
        <select
          v-model="exchangeStore.selectedStatus"
          @change="fetchOffDayExchangeByUser"
          class="input-1"
        >
          <option value="" selected>All</option>
          <option value="Pending">Pending</option>
          <option value="Approved">Approved</option>
          <option value="Rejected">Rejected</option>
        </select>
      </div>
    </div>

    <div v-if="exchangeStore.loading" class="text-center py-4">
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
              <th class="border border-gray-300 px-2 text-left">Exchange Date</th>
              <th class="border border-gray-300 px-2 text-left">Current Shift</th>
              <th class="border border-gray-300 px-2 text-left">Exchange Shift</th>
              <th class="border border-gray-300 px-2 text-left">Attachment</th>
              <th class="border border-gray-300 px-2 text-left">Status</th>
              <th class="border border-gray-300 px-2 text-left">Action</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(exchange, index) in exchangeStore?.all_exchanges"
              :key="exchange?.id"
              class="border-b border-gray-200 hover:bg-blue-200"
            >
              <td class="border border-gray-300 px-2">{{ index + 1 }}</td>
              <td class="border border-gray-300 px-2">{{ exchange?.user?.name || 'Unknown' }}</td>
              <td class="border border-gray-300 px-2">{{ exchange?.exchange_date }}</td>
              <td class="border border-gray-300 px-2">{{ exchange?.user?.shift?.name }}</td>
              <td class="border border-gray-300 px-2">{{ exchange?.shift?.name }}</td>
              <td class="border border-gray-300 px-2 text-center">
                <a
                  v-if="exchange.attachment"
                  :href="exchange?.attachment"
                  target="_blank"
                  class="text-blue-500 underline"
                >
                  <i class="fad fa-link"></i>
                </a>
              </td>
              <td class="border border-gray-300 px-2">{{ exchange?.status || 'N/A' }}</td>
              <td class="border border-gray-300 px-2">
                <div class="flex gap-2">
                  <RouterLink
                    :to="{ name: 'ExchangeShiftShow', params: { id: exchange?.id } }"
                    class="btn-icon"
                  >
                    <i class="far fa-eye"></i>
                  </RouterLink>
                  <button @click="deleteApplication(exchange?.id)" class="btn-icon text-red-500">
                    <i class="far fa-trash"></i>
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="exchangeStore?.all_exchanges?.length === 0">
              <td colspan="6" class="p-2 text-center text-red-500">No shift exchanges found</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
