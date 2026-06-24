<script setup>
import PaginationBar from '@/components/PaginationBar.vue'
import { useSmsCampaignStore } from '@/stores/smsCampaign'
import { storeToRefs } from 'pinia'
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const campaignStore = useSmsCampaignStore()
const { campaigns, meta, statusCounts, loading } = storeToRefs(campaignStore)

const search = ref('')
const statusFilter = ref('')

const statCards = computed(() => {
  const counts = statusCounts.value || {}
  const sum = (keys) => keys.reduce((total, k) => total + (Number(counts[k]) || 0), 0)
  return [
    { key: '', label: 'Total', value: sum(['draft', 'queued', 'sending', 'sent', 'failed']), icon: 'fa-comment-sms', classes: 'bg-blue-50 text-blue-600' },
    { key: 'draft', label: 'Drafts', value: sum(['draft']), icon: 'fa-pen-to-square', classes: 'bg-slate-100 text-slate-600' },
    { key: 'sending', label: 'In Progress', value: sum(['queued', 'sending']), icon: 'fa-paper-plane', classes: 'bg-amber-50 text-amber-600' },
    { key: 'sent', label: 'Sent', value: sum(['sent']), icon: 'fa-circle-check', classes: 'bg-emerald-50 text-emerald-600' },
    { key: 'failed', label: 'Failed', value: sum(['failed']), icon: 'fa-circle-exclamation', classes: 'bg-rose-50 text-rose-600' },
  ]
})

const fetch = (page = 1) => {
  campaignStore.fetchCampaigns({
    page,
    search: search.value || undefined,
    status: statusFilter.value || undefined,
  })
}

onMounted(() => fetch())

let searchTimer = null
watch(search, () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => fetch(1), 350)
})

const selectStatCard = (key) => {
  statusFilter.value = statusFilter.value === key ? '' : key
}
watch(statusFilter, () => fetch(1))

const handlePageChange = (page) => fetch(page)

const statusPill = (status) => {
  const map = {
    draft: 'bg-slate-100 text-slate-700 ring-1 ring-slate-200',
    queued: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
    sending: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
    sent: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
    failed: 'bg-rose-50 text-rose-700 ring-1 ring-rose-200',
  }
  return map[status] || 'bg-zinc-50 text-zinc-700 ring-1 ring-zinc-200'
}
const statusIcon = (status) => {
  const map = {
    draft: 'fa-pen-to-square',
    queued: 'fa-clock',
    sending: 'fa-spinner fa-spin',
    sent: 'fa-circle-check',
    failed: 'fa-circle-exclamation',
  }
  return map[status] || 'fa-circle'
}

const formatDateTime = (value) => {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) +
    ' ' + date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}

const initials = (name) => {
  const s = String(name || '').trim()
  if (!s) return '—'
  return s.split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('')
}

const serialOffset = computed(() => (Number(meta.value.page || 1) - 1) * Number(meta.value.per_page || 20))

const openCampaign = (c) => router.push(`/sms-campaigns/${c.id}`)
</script>

<template>
  <div class="mx-auto max-w-6xl px-4 md:px-6 py-5 space-y-4">
    <!-- Header -->
    <div class="flex flex-wrap items-center justify-between gap-2">
      <div>
        <h1 class="text-lg md:text-xl font-semibold tracking-tight text-zinc-900">Bulk SMS Events</h1>
        <p class="text-xs text-zinc-500">Send targeted SMS messages by company, department, type, or selection.</p>
      </div>
      <RouterLink
        to="/sms-campaigns-add"
        class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-white text-xs font-semibold shadow-sm bg-blue-600 hover:bg-blue-700 transition"
      >
        <i class="far fa-plus"></i>
        New Event
      </RouterLink>
    </div>

    <!-- Compact stat strip -->
    <div class="grid grid-cols-3 sm:grid-cols-5 gap-2">
      <button
        v-for="card in statCards"
        :key="card.label"
        type="button"
        @click="selectStatCard(card.key)"
        class="flex items-center gap-2 rounded-lg border bg-white px-3 py-2 text-left transition hover:shadow-sm"
        :class="statusFilter === card.key && card.key ? 'border-blue-300 ring-1 ring-blue-200' : 'border-zinc-200'"
      >
        <span class="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-xs" :class="card.classes">
          <i class="fas" :class="card.icon"></i>
        </span>
        <div class="min-w-0 leading-tight">
          <div class="text-sm font-bold text-zinc-900">{{ card.value }}</div>
          <div class="text-[10px] uppercase tracking-wide text-zinc-500 truncate">{{ card.label }}</div>
        </div>
      </button>
    </div>

    <!-- Filters -->
    <div class="flex flex-col sm:flex-row gap-2 sm:items-center">
      <div class="relative flex-1 max-w-sm">
        <i class="far fa-search absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400 text-xs"></i>
        <input
          v-model.trim="search"
          type="text"
          placeholder="Search events..."
          class="w-full pl-8 pr-3 py-1.5 rounded-lg border border-zinc-200 text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>
      <select
        v-model="statusFilter"
        class="px-2.5 py-1.5 rounded-lg border border-zinc-200 text-xs focus:ring-2 focus:ring-blue-500"
      >
        <option value="">All Statuses</option>
        <option value="draft">Draft</option>
        <option value="queued">Queued</option>
        <option value="sending">Sending</option>
        <option value="sent">Sent</option>
        <option value="failed">Failed</option>
      </select>
      <span v-if="meta.total" class="text-[11px] text-zinc-400 sm:ml-auto">{{ meta.total }} event{{ meta.total === 1 ? '' : 's' }}</span>
    </div>

    <!-- Data table -->
    <div class="rounded-xl border border-zinc-200 bg-white shadow-sm">
      <div class="max-h-[70vh] overflow-auto">
        <table class="w-full table-fixed text-[12px]">
          <colgroup>
            <col class="w-12" />
            <col class="w-[320px]" />
            <col class="w-28" />
            <col class="w-24" />
            <col class="w-40" />
            <col class="w-36" />
            <col class="w-20" />
          </colgroup>

          <thead class="sticky top-0 z-20 bg-zinc-50/95 backdrop-blur">
            <tr class="text-left text-[10.5px] font-semibold uppercase tracking-wide text-zinc-600">
              <th class="sticky left-0 z-30 bg-zinc-50/95 px-3 py-2">SL</th>
              <th class="px-3 py-2">Event</th>
              <th class="px-3 py-2">Status</th>
              <th class="px-3 py-2 text-right">Recipients</th>
              <th class="px-3 py-2">Created By</th>
              <th class="px-3 py-2">Created At</th>
              <th class="sticky right-0 z-30 bg-zinc-50/95 px-3 py-2 text-right border-l border-zinc-100">Action</th>
            </tr>
          </thead>

          <tbody class="divide-y divide-zinc-100">
            <!-- Loading skeleton -->
            <template v-if="loading">
              <tr v-for="n in 8" :key="`sk-${n}`" class="animate-pulse">
                <td class="sticky left-0 z-10 bg-white px-3 py-2"><div class="h-3 w-6 rounded bg-zinc-100" /></td>
                <td class="px-3 py-2"><div class="h-3 w-56 rounded bg-zinc-100" /></td>
                <td class="px-3 py-2"><div class="h-4 w-16 rounded-full bg-zinc-100" /></td>
                <td class="px-3 py-2"><div class="ml-auto h-3 w-10 rounded bg-zinc-100" /></td>
                <td class="px-3 py-2"><div class="h-3 w-24 rounded bg-zinc-100" /></td>
                <td class="px-3 py-2"><div class="h-3 w-28 rounded bg-zinc-100" /></td>
                <td class="sticky right-0 z-10 bg-white px-3 py-2 border-l border-zinc-100">
                  <div class="ml-auto h-6 w-14 rounded bg-zinc-100" />
                </td>
              </tr>
            </template>

            <!-- Empty state -->
            <tr v-else-if="!campaigns.length">
              <td colspan="7" class="px-3 py-12 text-center">
                <div class="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100 text-zinc-400">
                  <i class="far fa-comment-sms"></i>
                </div>
                <p class="text-xs font-medium text-zinc-600">No events found.</p>
                <p class="text-[11px] text-zinc-400 mt-0.5">
                  {{ search || statusFilter ? 'Try adjusting your search or filters.' : 'Create your first bulk SMS event to get started.' }}
                </p>
              </td>
            </tr>

            <!-- Data rows -->
            <tr
              v-for="(c, index) in campaigns"
              v-else
              :key="c.id"
              class="group cursor-pointer hover:bg-sky-50 focus-within:bg-sky-50"
              role="button"
              tabindex="0"
              @click="openCampaign(c)"
              @keydown.enter.prevent="openCampaign(c)"
            >
              <td class="sticky left-0 z-10 bg-white group-hover:bg-sky-50 px-3 py-2 font-medium text-zinc-500">
                {{ serialOffset + index + 1 }}
              </td>

              <td class="px-3 py-2">
                <div class="flex items-center gap-2 min-w-0">
                  <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-zinc-100 text-[10px] font-bold text-zinc-700">
                    {{ initials(c.name) }}
                  </span>
                  <div class="min-w-0">
                    <div class="truncate font-semibold text-zinc-900" :title="c.name">{{ c.name }}</div>
                    <div class="truncate text-[11px] text-zinc-500" :title="c.message">{{ c.message }}</div>
                  </div>
                </div>
              </td>

              <td class="px-3 py-2">
                <span class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize" :class="statusPill(c.status)">
                  <i class="fas" :class="statusIcon(c.status)"></i>
                  {{ c.status }}
                </span>
              </td>

              <td class="px-3 py-2 text-right font-medium tabular-nums text-zinc-800">{{ c.recipient_count }}</td>

              <td class="px-3 py-2 truncate text-zinc-700">{{ c.creator?.name || '—' }}</td>

              <td class="px-3 py-2 text-zinc-500 tabular-nums">{{ formatDateTime(c.created_at) }}</td>

              <td class="sticky right-0 z-10 bg-white group-hover:bg-sky-50 px-3 py-2 border-l border-zinc-100 text-right">
                <button
                  type="button"
                  class="inline-flex items-center justify-center rounded-md border border-zinc-200 bg-white px-2 py-1 text-[11px] font-semibold text-zinc-700 shadow-sm hover:bg-zinc-50"
                  @click.stop="openCampaign(c)"
                >
                  View
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <PaginationBar
      v-if="meta.total > 0"
      :page="meta.page"
      :per-page="meta.per_page"
      :total="meta.total"
      :last-page="meta.last_page"
      @page-change="handlePageChange"
    />
  </div>
</template>
