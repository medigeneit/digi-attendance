<script setup>
import LoaderView from '@/components/common/LoaderView.vue'
import Multiselect from '@/components/MultiselectDropdown.vue'
import { useAttendanceStore } from '@/stores/attendance'
import { useCompanyStore } from '@/stores/company'
import { storeToRefs } from 'pinia'
import { onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const router = useRouter()
const route = useRoute()
const companyStore = useCompanyStore()
const attendanceStore = useAttendanceStore()
const selectedCompanyId = ref(route.query.company_id || '')
const selectedEmployee = ref(null)
const selectedMonth = ref(route.query.date || attendanceStore.selectedMonth)
const { companies, employees } = storeToRefs(companyStore)
const { monthly_company_summary } = storeToRefs(attendanceStore)
const category = ref('')

const fetchAttendance = async () => {
  if (selectedCompanyId.value) {
    await attendanceStore.getMonthlyAttendanceSummaryReport(
      selectedCompanyId.value,
      selectedEmployee?.value?.id,
      category?.value,
      selectedMonth.value,
    )
  }
}

const getExportExcel = async () => {
  if (selectedCompanyId.value) {
    await attendanceStore.downloadExcel(
      selectedCompanyId.value,
      category?.value,
      selectedMonth.value,
    )
  }
}

const getDownloadPDF = async () => {
  if (selectedCompanyId.value) {
    await attendanceStore.downloadPDF(selectedCompanyId.value, category?.value, selectedMonth.value)
  }
}

onMounted(async () => {
  await companyStore.fetchCompanies()
  await fetchAttendance()
  selectedEmployee.value = employees.value.find((em) => em.id == route.query.employee_id)
})

watch(selectedCompanyId, (newCompanyId) => {
  companyStore.fetchEmployee(newCompanyId)
})

watch([selectedCompanyId, selectedMonth], fetchAttendance)

watch(selectedCompanyId, (newSelectedCompanyId) => {
  router.replace({
    query: {
      ...route.query,
      company_id: newSelectedCompanyId,
    },
  })
})

watch(selectedMonth, (date) => {
  router.replace({
    query: {
      ...route.query,
      date: date,
    },
  })
})

watch(selectedEmployee, (newEmployee) => {
  router.replace({
    query: {
      ...route.query,
      employee_id: newEmployee?.id,
    },
  })
})

watch(selectedEmployee, (newEmployee) => {
  if (newEmployee?.id) {
    fetchAttendance()
  }
})

const goBack = () => router.go(-1)
</script>

<template>
  <div class="px-4 space-y-4">
    <div class="flex items-center justify-between gap-2">
      <button class="btn-3" @click="goBack">
        <i class="far fa-arrow-left"></i>
        <span class="hidden md:flex">Back</span>
      </button>
      <h1 class="title-md md:title-lg flex-wrap text-center">Monthly Attendance Summary Report</h1>
      <div class="flex gap-4">
        <button type="button" @click="getExportExcel" class="btn-1">
          <i class="far fa-file-excel text-2xl text-green-500"></i>
        </button>
        <button type="button" @click="getDownloadPDF" class="btn-1">
          <i class="fal fa-file-pdf text-2xl text-red-500"></i>
        </button>
      </div>
    </div>

    <div class="flex flex-wrap gap-4">
      <div>
        <select
          id="userSelect"
          v-model="selectedCompanyId"
          @change="fetchAttendance"
          class="input-1"
        >
          <option value="" disabled>Select a Company</option>
          <option v-for="company in companies" :key="company?.id" :value="company?.id">
            {{ company?.name }}
          </option>
        </select>
      </div>
      <div>
        <select v-model="category" @change="fetchAttendance" class="input-1">
          <option value="">All Category</option>
          <option value="executive">Executive</option>
          <option value="support_staff">Support Staff</option>
          <option value="doctor">Doctor</option>
          <option value="academy_body">Academy Body</option>
        </select>
      </div>
      <div>
        <Multiselect
          v-model="selectedEmployee"
          :options="employees"
          :multiple="false"
          label="name"
          placeholder="Select employee"
        />
      </div>
      <div>
        <input type="month" v-model="selectedMonth" @change="fetchAttendance" class="input-1" />
      </div>
    </div>

    <LoaderView v-if="attendanceStore.isLoading" />

    <div v-else class="space-y-4">
      <div class="overflow-x-auto card-bg" v-if="selectedCompanyId">
        <table class="min-w-full table-auto border-collapse border border-gray-300 bg-white">
          <thead>
            <tr class="bg-gray-100 text-sm">
              <th rowspan="2" class="border px-1 py-0.5">#</th>
              <th rowspan="2" class="border px-1 py-0.5">Employee Name</th>
              <th rowspan="2" class="border px-1 py-0.5">Designation</th>
              <th colspan="5" class="border px-1 py-0.5">Attendance Summary</th>
              <th colspan="2" class="border px-1 py-0.5">Actual Late</th>
              <th colspan="2" class="border px-1 py-0.5">Remaining Late</th>
              <th colspan="2" class="border px-1 py-0.5">Actual Early</th>
              <th colspan="2" class="border px-1 py-0.5">Remaining Early</th>
              <th rowspan="2" class="border px-1 py-0.5">Working Hour</th>
              <th rowspan="2" class="border px-1 py-0.5">OT Hour</th>
              <th colspan="4" class="border px-1 py-0.5">Leave Day</th>
              <th colspan="2" class="border px-1 py-0.5">Short Leave</th>
              <th rowspan="2" class="border px-1 py-0.5">Weekend Duty</th>
              <!-- <th rowspan="2" class="border px-2 py-0.5">Comment</th> -->
            </tr>
            <tr class="bg-gray-100 text-xs">
              <th class="border px-2 py-0.5">TD</th>
              <th class="border px-2 py-0.5">TP</th>
              <th class="border px-2 py-0.5">TW</th>
              <th class="border px-2 py-0.5">TL</th>
              <th class="border px-2 py-0.5">TA</th>
              <th class="border px-1 py-0.5">Day</th>
              <th class="border px-2 py-0.5">Hour</th>
              <th class="border px-1 py-0.5">Day</th>
              <th class="border px-2 py-0.5">Hour</th>
              <th class="border px-1 py-0.5">Day</th>
              <th class="border px-2 py-0.5">Hour</th>
              <th class="border px-2 py-0.5">Day</th>
              <th class="border px-2 py-0.5">Hour</th>
              <th class="border px-2 py-0.5">CL</th>
              <th class="border px-2 py-0.5">ML</th>
              <th class="border px-2 py-0.5">SL</th>
              <th class="border px-2 py-0.5">WPL</th>
              <th class="border px-2 py-0.5">Delay</th>
              <th class="border px-2 py-0.5">Early</th>
            </tr>
          </thead>
          <tbody class="text-center text-sm">
            <tr
              v-for="(log, index) in monthly_company_summary"
              :key="log?.date"
              class="border-b border-gray-200 hover:bg-blue-200"
            >
              <td class="border px-2 py-0.5">{{ index += 1 }}</td>
              <td class="border px-2 py-0.5">{{ log?.user }}</td>
              <td class="border px-2 py-0.5">{{ log?.designation }}</td>
              <td class="border px-2 py-0.5">{{ log?.total_monthly_days }}</td>
              <td class="border px-2 py-0.5">{{ log?.total_present }}</td>
              <td class="border px-2 py-0.5">{{ log?.total_weekend }}</td>
              <td class="border px-2 py-0.5">{{ log?.total_leave }}</td>
              <td class="border px-2 py-0.5">{{ log?.total_absent }}</td>
              <td class="border px-2 py-0.5">{{ log?.actual_late_day }}</td>
              <td class="border px-2 py-0.5">{{ log?.actual_late_hour }}</td>
              <td class="border px-2 py-0.5">{{ log?.total_remain_late_day }}</td>
              <td class="border px-2 py-0.5">{{ log?.total_remain_late_hour }}</td>
              <td class="border px-2 py-0.5">{{ log?.actual_early_day }}</td>
              <td class="border px-2 py-0.5">{{ log?.actual_early_hour }}</td>
              <td class="border px-2 py-0.5">{{ log?.total_remain_early_day }}</td>
              <td class="border px-2 py-0.5">{{ log?.total_remain_early_hour }}</td>
              <td class="border py-0.5">
                <div class="border-b border-black font-semibold text-green-600">
                  {{ log?.total_working_hours || 0 }}
                </div>
                <div class="text-gray-600">{{ log?.total_shift_hour || 0 }}</div>
              </td>
              <td class="border px-2 py-0.5">{{ log?.total_overtime_hours }}</td>
              <td class="border px-2 py-0.5">{{ log?.total_cl_leave }}</td>
              <td class="border px-2 py-0.5">{{ log?.total_ml_leave }}</td>
              <td class="border px-2 py-0.5">{{ log?.total_sl_leave }}</td>
              <td class="border px-2 py-0.5">{{ log?.total_wpl_leave }}</td>
              <td class="border px-2 py-0.5">{{ log?.total_first_short_leave }}</td>
              <td class="border px-2 py-0.5">{{ log?.total_last_short_leave }}</td>
              <td class="border px-2 py-0.5">{{ log.total_present_in_weekend }}</td>
              <!-- <td class="border px-2 py-0.5"></td> -->
            </tr>
          </tbody>
        </table>
      </div>
      <div v-else class="text-center text-red-500 text-xl italic mt-10">Please select company</div>
    </div>
  </div>
</template>
