<script setup>
import LoaderView from '@/components/common/LoaderView.vue'
import CriteriaAssignModal from '@/components/CriteriaAssignModal.vue'
import { useUserMonthlyKpiStore } from '@/stores/user-monthly-kpi'
import { storeToRefs } from 'pinia'
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'

const toast = useToast()
const router = useRouter()
const route = useRoute()
const id = Number(route.params.id)

const store = useUserMonthlyKpiStore()
const { current, isLoading, isSaving, error } = storeToRefs(store)

/* ---------- Scores local state ---------- */
const target = ref({
  max_score: 0,
  incharge_score: 0,
  incharge_comment: '',
  coordinator_score: 0,
  coordinator_comment: '',
  final_score: 0,
})
const perf = ref({
  max_score: 0,
  incharge_score: 0,
  incharge_comment: '',
  coordinator_score: 0,
  coordinator_comment: '',
  final_score: 0,
})

const inchargeObs = ref('')
const coordinatorObs = ref('')

const finalized = computed(() => !!current.value?.finalized_at)
const formMeta = computed(() => current.value?.form ?? {})
const markingPermission = computed(() => current.value?.marking_permission ?? {})
const isSuperAdmin = computed(() => !!markingPermission.value?.is_super_admin)
const canMarkInCharge = computed(() => !!markingPermission.value?.can_mark_in_charge)
const canMarkCoordinator = computed(() => !!markingPermission.value?.can_mark_coordinator)
const coordinatorStageOpen = computed(() => !!markingPermission.value?.coordinator_stage_open)
const isInChargeViewer = computed(() => canMarkInCharge.value && !canMarkCoordinator.value)

const hasInChargeData = computed(() => {
  const t = current.value?.target
  const p = current.value?.performance
  return (
    t?.incharge_score !== null && t?.incharge_score !== undefined
  ) || (
    p?.incharge_score !== null && p?.incharge_score !== undefined
  ) || !!String(inchargeObs.value || '').trim()
})

const hasCoordinatorData = computed(() => {
  const t = current.value?.target
  const p = current.value?.performance
  return (
    t?.coordinator_score !== null && t?.coordinator_score !== undefined
  ) || (
    p?.coordinator_score !== null && p?.coordinator_score !== undefined
  ) || !!String(coordinatorObs.value || '').trim()
})

const showInChargeField = computed(() =>
  !!markingPermission.value?.in_charge_user_id || canMarkInCharge.value || finalized.value || hasInChargeData.value
)

const showCoordinatorField = computed(() => {
  if (isInChargeViewer.value) return false

  const hasCoordinatorAssignee = !!markingPermission.value?.coordinator_user_id || canMarkCoordinator.value || hasCoordinatorData.value
  const hierarchyVisible = coordinatorStageOpen.value || finalized.value || hasCoordinatorData.value
  return hasCoordinatorAssignee && hierarchyVisible
})

const showCoordinatorLockedHint = computed(() =>
  !!markingPermission.value?.coordinator_user_id && !showCoordinatorField.value && !isInChargeViewer.value
)
const canFinalize = computed(() => canMarkCoordinator.value)
const canShowFinalizeButton = computed(() =>
  finalized.value ? isSuperAdmin.value : canFinalize.value,
)
const finalizeButtonLabel = computed(() =>
  finalized.value && isSuperAdmin.value ? 'Unfinalize' : 'Finalize',
)
const inchargeObsCount = computed(() => String(inchargeObs.value || '').length)
const coordinatorObsCount = computed(() => String(coordinatorObs.value || '').length)
const observations = computed(() => current.value?.observations ?? [])
const inchargeObservation = computed(() => observations.value.find((o) => o.role === 'incharge') ?? null)
const coordinatorObservation = computed(() => observations.value.find((o) => o.role === 'coordinator') ?? null)
const inchargeEvaluatorName = computed(
  () =>
    String(
      markingPermission.value?.in_charge_user_name || inchargeObservation.value?.rater_name || '',
    ).trim(),
)
const coordinatorEvaluatorName = computed(
  () =>
    String(
      markingPermission.value?.coordinator_user_name || coordinatorObservation.value?.rater_name || '',
    ).trim(),
)

const perfMax = computed(() =>
  Number(perf.value.max_score || formMeta.value?.performance_mark || 0),
)
const targetMax = computed(() =>
  Number(target.value.max_score || formMeta.value?.target_marks || 0),
)

// totals
const grandMax = computed(() => perfMax.value + targetMax.value)
const inchargeTotal = computed(
  () =>
    clamp(perf.value.incharge_score, 0, perfMax.value) +
    clamp(target.value.incharge_score, 0, targetMax.value),
)
const coordinatorTotal = computed(
  () =>
    clamp(perf.value.coordinator_score, 0, perfMax.value) +
    clamp(target.value.coordinator_score, 0, targetMax.value),
)
const finalTotal = computed(
  () => Number(perf.value.final_score || 0) + Number(target.value.final_score || 0),
)
const inchargeMarkingStatusText = computed(() => {
  if (finalized.value) return 'Finalized'
  return canMarkInCharge.value ? 'Editable' : 'Read only'
})
const coordinatorMarkingStatusText = computed(() => {
  if (finalized.value) return 'Finalized'
  if (!canMarkCoordinator.value) {
    return coordinatorStageOpen.value ? 'Read only' : 'Locked by hierarchy'
  }
  return 'Editable'
})

function clamp(n, min, max) {
  let v = Number(n ?? 0)
  if (!Number.isFinite(v)) v = 0
  return v < min ? min : v > max ? max : v
}
function scoreMax(kind) {
  return kind === 'target' ? targetMax.value : perfMax.value
}
function scoreState(kind) {
  return kind === 'target' ? target.value : perf.value
}
function scoreKey(role) {
  return role === 'incharge' ? 'incharge_score' : 'coordinator_score'
}
function getLocalScore(kind, role) {
  return Number(scoreState(kind)[scoreKey(role)] || 0)
}
function getServerScore(kind, role) {
  return Number(current.value?.[kind]?.[scoreKey(role)] || 0)
}
function isScoreDirty(kind, role) {
  const max = scoreMax(kind)
  return clamp(getLocalScore(kind, role), 0, max) !== clamp(getServerScore(kind, role), 0, max)
}
function hydrateBlocks(c) {
  const t = c?.target ?? {}
  target.value = {
    max_score: Number(t.max_score || formMeta.value?.target_marks || 0),
    incharge_score: Number(t.incharge_score || 0),
    incharge_comment: String(t.incharge_comment || ''),
    coordinator_score: Number(t.coordinator_score || 0),
    coordinator_comment: String(t.coordinator_comment || ''),
    final_score: Number(t.final_score || 0),
  }
  const p = c?.performance ?? {}
  perf.value = {
    max_score: Number(p.max_score || formMeta.value?.performance_mark || 0),
    incharge_score: Number(p.incharge_score || 0),
    incharge_comment: String(p.incharge_comment || ''),
    coordinator_score: Number(p.coordinator_score || 0),
    coordinator_comment: String(p.coordinator_comment || ''),
    final_score: Number(p.final_score || 0),
  }
}

/* ---------- Assign/Manage (current.user ভিত্তিক) ---------- */
const emptyHtml = '<em class="text-slate-400">কার্যসম্পাদনের বিবরণ নেই</em>'
const u = computed(() => current.value?.user ?? null)
const cAssign = computed(() => u.value?.criteria_assignments ?? null)
// robust count (array / items[] / count / length)
const criteriaCount = computed(() => {
  const ca = cAssign.value
  if (Array.isArray(ca)) return ca.length
  if (Array.isArray(ca?.items)) return ca.items.length
  if (typeof ca?.count === 'number') return ca.count
  if (typeof ca?.length === 'number') return ca.length
  return 0
})
const assignOpen = ref(false)
function openAssign() {
  if (!u.value) return
  assignOpen.value = true
}
async function afterAssigned(payload) {
  assignOpen.value = false
  try {
    await store.show(id)
    hydrateBlocks(current.value)
    toast.success('Criteria updated')
  } catch (_) {
    // fallback local patch if payload provided
    if (payload && current.value?.user) {
      current.value.user.criteria_assignments = payload.criteria_assignments || payload
    }
  }
}

/* ---------- Load / Save handlers ---------- */
async function load() {
  await store.show(id)
  hydrateBlocks(current.value)
  const obs = current.value?.observations ?? []
  inchargeObs.value = obs.find((o) => o.role === 'incharge')?.observation || ''
  coordinatorObs.value = obs.find((o) => o.role === 'coordinator')?.observation || ''
}
watch(current, hydrateBlocks)

async function saveTargetText() {
  try {
    await store.updateTarget(id, current.value?.monthly_target || '')
    toast.success('Target text saved')
    await store.show(id)
  } catch (e) {
    toast.error(e?.response?.data?.message || 'Failed to save target')
  }
}
async function saveScore(kind, role) {
  if (role === 'incharge' && !canMarkInCharge.value) {
    toast.error('You do not have permission to mark In-charge score')
    return
  }
  if (role === 'coordinator' && !canMarkCoordinator.value) {
    toast.error('You do not have permission to mark Coordinator score')
    return
  }
  if (!isScoreDirty(kind, role)) {
    toast.info('No score changes to save')
    return
  }

  const state = kind === 'target' ? target.value : perf.value
  const max = kind === 'target' ? targetMax.value : perfMax.value
  const score =
    role === 'incharge'
      ? clamp(state.incharge_score, 0, max)
      : clamp(state.coordinator_score, 0, max)
  const comment = role === 'incharge' ? state.incharge_comment : state.coordinator_comment

  try {
    await store.rateScore(id, kind, role, score, comment || '')
    toast.success(`${kind} score saved`)
    await store.show(id)
  } catch (e) {
    toast.error(e?.response?.data?.message || 'Failed to save score')
  }
}
async function saveObs(role) {
  if (role === 'incharge' && !canMarkInCharge.value) {
    toast.error('You do not have permission to save In-charge observation')
    return
  }
  if (role === 'coordinator' && !canMarkCoordinator.value) {
    toast.error('You do not have permission to save Coordinator observation')
    return
  }

  try {
    const text = role === 'incharge' ? inchargeObs.value : coordinatorObs.value
    await store.saveObservation(id, role, text)
    toast.success('Observation saved')
  } catch (e) {
    toast.error(e?.response?.data?.message || 'Failed to save')
  }
}
async function finalize() {
  if (!canShowFinalizeButton.value) {
    toast.error('You do not have permission for this action')
    return
  }
  const confirmText =
    finalized.value && isSuperAdmin.value
      ? 'Unfinalize this evaluation?'
      : 'Finalize this evaluation?'
  if (!confirm(confirmText)) return

  try {
    await store.finalize(id)
    toast.success(
      finalized.value && isSuperAdmin.value ? 'Finalization removed' : 'Finalized',
    )
    await store.show(id)
  } catch (e) {
    toast.error(e?.response?.data?.message || 'Failed to update finalization')
  }
}

function backToList() {
  router.back(-1)
}
onMounted(load)

function printPage() {
  if (typeof window !== 'undefined' && typeof window.print === 'function') {
    window.print()
  }
}
</script>

<template>
  <div class="space-y-4 px-4 print:px-0 max-w-7xl mx-auto">
    <!-- Actions -->
    <div
      class="flex items-center justify-between gap-2 sticky top-0 z-10 bg-white/80 backdrop-blur p-2 rounded-b-lg border-b print:hidden"
    >
      <div class="flex items-center gap-2">
        <button class="btn-3" @click="backToList">
          <i class="far fa-arrow-left"></i><span class="hidden md:flex">Back</span>
        </button>
        <h1 class="title-md md:title-lg">KPI Sheet</h1>
      </div>
      <div class="flex gap-2">
        <button
          v-if="canShowFinalizeButton"
          class="btn-2"
          :disabled="isSaving || !current"
          @click="finalize"
        >
          {{ finalizeButtonLabel }}
        </button>
        <button class="btn-3" @click="printPage"><i class="far fa-print mr-1"></i>Print</button>
      </div>
    </div>

    <div v-if="isLoading" class="py-8 text-center"><LoaderView /></div>
    <div v-else-if="error" class="rounded-md border border-red-200 bg-red-50 p-3 text-red-700">
      {{ error }}
    </div>

    <div v-else-if="current" class="rounded-2xl bg-white p-5 shadow-sm space-y-4">
      <!-- Header -->
      <div class="text-center">
        <h2 class="text-xl font-semibold">Key Performance Indicator (KPI)</h2>
        <p class="text-sm text-gray-600">
          Bi-monthly: {{ current.form?.start_month
          }}{{ current.form?.end_month ? ` – ${current.form.end_month}` : '' }}
        </p>
      </div>

      <!-- Meta -->
      <div class="grid grid-cols-12 gap-2 text-sm">
        <div class="col-span-6 border p-2 rounded">
          NAME: <span class="font-medium">{{ current?.user?.name }}</span>
        </div>
        <div class="col-span-3 border p-2 rounded">
          DESIGNATION: <span class="font-medium">{{ current?.user?.designation }}</span>
        </div>
        <div class="col-span-3 border p-2 rounded">
          DATE OF JOINING: {{ current?.user?.joining_date }}
        </div>
        <div class="col-span-6 border p-2 rounded">DEPARTMENT: {{ current?.user?.department }}</div>
        <div class="col-span-3 border p-2 rounded">
          COMPANY:<span class="font-medium">{{ current?.user?.company }}</span>
        </div>
      </div>

      <!-- Live totals -->
      <div class="grid grid-cols-1 print:grid-cols-3 md:grid-cols-3 gap-2 text-sm">
        <div v-if="showInChargeField" class="rounded-lg border p-2 text-center">
          <div class="text-gray-500">In-charge total</div>
          <div class="font-semibold">{{ inchargeTotal }} / {{ grandMax }}</div>
        </div>
        <div v-if="showCoordinatorField" class="rounded-lg border p-2 text-center">
          <div class="text-gray-500">Coordinator total</div>
          <div class="font-semibold">{{ coordinatorTotal }} / {{ grandMax }}</div>
        </div>
        <div class="rounded-lg border p-2 text-center">
          <div class="text-gray-500">Final (server)</div>
          <div class="font-semibold">{{ finalTotal }} / {{ grandMax }}</div>
        </div>
      </div>

      <!-- Main table -->
      <div class="rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-800 print:hidden">
        Score input range follows each row max mark. Save button activates only when score is changed.
      </div>
      <div class="overflow-x-auto">
        <table class="min-w-full border text-sm">
          <thead>
            <tr class="bg-gray-100 text-gray-800">
              <th class="border px-2 py-2 w-10">ক্রম</th>
              <th class="border px-2 py-2">কার্যসম্পাদন বিষয়</th>
              <th class="border px-2 py-2 w-32 text-right">সর্বোচ্চ</th>
              <th v-if="showInChargeField" class="border px-2 py-2 w-40 text-right">
                <div class="font-semibold">In-charge</div>
                <div class="text-xs text-slate-500 truncate">
                  {{ inchargeEvaluatorName || 'Not assigned' }}
                </div>
                <div class="mt-1">
                  <span
                    class="rounded-full px-2 py-0.5 text-xs font-medium"
                    :class="
                      inchargeMarkingStatusText === 'Editable'
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-slate-100 text-slate-600'
                    "
                  >
                    {{ inchargeMarkingStatusText }}
                  </span>
                </div>
              </th>
              <th v-if="showCoordinatorField" class="border px-2 py-2 w-44 text-right">
                <div class="font-semibold">Coordinator/AD/DD</div>
                <div class="text-xs text-slate-500 truncate">
                  {{ coordinatorEvaluatorName || 'Not assigned' }}
                </div>
                <div class="mt-1">
                  <span
                    class="rounded-full px-2 py-0.5 text-xs font-medium"
                    :class="
                      coordinatorMarkingStatusText === 'Editable'
                        ? 'bg-emerald-100 text-emerald-700'
                        : coordinatorMarkingStatusText === 'Locked by hierarchy'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-slate-100 text-slate-600'
                    "
                  >
                    {{ coordinatorMarkingStatusText }}
                  </span>
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            <!-- ১) Performance -->
            <tr>
              <td class="border px-2 py-2 align-top text-center">১</td>
              <td class="border px-2 py-2 align-top">
                <!-- CSS-only clamp + toggle + print-safe -->
                <div v-if="u?.criteria_assignments?.description" class="mt-0.5">
                  <!-- Hidden state checkbox -->
                  <input
                    :id="`kpi-desc-toggle-${u?.id ?? index}`"
                    type="checkbox"
                    class="peer sr-only"
                  />

                  <!-- Screen-only: clamped by default; expands on peer-checked -->
                  <div
                    class="richtext overflow-hidden [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:3] peer-checked:overflow-visible peer-checked:[display:block] peer-checked:[-webkit-line-clamp:unset] peer-checked:[-webkit-box-orient:unset] print:hidden"
                    v-html="u?.criteria_assignments?.description"
                  ></div>

                  <!-- Print-only: always full, no clamp -->
                  <div
                    class="hidden print:block richtext print:break-inside-avoid"
                    v-html="u?.criteria_assignments?.description"
                  ></div>

                  <!-- See more / See less (pure CSS, sibling-based) -->
                  <div class="mt-2 space-x-3 print:hidden">
                    <!-- shown when NOT checked -->
                    <label
                      :for="`kpi-desc-toggle-${u?.id ?? index}`"
                      class="underline text-blue-500 inline-flex items-center gap-1 cursor-pointer select-none peer-checked:hidden"
                    >
                      See more
                    </label>

                    <!-- shown when checked -->
                    <label
                      :for="`kpi-desc-toggle-${u?.id ?? index}`"
                      class="underline text-blue-500 hidden peer-checked:inline-flex items-center gap-1 cursor-pointer select-none"
                    >
                      See less
                    </label>
                  </div>
                </div>

                <!-- Assign button (unchanged) -->
                <div class="mt-2">
                  <button @click="openAssign" title="Assign KPI criteria" class="btn-4">
                    <svg
                      v-if="criteriaCount > 0 || u?.criteria_assignments?.description"
                      viewBox="0 0 24 24"
                      class="h-4 w-4 opacity-90"
                    >
                      <path fill="currentColor" d="M9 16.2l-3.5-3.5L4 14.2l5 5 11-11-1.5-1.5z" />
                    </svg>
                    <svg v-else viewBox="0 0 24 24" class="h-4 w-4 opacity-80">
                      <path fill="currentColor" d="M11 11V6h2v5h5v2h-5v5h-2v-5H6v-2z" />
                    </svg>
                    <span class="ml-1 hidden lg:inline">
                      {{ u?.criteria_assignments?.description ? 'Edit' : 'Assign' }}
                    </span>
                  </button>
                </div>
              </td>

              <td class="border px-2 py-2 align-top text-right">{{ perfMax }}</td>
              <td v-if="showInChargeField" class="border px-2 py-2 align-top">
                <div class="rounded-md border border-slate-200 bg-slate-50/70 p-2">
                  <div class="flex items-center justify-end gap-2">
                    <input
                      type="number"
                      min="0"
                      :max="perfMax"
                      :readonly="finalized || !canMarkInCharge"
                      v-model.number="perf.incharge_score"
                      class="w-20 rounded-md border px-2 py-1 text-right focus:border-indigo-500 focus:ring-1 focus:ring-indigo-200"
                    />
                    <button
                      class="btn-4 print:hidden"
                      :disabled="isSaving || finalized || !perfMax || !canMarkInCharge || !isScoreDirty('performance', 'incharge')"
                      @click="saveScore('performance', 'incharge')"
                    >
                      {{ isScoreDirty('performance', 'incharge') ? 'Save' : 'Saved' }}
                    </button>
                  </div>
                  <div class="mt-1 text-right text-xs text-slate-500">
                    Range: 0-{{ perfMax }}
                  </div>
                </div>
              </td>
              <td v-if="showCoordinatorField" class="border px-2 py-2 align-top">
                <div class="rounded-md border border-slate-200 bg-slate-50/70 p-2">
                  <div class="flex items-center justify-end gap-2">
                    <input
                      type="number"
                      min="0"
                      :max="perfMax"
                      :readonly="finalized || !canMarkCoordinator"
                      v-model.number="perf.coordinator_score"
                      class="w-20 rounded-md border px-2 py-1 text-right focus:border-indigo-500 focus:ring-1 focus:ring-indigo-200"
                    />
                    <button
                      class="btn-4 print:hidden"
                      :disabled="isSaving || finalized || !perfMax || !canMarkCoordinator || !isScoreDirty('performance', 'coordinator')"
                      @click="saveScore('performance', 'coordinator')"
                    >
                      {{ isScoreDirty('performance', 'coordinator') ? 'Save' : 'Saved' }}
                    </button>
                  </div>
                  <div class="mt-1 text-right text-xs text-slate-500">
                    Range: 0-{{ perfMax }}
                  </div>
                </div>
              </td>
            </tr>

            <!-- ২) Target (text + score) -->
            <tr>
              <td class="border px-2 py-2 align-top text-center">২</td>
              <td class="border px-2 py-2">
                <label class="block text-xs text-gray-600 mb-1">Target (মাসিক লক্ষ্য)</label>
                <textarea
                  rows="3"
                  v-model="current.monthly_target"
                  :readonly="finalized"
                  class="w-full rounded-md border px-2 py-1 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-200"
                  placeholder="এই মাসের স্পষ্ট টার্গেট লিখুন…"
                ></textarea>
                <div class="mt-2 flex justify-end gap-2 print:hidden">
                  <button class="btn-4" :disabled="isSaving || finalized" @click="saveTargetText">
                    Save Target
                  </button>
                </div>
              </td>
              <td class="border px-2 py-2 align-top text-right">{{ targetMax }}</td>
              <td v-if="showInChargeField" class="border px-2 py-2 align-top">
                <div class="rounded-md border border-slate-200 bg-slate-50/70 p-2">
                  <div class="flex items-center justify-end gap-2">
                    <input
                      type="number"
                      min="0"
                      :max="targetMax"
                      :readonly="finalized || !canMarkInCharge"
                      v-model.number="target.incharge_score"
                      class="w-20 rounded-md border px-2 py-1 text-right focus:border-indigo-500 focus:ring-1 focus:ring-indigo-200"
                    />
                    <button
                      class="btn-4 print:hidden"
                      :disabled="isSaving || finalized || !targetMax || !canMarkInCharge || !isScoreDirty('target', 'incharge')"
                      @click="saveScore('target', 'incharge')"
                    >
                      {{ isScoreDirty('target', 'incharge') ? 'Save' : 'Saved' }}
                    </button>
                  </div>
                  <div class="mt-1 text-right text-xs text-slate-500">
                    Range: 0-{{ targetMax }}
                  </div>
                </div>
              </td>
              <td v-if="showCoordinatorField" class="border px-2 py-2 align-top">
                <div class="rounded-md border border-slate-200 bg-slate-50/70 p-2">
                  <div class="flex items-center justify-end gap-2">
                    <input
                      type="number"
                      min="0"
                      :max="targetMax"
                      :readonly="finalized || !canMarkCoordinator"
                      v-model.number="target.coordinator_score"
                      class="w-20 rounded-md border px-2 py-1 text-right focus:border-indigo-500 focus:ring-1 focus:ring-indigo-200"
                    />
                    <button
                      class="btn-4 print:hidden"
                      :disabled="isSaving || finalized || !targetMax || !canMarkCoordinator || !isScoreDirty('target', 'coordinator')"
                      @click="saveScore('target', 'coordinator')"
                    >
                      {{ isScoreDirty('target', 'coordinator') ? 'Save' : 'Saved' }}
                    </button>
                  </div>
                  <div class="mt-1 text-right text-xs text-slate-500">
                    Range: 0-{{ targetMax }}
                  </div>
                </div>
              </td>
            </tr>

            <!-- Totals -->
            <tr class="bg-gray-50 font-medium">
              <td class="border px-2 py-2 text-right" colspan="2">সর্বমোট</td>
              <td class="border px-2 py-2 text-right">{{ grandMax }}</td>
              <td v-if="showInChargeField" class="border px-2 py-2 text-right">{{ inchargeTotal }}</td>
              <td v-if="showCoordinatorField" class="border px-2 py-2 text-right">{{ coordinatorTotal }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div
        v-if="showCoordinatorLockedHint"
        class="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800"
      >
        Coordinator marking will show after In-charge completes both Performance and Target marking.
      </div>
      <!-- Observation -->
      <div class="mt-4 rounded-xl border border-slate-200 bg-slate-50/60 p-3 md:p-4">
        <div class="mb-3 flex items-center justify-between gap-2">
          <div class="text-sm font-semibold text-slate-800">Observation</div>
          <div class="text-xs text-slate-500">Role-wise comment panel</div>
        </div>
        <div class="observation-panel space-y-3 text-sm">
          <div v-if="showInChargeField" class="col-span-2 border p-2 bg-gray-50 rounded">ইনচার্জ</div>
          <div v-if="showInChargeField" class="rounded-lg border border-slate-200 bg-white p-3">
            <div class="mb-2 flex items-center justify-between gap-2">
              <div>
                <div class="font-medium text-slate-800">In-charge</div>
                <div class="text-xs text-slate-500">
                  Evaluator: {{ inchargeEvaluatorName || 'Not assigned' }}
                </div>
              </div>
              <span
                class="rounded-full px-2 py-0.5 text-xs font-medium"
                :class="
                  !finalized && canMarkInCharge
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-slate-100 text-slate-600'
                "
              >
                {{ !finalized && canMarkInCharge ? 'Editable' : 'Read only' }}
              </span>
            </div>
            <textarea
              rows="3"
              v-model="inchargeObs"
              :readonly="finalized || !canMarkInCharge"
              class="w-full rounded-md border px-2 py-2 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-200"
              placeholder="Write in-charge observation"
            ></textarea>
            <div class="mt-2 flex items-center justify-between text-xs">
              <span class="text-slate-500">{{ inchargeObsCount }} chars</span>
              <button
                v-if="!finalized && canMarkInCharge"
                class="btn-4 print:hidden"
                :disabled="isSaving"
                @click="saveObs('incharge')"
              >
                Save
              </button>
              <span v-else class="text-slate-400">{{ finalized ? 'Finalized' : 'View only' }}</span>
            </div>
          </div>

          <div v-if="showCoordinatorField" class="col-span-2 border p-2 bg-gray-50 rounded">বিভাগীয় কো-অর্ডিনেটর</div>
          <div v-if="showCoordinatorField" class="rounded-lg border border-slate-200 bg-white p-3">
            <div class="mb-2 flex items-center justify-between gap-2">
              <div>
                <div class="font-medium text-slate-800">Coordinator/AD/DD</div>
                <div class="text-xs text-slate-500">
                  Evaluator: {{ coordinatorEvaluatorName || 'Not assigned' }}
                </div>
              </div>
              <span
                class="rounded-full px-2 py-0.5 text-xs font-medium"
                :class="
                  !finalized && canMarkCoordinator
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-slate-100 text-slate-600'
                "
              >
                {{ !finalized && canMarkCoordinator ? 'Editable' : 'Read only' }}
              </span>
            </div>
            <textarea
              rows="3"
              v-model="coordinatorObs"
              :readonly="finalized || !canMarkCoordinator"
              class="w-full rounded-md border px-2 py-2 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-200"
              placeholder="Write coordinator observation"
            ></textarea>
            <div class="mt-2 flex items-center justify-between text-xs">
              <span class="text-slate-500">{{ coordinatorObsCount }} chars</span>
              <button
                v-if="!finalized && canMarkCoordinator"
                class="btn-4 print:hidden"
                :disabled="isSaving"
                @click="saveObs('coordinator')"
              >
                Save
              </button>
              <span v-else class="text-slate-400">{{ finalized ? 'Finalized' : 'View only' }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Signature -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-2 pt-4 text-sm">
        <div v-if="showInChargeField" class="rounded-lg border border-slate-200 bg-white p-3">
          <div class="text-xs font-medium uppercase tracking-wide text-slate-500">
            In-charge evaluator
          </div>
          <div class="mt-1 text-sm font-semibold text-slate-800">
            {{ inchargeEvaluatorName || 'Not assigned' }}
          </div>
          <div class="mt-3 text-xs text-slate-500">Signature</div>
          <div class="mt-2 h-6 border-b border-slate-300"></div>
        </div>
        <div v-if="showCoordinatorField" class="rounded-lg border border-slate-200 bg-white p-3">
          <div class="text-xs font-medium uppercase tracking-wide text-slate-500">
            Coordinator/AD/DD evaluator
          </div>
          <div class="mt-1 text-sm font-semibold text-slate-800">
            {{ coordinatorEvaluatorName || 'Not assigned' }}
          </div>
          <div class="mt-3 text-xs text-slate-500">Signature</div>
          <div class="mt-2 h-6 border-b border-slate-300"></div>
        </div>
      </div>
      <div class="hidden grid-cols-12 gap-2 pt-4 text-sm">
        <div class="col-span-6 border p-3 rounded">মূল্যায়নকারীর নাম:</div>
        <div class="col-span-6 border p-3 rounded">স্বাক্ষর:</div>
      </div>
    </div>

    <div v-else class="rounded-md border bg-white p-4 text-gray-600">Data not available.</div>

    <!-- Criteria modal: current.user ভিত্তিক, একবারই মাউন্ট -->
    <CriteriaAssignModal
      v-model="assignOpen"
      :user-id="u?.id"
      :user-label="u?.name"
      :criteria_assignments="u?.criteria_assignments"
      @assigned="afterAssigned"
    />
  </div>
</template>

<style scoped>
.richtext :deep(ol) {
  @apply list-decimal pl-5 my-1;
}
.richtext :deep(ul) {
  @apply list-disc pl-5 my-1;
}
.richtext :deep(li) {
  @apply my-0.5;
}
.richtext :deep(p) {
  @apply my-1;
}
.observation-panel > .col-span-2 {
  display: none;
}
/* ===== Print-only cleanup (inside this component) ===== */
@media print {
  /* Layout cleanup */
  .print\:hidden {
    display: none !important;
  }
  .rounded-2xl,
  .rounded-lg,
  .rounded,
  .rounded-md {
    border-radius: 0 !important;
  }
  .shadow,
  .shadow-sm,
  .shadow-md,
  .shadow-lg,
  .shadow-xl {
    box-shadow: none !important;
  }
  .backdrop-blur,
  .backdrop-blur-sm,
  .backdrop-blur-md {
    -webkit-backdrop-filter: none !important;
    backdrop-filter: none !important;
  }

  /* Table look: crisp B/W */
  thead tr,
  .bg-gray-50,
  .bg-gray-100 {
    background: transparent !important;
  }
  th,
  td {
    padding: 6px 8px !important;
  }
  th {
    border-bottom: 1px solid #000 !important;
  }
  .border {
    border-color: #555 !important;
  } /* হালকা ধূসর লাইনের বদলে শার্প */
  .text-gray-500,
  .text-gray-600,
  .text-slate-600 {
    color: #000 !important;
  }

  /* Description: print-এ clamp খুলে দিন */
  .line-clamp-3 {
    display: block !important;
    -webkit-line-clamp: unset !important;
    overflow: visible !important;
  }

  /* Inputs/textarea/select → Plain text look */
  input,
  textarea,
  select {
    appearance: none !important;
    -webkit-appearance: none !important;
    border: 0 !important;
    background: transparent !important;
    box-shadow: none !important;
    outline: none !important;
    padding: 0 !important;
  }
  input[type='number']::-webkit-outer-spin-button,
  input[type='number']::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
  textarea {
    height: auto !important;
    overflow: visible !important;
    white-space: pre-wrap !important; /* লাইন ব্রেক প্রিজার্ভ */
  }
  /* Placeholder গুলো লুকান */
  ::-webkit-input-placeholder {
    color: transparent !important;
  }
  :-ms-input-placeholder {
    color: transparent !important;
  }
  ::placeholder {
    color: transparent !important;
  }

  /* Action/UI elements */
  .btn-2,
  .btn-3,
  .btn-4,
  button,
  [role='button'] {
    display: none !important;
  }
  a {
    color: inherit !important;
    text-decoration: none !important;
  }

  /* টেবিল/কার্ড পেজ ব্রেক এভয়েড */
  table,
  .avoid-break {
    page-break-inside: auto;
  }
  tr,
  .card,
  .rounded-2xl,
  .rounded-lg {
    page-break-inside: avoid;
  }
}

/* Optional: signature line look (screen + print) */
.signature-line {
  position: relative;
  min-height: 36px;
}
@media print {
  .signature-line {
    border: 0 !important;
    padding: 0 !important;
  }
  .signature-line::after {
    content: '';
    display: block;
    margin-top: 18px; /* লাইনের উপরে একটু স্পেস */
    border-bottom: 1px solid #000;
    width: 100%;
  }
}
</style>
