<script setup>
import LoaderView from '@/components/common/LoaderView.vue'
import FlexibleDatePicker from '@/components/FlexibleDatePicker.vue'
import DisplayFormattedWorkingHours from '@/components/overtime/DisplayFormattedWorkingHours.vue'
import { useAuthStore } from '@/stores/auth'
import { useOvertimeStore } from '@/stores/overtime'
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const authStore = useAuthStore()
const overtimeStore = useOvertimeStore()

const now = new Date()
const period = ref({
  year: now.getFullYear(),
  month: now.getMonth() + 1,
  day: now.getDate(),
})

const pad = (value) => value.toString().padStart(2, '0')

const periodMonth = computed(() => {
  const value = period.value || {}
  if (!value.year || !value.month) return ''
  return `${value.year}-${pad(value.month)}`
})

const fetchOvertimeListData = (month) => {
  overtimeStore.fetchUserOvertimes({ month })
}

watch(
  periodMonth,
  (value) => {
    if (!value) return
    overtimeStore.selectedMonth = value
    fetchOvertimeListData(value)
  },
  { immediate: true }
)

const goBack = () => router.go(-1)

const myOvertimes = computed(() => overtimeStore.overtimes || [])

const totalRequestedHours = computed(() =>
  (overtimeStore.overtimes || []).reduce((sum, o) => sum + (Number(o?.request_overtime_hours) || 0), 0)
)

const totalApprovedHours = computed(() =>
  (overtimeStore.overtimes || []).reduce((sum, o) => sum + (Number(o?.approval_overtime_hours) || 0), 0)
)

const statusSummary = computed(() => {
  const out = { pending: 0, approved: 0, rejected: 0, other: 0, total: myOvertimes.value.length }
  for (const ot of myOvertimes.value) {
    const s = String(ot.status || 'Pending').toLowerCase()
    if (s === 'approved') out.approved++
    else if (s === 'rejected') out.rejected++
    else if (s === 'pending' || s === 'applied') out.pending++
    else out.other++
  }
  return out
})

const selectedMonthLabel = computed(() => {
  const [year, month] = (periodMonth.value || '').split('-')
  if (!year || !month) return 'Month'
  return new Date(Number(year), Number(month) - 1).toLocaleString('en-US', { month: 'long', year: 'numeric' })
})

const formatDate = (date) => {
  if (!date) return 'N/A'
  return new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

const rowAccentClass = (status) => {
  const s = (status || '').toLowerCase()
  if (s === 'approved') return 'border-l-[3px] border-l-emerald-400'
  if (s === 'rejected') return 'border-l-[3px] border-l-red-400'
  return 'border-l-[3px] border-l-amber-400'
}

const statusBadgeClass = (status) => {
  const s = (status || '').toLowerCase()
  if (['approved', 'accepted'].includes(s)) return 'bg-emerald-50 text-emerald-700 ring-emerald-200'
  if (['rejected', 'declined', 'cancelled'].includes(s)) return 'bg-red-50 text-red-700 ring-red-200'
  return 'bg-amber-50 text-amber-800 ring-amber-200'
}

const canDeleteApplication = (overtime) => {
  const role = authStore.user?.role
  const isPrivileged = ['admin', 'super_admin', 'developer'].includes(role)
  const isOwnPending =
    Number(overtime?.user_id) === Number(authStore.user?.id) &&
    (overtime?.status === 'Pending' || !overtime?.status)
  return isPrivileged || isOwnPending
}

function deleteApplication(applicationId) {
  if (confirm('Are you sure you want to delete this application?')) {
    overtimeStore.deleteOvertime(applicationId)
  }
}
</script>

<template>
  <div class="min-h-screen bg-gray-50/40">

    <!-- ── Sticky toolbar ── -->
    <div class="sticky top-0 z-30 bg-white border-b border-gray-200 shadow-sm">

      <!-- Top row: controls -->
      <div class="flex items-center gap-2 px-4 py-2">
        <button class="btn-3 py-1 text-xs" @click="goBack">
          <i class="far fa-arrow-left text-[11px]"></i>
          <span class="hidden sm:inline">Back</span>
        </button>

        <button
          type="button"
          class="btn-3 py-1 text-xs"
          :title="'Reload ' + selectedMonthLabel"
          @click="fetchOvertimeListData(periodMonth)"
        >
          <i class="fas fa-sync text-[11px]" :class="{ 'animate-spin': overtimeStore.loading }"></i>
        </button>

        <h1 class="flex-1 text-center text-sm font-bold text-gray-900 tracking-tight">
          Overtime Requests
        </h1>

        <FlexibleDatePicker
          v-model="period"
          :show-year="false"
          :show-month="true"
          :show-date="false"
          label="Month"
        />

        <RouterLink :to="{ name: 'MyOvertimeAdd' }" class="btn-2 py-1 text-xs">
          <i class="far fa-plus text-[11px]"></i>
          <span class="hidden sm:inline">Overtime</span>
        </RouterLink>
      </div>

      <!-- Stats pill bar -->
      <div class="flex items-center gap-x-3 gap-y-1 flex-wrap px-4 pb-2 text-[11px]">
        <span class="font-medium text-gray-500">{{ selectedMonthLabel }}</span>
        <span class="text-gray-300">|</span>

        <span class="flex items-center gap-1 text-gray-700">
          <i class="fas fa-layer-group text-[9px] text-gray-400"></i>
          <b>{{ statusSummary.total }}</b> total
        </span>

        <span class="flex items-center gap-1 text-gray-700">
          <i class="fas fa-clock text-[9px] text-blue-400"></i>
          <b><DisplayFormattedWorkingHours :workingHours="totalRequestedHours" /></b> requested
        </span>

        <span class="flex items-center gap-1 text-emerald-700">
          <i class="fas fa-check-circle text-[9px]"></i>
          <b><DisplayFormattedWorkingHours :workingHours="totalApprovedHours" /></b> approved
        </span>

        <span v-if="statusSummary.pending" class="flex items-center gap-1 text-amber-700">
          <i class="fas fa-hourglass-half text-[9px]"></i>
          <b>{{ statusSummary.pending }}</b> pending
        </span>

        <span v-if="statusSummary.rejected" class="flex items-center gap-1 text-red-600">
          <i class="fas fa-times-circle text-[9px]"></i>
          <b>{{ statusSummary.rejected }}</b> rejected
        </span>
      </div>
    </div>

    <!-- ── Content ── -->
    <div class="px-4 py-3">

      <LoaderView v-if="overtimeStore.loading" class="py-16" />

      <div v-else class="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">

        <!-- Table -->
        <div v-if="myOvertimes.length" class="overflow-x-auto">
          <table class="min-w-[760px] w-full text-sm">

            <thead>
              <tr class="bg-gray-50 border-b border-gray-200 text-[10px] uppercase tracking-wider text-gray-500">
                <th class="w-8 px-3 py-2.5 text-center">#</th>
                <th class="px-3 py-2.5 text-left min-w-[130px]">Date</th>
                <th class="px-3 py-2.5 text-center w-16">Type</th>
                <th class="px-3 py-2.5 text-center min-w-[110px]">Shift</th>
                <th class="px-3 py-2.5 text-center min-w-[130px]">Attendance</th>
                <th class="px-3 py-2.5 text-center w-20">Working</th>
                <th class="px-3 py-2.5 text-center w-20">Request</th>
                <th class="px-3 py-2.5 text-center w-20">Approved</th>
                <th class="px-3 py-2.5 text-center w-24">Status</th>
                <th class="px-3 py-2.5 text-center w-16">Act.</th>
              </tr>
            </thead>

            <tbody class="divide-y divide-gray-100">
              <tr
                v-for="(overtime, index) in myOvertimes"
                :key="overtime?.id"
                class="group hover:bg-gray-50/70 transition-colors"
                :class="rowAccentClass(overtime?.status)"
              >
                <!-- # -->
                <td class="px-3 py-2.5 text-center text-xs font-medium text-gray-400">
                  {{ index + 1 }}
                </td>

                <!-- Date + details subtitle -->
                <td class="px-3 py-2.5">
                  <div class="font-semibold text-gray-900 text-xs whitespace-nowrap">
                    {{ formatDate(overtime?.date) }}
                  </div>
                  <div
                    v-if="overtime?.work_details"
                    class="mt-0.5 text-[10px] text-gray-400 truncate max-w-[160px]"
                    :title="overtime.work_details"
                  >
                    {{ overtime.work_details }}
                  </div>
                </td>

                <!-- Type badge -->
                <td class="px-3 py-2.5 text-center">
                  <span class="inline-flex items-center rounded-md bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700 ring-1 ring-inset ring-indigo-100">
                    {{ overtime?.duty_type || '—' }}
                  </span>
                </td>

                <!-- Shift -->
                <td class="px-3 py-2.5 text-center text-[11px] text-gray-600 whitespace-nowrap">
                  {{ overtime?.shift || '—' }}
                </td>

                <!-- Attendance (in → out) -->
                <td class="px-3 py-2.5 text-center">
                  <div class="text-[11px] text-gray-700 whitespace-nowrap">
                    <span class="font-medium tabular-nums">{{ overtime?.check_in || '—' }}</span>
                    <span class="text-gray-300 mx-0.5">→</span>
                    <span class="font-medium tabular-nums">{{ overtime?.check_out || '—' }}</span>
                  </div>
                </td>

                <!-- Working -->
                <td class="px-3 py-2.5 text-center text-[11px] font-medium text-gray-700 tabular-nums">
                  <DisplayFormattedWorkingHours :workingHours="overtime?.working_hours" />
                </td>

                <!-- Request -->
                <td class="px-3 py-2.5 text-center text-[11px] font-semibold text-gray-800 tabular-nums">
                  <DisplayFormattedWorkingHours :workingHours="overtime?.request_overtime_hours" />
                </td>

                <!-- Approved -->
                <td class="px-3 py-2.5 text-center text-[11px] font-semibold tabular-nums">
                  <span v-if="overtime?.approval_overtime_hours" class="text-emerald-700">
                    <DisplayFormattedWorkingHours :workingHours="overtime?.approval_overtime_hours" />
                  </span>
                  <span v-else class="text-gray-300">—</span>
                </td>

                <!-- Status -->
                <td class="px-3 py-2.5 text-center">
                  <span
                    class="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset whitespace-nowrap"
                    :class="statusBadgeClass(overtime?.status)"
                  >
                    {{ overtime?.status || 'Pending' }}
                  </span>
                </td>

                <!-- Actions -->
                <td class="px-3 py-2.5">
                  <div class="flex items-center justify-center gap-1">
                    <RouterLink
                      :to="{ name: 'MyOvertimeShow', params: { id: overtime?.id } }"
                      class="inline-flex h-6 w-6 items-center justify-center rounded-md border border-gray-200 text-gray-500 hover:border-indigo-300 hover:text-indigo-600 transition-colors"
                      title="View"
                    >
                      <i class="far fa-eye text-[10px]"></i>
                    </RouterLink>
                    <button
                      v-if="canDeleteApplication(overtime)"
                      type="button"
                      class="inline-flex h-6 w-6 items-center justify-center rounded-md border border-red-100 text-red-400 hover:border-red-300 hover:text-red-600 transition-colors"
                      title="Delete"
                      @click="deleteApplication(overtime?.id)"
                    >
                      <i class="far fa-trash text-[10px]"></i>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>

            <!-- Totals footer -->
            <tfoot class="bg-gray-50 border-t-2 border-gray-200">
              <tr class="text-[11px] font-semibold text-gray-600">
                <td colspan="6" class="px-3 py-2 text-right text-gray-400 font-medium">Totals</td>
                <td class="px-3 py-2 text-center text-gray-800 tabular-nums">
                  <DisplayFormattedWorkingHours :workingHours="totalRequestedHours" />
                </td>
                <td class="px-3 py-2 text-center text-emerald-700 tabular-nums">
                  <DisplayFormattedWorkingHours :workingHours="totalApprovedHours" />
                </td>
                <td colspan="2" class="px-3 py-2" />
              </tr>
            </tfoot>

          </table>
        </div>

        <!-- Empty state -->
        <div v-else class="flex flex-col items-center justify-center py-16 text-center">
          <div class="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
            <i class="fas fa-hourglass-half text-xl text-gray-300"></i>
          </div>
          <p class="font-semibold text-gray-700 text-sm">No overtime records</p>
          <p class="mt-1 text-xs text-gray-400">for {{ selectedMonthLabel }}</p>
          <RouterLink :to="{ name: 'MyOvertimeAdd' }" class="btn-2 mt-4 py-1.5 text-xs">
            <i class="far fa-plus text-[11px]"></i> Add Overtime
          </RouterLink>
        </div>

      </div>
    </div>

  </div>
</template>
