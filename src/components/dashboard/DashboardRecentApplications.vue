<script setup>
import { useUserStore } from '@/stores/user'
import { storeToRefs } from 'pinia'
import { computed, defineAsyncComponent, ref } from 'vue'

const LeaveApplicationModal = defineAsyncComponent(() => import('@/components/LeaveApplicationModal.vue'))
const ShortLeaveDetailsModal = defineAsyncComponent(
  () => import('@/components/ShortLeaveDetailsModal.vue'),
)
const ManualAttendanceDetailsModal = defineAsyncComponent(
  () => import('@/components/ManualAttendanceDetailsModal.vue'),
)
const ShiftExchangeDetailsModal = defineAsyncComponent(
  () => import('@/components/ShiftExchangeDetailsModal.vue'),
)
const OffdayExchangeDetailsModal = defineAsyncComponent(
  () => import('@/components/OffdayExchangeDetailsModal.vue'),
)

const userStore = useUserStore()
const { userDashboard } = storeToRefs(userStore)

const lists = computed(() => userDashboard.value?.lists ?? {})
const leaveApps = computed(() => lists.value.current_month_leave ?? [])
const shortLeaves = computed(() => lists.value.short_leave ?? [])
const exchanges = computed(() => lists.value.exchange ?? [])
const manuals = computed(() => lists.value.manual_attendance ?? [])

const isPending = (status) => status === 'Pending' || status === null

const leavePendingCount = computed(() => leaveApps.value.filter((x) => isPending(x?.status)).length)
const shortPendingCount = computed(() =>
  shortLeaves.value.filter((x) => isPending(x?.status)).length,
)
const exchPendingCount = computed(() => exchanges.value.filter((x) => isPending(x?.status)).length)
const manualPendingCount = computed(() =>
  manuals.value.filter((x) => isPending(x?.status)).length,
)

const ROW_LIMIT = 5
const visLeave = computed(() => leaveApps.value.slice(0, ROW_LIMIT))
const visShort = computed(() => shortLeaves.value.slice(0, ROW_LIMIT))
const visExch = computed(() => exchanges.value.slice(0, ROW_LIMIT))
const visManual = computed(() => manuals.value.slice(0, ROW_LIMIT))

const moreLeave = computed(() => Math.max(0, leaveApps.value.length - ROW_LIMIT))
const moreShort = computed(() => Math.max(0, shortLeaves.value.length - ROW_LIMIT))
const moreExch = computed(() => Math.max(0, exchanges.value.length - ROW_LIMIT))
const moreManual = computed(() => Math.max(0, manuals.value.length - ROW_LIMIT))

const STATUS_STYLES = {
  null: { title: 'Handover Waiting', cls: 'bg-gray-100 text-gray-800 ring-1 ring-gray-200' },
  Pending: { title: 'Pending', cls: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200' },
  Approved: { title: 'Approved', cls: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' },
  Rejected: { title: 'Rejected', cls: 'bg-rose-50 text-rose-700 ring-1 ring-rose-200' },
}

const chipFor = (status) =>
  STATUS_STYLES[status ?? 'null'] ?? {
    title: String(status || 'Unknown'),
    cls: 'bg-gray-100 text-gray-700 ring-1 ring-gray-200',
  }

const typeNamesWithDays = (counts) =>
  Array.isArray(counts)
    ? counts
        .filter((c) => c?.name)
        .map((c) => `${c.name} (${c?.days ?? 0})`)
        .join(', ')
    : ''

const leaveModal = ref({ open: false, id: null })
const shortModal = ref({ open: false, id: null })
const manualModal = ref({ open: false, id: null })

const openLeaveModal = (id) => {
  leaveModal.value = { open: true, id }
}

const openShortLeaveModal = (id) => {
  shortModal.value = { open: true, id }
}

const openManualAttendanceModal = (id) => {
  manualModal.value = { open: true, id }
}

const exchangeModal = ref({ open: false, id: null, type: null })

const openExchangeModal = (item) => {
  const type = item?.exchange_type === 'offday' ? 'offday' : 'shift'
  exchangeModal.value = { open: true, id: item.id, type }
}

const activeExchangeComp = computed(() =>
  exchangeModal.value.type === 'offday' ? OffdayExchangeDetailsModal : ShiftExchangeDetailsModal,
)

const exchangeKey = computed(
  () => `${exchangeModal.value.type || 'x'}-${exchangeModal.value.id || 'x'}`,
)

function parseSqlDateOrDateTime(input) {
  if (!input) return null
  const s = String(input).trim()

  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (m) return new Date(+m[1], +m[2] - 1, +m[3], 0, 0, 0)

  m = s.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/)
  if (m) return new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] || 0))

  return null
}

function fmtDateOnlyAny(value) {
  const d = parseSqlDateOrDateTime(value)
  return d
    ? d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })
    : ''
}

function toDateOnly(d) {
  const m = String(d || '').match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!m) return null
  return new Date(+m[1], +m[2] - 1, +m[3], 0, 0, 0)
}

function addDays(dt, n) {
  const d = new Date(dt)
  d.setDate(d.getDate() + n)
  return d
}

function sameYMD(a, b) {
  return (
    a &&
    b &&
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

function ymdLocal(dt) {
  const y = dt.getFullYear()
  const m = String(dt.getMonth() + 1).padStart(2, '0')
  const d = String(dt.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function buildLeaveRanges(jsonData) {
  const items = Array.isArray(jsonData) ? jsonData.slice() : []
  const uniqSort = (arr) => Array.from(new Set(arr)).sort()
  const leaveDates = uniqSort(
    items
      .filter((x) => x?.leave_type_id !== 'weekend')
      .map((x) => x.date)
      .filter(Boolean),
  )

  const ranges = []
  let start = null
  let prev = null

  for (const d of leaveDates) {
    const cur = toDateOnly(d)
    if (!cur) continue

    if (!start) {
      start = cur
      prev = cur
      continue
    }

    if (sameYMD(addDays(prev, 1), cur)) {
      prev = cur
      continue
    }

    ranges.push({ from: ymdLocal(start), to: ymdLocal(prev) })
    start = cur
    prev = cur
  }

  if (start && prev) {
    ranges.push({ from: ymdLocal(start), to: ymdLocal(prev) })
  }

  return { ranges, leaveCount: leaveDates.length }
}

const chip = 'inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium'
const line = 'flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between'
const metaRow = 'mt-1 flex flex-wrap items-center gap-2 text-[12px] text-gray-600'
const itemBtn =
  'block w-full rounded-xl border border-white/70 bg-white px-3 py-2.5 text-left shadow-sm transition hover:border-blue-200 hover:bg-blue-50/40 focus:outline-none focus:ring-2 focus:ring-blue-200'
const sectionCard = 'rounded-2xl border border-slate-200 bg-slate-50/80 px-3 py-3'
const headerActions = 'flex flex-wrap items-center gap-2 pl-7 sm:pl-0'
const pillLink =
  'inline-flex items-center rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-blue-700 ring-1 ring-blue-100 transition hover:bg-blue-50'
const pendingBadge =
  'inline-flex min-w-[28px] items-center justify-center rounded-full bg-amber-100 px-2 py-1 text-[11px] font-semibold text-amber-900'

const sections = ref({
  apps: Boolean(leavePendingCount.value),
  short: Boolean(shortPendingCount.value),
  exch: Boolean(exchPendingCount.value),
  manual: Boolean(manualPendingCount.value),
})

const toggleSection = (key) => {
  sections.value[key] = !sections.value[key]
}

const handleHeaderKeydown = (event, key) => {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    toggleSection(key)
  }
}
</script>

<template>
  <div class="h-full rounded-[inherit] bg-white p-3 sm:p-4">
    <section :class="sectionCard">
      <header
        class="flex cursor-pointer select-none flex-col gap-2 sm:flex-row sm:items-start sm:justify-between"
        role="button"
        :aria-expanded="sections.apps"
        tabindex="0"
        @click="toggleSection('apps')"
        @keydown="handleHeaderKeydown($event, 'apps')"
      >
        <div class="flex items-center gap-2">
          <span class="inline-flex size-8 items-center justify-center rounded-full bg-blue-100 text-blue-700">
            <i class="fas fa-file text-sm"></i>
          </span>
          <div>
            <div class="flex flex-wrap items-center gap-2">
              <h2 class="text-sm font-semibold text-gray-900">Applications</h2>
              <span class="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                <i class="far fa-clock"></i>
                Latest
              </span>
            </div>
            <p class="text-[11px] text-slate-500">Leave applications from this month</p>
          </div>
        </div>

        <div :class="headerActions">
          <span :class="pendingBadge">{{ leavePendingCount }}</span>
          <RouterLink :to="{ name: 'MyLeaveApplications' }" :class="pillLink" @click.stop>
            See all
          </RouterLink>
          <span class="inline-flex size-7 items-center justify-center rounded-full bg-white text-slate-500 ring-1 ring-slate-200">
            <i
              class="fas fa-chevron-down text-xs transition-transform duration-200"
              :class="sections.apps ? 'rotate-180' : ''"
            ></i>
          </span>
        </div>
      </header>

      <div v-show="sections.apps" class="mt-3 border-t border-slate-200 pt-3">
        <div v-if="leaveApps.length === 0" class="py-4 text-center text-xs italic text-gray-500">
          No applications
        </div>

        <div v-else class="space-y-2">
          <button v-for="item in visLeave" :key="item.id" :class="itemBtn" @click="openLeaveModal(item.id)">
            <div :class="line">
              <div class="min-w-0">
                <div class="truncate text-[13px] text-gray-900">
                  <span class="font-medium">#{{ item.id }}</span>
                  <span class="opacity-70"> - {{ typeNamesWithDays(item.leave_type_counts) || '--' }}</span>
                </div>

                <div :class="metaRow">
                  <template v-for="info in [buildLeaveRanges(item.json_data)]" :key="`leave-${item.id}`">
                    <template v-if="info.leaveCount > 1">
                      <template v-for="(rg, idx) in info.ranges" :key="idx">
                        <span class="inline-flex max-w-full items-center gap-1 rounded-md border border-gray-200 bg-gray-50 px-1.5 py-0.5">
                          <i class="far fa-calendar-minus"></i>
                          <span class="truncate max-w-[11rem]">
                            {{
                              rg.from !== rg.to
                                ? `${fmtDateOnlyAny(rg.from)} - ${fmtDateOnlyAny(rg.to)}`
                                : fmtDateOnlyAny(rg.from)
                            }}
                          </span>
                        </span>
                      </template>
                    </template>

                    <template v-else>
                      <span
                        v-if="info.ranges[0]"
                        class="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-gray-50 px-1.5 py-0.5"
                      >
                        <i class="far fa-calendar-day"></i>
                        <span>{{ fmtDateOnlyAny(info.ranges[0].from) }}</span>
                      </span>
                    </template>
                  </template>
                </div>
              </div>

              <span :class="[chip, chipFor(item.status).cls, 'self-start sm:self-auto']">
                {{ chipFor(item.status).title }}
              </span>
            </div>
          </button>

          <div v-if="moreLeave" class="flex justify-center pt-1">
            <RouterLink :to="{ name: 'MyLeaveApplications' }" class="text-[12px] font-medium text-blue-700 hover:underline">
              + {{ moreLeave }} more
            </RouterLink>
          </div>
        </div>
      </div>
    </section>

    <section :class="[sectionCard, 'mt-4']">
      <header
        class="flex cursor-pointer select-none flex-col gap-2 sm:flex-row sm:items-start sm:justify-between"
        role="button"
        :aria-expanded="sections.short"
        tabindex="0"
        @click="toggleSection('short')"
        @keydown="handleHeaderKeydown($event, 'short')"
      >
        <div class="flex items-center gap-2">
          <span class="inline-flex size-8 items-center justify-center rounded-full bg-slate-200 text-slate-700">
            <i class="fas fa-walking text-sm"></i>
          </span>
          <div>
            <h2 class="text-sm font-semibold text-gray-900">Short Leave</h2>
            <p class="text-[11px] text-slate-500">Quick leave requests and approvals</p>
          </div>
        </div>

        <div :class="headerActions">
          <span :class="pendingBadge">{{ shortPendingCount }}</span>
          <RouterLink :to="{ name: 'MyShortLeaves' }" :class="pillLink" @click.stop>
            See all
          </RouterLink>
          <span class="inline-flex size-7 items-center justify-center rounded-full bg-white text-slate-500 ring-1 ring-slate-200">
            <i
              class="fas fa-chevron-down text-xs transition-transform duration-200"
              :class="sections.short ? 'rotate-180' : ''"
            ></i>
          </span>
        </div>
      </header>

      <div v-show="sections.short" class="mt-3 border-t border-slate-200 pt-3">
        <div v-if="shortLeaves.length === 0" class="py-4 text-center text-xs italic text-gray-500">
          No short leave
        </div>

        <div v-else class="space-y-2">
          <button
            v-for="item in visShort"
            :key="item.id"
            :class="itemBtn"
            @click="openShortLeaveModal(item.id)"
          >
            <div :class="line">
              <div class="min-w-0">
                <div class="truncate text-[13px] text-gray-900">
                  <span class="font-medium">{{ fmtDateOnlyAny(item.date) }}</span>
                  <span class="opacity-70"> - {{ item.type || '--' }}</span>
                </div>
              </div>

              <span :class="[chip, chipFor(item.status).cls, 'self-start sm:self-auto']">
                {{ chipFor(item.status).title }}
              </span>
            </div>
          </button>

          <div v-if="moreShort" class="flex justify-center pt-1">
            <RouterLink :to="{ name: 'MyShortLeaves' }" class="text-[12px] font-medium text-blue-700 hover:underline">
              + {{ moreShort }} more
            </RouterLink>
          </div>
        </div>
      </div>
    </section>

    <section :class="[sectionCard, 'mt-4']">
      <header
        class="flex cursor-pointer select-none flex-col gap-2 sm:flex-row sm:items-start sm:justify-between"
        role="button"
        :aria-expanded="sections.exch"
        tabindex="0"
        @click="toggleSection('exch')"
        @keydown="handleHeaderKeydown($event, 'exch')"
      >
        <div class="flex items-center gap-2">
          <span class="inline-flex size-8 items-center justify-center rounded-full bg-indigo-100 text-indigo-700">
            <i class="fas fa-exchange-alt text-sm"></i>
          </span>
          <div>
            <h2 class="text-sm font-semibold text-gray-900">Exchange</h2>
            <p class="text-[11px] text-slate-500">Shift and offday exchange requests</p>
          </div>
        </div>

        <div :class="headerActions">
          <span :class="pendingBadge">{{ exchPendingCount }}</span>
          <RouterLink :to="{ name: 'MyShiftExchangeList' }" :class="pillLink" @click.stop>
            Shift
          </RouterLink>
          <RouterLink :to="{ name: 'MyOffdayExchangeList' }" :class="pillLink" @click.stop>
            Offday
          </RouterLink>
          <span class="inline-flex size-7 items-center justify-center rounded-full bg-white text-slate-500 ring-1 ring-slate-200">
            <i
              class="fas fa-chevron-down text-xs transition-transform duration-200"
              :class="sections.exch ? 'rotate-180' : ''"
            ></i>
          </span>
        </div>
      </header>

      <div v-show="sections.exch" class="mt-3 border-t border-slate-200 pt-3">
        <div v-if="exchanges.length === 0" class="py-4 text-center text-xs italic text-gray-500">
          No exchange
        </div>

        <div v-else class="space-y-2">
          <button v-for="item in visExch" :key="item.id" :class="itemBtn" @click="openExchangeModal(item)">
            <div :class="line">
              <div class="min-w-0">
                <div class="truncate text-[13px] text-gray-900">
                  <span class="font-medium">{{ fmtDateOnlyAny(item.current_date) }}</span>
                  <span class="opacity-70"> - {{ item.exchange_type || '--' }}</span>
                </div>
              </div>

              <span :class="[chip, chipFor(item.status).cls, 'self-start sm:self-auto']">
                {{ chipFor(item.status).title }}
              </span>
            </div>
          </button>

          <div v-if="moreExch" class="flex justify-center pt-1">
            <RouterLink :to="{ name: 'MyShiftExchangeList' }" class="text-[12px] font-medium text-blue-700 hover:underline">
              + {{ moreExch }} more
            </RouterLink>
          </div>
        </div>
      </div>
    </section>

    <section :class="[sectionCard, 'mt-4']">
      <header
        class="flex cursor-pointer select-none flex-col gap-2 sm:flex-row sm:items-start sm:justify-between"
        role="button"
        :aria-expanded="sections.manual"
        tabindex="0"
        @click="toggleSection('manual')"
        @keydown="handleHeaderKeydown($event, 'manual')"
      >
        <div class="flex items-center gap-2">
          <span class="inline-flex size-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
            <i class="fas fa-user-check text-sm"></i>
          </span>
          <div>
            <h2 class="text-sm font-semibold text-gray-900">Manual Attendance</h2>
            <p class="text-[11px] text-slate-500">Manual check-in and check-out requests</p>
          </div>
        </div>

        <div :class="headerActions">
          <span :class="pendingBadge">{{ manualPendingCount }}</span>
          <RouterLink :to="{ name: 'MyManualAttendanceList' }" :class="pillLink" @click.stop>
            See all
          </RouterLink>
          <span class="inline-flex size-7 items-center justify-center rounded-full bg-white text-slate-500 ring-1 ring-slate-200">
            <i
              class="fas fa-chevron-down text-xs transition-transform duration-200"
              :class="sections.manual ? 'rotate-180' : ''"
            ></i>
          </span>
        </div>
      </header>

      <div v-show="sections.manual" class="mt-3 border-t border-slate-200 pt-3">
        <div v-if="manuals.length === 0" class="py-4 text-center text-xs italic text-gray-500">
          No manual application
        </div>

        <div v-else class="space-y-2">
          <button
            v-for="item in visManual"
            :key="item.id"
            :class="itemBtn"
            @click="openManualAttendanceModal(item.id)"
          >
            <div :class="line">
              <div class="min-w-0">
                <div class="truncate text-[13px] text-gray-900">
                  <span class="font-medium">
                    {{ item.check_in ? fmtDateOnlyAny(item.check_in) : fmtDateOnlyAny(item.check_out) }}
                  </span>
                  <span class="opacity-70"> - {{ item.type || '--' }}</span>
                </div>
              </div>

              <span :class="[chip, chipFor(item.status).cls, 'self-start sm:self-auto']">
                {{ chipFor(item.status).title }}
              </span>
            </div>
          </button>

          <div v-if="moreManual" class="flex justify-center pt-1">
            <RouterLink :to="{ name: 'MyManualAttendanceList' }" class="text-[12px] font-medium text-blue-700 hover:underline">
              + {{ moreManual }} more
            </RouterLink>
          </div>
        </div>
      </div>
    </section>

    <LeaveApplicationModal v-if="leaveModal.open" v-model:open="leaveModal.open" :id="leaveModal.id" />
    <ShortLeaveDetailsModal v-if="shortModal.open" v-model:open="shortModal.open" :id="shortModal.id" />
    <ManualAttendanceDetailsModal
      v-if="manualModal.open"
      v-model:open="manualModal.open"
      :id="manualModal.id"
    />
    <component
      :is="activeExchangeComp"
      v-if="exchangeModal.open"
      :key="exchangeKey"
      v-model:open="exchangeModal.open"
      :id="exchangeModal.id"
    />
  </div>
</template>
