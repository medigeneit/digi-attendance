<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useKpiStore } from '@/stores/kpi'
import { useAuthStore } from '@/stores/auth' // adjust if your path differs

const route = useRoute()
const store = useKpiStore()
const auth  = useAuthStore()

/** form state */
const marks = ref({})
const strengths = ref(''), gaps = ref(''), suggestions = ref('')
const getTargetMarks = ref(null)

/**
 * lanes: [{ key,label,rank,assigned_user_id,can_current_user_review,can_view_marks,is_hr_lane? }, ...]
 * reviewsByLane: { laneKey: [ { marks, obtained_total, submitted_at } ] }
 */
const lanes = ref([])
const reviewsByLane = ref({})
const myLaneKey = ref(null)

/** API-provided HR capability (or fallback if user can edit their HR lane) */
const isHR = ref(false)

/* ---------- Helpers & classification ---------- */
const groupsAll = computed(() => store.cycle?.groups_json || [])
const isPersonalGroup = (g) => g?.id === 'personal' || /personal/i.test(g?.label || '')
const personalGroup = computed(() => groupsAll.value.find(isPersonalGroup) || null)
const otherGroups   = computed(() => groupsAll.value.filter(g => !isPersonalGroup(g)))

/** Detect HR lanes (hr, hr2, hr3, … or flagged by API) */
const isHrLaneKey = (key) => /^hr\d*$/i.test(key) || key === 'hr'
const isHrLane = (ln) => isHrLaneKey(ln?.key || '') || ln?.is_hr_lane === true

/** Split lanes */
const hrLanes    = computed(() => lanes.value.filter(isHrLane))
const nonHrLanes = computed(() => lanes.value.filter(l => !isHrLane(l)))

/** Current user & my HR lane (by assigned_user_id) */
const currentUserId = computed(() => Number(auth?.user?.id || 0))
const myHrLane = computed(() => {
  const uid = currentUserId.value
  if (!uid) return null
  return hrLanes.value.find(ln => Number(ln.assigned_user_id) === uid) || null
})
const myHrLaneKey = computed(() => myHrLane.value?.key || null)

/** Editing capabilities */
const canEditHR = computed(() => !!(myHrLane.value && myHrLane.value.can_current_user_review))
const canHR     = computed(() => !!(isHR.value || canEditHR.value))

/** My editing capability for personal (non-HR) group */
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
  // Prefer my assigned HR lane (if any)
  if (myHrLaneKey.value) {
    const r = laneFirstReview(myHrLaneKey.value)
    const v = r?.marks?.[itemId]
    if (v != null) return v
  }
  // Fallback to latest among all HR lanes
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

/** Quick fill entire group */
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

/** Serial for personal rows */
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

  getTargetMarks.value = resp?.annual_target_avg_marks
  

  lanes.value = resp.lanes || []

  reviewsByLane.value = resp.reviews_by_lane || {}

  isHR.value = !!(resp?.meta?.is_hr ?? resp?.hr ?? false)



  // My non-HR editable lane (personal)
  myLaneKey.value = nonHrLanes.value.find(x => x.can_current_user_review)?.key || null

  // init zeros
  groupsAll.value.forEach(g => g.items.forEach(it => { if (marks.value[it.id] == null) marks.value[it.id] = 0 }))

  // Prefill personal from my non-HR lane (if exists)
  if (myLaneKey.value) {
    const myExisting = laneFirstReview(myLaneKey.value)
    if (myExisting?.marks) Object.assign(marks.value, myExisting.marks)
  }

  // Prefill other groups from HR:
  // - if I can HR-edit → load my HR lane marks first
  // - otherwise leave for read-only display via hrMark()
  if (canHR.value) {
    otherGroups.value.forEach(g => {
      g.items.forEach(it => {
        // Prefer my HR lane mark
        let v = myHrLaneKey.value ? laneMark(myHrLaneKey.value, it.id) : ''
        // Fallback to aggregated latest among HR lanes
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
    // if backend canonicalizes hr/hr2/... to 'hr', this is fine:
    reviewer_lane: isHrMode ? myHrLaneKey.value : myLaneKey.value,
    marks: marks.value,
    strengths: strengths.value,
    gaps: gaps.value,
    suggestions: suggestions.value
  })
  alert('Submitted')
}

function fmt(n){ const v = Number(n ?? 0); return isNaN(v) ? '0.00' : v.toFixed(2) }
function pct(got, max){
  const g = Number(got ?? 0), m = Number(max ?? 0)
  return m > 0 ? Math.round((g / m) * 100) : 0
}
</script>


<template>
  <div class="max-w-6xl mx-auto py-6 px-4">
    <header class="mb-4">
      <div class="flex items-center justify-between">
        <div class="space-y-0.5">
          <h2 class="text-xl font-semibold">KPI — {{ store.cycle?.title }}</h2>
          <p class="text-sm text-slate-600">
            Employee: <strong>#{{ $route.params.employeeId }}</strong>
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
          class="px-5 py-2.5 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700"
        >
          Finalize & Lock
        </button>

      </div>
    </header>

    <!-- === PERSONAL GROUP — visible to everyone; editable only for non-HR own lane === -->
    <section v-if="store.cycle && personalGroup" class="overflow-auto border rounded-2xl mb-6">
      <table class="min-w-[980px] w-full text-sm">
        <thead class="bg-slate-50 sticky top-0">
          <tr>
            <th class="px-3 py-2 w-[60px] text-center">SL</th>
            <th class="text-left px-3 py-2 w-[34%]">মূল্যায়নের বিষয় (Personal)</th>
            <th class="px-3 py-2 text-center">Max</th>
            <!-- only non-HR lanes as columns -->
            <th v-for="ln in nonHrLanes" :key="ln.key" class="px-3 py-2 text-center">
              <div class="font-medium">{{ ln.label }}</div>
              <div class="text-[11px] text-slate-500">
                <span v-if="ln.assigned_user_name">{{ ln.assigned_user_name }}</span>
                <span v-else>-</span>
                <span v-if="ln.key === myLaneKey && ln.can_current_user_review"
                      class="ml-1 rounded bg-blue-50 text-blue-700 border border-blue-200 px-1">editable</span>
              </div>
            </th>
          </tr>
        </thead>

        <tbody>
          <!-- Group header row -->
          <tr class="bg-slate-100/80 border-t">
            <td :colspan="3 + nonHrLanes.length" class="px-3 py-2 font-medium">
              {{ personalGroup.label }}
            </td>
          </tr>

          <!-- Items -->
          <tr v-for="it in personalGroup.items" :key="it.id" class="border-t">
            <td class="px-3 py-2 text-center">{{ serialMap[it.id] }}</td>
            <td class="px-3 py-2">
              <div class="font-medium">{{ it.label }}</div>
              <div class="mt-1 hidden md:flex gap-1 text-[11px] text-slate-500">
                <button class="border rounded px-1.5 py-0.5" @click="quickFill(it.id, it.max, 'zero')">0</button>
                <button class="border rounded px-1.5 py-0.5" @click="quickFill(it.id, it.max, 'half')">½</button>
                <button class="border rounded px-1.5 py-0.5" @click="quickFill(it.id, it.max, 'full')">Full</button>
              </div>
            </td>
            <td class="px-3 py-2 text-center">{{ it.max }}</td>

            <td v-for="ln in nonHrLanes" :key="ln.key" class="px-3 py-2">
              <!-- editable: my lane -->
              <div v-if="ln.key === myLaneKey && ln.can_current_user_review" class="flex items-center gap-2 justify-center">
                <input
                  type="number" step="0.1" min="0" :max="it.max"
                  v-model.number="marks[it.id]" @change="cap(it.id, it.max)"
                  class="w-24 text-right rounded-lg border px-2 py-1"
                />
              </div>

              <!-- readonly: can view -->
              <div v-else-if="ln.can_view_marks" class="text-center text-slate-700">
                {{ laneMark(ln.key, it.id) }}
              </div>

              <!-- not allowed -->
              <div v-else class="text-center text-slate-400">—</div>
            </td>
          </tr>

          <!-- Group subtotal -->
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

    <!-- === OTHER GROUPS — HR only (single column), read-only if no HR permission === -->
    <section v-if="otherGroups.length" class="border rounded-2xl">
      <div class="px-3 py-2 bg-slate-50 text-sm font-medium flex items-center justify-between">
        <span>Other Groups (HR only) — Personal attributes excluded</span>
        <div class="hidden md:flex gap-2 text-[12px] text-slate-600">
          <span v-if="canHR" class="rounded bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5">You can edit HR</span>
          <span v-else class="rounded bg-slate-100 border px-2 py-0.5">View only</span>
        </div>
      </div>

      <div v-for="(grp, gIdx) in otherGroups" :key="grp.id" class="overflow-auto">
        <table class="min-w-[760px] w-full text-sm">
          <thead class="sticky top-0 bg-white">
            <tr class="bg-slate-100">
              <th class="px-3 py-2 w-[60px] text-center">SL</th>
              <th class="text-left px-3 py-2 w-[48%]">গ্রুপ: {{ gIdx+1 }} — {{ grp.label }}</th>
              <th class="px-3 py-2 text-center w-[120px]">Max</th>
              <th class="px-3 py-2 text-center w-[160px]">HR</th>
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
              <td class="px-3 py-2 text-center">{{ ii+1 }} </td>
              <td class="px-3 py-2">
                <div class="font-medium">{{ it.label }}</div>
                 <div v-if="grp.id === 'target'" class="max-w-xl">
                    <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <!-- Incharge -->
                      <div class="flex-1 rounded-lg border px-3 py-2">
                        <div class="flex items-center justify-between">
                          <span class="text-xs font-medium text-slate-600">Incharge (avg)</span>
                          <span class="text-[11px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                            {{ pct(getTargetMarks?.avg?.incharge, getTargetMarks?.avg?.max) }}%
                          </span>
                        </div>
                        <div class="mt-0.5 text-sm font-semibold">
                          {{ fmt(getTargetMarks?.avg?.incharge) }}
                          <span class="text-xs text-slate-500">/ {{ fmt(getTargetMarks?.avg?.max) }}</span>
                        </div>
                      </div>

                      <!-- Coordinator -->
                      <div class="flex-1 rounded-lg border px-3 py-2">
                        <div class="flex items-center justify-between">
                          <span class="text-xs font-medium text-slate-600">Coordinator (avg)</span>
                          <span class="text-[11px] px-1.5 py-0.5 rounded bg-violet-50 text-violet-700 border border-violet-200">
                            {{ pct(getTargetMarks?.avg?.coordinator, getTargetMarks?.avg?.max) }}%
                          </span>
                        </div>
                        <div class="mt-0.5 text-sm font-semibold">
                          {{ fmt(getTargetMarks?.avg?.coordinator) }}
                          <span class="text-xs text-slate-500">/ {{ fmt(getTargetMarks?.avg?.max) }}</span>
                        </div>
                      </div>

                      <!-- Final -->
                      <div class="flex-1 rounded-lg border px-3 py-2">
                        <div class="flex items-center justify-between">
                          <span class="text-xs font-medium text-slate-600">Final (avg)</span>
                          <span class="text-[11px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {{ pct(getTargetMarks?.avg?.final, getTargetMarks?.avg?.max) }}%
                          </span>
                        </div>
                        <div class="mt-0.5 text-sm font-semibold">
                          {{ fmt(getTargetMarks?.avg?.final) }}
                          <span class="text-xs text-slate-500">/ {{ fmt(getTargetMarks?.avg?.max) }}</span>
                        </div>
                      </div>
                    </div>
                  </div>
              </td>
              <td class="px-3 py-2 text-center">{{ it.max }}</td>

              <!-- Single HR column -->
              <td class="px-3 py-2 text-center">
                <template v-if="canHR">
                  <input
                    type="number" step="0.1" min="0" :max="it.max"
                    v-model.number="marks[it.id]" @change="cap(it.id, it.max)"
                    class="w-24 text-right rounded-lg border px-2 py-1"
                  />
                </template>
                <template v-else>
                  <span class="text-slate-700">{{ hrMark(it.id) }}</span>
                </template>
              </td>
            </tr>

            <!-- group subtotal -->
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
    </section>

    <!-- Notes (enable if editing in either mode) -->
    <div v-if="canEditPersonal || canHR" class="grid md:grid-cols-3 gap-4 mt-4">
      <textarea v-model="strengths" placeholder="Key Strength(s)" class="rounded-xl border p-3 min-h-28"></textarea>
      <textarea v-model="gaps" placeholder="GAP(s)" class="rounded-xl border p-3 min-h-28"></textarea>
      <textarea v-model="suggestions" placeholder="Suggestions / Training" class="rounded-xl border p-3 min-h-28"></textarea>
    </div>

    <div class="mt-6 flex items-center justify-between">
      <div class="text-sm">My (Personal) Total: <b>{{ personalTotals.got.toFixed(2) }}</b> / {{ personalTotals.max.toFixed(2) }}</div>
      <button
        @click="submit"
        :disabled="!(canHR || canEditPersonal)"
        class="px-5 py-2.5 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40"
      >
        Submit
      </button>
    </div>
  </div>
</template>
