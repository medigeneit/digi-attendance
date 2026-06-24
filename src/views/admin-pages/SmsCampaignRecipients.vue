<script setup>
import PaginationBar from '@/components/PaginationBar.vue'
import { useSmsCampaignStore } from '@/stores/smsCampaign'
import { storeToRefs } from 'pinia'
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()
const store = useSmsCampaignStore()
const { campaign, recipients, recipientsMeta, recipientsLoading } = storeToRefs(store)

const campaignId = computed(() => route.params.id)

const search = ref('')
const statusFilter = ref('')

const statusOptions = [
  { value: '',        label: 'All',     icon: 'fa-list',              cls: 'text-slate-600 border-slate-200 bg-white' },
  { value: 'PENDING', label: 'Pending', icon: 'fa-clock',             cls: 'text-amber-700  border-amber-200  bg-amber-50' },
  { value: 'SENT',    label: 'Sent',    icon: 'fa-circle-check',      cls: 'text-emerald-700 border-emerald-200 bg-emerald-50' },
  { value: 'FAILED',  label: 'Failed',  icon: 'fa-circle-exclamation',cls: 'text-rose-700   border-rose-200   bg-rose-50' },
]

const fetch = (page = 1) => {
  store.fetchRecipients(campaignId.value, {
    page,
    search: search.value || undefined,
    status: statusFilter.value || undefined,
  })
}

onMounted(async () => {
  if (!campaign.value || String(campaign.value.id) !== String(campaignId.value)) {
    await store.fetchCampaign(campaignId.value)
  }
  fetch()
})

let searchTimer = null
watch(search, () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => fetch(1), 350)
})
watch(statusFilter, () => fetch(1))

const handlePageChange = (page) => fetch(page)

const statusBadge = (status) => {
  const map = {
    PENDING: { cls: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',     icon: 'fa-clock',              label: 'Pending' },
    SENT:    { cls: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200', icon: 'fa-circle-check',       label: 'Sent' },
    FAILED:  { cls: 'bg-rose-50 text-rose-700 ring-1 ring-rose-200',          icon: 'fa-circle-exclamation', label: 'Failed' },
  }
  return map[status] || { cls: 'bg-slate-50 text-slate-600 ring-1 ring-slate-200', icon: 'fa-circle', label: status }
}

const serialOffset = computed(() => (Number(recipientsMeta.value.page || 1) - 1) * Number(recipientsMeta.value.per_page || 50))
</script>

<template>
  <div class="mx-auto max-w-5xl px-4 md:px-6 py-6 space-y-5">

    <!-- Header -->
    <div class="space-y-1">
      <RouterLink
        :to="`/sms-campaigns/${campaignId}`"
        class="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:underline"
      >
        <i class="far fa-arrow-left text-[10px]"></i> Back to Event
      </RouterLink>
      <div class="flex items-start justify-between gap-3">
        <div>
          <h1 class="text-xl font-semibold text-slate-900">Delivery Log</h1>
          <p v-if="campaign" class="text-xs text-slate-400 mt-0.5">{{ campaign.name }}</p>
        </div>
        <div class="text-right text-xs text-slate-400 shrink-0">
          <div class="font-semibold text-slate-600 text-sm">{{ recipientsMeta.total }}</div>
          <div>total recipients</div>
        </div>
      </div>
    </div>

    <!-- Filters -->
    <div class="flex flex-col sm:flex-row gap-2 sm:items-center">
      <!-- Status tabs -->
      <div class="flex gap-1 flex-wrap">
        <button
          v-for="opt in statusOptions"
          :key="opt.value"
          type="button"
          @click="statusFilter = opt.value"
          class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition"
          :class="statusFilter === opt.value
            ? opt.cls + ' shadow-sm font-semibold'
            : 'text-slate-500 border-slate-200 bg-white hover:bg-slate-50'"
        >
          <i class="far text-[10px]" :class="opt.icon"></i>
          {{ opt.label }}
        </button>
      </div>

      <!-- Search -->
      <div class="relative sm:ml-auto sm:w-56">
        <i class="far fa-search absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
        <input
          v-model.trim="search"
          type="text"
          placeholder="Search phone..."
          class="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
        />
      </div>
    </div>

    <!-- Table -->
    <div class="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div class="overflow-auto max-h-[70vh]">
        <table class="w-full text-[12px]">
          <colgroup>
            <col class="w-10" />
            <col class="w-48" />
            <col class="w-36" />
            <col class="w-24" />
            <col />
          </colgroup>
          <thead class="sticky top-0 z-10 bg-slate-50 text-left text-[10.5px] font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th class="px-3 py-2.5">SL</th>
              <th class="px-3 py-2.5">Name</th>
              <th class="px-3 py-2.5">Phone</th>
              <th class="px-3 py-2.5">Status</th>
              <th class="px-3 py-2.5">Provider Response</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <!-- Loading -->
            <template v-if="recipientsLoading">
              <tr v-for="n in 10" :key="`sk-${n}`" class="animate-pulse">
                <td class="px-3 py-2.5"><div class="h-3 w-5 rounded bg-slate-100"></div></td>
                <td class="px-3 py-2.5"><div class="h-3 w-32 rounded bg-slate-100"></div></td>
                <td class="px-3 py-2.5"><div class="h-3 w-24 rounded bg-slate-100"></div></td>
                <td class="px-3 py-2.5"><div class="h-4 w-16 rounded-full bg-slate-100"></div></td>
                <td class="px-3 py-2.5"><div class="h-3 w-40 rounded bg-slate-100"></div></td>
              </tr>
            </template>

            <!-- Empty -->
            <tr v-else-if="!recipients.length">
              <td colspan="5" class="px-3 py-12 text-center">
                <div class="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                  <i class="far fa-inbox text-lg"></i>
                </div>
                <p class="text-xs font-medium text-slate-500">No recipients found.</p>
                <p class="text-[11px] text-slate-400 mt-0.5">Try adjusting the search or status filter.</p>
              </td>
            </tr>

            <!-- Rows -->
            <tr
              v-else
              v-for="(r, index) in recipients"
              :key="r.id"
              class="hover:bg-slate-50 transition"
            >
              <td class="px-3 py-2.5 text-slate-400 font-medium">{{ serialOffset + index + 1 }}</td>

              <td class="px-3 py-2.5">
                <div class="font-medium text-slate-700 truncate max-w-[180px]">
                  {{ r.user?.name || '—' }}
                </div>
                <div v-if="!r.user?.name" class="text-[11px] text-slate-400">External</div>
              </td>

              <td class="px-3 py-2.5 font-mono text-slate-500">{{ r.phone }}</td>

              <td class="px-3 py-2.5">
                <span
                  class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold"
                  :class="statusBadge(r.send_status).cls"
                >
                  <i class="fas text-[9px]" :class="statusBadge(r.send_status).icon"></i>
                  {{ statusBadge(r.send_status).label }}
                </span>
              </td>

              <td class="px-3 py-2.5 text-slate-400 max-w-xs">
                <span v-if="r.provider_response" class="truncate block max-w-[260px]" :title="r.provider_response">
                  {{ r.provider_response }}
                </span>
                <span v-else class="text-slate-300">—</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <PaginationBar
      v-if="recipientsMeta.total > recipientsMeta.per_page"
      :page="recipientsMeta.page"
      :per-page="recipientsMeta.per_page"
      :total="recipientsMeta.total"
      :last-page="recipientsMeta.last_page"
      @page-change="handlePageChange"
    />
  </div>
</template>
