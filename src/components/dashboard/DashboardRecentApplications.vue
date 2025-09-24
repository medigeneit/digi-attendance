<script setup>
import { useUserStore } from '@/stores/user'
import { storeToRefs } from 'pinia'
import { computed, ref, defineAsyncComponent } from 'vue'

/* ----- lazy imports (cuts bundle size) ----- */
const LeaveApplicationModal         = defineAsyncComponent(() => import('@/components/LeaveApplicationModal.vue'))
const ShortLeaveDetailsModal        = defineAsyncComponent(() => import('@/components/ShortLeaveDetailsModal.vue'))
const ManualAttendanceDetailsModal  = defineAsyncComponent(() => import('@/components/ManualAttendanceDetailsModal.vue'))
const ShiftExchangeDetailsModal     = defineAsyncComponent(() => import('@/components/ShiftExchangeDetailsModal.vue'))
const OffdayExchangeDetailsModal    = defineAsyncComponent(() => import('@/components/OffdayExchangeDetailsModal.vue'))

/* ----- store ----- */
const userStore = useUserStore()
const { userDashboard } = storeToRefs(userStore)

/* ----- lists (API “lists” shape) ----- */
const lists        = computed(() => userDashboard.value?.lists ?? {})
const leaveApps    = computed(() => lists.value.current_month_leave ?? [])
const shortLeaves  = computed(() => lists.value.short_leave ?? [])
const exchanges    = computed(() => lists.value.exchange ?? [])
const manuals      = computed(() => lists.value.manual_attendance ?? [])

/* ----- status chip (constant map) ----- */
const STATUS_STYLES = {
  null:       { title: 'Handover Waiting', cls: 'bg-gray-500 text-white' },
  Pending:    { title: 'Pending',          cls: 'bg-yellow-500 text-white' },
  Approved:   { title: 'Approved',         cls: 'bg-green-500 text-white' },
  Rejected:   { title: 'Rejected',         cls: 'bg-red-500 text-white' }
}
const chipFor = (status) => STATUS_STYLES[status ?? 'null'] ?? { title: String(status || 'Unknown'), cls: 'bg-gray-400 text-white' }

/* ----- utilities ----- */
const typeNamesWithDays = (counts) =>
  Array.isArray(counts)
    ? counts.filter(c => c?.name).map(c => `${c.name} (${c?.days ?? 0})`).join(', ')
    : ''

const fmtDate = (d) => {
  if (!d) return ''
  try {
    const x = new Date(d)
    return x.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })
  } catch { return d }
}

/* ====== Expand/Collapse state ====== */
/* Applications */
const openLeaveMap = ref(Object.create(null))
const isLeaveOpen = (id) => !!openLeaveMap.value[id]
const toggleLeave = (id, e) => { if (e) e.stopPropagation(); openLeaveMap.value[id] = !openLeaveMap.value[id] }

/* Short Leave */
const openShortMap = ref(Object.create(null))
const isShortOpen = (id) => !!openShortMap.value[id]
const toggleShort = (id, e) => { if (e) e.stopPropagation(); openShortMap.value[id] = !openShortMap.value[id] }

/* Exchange */
const openExchangeMap = ref(Object.create(null))
const isExchangeOpen = (id) => !!openExchangeMap.value[id]
const toggleExchange = (id, e) => { if (e) e.stopPropagation(); openExchangeMap.value[id] = !openExchangeMap.value[id] }

/* Manual Attendance */
const openManualMap = ref(Object.create(null))
const isManualOpen = (id) => !!openManualMap.value[id]
const toggleManual = (id, e) => { if (e) e.stopPropagation(); openManualMap.value[id] = !openManualMap.value[id] }

/* ----- leave modal ----- */
const leaveModal = ref({ open: false, id: null })
const openLeaveModal = (id) => { leaveModal.value = { open: true, id } }

/* ----- short leave modal ----- */
const shortLeaveModal = ref({ open: false, id: null })
const openShortLeaveModal = (id) => { shortLeaveModal.value = { open: true, id } }

/* ----- manual attendance modal ----- */
const manualModal = ref({ open: false, id: null })
const openManualAttendanceModal = (id) => { manualModal.value = { open: true, id } }

/* ----- Unified Exchange Modal (shift | offday) ----- */
const exchangeModal = ref({ open: false, id: null, type: null })
const openExchangeModal = (item) => {
  const type = (item?.exchange_type === 'offday') ? 'offday' : 'shift'
  exchangeModal.value = { open: true, id: item.id, type }
}
const activeExchangeComp = computed(() =>
  exchangeModal.value.type === 'offday' ? OffdayExchangeDetailsModal : ShiftExchangeDetailsModal
)
const exchangeKey = computed(() => `${exchangeModal.value.type || 'x'}-${exchangeModal.value.id || 'x'}`)

function parseSqlDateTime(input) {
  if (!input) return null;
  if (input instanceof Date) return isNaN(input) ? null : input;

  // Accept both 'YYYY-MM-DD' and 'YYYY-MM-DD HH:mm:ss'
  const m = String(input).match(
    /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?$/
  );
  if (!m) return null;

  const [, Y, M, D, hh='00', mm='00', ss='00'] = m;
  // Create local Date to avoid timezone surprises of Date.parse on non-ISO strings
  return new Date(
    Number(Y),
    Number(M) - 1,
    Number(D),
    Number(hh),
    Number(mm),
    Number(ss)
  );
}

const fmtDateOnly = (value) => {
  const d = parseSqlDateTime(value);
  return d ? d.toLocaleDateString(undefined, { year:'numeric', month:'short', day:'2-digit' }) : '';
};
</script>

<template>
  <div class="bg-white shadow-md rounded-lg p-4">
    <!-- Leave Applications (latest 3) -->
    <div>
      <div class="flex items-center justify-between mb-1">
        <div class="flex items-center">
          <i class="fas fa-file mr-2 h-5 w-5"></i>
          <h2 class="text-xl font-semibold">
            Applications <span class="text-xs ml-2 text-green-600">Latest</span>
          </h2>
        </div>
        <RouterLink :to="{ name: 'MyLeaveApplications' }" class="text-xs text-blue-600 hover:underline">
          See more
        </RouterLink>
      </div>
      <hr />

      <div v-if="leaveApps.length === 0" class="text-xs italic text-center py-4 text-gray-500 mt-2">
        No applications
      </div>

      <div v-else class="py-3 divide-y">
        <div v-for="leave in leaveApps" :key="leave.id" class="w-full">
          <!-- Summary row -->
          <button class="w-full text-left" @click="openLeaveModal(leave.id)">
            <div class="flex justify-between items-center py-2 rounded hover:bg-sky-50 transition-colors">
              <div class="flex items-center gap-2 min-w-0">
                <button class="shrink-0 inline-flex h-6 w-6 items-center justify-center rounded hover:bg-gray-100"
                        :aria-label="isLeaveOpen(leave.id) ? 'Collapse details' : 'Expand details'"
                        @click="toggleLeave(leave.id, $event)">
                  <i class="fas fa-chevron-right transition-transform duration-200"
                     :class="isLeaveOpen(leave.id) ? 'rotate-90' : ''"></i>
                </button>
                <h3 class="text-sm text-gray-800 truncate">
                  #{{ leave.id }} <span class="opacity-70">({{ typeNamesWithDays(leave.leave_type_counts) }})</span>
                </h3>
              </div>
              <span class="text-xs px-2 py-1 rounded-full font-medium flex items-center whitespace-nowrap"
                    :class="chipFor(leave.status).cls">
                {{ chipFor(leave.status).title }}
              </span>
            </div>
          </button>

          <!-- Details -->
          <transition name="accordion">
            <div v-show="isLeaveOpen(leave.id)" class="px-3 pb-2">
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
                <div class="rounded border border-gray-200 p-1 bg-gray-50">
                  <div class="text-gray-500">Types</div>
                  <div class="font-medium text-gray-800">
                    {{ typeNamesWithDays(leave.leave_type_counts) || '—' }}
                  </div>
                </div>
                <div class="rounded border border-gray-200 p-1 bg-gray-50">
                  <div class="text-gray-500">Total days</div>
                  <div class="font-medium text-gray-800">{{ leave.total_days ?? '—' }}</div>
                </div>
                <div class="rounded border border-gray-200 p-1 bg-gray-50">
                  <div class="text-gray-500">Resumption</div>
                  <div class="font-medium text-gray-800">{{ fmtDate(leave.resumption_date) || '—' }}</div>
                </div>
              </div>

              <div class="mt-3">
                <div class="text-[12px] text-gray-500 mb-1">Dates</div>
                <div class="flex flex-wrap gap-2">
                  <span v-for="(d, i) in leave.json_data || []" :key="i"
                        class="inline-flex items-center rounded-full px-2 py-0.5 border text-[12px]"
                        :class="d?.leave_type_id === 'weekend'
                          ? 'bg-gray-100 text-gray-700 border-gray-300'
                          : 'bg-sky-50 text-sky-700 border-sky-200'">
                    {{ fmtDate(d?.date) }}
                    <span v-if="d?.leave_type_id == 'weekend'" class="ml-1 opacity-70">(Weekend)</span>
                  </span>
                </div>
              </div>
            </div>
          </transition>
        </div>
      </div>
    </div>

    <!-- Short Leave (expand/collapse) -->
    <div class="mt-6">
      <div class="flex items-center justify-between mb-1">
        <div class="flex items-center">
          <i class="fas fa-walking mr-2 h-5 w-5"></i>
          <h2 class="text-base font-semibold">Short Leave</h2>
        </div>
        <RouterLink :to="{ name: 'MyShortLeaves' }" class="text-xs text-blue-600 hover:underline">See more</RouterLink>
      </div>
      <hr />

      <div v-if="shortLeaves.length === 0" class="text-xs italic text-center py-4 text-gray-500 mt-2">
        No short leave
      </div>

      <div v-else class="py-3 divide-y">
        <div v-for="item in shortLeaves" :key="item.id" class="w-full">
          <!-- Summary row -->
          <button class="w-full text-left" @click="openShortLeaveModal(item.id)">
            <div class="flex justify-between items-center py-2 rounded hover:bg-sky-50 transition-colors">
              <div class="flex items-center gap-2 min-w-0">
                <button class="shrink-0 inline-flex h-6 w-6 items-center justify-center rounded hover:bg-gray-100"
                        :aria-label="isShortOpen(item.id) ? 'Collapse details' : 'Expand details'"
                        @click="toggleShort(item.id, $event)">
                  <i class="fas fa-chevron-right transition-transform duration-200"
                     :class="isShortOpen(item.id) ? 'rotate-90' : ''"></i>
                </button>
                <h3 class="text-sm text-gray-800 truncate">
                  #{{ item.id }} <span class="opacity-70">({{ item.type }})</span>
                </h3>
              </div>
              <span class="text-xs px-2 py-1 rounded-full" :class="chipFor(item.status).cls">
                {{ chipFor(item.status).title }}
              </span>
            </div>
          </button>

          <!-- Details -->
          <transition name="accordion">
            <div v-show="isShortOpen(item.id)" class="px-3 pb-3">
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[11px]">
                <div class="rounded border border-gray-200 p-2 bg-gray-50">
                  <div class="text-gray-500">Type</div>
                  <div class="font-medium text-gray-800">{{ item.type || '—' }}</div>
                </div>
                <div class="rounded border border-gray-200 p-2 bg-gray-50">
                  <div class="text-gray-500">Date</div>
                  <div class="font-medium text-gray-800">{{ fmtDate(item.date) || '—' }}</div>
                </div>
                <div class="rounded border border-gray-200 p-2 bg-gray-50">
                  <div class="text-gray-500">Status</div>
                  <div class="font-medium text-gray-800">{{ chipFor(item.status).title }}</div>
                </div>
              </div>
            </div>
          </transition>
        </div>
      </div>
    </div>

    <!-- Exchange (expand/collapse + unified modal) -->
    <div class="mt-6">
      <div class="flex items-center justify-between mb-1">
        <div class="flex items-center">
          <i class="fas fa-exchange-alt mr-2 h-5 w-5"></i>
          <h2 class="text-base font-semibold">Exchange</h2>
        </div>
        <div class="flex items-center gap-3">
          <RouterLink :to="{ name: 'MyShiftExchangeList' }" class="text-xs text-blue-600 hover:underline">Shift</RouterLink>
          <RouterLink :to="{ name: 'MyOffdayExchangeList' }" class="text-xs text-blue-600 hover:underline">Offday</RouterLink>
        </div>
      </div>
      <hr />

      <div v-if="exchanges.length === 0" class="text-xs italic text-center py-4 text-gray-500 mt-2">
        No exchange
      </div>

      <div v-else class="py-3 divide-y">
        <div v-for="ex in exchanges" :key="ex.id" class="w-full">
          <!-- Summary row -->
          <button class="w-full text-left" @click="openExchangeModal(ex)">
            <div class="flex justify-between items-center py-2 rounded hover:bg-sky-50 transition-colors">
              <div class="flex items-center gap-2 min-w-0">
                <button class="shrink-0 inline-flex h-6 w-6 items-center justify-center rounded hover:bg-gray-100"
                        :aria-label="isExchangeOpen(ex.id) ? 'Collapse details' : 'Expand details'"
                        @click="toggleExchange(ex.id, $event)">
                  <i class="fas fa-chevron-right transition-transform duration-200"
                     :class="isExchangeOpen(ex.id) ? 'rotate-90' : ''"></i>
                </button>
                <h3 class="text-sm text-gray-800 truncate">
                  #{{ ex.id }} <span class="opacity-70" v-if="ex.exchange_type">({{ ex.exchange_type }})</span>
                </h3>
              </div>
              <span class="text-xs px-2 py-1 rounded-full" :class="chipFor(ex.status).cls">
                {{ chipFor(ex.status).title }}
              </span>
            </div>
          </button>

          <!-- Details -->
          <transition name="accordion">
            <div v-show="isExchangeOpen(ex.id)" class="px-3 pb-3">
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[11px]">
                <div class="rounded border border-gray-200 p-2 bg-gray-50">
                  <div class="text-gray-500">Type</div>
                  <div class="font-medium text-gray-800">{{ ex.exchange_type || '—' }}</div>
                </div>
                <div class="rounded border border-gray-200 p-2 bg-gray-50">
                  <div class="text-gray-500">Current date</div>
                  <div class="font-medium text-gray-800">{{ fmtDate(ex.current_date) || '—' }}</div>
                </div>
                <div class="rounded border border-gray-200 px-2 bg-gray-50">
                  <div class="text-gray-500">Status</div>
                  <div class="font-medium text-gray-800">{{ chipFor(ex.status).title }}</div>
                </div>
              </div>
            </div>
          </transition>
        </div>
      </div>
    </div>

    <!-- Manual Attendance (expand/collapse) -->
    <div class="mt-6">
      <div class="flex items-center justify-between mb-1">
        <div class="flex items-center">
          <i class="fas fa-user-check mr-2 h-5 w-5"></i>
          <h2 class="text-base font-semibold">Manual Attendance</h2>
        </div>
      <RouterLink :to="{ name: 'MyManualAttendanceList' }" class="text-xs text-blue-600 hover:underline">See more</RouterLink>
      </div>
      <hr />

      <div v-if="manuals.length === 0" class="text-xs italic text-center py-4 text-gray-500 mt-2">
        No manual application
      </div>

      <div v-else class="py-3 divide-y">
        <div v-for="m in manuals" :key="m.id" class="w-full">
          <!-- Summary row -->
          <button class="w-full text-left" @click="openManualAttendanceModal(m.id)">
            <div class="flex justify-between items-center py-2 rounded hover:bg-sky-50 transition-colors">
              <div class="flex items-center gap-2 min-w-0">
                <button class="shrink-0 inline-flex h-6 w-6 items-center justify-center rounded hover:bg-gray-100"
                        :aria-label="isManualOpen(m.id) ? 'Collapse details' : 'Expand details'"
                        @click="toggleManual(m.id, $event)">
                  <i class="fas fa-chevron-right transition-transform duration-200"
                     :class="isManualOpen(m.id) ? 'rotate-90' : ''"></i>
                </button>
                <h3 class="text-sm text-gray-800 truncate">
                  #{{ m.id }} <span class="opacity-70">({{ m.type }})</span>
                </h3>
              </div>
              <span class="text-xs px-2 py-1 rounded-full" :class="chipFor(m.status).cls">
                {{ chipFor(m.status).title }}
              </span>
            </div>
          </button>

          <!-- Details -->
          <transition name="accordion">
            <div v-show="isManualOpen(m.id)" class="px-3 pb-3">
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[13px]">
                <div class="rounded border border-gray-200 p-2 bg-gray-50">
                  <div class="text-gray-500">Type</div>
                  <div class="font-medium text-gray-800">{{ m.type || '—' }}</div>
                </div>
                <div class="rounded border border-gray-200 p-2 bg-gray-50">
                  <div class="text-gray-500">Check-in</div>
                  <div class="font-medium text-gray-800">{{ m.check_in ? fmtDateOnly(m.check_in) : fmtDateOnly(m.check_out) }}</div>
                </div>
                <div class="rounded border border-gray-200 p-2 bg-gray-50">
                  <div class="text-gray-500">Status</div>
                  <div class="font-medium text-gray-800">{{ chipFor(m.status).title }}</div>
                </div>
              </div>
            </div>
          </transition>
        </div>
      </div>
    </div>

    <!-- Modals (lazy + only when open) -->
    <LeaveApplicationModal v-if="leaveModal.open" v-model:open="leaveModal.open" :id="leaveModal.id" />
    <ShortLeaveDetailsModal v-if="shortLeaveModal.open" v-model:open="shortLeaveModal.open" :id="shortLeaveModal.id" />
    <ManualAttendanceDetailsModal v-if="manualModal.open" v-model:open="manualModal.open" :id="manualModal.id" />

    <!-- Unified Exchange Modal (shift/offday) -->
    <component :is="activeExchangeComp" v-if="exchangeModal.open" :key="exchangeKey" v-model:open="exchangeModal.open" :id="exchangeModal.id" />
  </div>
</template>

<style scoped>
/* accordion transition (auto-height) */
.accordion-enter-from,
.accordion-leave-to { max-height: 0; opacity: 0; }
.accordion-enter-to,
.accordion-leave-from { max-height: 500px; opacity: 1; }
.accordion-enter-active,
.accordion-leave-active { transition: all .25s ease; overflow: hidden; }
</style>
