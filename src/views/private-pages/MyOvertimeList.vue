<script setup>
import LoaderView from '@/components/common/LoaderView.vue'
import FlexibleDatePicker from '@/components/FlexibleDatePicker.vue'
import DisplayFormattedWorkingHours from '@/components/overtime/DisplayFormattedWorkingHours.vue'
import { useOvertimeStore } from '@/stores/overtime'
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
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

const goBack = () => {
  router.go(-1)
}

const myOvertimes = computed(() => overtimeStore.overtimes || [])

const totalRequestedMinutes = computed(() => {
  const list = overtimeStore.overtimes || []
  return list.reduce((sum, o) => sum + (Number(o?.request_overtime_hours) || 0), 0)
})

const totalApprovedMinutes = computed(() => {
  const list = overtimeStore.overtimes || []
  return list.reduce((sum, o) => sum + (Number(o?.approval_overtime_hours) || 0), 0)
})

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
  const raw = periodMonth.value
  const [year, month] = (raw || '').split('-')
  if (!year || !month) return 'Month'
  const date = new Date(Number(year), Number(month) - 1)
  return date.toLocaleString('en-US', { month: 'long', year: 'numeric' })
})

const formatDate = (date) => {
  if (!date) return 'N/A'
  return new Date(date).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

const statusBadgeClass = (status) => {
  const normalized = (status || '').toLowerCase()
  if (['approved', 'accepted'].includes(normalized)) {
    return 'border border-emerald-200 bg-emerald-50 text-emerald-700'
  }
  if (['rejected', 'declined', 'cancelled'].includes(normalized)) {
    return 'border border-red-200 bg-red-50 text-red-700'
  }
  if (normalized === 'pending' || !normalized) {
    return 'border border-amber-200 bg-amber-50 text-amber-800'
  }
  return 'border border-slate-200 bg-slate-50 text-slate-800'
}

function deleteApplication(applicationId) {
  const confirmed = confirm('Are you sure you want to delete this application?')
  if (confirmed) {
    overtimeStore.deleteOvertime(applicationId)
  }
}
</script>

<template>
  <div class="space-y-6 px-4 py-5">
    <div class="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm md:px-6">
      <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div class="flex flex-col gap-2">
          <div class="flex flex-wrap items-center gap-2">
            <button class="btn-3" @click="goBack">
              <i class="far fa-arrow-left"></i>
              <span class="hidden md:inline-flex">Back</span>
            </button>
            <button
              type="button"
              class="btn-3 space-x-1"
              @click="fetchOvertimeListData(periodMonth)"
            >
              <i class="fas fa-sync text-lg" :class="{ 'animate-spin': overtimeStore.loading }"></i>
              <span class="hidden md:inline">Reload</span>
            </button>
          </div>
        </div>
        <div class="space-y-1">
          <p class="text-2xl font-semibold text-slate-900">Overtime Requests Records</p>
        </div>

        <div class="flex flex-wrap items-center gap-2">
           <RouterLink :to="{ name: 'MyOvertimeAdd' }" class="btn-2">
              <i class="far fa-plus"></i>
              <span class="hidden md:inline-flex">Overtime</span>
            </RouterLink>
            <FlexibleDatePicker
              v-model="period"
              :show-year="false"
              :show-month="true"
              :show-date="false"
              label="Month"
            />
        </div>
      </div>

      <div class="mt-4 grid grid-cols-2 md:grid-cols-6 gap-2 text-xs md:text-sm">
        <div class="rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2">
          <div class="text-slate-500">Applications</div>
          <div class="text-lg font-semibold text-slate-800">{{ statusSummary.total }}</div>
        </div>
        <div class="rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2">
          <div class="text-slate-500">Requested</div>
          <div class="text-lg font-semibold text-slate-800">
            <DisplayFormattedWorkingHours :workingHours="totalRequestedMinutes" />
          </div>
        </div>
        <div class="rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2">
          <div class="text-slate-500">Approved</div>
          <div class="text-lg font-semibold text-slate-800">
            <DisplayFormattedWorkingHours :workingHours="totalApprovedMinutes" />
          </div>
        </div>
        <div class="rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2">
          <div class="text-slate-500">Pending</div>
          <div class="text-lg font-semibold text-slate-800">{{ statusSummary.pending }}</div>
        </div>
        <div class="rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2">
          <div class="text-slate-500">Approved / Rejected</div>
          <div class="text-lg font-semibold text-slate-800">
            {{ statusSummary.approved }} / {{ statusSummary.rejected }}
          </div>
        </div>
        <div class="rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2">
          <div class="text-slate-500">Other</div>
          <div class="text-lg font-semibold text-slate-800">{{ statusSummary.other }}</div>
        </div>
      </div>
    </div>

    <div v-if="overtimeStore?.loading" class="text-center py-10">
      <LoaderView />
    </div>

    <div v-else class="space-y-4">
      <div class="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-slate-100 text-sm">
            <thead class="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500">
              <tr>
                <th class="px-4 py-3 text-center">#</th>
                <th class="px-4 py-3 text-center">Date</th>
                <th class="px-4 py-3 text-center">Type</th>
                <th class="px-4 py-3 text-center">Shift</th>
                <th class="px-4 py-3 text-center">Check-In</th>
                <th class="px-4 py-3 text-center">Check-Out</th>
                <th class="px-4 py-3 text-center">Working</th>
                <th class="px-4 py-3 text-center">Request</th>
                <th class="px-4 py-3 text-center">Approved</th>
                <th class="px-4 py-3 text-center">Status</th>
                <th class="px-4 py-3 text-center">Details</th>
                <th class="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr
                v-for="(overtime, index) in myOvertimes"
                :key="overtime?.id"
                class="hover:bg-slate-50 transition"
              >
                <td class="px-4 py-3 font-semibold text-slate-600 text-center">{{ index + 1 }}</td>
                <td class="px-4 py-3 text-slate-700 text-center">{{ formatDate(overtime?.date) }}</td>
                <td class="px-4 py-3 text-slate-700 text-center">{{ overtime?.duty_type }}</td>
                <td class="px-4 py-3 text-slate-700 text-center">{{ overtime?.shift }}</td>
                <td class="px-4 py-3 text-slate-700 text-center">{{ overtime?.check_in || '- : -' }}</td>
                <td class="px-4 py-3 text-slate-700 text-center">{{ overtime?.check_out || '- : -' }}</td>
                <td class="px-4 py-3 text-slate-700 text-center">
                  <DisplayFormattedWorkingHours :workingHours="overtime?.working_hours" />
                </td>
                <td class="px-4 py-3 text-slate-700 text-center">
                  <DisplayFormattedWorkingHours :workingHours="overtime?.request_overtime_hours" />
                </td>
                <td class="px-4 py-3 text-slate-700 text-center">
                  <DisplayFormattedWorkingHours :workingHours="overtime?.approval_overtime_hours" />
                </td>
                <td class="px-4 py-3 text-center">
                  <span
                    :class="[
                      'inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold tracking-wide',
                      statusBadgeClass(overtime?.status),
                    ]"
                  >
                    {{ overtime?.status || 'Pending' }}
                  </span>
                </td>
                <td class="px-4 py-3 text-slate-700 text-center">{{ overtime?.work_details }}</td>
                <td class="px-4 py-3">
                  <div class="flex items-center justify-center gap-2">
                    <RouterLink
                      :to="{ name: 'MyOvertimeShow', params: { id: overtime?.id } }"
                      class="inline-flex items-center rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-indigo-200 hover:text-indigo-700"
                    >
                      <i class="far fa-eye mr-1"></i>
                      View
                    </RouterLink>
                    <button
                      v-if="overtime.status == 'Pending' || !overtime.status"
                      type="button"
                      @click="deleteApplication(overtime?.id)"
                      class="inline-flex items-center rounded-full border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:border-red-300 hover:text-red-700"
                    >
                      <i class="far fa-trash mr-1"></i>
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
              <tr v-if="myOvertimes.length === 0">
                <td :colspan="12" class="px-4 py-3 text-center text-red-500">No overtimes found</td>
              </tr>
            </tbody>
            <tfoot v-if="myOvertimes.length" class="bg-slate-50">
              <tr class="font-semibold">
                <td class="px-4 py-3 text-right" colspan="7">Totals</td>
                <td class="px-4 py-3 text-center">
                  <DisplayFormattedWorkingHours :workingHours="totalRequestedMinutes" />
                </td>
                <td class="px-4 py-3 text-center">
                  <DisplayFormattedWorkingHours :workingHours="totalApprovedMinutes" />
                </td>
                <td class="px-4 py-3 text-center">—</td>
                <td class="px-4 py-3 text-center">—</td>
                <td class="px-4 py-3 text-center">—</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>
