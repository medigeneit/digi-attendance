<script setup>
import LoaderView from '@/components/common/LoaderView.vue'
import DeleteModal from '@/components/common/DeleteModal.vue'
import { useCompanyStore } from '@/stores/company'
import { useDepartmentStore } from '@/stores/department'
import { useSmsCampaignStore } from '@/stores/smsCampaign'
import { storeToRefs } from 'pinia'
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useToast } from 'vue-toastification'

const toast = useToast()
const route = useRoute()
const campaignStore = useSmsCampaignStore()
const companyStore = useCompanyStore()
const departmentStore = useDepartmentStore()
const { campaign, recipientStatusCounts, showLoading, sending } = storeToRefs(campaignStore)
const { companies } = storeToRefs(companyStore)

const campaignId = computed(() => route.params.id)

const load = () => campaignStore.fetchCampaign(campaignId.value)

let pollTimer = null
const isActive = computed(() => ['queued', 'sending'].includes(campaign.value?.status))

const startPolling = () => {
  stopPolling()
  pollTimer = setInterval(async () => {
    if (!isActive.value) {
      stopPolling()
      return
    }
    await load()
  }, 4000)
}
const stopPolling = () => {
  if (pollTimer) clearInterval(pollTimer)
  pollTimer = null
}

onMounted(async () => {
  await Promise.all([load(), companyStore.fetchCompanies(), departmentStore.fetchDepartments()])
  if (isActive.value) startPolling()
})
onUnmounted(stopPolling)

const formatDateTime = (value) => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const canSend = computed(() => campaign.value?.status === 'draft')
const showSendConfirm = ref(false)

const sendCampaign = async () => {
  try {
    await campaignStore.sendCampaign(campaignId.value)
    toast.success('Event queued for sending.')
    await load()
    if (isActive.value) startPolling()
  } catch (e) {
    toast.error(e?.response?.data?.message || 'Failed to queue event for sending.')
  }
}

const statusMeta = computed(() => {
  const map = {
    draft: { label: 'Draft', cls: 'bg-slate-100 text-slate-700 border-slate-200', icon: 'fa-pen-to-square' },
    queued: { label: 'Queued', cls: 'bg-amber-50 text-amber-700 border-amber-200', icon: 'fa-clock' },
    sending: { label: 'Sending', cls: 'bg-amber-50 text-amber-700 border-amber-200', icon: 'fa-spinner fa-spin' },
    sent: { label: 'Sent', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: 'fa-circle-check' },
    failed: { label: 'Failed', cls: 'bg-rose-50 text-rose-700 border-rose-200', icon: 'fa-circle-exclamation' },
  }
  return map[campaign.value?.status] || { label: campaign.value?.status || '-', cls: 'bg-slate-100 text-slate-600 border-slate-200', icon: 'fa-circle' }
})

const deliveryCounts = computed(() => ({
  pending: Number(recipientStatusCounts.value.PENDING || 0),
  sent: Number(recipientStatusCounts.value.SENT || 0),
  failed: Number(recipientStatusCounts.value.FAILED || 0),
}))
const deliveryTotal = computed(() => {
  const total = deliveryCounts.value.pending + deliveryCounts.value.sent + deliveryCounts.value.failed
  return total || campaign.value?.recipient_count || 0
})
const deliveryPercent = (key) => {
  if (!deliveryTotal.value) return 0
  return Math.round((deliveryCounts.value[key] / deliveryTotal.value) * 100)
}

const employeeTypeLabels = {
  doctor: 'Doctor',
  academy_body: 'Academy Body',
  executive: 'Executive',
  support_staff: 'Support Staff',
}

const targetingChips = computed(() => {
  const filters = campaign.value?.filters_json || {}
  const chips = []

  const companyMap = new Map((companies.value || []).map((c) => [c.id, c.name]))
  const deptMap = new Map((departmentStore.departments || []).map((d) => [d.id, d.name]))

  ;(filters.company_ids || []).forEach((id) =>
    chips.push({ key: `c${id}`, label: companyMap.get(id) || `Company #${id}`, icon: 'fa-building' }),
  )
  ;(filters.department_ids || []).forEach((id) =>
    chips.push({ key: `d${id}`, label: deptMap.get(id) || `Department #${id}`, icon: 'fa-sitemap' }),
  )
  ;(filters.employee_types || []).forEach((t) =>
    chips.push({ key: `t${t}`, label: employeeTypeLabels[t] || t, icon: 'fa-id-badge' }),
  )
  if (filters.employee_ids?.length) {
    chips.push({ key: 'emp', label: `${filters.employee_ids.length} specific employee(s)`, icon: 'fa-user-check' })
  }
  if (filters.include_inactive) {
    chips.push({ key: 'inactive', label: 'Includes inactive employees', icon: 'fa-user-clock' })
  }
  if (filters.external_phones?.length) {
    chips.push({ key: 'ext', label: `${filters.external_phones.length} external number(s)`, icon: 'fa-phone' })
  }

  return chips
})
</script>

<template>
  <div class="mx-auto max-w-4xl px-4 md:px-6 py-6 space-y-6">
    <div class="flex items-center justify-between">
      <RouterLink to="/sms-campaigns" class="text-sm text-blue-600 hover:underline inline-flex items-center gap-1">
        <i class="far fa-arrow-left"></i> Back to Events
      </RouterLink>
      <button
        v-if="canSend"
        :disabled="sending"
        @click="showSendConfirm = true"
        class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-semibold shadow-sm bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
      >
        <i class="far" :class="sending ? 'fa-spinner fa-spin' : 'fa-paper-plane'"></i>
        {{ sending ? 'Queuing...' : 'Send Event' }}
      </button>
    </div>

    <LoaderView v-if="showLoading && !campaign" />

    <div v-else-if="campaign" class="space-y-6">
      <!-- Header card -->
      <section class="rounded-2xl border border-slate-200 bg-white/70 p-5 shadow-sm space-y-4">
        <div class="flex items-start justify-between gap-3">
          <div>
            <h1 class="text-xl font-semibold text-slate-900">{{ campaign.name }}</h1>
            <p class="text-xs text-gray-500 mt-0.5">
              Created by <span class="font-medium text-slate-600">{{ campaign.creator?.name || '-' }}</span>
              on {{ formatDateTime(campaign.created_at) }}
            </p>
          </div>
          <span
            class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-semibold shrink-0"
            :class="statusMeta.cls"
          >
            <i class="fas" :class="statusMeta.icon"></i>
            {{ statusMeta.label }}
          </span>
        </div>

        <!-- Message preview bubble -->
        <div class="rounded-xl bg-slate-50 border border-slate-200 p-4">
          <div class="flex items-center gap-2 mb-2 text-xs text-gray-500">
            <i class="far fa-comment-sms"></i>
            <span>SMS Content</span>
          </div>
          <p class="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">{{ campaign.message }}</p>
        </div>

        <div class="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
          <div class="rounded-xl border border-slate-100 p-3">
            <div class="text-[11px] uppercase tracking-wide text-gray-500">Recipients</div>
            <div class="font-semibold text-slate-900 text-lg">{{ campaign.recipient_count }}</div>
          </div>
          <div class="rounded-xl border border-slate-100 p-3">
            <div class="text-[11px] uppercase tracking-wide text-gray-500">Sent</div>
            <div class="font-semibold text-emerald-700 text-lg">{{ deliveryCounts.sent }}</div>
          </div>
          <div class="rounded-xl border border-slate-100 p-3">
            <div class="text-[11px] uppercase tracking-wide text-gray-500">Failed</div>
            <div class="font-semibold text-rose-700 text-lg">{{ deliveryCounts.failed }}</div>
          </div>
        </div>

        <!-- Targeting summary -->
        <div v-if="targetingChips.length" class="pt-2 border-t border-slate-100">
          <div class="text-[11px] uppercase tracking-wide text-gray-500 mb-2">Targeting</div>
          <div class="flex flex-wrap gap-1.5">
            <span
              v-for="chip in targetingChips"
              :key="chip.key"
              class="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-50 border border-slate-200 text-[11px] text-slate-600"
            >
              <i class="fas text-slate-400" :class="chip.icon"></i>
              {{ chip.label }}
            </span>
          </div>
        </div>
      </section>

      <!-- Delivery status -->
      <section class="rounded-2xl border border-slate-200 bg-white/70 p-5 shadow-sm space-y-4">
        <div class="flex items-center justify-between">
          <h3 class="text-base font-semibold text-slate-800">Delivery Status</h3>
          <span v-if="isActive" class="inline-flex items-center gap-1.5 text-xs text-amber-600">
            <i class="far fa-arrows-rotate fa-spin"></i> Auto-refreshing...
          </span>
        </div>

        <!-- Progress bar -->
        <div class="space-y-1.5">
          <div class="h-3 w-full rounded-full bg-slate-100 overflow-hidden flex">
            <div
              class="h-full bg-emerald-500 transition-all"
              :style="{ width: deliveryPercent('sent') + '%' }"
              :title="`Sent: ${deliveryCounts.sent}`"
            ></div>
            <div
              class="h-full bg-rose-500 transition-all"
              :style="{ width: deliveryPercent('failed') + '%' }"
              :title="`Failed: ${deliveryCounts.failed}`"
            ></div>
          </div>
          <div class="flex justify-between text-[11px] text-gray-500">
            <span>{{ deliveryPercent('sent') + deliveryPercent('failed') }}% processed</span>
            <span>{{ deliveryTotal }} total</span>
          </div>
        </div>

        <div class="grid grid-cols-3 gap-3 text-center">
          <div class="rounded-xl border border-slate-200 p-3">
            <i class="far fa-clock text-slate-400 mb-1"></i>
            <div class="text-[11px] uppercase text-gray-500">Pending</div>
            <div class="text-lg font-semibold text-slate-700">{{ deliveryCounts.pending }}</div>
          </div>
          <div class="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
            <i class="far fa-circle-check text-emerald-500 mb-1"></i>
            <div class="text-[11px] uppercase text-emerald-700">Sent</div>
            <div class="text-lg font-semibold text-emerald-700">{{ deliveryCounts.sent }}</div>
          </div>
          <div class="rounded-xl border border-rose-200 bg-rose-50 p-3">
            <i class="far fa-circle-exclamation text-rose-500 mb-1"></i>
            <div class="text-[11px] uppercase text-rose-700">Failed</div>
            <div class="text-lg font-semibold text-rose-700">{{ deliveryCounts.failed }}</div>
          </div>
        </div>
      </section>
    </div>

    <DeleteModal
      :show="showSendConfirm"
      title="Send Event?"
      :message="`This will queue '${campaign?.name}' for sending to ${campaign?.recipient_count} recipient(s) right away. This cannot be undone.`"
      @close="showSendConfirm = false"
      @confirm="sendCampaign"
    />
  </div>
</template>
