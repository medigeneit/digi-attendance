<script setup>
import LoaderView from '@/components/common/LoaderView.vue'
import FlexibleDatePicker from '@/components/FlexibleDatePicker.vue'
import { useAuthStore } from '@/stores/auth'
import { useExchangeStore } from '@/stores/exchange'
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const exchangeStore = useExchangeStore()
const authStore = useAuthStore()
const type = 'offday'

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

const fetchExchanges = (date) => {
  exchangeStore.fetchExchanges({
    payload: {
      type,
      date,
    },
  })
}

watch(
  periodMonth,
  (value) => {
    if (!value) return
    fetchExchanges(value)
  },
  { immediate: true }
)

const formatDate = (date) => {
  if (!date) return 'N/A'
  return new Date(date).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

const myExchanges = computed(() => exchangeStore.exchanges || [])

const totalExchanges = computed(() =>
  Array.isArray(myExchanges.value) ? myExchanges.value.length : 0
)

const selectedMonthLabel = computed(() => {
  const raw = periodMonth.value
  const [year, month] = (raw || '').split('-')
  if (!year || !month) return 'Month'
  const date = new Date(Number(year), Number(month) - 1)
  return date.toLocaleString('en-US', { month: 'long', year: 'numeric' })
})

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
          <p class="text-2xl font-semibold text-slate-900">Offday Exchanges Records</p>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <RouterLink :to="{ name: 'OffdayExchangeAdd' }" class="btn-2">
            <i class="far fa-plus mr-1"></i>
            Request Offday Exchange
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
    </div>

    <div v-if="exchangeStore?.loading" class="text-center py-10">
      <LoaderView />
    </div>

    <div v-else class="space-y-4">
      <div v-if="totalExchanges === 0" class="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-slate-600">
        <p class="text-lg font-semibold text-slate-800">No exchanges yet</p>
        <p class="text-sm text-slate-500">Try a different month or create a new request</p>
      </div>
      <div v-else class="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div class="flex items-center justify-between border-b border-slate-100 px-5 py-3">
          <p class="text-sm font-semibold text-slate-600">Showing {{ totalExchanges }} requests</p>
          <span class="text-xs text-slate-500">Auto-updated</span>
        </div>
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-slate-100 text-sm">
            <thead class="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500">
              <tr>
                <th class="px-4 py-3 text-left">#</th>
                <th class="px-4 py-3 text-left">Created Date</th>
                <th class="px-4 py-3 text-left">Holiday / Weekend</th>
                <th class="px-4 py-3 text-left">Exchange Date</th>
                <th class="px-4 py-3 text-left">Attachment</th>
                <th class="px-4 py-3 text-left">Status</th>
                <th class="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr
                v-for="(exchange, index) in myExchanges"
                :key="exchange?.id"
                class="hover:bg-slate-50 transition"
              >
                <td class="px-4 py-3 font-semibold text-slate-600">{{ index + 1 }}</td>
                <td class="px-4 py-3 text-slate-700">{{ formatDate(exchange?.created_at) }}</td>
                <td class="px-4 py-3 text-slate-700">{{ formatDate(exchange?.current_date) }}</td>
                <td class="px-4 py-3 text-slate-700">{{ formatDate(exchange?.exchange_date) }}</td>
                <td class="px-4 py-3">
                  <a
                    v-if="exchange?.attachment && typeof exchange?.attachment === 'string'"
                    :href="exchange.attachment"
                    target="_blank"
                    class="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:underline"
                  >
                    <i class="far fa-paperclip"></i>
                    View
                  </a>
                  <span v-else class="text-xs text-slate-400">None</span>
                </td>
                <td class="px-4 py-3">
                  <span
                    :class="['inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold tracking-wide', statusBadgeClass(exchange?.status)]"
                  >
                    {{ exchange?.status || 'Pending' }}
                  </span>
                </td>
                <td class="px-4 py-3">
                  <div class="flex items-center justify-end gap-2">
                    <RouterLink
                      :to="{ name: 'ExchangeOffdayShow', params: { id: exchange?.id } }"
                      class="inline-flex items-center rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-indigo-200 hover:text-indigo-700"
                    >
                      <i class="far fa-eye mr-1"></i>
                      View
                    </RouterLink>
                    <button
                      v-if="exchange.status == 'Pending' || !exchange.status"
                      type="button"
                      @click="deleteApplication(exchange?.id)"
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
