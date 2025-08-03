<script setup>
import EmployeeFilter from '@/components/common/EmployeeFilter.vue'
import LoaderView from '@/components/common/LoaderView.vue'

import { useManualAttendanceStore } from '@/stores/manual-attendance'
import { useUserStore } from '@/stores/user'
import { watch } from 'vue'
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const router = useRouter()
const route = useRoute()
const manualAttendanceStore = useManualAttendanceStore()
const userStore = useUserStore()
const selectedUser = ref(null)
const selectedMonth = ref(route.query.date || manualAttendanceStore.selectedMonth)
const forms = ref([])
const loading = ref(false)
const error = ref(null)
const directApprove = ref(true)

const filters = ref({
  company_id: route.query.company_id || '',
  department_id: route.query.department_id || 'all',
  type: route.query.type || 'all',
  employee_id: route.query.employee_id || '',
  category: '',
})

const fetchManualAttendancesByUser = async () => {
  const payload = {
    company_id: filters.value.company_id,
    department_id: filters.value.department_id,
    selectedMonth: selectedMonth.value,
    selectedStatus: manualAttendanceStore.selectedStatus,
  }

  if (filters.value.employee_id) {
    payload.user_id = filters.value.employee_id
    loading.value = true
    await manualAttendanceStore.fetchAdminManualAttendances(payload)
    loading.value = false
  } else {
    manualAttendanceStore.manualAttendances.value = []
  }
}

onMounted(async () => {
  await userStore.fetchUsers()
  selectedUser.value = userStore.users.find((user) => user.id == filters.value.employee_id) || null
  await fetchManualAttendancesByUser()
})

watch(
  () => [
    filters.value.company_id,
    filters.value.department_id,
    filters.value.employee_id,
    selectedMonth.value,
  ],
  async () => {
    await fetchManualAttendancesByUser()
  },
)

watch(selectedMonth, (date) => {
  router.replace({
    query: {
      ...route.query,
      date,
    },
  })
})

const filteredAttendances = computed(() => {
  return manualAttendanceStore.attendances || []
})

watch(
  () => manualAttendanceStore.attendances,
  (newAttendances) => {
    forms.value = []
    newAttendances?.forEach((attendance) => {
      forms.value.push({
        date: attendance?.date,
        type: 'Forget Punch',
        check_in: attendance?.entry_time,
        check_out: attendance?.exit_time,
        description: '',
        is_check: false,
      })
    })
  },
  { immediate: true, deep: true },
)

const toggleSelectAll = () => {
  const allSelected = forms.value.every((form) => form.is_check)
  forms.value.forEach((form) => {
    form.is_check = !allSelected
  })
}

const submitManualAttendance = async () => {
  loading.value = true
  error.value = null

  if (!filters.value.employee_id) {
    error.value = 'Please select an employee.'
    loading.value = false
    return
  }

  try {
    // ✅ শুধুমাত্র selected (is_check === true) ফর্মগুলো নিচ্ছে
    const selectedForms = forms.value.filter((form) => form.is_check && (form.check_in || form.check_out))

    if (selectedForms.length === 0) {
      error.value = 'Please select at least one row.'
      loading.value = false
      return
    }

    const payload = selectedForms.map((form) => ({
      user_id: filters.value.employee_id,
      type: form.type,
      check_in: form.check_in ? `${form.date} ${form.check_in}:00` : null,
      check_out: form.check_out ? `${form.date} ${form.check_out}:00` : null,
      description: form.description || ''
    }))

    const response = await manualAttendanceStore.createBulkManualAttendance({
      records: payload,
      direct_approve: directApprove.value,
    })
    if(response?.data?.length)
    {
      await fetchManualAttendancesByUser()
    }
  } catch (err) {
    error.value = err.message || 'Failed to submit manual attendance requests.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="space-y-2 px-4">
    <div class="flex items-center justify-between gap-2">
      <button class="btn-3" @click="goBack">
        <i class="far fa-arrow-left"></i>
        <span class="hidden md:flex">Back</span>
      </button>

      <h1 class="title-md md:title-lg flex-wrap text-center">Admin Bulk Manual Attendance Applications</h1>
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
          id="monthSelect"
          type="month"
          v-model="selectedMonth"
          @change="fetchManualAttendancesByUser"
          class="input-1"
        />
      </div>
    </div>

    <div v-if="manualAttendanceStore.loading" class="text-center py-4">
      <LoaderView />
    </div>

    <div v-else class="space-y-4">
      <div v-if="filters?.employee_id" class="bg-sky-100/30 p-4 rounded-lg shadow mb-6 space-y-4">
        <div class="grid gap-6">
          <div class="bg-white border rounded-lg p-4 shadow">
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-y-1 text-sm text-gray-600">
              <p><strong>Name:</strong> {{ manualAttendanceStore?.user?.name }}</p>
              <p><strong>Data:</strong> {{ manualAttendanceStore?.user?.designation?.title }}</p>
              <p>
                <strong>Department:</strong> {{ manualAttendanceStore?.user?.department?.name }}
              </p>
              <p><strong>Company:</strong> {{ manualAttendanceStore?.user?.company?.name }}</p>
              <p><strong>Phone:</strong> {{ manualAttendanceStore?.user?.phone }}</p>
              <p><strong>Email:</strong> {{ manualAttendanceStore?.user?.email }}</p>
              <p><strong>Joining Date:</strong> {{ manualAttendanceStore?.user?.joining_date }}</p>
              <p><strong>Blood Group:</strong> {{ manualAttendanceStore?.user?.blood || 'N/A' }}</p>
            </div>
          </div>
        </div>
      </div>

      <div class="overflow-x-auto">
        <div :class="error ? 'py-2': ''">
          <div v-if="error" class="text-red-500 text-sm text-left">{{ error }}</div>
        </div>
        <table
          class="min-w-full table-auto border-collapse border border-gray-200 bg-white rounded-md text-sm"
        >
          <thead>
            <tr class="bg-gray-200">
              <th class="border border-gray-300 px-2 text-left py-2">
                <div class="flex items-center justify-center gap-2">
                  <input
                    id="allCheck"
                    type="checkbox"
                    @change="toggleSelectAll"
                    class="h-5 w-5 accent-blue-600 cursor-pointer"
                  />
                  <label for="allCheck" class="text-sm cursor-pointer">All Check</label>
                </div>
              </th>
              <th class="border border-gray-300 px-2 text-left py-2">Date</th>
              <th class="border border-gray-300 px-2 text-left py-2">Type</th>
              <th class="border border-gray-300 px-2 text-left py-2">Check-In</th>
              <th class="border border-gray-300 px-2 text-left py-2">Check-Out</th>
              <th class="border border-gray-300 px-2 text-left py-2">Description</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(form, index) in forms"
              :key="index"
              :class="[
                'border-b border-gray-200 hover:bg-blue-200 cursor-pointer',
                form.is_check ? 'bg-yellow-100' : '',
              ]"
              @click="form.is_check = !form.is_check"
            >
              <td class="border border-gray-300 px-2 cursor-pointer text-center" >
                <input type="checkbox" v-model="form.is_check" class="h-5 w-5" @click.stop />
              </td>
              <td class="border border-gray-300 px-2">
                <input type="date" v-model="form.date" class="w-full border border-gray-600 py-1 px-2 rounded-sm" @click.stop disabled/>
              </td>
              <td class="border border-gray-300 px-2">
                <select v-model="form.type" class="w-full border border-gray-600 py-1 px-2 rounded-sm" @click.stop>
                  <option value="">Select Type</option>
                  <option value="Home Office">Home Office</option>
                  <option value="Remote Work">Remote Work</option>
                  <option value="Forget Punch">Forget Punch</option>
                </select>
              </td>
              <td class="border border-gray-300 px-2">
                <input type="time" v-model="form.check_in" class="w-full border border-gray-600 py-1 px-2 rounded-sm" @click.stop />
              </td>
              <td class="border border-gray-300 px-2">
                <input type="time" v-model="form.check_out" class="w-full border border-gray-600 py-1 px-2 rounded-sm" @click.stop />
              </td>
              <td class="border border-gray-300 px-2">
                <textarea
                  v-model="form.description"
                  @keyup.stop
                  @click.stop
                  :disabled="!form.check_in && !form.check_out"
                  class="w-full border border-gray-600 py-1 px-2 rounded-sm disabled:bg-gray-300 disabled:cursor-not-allowed"
                  cols="1"
                ></textarea>
              </td>
            </tr>
            <tr v-if="filteredAttendances.length === 0">
              <td colspan="6" class="p-2 text-center text-red-500">Please select any employee</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-if="filters?.employee_id">
        <div class="space-y-6">
          <div v-if="error" class="text-red-500 text-sm text-left">{{ error }}</div>

          <div class="flex items-center justify-center gap-2 cursor-pointer">
            <input
              id="directApprove"
              type="checkbox"
              v-model="directApprove"
              class="accent-blue-600 h-6 w-6 cursor-pointer"
            />
            <label for="directApprove" class="text-lg cursor-pointer">Direct Approve</label>
          </div>

          <div class="flex justify-center">
            <button
              type="button"
              class="btn-2"
              :disabled="loading"
              @click="submitManualAttendance"
            >
              <span v-if="loading">
                <i class="fas fa-spinner fa-spin mr-2"></i>Submitting...
              </span>
              <span v-else>Submit All</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
