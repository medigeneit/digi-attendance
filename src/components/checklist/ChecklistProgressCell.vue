<script setup>
import { computed, ref, watchEffect, watch } from 'vue'

const props = defineProps({
  user: { type: Object, required: true },
  actualPercent: { type: Number, required: true },
  targetPercent: { type: Number, required: true },
})

/* ---------- helpers ---------- */
const clamp = (v, min, max) => Math.min(Math.max(Number(v || 0), min), max)
const nice = (v) => (v < 0 ? 0 : v > 100 ? 100 : Math.round(v))
const asDate = (d) => (d ? new Date(d) : null)
const addMonths = (date, months) => {
  const dt = new Date(date.getTime())
  const m = dt.getMonth() + (months || 0)
  dt.setMonth(m)
  if (dt.getMonth() !== (m % 12 + 12) % 12) dt.setDate(0)
  return dt
}
const diffDays = (a, b) => Math.round((a - b) / 86400000)
const fmtDate = (d) =>
  d ? d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : ''

const normType = (v) => String(v || '').toLowerCase()
const empType = computed(() => normType(props.user?.employment_type))

/* ---------- micro info (always return an object) ---------- */
function getProbationInfo(u) {
  const isProb = normType(u?.employment_type) === 'probationary'
  const start = asDate(u?.joining_date) || asDate(u?.created_at)
  const baseMonths = Number(u?.probation_months) || 0
  const extMonths  = Number(u?.probation_extension_months) || 0

  if (!isProb || !start || Number.isNaN(baseMonths) || baseMonths <= 0) {
    return {
      enabled: false, start: null, end: null, pct: 0, leftDays: null, status: 'inactive',
      reason: !isProb ? 'Not probationary' : 'No probation months/start date',
    }
  }

  const totalMonths = Math.max(1, baseMonths + (extMonths || 0))
  const end = addMonths(start, totalMonths)
  const today = new Date()
  const totalDays   = Math.max(1, diffDays(end, start))
  const elapsedDays = Math.max(0, Math.min(totalDays, diffDays(today, start)))
  const leftDays    = diffDays(end, today)
  const pct         = nice((elapsedDays / totalDays) * 100)
  const status      = leftDays < 0 ? 'overdue' : leftDays <= 14 ? 'near_end' : 'active'

  return { enabled: true, start, end, pct, leftDays, status }
}

function getContractInfo(u) {
  const isContract = normType(u?.employment_type) === 'contract'
  const start = asDate(u?.joining_date) || asDate(u?.created_at)
  const baseMonths = Number(u?.contract_month ?? u?.contract_months ?? u?.contract_duration_months ?? 0)
  const extMonths  = Number(u?.contract_extension_months ?? 0)

  if (!isContract || !start || Number.isNaN(baseMonths) || baseMonths <= 0) {
    return {
      enabled: false, start: null, end: null, pct: 0, leftDays: null, status: 'inactive',
      reason: !isContract ? 'Not contract' : 'No contract months/start date',
    }
  }

  const totalMonths = Math.max(1, baseMonths + (extMonths || 0))
  const end = addMonths(start, totalMonths)
  const today = new Date()
  const totalDays   = Math.max(1, diffDays(end, start))
  const elapsedDays = Math.max(0, Math.min(totalDays, diffDays(today, start)))
  const leftDays    = diffDays(end, today)
  const pct         = nice((elapsedDays / totalDays) * 100)
  const status      = leftDays < 0 ? 'overdue' : leftDays <= 30 ? 'near_end' : 'active'

  return { enabled: true, start, end, pct, leftDays, status }
}

/* ---------- tones ---------- */
const barGradient = (ok) =>
  ok ? 'bg-gradient-to-r from-emerald-500 to-emerald-600'
     : 'bg-gradient-to-r from-amber-500 to-amber-600'

const microColors = (status, base='amber') => {
  if (status === 'overdue') return { track: 'bg-red-100', fill: 'bg-red-500', tone: 'text-red-600' }
  if (status === 'near_end') return {
    track: base === 'blue' ? 'bg-indigo-100' : 'bg-orange-100',
    fill : base === 'blue' ? 'bg-indigo-500' : 'bg-orange-500',
    tone : 'text-gray-700'
  }
  if (status === 'inactive') return {
    track: 'bg-gray-100', fill: 'bg-gray-300', tone: 'text-gray-500'
  }
  return {
    track: base === 'blue' ? 'bg-blue-100' : 'bg-amber-100',
    fill : base === 'blue' ? 'bg-blue-500' : 'bg-amber-500',
    tone : 'text-gray-600'
  }
}

/* ---------- mode handling (always show 3 tabs) ---------- */
const mode = ref('permanent') // 'permanent' | 'probationary' | 'contract'

const prob = computed(() => getProbationInfo(props.user))
const cont = computed(() => getContractInfo(props.user))

const availableModes = computed(() => ([
  { key: 'permanent',    label: 'Permanent' },
  { key: 'probationary', label: 'Probationary' },
  { key: 'contract',     label: 'Contract' },
]))

// keep mode valid (now always valid, but safe-guard anyway)
watchEffect(() => {
  const keys = availableModes.value.map(x => x.key)
  if (!keys.includes(mode.value)) mode.value = 'permanent'
})

// auto-select from employment_type if present; else stay on current/permanent
watch([empType], () => {
  const t = empType.value
  if (t && ['permanent','probationary','contract'].includes(t) && mode.value !== t) {
    mode.value = t
  }
}, { immediate: true })

function setMode(next) {
  if (['permanent','probationary','contract'].includes(next)) mode.value = next
}

/* ---------- UI helpers ---------- */
const infoText = computed(() => {
  const a = clamp(props.actualPercent, 0, 100)
  const t = clamp(props.targetPercent, 1, 100)
  if (mode.value !== 'permanent') return ''
  return a >= t ? 'Met' : `Short by ${Math.max(0, t - a)}%`
})
</script>

<template>
  <div class="space-y-1">
    <!-- segmented control (always 3) -->
    <div class="inline-flex rounded-lg border p-0.5 text-[11px] bg-white">
      <button
        v-for="m in availableModes"
        :key="m.key"
        class="px-2 py-0.5 rounded-md"
        :class="mode === m.key ? 'bg-gray-900 text-white' : 'text-gray-700'"
        @click="setMode(m.key)"
      >
        {{ m.label }}
      </button>
    </div>

    <!-- Permanent (Checklist progress) -->
    <div v-if="mode === 'permanent'" class="group relative">
      <div class="relative h-2 w-full overflow-hidden rounded-full bg-gray-100 ring-1 ring-inset ring-gray-200">
        <!-- target marker -->
        <div
          class="pointer-events-none absolute top-0 h-2 w-0.5 bg-gray-600/60"
          :style="{ left: `calc(${targetPercent}% - 1px)` }"
        />
        <!-- progress fill -->
        <div
          class="h-2 transition-all duration-500 ease-out"
          :class="barGradient(actualPercent >= targetPercent)"
          :style="{ width: actualPercent + '%' }"
          role="progressbar"
          :aria-valuemin="0" :aria-valuemax="100" :aria-valuenow="actualPercent"
        />
      </div>
      <div class="mt-1 flex items-center justify-between text-[11px] text-gray-600">
        <div class="flex items-center gap-2">
          <span class="font-medium">Actual: {{ actualPercent }}%</span>
          <span class="hidden sm:inline">Target: {{ targetPercent }}%</span>
        </div>
        <span
          class="rounded-full px-1.5 py-0.5 ring-1 text-[10px]"
          :class="actualPercent >= targetPercent
            ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
            : 'bg-amber-50 text-amber-700 ring-amber-200'"
        >
          {{ infoText }}
        </span>
      </div>
    </div>

    <!-- Probationary (show even if not enabled; display placeholder) -->
    <div v-else-if="mode === 'probationary'" class="space-y-1.5">
      <div
        class="relative w-full h-1.5 overflow-hidden rounded-full"
        :class="microColors(prob.status).track"
      >
        <div
          class="h-1.5 transition-all duration-500 ease-out"
          :class="microColors(prob.status).fill"
          :style="{ width: (prob.enabled ? prob.pct : 0) + '%' }"
        />
      </div>
      <div class="flex items-center justify-between text-[11px]" :class="microColors(prob.status).tone">
        <span>
          Probation:
          <template v-if="prob.enabled">{{ prob.pct }}%</template>
          <template v-else>Not set</template>
        </span>
        <span v-if="prob.enabled && prob.leftDays >= 0">
          {{ fmtDate(prob.start) }} → {{ fmtDate(prob.end) }} · {{ prob.leftDays }}d left
        </span>
        <span v-else-if="prob.enabled" class="text-red-600">
          {{ fmtDate(prob.start) }} → {{ fmtDate(prob.end) }} · Overdue {{ Math.abs(prob.leftDays) }}d
        </span>
        <span v-else class="text-gray-500">No tenure data</span>
      </div>
    </div>

    <!-- Contract (show even if not enabled; display placeholder) -->
    <div v-else-if="mode === 'contract'" class="space-y-1.5">
      <div
        class="relative w-full h-1.5 overflow-hidden rounded-full"
        :class="microColors(cont.status, 'blue').track"
      >
        <div
          class="h-1.5 transition-all duration-500 ease-out"
          :class="microColors(cont.status, 'blue').fill"
          :style="{ width: (cont.enabled ? cont.pct : 0) + '%' }"
        />
      </div>
      <div class="flex items-center justify-between text-[11px]" :class="microColors(cont.status, 'blue').tone">
        <span>
          Contract:
          <template v-if="cont.enabled">{{ cont.pct }}%</template>
          <template v-else>Not set</template>
        </span>
        <span v-if="cont.enabled && cont.leftDays >= 0">
          {{ fmtDate(cont.start) }} → {{ fmtDate(cont.end) }} · {{ cont.leftDays }}d left
        </span>
        <span v-else-if="cont.enabled" class="text-red-600">
          {{ fmtDate(cont.start) }} → {{ fmtDate(cont.end) }} · Expired {{ Math.abs(cont.leftDays) }}d
        </span>
        <span v-else class="text-gray-500">No data</span>
      </div>
    </div>
  </div>
</template>
