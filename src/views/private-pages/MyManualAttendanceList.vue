<script setup>
import LoaderView from '@/components/common/LoaderView.vue'
import { useManualAttendanceStore } from '@/stores/manual-attendance'
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const manualAttendanceStore = useManualAttendanceStore()

/* ---------------- Year filter (backend: ?year=2025) ---------------- */
const now = new Date()
const selectedYear = ref(String(now.getFullYear()))

const years = computed(() => {
  const current = now.getFullYear()
  // last 6 years + current + next 1 year (adjust as you want)
  const list = []
  for (let y = current + 1; y >= current - 6; y--) list.push(String(y))
  return list
})

const fetchManualAttendances = (year) => {
  manualAttendanceStore.fetchUserManualAttendances({ year })
}

watch(
  selectedYear,
  (year) => {
    if (!year) return
    fetchManualAttendances(year)
  },
  { immediate: true },
)

/* ---------------- table data ---------------- */
const myManualAttendances = computed(() => manualAttendanceStore.manualAttendances || [])
const totalRecords = computed(() =>
  Array.isArray(myManualAttendances.value) ? myManualAttendances.value.length : 0,
)

const selectedYearLabel = computed(() => selectedYear.value || 'Year')

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

const goBack = () => router.go(-1)

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
      <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <button class="btn-3" @click="goBack">
            <i class="far fa-arrow-left"></i>
            <span class="hidden md:inline-flex">Back</span>
          </button>
        </div>

        <div class="space-y-1">
          <p class="text-2xl font-semibold text-slate-900">Manual Attendances Records</p>
          <p class="text-sm text-slate-500">Filtered by year: <b>{{ selectedYearLabel }}</b></p>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <RouterLink :to="{ name: 'ManualAttendanceAdd' }" class="btn-2 rounded">
            <i class="far fa-plus mr-1"></i>
            Request
          </RouterLink>

          <!-- ✅ Year Filter -->
          <select v-model="selectedYear" class="input-1 w-[140px]" aria-label="Year">
            <option v-for="y in years" :key="y" :value="y">
              {{ y }}
            </option>
          </select>
        </div>
      </div>
    </div>

    <div v-if="manualAttendanceStore?.loading" class="text-center py-10">
      <LoaderView />
    </div>

    <div v-else class="space-y-4">
      <div
        v-if="totalRecords === 0"
        class="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-slate-600"
      >
        <p class="text-lg font-semibold text-slate-800">No manual attendances yet</p>
        <p class="text-sm text-slate-500">Submit your first request for {{ selectedYearLabel }}</p>
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
                <th class="px-4 py-3 text-left">Created Date</th>
                <th class="px-4 py-3 text-left">Type</th>
                <th class="px-4 py-3 text-left">Punch/Offsite Type</th>
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
                <td class="px-4 py-3 text-slate-700">{{ attendance?.type || 'Manual' }}</td>
                <td class="px-4 py-3 text-slate-700">{{ attendance?.punch_type || attendance?.offside_type || 'N/A' }}</td>
                <td class="px-4 py-3 text-slate-700">{{ attendance?.check_in || 'N/A' }}</td>
                <td class="px-4 py-3 text-slate-700">{{ attendance?.check_out || 'N/A' }}</td>
                <td class="px-4 py-3">
                  <span
                    :class="[
                      'inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold tracking-wide',
                      statusBadgeClass(attendance?.status),
                    ]"
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
