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

/* ===== Status Chip ===== */
const STATUS_STYLES = {
  null:       { title: 'Handover Waiting', cls: 'bg-gray-500 text-white' },
  Pending:    { title: 'Pending',          cls: 'bg-yellow-500 text-white' },
  Approved:   { title: 'Approved',         cls: 'bg-green-500 text-white' },
  Rejected:   { title: 'Rejected',         cls: 'bg-red-500 text-white' }
}
const chipFor = (status) =>
  STATUS_STYLES[status ?? 'null'] ?? { title: String(status || 'Unknown'), cls: 'bg-gray-400 text-white' }

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
const exchangeKey = computed(() =>
  `${exchangeModal.value.type || 'x'}-${exchangeModal.value.id || 'x'}`)

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

/* Tiny UI util: badge classes */
const badge = 'inline-flex items-center rounded-full border px-2 py-0.5 text-[12px]'
const badgeMuted = 'border-gray-300 bg-gray-50 text-gray-800'
const badgeInfo  = 'border-sky-200 bg-sky-50 text-sky-700'

/* ===== Expand/Collapse state (default: all open) ===== */
const sections = ref({
  apps:   true,
  short:  true,
  exch:   true,
  manual: true,
})
const toggleSection = (key) => { sections.value[key] = !sections.value[key] }
</script>

<template>
  <div class="bg-white shadow-sm rounded-xl p-4">
    <!-- Section: Applications -->
    <section>
      <header
        class="flex items-center justify-between mb-1 cursor-pointer select-none"
        role="button"
        :aria-expanded="sections.apps"
        @click="toggleSection('apps')"
        @keydown.enter.prevent="toggleSection('apps')"
        @keydown.space.prevent="toggleSection('apps')"
        tabindex="0"
      >
        <div class="flex items-center gap-2">
          <i class="fas fa-file h-5 w-5 text-gray-600"></i>
          <h2 class="text-lg font-semibold text-gray-900">Applications
            <span class="text-xs ml-2 text-green-600 font-medium">Latest</span>
          </h2>
        </div>
        <div class="flex items-center gap-3">
          <RouterLink
            :to="{ name: 'MyLeaveApplications' }"
            class="text-xs text-blue-600 hover:underline"
            @click.stop
          >
            See more
          </RouterLink>
          <i
            class="fas fa-chevron-down text-gray-600 transition-transform duration-200"
            :class="sections.apps ? 'rotate-180' : ''"
            aria-hidden="true"
          />
        </div>
      </header>

      <div v-show="sections.apps">
        <hr class="border-gray-200" />
        <div v-if="leaveApps.length === 0" class="text-xs italic text-center py-4 text-gray-500 mt-2">
          No applications
        </div>

        <div v-else class="py-3 divide-y divide-gray-100">
          <button
            v-for="item in leaveApps"
            :key="item.id"
            class="block w-full text-left"
            @click="openLeaveModal(item.id)"
          >
            <div class="flex justify-between items-center py-2 rounded hover:bg-sky-50/60 transition-colors">
              <h3 class="text-sm text-gray-900 min-w-0">
                <span class="font-medium">#{{ item.id }}</span>
                <span class="opacity-70"> ({{ typeNamesWithDays(item.leave_type_counts) }})</span>
              </h3>
              <span class="font-medium flex items-center whitespace-nowrap text-[11px] px-2 py-0.5 rounded-full"
                    :class="chipFor(item.status).cls">
                <i v-if="item.status === null" class="fas fa-clock mr-1.5"></i>
                <i v-else-if="item.status === 'Pending'" class="fas fa-hourglass-half mr-1.5"></i>
                <i v-else-if="item.status === 'Approved'" class="fas fa-check-circle mr-1.5"></i>
                <i v-else class="fas fa-times-circle mr-1.5"></i>
                {{ chipFor(item.status).title }}
              </span>
            </div>

            <div class="mb-1 text-gray-700 flex flex-wrap items-center gap-x-2.5 gap-y-1">
              <template v-for="info in [buildLeaveRanges(item.json_data)]" :key="'info-'+item.id">
                <template v-if="info.leaveCount > 1">
                  <template v-for="(rg, idx) in info.ranges" :key="idx">
                    <span :class="[badge, badgeMuted]"
                          :title="rg.from === rg.to ? fmtDateOnlyAny(rg.from) : (fmtDateOnlyAny(rg.from)+' – '+fmtDateOnlyAny(rg.to))">
                      <i class="far fa-calendar-minus mr-1"></i>
                      <template v-if="rg.from !== rg.to">
                        <span class="truncate max-w-[9.5rem] sm:max-w-none">{{ fmtDateOnlyAny(rg.from) }}</span>
                        <span class="mx-1">–</span>
                        <span class="truncate max-w-[9.5rem] sm:max-w-none">{{ fmtDateOnlyAny(rg.to) }}</span>
                      </template>
                      <template v-else>
                        <span class="truncate max-w-[10rem] sm:max-w-none">{{ fmtDateOnlyAny(rg.from) }}</span>
                      </template>
                    </span>
                  </template>
                </template>
                <template v-else>
                  <span v-if="info.ranges[0]" :class="[badge, badgeMuted]" :title="fmtDateOnlyAny(info.ranges[0].from)">
                    <i class="far fa-calendar-day mr-1"></i>
                    {{ fmtDateOnlyAny(info.ranges[0].from) }}
                  </span>
                </template>
              </template>
            </div>
          </button>
        </div>
      </div>
    </section>

    <!-- Section: Short Leave -->
    <section class="mt-6">
      <header
        class="flex items-center justify-between mb-1 cursor-pointer select-none"
        role="button"
        :aria-expanded="sections.short"
        @click="toggleSection('short')"
        @keydown.enter.prevent="toggleSection('short')"
        @keydown.space.prevent="toggleSection('short')"
        tabindex="0"
      >
        <div class="flex items-center gap-2">
          <i class="fas fa-walking h-5 w-5 text-gray-600"></i>
          <h2 class="text-base font-semibold text-gray-900">Short Leave</h2>
        </div>
        <div class="flex items-center gap-3">
          <RouterLink :to="{ name: 'MyShortLeaves' }" class="text-xs text-blue-600 hover:underline" @click.stop>
            See more
          </RouterLink>
          <i class="fas fa-chevron-down text-gray-600 transition-transform duration-200"
             :class="sections.short ? 'rotate-180' : ''"
             aria-hidden="true" />
        </div>
      </header>

      <div v-show="sections.short">
        <hr class="border-gray-200" />
        <div v-if="shortLeaves.length === 0" class="text-xs italic text-center py-4 text-gray-500 mt-2">
          No short leave
        </div>

        <div v-else class="py-3 divide-y divide-gray-100">
          <button
            v-for="item in shortLeaves"
            :key="item.id"
            class="w-full text-left"
            @click="openShortLeaveModal(item.id)"
          >
            <div class="flex justify-between items-center py-2 rounded hover:bg-sky-50/60 transition-colors">
              <h3 class="text-sm text-gray-900 min-w-0">
                <span :class="[badge, badgeMuted, 'text-xs mr-1']">{{ fmtDateOnlyAny(item.date) }}</span>
                <span class="opacity-80">({{ item.type || '—' }})</span>
              </h3>
              <span class="text-[11px] px-2 py-0.5 rounded-full" :class="chipFor(item.status).cls">
                {{ chipFor(item.status).title }}
              </span>
            </div>
          </button>
        </div>
      </div>
    </section>

    <!-- Section: Exchange -->
    <section class="mt-6">
      <header
        class="flex items-center justify-between mb-1 cursor-pointer select-none"
        role="button"
        :aria-expanded="sections.exch"
        @click="toggleSection('exch')"
        @keydown.enter.prevent="toggleSection('exch')"
        @keydown.space.prevent="toggleSection('exch')"
        tabindex="0"
      >
        <div class="flex items-center gap-2">
          <i class="fas fa-exchange-alt h-5 w-5 text-gray-600"></i>
          <h2 class="text-base font-semibold text-gray-900">Exchange</h2>
        </div>
        <div class="flex items-center gap-3">
          <RouterLink :to="{ name: 'MyShiftExchangeList' }" class="text-xs text-blue-600 hover:underline" @click.stop>
            Shift
          </RouterLink>
          <RouterLink :to="{ name: 'MyOffdayExchangeList' }" class="text-xs text-blue-600 hover:underline" @click.stop>
            Offday
          </RouterLink>
          <i class="fas fa-chevron-down text-gray-600 transition-transform duration-200"
             :class="sections.exch ? 'rotate-180' : ''"
             aria-hidden="true" />
        </div>
      </header>

      <div v-show="sections.exch">
        <hr class="border-gray-200" />
        <div v-if="exchanges.length === 0" class="text-xs italic text-center py-4 text-gray-500 mt-2">
          No exchange
        </div>

        <div v-else class="py-3 divide-y divide-gray-100">
          <button
            v-for="item in exchanges"
            :key="item.id"
            class="block w-full text-left"
            @click="openExchangeModal(item)"
          >
            <div class="flex justify-between items-center py-2 rounded hover:bg-sky-50/60 transition-colors">
              <h3 class="text-sm text-gray-900 min-w-0">
                <span :class="[badge, badgeMuted, 'text-xs mr-1']">{{ fmtDateOnlyAny(item.current_date) }}</span>
                <span class="opacity-80">({{ item.exchange_type || '—' }})</span>
              </h3>
              <span class="text-[11px] px-2 py-0.5 rounded-full" :class="chipFor(item.status).cls">
                {{ chipFor(item.status).title }}
              </span>
            </div>
          </button>
        </div>
      </div>
    </section>

    <!-- Section: Manual Attendance -->
    <section class="mt-6">
      <header
        class="flex items-center justify-between mb-1 cursor-pointer select-none"
        role="button"
        :aria-expanded="sections.manual"
        @click="toggleSection('manual')"
        @keydown.enter.prevent="toggleSection('manual')"
        @keydown.space.prevent="toggleSection('manual')"
        tabindex="0"
      >
        <div class="flex items-center gap-2">
          <i class="fas fa-user-check h-5 w-5 text-gray-600"></i>
          <h2 class="text-base font-semibold text-gray-900">Manual Attendance</h2>
        </div>
        <div class="flex items-center gap-3">
          <RouterLink :to="{ name: 'MyManualAttendanceList' }" class="text-xs text-blue-600 hover:underline" @click.stop>
            See more
          </RouterLink>
          <i class="fas fa-chevron-down text-gray-600 transition-transform duration-200"
             :class="sections.manual ? 'rotate-180' : ''"
             aria-hidden="true" />
        </div>
      </header>

      <div v-show="sections.manual">
        <hr class="border-gray-200" />
        <div v-if="manuals.length === 0" class="text-xs italic text-center py-4 text-gray-500 mt-2">
          No manual application
        </div>

        <div v-else class="py-3 divide-y divide-gray-100">
          <button
            v-for="item in manuals"
            :key="item.id"
            class="block w-full text-left"
            @click="openManualAttendanceModal(item.id)"
          >
            <div class="flex justify-between items-center py-2 rounded hover:bg-sky-50/60 transition-colors">
              <h3 class="text-sm text-gray-900 min-w-0">
                <span :class="[badge, badgeMuted, 'text-xs mr-1']">
                  {{ item.check_in ? fmtDateOnlyAny(item.check_in) : fmtDateOnlyAny(item.check_out) }}
                </span>
                <span class="opacity-80">({{ item.type || '—' }})</span>
              </h3>
              <span class="text-[11px] px-2 py-0.5 rounded-full" :class="chipFor(item.status).cls">
                {{ chipFor(item.status).title }}
              </span>
            </div>
          </button>
        </div>
      </div>
    </section>

    <!-- Modals (lazy + only when open) -->
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
