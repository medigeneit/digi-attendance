<script setup>
import EmployeeFilter from '@/components/common/EmployeeFilter.vue'
import LoaderView from '@/components/common/LoaderView.vue'
import { useAttendanceStore } from '@/stores/attendance'
import { storeToRefs } from 'pinia'
import Swal from 'sweetalert2'
import { computed } from 'vue'
import { ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const router = useRouter()
const route = useRoute()

const lateAttendanceStore = useAttendanceStore()

const { monthlyLateLogs, isLoading, selectedMonth } = storeToRefs(lateAttendanceStore)

const month = ref(route.query.date || selectedMonth.value)

const handleMonthChange = () => {
  router.replace({
    query: {
      ...route.query,
      date: month.value,
    },
  })

  if (filters.value?.company_id && filters.value?.department_id && filters.value?.type && filters.value?.employee_id) {
    fetchApplicationsByUser(filters.value)
  }
}


const fetchApplicationsByUser = async (params) => {
  if (params.company_id && params?.department_id && params?.line_type && params?.line_type && params?.employee_id && month.value) {
     await lateAttendanceStore.getAttendanceLateReport(
     params?.company_id, 
      params?.department_id , 
      params?.line_type, 
      params?.employee_id,
      month.value,
      'monthly',
    )
  }
}

const getExportExcel = async () => {
  if (filters.value.company_id && filters.value.employee_id && month.value) {
    await lateAttendanceStore.lateReportDownloadExcel(
      filters.value.company_id,
      filters.value.employee_id,
      month.value,
      'monthly',
    )
  } else {
    Swal.fire({
      icon: 'warning',
      title: 'Missing Selection!',
      text: 'Please select Company, Employee, and Month first!',
      confirmButtonText: 'OK',
    })
  }
}



const goBack = () => {
  router.go(-1)
}

const statusClass = (status) => {
  if (status === 'Pending') return 'text-yellow-700'
  if (status === 'Approved') return 'text-green-700'
  return 'text-red-500'
}

const filters = ref({
  company_id:  '',
  department_id: 'all',
  line_type:  'all',
  employee_id: '',
})

const handleFilterChange = async() => {
  // You can trigger your fetch here
  router.replace({
    query: {
      ...route.query,
      company_id: filters.value?.company_id,
      department_id: filters.value?.department_id,
      line_type: filters.value?.line_type,
      employee_id: filters.value?.employee_id,
    },
  })
  // fetchApplicationsByUser()

  if (filters.value?.company_id && filters.value?.department_id && filters.value?.line_type && filters.value?.employee_id) {
    fetchApplicationsByUser(filters.value)
  
  }
}

const initialFilter = computed(() => ({
  company_id: route.query.company_id || '',
  department_id: route.query.department_id || 'all',
  line_type: route.query.line_type || 'all',
  employee_id: route.query.employee_id || '',
}))

</script>

<template>
  <div class="space-y-2 px-4">
    <div class="flex items-center justify-between gap-2">
      <button class="btn-3" @click="goBack">
        <i class="far fa-arrow-left"></i>
        <span class="hidden md:flex">Back</span>
      </button>

      <h1 class="title-md md:title-lg flex-wrap text-center">Monthly Late Reports</h1>
      <div class="flex gap-4">
        <button type="button" @click="getExportExcel" class="btn-3">
          <i class="far fa-file-excel text-2xl text-green-500"></i>
        </button>
      </div>
    </div>
    
    <div class="flex flex-wrap items-center gap-2">
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
          id="user-filter"
          v-model="month"
          @change="handleMonthChange"
          type="month"
          class="input-1"
        />
      </div>
    </div>

    <div v-if="isLoading" class="text-center py-4">
      <LoaderView />
    </div>

    <div v-else class="space-y-4">
      <div class="overflow-x-auto" v-if="filters.company_id && filters.employee_id && filters.department_id">
        <table
          class="min-w-full table-auto border-collapse border border-gray-200 bg-white rounded-md text-sm"
        >
          <thead>
            <tr class="bg-gray-200">
              <th class="border border-gray-300 px-2 text-left">#</th>
              <th class="border border-gray-300 px-2 text-left">Date</th>
              <th class="border border-gray-300 px-2 text-left">Employee Name</th>
              <th class="border border-gray-300 px-2 text-left">Company</th>
              <th class="border border-gray-300 px-2 text-left">Department</th>
              <th class="border border-gray-300 px-2 text-left">Entry Time</th>
              <th class="border border-gray-300 px-2 text-left">Late Duration</th>
              <th class="border border-gray-300 px-2 text-left">Action</th>
              <th class="border border-gray-300 px-2 text-left">Shift</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(report, index) in monthlyLateLogs"
              :key="report.id"
              class="border-b border-gray-200 hover:bg-blue-200"
            >
              <td class="border border-gray-300 px-2">{{ index + 1 }}</td>
              <td class="border border-gray-300 px-2">{{ report?.date }}</td>
              <td class="border border-gray-300 px-2">{{ report?.user_name || 'Unknown' }}</td>
              <td class="border border-gray-300 px-2">{{ report?.company_name || 'Unknown' }}</td>
              <td class="border border-gray-300 px-2">
                {{ report?.department_name || 'Unknown' }}
              </td>
              <td class="border border-gray-300 px-2">{{ report.entry_time }}</td>
              <td class="border border-gray-300 px-2">{{ report.late_duration }}</td>
              <td class="border border-gray-300 px-2">
                <div v-if="report?.short_leave">
                  <span :class="statusClass(report.short_leave.status)">
                    {{ report.short_leave.status || 'Waiting' }}
                  </span>
                </div>
                <div v-else class="text-gray-500 italic text-xs">No Application</div>
              </td>
              <td class="border border-gray-300 px-2">{{ report.shift_name }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-else class="text-center text-red-500 text-xl italic mt-10">
        Please select company, department and employee
      </div>
    </div>
  </div>
</template>
