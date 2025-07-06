<script setup>
import LoaderView from '@/components/common/LoaderView.vue'
import Multiselect from '@/components/MultiselectDropdown.vue'
import { useAttendanceStore } from '@/stores/attendance'
import { useCompanyStore } from '@/stores/company'
import { useDepartmentStore } from '@/stores/department'
import { storeToRefs } from 'pinia'
import Swal from 'sweetalert2'
import { onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const router = useRouter()
const route = useRoute()
const category = ref('all')
const lateAttendanceStore = useAttendanceStore()
const companyStore = useCompanyStore()
const departmentStore = useDepartmentStore()

const { dailyLateLogs, isLoading, selectedDate } = storeToRefs(lateAttendanceStore)
const { companies } = storeToRefs(companyStore)

const selectedCompanyId = ref(route.query.company_id || '')
const selectedDepartmentId = ref(route.query.department_id || '')
const selectedEmployeeId = ref('')
const { departments } = storeToRefs(departmentStore)
const filterEmployees = ref([])

// Set selectedDate from query if exists
if (route.query.date) {
  selectedDate.value = route.query.date
}

onMounted(async () => {
  await companyStore.fetchCompanies()

  if (selectedCompanyId.value) {
    const res = await companyStore.fetchEmployee(selectedCompanyId.value)
    filterEmployees.value = res;
    onCompanyChange(selectedCompanyId.value)
    await fetchApplicationsByUser()
  }
})

// Watch company change
watch(selectedCompanyId, async (newCompanyId) => {
  if (newCompanyId) {
    await companyStore.fetchEmployee(newCompanyId)
    filterEmployees.value = companyStore.employees
    selectedEmployeeId.value = ''
    selectedDepartmentId.value = ''
    onCompanyChange(newCompanyId)
  } else {
    filterEmployees.value = []
    selectedEmployeeId.value = ''
    selectedDepartmentId.value = ''
  }
  updateFilters()
})

// Watch department change
watch(selectedDepartmentId, (newVal) => {
  if (newVal) {
    // Filter from already fetched employees of the company
    filterEmployees.value = companyStore.employees.filter(emp => emp.department_id == newVal)
  } else {
    // Reset to all employees of the selected company
    filterEmployees.value = companyStore.employees
  }
  updateFilters()
})

// Watch category (Line) change
watch(category, (newVal) => {
  if (newVal !== 'all') {
    // Filter from already fetched employees of the company
    filterEmployees.value = companyStore.employees.filter(emp => emp.type == newVal)
  } else {
    // Reset to all employees of the selected company
    filterEmployees.value = companyStore.employees
  }
  updateFilters()
})

// Watch employee change
watch(selectedEmployeeId, () => {
  updateFilters()
})

// Watch date change
watch(selectedDate, () => {
  updateFilters()
})

// Watch employee change
watch(selectedEmployeeId, async (newEmployee) => {
  if (newEmployee?.id) {
    await fetchApplicationsByUser()
  }
  router.replace({
    query: {
      ...route.query,
      employee_id: newEmployee?.id || '',
    },
  })
})

// Watch date change (selectedDate is reactive from store)
watch(selectedDate, (newDate) => {
  router.replace({
    query: {
      ...route.query,
      date: newDate,
    },
  })
})
watch(selectedCompanyId, (newDate) => {
  router.replace({
    query: {
      ...route.query,
      date: newDate,
    },
  })
})

const fetchApplicationsByUser = async () => {
  if (!selectedCompanyId.value || !selectedDate.value) return

  if (selectedCompanyId.value) {
    await lateAttendanceStore.getAttendanceLateReport(
      selectedCompanyId.value,
      selectedDepartmentId.value,
      category.value,
      selectedEmployeeId.value.id,
      selectedDate.value,
      'daily',
    )
  }
}

const onCompanyChange = async (company_id) => {
  await departmentStore.fetchDepartments(company_id)
}


const getExportExcel = async () => {
  if (selectedCompanyId.value) {
    await lateAttendanceStore.lateReportDownloadExcel(
      selectedCompanyId.value,
      selectedDepartmentId.value,
      category?.value,
      selectedEmployeeId.value.id,
      selectedDate.value,
      'daily',
    )
  } else {
    Swal.fire({
      icon: 'warning',
      title: 'Missing Selection!',
      text: 'Please select Company and Employee first!',
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


const updateFilters = async () => {
  if (!selectedCompanyId.value || !selectedDate.value) return

  await lateAttendanceStore.getAttendanceLateReport(
    selectedCompanyId.value,
    selectedDepartmentId.value,
    category.value,
    selectedEmployeeId.value?.id || '',
    selectedDate.value,
    'daily',
    selectedDepartmentId.value || ''
  )

  router.replace({
    query: {
      company_id: selectedCompanyId.value || '',
      department_id: selectedDepartmentId.value || '',
      employee_id: selectedEmployeeId.value?.id || '',
      date: selectedDate.value || '',
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
      <h1 class="title-md md:title-lg flex-wrap text-center">Daily Late Reports</h1>
      <div class="flex gap-4">
        <button type="button" @click="getExportExcel" class="btn-3">
          <i class="far fa-file-excel text-2xl text-green-500"></i>
        </button>
      </div>
    </div>
    <div class="flex flex-wrap items-center gap-2">
      <div>
        <select id="user-filter" v-model="selectedCompanyId" class="input-1">
          <option value="">Select Company</option>
          <option v-for="user in companies" :key="user.id" :value="user.id">
            {{ user.name }}
          </option>
        </select>
      </div>
      <div>
        <select id="user-filter" v-model="selectedDepartmentId" class="input-1">
          <option value="">Select Department</option>
          <option v-for="user in departments" :key="user.id" :value="user.id">
            {{ user.name }}
          </option>
        </select>
      </div>

      <div>
        <select
          id="userSelect"
          v-model="category"
          @change="fetchApplicationsByUser"
          class="input-1"
        >
          <option value="all">All Category</option>
          <option value="executive">Executive</option>
          <option value="support_staff">Support Staff</option>
          <option value="doctor">Doctor</option>
          <option value="academy_body">Academy Body</option>
        </select>
      </div>

      <div>
        <Multiselect
          v-model="selectedEmployeeId"
          :options="filterEmployees"
          :multiple="false"
          label="label"
          placeholder="Please select employee..."
        />
      </div>
      <div>
        <input
          id="user-filter"
          v-model="selectedDate"
          @change="fetchApplicationsByUser"
          type="date"
          class="input-1"
        />
      </div>
    </div>

    <div v-if="isLoading" class="text-center py-4">
      <LoaderView />
    </div>

    <div v-else class="space-y-4">
      <div class="overflow-x-auto" v-if="selectedCompanyId">
        <table
          class="min-w-full table-auto border-collapse border border-gray-200 bg-white rounded-md text-sm"
        >
          <thead>
            <tr class="bg-gray-200">
              <th class="border border-gray-300 px-2 text-left">#</th>
              <th class="border border-gray-300 px-2 text-left">Date</th>
              <th class="border border-gray-300 px-2 text-left">Weekday</th>
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
              v-for="(report, index) in dailyLateLogs"
              :key="report.id || index"
              class="border-b border-gray-200 hover:bg-blue-200"
            >
              <td class="border border-gray-300 px-2">{{ index + 1 }}</td>
              <td class="border border-gray-300 px-2">{{ report?.date }}</td>
              <td class="border border-gray-300 px-2">{{ report?.weekday }}</td>
              <td class="border border-gray-300 px-2">{{ report?.user_name || 'Unknown' }}</td>
              <td class="border border-gray-300 px-2">{{ report?.company_name || 'Unknown' }}</td>
              <td class="border border-gray-300 px-2">
                {{ report?.department_name || 'Unknown' }}
              </td>
              <td class="border border-gray-300 px-2">{{ report?.entry_time }}</td>
              <td class="border border-gray-300 px-2">{{ report?.late_duration }}</td>
              <td class="border border-gray-300 px-2">
                <div v-if="report?.short_leave">
                  <span :class="statusClass(report.short_leave.status)">
                    {{ report.short_leave.status || 'Waiting' }}
                  </span>
                </div>
                <div v-else class="text-gray-500 italic text-xs">No Application</div>
              </td>
              <td class="border border-gray-300 px-2">{{ report?.shift_name }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-else class="text-center text-red-500 text-xl italic mt-10">Please select company</div>
    </div>
  </div>
</template>
