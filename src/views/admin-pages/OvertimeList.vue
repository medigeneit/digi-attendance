<script setup>
import EmployeeFilter from '@/components/common/EmployeeFilter.vue'
import LoaderView from '@/components/common/LoaderView.vue'
import OvertimeDataList from '@/components/overtime/OvertimeDataList.vue'
import { useNotificationStore } from '@/stores/notification'
import { useOvertimeStore } from '@/stores/overtime'
import { useUserStore } from '@/stores/user'
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const router = useRouter()
const route = useRoute()
const notificationStore = useNotificationStore()
const overtimeStore = useOvertimeStore()
const userStore = useUserStore()

const loading = ref(false)
const selectedUser = ref(null)
const selectedMonth = ref(route.query.date || new Date().toISOString().slice(0, 7))

const filters = ref({
  company_id: route.query.company_id || '',
  department_id: route.query.department_id || 'all',
  line_type: route.query.line_type || 'all',
  employee_id: route.query.employee_id || '',
  category: '',
})

onMounted(async () => {
  if (filters.value.employee_id) {
    loading.value = true
    try {
      await fetchUser(filters.value.employee_id)
      await fetchOvertimeListData()
    } catch (error) {
      console.log(error)
    }
    loading.value = false
  }
})

// Fetch user when employee_id changes
const fetchUser = async (employeeId) => {
  if (employeeId) {
    await userStore.fetchUser(employeeId)
    selectedUser.value = userStore.user
  } else {
    selectedUser.value = null
  }
}

const applicationIds = computed(() => {
  return overtimeStore.overtimes?.map((overtime) => overtime.id) || []
})

// Fetch attendance
const fetchOvertimeListData = async () => {
  if (filters.value.employee_id && selectedMonth.value) {
    await overtimeStore.fetchUserMonthlyOvertimes(filters.value.employee_id, selectedMonth.value)

    if (applicationIds.value?.length) {
      await notificationStore.fetchApprovalPermissionsByUserApplicationIds(
        'overtime_applications',
        applicationIds.value,
      )
    }
  }
}

// Watch selectedMonth change
watch(selectedMonth, (date) => {
  router.replace({ query: { ...route.query, date } })
  fetchOvertimeListData()
})

// Watch employee_id change
watch(
  () => filters.value.employee_id,
  async (newVal, oldVal) => {
    if (newVal && newVal !== oldVal) {
      await fetchUser(newVal)
      await fetchOvertimeListData()
    }
  },
)

// Go back handler
const goBack = () => router.go(-1)

// Filter change handler
const handleFilterChange = () => {
  router.replace({
    query: {
      ...route.query,
      company_id: filters.value.company_id,
      department_id: filters.value.department_id,
      line_type: filters.value.line_type,
      employee_id: filters.value.employee_id || route.query.employee_id,
    },
  })
}
</script>

<template>
  <div class="px-4 space-y-4">
    <div class="flex items-center justify-between gap-2">
      <button class="btn-3" @click="goBack">
        <i class="far fa-arrow-left"></i>
        <span class="hidden md:flex">Back</span>
      </button>
      <h1 class="title-md md:title-lg flex-wrap text-center">Monthly Overtime</h1>
      <div></div>
    </div>
    <div
      class="w-full flex flex-wrap gap-4 items-center md:w-auto relative"
      :class="{ 'opacity-50': loading }"
    >
      
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
          @change="fetchOvertimeListData"
          class="input-1"
        />
      </div>
      <div v-if="loading" class="absolute inset-0 w-full h-full"></div>
    </div>

    <LoaderView v-if="overtimeStore.isLoading || loading" />

    <OvertimeDataList
      v-else-if="selectedUser"
      :user="selectedUser"
      :onUpdate="fetchOvertimeListData"
    />

    <div v-if="!selectedUser">
      <p class="text-gray-400 text-center text-2xl italic">Select an employee, please.</p>
    </div>
  </div>
</template>
