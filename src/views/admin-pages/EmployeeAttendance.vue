<script setup>
import AttendanceTable from '@/components/AttendanceTable.vue'
import EmployeeFilter from '@/components/common/EmployeeFilter.vue'
import LoaderView from '@/components/common/LoaderView.vue'
import SelectedEmployeeCard from '@/components/user/SelectedEmployeeCard.vue'
import { useAttendanceStore } from '@/stores/attendance'
import { useUserStore } from '@/stores/user'
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const router = useRouter()
const route = useRoute()
const attendanceStore = useAttendanceStore()
const userStore = useUserStore()

/* -----------------------
   Helpers
------------------------*/
const toMonth = (val) => {
  if (!val) return ''
  if (typeof val === 'string') {
    // If already YYYY-MM, return as-is
    if (/^\d{4}-\d{2}$/.test(val)) return val
    // If full date string, slice YYYY-MM
    const m = val.match(/^(\d{4})-(\d{2})/)
    return m ? `${m[1]}-${m[2]}` : ''
  }
  // Date object
  try {
    const d = new Date(val)
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    return `${y}-${m}`
  } catch {
    return ''
  }
}

const q = route.query
const selectedMonth = ref(toMonth(q.date) || toMonth(attendanceStore.selectedMonth) || toMonth(new Date()))

const filters = ref({
  company_id: q.company_id || '',
  department_id: q.department_id || 'all',
  line_type: q.line_type || 'all',
  employee_id: q.employee_id || '',
})

const selectedUser = ref(null)

// Debounce for router.replace
let qTimer = null
const syncQuery = (partial = {}) => {
  if (qTimer) clearTimeout(qTimer)
  qTimer = setTimeout(() => {
    const next = {
      ...route.query,
      company_id: filters.value.company_id || '',
      department_id: filters.value.department_id || 'all',
      line_type: filters.value.line_type || 'all',
      employee_id: filters.value.employee_id || '',
      date: selectedMonth.value || '',
      ...partial,
    }

    // Remove empty keys for a cleaner URL
    Object.keys(next).forEach((k) => {
      if (next[k] === '' || next[k] === undefined || next[k] === null) delete next[k]
    })

    router.replace({ query: next }).catch(() => {})
  }, 150)
}

/* -----------------------
   Data Fetchers
------------------------*/
const fetchUser = async (employeeId) => {
  if (!employeeId) {
    selectedUser.value = null
    return
  }
  try {
    await userStore.fetchUser(employeeId)
    selectedUser.value = userStore.user || null
  } catch (e) {
    console.error('fetchUser error:', e)
    selectedUser.value = null
  }
}

// Prevent duplicate attendance fetches
const lastFetchKey = ref('')
const fetchAttendance = async () => {
  const emp = filters.value.employee_id
  const month = selectedMonth.value
  if (!emp || !month) return

  const key = `${emp}|${month}`
  if (key === lastFetchKey.value) return
  lastFetchKey.value = key

  try {
    await attendanceStore.getMonthlyAttendanceByShift(emp, month)
  } catch (e) {
    console.error('fetchAttendance error:', e)
    // allow retry on next attempt
    lastFetchKey.value = ''
  }
}

/* -----------------------
   Watchers
------------------------*/
// Keep URL in sync when month changes
watch(
  () => selectedMonth.value,
  (date) => {
    selectedMonth.value = toMonth(date)
    syncQuery({ date: selectedMonth.value })
    // We do NOT fetch here immediately; the employee watcher controls fetching to avoid double-calls
  }
)

// Keep URL in sync when any filter changes (but do not fetch here)
watch(
  () => ({ ...filters.value }), // shallow spread avoids deep reactivity pitfalls
  () => {
    syncQuery()
  }
)

// Fetch user + attendance when employee changes
watch(
  () => filters.value.employee_id,
  async (newVal, oldVal) => {
    if (newVal && newVal !== oldVal) {
      await fetchUser(newVal)
      await fetchAttendance()
    }
    if (!newVal) {
      selectedUser.value = null
      // reset lastFetchKey so future selections can trigger
      lastFetchKey.value = ''
    }
  }
)

/* -----------------------
   Lifecycle
------------------------*/
onMounted(async () => {
  // If URL had initial query with employee/month, fetch once.
  if (filters.value.employee_id) {
    await fetchUser(filters.value.employee_id)
  }
  if (filters.value.employee_id && selectedMonth.value) {
    await fetchAttendance()
  }
  // Ensure URL is normalized on mount
  await nextTick()
  syncQuery()
})

/* -----------------------
   Handlers
------------------------*/
const goBack = () => router.go(-1)

// From <EmployeeFilter /> to push changes to URL (no extra fetches here)
const handleFilterChange = () => {
  syncQuery()
}

const hasSelection = computed(() => !!filters.value.employee_id)
</script>

<template>
  <div class="px-4 space-y-4">
    <div class="flex items-center justify-between gap-2">
      <button class="btn-3" @click="goBack">
        <i class="far fa-arrow-left"></i>
        <span class="hidden md:flex">Back</span>
      </button>
      <h1 class="title-md md:title-lg flex-wrap text-center">User Monthly Attendance</h1>
      <div></div>
    </div>

    <div class="rounded-xl border border-zinc-200 bg-white shadow-sm p-3">
      <div class="flex items-center justify-between border-b border-zinc-100 px-4 py-3">
        <p class="text-sm text-zinc-600">
          <i class="fas fa-filter mr-2"></i> Filters
        </p>
        <div class="h-1 w-32 bg-gradient-to-r from-indigo-500 via-sky-500 to-cyan-400 rounded-full"></div>
      </div>
      <div class="w-full flex flex-wrap gap-4 items-center md:w-auto">
          <EmployeeFilter
           v-model:company_id="filters.company_id"
            v-model:department_id="filters.department_id"
            v-model:employee_id="filters.employee_id"
            v-model:line_type="filters.line_type"
            :with-type="true"
            :initial-value="$route.query"
           @filter-change="handleFilterChange"
           class="w-full"
        />
        <div>
          <input
            id="monthSelect"
            type="month"
            v-model="selectedMonth"
            class="input-1"
            aria-label="Select month"
          />
        </div>
      </div>
    </div>


    <div v-if="selectedUser" class="grid md:grid-cols-2 gap-4 text-sm">
      <SelectedEmployeeCard v-if="hasSelection" :user="selectedUser" />
      <!-- <div class="card-bg p-4 gap-1">
        <h2 class="title-md">Selected Employee Info</h2>
        <hr />
        <div class="grid md:grid-cols-2">
          <p><strong>Name:</strong> {{ selectedUser.name }}</p>
          <p><strong>Designation:</strong> {{ selectedUser.designation?.title || 'N/A' }}</p>
          <p><strong>Department:</strong> {{ selectedUser.department?.name || 'N/A' }}</p>
          <p><strong>Company:</strong> {{ selectedUser.company?.name || 'N/A' }}</p>
          <p><strong>Phone:</strong> {{ selectedUser.phone }}</p>
          <p><strong>Email:</strong> {{ selectedUser.email || 'N/A' }}</p>
          <p><strong>Employee ID:</strong> {{ selectedUser.employee_id || 'N/A' }}</p>
          <p><strong>Joining Date:</strong> {{ selectedUser.joining_date || 'N/A' }}</p>
          <p><strong>Blood Group:</strong> {{ selectedUser.blood || 'N/A' }}</p>
        </div>
      </div> -->

      <div class="card-bg p-4 gap-1">
        <div class="flex justify-between items-center">
          <h2 class="title-md">Attendance Summary</h2>
          <router-link
            :to="{ name: 'MonthWiseApplicationLog', query: { ...$route.query } }"
            class="btn-2"
            target="_blank"
            rel="noopener noreferrer"
          >
            Application History
          </router-link>
        </div>
        <hr />
        <div class="grid md:grid-cols-2">
          <p><strong>Total Working Days:</strong> {{ attendanceStore?.summary?.total_working_days }}</p>
          <p><strong>Present Days:</strong> {{ attendanceStore?.summary?.total_present_days }}</p>
          <p><strong>Absent Days:</strong> {{ attendanceStore?.summary?.total_absent_days }}</p>
          <p><strong>Late Days:</strong> {{ attendanceStore?.summary?.actual_late_day }}</p>
          <p><strong>Total Weekends:</strong> {{ attendanceStore?.summary?.total_weekend_days }}</p>
          <p><strong>Total Working Hours:</strong> {{ attendanceStore?.summary?.total_working_hours }}</p>
          <p><strong>Total Overtime Hours:</strong> {{ attendanceStore?.summary?.total_overtime_hours }}</p>
        </div>
      </div>
    </div>

    <div v-else>
      <p class="text-gray-400 text-center text-2xl italic">
        Select an employee, please.
      </p>
    </div>

    <LoaderView v-if="attendanceStore.isLoading" />

    <div v-else class="space-y-4" v-show="hasSelection">
      <AttendanceTable :logs="attendanceStore.monthlyLogs" />
    </div>
  </div>
</template>
