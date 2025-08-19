<script setup>
import EmployeeFilter from '@/components/common/EmployeeFilter.vue'
import LoaderView from '@/components/common/LoaderView.vue'
import { useAuthStore } from '@/stores/auth'
import { useLeaveApplicationStore } from '@/stores/leave-application'
import { useUserStore } from '@/stores/user'
import { storeToRefs } from 'pinia'
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const router = useRouter()
const route = useRoute()
const leaveApplicationStore = useLeaveApplicationStore()
const userStore = useUserStore()
const authStore = useAuthStore()

const { leaveApplications, loading } = storeToRefs(leaveApplicationStore)

const selectedUser = ref(null)

// Weekly range: 'prev' | 'after'  (default 'prev' if not given)
const range = ref(route.query.type === 'after' ? 'after' : 'prev')

// Anchor date for the 1-week window (can be YYYY-MM or YYYY-MM-DD)
const selectedDate = ref(route.query.date || leaveApplicationStore.selectedMonth || new Date().toISOString().slice(0,7))

// Search (if you still use it for other modes)
const search = ref('') // we will set from range during fetch

// Employee/company filters
const filters = ref({
  company_id: route.query.company_id || '',
  department_id: route.query.department_id || '',
  type: route.query.category || 'all',   // <-- employee category comes from 'category' in URL
  employee_id: route.query.employee_id || '',
  category: '', // not used; kept to match prop signature
})

function toAnchorDate(val) {
  // Accept both YYYY-MM and YYYY-MM-DD; if only month provided, use mid-month for stable weekly window
  if (/^\d{4}-\d{2}$/.test(val || '')) return `${val}-15`
  return val || new Date().toISOString().slice(0,10)
}

const fetchApplicationsByUser = async () => {
  // Map weekly range to backend-friendly query
  const weeklyQuery = range.value === 'after' ? 'next_week' : 'prev_week'
  const anchor = toAnchorDate(selectedDate.value)

  const payload = {
    company_id: filters.value.company_id,
    department_id: filters.value.department_id,
    selectedDate: selectedDate.value,   // keep for monthly compatibility (not used in weekly)
    selectedStatus: leaveApplicationStore.selectedStatus,
    query: weeklyQuery,                 // <-- key: prev_week / next_week
    anchor_date: anchor,                // <-- backend will use this as the anchor
  }

  if (filters.value.employee_id) {
    payload.user_id = filters.value.employee_id
  }
  if (filters.value.type && filters.value.type !== 'all') {
    // send employee category if needed by backend
    payload.category = filters.value.type
  }

  loading.value = true
  try {
    await leaveApplicationStore.fetchLeaveApplications(payload)
  } finally {
    loading.value = false
  }
}

// Initial load
onMounted(async () => {
  if (filters.value.employee_id) {
    await userStore.fetchUser(filters.value.employee_id)
    selectedUser.value = userStore.user || null
  }
  await fetchApplicationsByUser()
})

// Build + sync query to URL (clean: drop empty)
function buildQuery() {
  const q = {
    type: range.value,                 // weekly range in URL
    date: selectedDate.value,          // anchor
  }
  if (filters.value.company_id)    q.company_id    = String(filters.value.company_id)
  if (filters.value.department_id) q.department_id = String(filters.value.department_id)
  if (filters.value.employee_id)   q.employee_id   = String(filters.value.employee_id)
  if (filters.value.type && filters.value.type !== 'all') q.category = String(filters.value.type)
  return q
}
let qTimer = null
function syncUrlDebounced() {
  if (qTimer) clearTimeout(qTimer)
  qTimer = setTimeout(() => {
    router.replace({ query: buildQuery() }).catch(() => {})
  }, 120)
}

// React to external URL changes (if user navigates)
watch(() => route.query, (q) => {
  const nextRange = q.type === 'after' ? 'after' : 'prev'
  const nextDate  = q.date || ''
  const nextFilters = {
    company_id: q.company_id || '',
    department_id: q.department_id || '',
    type: q.category || 'all',
    employee_id: q.employee_id || '',
    category: '',
  }

  let changed = false
  if (nextRange !== range.value) { range.value = nextRange; changed = true }
  if (nextDate && nextDate !== selectedDate.value) { selectedDate.value = nextDate; changed = true }

  if (
    nextFilters.company_id !== filters.value.company_id ||
    nextFilters.department_id !== filters.value.department_id ||
    nextFilters.type !== filters.value.type ||
    nextFilters.employee_id !== filters.value.employee_id
  ) {
    filters.value = nextFilters
    changed = true
  }
  if (changed) fetchApplicationsByUser()
})

// Watch core inputs → fetch + sync URL
watch(
  () => [range.value, selectedDate.value, filters.value.company_id, filters.value.department_id, filters.value.employee_id],
  () => {
    syncUrlDebounced()
    fetchApplicationsByUser()
  }
)

watch(
  () => leaveApplicationStore.selectedStatus,
  () => fetchApplicationsByUser()
)

const filteredLeaveApplications = computed(() => leaveApplications.value || [])

const deleteApplication = async (applicationId) => {
  if (confirm('Are you sure to delete this application?')) {
    await leaveApplicationStore.deleteLeaveApplication(applicationId)
    await fetchApplicationsByUser()
  }
}

const goBack = () => router.go(-1)

const handleFilterChange = () => {
  // Only sync URL; the watcher above will fetch
  syncUrlDebounced()
}
</script>

<template>
  <div class="space-y-2 px-4">
    <div class="flex items-center justify-between gap-2">
      <button class="btn-3" @click="goBack">
        <i class="far fa-arrow-left"></i>
        <span class="hidden md:flex">Back</span>
      </button>

      <h1 class="title-md md:title-lg flex-wrap text-center">
        {{ range === 'after' ? 'After 1 Week Leave Applications' : 'Previous 1 Week Leave Applications' }}
      </h1>
      <div></div>
    </div>

    <div class="flex flex-wrap gap-2 items-center">
      <!-- Filters (employee category bound to filters.type; URL key = category) -->
      <EmployeeFilter
        v-model:company_id="filters.company_id"
        v-model:department_id="filters.department_id"
        v-model:employee_id="filters.employee_id"
        v-model:category="filters.type"
        :with-type="true"
        :initial-value="$route.query"
        @filter-change="handleFilterChange"
      />

      <!-- Weekly range selector (optional UI) -->
       <div>
         <select v-model="range" class="input-1">
           <option value="prev">Previous 1 Week</option>
           <option value="after">After 1 Week</option>
         </select>
       </div>

      <!-- Anchor date (can be YYYY-MM or YYYY-MM-DD; we pass YYYY-MM-15 if only month) -->
      <div>
        <input
          id="monthOrDate"
          type="date"
          v-model="selectedDate"
          class="input-1"
        />
      </div>

      <div>
        <select
          v-model="leaveApplicationStore.selectedStatus"
          class="input-1"
        >
          <option value="">All</option>
          <option value="Pending">Pending</option>
          <option value="Approved">Approved</option>
          <option value="Rejected">Rejected</option>
        </select>
      </div>
    </div>

    <div v-if="leaveApplicationStore.loading" class="text-center py-4">
      <LoaderView />
    </div>

    <div v-else class="space-y-4">
      <div class="overflow-x-auto">
        <table class="min-w-full table-auto border-collapse border border-gray-200 bg-white rounded-md text-sm">
          <thead>
            <tr class="bg-gray-200">
              <th class="border border-gray-300 px-2 text-left">#</th>
              <th class="border border-gray-300 px-2 text-left">Employee Name</th>
              <th class="border border-gray-300 px-2 text-left">Last Working Day</th>
              <th class="border border-gray-300 px-2 text-left">Resumption Date</th>
              <th class="border border-gray-300 px-2 text-left">Leave Period</th>
              <th class="border border-gray-300 px-2 text-left">Total Days</th>
              <th class="border border-gray-300 px-2 text-left">Type</th>
              <th class="border border-gray-300 px-2 text-left">Status</th>
              <th class="border border-gray-300 px-2 text-left">Action</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(application, index) in filteredLeaveApplications"
              :key="index"
              class="border-b border-gray-200 hover:bg-blue-200"
            >
              <td class="border border-gray-300 px-2">{{ index + 1 }}</td>
              <td class="border border-gray-300 px-2">
                {{ application?.user?.name || 'Unknown' }}
              </td>
              <td class="border border-gray-300 px-2">{{ application?.last_working_date }}</td>
              <td class="border border-gray-300 px-2">{{ application?.resumption_date }}</td>
              <td class="border border-gray-300 px-2">{{ application?.leave_period }}</td>
              <td class="border border-gray-300 px-2">
                <div v-html="application.duration || application?.total_leave_days"></div>
              </td>
              <td class="border border-gray-300 px-2">
                {{ application?.application_types }}
              </td>
              <td class="border border-gray-300 px-2">
                {{ application?.status || 'N/A' }}
              </td>
              <td class="border border-gray-300 px-2">
                <div class="flex justify-center gap-2">
                  <RouterLink
                    :to="{ name: 'LeaveApplicationShow', params: { id: application?.id } }"
                    class="btn-icon"
                  >
                    <i class="far fa-eye"></i>
                  </RouterLink>
                  <RouterLink
                    v-if="application?.status !== 'Approved'"
                    :to="{ name: 'LeaveApplicationEdit', params: { id: application?.id } }"
                    class="btn-icon"
                  >
                    <i class="far fa-edit text-orange-600"></i>
                  </RouterLink>
                  <button @click="deleteApplication(application?.id)" class="btn-icon text-red-500">
                    <i class="far fa-trash"></i>
                  </button>
                </div>
              </td>
            </tr>

            <tr v-if="!filteredLeaveApplications.length">
              <td colspan="9" class="p-1 text-center text-red-500">No application found</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
