<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useWeeklyUpdatesStore } from '@/stores/useWeeklyUpdatesStore'
import EmployeeFilter from '@/components/common/EmployeeFilter.vue'
import { useRoute, useRouter } from 'vue-router'

const store = useWeeklyUpdatesStore()
const { loading, error, dates, rows, meta, params } = storeToRefs(store)
const route = useRoute()
const router = useRouter()

/* ---------------- UI state ---------------- */
const ui = ref({
  detailsOpen: false,
  selectedItem: null,

  smsOpen: false,
  smsMessage: '',
  smsTarget: null,

  busyKey: null,
  toast: null,
})

/* ---------------- sticky top offsets ----------------
   We have:
   1) sticky filter bar (EmployeeFilter)
   2) controls bar (Prev/Past/Future/Next/Anchor/Apply)
   Table THEAD should stick *below* both.
------------------------------------------------------ */
const stickyBarRef = ref(null)
const controlsRef = ref(null)
const headerTop = ref(0)
let ro = null

const calcHeaderTop = async () => {
  await nextTick()
  const stickyH = stickyBarRef.value?.offsetHeight || 0
  const controlsH = controlsRef.value?.offsetHeight || 0
  const gap = 12 // same as section gap
  headerTop.value = stickyH + controlsH + gap
}

const headerTopStyle = computed(() => ({
  top: `${headerTop.value}px`,
}))

/* ---------------- filters ---------------- */
const filters = ref({
  company_id: route.query.company_id || '',
  department_id: route.query.department_id || 'all',
  line_type: route.query.line_type || 'all',
  employee_id: route.query.employee_id || route.query.user_id || '',
})

/* ---------------- helpers ---------------- */
const clamp = (n, min, max) => Math.min(Math.max(Number(n) || 0, min), max)
const clampDays = (value, fallback) => {
  const num = Number(value)
  if (!Number.isFinite(num)) return fallback
  return clamp(num, 0, 60)
}

if (route.query.anchor_date) params.value.anchor_date = String(route.query.anchor_date)
if (route.query.past_days != null) params.value.past_days = clampDays(route.query.past_days, params.value.past_days)
if (route.query.future_days != null) params.value.future_days = clampDays(route.query.future_days, params.value.future_days)

const toDate = (value) => {
  if (value) {
    const [y, m, d] = String(value).split('-').map(Number)
    if (y && m && d) return new Date(y, m - 1, d)
  }
  return new Date()
}

const addDays = (date, delta) => {
  const next = new Date(date)
  next.setDate(next.getDate() + delta)
  return next
}

const formatIsoDate = (date) => {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

const formatDate = (value) => {
  if (!value) return ''
  const date = new Date(`${value}T00:00:00`)
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(date)
}
const formatDay = (value) => {
  if (!value) return ''
  const date = new Date(`${value}T00:00:00`)
  return new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(date)
}

const dayItems = (row, date) => row?.days?.[date] ?? []

const badgeClass = (item) => {
  const status = String(item?.status ?? '').toLowerCase()
  if (status.includes('pending')) return 'bg-amber-50 text-amber-700 ring-amber-200'
  if (status.includes('approved')) return 'bg-emerald-50 text-emerald-700 ring-emerald-200'
  if (status.includes('rejected')) return 'bg-rose-50 text-rose-700 ring-rose-200'
  return 'bg-slate-50 text-slate-700 ring-slate-200'
}

const toastClass = computed(() => {
  const t = ui.value.toast?.type
  if (t === 'success') return 'border-emerald-200 bg-emerald-50 text-emerald-800'
  if (t === 'error') return 'border-rose-200 bg-rose-50 text-rose-800'
  return 'border-slate-200 bg-slate-50 text-slate-800'
})

const canSendSms = computed(() => {
  const message = String(ui.value.smsMessage || '').trim()
  return !!message && !!ui.value.smsTarget?.item && !ui.value.busyKey
})

const metaRange = computed(() => {
  if (!meta.value?.start_date || !meta.value?.end_date) return ''
  return `${formatDate(meta.value.start_date)} - ${formatDate(meta.value.end_date)}`
})

const reportAnchorDate = computed(() => {
  const value = params.value.anchor_date || meta.value?.anchor_date
  return value ? toDate(value) : new Date()
})

const monthlyLeaveReportUrl = computed(() => {
  const date = reportAnchorDate.value
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const query = new URLSearchParams({
    company_id: filters.value.company_id || '',
    department_id: filters.value.department_id || 'all',
    line_type: filters.value.line_type || 'all',
    employee_id: filters.value.employee_id || '',
    year: String(year),
    month: String(month),
    strict_user: '0',
    per_page: '25',
    page: '1',
  })
  return `/reports/monthly-leave-report?${query.toString()}`
})

/* ---------------- query sync ---------------- */
const syncQuery = () => {
  router
    .replace({
      query: {
        ...route.query,
        company_id: filters.value.company_id || undefined,
        department_id: filters.value.department_id && filters.value.department_id !== 'all' ? filters.value.department_id : undefined,
        line_type: filters.value.line_type && filters.value.line_type !== 'all' ? filters.value.line_type : undefined,
        employee_id: filters.value.employee_id || undefined,
        anchor_date: params.value.anchor_date || undefined,
        past_days: params.value.past_days != null ? String(params.value.past_days) : undefined,
        future_days: params.value.future_days != null ? String(params.value.future_days) : undefined,
      },
    })
    .catch(() => {})
}

/* ---------------- fetch ---------------- */
const fetchNow = () => {
  store.fetchWeekly({
    company_id: filters.value.company_id || '',
    department_id: filters.value.department_id || 'all',
    line_type: filters.value.line_type || 'all',
    user_id: filters.value.employee_id || '',
    anchor_date: params.value.anchor_date,
    past_days: params.value.past_days,
    future_days: params.value.future_days,
    window: null,
  })
  syncQuery()
}

const applyRange = () => {
  params.value.past_days = clamp(params.value.past_days, 0, 60)
  params.value.future_days = clamp(params.value.future_days, 0, 60)
  fetchNow()
}

const onEmpFilterChange = () => fetchNow()

const shiftRange = (direction) => {
  const past = clamp(params.value.past_days, 0, 60)
  const future = clamp(params.value.future_days, 0, 60)
  const step = past + future + 1
  const base = toDate(params.value.anchor_date || meta.value?.anchor_date)
  const next = addDays(base, direction * step)
  params.value.anchor_date = formatIsoDate(next)
  fetchNow()
}

/* ---------------- details ---------------- */
const openDetails = (item) => {
  ui.value.selectedItem = item
  ui.value.detailsOpen = true
}

/* ---------------- toast ---------------- */
function showToast(type, text) {
  ui.value.toast = { type, text }
  window.clearTimeout(showToast._t)
  showToast._t = window.setTimeout(() => (ui.value.toast = null), 2500)
}

/* ---------------- LAST item selector ---------------- */
const getLastItem = (row) => {
  const ds = dates.value || []
  for (let i = ds.length - 1; i >= 0; i--) {
    const d = ds[i]
    const items = dayItems(row, d)
    if (items?.length) return items[items.length - 1]
  }
  return null
}

/* ---------------- SMS modal ---------------- */
const openSmsForRow = (row) => {
  const last = getLastItem(row)
  if (!last) return showToast('info', 'No application found in this range.')

  ui.value.smsTarget = { item: last, user: row?.user || null }
  ui.value.smsMessage = '' // if you want default message, set here
  ui.value.smsOpen = true
}

const closeSmsModal = () => {
  ui.value.smsOpen = false
  ui.value.smsMessage = ''
  ui.value.smsTarget = null
}

const sendForItem = async (item, message = '') => {
  if (!item?.kind || !item?.ref_id) return false

  const key = `${item.kind}:${item.ref_id}`
  ui.value.busyKey = key

  try {
    await store.sendWeeklyMessage({
      kind: item.kind,
      ref_id: item.ref_id,
      status: item.status,
      message, // optional if backend supports
    })
    showToast('success', `SMS sent (${item.code || item.kind} #${item.ref_id})`)
    return true
  } catch (e) {
    showToast('error', e?.response?.data?.message || 'Failed to send SMS.')
    return false
  } finally {
    ui.value.busyKey = null
  }
}

const sendSms = async () => {
  const item = ui.value.smsTarget?.item
  const message = String(ui.value.smsMessage || '').trim()

  if (!item) return
  if (!message) return showToast('error', 'Please write a message before sending.')

  const ok = await sendForItem(item, message)
  if (ok) closeSmsModal()
}

/* ---------------- lifecycle (sticky + fetch) ---------------- */
onMounted(async () => {
  // initial fetch
  fetchNow()

  // sticky top calc (needs DOM)
  await calcHeaderTop()

  // watch size changes of sticky sections
  if (typeof ResizeObserver !== 'undefined') {
    ro = new ResizeObserver(calcHeaderTop)
    if (stickyBarRef.value) ro.observe(stickyBarRef.value)
    if (controlsRef.value) ro.observe(controlsRef.value)
  } else {
    window.addEventListener('resize', calcHeaderTop)
  }
})

onBeforeUnmount(() => {
  if (ro) ro.disconnect()
  window.removeEventListener('resize', calcHeaderTop)
})
</script>

<template>
  <section class="space-y-3 px-4">
    <!-- Toast -->
    <div
      v-if="ui.toast"
      class="fixed right-4 top-4 z-[80] rounded-xl border px-4 py-2 text-sm shadow-sm"
      :class="toastClass"
    >
      {{ ui.toast.text }}
    </div>

    <!-- Filters (sticky) -->
    <div ref="stickyBarRef" class="sticky top-14 z-50">
      <!-- bg layer prevents “see-through” on scroll -->
      <div class="rounded-2xl border border-slate-200 bg-white/95 backdrop-blur p-3 shadow-sm">
        <EmployeeFilter
          v-model:company_id="filters.company_id"
          v-model:department_id="filters.department_id"
          v-model:employee_id="filters.employee_id"
          v-model:line_type="filters.line_type"
          :with-type="true"
          :initial-value="{ ...$route.query, employee_id: $route.query.employee_id || $route.query.user_id }"
          @filter-change="onEmpFilterChange"
          class="w-full"
        />
      </div>
    </div>

    <!-- Controls (also sticky, right under filters) -->
    <div ref="controlsRef">
      <div class="rounded-2xl border border-slate-200 bg-white/95 backdrop-blur p-3 shadow-sm">
        <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div class="flex flex-wrap items-center gap-2">
            <button
              type="button"
              class="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              @click="shiftRange(-1)"
              title="Previous range"
            >
              Prev
            </button>

            <div class="rounded-xl border border-slate-200 bg-slate-50/70 px-2 py-1">
              <div class="flex items-center gap-2">
                <label class="flex items-center gap-2 text-xs font-semibold text-slate-600">
                  Past
                  <input
                    v-model.number="params.past_days"
                    type="number"
                    min="0"
                    max="60"
                    class="w-14 rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs focus:border-slate-400 focus:outline-none"
                  />
                </label>

                <label class="flex items-center gap-2 text-xs font-semibold text-slate-600">
                  Future
                  <input
                    v-model.number="params.future_days"
                    type="number"
                    min="0"
                    max="60"
                    class="w-14 rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs focus:border-slate-400 focus:outline-none"
                  />
                </label>
              </div>
            </div>

            <button
              type="button"
              class="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              @click="shiftRange(1)"
              title="Next range"
            >
              Next
            </button>

            <label class="flex items-center gap-2 text-xs font-semibold text-slate-600">
              <input
                v-model="params.anchor_date"
                type="date"
                class="rounded-lg border border-slate-200 px-2 py-2 text-xs focus:border-slate-400 focus:outline-none"
              />
            </label>

          <button
            type="button"
            class="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800"
            @click="applyRange"
          >
            Apply
          </button>

          <a
            :href="monthlyLeaveReportUrl"
            target="_blank"
            rel="noopener"
            class="btn-1 rounded-lg"
            title="Open Monthly Leave Report"
          >
            Monthly Leave Report
          </a>
        </div>

          <div class="flex items-center justify-between gap-3 text-xs text-slate-500 lg:justify-end">
            <div>
              <div class="font-semibold text-slate-800" v-if="metaRange">{{ metaRange }}</div>
              <div v-if="meta?.past_days != null && meta?.future_days != null">
                Past {{ meta.past_days }} / Future {{ meta.future_days }}
              </div>
            </div>

            <div class="hidden sm:flex items-center gap-2">
              <span class="inline-flex items-center gap-1 text-[11px] text-slate-500">
                <span class="h-2.5 w-2.5 rounded-full bg-amber-300"></span> Pending
              </span>
              <span class="inline-flex items-center gap-1 text-[11px] text-slate-500">
                <span class="h-2.5 w-2.5 rounded-full bg-emerald-300"></span> Approved
              </span>
              <span class="inline-flex items-center gap-1 text-[11px] text-slate-500">
                <span class="h-2.5 w-2.5 rounded-full bg-rose-300"></span> Rejected
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Error / Loading -->
    <div v-if="error" class="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
      {{ error }}
    </div>

    <div v-if="loading" class="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500">
      Loading weekly updates...
    </div>

    <!-- Table (IMPORTANT: NO overflow-hidden here, it breaks sticky in many layouts) -->
    <div v-else class="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div class="">
        <table class="min-w-max w-full text-sm">
          <thead class="bg-slate-50 text-slate-600">
            <tr>
              <th
                class="sticky left-0 z-30 w-12 border-r border-slate-200 bg-slate-50 px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide"
                :style="headerTopStyle"
              >
                #
              </th>

              <th
                class="sticky left-12 z-30 border-r border-slate-200 bg-slate-50 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide"
                :style="headerTopStyle"
              >
                Employee
              </th>

              <th
                v-for="date in dates"
                :key="date"
                class="sticky z-20 min-w-[110px] bg-slate-50 px-3 py-3 text-left"
                :style="headerTopStyle"
              >
                <div class="text-[11px] font-semibold text-slate-400">{{ formatDay(date) }}</div>
                <div class="text-xs font-semibold text-slate-800">{{ formatDate(date) }}</div>
              </th>

              <th
                class="sticky z-20 bg-slate-50 px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide"
                :style="headerTopStyle"
              >
                SMS
              </th>
            </tr>
          </thead>

          <tbody>
            <tr
              v-for="(row, index) in rows"
              :key="row.user.id"
              class="border-t border-slate-300 hover:bg-sky-100"
            >
              <td class="sticky left-0 z-20 w-12 border-r border-slate-200  bg-white hover:bg-sky-100 px-3 py-3 text-xs font-semibold text-slate-600">
                {{ index + 1 }}
              </td>

              <td class="sticky left-12 z-20 border-r border-slate-200 bg-white hover:bg-sky-100 px-4 py-3">
                <div class="min-w-0">
                  <div class="truncate font-semibold text-slate-900">{{ row.user.name }}</div>
                  <div class="text-[11px] text-slate-500">
                    {{ row.user.company?.name || '—' }} · {{ row.user.department?.name || '—' }}
                  </div>
                </div>
              </td>

              <td v-for="date in dates" :key="`${row.user.id}-${date}`" class="px-3 py-3 align-top">
                <div v-if="dayItems(row, date).length" class="flex flex-wrap gap-1.5">
                  <button
                    v-for="item in dayItems(row, date)"
                    :key="`${item.kind}-${item.ref_id}-${item.code}`"
                    type="button"
                    class="rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset"
                    :class="badgeClass(item)"
                    :title="`${item.label} • ${item.status} • #${item.ref_id}`"
                    @click="openDetails(item)"
                  >
                    {{ item.code }}
                  </button>
                </div>
                <span v-else class="text-slate-300 text-sm">&mdash;</span>
              </td>

              <!-- ONLY ONE SMS (LAST APPLICATION) -->
              <td class="px-4 py-3 text-right">
                <button
                  type="button"
                  class="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                  :disabled="!getLastItem(row) || !!ui.busyKey"
                  @click="openSmsForRow(row)"
                >
                  <span v-if="ui.busyKey">Sending...</span>
                  <span v-else>Send SMS</span>
                </button>
              </td>
            </tr>

            <tr v-if="!rows.length" class="border-t border-slate-100">
              <td class="bg-white px-4 py-8 text-slate-500" :colspan="dates.length + 3">
                No updates found.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- SMS Modal -->
    <div v-if="ui.smsOpen" class="fixed inset-0 z-[75] flex items-center justify-center bg-slate-900/50 p-4">
      <div class="w-full max-w-lg rounded-2xl bg-white p-4 shadow-xl">
        <div class="flex items-start justify-between gap-3">
          <div>
            <h3 class="text-sm font-semibold text-slate-900">Send SMS</h3>
            <p class="text-xs text-slate-500">
              {{ ui.smsTarget?.user?.name || 'Employee' }}
            </p>
          </div>
          <button
            type="button"
            class="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            @click="closeSmsModal"
          >
            Close
          </button>
        </div>

        <div class="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
          <div class="font-semibold text-slate-700">Application</div>
          <div class="mt-1 flex flex-wrap items-center gap-2">
            <span class="rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-700 ring-1 ring-slate-200">
              {{ ui.smsTarget?.item?.code || ui.smsTarget?.item?.kind || 'N/A' }}
            </span>
            <span class="text-[11px] text-slate-500">#{{ ui.smsTarget?.item?.ref_id || 'N/A' }}</span>
            <span class="text-[11px] text-slate-500">{{ ui.smsTarget?.item?.status || 'Unknown' }}</span>
          </div>
          <div v-if="ui.smsTarget?.item?.label" class="mt-1 text-[11px] text-slate-500">
            {{ ui.smsTarget?.item?.label }}
          </div>
        </div>

        <div class="mt-4">
          <label class="text-xs font-semibold text-slate-600">Message</label>
          <textarea
            v-model="ui.smsMessage"
            rows="4"
            class="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-slate-400 focus:outline-none"
            placeholder="Write your SMS message..."
          ></textarea>
          <div class="mt-1 flex items-center justify-between text-[11px] text-slate-400">
            <span>{{ (ui.smsMessage || '').length }} characters</span>
            <span>Message will be sent to the employee.</span>
          </div>
        </div>

        <div class="mt-4 flex items-center justify-end gap-2">
          <button
            type="button"
            class="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            @click="closeSmsModal"
          >
            Cancel
          </button>
          <button
            type="button"
            class="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="!canSendSms"
            @click="sendSms"
          >
            <span v-if="ui.busyKey">Sending...</span>
            <span v-else>Send SMS</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Details Modal -->
    <div v-if="ui.detailsOpen" class="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/50 p-4">
      <div class="w-full max-w-sm rounded-2xl bg-white p-4 shadow-xl">
        <div class="flex items-start justify-between gap-3">
          <div>
            <h3 class="text-sm font-semibold text-slate-900">Update Details</h3>
            <p class="text-xs text-slate-500">Quick view</p>
          </div>
          <button
            type="button"
            class="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            @click="ui.detailsOpen = false"
          >
            Close
          </button>
        </div>

        <div class="mt-4 space-y-2 text-sm text-slate-700">
          <div class="flex items-center justify-between">
            <span class="text-xs font-semibold text-slate-500">Label</span>
            <span class="font-semibold">{{ ui.selectedItem?.label }}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-xs font-semibold text-slate-500">Status</span>
            <span class="font-semibold">{{ ui.selectedItem?.status }}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-xs font-semibold text-slate-500">Kind</span>
            <span class="font-semibold">{{ ui.selectedItem?.kind }}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-xs font-semibold text-slate-500">Ref ID</span>
            <span class="font-semibold">#{{ ui.selectedItem?.ref_id }}</span>
          </div>
        </div>

        <div class="mt-4 flex items-center justify-end gap-2">
          <button
            type="button"
            class="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            @click="ui.detailsOpen = false"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  </section>
</template>
