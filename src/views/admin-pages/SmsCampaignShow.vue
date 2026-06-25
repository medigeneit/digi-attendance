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
    if (!isActive.value) { stopPolling(); return }
    await load()
  }, 4000)
}
const stopPolling = () => { if (pollTimer) clearInterval(pollTimer); pollTimer = null }

onMounted(async () => {
  await Promise.all([load(), companyStore.fetchCompanies(), departmentStore.fetchDepartments()])
  if (isActive.value) startPolling()
})
onUnmounted(stopPolling)

const formatDateTime = (value) => {
  if (!value) return '-'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '-'
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
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
    draft:   { label: 'Draft',   cls: 'bg-slate-100 text-slate-700 border-slate-300',   icon: 'fa-pen-to-square',    dot: 'bg-slate-400' },
    queued:  { label: 'Queued',  cls: 'bg-amber-50  text-amber-700  border-amber-300',   icon: 'fa-clock',            dot: 'bg-amber-400' },
    sending: { label: 'Sending', cls: 'bg-amber-50  text-amber-700  border-amber-300',   icon: 'fa-spinner fa-spin',  dot: 'bg-amber-400' },
    sent:    { label: 'Sent',    cls: 'bg-emerald-50 text-emerald-700 border-emerald-300',icon: 'fa-circle-check',    dot: 'bg-emerald-500' },
    failed:  { label: 'Failed',  cls: 'bg-rose-50   text-rose-700   border-rose-300',    icon: 'fa-circle-exclamation',dot: 'bg-rose-500' },
  }
  return map[campaign.value?.status] ?? { label: campaign.value?.status || '-', cls: 'bg-slate-100 text-slate-600 border-slate-200', icon: 'fa-circle', dot: 'bg-slate-400' }
})

const deliveryCounts = computed(() => ({
  pending: Number(recipientStatusCounts.value.PENDING || 0),
  sent:    Number(recipientStatusCounts.value.SENT    || 0),
  failed:  Number(recipientStatusCounts.value.FAILED  || 0),
}))
const deliveryTotal = computed(() => {
  const t = deliveryCounts.value.pending + deliveryCounts.value.sent + deliveryCounts.value.failed
  return t || campaign.value?.recipient_count || 0
})
const pct = (key) => deliveryTotal.value ? Math.round((deliveryCounts.value[key] / deliveryTotal.value) * 100) : 0

const employeeTypeLabels = { doctor: 'Doctor', academy_body: 'Academy Body', executive: 'Executive', support_staff: 'Support Staff' }

const targetingChips = computed(() => {
  const filters = campaign.value?.filters_json || {}
  const chips = []
  const companyMap = new Map((companies.value || []).map((c) => [c.id, c.name]))
  const deptMap    = new Map((departmentStore.departments || []).map((d) => [d.id, d.name]))

  ;(filters.company_ids    || []).forEach((id) => chips.push({ key: `c${id}`, label: companyMap.get(id) || `Company #${id}`, icon: 'fa-building',   color: 'blue' }))
  ;(filters.department_ids || []).forEach((id) => chips.push({ key: `d${id}`, label: deptMap.get(id)    || `Dept #${id}`,    icon: 'fa-sitemap',    color: 'blue' }))
  ;(filters.employee_types || []).forEach((t)  => chips.push({ key: `t${t}`,  label: employeeTypeLabels[t] || t,             icon: 'fa-id-badge',   color: 'blue' }))
  if (filters.employee_ids?.length)    chips.push({ key: 'emp',     label: `${filters.employee_ids.length} specific employee(s)`,  icon: 'fa-user-check',  color: 'blue' })
  if (filters.include_inactive)        chips.push({ key: 'inactive', label: 'Includes inactive employees',                         icon: 'fa-user-clock',  color: 'slate' })
  if (filters.external_phones?.length) chips.push({ key: 'ext',     label: `${filters.external_phones.length} external number(s)`, icon: 'fa-phone',       color: 'emerald' })
  return chips
})

const GSM7_REGEX = /^[A-Za-z0-9 \r\n@£$¥èéùìòÇØøÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ!"#¤%&'()*+,\-./:;<=>?¡ÄÖÑÜ§¿äöñüà^{}\\[~\]|€]*$/
const msgLen = computed(() => campaign.value?.message?.length || 0)
const isGsm7 = computed(() => GSM7_REGEX.test(campaign.value?.message || ''))
const smsPartCount = computed(() => {
  if (!msgLen.value) return 0
  const limit = isGsm7.value ? 160 : 70
  const multi = isGsm7.value ? 153 : 67
  return msgLen.value <= limit ? 1 : Math.ceil(msgLen.value / multi)
})
</script>

<template>
  <div class="mx-auto max-w-4xl px-4 md:px-6 py-6 space-y-5">

    <!-- Top nav bar -->
    <div class="flex items-center justify-between gap-3">
      <RouterLink to="/sms-campaigns" class="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-blue-600 transition">
        <i class="far fa-arrow-left text-xs"></i>
        <span>Back to Events</span>
      </RouterLink>

      <div class="flex items-center gap-2">
        <span
          v-if="campaign"
          class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-semibold"
          :class="statusMeta.cls"
        >
          <span class="h-1.5 w-1.5 rounded-full" :class="statusMeta.dot"></span>
          <i class="fas text-[10px]" :class="statusMeta.icon"></i>
          {{ statusMeta.label }}
        </span>

        <span v-if="isActive" class="inline-flex items-center gap-1 text-xs text-amber-600 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">
          <i class="far fa-arrows-rotate fa-spin text-[10px]"></i> Live
        </span>

        <RouterLink
          :to="`/sms-campaigns/${campaignId}/recipients`"
          class="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 bg-white text-sm text-slate-600 hover:bg-slate-50 transition"
        >
          <i class="far fa-list-alt"></i>
          Delivery Log
        </RouterLink>

        <button
          v-if="canSend"
          :disabled="sending"
          @click="showSendConfirm = true"
          class="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-white text-sm font-semibold shadow-sm bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition"
        >
          <i class="far" :class="sending ? 'fa-spinner fa-spin' : 'fa-paper-plane'"></i>
          {{ sending ? 'Queuing...' : 'Send Event' }}
        </button>
      </div>
    </div>

    <LoaderView v-if="showLoading && !campaign" />

    <template v-else-if="campaign">

      <!-- Hero card: name + meta + stat strip -->
      <section class="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <!-- Top band with gradient -->
        <div class="bg-gradient-to-r from-blue-600 to-blue-500 px-5 py-4">
          <h1 class="text-lg font-bold text-white leading-tight">{{ campaign.name }}</h1>
          <p class="text-blue-100 text-xs mt-0.5">
            Created by <span class="font-medium text-white">{{ campaign.creator?.name || '—' }}</span>
            · {{ formatDateTime(campaign.created_at) }}
          </p>
        </div>

        <!-- Stat strip -->
        <div class="grid grid-cols-4 divide-x divide-slate-100 border-t border-slate-100">
          <div class="p-3 text-center">
            <div class="text-[10px] uppercase tracking-wide text-slate-400 mb-0.5">Total</div>
            <div class="text-xl font-bold text-slate-800">{{ campaign.recipient_count }}</div>
            <div class="text-[10px] text-slate-400">recipients</div>
          </div>
          <div class="p-3 text-center">
            <div class="text-[10px] uppercase tracking-wide text-slate-400 mb-0.5">Pending</div>
            <div class="text-xl font-bold text-slate-600">{{ deliveryCounts.pending }}</div>
            <div class="text-[10px] text-slate-400">waiting</div>
          </div>
          <div class="p-3 text-center">
            <div class="text-[10px] uppercase tracking-wide text-slate-400 mb-0.5">Sent</div>
            <div class="text-xl font-bold text-emerald-600">{{ deliveryCounts.sent }}</div>
            <div class="text-[10px] text-slate-400">delivered</div>
          </div>
          <div class="p-3 text-center">
            <div class="text-[10px] uppercase tracking-wide text-slate-400 mb-0.5">Failed</div>
            <div class="text-xl font-bold text-rose-600">{{ deliveryCounts.failed }}</div>
            <div class="text-[10px] text-slate-400">errors</div>
          </div>
        </div>
      </section>

      <!-- Two-col layout -->
      <div class="grid md:grid-cols-5 gap-5">

        <!-- Left: SMS content -->
        <div class="md:col-span-3 space-y-5">

          <!-- SMS bubble card -->
          <section class="rounded-2xl border border-slate-200 bg-white shadow-sm p-5 space-y-3">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <span class="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-100 text-purple-600">
                  <i class="fas fa-comment-alt text-xs"></i>
                </span>
                SMS Message
              </div>
              <span class="text-[11px] font-mono text-slate-400 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-full">
                {{ msgLen }} chars · {{ smsPartCount }} SMS{{ smsPartCount !== 1 ? ' parts' : '' }}
              </span>
            </div>

            <!-- Styled SMS bubble -->
            <div class="rounded-xl bg-slate-50 border border-slate-200 px-4 py-3 relative">
              <div class="absolute -top-px left-5 h-px w-8 bg-blue-400 rounded-full opacity-50"></div>
              <p class="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">{{ campaign.message }}</p>
            </div>
          </section>

          <!-- Targeting / Audience -->
          <section v-if="targetingChips.length" class="rounded-2xl border border-slate-200 bg-white shadow-sm p-5 space-y-3">
            <div class="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <span class="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                <i class="fas fa-filter text-xs"></i>
              </span>
              Audience Filters
            </div>
            <div class="flex flex-wrap gap-1.5">
              <span
                v-for="chip in targetingChips"
                :key="chip.key"
                class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium border"
                :class="{
                  'bg-blue-50 border-blue-100 text-blue-700': chip.color === 'blue',
                  'bg-emerald-50 border-emerald-100 text-emerald-700': chip.color === 'emerald',
                  'bg-slate-50 border-slate-200 text-slate-600': chip.color === 'slate',
                }"
              >
                <i class="fas text-[10px]" :class="chip.icon"></i>
                {{ chip.label }}
              </span>
            </div>
          </section>

        </div>

        <!-- Right: delivery status -->
        <div class="md:col-span-2 space-y-5">

          <section class="rounded-2xl border border-slate-200 bg-white shadow-sm p-5 space-y-4">
            <div class="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <span class="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
                <i class="fas fa-chart-pie text-xs"></i>
              </span>
              Delivery Status
            </div>

            <!-- Segmented progress bar -->
            <div class="space-y-1.5">
              <div class="h-4 w-full rounded-full bg-slate-100 overflow-hidden flex gap-0.5 p-0.5">
                <div
                  class="h-full rounded-full bg-emerald-500 transition-all duration-700"
                  :style="{ width: pct('sent') + '%' }"
                ></div>
                <div
                  class="h-full rounded-full bg-rose-500 transition-all duration-700"
                  :style="{ width: pct('failed') + '%' }"
                ></div>
              </div>
              <div class="flex justify-between text-[11px] text-slate-400">
                <span>{{ pct('sent') + pct('failed') }}% processed</span>
                <span>{{ deliveryTotal }} total</span>
              </div>
            </div>

            <!-- Stat rows -->
            <div class="space-y-2">
              <div class="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2.5">
                <div class="flex items-center gap-2 text-xs text-slate-500">
                  <i class="far fa-clock w-4 text-center text-slate-400"></i>
                  Pending
                </div>
                <span class="text-sm font-bold text-slate-700 tabular-nums">{{ deliveryCounts.pending }}</span>
              </div>
              <div class="flex items-center justify-between rounded-lg bg-emerald-50 border border-emerald-100 px-3 py-2.5">
                <div class="flex items-center gap-2 text-xs text-emerald-700">
                  <i class="far fa-circle-check w-4 text-center text-emerald-500"></i>
                  Sent
                </div>
                <span class="text-sm font-bold text-emerald-700 tabular-nums">{{ deliveryCounts.sent }}</span>
              </div>
              <div class="flex items-center justify-between rounded-lg bg-rose-50 border border-rose-100 px-3 py-2.5">
                <div class="flex items-center gap-2 text-xs text-rose-700">
                  <i class="far fa-circle-exclamation w-4 text-center text-rose-500"></i>
                  Failed
                </div>
                <span class="text-sm font-bold text-rose-700 tabular-nums">{{ deliveryCounts.failed }}</span>
              </div>
            </div>

            <!-- Success rate -->
            <div v-if="deliveryTotal > 0 && !isActive" class="rounded-lg bg-slate-50 border border-slate-100 px-3 py-2 flex items-center justify-between text-xs text-slate-500">
              <span>Success rate</span>
              <span class="font-bold" :class="pct('sent') >= 80 ? 'text-emerald-600' : pct('sent') >= 50 ? 'text-amber-600' : 'text-rose-600'">
                {{ pct('sent') }}%
              </span>
            </div>
          </section>

        </div>
      </div>

    </template>

    <DeleteModal
      :show="showSendConfirm"
      title="Send Event?"
      :message="`This will queue '${campaign?.name}' for sending to ${campaign?.recipient_count} recipient(s) right away. This cannot be undone.`"
      @close="showSendConfirm = false"
      @confirm="sendCampaign"
    />
  </div>
</template>
