<script setup>
import LoaderView from '@/components/common/LoaderView.vue'
import FlexibleDatePicker from '@/components/FlexibleDatePicker.vue'
import { useShortLeaveStore } from '@/stores/short-leave'
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const shortLeaveStore = useShortLeaveStore()

const goBack = () => {
  router.go(-1)
}

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

const fetchShortLeaves = async (date) => {
  shortLeaveStore.fetchMyShortLeaves({ date })
}

watch(
  periodMonth,
  (value) => {
    if (!value) return
    shortLeaveStore.selectedMonth = value
    fetchShortLeaves(value)
  },
  { immediate: true }
)

const statusBadgeClass = (status) => {
  const normalized = (status || '').toLowerCase()
  if (['approved', 'approved by hr', 'approved by incharge'].includes(normalized)) {
    return 'border border-emerald-200 bg-emerald-50 text-emerald-700'
  }
  if (['rejected', 'cancelled', 'declined'].includes(normalized)) {
    return 'border border-red-200 bg-red-50 text-red-700'
  }
  if (normalized === 'pending' || !normalized) {
    return 'border border-amber-200 bg-amber-50 text-amber-800'
  }
  return 'border border-slate-200 bg-slate-50 text-slate-800'
}

const myShortLeaves = computed(() => {
  return shortLeaveStore.shortLeaves || []
})

const totalLeaves = computed(() => {
  return Array.isArray(myShortLeaves.value) ? myShortLeaves.value.length : 0
})

const selectedMonthLabel = computed(() => {
  const raw = periodMonth.value
  if (!raw) return 'All months'
  const [year, month] = raw.split('-')
  if (!year || !month) return 'All months'
  const date = new Date(Number(year), Number(month) - 1)
  return date.toLocaleString('en-US', { month: 'long', year: 'numeric' })
})

function deleteApplication(applicationId) {
  const confirmed = confirm('Are you sure you want to delete this application?')
  if (confirmed) {
    shortLeaveStore.deleteShortLeave(applicationId)
  }
}

const formatDate = (date) => {
  if (!date) return 'N/A'
  return new Date(date).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  })
}

const formatTime = (timeString) => {
  if (!timeString) return 'N/A'
  const [hour, minute] = timeString.split(':').map(Number) // Extract hour & minute
  const date = new Date()
  date.setHours(hour, minute)

  return date.toLocaleString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true, // Ensures AM/PM format
  })
}
</script>

<template>
  <div class="space-y-6 px-4 py-5">
    <div class="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm md:px-6">
      <div class="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <button class="btn-3 order-2 md:order-1" @click="goBack">
            <i class="far fa-arrow-left"></i>
            <span class="hidden md:inline-flex">Back</span>
          </button>
        </div>
        <div class="space-y-1">
          <p class="text-2xl font-semibold text-slate-900">
            Short Leaves Applications
          </p>
          <!-- <p class="text-2xl font-semibold text-slate-900">
            {{ totalLeaves }} {{ totalLeaves === 1 ? 'application' : 'applications' }}
          </p> -->
          <!-- <p class="text-sm text-slate-500">
            Showing <span class="font-medium text-slate-600">{{ selectedMonthLabel }}</span>
          </p> -->
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <RouterLink
            :to="{ name: 'ShortLeaveAdd' }"
            class="btn-2 order-1 md:order-2"
          >
            <i class="far fa-plus mr-1"></i>
            New Short Leave
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

    <div v-if="shortLeaveStore?.loading" class="text-center py-10">
      <LoaderView />
    </div>

    <div v-else class="space-y-4">
      <div v-if="totalLeaves === 0" class="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-slate-600">
        <p class="text-lg font-semibold text-slate-800">No requests yet</p>
        <p class="text-sm text-slate-500">Create your first short leave for {{ selectedMonthLabel }}</p>
        <RouterLink
          :to="{ name: 'ShortLeaveAdd' }"
          class="mt-3 inline-flex rounded-full border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 shadow-sm hover:bg-indigo-100"
        >
          <i class="far fa-plus mr-2"></i>
          Create short leave
        </RouterLink>
      </div>

      <div v-else class="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div class="flex items-center justify-between border-b border-slate-100 px-5 py-3">
          <p class="text-sm font-semibold text-slate-600">Showing {{ totalLeaves }} records</p>
          <span class="text-xs text-slate-500">
            Updated just now
          </span>
        </div>
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-slate-100 text-sm">
            <thead class="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500">
              <tr>
                <th class="px-4 py-3 text-left">#</th>
                <th class="px-4 py-3 text-left">Created Date</th>
                <th class="px-4 py-3 text-left">Leave Date</th>
                <th class="px-4 py-3 text-left">Type</th>
                <th class="px-4 py-3 text-left">Time</th>
                <th class="px-4 py-3 text-left">Minutes</th>
                <th class="px-4 py-3 text-left">Attachment</th>
                <th class="px-4 py-3 text-left">Status</th>
                <th class="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr
                v-for="(leave, index) in myShortLeaves"
                :key="leave?.id"
                class="hover:bg-slate-50 transition"
              >
                <td class="px-4 py-3 font-semibold text-slate-600">{{ index + 1 }}</td>
                <td class="px-4 py-3 text-slate-700">{{ formatDate(leave?.created_at) }}</td>
                <td class="px-4 py-3 text-slate-700">{{ formatDate(leave?.date) }}</td>
                <td class="px-4 py-3 text-slate-700">{{ leave?.type || 'Short Leave' }}</td>
                <td class="px-4 py-3 text-slate-700">
                  {{ formatTime(leave?.start_time) }} - {{ formatTime(leave?.end_time) }}
                </td>
                <td class="px-4 py-3 text-slate-700">{{ leave?.total_minutes || '—' }}</td>
                <td class="px-4 py-3">
                  <div v-if="leave?.attachment" class="flex items-center gap-1 text-xs font-semibold text-indigo-600">
                    <i class="far fa-paperclip"></i>
                    Attached
                  </div>
                  <span v-else class="text-xs text-slate-400">None</span>
                </td>
                <td class="px-4 py-3">
                  <span
                    :class="['inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold tracking-wide', statusBadgeClass(leave?.status)]"
                  >
                    {{ leave?.status || 'Pending' }}
                  </span>
                </td>
                <td class="px-4 py-3">
                  <div class="flex items-center justify-end gap-2">
                    <RouterLink
                      :to="{ name: 'ShortLeaveShow', params: { id: leave?.id } }"
                      class="inline-flex items-center rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-indigo-200 hover:text-indigo-700"
                    >
                      <i class="far fa-eye mr-1"></i>
                      View
                    </RouterLink>
                    <button
                      v-if="leave.status == 'Pending' || !leave.status"
                      type="button"
                      @click="deleteApplication(leave?.id)"
                      class="inline-flex items-center rounded-full border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:border-red-300 hover:text-red-700"
                    >
                      <i class="far fa-trash mr-1"></i>
                      Delete
                    </button>
                    <a
                      v-if="leave?.attachment"
                      :href="leave.attachment"
                      target="_blank"
                      rel="noreferrer"
                      class="inline-flex items-center rounded-full border border-indigo-200 px-3 py-1.5 text-xs font-semibold text-indigo-600 transition hover:border-indigo-300 hover:text-indigo-800"
                    >
                      <i class="far fa-download mr-1"></i>
                      Download
                    </a>
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
