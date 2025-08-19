<script setup>
import EmployeeFilter from '@/components/common/EmployeeFilter.vue'
import LoaderView from '@/components/common/LoaderView.vue'
import { useOvertimeStore } from '@/stores/overtime'
import { storeToRefs } from 'pinia'
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const router = useRouter()
const route = useRoute()
const overtimeStore = useOvertimeStore()
const { reports, loading, selectedMonth } = storeToRefs(overtimeStore)

const month = ref(route.query.date || selectedMonth.value)

const filters = ref({
  company_id: route.query.company_id || '',
  department_id: route.query.department_id || 'all',
  line_type: route.query.line_type || 'all',
  employee_id: route.query.employee_id || '',
})

const handleFilterChange = async () => {
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

  if (filters.value.company_id && month.value) {
    overtimeStore.getCompanyDepartmentOvertimeReport(month.value, filters.value)
  }
}

const handleMonthChange = () => {
  router.replace({ query: { ...route.query, date: month.value } })
  if (filters.value.company_id && month.value) {
    overtimeStore.getCompanyDepartmentOvertimeReport(month.value, filters.value)
  }
}

const goBack = () => router.go(-1)

const exportExcel = () => {
  if (!month.value) return
  overtimeStore.exportCompanyDepartmentOvertimeExcel(month.value, filters.value)
}

const exportPdf = () => {
  if (!month.value) return
  overtimeStore.exportCompanyDepartmentOvertimePdf(month.value, filters.value)
}

onMounted(() => {
  if (filters.value.company_id && month.value) {
    overtimeStore.getCompanyDepartmentOvertimeReport(month.value, filters.value)
  }
})
</script>

<template>
  <div class="space-y-2 px-4">
    <div class="flex items-center justify-between gap-2">
      <button class="btn-3" @click="goBack">
        <i class="far fa-arrow-left"></i>
        <span class="hidden md:flex">Back</span>
      </button>

      <h1 class="title-md md:title-lg flex-wrap text-center">Monthly Overtime Report</h1>
      <div class="flex gap-2">
        <button @click="exportExcel" class="btn-3" title="Download Excel">
          <i class="far fa-file-excel text-2xl text-green-500"></i>
        </button>
        <button @click="exportPdf" class="btn-3" title="Download PDF">
          <i class="far fa-file-pdf text-2xl text-red-500"></i>
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
      <div>
        <button @click="overtimeStore.getCompanyDepartmentOvertimeReport(month, filters)" class="btn-3">
          <i class="far fa-sync"></i>
          <span>Refresh</span>
        </button>
      </div>
    </div>

    <div v-if="loading" class="text-center py-4">
      <LoaderView />
    </div>

    <!-- Table -->
    <div v-else class="space-y-4">
      <div class="overflow-x-auto" v-if="reports.length">
        <table class="table-auto w-full border text-sm bg-white">
          <thead class="bg-gray-100">
            <tr>
              <th class="border p-2 text-left">#</th>
              <th class="border p-2 text-left">Employee</th>
              <th class="border p-2 text-left">Company</th>
              <th class="border p-2 text-left">Department</th>
              <th class="border p-2 text-center">Overtime Entries</th>
              <th class="border p-2 text-center">Total Request Hours</th>
              <th class="border p-2 text-center">Total Approval Hours</th>
              <th class="border p-2 text-center print:hidden">Action</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(report, index) in reports" :key="index" class="hover:bg-blue-50">
              <td class="border p-2">{{ index + 1 }}</td>
              <td class="border p-2">{{ report.user_name || 'N/A' }}</td>
              <td class="border p-2">{{ report.company_name || 'N/A' }}</td>
              <td class="border p-2">{{ report.department_name || 'N/A' }}</td>
              <td class="border p-2 text-center">{{ report.total_overtime_entries }}</td>
              <td class="border p-2 text-center">{{ report.total_request_overtime_hours }}</td>
              <td class="border p-2 text-center">{{ report.total_approval_overtime_hours }}</td>
              <td class="border p-2 text-center print:hidden">
                <div class="flex justify-center items-center gap-4">
                  <RouterLink
                    :to="{
                      name: 'OvertimeList',
                      query: { ...filters, employee_id: report.user_id, date: month },
                    }"
                    class="text-blue-800"
                  >
                    <i class="far fa-eye text-lg"></i>
                  </RouterLink>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-else class="text-center text-red-500 text-xl italic mt-10">
        No data available for this month.
      </div>
    </div>
  </div>
</template>
