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

// overtime_approval already has fully-resolved values from the backend (configFor + per-overtime
// assigned_in_charge). Read them directly — no need to re-merge type_configs here.
const resolvedConfig = computed(() => {
  const r = rule.value
  if (!r) return {}
  return {
    in_charge_user_id:         r.in_charge_user_id,
    coordinator_user_id:       r.coordinator_user_id,
    operational_admin_user_id: r.operational_admin_user_id,
    recommend_by_user_id:      r.recommend_by_user_id,
    approved_by_user_id:       r.approved_by_user_id,
  }
})

const steps = computed(() => {
  if (!rule.value) return []
  const r   = rule.value
  const cfg = resolvedConfig.value
  return STEP_DEFS
    .map((def) => ({
      ...def,
      userId: cfg[`${def.key}_user_id`] ?? null,
      user:   r[`${def.key}_user`] ?? null,
    }))
    .filter((s) => s.userId)
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

    <div class="flex flex-wrap items-center gap-1.5">
      <!-- eslint-disable-next-line vue/no-v-for-template-key -->
      <template v-for="(step, index) in steps" :key="step.key">
        <!-- Step card -->
        <div
          class="flex flex-col items-center text-center rounded-lg border px-2.5 py-2 w-[100px] shrink-0 transition-all"
          :class="cardClass(step.key)"
        >
          <!-- Circle indicator -->
          <div
            class="flex items-center justify-center w-6 h-6 rounded-full border-2 text-[10px] font-bold mb-1"
            :class="circleClass(step.key)"
          >
            <i v-if="statusIcon(step.key)" :class="statusIcon(step.key)" class="text-[9px]"></i>
            <span v-else>{{ index + 1 }}</span>
          </div>

          <!-- Role label -->
          <p class="text-[9px] font-semibold text-gray-500 uppercase tracking-wide leading-tight">
            {{ step.label }}
          </p>

          <!-- Person name -->
          <p class="text-[11px] font-semibold text-gray-900 leading-tight mt-0.5 w-full truncate">
            {{ step.user?.name || '—' }}
          </p>

          <!-- Status badge -->
          <span
            class="mt-1 inline-flex items-center rounded-full px-1.5 py-px text-[9px] font-medium ring-1 ring-inset whitespace-nowrap"
            :class="statusBadgeClass(step.key)"
          >
            {{ statusLabel(step.key) }}
          </span>

          <!-- "Your turn" chip -->
          <span
            v-if="canActAtStep(step.key) && stepStatus(step.key) !== 'approved'"
            class="mt-0.5 inline-flex items-center gap-0.5 rounded-full bg-blue-600 px-1.5 py-px text-[9px] font-semibold text-white"
          >
            <i class="fas fa-user-check text-[8px]"></i> Your turn
          </span>
        </div>

        <!-- Arrow connector -->
        <i
          v-if="index < steps.length - 1"
          :key="`arr-${step.key}`"
          class="fas fa-chevron-right text-[10px] text-gray-300 shrink-0"
        ></i>
      </template>
    </div>
  </div>
</template>
