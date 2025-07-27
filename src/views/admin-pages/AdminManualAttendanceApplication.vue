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
const todayDate = new Date().toISOString().split('T')[0]
const forms = ref([])
onMounted(async () => {
  await userStore.fetchUsers() // Load user list
})

const loading = ref(false)
const error = ref(null)

const submitManualAttendance = async () => {
  loading.value = true
  error.value = null

  if (!filters.value.employee_id) {
    error.value = 'Please select an employee.'
    loading.value = false
    return
  }

  try {
    const payload = forms.value.map((form) => ({
      user_id: filters.value.employee_id,
      ...form,
      check_in: form.check_in ? `${form.date} ${form.check_in}:00` : null,
      check_out: form.check_out ? `${form.date} ${form.check_out}:00` : null,
    }))

    await manualAttendanceStore.createBulkManualAttendance(payload)

    router.push({ name: 'ManualAttendanceList' })
  } catch (err) {
    error.value = err.message || 'Failed to submit manual attendance requests.'
  } finally {
    loading.value = false
  }
}

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
  }
  else{
    manualAttendanceStore.manualAttendances.value = []
  }

}

// Initial data load
onMounted(async () => {
  await userStore.fetchUsers()
  selectedUser.value = userStore.users.find(user => user.id == filters.value.employee_id) || null
  await fetchManualAttendancesByUser()
})

// Watch filters and month
watch(
  () => [
    filters.value.company_id,
    filters.value.department_id,
    filters.value.employee_id,
    selectedMonth.value,
  ],
  async () => {
    await fetchManualAttendancesByUser()
  }
)

// Watch month to sync with URL
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

// Populate `forms` when attendances change
watch(
  () => manualAttendanceStore.attendances,
  (newAttendances) => {
    forms.value = [] // reset before pushing
    newAttendances?.forEach(attendance => {
      forms.value.push({
        date: attendance?.date,
        type: 'Forget Punch',
        check_in: attendance?.entry_time,
        check_out: attendance?.exit_time,
        description: '',
      })
    })
  },
  { immediate: true, deep: true }
)
  
const deleteApplication = async (applicationId) => {
  if (confirm('Are you sure to delete this application?')) {
    await manualAttendanceStore.deleteManualAttendance(applicationId)
    await fetchManualAttendancesByUser()
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
        <!-- Section Title -->

        <!-- Grid for Info and Leave -->
        <div class="grid gap-6">
          <!-- User Info Card -->
          <div class="bg-white border rounded-lg p-4 shadow">
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-y-1 text-sm text-gray-600">
              <p><strong>Name:</strong> {{ manualAttendanceStore?.user?.name }}</p>
              <p><strong>Data:</strong> {{ manualAttendanceStore?.user?.designation?.title }}</p>
              <p><strong>Department:</strong> {{ manualAttendanceStore?.user?.department?.name }}</p>
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
        <table
          class="min-w-full table-auto border-collapse border border-gray-200 bg-white rounded-md text-sm"
        >
          <thead>
            <tr class="bg-gray-200">
              <th class="border border-gray-300 px-2 text-left">#</th>
              <th class="border border-gray-300 px-2 text-left">Date</th>
              <th class="border border-gray-300 px-2 text-left">Type</th>
              <th class="border border-gray-300 px-2 text-left">Check-In</th>
              <th class="border border-gray-300 px-2 text-left">Check-Out</th>
              <th class="border border-gray-300 px-2 text-left">Status</th>
              <th class="border border-gray-300 px-2 text-left">Action</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(form, index) in forms"
              :key="index"
              class="border-b border-gray-200 hover:bg-blue-200"
            >
              <td class="border border-gray-300 px-2">{{ index + 1 }}</td>
              <td class="border border-gray-300 px-2">
                <input type="date" v-model="form.date" class="w-full" required />
              </td>
              <td class="border border-gray-300 px-2">
                 <select v-model="form.type" class="w-full" required>
                  <option value="">Select Type</option>
                  <option value="Home Office">Home Office</option>
                  <option value="Remote Work">Remote Work</option>
                  <option value="Forget Punch">Forget Punch</option>
                </select>
              </td>
              <td class="border border-gray-300 px-2">
                <input type="time" v-model="form.check_in" class="w-full" />
              </td>
              <td class="border border-gray-300 px-2">
                <input type="time" v-model="form.check_out" class="w-full" />
              </td>
              <td class="border border-gray-300 px-2">
                <textarea v-model="form.description" class="w-full" cols="1" required></textarea>
              </td>
              <td class="border border-gray-300 px-2">
                <div class="flex gap-2">
                  <!-- <RouterLink
                    :to="{ name: 'ManualAttendanceShow', params: { id: attendance?.id } }"
                    class="btn-icon"
                  >
                    <i class="far fa-eye"></i>
                  </RouterLink> -->

                  <button @click="deleteApplication(attendance?.id)" class="btn-icon text-red-500">
                    <i class="far fa-trash"></i>
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="filteredAttendances.length === 0">
              <td colspan="7" class="p-2 text-center text-red-500">No manual attendances found</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div>
        <!-- <div class="space-y-6">
          <div v-if="error" class="text-red-500 text-sm text-center">{{ error }}</div>
          <div class="flex justify-center">
            <button type="submit" class="btn-2">Submit All</button>
          </div>
        </div> -->
      </div>
    </div>
  </div>

  <!-- ✅ MODAL -->
</template>
