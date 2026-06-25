<script setup>
import LoaderView from '@/components/common/LoaderView.vue'
import FlexibleDatePicker from '@/components/FlexibleDatePicker.vue'
import { useExchangeStore } from '@/stores/exchange'
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'

const router        = useRouter()
const exchangeStore = useExchangeStore()
const type          = 'shift'

const now    = new Date()
const period = ref({ year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() })
const pad    = (v) => v.toString().padStart(2, '0')

const periodMonth = computed(() => {
  const { year, month } = period.value || {}
  return year && month ? `${year}-${pad(month)}` : ''
})

const selectedMonthLabel = computed(() => {
  const [y, m] = (periodMonth.value || '').split('-')
  if (!y || !m) return 'Month'
  return new Date(Number(y), Number(m) - 1).toLocaleString('en-US', { month: 'long', year: 'numeric' })
})

const fetchData = () =>
  exchangeStore.fetchExchanges({ payload: { type, date: periodMonth.value, selectedMonth: periodMonth.value } })

watch(periodMonth, (v) => { if (v) { exchangeStore.selectedMonth = v; fetchData() } }, { immediate: true })

const goBack = () => router.go(-1)
const list   = computed(() => exchangeStore.exchanges || [])

const summary = computed(() => {
  const out = { total: list.value.length, pending: 0, approved: 0, rejected: 0 }
  for (const r of list.value) {
    const s = (r.status || '').toLowerCase()
    if (['approved', 'accepted'].includes(s)) out.approved++
    else if (['rejected', 'declined', 'cancelled'].includes(s)) out.rejected++
    else out.pending++
  }
  return out
})

const formatDate = (v) => {
  if (!v) return '—'
  return new Date(v).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

const rowAccent = (status) => {
  const s = (status || '').toLowerCase()
  if (['approved', 'accepted'].includes(s)) return 'border-l-[3px] border-l-emerald-400'
  if (['rejected', 'declined', 'cancelled'].includes(s)) return 'border-l-[3px] border-l-red-400'
  return 'border-l-[3px] border-l-amber-400'
}

const badgeClass = (status) => {
  const s = (status || '').toLowerCase()
  if (['approved', 'accepted'].includes(s)) return 'bg-emerald-50 text-emerald-700 ring-emerald-200'
  if (['rejected', 'declined', 'cancelled'].includes(s)) return 'bg-red-50 text-red-700 ring-red-200'
  return 'bg-amber-50 text-amber-800 ring-amber-200'
}

const canDelete = (r) => !r.status || r.status === 'Pending'

function deleteApplication(id) {
  if (confirm('Delete this shift exchange request?')) exchangeStore.deleteExchange(id)
}
</script>

<template>
  <div class="min-h-screen bg-gray-50/40">

    <!-- ── Sticky toolbar ── -->
    <div class="sticky top-0 z-30 bg-white border-b border-gray-200 shadow-sm">

      <div class="flex items-center gap-2 px-4 py-2">
        <button class="btn-3 py-1 text-xs" @click="goBack">
          <i class="far fa-arrow-left text-[11px]"></i>
          <span class="hidden sm:inline">Back</span>
        </button>

        <button type="button" class="btn-3 py-1 text-xs" title="Reload" @click="fetchData">
          <i class="fas fa-sync text-[11px]" :class="{ 'animate-spin': exchangeStore.loading }"></i>
        </button>

        <h1 class="flex-1 text-center text-sm font-bold text-gray-900 tracking-tight">
          Shift Exchange Requests
        </h1>

        <FlexibleDatePicker v-model="period" :show-year="false" :show-month="true" :show-date="false" label="Month" />

        <RouterLink :to="{ name: 'ShiftExchangeAdd' }" class="btn-2 py-1 text-xs">
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

      <LoaderView v-if="exchangeStore.loading" class="py-16" />

      <div v-else class="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">

        <div v-if="list.length" class="overflow-x-auto">
          <table class="min-w-[640px] w-full text-sm">

            <thead>
              <tr class="bg-gray-50 border-b border-gray-200 text-[10px] uppercase tracking-wider text-gray-500">
                <th class="w-8 px-3 py-2.5 text-center">#</th>
                <th class="px-3 py-2.5 text-left min-w-[110px]">Date</th>
                <th class="px-3 py-2.5 text-center min-w-[110px]">Current Shift</th>
                <th class="px-3 py-2.5 text-center min-w-[110px]">Request Shift</th>
                <th class="px-3 py-2.5 text-center w-14">File</th>
                <th class="px-3 py-2.5 text-center w-24">Status</th>
                <th class="px-3 py-2.5 text-center w-16">Act.</th>
              </tr>
            </thead>

            <tbody class="divide-y divide-gray-100">
              <tr
                v-for="(ex, index) in list"
                :key="ex?.id"
                class="group hover:bg-gray-50/70 transition-colors"
                :class="rowAccent(ex?.status)"
              >
                <!-- # -->
                <td class="px-3 py-2.5 text-center text-xs font-medium text-gray-400">{{ index + 1 }}</td>

                <!-- Date -->
                <td class="px-3 py-2.5">
                  <div class="text-xs font-semibold text-gray-900 whitespace-nowrap">
                    {{ formatDate(ex?.exchange_date) }}
                  </div>
                  <div class="mt-0.5 text-[10px] text-gray-400 whitespace-nowrap">
                    Applied {{ formatDate(ex?.created_at) }}
                  </div>
                </td>

                <!-- Current shift -->
                <td class="px-3 py-2.5 text-center">
                  <span class="inline-flex items-center gap-1 rounded-md bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-600">
                    <i class="fas fa-exchange-alt text-[8px]"></i>
                    {{ ex?.current_shift?.name || '—' }}
                  </span>
                </td>

                <!-- Requested shift -->
                <td class="px-3 py-2.5 text-center">
                  <span class="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-700 ring-1 ring-inset ring-indigo-100">
                    <i class="fas fa-arrow-right text-[8px]"></i>
                    {{ ex?.shift?.name || '—' }}
                  </span>
                </td>

                <!-- Attachment -->
                <td class="px-3 py-2.5 text-center">
                  <a
                    v-if="ex?.attachment && typeof ex.attachment === 'string'"
                    :href="ex.attachment"
                    target="_blank"
                    class="inline-flex h-6 w-6 items-center justify-center rounded-md border border-indigo-100 text-indigo-400 hover:border-indigo-300 hover:text-indigo-600 transition-colors"
                    title="View attachment"
                  >
                    <i class="far fa-paperclip text-[10px]"></i>
                  </a>
                  <span v-else class="text-gray-200">—</span>
                </td>

                <!-- Status -->
                <td class="px-3 py-2.5 text-center">
                  <span
                    class="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset whitespace-nowrap"
                    :class="badgeClass(ex?.status)"
                  >
                    {{ ex?.status || 'Pending' }}
                  </span>
                </td>

                <!-- Actions -->
                <td class="px-3 py-2.5">
                  <div class="flex items-center justify-center gap-1">
                    <RouterLink
                      :to="{ name: 'ExchangeShiftShow', params: { id: ex?.id } }"
                      class="inline-flex h-6 w-6 items-center justify-center rounded-md border border-gray-200 text-gray-500 hover:border-indigo-300 hover:text-indigo-600 transition-colors"
                      title="View"
                    >
                      <i class="far fa-eye text-[10px]"></i>
                    </RouterLink>
                    <button
                      v-if="canDelete(ex)"
                      type="button"
                      class="inline-flex h-6 w-6 items-center justify-center rounded-md border border-red-100 text-red-400 hover:border-red-300 hover:text-red-600 transition-colors"
                      title="Delete"
                      @click="deleteApplication(ex?.id)"
                    >
                      <i class="far fa-trash text-[10px]"></i>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Empty state -->
        <div v-else class="flex flex-col items-center justify-center py-16 text-center">
          <div class="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
            <i class="fas fa-exchange-alt text-xl text-gray-300"></i>
          </div>
          <p class="font-semibold text-gray-700 text-sm">No shift exchange requests</p>
          <p class="mt-1 text-xs text-gray-400">for {{ selectedMonthLabel }}</p>
          <RouterLink :to="{ name: 'ShiftExchangeAdd' }" class="btn-2 mt-4 py-1.5 text-xs">
            <i class="far fa-plus text-[11px]"></i> New Request
          </RouterLink>
        </div>

      </div>
    </div>

  </div>
</template>
