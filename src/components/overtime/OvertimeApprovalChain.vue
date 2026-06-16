<script setup>
import { useNotificationStore } from '@/stores/notification'
import { computed } from 'vue'

const props = defineProps({
  overtimes: {
    type: Array,
    default: () => [],
  },
})

const notificationStore = useNotificationStore()

// Canonical order + labels for every possible approval step key.
// Add new keys here if the backend introduces them — the filter below
// ensures only configured ones are shown.
const STEP_DEFS = [
  { key: 'handover',          label: 'Handover' },
  { key: 'in_charge',         label: 'In Charge' },
  { key: 'coordinator',       label: 'Coordinator' },
  { key: 'operational_admin', label: 'Operational Admin' },
  { key: 'recommend_by',      label: 'Recommend By' },
  { key: 'approved_by',       label: 'Approved By' },
]

const firstOvertime = computed(() => props.overtimes[0] ?? null)
const rule = computed(() => firstOvertime.value?.user?.overtime_approval ?? null)

const steps = computed(() => {
  if (!rule.value) return []
  const r = rule.value
  return STEP_DEFS
    .map((def) => ({
      ...def,
      user:   r[`${def.key}_user`],
      userId: r[`${def.key}_user_id`],
    }))
    .filter((s) => s.userId || s.user?.id)
})

const stepStatus = (key) => {
  if (!props.overtimes.length) return 'pending'
  const approved = props.overtimes.filter((o) => o[`${key}_user_id`]).length
  if (approved === props.overtimes.length) return 'approved'
  if (approved > 0) return 'partial'
  return 'pending'
}

const canActAtStep = (key) =>
  Object.values(notificationStore.applicationApprovalPermissions).some(
    (p) => p?.[`allow_${key}`],
  )

const statusIcon = (key) => {
  const s = stepStatus(key)
  if (s === 'approved') return 'fas fa-check'
  if (s === 'partial')  return 'fas fa-adjust'
  return null
}

const circleClass = (key) => {
  const s = stepStatus(key)
  const mine = canActAtStep(key)
  if (s === 'approved') return 'bg-emerald-500 border-emerald-500 text-white'
  if (s === 'partial')  return 'bg-amber-400 border-amber-400 text-white'
  if (mine)             return 'bg-blue-600 border-blue-600 text-white ring-2 ring-offset-1 ring-blue-400'
  return 'bg-gray-100 border-gray-300 text-gray-500'
}

const cardClass = (key) => {
  const s = stepStatus(key)
  const mine = canActAtStep(key)
  if (s === 'approved') return 'border-emerald-200 bg-emerald-50'
  if (s === 'partial')  return 'border-amber-200 bg-amber-50'
  if (mine)             return 'border-blue-200 bg-blue-50'
  return 'border-gray-200 bg-white'
}

const statusLabel = (key) => {
  const s = stepStatus(key)
  if (s === 'approved') return 'Approved'
  if (s === 'partial')  return `${props.overtimes.filter((o) => o[`${key}_user_id`]).length}/${props.overtimes.length} Approved`
  return 'Pending'
}

const statusBadgeClass = (key) => {
  const s = stepStatus(key)
  if (s === 'approved') return 'bg-emerald-50 text-emerald-700 ring-emerald-200'
  if (s === 'partial')  return 'bg-amber-50 text-amber-700 ring-amber-200'
  return 'bg-gray-50 text-gray-500 ring-gray-200'
}
</script>

<template>
  <div v-if="steps.length" class="card-bg p-4">
    <p class="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">
      <i class="fas fa-sitemap mr-1"></i> Approval Chain
    </p>

    <div class="flex flex-wrap items-start gap-y-3">
      <template v-for="(step, index) in steps" :key="step.key">
        <!-- Step card -->
        <div
          class="flex flex-col items-center text-center rounded-xl border px-3 py-2.5 min-w-[90px] flex-1 transition-all"
          :class="cardClass(step.key)"
        >
          <!-- Circle indicator -->
          <div
            class="flex items-center justify-center w-7 h-7 rounded-full border-2 text-[11px] font-bold mb-1.5"
            :class="circleClass(step.key)"
          >
            <i v-if="statusIcon(step.key)" :class="statusIcon(step.key)" class="text-[10px]"></i>
            <span v-else>{{ index + 1 }}</span>
          </div>

          <!-- Role label -->
          <p class="text-[10px] font-semibold text-gray-500 uppercase tracking-wide leading-tight">
            {{ step.label }}
          </p>

          <!-- Person name -->
          <p class="text-xs font-semibold text-gray-900 leading-tight mt-0.5 max-w-[120px]">
            {{ step.user?.name || '—' }}
          </p>

          <!-- Status badge -->
          <span
            class="mt-1.5 inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium ring-1 ring-inset whitespace-nowrap"
            :class="statusBadgeClass(step.key)"
          >
            {{ statusLabel(step.key) }}
          </span>

          <!-- "Your turn" chip -->
          <span
            v-if="canActAtStep(step.key) && stepStatus(step.key) !== 'approved'"
            class="mt-1 inline-flex items-center gap-0.5 rounded-full bg-blue-600 px-1.5 py-0.5 text-[10px] font-semibold text-white"
          >
            <i class="fas fa-user-check text-[9px]"></i> Your turn
          </span>
        </div>

        <!-- Arrow connector -->
        <div
          v-if="index < steps.length - 1"
          class="flex items-start justify-center pt-4 px-1 text-gray-300 self-start"
        >
          <i class="fas fa-chevron-right text-xs"></i>
        </div>
      </template>
    </div>
  </div>
</template>
