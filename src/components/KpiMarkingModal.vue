<script setup>
import { computed, ref, watch } from 'vue'
import { useKpiReportStore } from '@/stores/kpi-report'

const props = defineProps({
  open: Boolean,
  cycleId: { type: Number, required: true },
  employeeId: { type: Number, required: true },
  employeeName: { type: String, default: '' },
  laneKey: { type: String, default: 'supv_director' }, // 'supv_director' | 'da'
  group: { type: String, default: 'personal' },
})

const emit = defineEmits(['update:open', 'saved'])

const store = useKpiReportStore()

const loading = ref(false)
const err = ref('')
const activeLane = ref(props.laneKey)

const lanes = ref([])
const reviewsByLane = ref({})
const personalItems = ref([])
const personalMaxTotal = ref(0)

const overallMark = ref('')

function laneLabel(key) {
  if (key === 'supv_director') return 'Supv. Director'
  if (key === 'da') return 'DA'
  return key
}

function close() {
  emit('update:open', false)
}

function clampOverallMark() {
  if (overallMark.value === '' || overallMark.value == null) return
  const max = Number(personalMaxTotal.value || 0)
  const raw = Number(overallMark.value)
  if (!Number.isFinite(raw)) return
  let next = raw
  if (next < 0) next = 0
  if (max > 0 && next > max) next = max
  if (String(overallMark.value) !== String(next)) overallMark.value = String(next)
}

function hydrateOverall() {
  const rows = reviewsByLane.value?.[activeLane.value] || []
  const latest = Array.isArray(rows) ? rows[rows.length - 1] : null
  overallMark.value = latest?.obtained ?? ''
  clampOverallMark()
}

async function load() {
  loading.value = true
  err.value = ''
  try {
    const m = await store.fetchMarkingForm({
      cycle_id: props.cycleId,
      employee_id: props.employeeId,
      lane_keys: 'supv_director,da',
      include_personal_items: 1,
      force: true,
    })

    lanes.value = m.lanes || []
    reviewsByLane.value = m.reviewsByLane || {}
    personalItems.value = m.personalItems || []
    personalMaxTotal.value = Number(m.personalMaxTotal || 0)

    hydrateOverall()
  } catch (e) {
    err.value = e?.message || 'Failed to load'
  } finally {
    loading.value = false
  }
}

watch(() => props.open, (v) => {
  if (v) {
    activeLane.value = props.laneKey || 'supv_director'
    load()
  }
})

watch(() => props.laneKey, (v) => {
  if (v) activeLane.value = v
})

watch(activeLane, () => {
  hydrateOverall()
})

watch([overallMark, personalMaxTotal], () => {
  clampOverallMark()
})

async function submit() {
  err.value = ''
  const max = Number(personalMaxTotal.value || 0)
  const v = Number(overallMark.value)

  if (!Number.isFinite(v)) return (err.value = 'Overall mark must be a number.')
  if (v < 0 || (max > 0 && v > max)) return (err.value = `Overall mark must be between 0 and ${max}.`)

  loading.value = true
  try {
    await store.submitOverallMark({
      cycle_id: props.cycleId,
      employee_id: props.employeeId,
      reviewer_lane: activeLane.value,
      overall_mark: v,
      group_key: props.group || 'personal',
    })
    emit('saved')
    close()
  } catch (e) {
    err.value = e?.message || 'Submit failed'
  } finally {
    loading.value = false
  }
}

const canCurrentUserReview = computed(() => {
  const ln = (lanes.value || []).find(l => l.key === activeLane.value)
  return !!ln?.can_current_user_review
})

</script>

<template>
  <div v-if="open" class="fixed inset-0 z-50">
    <div class="absolute inset-0 bg-black/40" @click="close"></div>
    

    <div class="absolute left-1/2 top-1/2 w-[95vw] max-w-3xl -translate-x-1/2 -translate-y-1/2 rounded-xl bg-white shadow">
      <div class="flex items-center justify-between border-b px-4 py-3">
        <div>
          <div class="text-sm font-semibold">KPI Marking (Overall)</div>
          <div class="text-xs text-gray-500">
            {{ employeeName ? employeeName + ' • ' : '' }}Personal Group
          </div>
        </div>
        <button class="text-sm px-2 py-1" @click="close">✕</button>
      </div>


      <div class="px-4 py-3">
        <!-- <div class="mb-3 flex gap-2">
          <button
            class="rounded-md border px-3 py-1 text-sm"
            :class="activeLane==='supv_director' ? 'bg-gray-900 text-white' : ''"
            @click="activeLane='supv_director'"
          >
            Supv. Director
          </button>
          <button
            class="rounded-md border px-3 py-1 text-sm"
            :class="activeLane==='da' ? 'bg-gray-900 text-white' : ''"
            @click="activeLane='da'"
          >
            DA
          </button>
        </div> -->

        <div v-if="loading" class="py-6 text-center text-sm text-gray-600">Loading...</div>
        <div v-else>
          <div v-if="err" class="mb-3 rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-700">
            {{ err }}
          </div>

          <div class="mb-4 rounded-lg border p-3">
            <div class="mb-1 text-sm font-semibold">{{ laneLabel(activeLane) }} Overall Mark</div>
            <div class="text-xs text-gray-500 mb-2">
              Out of {{ personalMaxTotal || 0 }}
            </div>

            <input
              v-model="overallMark"
              type="number"
              step="0.01"
              class="w-full rounded-md border px-3 py-2 text-sm"
              :disabled="!canCurrentUserReview"
              :max="personalMaxTotal || undefined"
              min="0"
              placeholder="Enter overall mark"
            />

            <div v-if="!canCurrentUserReview" class="mt-2 text-xs text-gray-500">
              You cannot submit for this lane.
            </div>
          </div>

          <div class="rounded-lg border">
            <div class="border-b px-3 py-2 text-sm font-semibold">Personal Items (View Only)</div>
            <div class="max-h-[320px] overflow-auto">
              <div
                v-for="it in personalItems"
                :key="it.id"
                class="flex items-start justify-between gap-3 border-b px-3 py-2 text-sm"
              >
                <div>
                  <div class="font-medium">{{ it.title }}</div>
                  <div class="text-xs text-gray-500">{{ it?.label }}</div>
                </div>
                <div class="text-xs text-gray-600">
                  Max: {{ it.max }}
                  <span v-if="it.weight !== null && it.weight !== undefined"> • W: {{ it.weight }}</span>
                </div>
              </div>

              <div v-if="!personalItems.length" class="px-3 py-4 text-sm text-gray-500">
                No personal items found in cycle.
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="flex items-center justify-end gap-2 border-t px-4 py-3">
        <button class="rounded-md border px-4 py-2 text-sm" @click="close">Cancel</button>
        <button
          class="rounded-md bg-sky-600 px-4 py-2 text-sm text-white disabled:opacity-50"
          :disabled="loading || !canCurrentUserReview"
          @click="submit"
        >
          Submit
        </button>
      </div>
    </div>
  </div>
</template>
