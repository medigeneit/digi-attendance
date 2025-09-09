<script setup>
import EmployeeFilter from '@/components/common/EmployeeFilter.vue'
import LoaderView from '@/components/common/LoaderView.vue'
import { useLeaveApplicationStore } from '@/stores/leave-application'
import { useUserStore } from '@/stores/user'
import { storeToRefs } from 'pinia'
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const router = useRouter()
const route = useRoute()
const leaveApplicationStore = useLeaveApplicationStore()
const userStore = useUserStore()
const { leaveApplications, loading } = storeToRefs(leaveApplicationStore)

const selectedUser = ref(null)

// ⚠️ এক জায়গায় কনস্ট্যান্ট: query key
const RANGE_PARAM = 'applicationType' // <-- URL query key হবে `applicationType`

// Weekly range: 'prev' | 'after'  (default 'prev' if not given)
const range = ref(route.query[RANGE_PARAM] === 'after' ? 'after' : 'prev')

// anchor date: YYYY-MM or YYYY-MM-DD
const selectedDate = ref(
  route.query.date || leaveApplicationStore.selectedMonth || new Date().toISOString().slice(0,7)
)

const filters = ref({
  company_id: route.query.company_id || '',
  department_id: route.query.department_id || '',
  line_type: route.query.line_type || 'all',
  employee_id: route.query.employee_id || '',
})

function toAnchorDate(val) {
  if (/^\d{4}-\d{2}$/.test(val || '')) return `${val}-15`
  return val || new Date().toISOString().slice(0,10)
}

const fetchApplicationsByUser = async () => {
  const weeklyQuery = range.value === 'after' ? 'next_week' : 'prev_week'
  const anchor = toAnchorDate(selectedDate.value)

  const payload = {
    company_id: filters.value.company_id,
    department_id: filters.value.department_id,
    selectedDate: selectedDate.value,
    selectedStatus: leaveApplicationStore.selectedStatus,
    query: weeklyQuery,
    anchor_date: anchor,
  }

  if (filters.value.employee_id) payload.user_id = filters.value.employee_id
  if (filters.value.line_type && filters.value.line_type !== 'all') {
    payload.line_type = filters.value.line_type
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
    // ⚠️ এখানে `applicationType` key লেখা হচ্ছে
    [RANGE_PARAM]: range.value,
    date: selectedDate.value,
  }
  if (filters.value.company_id)    q.company_id    = String(filters.value.company_id)
  if (filters.value.department_id) q.department_id = String(filters.value.department_id)
  if (filters.value.line_type && filters.value.line_type !== 'all') {
    q.line_type = String(filters.value.line_type)
  }
  if (filters.value.employee_id)   q.employee_id   = String(filters.value.employee_id)
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
watch(
  () => route.query,
  (q) => {
    // ⚠️ এখন থেকে URL থেকে পড়বে `applicationType`
    const nextRange = q[RANGE_PARAM] === 'after' ? 'after' : 'prev'
    const nextDate  = q.date || ''
    const nextFilters = {
      company_id: q.company_id || '',
      department_id: q.department_id || '',
      line_type: q.line_type || 'all',
      employee_id: q.employee_id || '',
    }

    let changed = false
    if (nextRange !== range.value) { range.value = nextRange; changed = true }
    if (nextDate && nextDate !== selectedDate.value) { selectedDate.value = nextDate; changed = true }

    // ⚠️ টাইপো ফিক্স: আগে `nextFilters.type` ছিল; এটি হওয়া উচিত `line_type`
    if (
      nextFilters.company_id !== filters.value.company_id ||
      nextFilters.department_id !== filters.value.department_id ||
      nextFilters.line_type !== filters.value.line_type ||
      nextFilters.employee_id !== filters.value.employee_id
    ) {
      filters.value = nextFilters
      changed = true
    }

    if (changed) fetchApplicationsByUser()
  }
)

// Watch core inputs → fetch + sync URL
watch(
  // ⚠️ line_type-ও এখানে add করা হলো, যেন বদলালে রিফ্রেশ হয়
  () => [
    range.value,
    selectedDate.value,
    filters.value.company_id,
    filters.value.department_id,
    filters.value.employee_id,
    filters.value.line_type,
  ],
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

      <h1 class="title-md md:title-lg flex-wrap text-center capitalize">
        {{ range === 'after' ? 'Upcoming Leave Applications' : 'Leave History of Previous Week' }}
      </h1>
      <div></div>
    </div>

    <div class="flex flex-wrap gap-2 items-center">
      <EmployeeFilter
        v-model:company_id="filters.company_id"
        v-model:department_id="filters.department_id"
        v-model:employee_id="filters.employee_id"
        v-model:line_type="filters.line_type"
        :with-type="true"
        :initial-value="$route.query"
        @filter-change="handleFilterChange"
      />

      <!-- Weekly range selector (optional UI) -->
       <div>
         <select v-model="range" class="input-1">
           <option value="prev">Leave history of previous week</option>
           <option value="after">Upcoming Leave Applications</option>
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
      <div>
        <button @click="fetchApplicationsByUser" class="btn-3">
          <i class="far fa-sync"></i>
          <span>Refresh</span>
        </button>
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
