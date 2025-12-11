<script setup>
import EmployeeFilter from '@/components/common/EmployeeFilter.vue'
import FlexibleDatePicker from '@/components/FlexibleDatePicker.vue'
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

const { monthlyLateLogs, isLoading, selectedMonth: storeSelectedMonth } = storeToRefs(lateAttendanceStore)

const pad = (value) => String(value ?? '').padStart(2, '0')

const parsePeriod = (value) => {
  const current = new Date()
  if (!value) {
    return { year: current.getFullYear(), month: current.getMonth() + 1 }
  }
  const [year = '', month = ''] = value.split('-')
  if (!year || !month) {
    return { year: current.getFullYear(), month: current.getMonth() + 1 }
  }
  return {
    year: Number(year) || current.getFullYear(),
    month: Number(month) || current.getMonth() + 1,
  }
}

const selectedDate = ref(route.query.date || storeSelectedMonth.value || '')

const period = ref(parsePeriod(selectedDate.value))

const applySelectedDate = () => {
  if (!selectedDate.value) return
  router.replace({
    query: {
      ...route.query,
      date: selectedDate.value,
    },
  })

  if (filters.value?.company_id && filters.value?.department_id && filters.value?.line_type && filters.value?.employee_id) {
    fetchApplicationsByUser(filters.value)
  }
}

watch(
  period,
  (value) => {
    if (!value) return
    const formatted = `${value.year}-${pad(value.month)}`
    if (selectedDate.value !== formatted) {
      selectedDate.value = formatted
    }
  },
  { deep: true }
)

watch(
  selectedDate,
  () => {
    applySelectedDate()
    lateAttendanceStore.selectedMonth = selectedDate.value
  },
  { immediate: true }
)


const fetchApplicationsByUser = async (params) => {
  if (params.company_id && params?.department_id && params?.line_type && params?.line_type && params?.employee_id && selectedDate.value) {
     await lateAttendanceStore.getAttendanceLateReport(
      params?.company_id, 
       params?.department_id , 
       params?.line_type, 
       params?.employee_id,
       selectedDate.value,
       'monthly',
     )
  }
}

const getExportExcel = async () => {
  if (filters.value.company_id && filters.value.employee_id && selectedDate.value) {
    await lateAttendanceStore.lateReportDownloadExcel(
      filters.value.company_id,
      filters.value.employee_id,
      selectedDate.value,
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
      date: selectedDate.value,
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
  <div class="space-y-4 px-4">
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
    
    <div class="flex flex-wrap gap-2 bg-white p-2 rounded-md shadow-md items-center">
       <EmployeeFilter
          v-model:company_id="filters.company_id"
          v-model:department_id="filters.department_id"
          v-model:employee_id="filters.employee_id"
          v-model:line_type="filters.line_type"
          :with-type="true"
          :initial-value="$route.query"
         @filter-change="handleFilterChange"
      >
        <div>
          <label class="top-label">Month</label>
          <FlexibleDatePicker
            v-model="period"
            :show-year="true"
            :show-month="true"
            :show-date="false"
          />

        </div>
      </EmployeeFilter>
    </div>

    <div v-if="isLoading" class="text-center py-4">
      <LoaderView />
    </div>

    <div v-else class="space-y-4">
      <div v-if="filters.company_id && filters.employee_id && filters.department_id" class="rounded-2xl border border-slate-200 bg-white shadow overflow-hidden">
        <div class="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
          <span>Monthly late attendance</span>
          <span class="text-xs text-slate-500">Updated after each filter change</span>
        </div>
        <div class="overflow-x-auto">
          <table class="min-w-full text-sm text-slate-600">
            <thead class="text-[11px] uppercase tracking-wide text-slate-500">
              <tr class="bg-slate-100">
                <th class="py-3 px-4 text-left">#</th>
                <th class="py-3 px-4 text-left">Date</th>
                <th class="py-3 px-4 text-left">Employee</th>
                <th class="py-3 px-4 text-left">Company</th>
                <th class="py-3 px-4 text-left">Department</th>
                <th class="py-3 px-4 text-left">Entry</th>
                <th class="py-3 px-4 text-left">Late</th>
                <th class="py-3 px-4 text-left">Application</th>
                <th class="py-3 px-4 text-left">Shift</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 bg-white">
              <tr
                v-for="(report, index) in monthlyLateLogs"
                :key="report.id || index"
                class="hover:bg-slate-50 transition-colors"
              >
                <td class="px-4 py-3 font-semibold text-slate-700">{{ index + 1 }}</td>
                <td class="px-4 py-3">{{ report?.date }}</td>
                <td class="px-4 py-3 text-slate-800 font-medium">{{ report?.user_name || 'Unknown' }}</td>
                <td class="px-4 py-3">{{ report?.company_name || 'Unknown' }}</td>
                <td class="px-4 py-3">{{ report?.department_name || 'Unknown' }}</td>
                <td class="px-4 py-3 text-emerald-600 font-semibold">{{ report.entry_time }}</td>
                <td class="px-4 py-3 text-amber-600 font-semibold">{{ report.late_duration || '-' }}</td>
                <td class="px-4 py-3">
                  <div v-if="report?.short_leave">
                    <span class="rounded-full px-3 py-1 text-xs font-semibold" :class="{
                      'bg-green-100 text-emerald-700': report.short_leave.status === 'Approved',
                      'bg-amber-100 text-amber-700': report.short_leave.status === 'Pending',
                      'bg-rose-100 text-rose-700': report.short_leave.status && report.short_leave.status !== 'Approved'
                    }">
                      {{ report.short_leave.status || 'Waiting' }}
                    </span>
                  </div>
                  <div v-else class="text-xs text-slate-400 italic">No Application</div>
                </td>
                <td class="px-4 py-3">
                  <span class="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-1 text-xs font-semibold text-indigo-700">
                    <i class="far fa-shift fa-xs"></i>
                    {{ report.shift_name || '-' }}
                  </span>
                </td>
              </tr>
              <tr v-if="!monthlyLateLogs || !monthlyLateLogs.length">
                <td colspan="9" class="px-4 py-8 text-center text-slate-500">
                  No late entries yet for the selected filters.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <div v-else class="text-center text-red-500 text-xl italic mt-10">
        Please select company, department and employee
      </div>
    </div>
  </div>
</template>
