<script setup>
import LoaderView from '@/components/common/LoaderView.vue'
import Multiselect from '@/components/MultiselectDropdown.vue'
import { useAttendanceStore } from '@/stores/attendance'
import { useCompanyStore } from '@/stores/company'
import { storeToRefs } from 'pinia'
import Swal from 'sweetalert2'
import { onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const router = useRouter()
const route = useRoute()

const lateAttendanceStore = useAttendanceStore()
const companyStore = useCompanyStore()

const { dailyLateLogs, isLoading, selectedDate } = storeToRefs(lateAttendanceStore)
const { companies, employees } = storeToRefs(companyStore)

const selectedCompanyId = ref(route.query.company_id || '')
const selectedEmployeeId = ref('')

// Set selectedDate from query if exists
if (route.query.date) {
  selectedDate.value = route.query.date
}

onMounted(async () => {
  await companyStore.fetchCompanies()

  if (selectedCompanyId.value) {
    await companyStore.fetchEmployee(selectedCompanyId.value)
    await fetchApplicationsByUser()
  }
})

// Watch company change
watch(selectedCompanyId, async (newCompanyId) => {
  if (newCompanyId) {
    await companyStore.fetchEmployee(newCompanyId)
    selectedEmployeeId.value = ''
  }

  router.replace({
    query: {
      ...route.query,
      company_id: newCompanyId || '',
      employee_id: '',
    },
  })
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
  if (selectedCompanyId.value) {
    await lateAttendanceStore.getAttendanceLateReport(
      selectedCompanyId.value,
      selectedEmployeeId.value.id,
      selectedDate.value,
      'daily',
    )
  }
}

const getExportExcel = async () => {
  if (selectedCompanyId.value) {
    await lateAttendanceStore.lateReportDownloadExcel(
      selectedCompanyId.value,
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
        <Multiselect
          v-model="selectedEmployeeId"
          :options="employees"
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
      <div v-else class="text-center text-red-500 text-xl italic mt-10">
        Please select company
      </div>
    </div>
  </div>
</template>
