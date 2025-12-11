<script setup>
import EmployeeFilter from '@/components/common/EmployeeFilter.vue'
import LoaderView from '@/components/common/LoaderView.vue'
import DisplayFormattedWorkingHours from '@/components/overtime/DisplayFormattedWorkingHours.vue'
import SelectedEmployeeCard from '@/components/user/SelectedEmployeeCard.vue'
import FlexibleDatePicker from '@/components/FlexibleDatePicker.vue'

import { useLeaveApplicationStore } from '@/stores/leave-application'
import { useUserStore } from '@/stores/user'
import { ref, watch, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()
const leaveApplicationStore = useLeaveApplicationStore()

const selectedUser = ref(null)
const initialMonth = route.query.date || leaveApplicationStore.selectedMonth || new Date().toISOString().slice(0,7)
const selectedMonth = ref(initialMonth)

const now = new Date()
const pad = (value) => value.toString().padStart(2, '0')
const parseDate = (val) => {
  if (!val) return { year: now.getFullYear(), month: now.getMonth() + 1 }
  const [year=now.getFullYear(), month=String(now.getMonth()+1)] = val.split('-')
  return { year: Number(year), month: Number(month) }
}
const period = ref({
  year: parseDate(initialMonth).year,
  month: parseDate(initialMonth).month,
  day: 1,
})
const periodMonth = computed(() => {
  if (!period.value?.year || !period.value?.month) return ''
  return `${period.value.year}-${pad(period.value.month)}`
})

const filters = ref({
  company_id: route.query.company_id || '',
  department_id: route.query.department_id || 'all',
  line_type: route.query.line_type || 'all',
  employee_id: route.query.employee_id || '',
  category: '',
})

// labels + order for group tabs
const GROUP_LABELS = {
  overtime: 'Overtime',
  leave_application: 'Leave Applications',
  short_leave: 'Short Leave',
  exchange_offday: 'Exchange Offday',
  exchange_shift: 'Exchange Shift',
  manual_attendance: 'Manual Attendance',
}
const GROUP_ORDER = ['overtime','leave_application','short_leave','exchange_offday','exchange_shift','manual_attendance']

const availableGroups = computed(() => {
  const log = leaveApplicationStore.applicationLog || {}
  return GROUP_ORDER
    .filter(k => Array.isArray(log[k]) && log[k].length)
    .map(k => ({ key: k, label: GROUP_LABELS[k] || k, count: log[k].length }))
})

const activeGroup = ref(route.query.group || (availableGroups.value[0]?.key || null))
watch(availableGroups, (list) => {
  if (!list.length) { activeGroup.value = null; return }
  if (!list.find(g => g.key === activeGroup.value)) activeGroup.value = list[0].key
})

watch(activeGroup, (g) => {
  router.replace({ query: { ...route.query, group: g || undefined } })
})

const isLoading = computed(() => leaveApplicationStore.loading)

// Fetch selected user info
const fetchUser = async (employeeId) => {
  if (employeeId) {
    await userStore.fetchUser(employeeId)
    selectedUser.value = userStore.user
  } else {
    selectedUser.value = null
  }
}

// Fetch applications
const fetchApplications = async () => {
  if (filters.value.employee_id && selectedMonth.value) {
    await leaveApplicationStore.getMonthlyApplicationLog(filters.value.employee_id, selectedMonth.value)
  }
}

// Initial fetch
onMounted(async () => {
  if (filters.value.employee_id) await fetchUser(filters.value.employee_id)
  if (filters.value.employee_id && selectedMonth.value) await fetchApplications()
})

// Watch employee change
watch(() => filters.value.employee_id, async (val) => {
  if (val) {
    await fetchUser(val)
    if (selectedMonth.value) await fetchApplications()
    router.replace({ query: { ...route.query, employee_id: val } })
  } else {
    selectedUser.value = null
  }
}, { immediate: true })

watch(
  periodMonth,
  (newDate) => {
    if (!newDate) return
    selectedMonth.value = newDate
    router.replace({ query: { ...route.query, date: newDate } })
    if (filters.value.employee_id && newDate) fetchApplications()
  },
  { immediate: true }
)

const goBack = () => router.go(-1)

const formatTime = (timestamp) => {
  if (!timestamp) return 'N/A'
  const d = new Date(timestamp)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}
const formatOnlyTime = (timeStr) => {
  if (!timeStr) return 'N/A'
  const d = new Date(`1970-01-01T${timeStr}`)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}
const formatDate = (ts) => {
  if (!ts) return ''
  const d = new Date(ts)
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

const handleFilterChange = () => {
  router.replace({
    query: {
      ...route.query,
      company_id: filters.value.company_id,
      department_id: filters.value.department_id,
      line_type: filters.value.line_type,
      employee_id: filters.value.employee_id,
    },
  })
  // optional immediate refresh
  if (filters.value.employee_id && selectedMonth.value) fetchApplications()
}

const specifications = {
  exchange_shift: 'ExchangeShiftShow',
  exchange_offday: 'ExchangeOffdayShow',
}

// status chip classes
const statusChip = (s) => {
  const key = (s || '').toLowerCase()
  if (key === 'approved' || key === 'success') return 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
  if (key === 'rejected' || key === 'declined') return 'bg-rose-50 text-rose-700 ring-1 ring-rose-200'
  if (key === 'pending') return 'bg-amber-50 text-amber-700 ring-1 ring-amber-200'
  if (key === 'processing' || key === 'reviewing') return 'bg-blue-50 text-blue-700 ring-1 ring-blue-200'
  return 'bg-slate-100 text-slate-700 ring-1 ring-slate-200'
}

const tableBase = 'min-w-full text-sm'
const thBase = 'px-3 py-2 text-left font-semibold text-slate-700 whitespace-nowrap'
const tdBase = 'px-3 py-2 align-top text-slate-700'
</script>

<template>
  <div class="px-4 space-y-4">
    <!-- Page header -->
    <div class="flex flex-wrap items-center justify-between gap-3">
      <button class="inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 hover:bg-slate-50" @click="goBack">
        <i class="far fa-arrow-left"></i><span class="hidden md:inline">Back</span>
      </button>
      <h1 class="text-xl md:text-2xl font-semibold tracking-tight text-slate-800">
        Monthly Application Log
      </h1>
      <div></div>
    </div>

    <!-- Filters -->
    <div class="rounded-xl border bg-white p-3 md:p-4">
      <EmployeeFilter
        v-model:company_id="filters.company_id"
        v-model:department_id="filters.department_id"
        v-model:employee_id="filters.employee_id"
        v-model:line_type="filters.line_type"
        :with-type="true"
        :initial-value="$route.query"
        @filter-change="handleFilterChange"
      >
      <div class="flex items-center gap-2">
       <FlexibleDatePicker
         v-model="period"
         :show-year="false"
         :show-month="true"
         :show-date="false"
       />
       <button
         class="btn-2"
         @click="fetchApplications"
       >
         <i class="far fa-rotate-right"></i><span class="hidden md:inline">Refresh</span>
       </button>
     </div>
      </EmployeeFilter>
    </div>

    <!-- Selected employee -->
    <div v-if="selectedUser" class="flex">
      <SelectedEmployeeCard :user="selectedUser" />
    </div>

    <!-- Loader -->
    <LoaderView v-if="isLoading" />

    <!-- Empty state -->
    <div v-else-if="!availableGroups.length" class="rounded-xl border bg-white p-10 text-center">
      <div class="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50">
        <i class="far fa-clipboard-list text-emerald-600 text-xl"></i>
      </div>
      <h3 class="text-lg font-semibold text-slate-800">No applications found</h3>
      <p class="mt-1 text-sm text-slate-500">Choose an employee and month to view logs.</p>
    </div>

    <!-- Groups: chips -->
    <div v-else class="space-y-4">
      <div class="flex flex-wrap items-center gap-2">
        <button
          v-for="g in availableGroups"
          :key="g.key"
          type="button"
          @click="activeGroup = g.key"
          class="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm"
          :class="activeGroup === g.key ? 'border-emerald-600 text-emerald-700 bg-emerald-50' : 'border-slate-200 text-slate-700 hover:bg-slate-50'"
        >
          <span>{{ g.label }}</span>
          <span class="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-black/5 px-1 text-[12px] font-semibold">{{ g.count }}</span>
        </button>
      </div>

      <!-- Active table card -->
      <div class="rounded-xl border bg-white overflow-hidden">
        <div class="border-b bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-800">
          {{ GROUP_LABELS[activeGroup] || activeGroup }}
        </div>

        <!-- OVERTIME -->
        <div v-if="activeGroup==='overtime'" class="overflow-x-auto">
          <table :class="tableBase">
            <thead class="sticky top-0 bg-white/90 backdrop-blur border-b">
              <tr class="text-xs uppercase text-slate-600">
                <th :class="thBase">#</th>
                <th :class="thBase">Created Date</th>
                <th :class="thBase">Applied Date</th>
                <th :class="thBase">Type</th>
                <th :class="thBase">Shift</th>
                <th :class="thBase">Check-In</th>
                <th :class="thBase">Check-Out</th>
                <th :class="thBase">Working</th>
                <th :class="thBase">Request</th>
                <th :class="thBase">Approved</th>
                <th :class="thBase">Details</th>
                <th :class="thBase">Status</th>
                <th :class="thBase">Action</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(overtime, i) in leaveApplicationStore.applicationLog.overtime"
                :key="`ot-${overtime.id || i}`"
                class="border-b hover:bg-slate-50"
              >
                <td :class="tdBase">{{ i + 1 }}</td>
                <td :class="tdBase">{{ formatDate(overtime.created_date) }}</td>
                <td :class="tdBase">{{ formatDate(overtime.date) }}</td>
                <td :class="tdBase">{{ overtime.duty_type }}</td>
                <td :class="tdBase">{{ overtime.shift }}</td>
                <td :class="tdBase">{{ overtime.check_in || '—' }}</td>
                <td :class="tdBase">{{ overtime.check_out || '—' }}</td>
                <td :class="tdBase"><DisplayFormattedWorkingHours :workingHours="overtime.working_hours" /></td>
                <td :class="tdBase"><DisplayFormattedWorkingHours :workingHours="overtime.request_overtime_hours" /></td>
                <td :class="tdBase"><DisplayFormattedWorkingHours :workingHours="overtime.approval_overtime_hours" /></td>
                <td :class="tdBase">{{ overtime.work_details || '' }}</td>
                <td :class="tdBase">
                  <span class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1"
                        :class="statusChip(overtime.status)">
                    {{ overtime.status || 'Pending' }}
                  </span>
                </td>
                <td :class="tdBase + ' text-right'">
                  <RouterLink
                    :to="{ name:'MyOvertimeShow', params:{ id: overtime.id } }"
                    class="inline-flex items-center gap-1 text-emerald-700 hover:underline"
                  >
                    <i class="far fa-eye"></i> View
                  </RouterLink>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- LEAVE APPLICATION -->
        <div v-else-if="activeGroup==='leave_application'" class="overflow-x-auto">
          <table :class="tableBase">
            <thead class="sticky top-0 bg-white/90 backdrop-blur border-b">
              <tr class="text-xs uppercase text-slate-600">
                <th :class="thBase">#</th>
                <th :class="thBase">Created Date</th>
                <th :class="thBase">Last Working</th>
                <th :class="thBase">Resumption</th>
                <th :class="thBase">Type</th>
                <th :class="thBase" class="!w-1/3">Reason</th>
                <th :class="thBase">Status</th>
                <th :class="thBase">Action</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(item, i) in leaveApplicationStore.applicationLog.leave_application"
                :key="`la-${item.id || i}`"
                class="border-b hover:bg-slate-50"
              >
                <td :class="tdBase">{{ i + 1 }}</td>
                <td :class="tdBase">{{ formatDate(item.create_date) }}</td>
                <td :class="tdBase">{{ item.from }}</td>
                <td :class="tdBase">{{ item.to }}</td>
                <td :class="tdBase" class="whitespace-pre-line">{{ item.application_types }}</td>
                <td :class="tdBase" class="whitespace-pre-line">{{ item.reason }}</td>
                <td :class="tdBase">
                  <span class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1"
                        :class="statusChip(item.status)">
                    {{ item.status }}
                  </span>
                </td>
                <td :class="tdBase + ' text-right'">
                  <RouterLink
                    :to="{ name:'LeaveApplicationShow', params:{ id: item.id } }"
                    class="inline-flex items-center gap-1 text-emerald-700 hover:underline"
                  >
                    <i class="far fa-eye"></i> View
                  </RouterLink>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- SHORT LEAVE -->
        <div v-else-if="activeGroup==='short_leave'" class="overflow-x-auto">
          <table :class="tableBase">
            <thead class="sticky top-0 bg-white/90 backdrop-blur border-b">
              <tr class="text-xs uppercase text-slate-600">
                <th :class="thBase">#</th>
                <th :class="thBase">Created Date</th>
                <th :class="thBase">Type</th>
                <th :class="thBase">Date</th>
                <th :class="thBase">Check-In</th>
                <th :class="thBase">Check-Out</th>
                <th :class="thBase">Duration</th>
                <th :class="thBase">Attachment</th>
                <th :class="thBase">Status</th>
                <th :class="thBase" class="text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(item, i) in leaveApplicationStore.applicationLog.short_leave"
                :key="`sl-${item.id || i}`"
                class="border-b hover:bg-slate-50"
              >
                <td :class="tdBase">{{ i + 1 }}</td>
                <td :class="tdBase">{{ formatDate(item.create_date) }}</td>
                <td :class="tdBase">{{ item.application_types }}</td>
                <td :class="tdBase">{{ item.date }}</td>
                <td :class="tdBase">{{ formatOnlyTime(item.start_time) }}</td>
                <td :class="tdBase">{{ formatOnlyTime(item.end_time) }}</td>
                <td :class="tdBase">{{ item.duration }} m</td>
                <td :class="tdBase + ' text-center'">
                  <a v-if="item.attachment" :href="item.attachment" target="_blank" rel="noopener" class="text-emerald-700 hover:underline">
                    <i class="far fa-eye"></i>
                  </a>
                  <span v-else class="text-slate-400">No file</span>
                </td>
                <td :class="tdBase">
                  <span class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1"
                        :class="statusChip(item.status)">
                    {{ item.status }}
                  </span>
                </td>
                <td :class="tdBase + ' text-right'">
                  <RouterLink
                    :to="{ name:'ShortLeaveShow', params:{ id: item.id } }"
                    class="inline-flex items-center gap-1 text-emerald-700 hover:underline"
                  >
                    <i class="far fa-eye"></i> View
                  </RouterLink>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- EXCHANGE (offday/shift) -->
        <div v-else-if="activeGroup==='exchange_offday' || activeGroup==='exchange_shift'" class="overflow-x-auto">
          <table :class="tableBase">
            <thead class="sticky top-0 bg-white/90 backdrop-blur border-b">
              <tr class="text-xs uppercase text-slate-600">
                <th :class="thBase">#</th>
                <th :class="thBase">Created Date</th>
                <th :class="thBase">Current Date</th>
                <th :class="thBase">Exchange Date</th>
                <th :class="thBase">Shift</th>
                <th :class="thBase">Status</th>
                <th :class="thBase" class="text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(item, i) in leaveApplicationStore.applicationLog[activeGroup]"
                :key="`ex-${item.id || i}`"
                class="border-b hover:bg-slate-50"
              >
                <td :class="tdBase">{{ i + 1 }}</td>
                <td :class="tdBase">{{ formatDate(item.create_date) }}</td>
                <td :class="tdBase">{{ item.current_date }}</td>
                <td :class="tdBase">{{ item.exchange_date }}</td>
                <td :class="tdBase">{{ item?.shift || 'N/A' }}</td>
                <td :class="tdBase">
                  <span class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1"
                        :class="statusChip(item.status)">
                    {{ item.status }}
                  </span>
                </td>
                <td :class="tdBase + ' text-right'">
                  <RouterLink
                    :to="{ name: specifications[item.type], params:{ id: item.id } }"
                    class="inline-flex items-center gap-1 text-emerald-700 hover:underline"
                  >
                    <i class="far fa-eye"></i> View
                  </RouterLink>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- MANUAL ATTENDANCE -->
        <div v-else-if="activeGroup==='manual_attendance'" class="overflow-x-auto">
          <table :class="tableBase">
            <thead class="sticky top-0 bg-white/90 backdrop-blur border-b">
              <tr class="text-xs uppercase text-slate-600">
                <th :class="thBase">#</th>
                <th :class="thBase">Created Date</th>
                <th :class="thBase">Date</th>
                <th :class="thBase">Type</th>
                <th :class="thBase">Check-In</th>
                <th :class="thBase">Check-Out</th>
                <th :class="thBase">Status</th>
                <th :class="thBase" class="text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(item, i) in leaveApplicationStore.applicationLog.manual_attendance"
                :key="`ma-${item.id || i}`"
                class="border-b hover:bg-slate-50"
              >
                <td :class="tdBase">{{ i + 1 }}</td>
                <td :class="tdBase">{{ formatDate(item.create_date) }}</td>
                <td :class="tdBase">{{ formatDate(item.check_in || item.check_out) }}</td>
                <td :class="tdBase">{{ item.application_types }}</td>
                <td :class="tdBase">{{ formatTime(item.check_in) }}</td>
                <td :class="tdBase">{{ formatTime(item.check_out) }}</td>
                <td :class="tdBase">
                  <span class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1"
                        :class="statusChip(item.status)">
                    {{ item.status }}
                  </span>
                </td>
                <td :class="tdBase + ' text-right'">
                  <RouterLink
                    :to="{ name:'ManualAttendanceShow', params:{ id: item.id } }"
                    class="inline-flex items-center gap-1 text-emerald-700 hover:underline"
                  >
                    <i class="far fa-eye"></i> View
                  </RouterLink>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- fallback -->
        <div v-else class="p-6 text-center text-slate-500">
          No data for this group.
        </div>
      </div>
    </div>
  </div>
</template>
