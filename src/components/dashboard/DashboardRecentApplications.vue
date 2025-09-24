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

/* ----- leave modal ----- */
const leaveModal = ref({ open: false, id: null })
const openLeaveModal = (id) => { leaveModal.value = { open: true, id } }

/* ----- short leave modal ----- */
const shortLeaveModal = ref({ open: false, id: null })
const openShortLeaveModal = (id) => { shortLeaveModal.value = { open: true, id } }

/* ----- manual attendance modal ----- */
const manualModal = ref({ open: false, id: null })
const openManualAttendanceModal = (id) => { manualModal.value = { open: true, id } }

/* ------------------------------------------------------------------
   Unified Exchange Modal Controller (shift | offday)
   ------------------------------------------------------------------ */
const exchangeModal = ref({
  open: false,
  id: null,
  type: null // 'shift' | 'offday'
})

const openExchangeModal = (item) => {
  // backend gives exchange_type: 'shift' | 'offday'
  const type = (item?.exchange_type === 'offday') ? 'offday' : 'shift'
  exchangeModal.value = { open: true, id: item.id, type }
}

const activeExchangeComp = computed(() =>
  exchangeModal.value.type === 'offday' ? OffdayExchangeDetailsModal : ShiftExchangeDetailsModal
)
const exchangeKey = computed(() => `${exchangeModal.value.type || 'x'}-${exchangeModal.value.id || 'x'}`)
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
        <button
          v-for="leaveApplication in leaveApps"
          :key="leaveApplication.id"
          class="block w-full text-left"
          @click="openLeaveModal(leaveApplication.id)"
        >
          <div class="flex justify-between items-center py-2 rounded hover:bg-sky-50 transition-colors">
            <h3 class="text-sm text-gray-800">#{{ leaveApplication.id }} ({{ typeNamesWithDays(leaveApplication.leave_type_counts) }})</h3>
            <span class="font-medium flex items-center whitespace-nowrap text-xs px-2 py-1 rounded-full"
                  :class="chipFor(leaveApplication.status).cls">
              <i v-if="leaveApplication.status === null" class="fas fa-clock mr-2"></i>
              <i v-else-if="leaveApplication.status === 'Pending'" class="fas fa-hourglass-half mr-2"></i>
              <i v-else-if="leaveApplication.status === 'Approved'" class="fas fa-check-circle mr-2"></i>
              <i v-else class="fas fa-times-circle mr-2"></i>
              {{ chipFor(leaveApplication.status).title }}
            </span>
          </div>
        </button>
      </div>
    </div>

    <!-- Short Leave -->
    <div class="mt-6">
      <div class="flex items-center justify-between mb-1">
        <div class="flex items-center">
          <i class="fas fa-walking mr-2 h-5 w-5"></i>
          <h2 class="text-base font-semibold">Short Leave</h2>
        </div>
        <RouterLink :to="{ name: 'MyShortLeaves' }" class="text-xs text-blue-600 hover:underline">
          See more
        </RouterLink>
      </div>
      <hr />

      <div v-if="shortLeaves.length === 0" class="text-xs italic text-center py-4 text-gray-500 mt-2">
        No short leave
      </div>

      <div v-else class="py-3 divide-y">
        <button
          v-for="item in shortLeaves"
          :key="item.id"
          class="w-full text-left"
          @click="openShortLeaveModal(item.id)"
        >
          <div class="flex justify-between items-center py-2 rounded hover:bg-sky-50 transition-colors">
            <h3 class="text-sm text-gray-800"># {{ item.id }} ({{ item.type }})</h3>
            <span class="text-xs px-2 py-1 rounded-full" :class="chipFor(item.status).cls">
              {{ chipFor(item.status).title }}
            </span>
          </div>
        </button>
      </div>
    </div>

    <!-- Exchange (Shift + Offday handled via ONE controller) -->
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
        <button
          v-for="item in exchanges"
          :key="item.id"
          class="block w-full text-left"
          @click="openExchangeModal(item)"
        >
          <div class="flex justify-between items-center py-2 rounded hover:bg-sky-50 transition-colors">
            <h3 class="text-sm text-gray-800"># {{ item.id }}
              <span v-if="item.exchange_type" class="opacity-70"> ({{ item.exchange_type }})</span>
            </h3>
            <span class="text-xs px-2 py-1 rounded-full" :class="chipFor(item.status).cls">
              {{ chipFor(item.status).title }}
            </span>
          </div>
        </button>
      </div>
    </div>

    <!-- Manual Attendance -->
    <div class="mt-6">
      <div class="flex items-center justify-between mb-1">
        <div class="flex items-center">
          <i class="fas fa-user-check mr-2 h-5 w-5"></i>
          <h2 class="text-base font-semibold">Manual Attendance</h2>
        </div>
        <RouterLink :to="{ name: 'MyManualAttendanceList' }" class="text-xs text-blue-600 hover:underline">
          See more
        </RouterLink>
      </div>
      <hr />

      <div v-if="manuals.length === 0" class="text-xs italic text-center py-4 text-gray-500 mt-2">
        No manual application
      </div>

      <div v-else class="py-3 divide-y">
        <button
          v-for="item in manuals"
          :key="item.id"
          class="block w-full text-left"
          @click="openManualAttendanceModal(item.id)"
        >
          <div class="flex justify-between items-center py-2 rounded hover:bg-sky-50 transition-colors">
            <h3 class="text-sm text-gray-800"># {{ item.id }} ({{ item.type }})</h3>
            <span class="text-xs px-2 py-1 rounded-full" :class="chipFor(item.status).cls">
              {{ chipFor(item.status).title }}
            </span>
          </div>
        </button>
      </div>
    </div>

    <!-- Modals (lazy + only when open) -->
    <LeaveApplicationModal
      v-if="leaveModal.open"
      v-model:open="leaveModal.open"
      :id="leaveModal.id"
    />

    <ShortLeaveDetailsModal
      v-if="shortLeaveModal.open"
      v-model:open="shortLeaveModal.open"
      :id="shortLeaveModal.id"
    />

    <ManualAttendanceDetailsModal
      v-if="manualModal.open"
      v-model:open="manualModal.open"
      :id="manualModal.id"
    />

    <!-- Unified Exchange Modal (shift/offday) -->
    <component
      :is="activeExchangeComp"
      v-if="exchangeModal.open"
      :key="exchangeKey"
      v-model:open="exchangeModal.open"
      :id="exchangeModal.id"
    />
  </div>
</template>
