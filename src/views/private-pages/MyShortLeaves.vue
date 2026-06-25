<script setup>
import LoaderView from '@/components/common/LoaderView.vue'
import FlexibleDatePicker from '@/components/FlexibleDatePicker.vue'
import { useShortLeaveStore } from '@/stores/short-leave'
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const shortLeaveStore = useShortLeaveStore()

const now = new Date()
const period = ref({ year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() })

const pad = (v) => v.toString().padStart(2, '0')

const periodMonth = computed(() => {
  const { year, month } = period.value || {}
  return year && month ? `${year}-${pad(month)}` : ''
})

const selectedMonthLabel = computed(() => {
  const [y, m] = (periodMonth.value || '').split('-')
  if (!y || !m) return 'Month'
  return new Date(Number(y), Number(m) - 1).toLocaleString('en-US', { month: 'long', year: 'numeric' })
})

watch(periodMonth, (v) => {
  if (!v) return
  shortLeaveStore.selectedMonth = v
  shortLeaveStore.fetchMyShortLeaves({ date: v })
}, { immediate: true })

const goBack = () => router.go(-1)
const list   = computed(() => shortLeaveStore.shortLeaves || [])

const summary = computed(() => {
  const out = { total: list.value.length, pending: 0, approved: 0, rejected: 0, totalMinutes: 0 }
  for (const r of list.value) {
    const s = (r.status || '').toLowerCase()
    if (s === 'approved') out.approved++
    else if (['rejected', 'cancelled', 'declined'].includes(s)) out.rejected++
    else out.pending++
    out.totalMinutes += Number(r.total_minutes) || 0
  }
  return out
})

const formatDate = (v) => {
  if (!v) return '—'
  return new Date(v).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

const formatTime = (v) => {
  if (!v) return '—'
  const [h, m] = v.split(':').map(Number)
  const d = new Date(); d.setHours(h, m)
  return d.toLocaleString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
}

const fmtMinutes = (min) => {
  if (!min) return '—'
  const h = Math.floor(min / 60), m = min % 60
  return h ? `${h}h ${m}m` : `${m}m`
}

const typeIcon = (type) => {
  const t = (type || '').toLowerCase()
  if (t === 'delay')      return { icon: 'fas fa-clock',          color: 'bg-amber-50 text-amber-700 ring-amber-200' }
  if (t === 'early')      return { icon: 'fas fa-sign-out-alt',   color: 'bg-blue-50 text-blue-700 ring-blue-200' }
  if (t === 'officetime') return { icon: 'fas fa-business-time',  color: 'bg-violet-50 text-violet-700 ring-violet-200' }
  return { icon: 'fas fa-calendar-minus', color: 'bg-gray-100 text-gray-600 ring-gray-200' }
}

const rowAccent = (status) => {
  const s = (status || '').toLowerCase()
  if (s === 'approved') return 'border-l-[3px] border-l-emerald-400'
  if (['rejected','cancelled','declined'].includes(s)) return 'border-l-[3px] border-l-red-400'
  return 'border-l-[3px] border-l-amber-400'
}

const badgeClass = (status) => {
  const s = (status || '').toLowerCase()
  if (s === 'approved') return 'bg-emerald-50 text-emerald-700 ring-emerald-200'
  if (['rejected','cancelled','declined'].includes(s)) return 'bg-red-50 text-red-700 ring-red-200'
  return 'bg-amber-50 text-amber-800 ring-amber-200'
}

const canDelete = (r) => !r.status || r.status === 'Pending'

function deleteApplication(id) {
  if (confirm('Delete this short leave request?')) {
    shortLeaveStore.deleteShortLeave(id)
  }
}
</script>

<template>
  <div class="min-h-screen bg-gray-50/40">

    <!-- ── Sticky toolbar ── -->
    <div class="sticky top-0 z-30 bg-white border-b border-gray-200 shadow-sm">

      <!-- Top row -->
      <div class="flex items-center gap-2 px-4 py-2">
        <button class="btn-3 py-1 text-xs" @click="goBack">
          <i class="far fa-arrow-left text-[11px]"></i>
          <span class="hidden sm:inline">Back</span>
        </button>

        <button
          type="button"
          class="btn-3 py-1 text-xs"
          title="Reload"
          @click="shortLeaveStore.fetchMyShortLeaves({ date: periodMonth })"
        >
          <i class="fas fa-sync text-[11px]" :class="{ 'animate-spin': shortLeaveStore.loading }"></i>
        </button>

        <h1 class="flex-1 text-center text-sm font-bold text-gray-900 tracking-tight">
          Short Leave Requests
        </h1>

        <FlexibleDatePicker
          v-model="period"
          :show-year="false"
          :show-month="true"
          :show-date="false"
          label="Month"
        />

        <RouterLink :to="{ name: 'ShortLeaveAdd' }" class="btn-2 py-1 text-xs">
          <i class="far fa-plus text-[11px]"></i>
          <span class="hidden sm:inline">Request</span>
        </RouterLink>
      </div>

      <!-- Stats pill bar -->
      <div class="flex items-center gap-x-3 flex-wrap px-4 pb-2 text-[11px]">
        <span class="font-medium text-gray-500">{{ selectedMonthLabel }}</span>
        <span class="text-gray-300">|</span>

        <span class="flex items-center gap-1 text-gray-700">
          <i class="fas fa-layer-group text-[9px] text-gray-400"></i>
          <b>{{ summary.total }}</b> total
        </span>

        <span v-if="summary.totalMinutes" class="flex items-center gap-1 text-gray-700">
          <i class="fas fa-clock text-[9px] text-blue-400"></i>
          <b>{{ fmtMinutes(summary.totalMinutes) }}</b>
        </span>

        <span v-if="summary.pending" class="flex items-center gap-1 text-amber-700">
          <i class="fas fa-hourglass-half text-[9px]"></i>
          <b>{{ summary.pending }}</b> pending
        </span>

        <span v-if="summary.approved" class="flex items-center gap-1 text-emerald-700">
          <i class="fas fa-check-circle text-[9px]"></i>
          <b>{{ summary.approved }}</b> approved
        </span>

        <span v-if="summary.rejected" class="flex items-center gap-1 text-red-600">
          <i class="fas fa-times-circle text-[9px]"></i>
          <b>{{ summary.rejected }}</b> rejected
        </span>
      </div>
    </div>

    <!-- ── Content ── -->
    <div class="px-4 py-3">

      <LoaderView v-if="shortLeaveStore.loading" class="py-16" />

      <div v-else class="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">

        <!-- Table -->
        <div v-if="list.length" class="overflow-x-auto">
          <table class="min-w-[680px] w-full text-sm">

            <thead>
              <tr class="bg-gray-50 border-b border-gray-200 text-[10px] uppercase tracking-wider text-gray-500">
                <th class="w-8 px-3 py-2.5 text-center">#</th>
                <th class="px-3 py-2.5 text-left min-w-[120px]">Date</th>
                <th class="px-3 py-2.5 text-center w-24">Type</th>
                <th class="px-3 py-2.5 text-center min-w-[150px]">Time</th>
                <th class="px-3 py-2.5 text-center w-16">Min</th>
                <th class="px-3 py-2.5 text-center w-16">File</th>
                <th class="px-3 py-2.5 text-center w-24">Status</th>
                <th class="px-3 py-2.5 text-center w-20">Act.</th>
              </tr>
            </thead>

            <tbody class="divide-y divide-gray-100">
              <tr
                v-for="(leave, index) in list"
                :key="leave?.id"
                class="group hover:bg-gray-50/70 transition-colors"
                :class="rowAccent(leave?.status)"
              >
                <!-- # -->
                <td class="px-3 py-2.5 text-center text-xs font-medium text-gray-400">
                  {{ index + 1 }}
                </td>

                <!-- Date -->
                <td class="px-3 py-2.5">
                  <div class="text-xs font-semibold text-gray-900 whitespace-nowrap">
                    {{ formatDate(leave?.date) }}
                  </div>
                  <div class="mt-0.5 text-[10px] text-gray-400 whitespace-nowrap">
                    Applied {{ formatDate(leave?.created_at) }}
                  </div>
                </td>

                <!-- Type badge -->
                <td class="px-3 py-2.5 text-center">
                  <span
                    class="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset"
                    :class="typeIcon(leave?.type).color"
                  >
                    <i :class="[typeIcon(leave?.type).icon, 'text-[9px]']"></i>
                    {{ leave?.type || 'Leave' }}
                  </span>
                </td>

                <!-- Time -->
                <td class="px-3 py-2.5 text-center">
                  <div class="text-[11px] text-gray-700 whitespace-nowrap tabular-nums">
                    <span class="font-medium">{{ formatTime(leave?.start_time) }}</span>
                    <span class="text-gray-300 mx-0.5">→</span>
                    <span class="font-medium">{{ formatTime(leave?.end_time) }}</span>
                  </div>
                </td>

                <!-- Minutes -->
                <td class="px-3 py-2.5 text-center text-[11px] font-semibold text-gray-700 tabular-nums">
                  {{ fmtMinutes(leave?.total_minutes) }}
                </td>

                <!-- Attachment -->
                <td class="px-3 py-2.5 text-center">
                  <a
                    v-if="leave?.attachment"
                    :href="leave.attachment"
                    target="_blank"
                    rel="noreferrer"
                    class="inline-flex h-6 w-6 items-center justify-center rounded-md border border-indigo-100 text-indigo-400 hover:border-indigo-300 hover:text-indigo-600 transition-colors"
                    title="Download attachment"
                  >
                    <i class="far fa-paperclip text-[10px]"></i>
                  </a>
                  <span v-else class="text-gray-200">—</span>
                </td>

                <!-- Status -->
                <td class="px-3 py-2.5 text-center">
                  <span
                    class="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset whitespace-nowrap"
                    :class="badgeClass(leave?.status)"
                  >
                    {{ leave?.status || 'Pending' }}
                  </span>
                </td>

                <!-- Actions -->
                <td class="px-3 py-2.5">
                  <div class="flex items-center justify-center gap-1">
                    <RouterLink
                      :to="{ name: 'ShortLeaveShow', params: { id: leave?.id } }"
                      class="inline-flex h-6 w-6 items-center justify-center rounded-md border border-gray-200 text-gray-500 hover:border-indigo-300 hover:text-indigo-600 transition-colors"
                      title="View"
                    >
                      <i class="far fa-eye text-[10px]"></i>
                    </RouterLink>
                    <button
                      v-if="canDelete(leave)"
                      type="button"
                      class="inline-flex h-6 w-6 items-center justify-center rounded-md border border-red-100 text-red-400 hover:border-red-300 hover:text-red-600 transition-colors"
                      title="Delete"
                      @click="deleteApplication(leave?.id)"
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
                <td colspan="4" class="px-3 py-2 text-right text-gray-400 font-medium">Totals</td>
                <td class="px-3 py-2 text-center text-gray-800 tabular-nums">
                  {{ fmtMinutes(summary.totalMinutes) }}
                </td>
                <td colspan="3" class="px-3 py-2" />
              </tr>
            </tfoot>

          </table>
        </div>

        <!-- Empty state -->
        <div v-else class="flex flex-col items-center justify-center py-16 text-center">
          <div class="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
            <i class="fas fa-calendar-minus text-xl text-gray-300"></i>
          </div>
          <p class="font-semibold text-gray-700 text-sm">No short leave requests</p>
          <p class="mt-1 text-xs text-gray-400">for {{ selectedMonthLabel }}</p>
          <RouterLink :to="{ name: 'ShortLeaveAdd' }" class="btn-2 mt-4 py-1.5 text-xs">
            <i class="far fa-plus text-[11px]"></i> New Request
          </RouterLink>
        </div>

      </div>
    </div>

  </div>
</template>
