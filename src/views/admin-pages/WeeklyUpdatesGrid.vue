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

const stickyBarRef = ref(null)
const controlsRef = ref(null)
const headerTop = ref(0)
let ro = null

const calcHeaderTop = async () => {
  await nextTick()
  const stickyH = stickyBarRef.value?.offsetHeight || 0
  const controlsH = controlsRef.value?.offsetHeight || 0
  const gap = 12
  headerTop.value = stickyH + controlsH + gap
}

const headerTopStyle = computed(() => ({ top: `${headerTop.value}px` }))

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

/* ---------------- badge styles ---------------- */
const badgeClass = (item) => {
  const status = String(item?.status ?? '').toLowerCase()
  if (status.includes('pending')) return 'bg-amber-50 text-amber-700 ring-amber-200'
  if (status.includes('approved')) return 'bg-emerald-50 text-emerald-700 ring-emerald-200'
  if (status.includes('rejected')) return 'bg-rose-50 text-rose-700 ring-rose-200'
  return 'bg-slate-50 text-slate-700 ring-slate-200'
}

const isDayMarker = (item) => {
  const kind = String(item?.kind || '').toLowerCase()
  return kind === 'weekend' || kind === 'holiday' || kind === 'present'
}

const isWeekendItem = (item) => String(item?.kind || '').toLowerCase() === 'weekend'

const itemBadgeText = (item) => {
  const label = String(item?.label || '').toUpperCase()
  if (label === 'WPL') return 'WPL'
  const kind = String(item?.kind || '').toLowerCase()
  if (kind === 'weekend') return 'W'
  if (kind === 'holiday') return 'HD'
  if (kind === 'present') return 'P'
  if (kind === 'worked') return 'P'
  return item?.code
}

const itemBadgeClass = (item) => {
  const kind = String(item?.kind || '').toLowerCase()
  if (kind === 'weekend') return '!bg-slate-500 text-slate-700 ring-slate-200'
  if (kind === 'holiday') return 'bg-sky-50 text-sky-700 ring-sky-200'
  if (kind === 'present') return 'bg-emerald-50 text-emerald-700 ring-emerald-200'
  if (kind === 'worked') return 'bg-indigo-50 text-indigo-700 ring-indigo-200'
  return badgeClass(item)
}

const itemTooltip = (item) => {
  const parts = []
  const label = item?.label || item?.kind || itemBadgeText(item)
  if (label) parts.push(label)
  if (item?.status) parts.push(item.status)
  if (item?.ref_id) parts.push(`#${item.ref_id}`)
  return parts.join(' - ')
}

const isExchangeItem = (item) => String(item?.kind || '').toLowerCase() === 'exchange'

/* ---------------- toast ---------------- */
const toastClass = computed(() => {
  const t = ui.value.toast?.type
  if (t === 'success') return 'border-emerald-200 bg-emerald-50 text-emerald-800'
  if (t === 'error') return 'border-rose-200 bg-rose-50 text-rose-800'
  return 'border-slate-200 bg-slate-50 text-slate-800'
})

function showToast(type, text) {
  ui.value.toast = { type, text }
  window.clearTimeout(showToast._t)
  showToast._t = window.setTimeout(() => (ui.value.toast = null), 2500)
}

/* ---------------- SMS ---------------- */
const canSendSms = computed(() => {
  const message = String(ui.value.smsMessage || '').trim()
  return !!message && !!ui.value.smsTarget?.item && !ui.value.busyKey
})

const isSmsKindAllowed = (item) => {
  const kind = String(item?.kind || '').toLowerCase()
  return kind === 'leave' || kind === 'exchange' || kind === 'offday'
}

const isSmsEligible = (item) => {
  if (!item?.kind || !item?.ref_id) return false
  return isSmsKindAllowed(item)
}

const getLastItem = (row) => {
  const ds = dates.value || []
  for (let i = ds.length - 1; i >= 0; i--) {
    const d = ds[i]
    const items = dayItems(row, d)
    if (!items?.length) continue
    for (let j = items.length - 1; j >= 0; j--) {
      const item = items[j]
      if (isSmsEligible(item)) return item
    }
  }
  return null
}

const openSmsForRow = (row) => {
  const last = getLastItem(row)
  if (!last) return showToast('info', 'No application found in this range.')
  ui.value.smsTarget = { item: last, user: row?.user || null }
  ui.value.smsMessage = ''
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
      kind: String(item.kind).toLowerCase(),
      ref_id: item.ref_id,
      status: item.status,
      message,
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

/* ---------------- Meta range ---------------- */
const metaRange = computed(() => {
  if (!meta.value?.start_date || !meta.value?.end_date) return ''
  return `${formatDate(meta.value.start_date)} - ${formatDate(meta.value.end_date)}`
})

/* ---------------- Month key for attendance route ---------------- */
const reportAnchorDate = computed(() => {
  const value = params.value.anchor_date || meta.value?.anchor_date
  return value ? toDate(value) : new Date()
})

const anchorYearMonth = computed(() => {
  const d = reportAnchorDate.value
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
})

/* ---------------- (A) Employee name click -> hrd/em-attendance ----------------
   Uses row.user.employee_id, company_id, department_id
   + keeps current filter line_type
   + uses anchor month (YYYY-MM)
--------------------------------------------------------------- */
const employeeAttendanceUrl = (user) => {
  if (!user) return '#'
  const query = new URLSearchParams({
    department_id: String(user.department_id ?? filters.value.department_id ?? ''),
    line_type: String(filters.value.line_type ?? ''),
    date: String(anchorYearMonth.value),
    company_id: String(user.company_id ?? filters.value.company_id ?? ''),
    employee_id: String(user.id ?? ''),
  })
  return `/hrd/em-attendance?${query.toString()}`
}

/* ---------------- (B) Application show link by type ----------------
   leave    -> /leave-application-show/{ref_id}
   exchange -> /exchange-offday-show/{ref_id}
--------------------------------------------------------------- */
const applicationLink = (item) => {
  if (!item?.kind || !item?.ref_id) return null
  const kind = String(item.kind).toLowerCase()

  if (kind === 'leave') return `/leave-application-show/${item.ref_id}`
  if (kind === 'exchange') return `/exchange-offday-show/${item.ref_id}`

  return null
}

/* ---------------- current date column highlight ---------------- */
const todayIso = computed(() => {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
})
const isToday = (date) => String(date) === String(todayIso.value)
const thClass = (date) => (isToday(date) ? 'bg-amber-50' : 'bg-slate-50')
const tdClass = (date) => (isToday(date) ? 'bg-amber-50' : '')

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

/* ---------------- lifecycle (sticky + fetch) ---------------- */
onMounted(async () => {
  fetchNow()
  await calcHeaderTop()

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

    <!-- Controls -->
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
          </div>

          <div class="flex items-center justify-between gap-3 text-xs text-slate-500 lg:justify-end">
            <div class="text-right bg-gray-100 rounded-full px-2 py-1">
              <div class="font-semibold text-slate-800" v-if="metaRange">{{ metaRange }}</div>
            </div>
            <div class="flex justify-center items-center gap-3">
              <div class="text-[11px] text-slate-400 bg-gray-100 rounded-full px-2 py-1">
                Attendance month: <span class="font-semibold text-slate-600">{{ anchorYearMonth }}</span>
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

    <!-- Table -->
    <div v-else class="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div>
        <table class="min-w-max w-full text-sm">
          <thead class="text-slate-600">
            <tr>
              <th
                class="sticky left-0 z-30 w-10 border-r border-slate-200 bg-slate-50 p-2 text-left text-xs font-semibold uppercase tracking-wide"
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
                class="sticky z-20 min-w-[40px] p-2 text-center hover:bg-slate-100"
                :class="thClass(date)"
                :style="headerTopStyle"
              >
                <div class="text-[11px] font-semibold text-slate-400">{{ formatDay(date) }}</div>
                <div class="text-xs font-semibold text-slate-800">{{ formatDate(date) }}</div>
                <div v-if="isToday(date)" class="mt-1 text-[10px] font-semibold text-amber-700">Today</div>
              </th>

              <th
                class="sticky z-20 bg-slate-50 px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide"
                
              >
                SMS
              </th>
            </tr>
          </thead>

          <tbody>
            <tr
              v-for="(row, index) in rows"
              :key="row.user.id"
              class="border-t border-slate-200 hover:bg-sky-50/70"
            >
              <td
                class="sticky left-0 z-20 w-10 border-r border-slate-200 bg-white p-2 text-xs font-semibold text-slate-600"
              >
                {{ index + 1 }}
              </td>

              <!-- Employee column: CLICK -> hrd/em-attendance -->
              <td class="sticky left-12 z-20 border-r border-slate-200 bg-white p-2">
                <div class="min-w-0">
                  <a
                    :href="employeeAttendanceUrl(row.user)"
                    target="_blank"
                    rel="noopener"
                    class="group inline-flex items-center gap-2 truncate font-semibold text-slate-900 hover:text-slate-900"
                    :title="`Open Attendance (${anchorYearMonth})`"
                  >
                    <span class="truncate group-hover:underline decoration-slate-400 underline-offset-4">
                      {{ row.user.name }}
                    </span>
                  </a>
                  <div class="mt-0.5 text-[11px] text-slate-500">
                    {{ row.user.company?.name || '—' }} · {{ row.user.department?.name || '—' }}
                  </div>
                </div>
              </td>

              <!-- TD center + today highlight -->
              <td
                v-for="date in dates"
                :key="`${row.user.id}-${date}`"
                class="p-2 border-r border-slate-200 text-center"
                :class="tdClass(date)"
              >
                <div v-if="dayItems(row, date).length" class="flex flex-col items-center justify-center">
                  <template v-for="item in dayItems(row, date)" :key="`${item.kind}-${item.ref_id}-${item.code}`">
                    <span
                      v-if="isWeekendItem(item)"
                      class="px-2 py-0.5 text-[11px] font-semibold text-slate-500"
                      :title="itemTooltip(item)"
                    >
                      {{ itemBadgeText(item) }}
                    </span>
                    <button
                      v-else
                      type="button"
                      class="rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset transition hover:scale-[1.02] active:scale-[0.99]"
                      :class="itemBadgeClass(item)"
                      :title="itemTooltip(item)"
                      @click="openDetails(item)"
                    >
                      {{ itemBadgeText(item) }}
                    </button>
                  </template>
                </div>
                <span v-else class="text-slate-300 text-sm">&mdash;</span>
              </td>

              <td class="px-2">
                <div class="flex justify-end">
                  <button
                    type="button"
                    class="btn-4"
                    :disabled="!getLastItem(row) || !!ui.busyKey"
                    @click="openSmsForRow(row)"
                  >
                    <span v-if="ui.busyKey">Sending...</span>
                    <span v-else>Send SMS 
                      <span class="font-bold" v-if="row.user?.yearly_message_count">({{ row.user?.yearly_message_count }})</span>
                    </span>
                  </button>
                </div>
              </td>
            </tr>

            <tr v-if="!rows.length" class="border-t border-slate-100">
              <td class="bg-white px-4 py-10 text-slate-500 text-center" :colspan="dates.length + 3">
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

          <div class="flex items-center gap-2">
            <a
              v-if="applicationLink(ui.selectedItem)"
              :href="applicationLink(ui.selectedItem)"
              target="_blank"
              rel="noopener"
              class="btn-1 py-1 px-2 text-xs font-semibold"
              title="Open application details"
            >
              Application
            </a>

            <button
              type="button"
              class="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              @click="ui.detailsOpen = false"
            >
              Close
            </button>
          </div>
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
          <!-- <div class="flex items-center justify-between">
            <span class="text-xs font-semibold text-slate-500">Ref ID</span>
            <span class="font-semibold">#{{ ui.selectedItem?.ref_id }}</span>
          </div> -->

          <template v-if="isExchangeItem(ui.selectedItem)">
            <div class="flex items-center justify-between">
              <span class="text-xs font-semibold text-slate-500">Current Date</span>
              <span class="font-semibold">{{ ui.selectedItem?.current_date || 'N/A' }}</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-xs font-semibold text-slate-500">Exchange Date</span>
              <span class="font-semibold">{{ ui.selectedItem?.exchange_date || 'N/A' }}</span>
            </div>
          </template>
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
