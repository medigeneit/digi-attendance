<script setup>
import AttendanceTable from '@/components/AttendanceTable.vue'
import EmployeeFilter from '@/components/common/EmployeeFilter.vue'
import FlexibleDatePicker from '@/components/FlexibleDatePicker.vue'
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
const now = new Date()

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
const selectedMonth = ref(
  toMonth(q.date) || toMonth(attendanceStore.selectedMonth) || toMonth(now),
)

const parsePeriod = (val, fallback) => {
  const month = toMonth(val) || toMonth(fallback)
  if (!month) {
    return { year: now.getFullYear(), month: now.getMonth() + 1 }
  }
  const [year, monthPart] = month.split('-')
  return {
    year: Number(year) || now.getFullYear(),
    month: Number(monthPart) || now.getMonth() + 1,
  }
}

const period = ref({
  ...parsePeriod(selectedMonth.value, now),
  day: 1,
})

const periodMonth = computed(() => {
  if (!period.value?.year || !period.value?.month) return ''
  const m = String(period.value.month).padStart(2, '0')
  return `${period.value.year}-${m}`
})

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
  periodMonth,
  (month) => {
    if (!month) return
    selectedMonth.value = month
    syncQuery({ date: month })
    if (filters.value.employee_id) {
      fetchAttendance()
    }
  },
)

// Keep URL in sync when any filter changes (but do not fetch here)
watch(
  () => ({ ...filters.value }), // shallow spread avoids deep reactivity pitfalls
  () => {
    syncQuery()
  },
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
  },
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

const fmtHours = (v) => {
  const n = Number(v ?? 0);
  if (!Number.isFinite(n) || n <= 0) return '0h';
  const totalMins = Math.round(n * 60);      // assume value is in HOURS (decimal)
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
};
</script>

<template>
  <div class="px-4 space-y-4">
    <div class="flex items-center justify-between gap-2">
      <button class="btn-3" @click="goBack">
        <i class="far fa-arrow-left"></i>
        <span class="hidden md:flex">Back</span>
      </button>
      <h1 class="title-md md:title-lg flex-wrap text-center">Monthly Job Card</h1>
      <div></div>
    </div>

    <EmployeeFilter
      v-model:company_id="filters.company_id"
      v-model:department_id="filters.department_id"
      v-model:employee_id="filters.employee_id"
      v-model:line_type="filters.line_type"
      :with-type="true"
      :initial-value="$route.query"
      @filter-change="handleFilterChange"
      class="w-full"
    >
      <FlexibleDatePicker
        v-model="period"
        :show-year="false"
        :show-month="true"
        :show-date="false"
      />
    </EmployeeFilter>
    <div class="sticky top-14 z-40 text-gray-700 bg-gradient-to-tl">
      <div class="grid md:grid-cols-2 gap-4 text-sm mt-2">
        <SelectedEmployeeCard v-if="hasSelection" :user="selectedUser" />
        
        <div class="card-bg p-4 gap-1" v-if="hasSelection">
            <!-- Header: tighter -->
            <div class="flex justify-between items-center">
              <h2 class="text-sm md:text-base font-semibold text-zinc-900">Attendance Summary</h2>
              <router-link
                :to="{ name: 'MonthWiseApplicationLog', query: { ...$route.query } }"
                class="inline-flex items-center gap-1 rounded-md border border-zinc-200 bg-white px-2.5 py-1 text-[12px] font-medium text-zinc-700 hover:bg-zinc-50 active:scale-[.99]"
                target="_blank"
                rel="noopener noreferrer"
              >
                <i class="far fa-clock text-[12px]"></i>
                <span class="hidden sm:inline">Application History</span>
                <span class="sm:hidden">History</span>
              </router-link>
            </div>

            <!-- Slim gradient divider, <hr> বাদ -->
            <div class="h-px w-full bg-gradient-to-r from-indigo-500/70 via-sky-400/70 to-cyan-400/70"></div>

            <!-- KPI chips: compact, mobile-scrollable -->
            <div class="px-1 pt-1 pb-0.5 overflow-hidden">
              <div class="-mx-1 flex items-center gap-2 overflow-x-auto px-1">
                <span
                  v-if="presentRate !== null"
                  class="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700 whitespace-nowrap"
                >
                  <i class="far fa-check-circle text-[11px]"></i>
                 Present  <strong>{{ attendanceStore?.summary?.total_present_days || 0 }}d</strong>
                </span>
                <span  class="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[11px] font-medium text-amber-700 whitespace-nowrap"
                >
                  <i class="far fa-clock text-[11px]"></i>
                  Late <strong>{{ attendanceStore?.summary?.actual_late_day }}d</strong>
                </span>
                <span
                  class="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2.5 py-0.5 text-[11px] font-medium text-red-700 whitespace-nowrap"
                >
                  <i class="far fa-user-times text-[11px]"></i>
                  Absent <strong>{{ attendanceStore?.summary?.total_absent_days || 0 }}d</strong>
                </span>
                <span
                  class="inline-flex items-center gap-1 rounded-full border border-sky-200 bg-sky-50 px-2.5 py-0.5 text-[11px] font-medium text-sky-700 whitespace-nowrap"
                >
                  <i class="far fa-bolt text-[11px]"></i>
                  Total Weekends <strong>{{attendanceStore?.summary?.total_weekend_days}}d</strong>
                </span>
              </div>
            </div>

            <!-- Compact stats grid -->
            <div class="grid md:grid-cols-3 gap-2 mt-1">
              <div class="flex items-center justify-between rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-2">
                <span class="flex items-center gap-2 text-[12px] text-zinc-600">
                  <i class="far fa-briefcase text-[12px]"></i> Total Working Days
                </span>
                <strong class="text-sm text-zinc-900">{{ attendanceStore?.summary?.total_working_days || 0 }}</strong>
              </div>
              <div class="flex items-center justify-between rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-2">
                <span class="flex items-center gap-2 text-[12px] text-zinc-600">
                  <i class="far fa-hourglass-half text-[12px]"></i> Working Hours
                </span>
                <strong class="text-sm text-zinc-900">
                  {{ (attendanceStore?.summary?.total_working_hours ?? '').toString().trim() || '—' }}
                </strong>
              </div>

              <div class="flex items-center justify-between rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-2">
                <span class="flex items-center gap-2 text-[12px] text-zinc-600">
                  <i class="far fa-bolt text-[12px]"></i> Overtime Hours
                </span>
                <strong v-if="!attendanceStore?.loading" class="text-sm text-zinc-900">
                  {{ fmtHours(attendanceStore?.summary?.approved_overtimes) }}
                  of
                  {{ attendanceStore?.summary?.total_overtime_hours }}
                </strong>
                <span v-else class="inline-block h-4 w-28 rounded bg-zinc-200 animate-pulse" />
              </div>
            </div>
          </div>
      </div>
    </div>

    <div v-if="!selectedUser">
      <p class="text-gray-400 text-center text-2xl italic">Select an employee, please.</p>
    </div>

    <LoaderView v-if="attendanceStore.isLoading" />

    <div v-else class="space-y-4" v-show="hasSelection">
      <AttendanceTable :logs="attendanceStore.monthlyLogs" />
    </div>
  </div>
</template>
