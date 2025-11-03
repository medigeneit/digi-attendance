<script setup>
import { useUserStore } from '@/stores/user'
import { storeToRefs } from 'pinia'
import { computed, ref, defineAsyncComponent } from 'vue'

/* ===== Lazy imports ===== */
const LeaveApplicationModal         = defineAsyncComponent(() => import('@/components/LeaveApplicationModal.vue'))
const ShortLeaveDetailsModal        = defineAsyncComponent(() => import('@/components/ShortLeaveDetailsModal.vue'))
const ManualAttendanceDetailsModal  = defineAsyncComponent(() => import('@/components/ManualAttendanceDetailsModal.vue'))
const ShiftExchangeDetailsModal     = defineAsyncComponent(() => import('@/components/ShiftExchangeDetailsModal.vue'))
const OffdayExchangeDetailsModal    = defineAsyncComponent(() => import('@/components/OffdayExchangeDetailsModal.vue'))

/* ===== Store ===== */
const userStore = useUserStore()
const { userDashboard } = storeToRefs(userStore)

/* ===== Lists ===== */
const lists        = computed(() => userDashboard.value?.lists ?? {})
const leaveApps    = computed(() => lists.value.current_month_leave ?? [])
const shortLeaves  = computed(() => lists.value.short_leave ?? [])
const exchanges    = computed(() => lists.value.exchange ?? [])
const manuals      = computed(() => lists.value.manual_attendance ?? [])

/* ===== Pending helpers ===== */
const isPending = (s) => s === 'Pending' || s === null

const leavePendingCount  = computed(() => leaveApps.value.filter(x => isPending(x?.status)).length)
const shortPendingCount  = computed(() => shortLeaves.value.filter(x => isPending(x?.status)).length)
const exchPendingCount   = computed(() => exchanges.value.filter(x => isPending(x?.status)).length)
const manualPendingCount = computed(() => manuals.value.filter(x => isPending(x?.status)).length)

/* ===== Row density / limit ===== */
const ROW_LIMIT = 5
const visLeave   = computed(() => leaveApps.value.slice(0, ROW_LIMIT))
const visShort   = computed(() => shortLeaves.value.slice(0, ROW_LIMIT))
const visExch    = computed(() => exchanges.value.slice(0, ROW_LIMIT))
const visManual  = computed(() => manuals.value.slice(0, ROW_LIMIT))

const moreLeave  = computed(() => Math.max(0, leaveApps.value.length   - ROW_LIMIT))
const moreShort  = computed(() => Math.max(0, shortLeaves.value.length - ROW_LIMIT))
const moreExch   = computed(() => Math.max(0, exchanges.value.length   - ROW_LIMIT))
const moreManual = computed(() => Math.max(0, manuals.value.length     - ROW_LIMIT))

/* ===== Status Chip ===== */
const STATUS_STYLES = {
  null:       { title: 'Handover Waiting', cls: 'bg-gray-100 text-gray-800 ring-1 ring-gray-200' },
  Pending:    { title: 'Pending',          cls: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200' },
  Approved:   { title: 'Approved',         cls: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' },
  Rejected:   { title: 'Rejected',         cls: 'bg-rose-50 text-rose-700 ring-1 ring-rose-200' }
}
const chipFor = (status) =>
  STATUS_STYLES[status ?? 'null'] ?? { title: String(status || 'Unknown'), cls: 'bg-gray-100 text-gray-700 ring-1 ring-gray-200' }

/* ===== Small helpers ===== */
const typeNamesWithDays = (counts) =>
  Array.isArray(counts)
    ? counts.filter(c => c?.name).map(c => `${c.name} (${c?.days ?? 0})`).join(', ')
    : ''

/* ===== Modals ===== */
const leaveModal  = ref({ open: false, id: null })
const shortModal  = ref({ open: false, id: null })
const manualModal = ref({ open: false, id: null })

const openLeaveModal             = (id) => { leaveModal.value  = { open: true, id } }
const openShortLeaveModal        = (id) => { shortModal.value  = { open: true, id } }
const openManualAttendanceModal  = (id) => { manualModal.value = { open: true, id } }

/* ===== Unified Exchange Modal ===== */
const exchangeModal = ref({ open: false, id: null, type: null }) // 'shift' | 'offday'
const openExchangeModal = (item) => {
  const type = (item?.exchange_type === 'offday') ? 'offday' : 'shift'
  exchangeModal.value = { open: true, id: item.id, type }
}
const activeExchangeComp = computed(() =>
  exchangeModal.value.type === 'offday' ? OffdayExchangeDetailsModal : ShiftExchangeDetailsModal
)
const exchangeKey = computed(() => `${exchangeModal.value.type || 'x'}-${exchangeModal.value.id || 'x'}`)

/* =========================
   DATE / DATETIME HELPERS
   ========================= */
function parseSqlDateOrDateTime(input) {
  if (!input) return null
  const s = String(input).trim()
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (m) return new Date(+m[1], +m[2]-1, +m[3], 0, 0, 0)
  m = s.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/)
  if (m) return new Date(+m[1], +m[2]-1, +m[3], +m[4], +m[5], +(m[6]||0))
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
  return new Date(+m[1], +m[2]-1, +m[3], 0, 0, 0)
}
function addDays(dt, n) { const d = new Date(dt); d.setDate(d.getDate() + n); return d }
function sameYMD(a, b) {
  return a && b &&
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
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
    items.filter(x => x?.leave_type_id !== 'weekend').map(x => x.date).filter(Boolean)
  )
  const weekendDates = uniqSort(
    items.filter(x => x?.leave_type_id === 'weekend').map(x => x.date).filter(Boolean)
  )
  const ranges = []
  let start = null, prev = null
  for (const d of leaveDates) {
    const cur = toDateOnly(d); if (!cur) continue
    if (!start) { start = prev = cur; continue }
    if (sameYMD(addDays(prev, 1), cur)) prev = cur
    else {
      ranges.push({ from: ymdLocal(start), to: ymdLocal(prev) })
      start = prev = cur
    }
  }
  if (start && prev) ranges.push({ from: ymdLocal(start), to: ymdLocal(prev) })
  return { ranges, weekends: weekendDates, leaveCount: leaveDates.length }
}

/* Tiny UI util */
const chip = 'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium'
const line    = 'flex items-center justify-between gap-2'
const metaRow = 'text-[12px] text-gray-600 flex items-center gap-2 flex-wrap'
const itemBtn = 'block w-full text-left rounded-md px-2.5 py-2 hover:bg-slate-50/70 focus:bg-slate-50/90 focus:outline-none transition'

/* ===== Expand/Collapse (FIRST collapsed) ===== */
const sections = ref({
  apps: leavePendingCount.value ? true :  false,
  short: shortPendingCount.value ? true :  false,
  exch: exchPendingCount.value ? true :  false,
  manual: manualPendingCount.value ? true :  false,
})

const toggleSection = (key) => { sections.value[key] = !sections.value[key] }

</script>

<template>
  <div class="bg-white shadow-sm rounded-xl p-3 sm:p-4">
    <!-- ===== Applications ===== -->
    <section>
      <header
        class="flex items-center justify-between mb-1 cursor-pointer select-none"
        role="button"
        :aria-expanded="sections.apps"
        @click="toggleSection('apps')"
        tabindex="0"
      >
        <div class="flex items-center gap-2">
          <i class="fas fa-file text-gray-600"></i>
          <h2 class="text-sm font-semibold text-gray-900">
            Applications
            <span class="ml-2 align-middle text-[10px] sm:text-[11px] inline-flex items-center gap-1 rounded-full bg-blue-50 text-blue-700 px-2 py-0.5">
              <i class="far fa-clock"></i> Latest
            </span>
          </h2>
        </div>
        <div class="flex items-center gap-2">
          <!-- ✅ Only pending count -->
          <span class="text-[11px] rounded-full bg-yellow-100 text-gray-700 px-2 py-0.5">{{ leavePendingCount }}</span>
          <RouterLink
            :to="{ name: 'MyLeaveApplications' }"
            class="text-[11px] text-blue-700 hover:underline"
            @click.stop
          >
            See all
          </RouterLink>
          <i class="fas fa-chevron-down text-gray-600 transition-transform duration-200" :class="sections.apps ? 'rotate-180' : ''"/>
        </div>
      </header>

      <div v-show="sections.apps">
        <hr class="border-gray-100" />
        <div v-if="leaveApps.length === 0" class="text-xs italic text-center py-4 text-gray-500">No applications</div>

        <div v-else class="py-2 space-y-1">
          <button
            v-for="item in visLeave"
            :key="item.id"
            :class="itemBtn"
            @click="openLeaveModal(item.id)"
          >
            <div :class="line">
              <div class="min-w-0">
                <div class="text-[13px] text-gray-900 truncate">
                  <span class="font-medium">#{{ item.id }}</span>
                  <span class="opacity-70"> – {{ typeNamesWithDays(item.leave_type_counts) || '—' }}</span>
                </div>
                <div :class="metaRow">
                  <template v-for="info in [buildLeaveRanges(item.json_data)]" :key="'info-'+item.id">
                    <template v-if="info.leaveCount > 1">
                      <template v-for="(rg, idx) in info.ranges" :key="idx">
                        <span class="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-gray-50 px-1.5 py-0.5">
                          <i class="far fa-calendar-minus"></i>
                          <span class="truncate max-w-[10rem]">{{ rg.from !== rg.to ? (fmtDateOnlyAny(rg.from)+' – '+fmtDateOnlyAny(rg.to)) : fmtDateOnlyAny(rg.from) }}</span>
                        </span>
                      </template>
                    </template>
                    <template v-else>
                      <span v-if="info.ranges[0]" class="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-gray-50 px-1.5 py-0.5">
                        <i class="far fa-calendar-day"></i>
                        <span>{{ fmtDateOnlyAny(info.ranges[0].from) }}</span>
                      </span>
                    </template>
                  </template>
                </div>
              </div>

              <span :class="[chip, chipFor(item.status).cls]">
                {{ chipFor(item.status).title }}
              </span>
            </div>
          </button>

          <div v-if="moreLeave" class="flex justify-center">
            <RouterLink :to="{ name: 'MyLeaveApplications' }" class="text-[12px] text-blue-700 hover:underline">
              + {{ moreLeave }} more
            </RouterLink>
          </div>
        </div>
      </div>
    </section>

    <!-- ===== Short Leave ===== -->
    <section class="mt-4">
      <header
        class="flex items-center justify-between mb-1 cursor-pointer select-none"
        role="button"
        :aria-expanded="sections.short"
        @click="toggleSection('short')"
        tabindex="0"
      >
        <div class="flex items-center gap-2">
          <i class="fas fa-walking text-gray-600"></i>
          <h2 class="text-sm font-semibold text-gray-900">Short Leave</h2>
        </div>
        <div class="flex items-center gap-2">
          <!-- ✅ Only pending count -->
          <span class="text-[11px] rounded-full bg-yellow-100 text-gray-700 px-2 py-0.5">{{ shortPendingCount }}</span>
          <RouterLink :to="{ name: 'MyShortLeaves' }" class="text-[11px] text-blue-700 hover:underline" @click.stop>
            See all
          </RouterLink>
          <i class="fas fa-chevron-down text-gray-600 transition-transform duration-200" :class="sections.short ? 'rotate-180' : ''"/>
        </div>
      </header>

      <div v-show="sections.short">
        <hr class="border-gray-100" />
        <div v-if="shortLeaves.length === 0" class="text-xs italic text-center py-4 text-gray-500">No short leave</div>

        <div v-else class="py-2 space-y-1">
          <button
            v-for="item in visShort"
            :key="item.id"
            :class="itemBtn"
            @click="openShortLeaveModal(item.id)"
          >
            <div :class="line">
              <div class="min-w-0">
                <div class="text-[13px] text-gray-900 truncate">
                  <span class="font-medium">{{ fmtDateOnlyAny(item.date) }}</span>
                  <span class="opacity-70"> – {{ item.type || '—' }}</span>
                </div>
              </div>
              <span :class="[chip, chipFor(item.status).cls]">
                {{ chipFor(item.status).title }}
              </span>
            </div>
          </button>

          <div v-if="moreShort" class="flex justify-center">
            <RouterLink :to="{ name: 'MyShortLeaves' }" class="text-[12px] text-blue-700 hover:underline">
              + {{ moreShort }} more
            </RouterLink>
          </div>
        </div>
      </div>
    </section>

    <!-- ===== Exchange ===== -->
    <section class="mt-4">
      <header
        class="flex items-center justify-between mb-1 cursor-pointer select-none"
        role="button"
        :aria-expanded="sections.exch"
        @click="toggleSection('exch')"
        tabindex="0"
      >
        <div class="flex items-center gap-2">
          <i class="fas fa-exchange-alt text-gray-600"></i>
          <h2 class="text-sm font-semibold text-gray-900">Exchange</h2>
        </div>
        <div class="flex items-center gap-2">
          <!-- ✅ Only pending count -->
          <span class="text-[11px] rounded-full bg-yellow-100 text-gray-700 px-2 py-0.5">{{ exchPendingCount }}</span>
          <!-- 2টা see all link রাখা হল -->
          <RouterLink :to="{ name: 'MyShiftExchangeList' }" class="text-[11px] text-blue-700 hover:underline" @click.stop>
            Shift
          </RouterLink>
          <RouterLink :to="{ name: 'MyOffdayExchangeList' }" class="text-[11px] text-blue-700 hover:underline" @click.stop>
            Offday
          </RouterLink>
          <i class="fas fa-chevron-down text-gray-600 transition-transform duration-200" :class="sections.exch ? 'rotate-180' : ''"/>
        </div>
      </header>

      <div v-show="sections.exch">
        <hr class="border-gray-100" />
        <div v-if="exchanges.length === 0" class="text-xs italic text-center py-4 text-gray-500">No exchange</div>

        <div v-else class="py-2 space-y-1">
          <button
            v-for="item in visExch"
            :key="item.id"
            :class="itemBtn"
            @click="openExchangeModal(item)"
          >
            <div :class="line">
              <div class="min-w-0">
                <div class="text-[13px] text-gray-900 truncate">
                  <span class="font-medium">{{ fmtDateOnlyAny(item.current_date) }}</span>
                  <span class="opacity-70"> – {{ item.exchange_type || '—' }}</span>
                </div>
              </div>
              <span :class="[chip, chipFor(item.status).cls]">
                {{ chipFor(item.status).title }}
              </span>
            </div>
          </button>

          <div v-if="moreExch" class="flex justify-center">
            <RouterLink :to="{ name: 'MyShiftExchangeList' }" class="text-[12px] text-blue-700 hover:underline">
              + {{ moreExch }} more
            </RouterLink>
          </div>
        </div>
      </div>
    </section>

    <!-- ===== Manual Attendance ===== -->
    <section class="mt-4">
      <header
        class="flex items-center justify-between mb-1 cursor-pointer select-none"
        role="button"
        :aria-expanded="sections.manual"
        @click="toggleSection('manual')"
        tabindex="0"
      >
        <div class="flex items-center gap-2">
          <i class="fas fa-user-check text-gray-600"></i>
          <h2 class="text-sm font-semibold text-gray-900">Manual Attendance</h2>
        </div>
        <div class="flex items-center gap-2">
          <!-- ✅ Only pending count -->
          <span class="text-[11px] rounded-full bg-yellow-100 text-gray-700 px-2 py-0.5">{{ manualPendingCount }}</span>
          <RouterLink :to="{ name: 'MyManualAttendanceList' }" class="text-[11px] text-blue-700 hover:underline" @click.stop>
            See all
          </RouterLink>
          <i class="fas fa-chevron-down text-gray-600 transition-transform duration-200" :class="sections.manual ? 'rotate-180' : ''"/>
        </div>
      </header>

      <div v-show="sections.manual">
        <hr class="border-gray-100" />
        <div v-if="manuals.length === 0" class="text-xs italic text-center py-4 text-gray-500">No manual application</div>

        <div v-else class="py-2 space-y-1">
          <button
            v-for="item in visManual"
            :key="item.id"
            :class="itemBtn"
            @click="openManualAttendanceModal(item.id)"
          >
            <div :class="line">
              <div class="min-w-0">
                <div class="text-[13px] text-gray-900 truncate">
                  <span class="font-medium">
                    {{ item.check_in ? fmtDateOnlyAny(item.check_in) : fmtDateOnlyAny(item.check_out) }}
                  </span>
                  <span class="opacity-70"> – {{ item.type || '—' }}</span>
                </div>
              </div>
              <span :class="[chip, chipFor(item.status).cls]">
                {{ chipFor(item.status).title }}
              </span>
            </div>
          </button>

          <div v-if="moreManual" class="flex justify-center">
            <RouterLink :to="{ name: 'MyManualAttendanceList' }" class="text-[12px] text-blue-700 hover:underline">
              + {{ moreManual }} more
            </RouterLink>
          </div>
        </div>
      </div>
    </section>

    <!-- ===== Modals ===== -->
    <LeaveApplicationModal
      v-if="leaveModal.open"
      v-model:open="leaveModal.open"
      :id="leaveModal.id"
    />
    <ShortLeaveDetailsModal
      v-if="shortModal.open"
      v-model:open="shortModal.open"
      :id="shortModal.id"
    />
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
