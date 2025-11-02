<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useKpiStore } from '@/stores/kpi'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const store = useKpiStore()
const auth  = useAuthStore()

/* ---------- Local state ---------- */
const marks = ref({})
const employee = ref({})
const strengths = ref(''), gaps = ref(''), suggestions = ref('')
const getTargetMarks = ref(null)
const showTargetDetails = ref(false)

/**
 * lanes: [{ key,label,rank,assigned_user_id,can_current_user_review,can_view_marks,is_hr_lane? }, ...]
 * reviewsByLane: { laneKey: [ { marks, obtained_total, submitted_at } ] }
 */
const lanes = ref([])
const reviewsByLane = ref({})
const myLaneKey = ref(null)
const isHR = ref(false)

/* ---------- Helpers & classification ---------- */
const groupsAll = computed(() => store.cycle?.groups_json || [])

const isPersonalGroup = (g) => g?.id === 'personal' || /personal/i.test(g?.label || '')
const personalGroup = computed(() => groupsAll.value.find(isPersonalGroup) || null)
const otherGroups   = computed(() => groupsAll.value.filter(g => !isPersonalGroup(g)))

/** Fallback label if a group name is missing */
const safeGroupLabel = (grp, idx) => grp?.label || `Group ${idx + 1}`

/** HR lane detection */
const isHrLaneKey = (key) => /^hr\d*$/i.test(key) || key === 'hr'
const isHrLane = (ln) => isHrLaneKey(ln?.key || '') || ln?.is_hr_lane === true

const hrLanes    = computed(() => lanes.value.filter(isHrLane))
const nonHrLanes = computed(() => lanes.value.filter(l => !isHrLane(l)))

const currentUserId = computed(() => Number(auth?.user?.id || 0))
const myHrLane = computed(() => {
  const uid = currentUserId.value
  if (!uid) return null
  return hrLanes.value.find(ln => Number(ln.assigned_user_id) === uid) || null
})
const myHrLaneKey = computed(() => myHrLane.value?.key || null)

const canEditHR = computed(() => !!(myHrLane.value && myHrLane.value.can_current_user_review))
const canHR     = computed(() => !!(isHR.value || canEditHR.value))

const canEditPersonal = computed(() =>
  !!myLaneKey.value &&
  nonHrLanes.value.some(l => l.key === myLaneKey.value && l.can_current_user_review)
)

/* ---------- Existing review readers ---------- */
function laneFirstReview(laneKey) {
  const arr = reviewsByLane.value?.[laneKey] || []
  return arr[0] || null
}

function laneMark(laneKey, itemId) {
  const r = laneFirstReview(laneKey)
  return r?.marks?.[itemId] ?? ''
}

/** HR mark: prefer my assigned HR lane; fallback to latest among hr* lanes */
function hrMark(itemId) {
  if (myHrLaneKey.value) {
    const r = laneFirstReview(myHrLaneKey.value)
    const v = r?.marks?.[itemId]
    if (v != null) return v
  }
  let chosen = null
  for (const ln of hrLanes.value) {
    const arr = reviewsByLane.value?.[ln.key] || []
    const r = arr[0]
    if (!r || r?.marks?.[itemId] == null) continue
    if (!chosen) { chosen = r; continue }
    if (r.submitted_at && chosen.submitted_at && r.submitted_at > chosen.submitted_at) {
      chosen = r
    }
  }
  return chosen?.marks?.[itemId] ?? ''
}

/* ---------- Marks safety ---------- */
function cap(id, max) {
  const v = Number(marks.value[id] ?? 0)
  if (v < 0) marks.value[id] = 0
  if (v > Number(max)) marks.value[id] = Number(max)
}
function quickFill(id, max, t) {
  if (t === 'zero') marks.value[id] = 0
  else if (t === 'half') marks.value[id] = Number(max) / 2
  else if (t === 'full') marks.value[id] = Number(max)
  cap(id, max)
}
function quickFillGroup(group, t) {
  group.items.forEach(it => quickFill(it.id, it.max, t))
}

/* ---------- Totals (personal only) ---------- */
const personalTotals = computed(() => {
  let max = 0, got = 0
  const grp = personalGroup.value
  if (grp) {
    grp.items.forEach(it => {
      max += Number(it.max || 0)
      const v = Number(marks.value[it.id] || 0)
      got += Math.min(Math.max(v, 0), Number(it.max || 0))
    })
  }
  const pct = max > 0 ? (got / max) * 100 : 0
  return {
    max: Number(max.toFixed(2)),
    got: Number(got.toFixed(2)),
    percent: Number(pct.toFixed(2)),
  }
})

/* ---------- Target summary (sidebar) ---------- */
const hasTargetSummary = computed(() => !!getTargetMarks.value && typeof getTargetMarks.value === 'object')
const targetAvg   = computed(() => getTargetMarks.value?.avg || { max: 0, incharge: 0, coordinator: 0, final: 0, percent_simple: 0, percent_weighted: 0 })
const targetYear  = computed(() => getTargetMarks.value?.year ?? null)
const targetForms = computed(() => getTargetMarks.value?.months_total_form ?? 0)

/* ---------- Serial for personal rows ---------- */
const serialMap = computed(() => {
  const map = {}
  let i = 1
  const grp = personalGroup.value
  if (grp) grp.items.forEach(it => { map[it.id] = i++ })
  return map
})

/* ---------- Init ---------- */
onMounted(async () => {
  if (!store.cycle) await store.fetchActiveCycle()

  const resp = await store.fetchLanes(store.cycle.id, Number(route.params.employeeId))

  employee.value = resp.employee
  getTargetMarks.value = resp?.annual_target_avg_marks || null
  lanes.value = resp.lanes || []
  reviewsByLane.value = resp.reviews_by_lane || {}
  isHR.value = !!(resp?.meta?.is_hr ?? resp?.hr ?? false)

  myLaneKey.value = nonHrLanes.value.find(x => x.can_current_user_review)?.key || null

  groupsAll.value.forEach(g => g.items.forEach(it => { if (marks.value[it.id] == null) marks.value[it.id] = 0 }))

  if (myLaneKey.value) {
    const myExisting = laneFirstReview(myLaneKey.value)
    if (myExisting?.marks) Object.assign(marks.value, myExisting.marks)
  }

  if (canHR.value) {
    otherGroups.value.forEach(g => {
      g.items.forEach(it => {
        let v = myHrLaneKey.value ? laneMark(myHrLaneKey.value, it.id) : ''
        if (v === '' || v == null) v = hrMark(it.id)
        if (v !== '' && v != null) marks.value[it.id] = Number(v)
      })
    })
  }
})

/* ---------- Submit ---------- */
async function submit() {
  const isHrMode = canHR.value
  await store.submitReview({
    cycle_id: store.cycle.id,
    employee_id: Number(route.params.employeeId),
    reviewer_lane: isHrMode ? myHrLaneKey.value : myLaneKey.value,
    marks: marks.value,
    strengths: strengths.value,
    gaps: gaps.value,
    suggestions: suggestions.value
  })
  alert('Submitted')
}

/* ---------- Utils ---------- */
function fmt(n){ const v = Number(n ?? 0); return isNaN(v) ? '0.00' : v.toFixed(2) }
function pct(got, max){
  const g = Number(got ?? 0), m = Number(max ?? 0)
  return m > 0 ? Math.round((g / m) * 100) : 0
}
</script>

<template>
  <div class="max-w-7xl mx-auto py-6 px-4">
    <!-- Header / Employee context -->
    <header class="mb-5">
      <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div class="space-y-0.5">
          <h2 class="text-xl font-semibold">KPI — {{ store.cycle?.title }}</h2>
          <p class="text-sm text-slate-600">
            Employee: <strong>{{ employee?.name }}</strong>
            • Designation: <strong>{{ employee?.designation?.title }}</strong>
            • Reviewing as:
            <strong v-if="canHR" class="inline-flex items-center gap-1">
              HR
              <span class="text-[11px] rounded bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 text-emerald-700">HR mode</span>
            </strong>
            <strong v-else>{{ myLaneKey || 'No lane' }}</strong>
          </p>
        </div>

        <div class="text-right">
          <div class="text-xs text-slate-500">Total (Personal group)</div>
          <div class="text-lg font-bold">
            {{ personalTotals.got.toFixed(2) }} / {{ personalTotals.max.toFixed(2) }}
            ({{ personalTotals.percent.toFixed(2) }}%)
          </div>
        </div>

        <button
          v-if="isHR"
          @click="store.submitFinalResult(store.cycle.id, route.params.employeeId)"
          class="px-5 py-2.5 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700">
          Finalize & Lock
        </button>
      </div>
    </header>

    <!-- PERSONAL GROUP -->
    <section v-if="store.cycle && personalGroup" class="overflow-auto border rounded-2xl bg-white mb-6">
      <table class="min-w-[980px] w-full text-sm">
        <thead class="bg-slate-50 sticky top-0 z-10">
          <tr class="text-slate-700">
            <th class="px-3 py-2 w-[60px] text-center font-medium">SL</th>
            <th class="text-left px-3 py-2 w-[34%] font-medium">মূল্যায়নের বিষয় (Personal)</th>
            <th class="px-3 py-2 text-center font-medium">Max</th>
            <th v-for="ln in nonHrLanes" :key="ln.key" class="px-3 py-2 text-center font-medium">
              <div class="font-medium">{{ ln.label || ln.key }}</div>
              <div class="text-[11px] text-slate-500">
                <span v-if="ln.assigned_user_name">{{ ln.assigned_user_name }}</span>
                <span v-else>-</span>
                <span
                  v-if="ln.key === myLaneKey && ln.can_current_user_review"
                  class="ml-1 rounded bg-blue-50 text-blue-700 border border-blue-200 px-1">
                  editable
                </span>
              </div>
            </th>
          </tr>
        </thead>

        <tbody>
          <tr class="bg-slate-100/80 border-t">
            <td :colspan="3 + nonHrLanes.length" class="px-3 py-2 font-medium">
              {{ personalGroup.label || 'Personal' }}
            </td>
          </tr>

          <tr v-for="it in personalGroup.items" :key="it.id" class="border-t">
            <td class="px-3 py-2 text-center">{{ serialMap[it.id] }}</td>
            <td class="px-3 py-2">
              <div class="font-medium">{{ it.label }}</div>
              <div class="mt-1 hidden md:flex gap-1 text-[11px] text-slate-500">
                  <button
                    class="border rounded px-1.5 py-0.5 disabled:opacity-40 disabled:cursor-not-allowed"
                    :disabled="!canEditPersonal"
                    @click="canEditPersonal && quickFill(it.id, it.max, 'zero')"
                  >
                    0
                  </button>
                  <button
                    class="border rounded px-1.5 py-0.5 disabled:opacity-40 disabled:cursor-not-allowed"
                    :disabled="!canEditPersonal"
                    @click="canEditPersonal && quickFill(it.id, it.max, 'half')"
                  >
                    ½
                  </button>
                  <button
                    class="border rounded px-1.5 py-0.5 disabled:opacity-40 disabled:cursor-not-allowed"
                    :disabled="!canEditPersonal"
                    @click="canEditPersonal && quickFill(it.id, it.max, 'full')"
                  >
                    Full
                  </button>
                </div>
            </td>
            <td class="px-3 py-2 text-center">{{ it.max }}</td>

            <td v-for="ln in nonHrLanes" :key="ln.key" class="px-3 py-2">
              <div v-if="ln.key === myLaneKey && ln.can_current_user_review" class="flex items-center gap-2 justify-center">
                <input
                  type="number" step="0.1" min="0" :max="it.max"
                  v-model.number="marks[it.id]" @change="cap(it.id, it.max)"
                  inputmode="decimal"
                  class="w-24 text-right rounded-lg border px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                />
              </div>

              <div v-else-if="ln.can_view_marks" class="text-center text-slate-700">
                {{ laneMark(ln.key, it.id) }}
              </div>

              <div v-else class="text-center text-slate-400">—</div>
            </td>
          </tr>

          <tr class="bg-slate-50 border-t">
            <td></td>
            <td class="px-3 py-2 text-right font-medium">Group Total</td>
            <td class="px-3 py-2 text-center font-medium">
              {{ personalGroup.items.reduce((a,b)=>a+Number(b.max||0),0).toFixed(2) }}
            </td>
            <td :colspan="nonHrLanes.length" class="px-3 py-2 text-center">
              <span class="font-semibold">
                {{
                  personalGroup.items.reduce((a,b)=>{
                    const v = Number(marks[b.id]||0); return a + Math.min(Math.max(v,0), Number(b.max||0))
                  },0).toFixed(2)
                }}
              </span>
              <span class="text-slate-500">
                / {{ personalGroup.items.reduce((a,b)=>a+Number(b.max||0),0).toFixed(2) }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </section>

    <!-- OTHER GROUPS + RIGHT SIDEBAR -->
    <section v-if="otherGroups.length" class="mt-6">
      <div class="grid lg:grid-cols-3 gap-4">
        <!-- Main (groups tables) -->
        <div class="lg:col-span-2">
          <div v-for="(grp, gIdx) in otherGroups" :key="gIdx" class="overflow-auto border rounded-2xl bg-white mb-4">
            <table class="min-w-[760px] w-full text-sm">
              <thead class="sticky top-0 bg-white z-10">
                <tr class="bg-slate-100 text-slate-700">
                  <th class="px-3 py-2 w-[60px] text-center font-medium">SL</th>
                  <th class="text-left px-3 py-2 w-[48%] font-medium">গ্রুপ: {{ gIdx+1 }} — {{ safeGroupLabel(grp, gIdx) }}</th>
                  <th class="px-3 py-2 text-center w-[120px] font-medium">Max</th>
                  <th class="px-3 py-2 text-center w-[160px] font-medium">HR</th>
                </tr>
              </thead>

              <tbody>
                <tr class="bg-slate-50">
                  <td></td>
                  <td class="px-3 py-2">
                    <div class="flex gap-1 text-[11px] text-slate-600">
                      <button class="border rounded px-1.5 py-0.5" @click="quickFillGroup(grp,'zero')" :disabled="!canHR">All 0</button>
                      <button class="border rounded px-1.5 py-0.5" @click="quickFillGroup(grp,'half')" :disabled="!canHR">All ½</button>
                      <button class="border rounded px-1.5 py-0.5" @click="quickFillGroup(grp,'full')" :disabled="!canHR">All Full</button>
                    </div>
                  </td>
                  <td></td>
                  <td></td>
                </tr>

                <tr v-for="(it, ii) in grp.items" :key="it.id" class="border-t">
                  <td class="px-3 py-2 text-center">{{ ii+1 }}</td>
                  <td class="px-3 py-2">
                    <div class="font-medium">{{ it.label }}</div>
                  </td>
                  <td class="px-3 py-2 text-center">{{ it.max }}</td>

                  <td class="px-3 py-2 text-center">
                    <template v-if="canHR">
                      <input
                        type="number" step="0.1" min="0" :max="it.max"
                        v-model.number="marks[it.id]" @change="cap(it.id, it.max)"
                        inputmode="decimal"
                        class="w-24 text-right rounded-lg border px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                      />
                    </template>
                    <template v-else>
                      <span class="text-slate-700">{{ hrMark(it.id) }}</span>
                    </template>
                  </td>
                </tr>

                <tr class="bg-slate-50 border-t">
                  <td></td>
                  <td class="px-3 py-2 text-right font-medium">Group Total</td>
                  <td class="px-3 py-2 text-center font-medium">
                    {{ grp.items.reduce((a,b)=>a+Number(b.max||0),0).toFixed(2) }}
                  </td>
                  <td class="px-3 py-2 text-center">
                    {{
                      grp.items.reduce((a,b)=>{
                        const v = Number(marks[b.id]||0); return a + Math.min(Math.max(v,0), Number(b.max||0))
                      },0).toFixed(2)
                    }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Right sidebar (Annual Target Summary) -->
        <aside v-if="hasTargetSummary" class="lg:col-span-1">
          <div class="sticky top-4 space-y-4">
            <div class="border rounded-2xl bg-white p-4">
              <div class="flex items-center justify-between">
                <h3 class="font-semibold">Annual Target</h3>
                <div class="flex items-center gap-2">
                  <span v-if="targetYear" class="text-xs rounded-full border px-2 py-0.5 text-slate-700">Year {{ targetYear }}</span>
                  <span class="text-xs rounded-full border px-2 py-0.5 text-slate-700">{{ targetForms }} form(s)</span>
                </div>
              </div>

              <!-- Metric cards -->
              <div class="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <!-- Incharge -->
                <div class="rounded-xl border p-3">
                  <div class="flex items-center justify-between">
                    <span class="text-xs font-medium text-slate-600">Incharge</span>
                    <span class="text-[11px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                      {{ pct(targetAvg.incharge, targetAvg.max) }}%
                    </span>
                  </div>
                  <div class="mt-1 text-sm font-semibold">
                    {{ fmt(targetAvg.incharge) }}
                    <span class="text-xs text-slate-500">/ {{ fmt(targetAvg.max) }}</span>
                  </div>
                  <div class="mt-2 h-2 rounded bg-slate-100 overflow-hidden">
                    <div class="h-2 bg-blue-500" :style="{ width: pct(targetAvg.incharge, targetAvg.max) + '%' }"></div>
                  </div>
                </div>

                <!-- Coordinator -->
                <div class="rounded-xl border p-3">
                  <div class="flex items-center justify-between">
                    <span class="text-xs font-medium text-slate-600">Coordinator</span>
                    <span class="text-[11px] px-1.5 py-0.5 rounded bg-violet-50 text-violet-700 border border-violet-200">
                      {{ pct(targetAvg.coordinator, targetAvg.max) }}%
                    </span>
                  </div>
                  <div class="mt-1 text-sm font-semibold">
                    {{ fmt(targetAvg.coordinator) }}
                    <span class="text-xs text-slate-500">/ {{ fmt(targetAvg.max) }}</span>
                  </div>
                  <div class="mt-2 h-2 rounded bg-slate-100 overflow-hidden">
                    <div class="h-2 bg-violet-500" :style="{ width: pct(targetAvg.coordinator, targetAvg.max) + '%' }"></div>
                  </div>
                </div>

                <!-- Final -->
                <div class="rounded-xl border p-3">
                  <div class="flex items-center justify-between">
                    <span class="text-xs font-medium text-slate-600">Final</span>
                    <span class="text-[11px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {{ pct(targetAvg.final, targetAvg.max) }}%
                    </span>
                  </div>
                  <div class="mt-1 text-sm font-semibold">
                    {{ fmt(targetAvg.final) }}
                    <span class="text-xs text-slate-500">/ {{ fmt(targetAvg.max) }}</span>
                  </div>
                  <div class="mt-2 h-2 rounded bg-slate-100 overflow-hidden">
                    <div class="h-2 bg-emerald-500" :style="{ width: pct(targetAvg.final, targetAvg.max) + '%' }"></div>
                  </div>
                </div>
              </div>

              <!-- Foot notes -->
              <div class="mt-3 text-xs text-slate-600">
                <p class="leading-5">
                  Note: The “Target” group name may be unavailable. This panel summarizes
                  the annual target averages independently of group labels.
                </p>
              </div>

              <!-- Details toggle -->
              <div class="mt-3">
                <button
                  class="text-xs px-3 py-1.5 rounded-md border hover:bg-slate-50"
                  @click="showTargetDetails = !showTargetDetails">
                  {{ showTargetDetails ? 'Hide details' : 'Show details' }}
                </button>

                <div v-if="showTargetDetails" class="mt-3 rounded-xl border bg-slate-50 p-3 text-xs">
                  <div class="grid grid-cols-2 gap-y-2">
                    <div class="text-slate-500">Year</div>
                    <div class="font-medium">{{ targetYear || '-' }}</div>

                    <div class="text-slate-500">Forms counted</div>
                    <div class="font-medium">{{ targetForms }}</div>

                    <div class="text-slate-500">Max (denominator)</div>
                    <div class="font-medium">{{ fmt(targetAvg.max) }}</div>

                    <div class="text-slate-500">Incharge avg</div>
                    <div class="font-medium">{{ fmt(targetAvg.incharge) }}</div>

                    <div class="text-slate-500">Coordinator avg</div>
                    <div class="font-medium">{{ fmt(targetAvg.coordinator) }}</div>

                    <div class="text-slate-500">Final avg</div>
                    <div class="font-medium">{{ fmt(targetAvg.final) }}</div>

                    <div class="text-slate-500">Percent (simple)</div>
                    <div class="font-medium">{{ fmt(targetAvg.percent_simple) }}%</div>

                    <div class="text-slate-500">Percent (weighted)</div>
                    <div class="font-medium">{{ fmt(targetAvg.percent_weighted) }}%</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </section>

    <!-- Notes (enable if editing in either mode) -->
    <div v-if="canEditPersonal || canHR" class="grid md:grid-cols-3 gap-4 mt-4">
      <textarea v-model="strengths" placeholder="Key Strength(s)" class="rounded-xl border p-3 min-h-28"></textarea>
      <textarea v-model="gaps" placeholder="GAP(s)" class="rounded-xl border p-3 min-h-28"></textarea>
      <textarea v-model="suggestions" placeholder="Suggestions / Training" class="rounded-xl border p-3 min-h-28"></textarea>
    </div>

    <!-- Sticky action -->
    <div class="mt-6 flex items-center justify-between">
      <div class="text-sm">My (Personal) Total: <b>{{ personalTotals.got.toFixed(2) }}</b> / {{ personalTotals.max.toFixed(2) }}</div>
      <button
        @click="submit"
        :disabled="!(canHR || canEditPersonal)"
        class="px-5 py-2.5 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40">
        Submit
      </button>
    </div>
  </div>
</template>
