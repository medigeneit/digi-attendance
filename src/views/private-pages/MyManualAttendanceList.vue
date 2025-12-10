<script setup>
import LoaderView from '@/components/common/LoaderView.vue'
import FlexibleDatePicker from '@/components/FlexibleDatePicker.vue'
import { useAuthStore } from '@/stores/auth'
import { useManualAttendanceStore } from '@/stores/manual-attendance'
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const manualAttendanceStore = useManualAttendanceStore()
const authStore = useAuthStore()

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

const fetchManualAttendances = (date) => {
  manualAttendanceStore.fetchUserManualAttendances({ date })
}

watch(
  periodMonth,
  (value) => {
    if (!value) return
    fetchManualAttendances(value)
  },
  { immediate: true }
)

const myManualAttendances = computed(() => manualAttendanceStore.manualAttendances || [])

const totalRecords = computed(() =>
  Array.isArray(myManualAttendances.value) ? myManualAttendances.value.length : 0
)

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

const goBack = () => {
  router.go(-1)
}

function deleteApplication(applicationId) {
  const confirmed = confirm('Are you sure you want to delete this application?')
  if (confirmed) {
    manualAttendanceStore.deleteManualAttendance(applicationId)
  }
}
</script>

<template>
  <div class="space-y-6 px-4 py-5">
    <div class="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm md:px-6">
      <div class="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <button class="btn-3" @click="goBack">
            <i class="far fa-arrow-left"></i>
            <span class="hidden md:inline-flex">Back</span>
          </button>
        </div>
        <div class="space-y-1">
          <p class="text-2xl font-semibold text-slate-900">Manual Attendances Records</p>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <RouterLink :to="{ name: 'ManualAttendanceAdd' }" class="btn-2">
            <i class="far fa-plus mr-1"></i>
            Request
          </RouterLink>
          <FlexibleDatePicker
            v-model="period"
            :show-year="false"
            :show-month="true"
            :show-date="false"
          />
        </div>
      </div>
    </div>

    <div v-if="manualAttendanceStore?.loading" class="text-center py-10">
      <LoaderView />
    </div>

    <div v-else class="space-y-4">
      <div v-if="totalRecords === 0" class="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-slate-600">
        <p class="text-lg font-semibold text-slate-800">No manual attendances yet</p>
        <p class="text-sm text-slate-500">Submit your first request for {{ selectedMonthLabel }}</p>
      </div>
      <div v-else class="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div class="flex items-center justify-between border-b border-slate-100 px-5 py-3">
          <p class="text-sm font-semibold text-slate-600">Showing {{ totalRecords }} requests</p>
          <span class="text-xs text-slate-500">Auto-updated</span>
        </div>
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-slate-100 text-sm">
            <thead class="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500">
              <tr>
                <th class="px-4 py-3 text-left">#</th>
                <th class="px-4 py-3 text-left">Created</th>
                <!-- <th class="px-4 py-3 text-left">Date</th> -->
                <th class="px-4 py-3 text-left">Type</th>
                <th class="px-4 py-3 text-left">Check-In</th>
                <th class="px-4 py-3 text-left">Check-Out</th>
                <th class="px-4 py-3 text-left">Status</th>
                <th class="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr
                v-for="(attendance, index) in myManualAttendances"
                :key="attendance?.id"
                class="hover:bg-slate-50 transition"
              >
                <td class="px-4 py-3 font-semibold text-slate-600">{{ index + 1 }}</td>
                <td class="px-4 py-3 text-slate-700">{{ formatDate(attendance?.created_at) }}</td>
                <!-- <td class="px-4 py-3 text-slate-700">{{ formatDate(attendance?.date || attendance?.manual_worked_date) }}</td> -->
                <td class="px-4 py-3 text-slate-700">{{ attendance?.type || 'Manual' }}</td>
                <td class="px-4 py-3 text-slate-700">{{ attendance?.check_in || 'N/A' }}</td>
                <td class="px-4 py-3 text-slate-700">{{ attendance?.check_out || 'N/A' }}</td>
                <td class="px-4 py-3">
                  <span
                    :class="['inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold tracking-wide', statusBadgeClass(attendance?.status)]"
                  >
                    {{ attendance?.status || 'Pending' }}
                  </span>
                </td>
                <td class="px-4 py-3">
                  <div class="flex items-center justify-end gap-2">
                    <RouterLink
                      :to="{ name: 'ManualAttendanceShow', params: { id: attendance?.id } }"
                      class="inline-flex items-center rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-indigo-200 hover:text-indigo-700"
                    >
                      <i class="far fa-eye mr-1"></i>
                      View
                    </RouterLink>
                    <button
                      v-if="attendance.status == 'Pending' || !attendance.status"
                      type="button"
                      @click="deleteApplication(attendance?.id)"
                      class="inline-flex items-center rounded-full border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:border-red-300 hover:text-red-700"
                    >
                      <i class="far fa-trash mr-1"></i>
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>
