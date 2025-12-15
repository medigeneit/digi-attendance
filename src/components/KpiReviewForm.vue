<script setup>
import { useAuthStore } from '@/stores/auth'
import { useKpiStore } from '@/stores/kpi'
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const store = useKpiStore()
const auth = useAuthStore()

/* ---------- Local state ---------- */
const marks = ref({})
const employee = ref({})
const strengths = ref(''),
  gaps = ref(''),
  suggestions = ref('')
const getTargetMarks = ref(null)
const getPerformanceMarks = ref(null)
const showSummaryDetails = ref(false)

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
const otherGroups = computed(() => groupsAll.value.filter((g) => !isPersonalGroup(g)))

/** Fallback label if a group name is missing */
const safeGroupLabel = (grp, idx) => grp?.label || `Group ${idx + 1}`

/** HR lane detection */
const isHrLaneKey = (key) => /^hr\d*$/i.test(key) || key === 'hr'
const isHrLane = (ln) => isHrLaneKey(ln?.key || '') || ln?.is_hr_lane === true

// 🔹 সব lane কে rank অনুযায়ী sort
const sortedLanes = computed(() => {
  return [...(lanes.value || [])].sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999))
})

// 🔹 এই sorted list থেকে HR / non-HR ভাগ করা
const hrLanes = computed(() => sortedLanes.value.filter(isHrLane))
const nonHrLanes = computed(() => sortedLanes.value.filter((l) => !isHrLane(l)))
const myNonHrLane = computed(
  () => nonHrLanes.value.find((ln) => ln.key === myLaneKey.value) || null,
)
const myNonHrRank = computed(() => myNonHrLane.value?.rank ?? null)

const currentUserId = computed(() => Number(auth?.user?.id || 0))
const myHrLane = computed(() => {
  const uid = currentUserId.value
  if (!uid) return null
  const assignedLane = hrLanes.value.find((ln) => Number(ln.assigned_user_id) === uid)
  if (assignedLane) return assignedLane
  return hrLanes.value.find((ln) => ln.can_current_user_review) || null
})
const myHrLaneKey = computed(() => myHrLane.value?.key || null)

const canEditHR = computed(() => !!(myHrLane.value && myHrLane.value.can_current_user_review))
const canHR = computed(() => !!(isHR.value || canEditHR.value))

const canEditPersonal = computed(
  () =>
    !!myLaneKey.value &&
    nonHrLanes.value.some((l) => l.key === myLaneKey.value && l.can_current_user_review),
)

const reviewerLaneKey = computed(() => {
  if (canHR.value && myHrLaneKey.value) return myHrLaneKey.value
  return myLaneKey.value
})

const reviewingAsHR = computed(() =>
  Boolean(
    reviewerLaneKey.value && myHrLaneKey.value && reviewerLaneKey.value === myHrLaneKey.value,
  ),
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
    if (!chosen) {
      chosen = r
      continue
    }
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
  else if (t === 'threeQuarter') marks.value[id] = Number((Number(max) * 0.75).toFixed(1))
  else if (t === 'full') marks.value[id] = Number(max)
  cap(id, max)
}
function quickFillGroup(group, t) {
  group.items.forEach((it) => quickFill(it.id, it.max, t))
}

/* ---------- Totals (personal only) ---------- */
const personalTotals = computed(() => {
  let max = 0,
    got = 0
  const grp = personalGroup.value
  if (grp) {
    grp.items.forEach((it) => {
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
const hasTargetSummary = computed(
  () => !!getTargetMarks.value && typeof getTargetMarks.value === 'object',
)

const targetAvg = computed(
  () =>
    getTargetMarks.value?.avg || {
      per_scored_month: {},
      per_form_yearly: {},
      percent_simple: 0,
      percent_weighted: 0,
    },
)
const targetYear = computed(() => getTargetMarks.value?.year ?? null)
const performanceAvg = computed(
  () =>
    getPerformanceMarks.value?.avg || {
      per_scored_month: {},
      per_form_yearly: {},
      percent_simple: 0,
      percent_weighted: 0,
    },
)
const performanceYear = computed(() => getPerformanceMarks.value?.year ?? null)
const activeSummaryTab = ref('target')
const summaryTabs = [
  { key: 'target', label: 'Annual Target' },
  { key: 'performance', label: 'Annual Performance' },
]
const targetMonths = computed(() => getTargetMarks.value?.months_total_form ?? 0)
const performanceMonths = computed(
  () => getPerformanceMarks.value?.months_total_form ?? targetMonths.value,
)
const summaryData = computed(() =>
  activeSummaryTab.value === 'target' ? targetAvg.value : performanceAvg.value,
)
const summaryYear = computed(() =>
  activeSummaryTab.value === 'target' ? targetYear.value : performanceYear.value,
)
const summaryMonths = computed(() =>
  activeSummaryTab.value === 'target' ? targetMonths.value : performanceMonths.value,
)
const summaryLabel = computed(
  () => summaryTabs.find((tab) => tab.key === activeSummaryTab.value)?.label || 'Annual Target',
)
const summaryGroupMap = {
  target: 'target',
  performance: 'regular_activities_of_the_department',
}
const summaryGroup = computed(() => {
  const key = summaryGroupMap[activeSummaryTab.value]
  if (!key) return null
  return otherGroups.value.find((g) => g.id === key) || null
})
const summaryGroupLabel = computed(() => summaryGroup.value?.label || summaryLabel.value)
const setSummaryTab = (tabKey) => {
  if (summaryTabs.some((tab) => tab.key === tabKey)) {
    activeSummaryTab.value = tabKey
  }
}

watch(activeSummaryTab, () => {
  showSummaryDetails.value = false
})

const reviewComments = computed(() => {
  const byLane = reviewsByLane.value || {}
  const orderedNonHr = nonHrLanes.value || [] // rank অনুযায়ী sorted
  const result = []

  // HR মোড হলে সব দেখতে পারবে, না হলে নিজের rank পর্যন্ত
  const viewerRank = reviewingAsHR.value || canHR.value ? Infinity : (myNonHrRank.value ?? null)

  const toArr = (v) => {
    if (!v) return []
    const raw = []
    if (Array.isArray(v)) raw.push(...v)
    else if (typeof v === 'string' && v.trim()) raw.push(v.trim())
    else return []

    const seen = new Set()
    return raw.reduce((acc, item) => {
      const value = typeof item === 'string' ? item.trim() : ''
      if (!value || seen.has(value)) return acc
      seen.add(value)
      acc.push(value)
      return acc
    }, [])
  }

  orderedNonHr.forEach((ln) => {
    const laneKey = ln.key
    if (!laneKey) return

    // 🔹 hierarchy filter: নিজের rank এর নিচের lane গুলো hide
    if (viewerRank != null) {
      const laneRank = ln.rank ?? 999
      if (laneRank > viewerRank) return
    }

    const reviews = byLane[laneKey] || []
    if (!Array.isArray(reviews) || !reviews.length) return

    const entry = reviews[0]
    const strengths = toArr(entry.strengths)
    const gaps = toArr(entry.gaps)
    const suggestions = toArr(entry.suggestions)

    if (!strengths.length && !gaps.length && !suggestions.length) return

    result.push({
      key: laneKey,
      lane: laneKey,
      label: ln.label || entry?.lane_label || laneKey,
      reviewer_id: entry.reviewer_id,
      reviewer_name: entry.reviewer_name,
      strengths,
      gaps,
      suggestions,
      submitted_at: entry.submitted_at ?? null,
    })
  })

  return result
})

const makeOptions = (field) => {
  const set = new Set()

  reviewComments.value.forEach((item) => {
    const arr = Array.isArray(item[field]) ? item[field] : []
    arr.forEach((val) => {
      const v = typeof val === 'string' ? val.trim() : ''
      if (v) set.add(v)
    })
  })

  return Array.from(set)
}

const uniqueHints = (items) => {
  if (!Array.isArray(items)) return []
  const set = new Set()
  items.forEach((item) => {
    const value = typeof item === 'string' ? item.trim() : ''
    if (value) set.add(value)
  })
  return Array.from(set)
}

const strengthOptions = computed(() => uniqueHints(store.strengths))
const gapOptions = computed(() => uniqueHints(store.gaps))
const suggestionOptions = computed(() => makeOptions('suggestions'))

const selectedStrengthHints = ref([])
const selectedGapHints = ref([])
const selectedSuggestionHints = ref([])

const hintRefs = {
  strengths: selectedStrengthHints,
  gaps: selectedGapHints,
  suggestions: selectedSuggestionHints,
}

const textRefs = {
  strengths,
  gaps,
  suggestions,
}

function appendWithNewline(base, addition) {
  const cleaned = (addition || '').trim()
  if (!cleaned) return base
  if (!base?.trim()) return cleaned
  return `${base.trim()}\n${cleaned}`
}

function insertSelectedHints(field) {
  const hints = hintRefs[field]
  const target = textRefs[field]
  if (!hints || !target) return
  const values = (hints.value || []).filter(Boolean)
  if (!values.length) return
  const combined = values.join('\n')
  target.value = appendWithNewline(target.value, combined)
  hints.value = []
}

function toggleHintSelection(field, value) {
  const hints = hintRefs[field]
  if (!hints) return
  const list = Array.isArray(hints.value) ? [...hints.value] : []
  const idx = list.indexOf(value)
  if (idx > -1) list.splice(idx, 1)
  else list.push(value)
  hints.value = list
}

function clearSelectedHints(field) {
  const hints = hintRefs[field]
  if (!hints) return
  hints.value = []
}

/* ---------- Serial for personal rows ---------- */
const serialMap = computed(() => {
  const map = {}
  let i = 1
  const grp = personalGroup.value
  if (grp)
    grp.items.forEach((it) => {
      map[it.id] = i++
    })
  return map
})

/* ---------- Init ---------- */
const employeeId = computed(() => Number(route.params.employeeId))

const hydrateReviewData = (resp) => {
  employee.value = resp.employee
  getTargetMarks.value = resp?.annual_target_avg_marks || null
  getPerformanceMarks.value = resp?.annual_performance_avg_marks || null
  lanes.value = resp.lanes || []
  reviewsByLane.value = resp.reviews_by_lane || {}
  isHR.value = !!(resp?.meta?.is_hr ?? resp?.hr ?? false)

  myLaneKey.value = nonHrLanes.value.find((x) => x.can_current_user_review)?.key || null

  groupsAll.value.forEach((g) =>
    g.items.forEach((it) => {
      if (marks.value[it.id] == null) marks.value[it.id] = 0
    }),
  )

  if (myLaneKey.value) {
    const myExisting = laneFirstReview(myLaneKey.value)
    if (myExisting?.marks) Object.assign(marks.value, myExisting.marks)
  }

  if (canHR.value) {
    otherGroups.value.forEach((g) => {
      g.items.forEach((it) => {
        let v = myHrLaneKey.value ? laneMark(myHrLaneKey.value, it.id) : ''
        if (v === '' || v == null) v = hrMark(it.id)
        if (v !== '' && v != null) marks.value[it.id] = Number(v)
      })
    })
  }
}

watch(
  employeeId,
  async (id, prev) => {
    if (!id || (prev && id === prev)) return
    await store.fetchActiveCycle(id)
    const resp = await store.fetchLanes(store.cycle.id, id)
    hydrateReviewData(resp)
  },
  { immediate: true },
)

/* ---------- Submit ---------- */
async function submit() {
  const reviewerLane = reviewerLaneKey.value
  if (!reviewerLane) {
    alert('Unable to determine reviewer lane.')
    return
  }
  const isHrMode = reviewerLane === myHrLaneKey.value
  await store.submitReview({
    cycle_id: store.cycle.id,
    employee_id: Number(route.params.employeeId),
    reviewer_lane: reviewerLane,
    marks: marks.value,
    strengths: strengths.value,
    gaps: gaps.value,
    suggestions: suggestions.value,
  })
  alert('Submitted')
}

/* ---------- Utils ---------- */
function fmt(n) {
  const v = Number(n ?? 0)
  return isNaN(v) ? '0.00' : v.toFixed(2)
}
function pct(got, max) {
  const g = Number(got ?? 0),
    m = Number(max ?? 0)
  return m > 0 ? Math.round((g / m) * 100) : 0
}

function hasHint(field, value) {
  const target = textRefs[field]
  if (!target) return false

  const text = (target.value || '')
    .split('\n')
    .map((t) => t.trim())
    .filter(Boolean)

  const v = (value || '').trim()
  if (!v) return false

  return text.includes(v)
}

function applyHint(field, value) {
  const target = textRefs[field]
  if (!target) return

  const text = typeof value === 'string' ? value.trim() : ''
  if (!text) return

  // 🔒 ডুপ্লিকেট ব্লক
  if (hasHint(field, text)) return

  target.value = appendWithNewline(target.value, text)
}
</script>

<template>
  <div class="max-w-7xl mx-auto px-4 py-6 space-y-6">
    <!-- Header / Employee context -->
    <header class="border rounded-2xl bg-white/80 backdrop-blur px-4 py-3 shadow-sm">
      <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div class="space-y-1">
          <div class="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1">
            <span class="text-xs font-semibold text-indigo-700">KPI Cycle</span>
            <span class="text-xs text-indigo-900">{{ store.cycle?.title }}</span>
          </div>
          <div class="text-sm text-slate-600">
            <div class="font-medium text-slate-800">
              {{ employee?.name || 'Employee' }}
            </div>
            <div class="flex flex-wrap gap-2 text-xs mt-0.5">
              <span
                v-if="employee?.designation?.title"
                class="inline-flex items-center rounded-full bg-slate-50 px-2 py-0.5 text-slate-600"
              >
                Designation:
                <span class="ml-1 font-medium text-slate-800">{{
                  employee.designation.title
                }}</span>
              </span>
              <span
                v-if="employee?.department?.name"
                class="inline-flex items-center rounded-full bg-slate-50 px-2 py-0.5 text-slate-600"
              >
                Department:
                <span class="ml-1 font-medium text-slate-800">{{ employee.department.name }}</span>
              </span>
              <span
                class="inline-flex items-center rounded-full bg-slate-50 px-2 py-0.5 text-slate-600"
              >
                Reviewing as:
                <span v-if="reviewingAsHR" class="ml-1 inline-flex items-center gap-1">
                  <span class="font-semibold text-emerald-700">HR</span>
                  <span
                    class="text-[10px] rounded bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 text-emerald-700"
                  >
                    HR mode
                  </span>
                </span>
                <span v-else class="ml-1 font-semibold text-slate-800">
                  {{ reviewerLaneKey || 'No lane' }}
                </span>
              </span>
            </div>
          </div>
        </div>

        <div class="flex items-end gap-4">
          <div class="text-right">
            <div class="text-[11px] uppercase tracking-wide text-slate-500">
              Personal group total
            </div>
            <div class="text-lg font-bold text-slate-900">
              {{ personalTotals.got.toFixed(2) }}
              <span class="text-slate-400">/ {{ personalTotals.max.toFixed(2) }}</span>
            </div>
            <div class="text-xs text-slate-500">
              {{ personalTotals.percent.toFixed(2) }}% achieved
            </div>
          </div>

          <button
            v-if="isHR"
            @click="store.submitFinalResult(store.cycle.id, route.params.employeeId)"
            class="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-300 focus:outline-none"
          >
            <span>Finalize & Lock</span>
          </button>
        </div>
      </div>
    </header>

    <!-- active_criteria -->
    <div v-if="employee?.active_criteria">
      <section class="border rounded-2xl bg-white shadow-sm overflow-hidden">
        <div class="flex items-center justify-between border-b bg-slate-50 px-4 py-2">
          <div class="text-sm font-semibold text-slate-800">কার্যসম্পাদন বিষয়</div>
        </div>

        <div v-if="employee?.active_criteria?.length === 0" class="p-4 text-sm font-bold text-slate-500">
          --
        </div>

        <div
          class="p-4 text-sm text-slate-700"
          v-for="active_criteria in employee.active_criteria"
          :key="active_criteria.id"
        >
          <div
            class="print:block richtext print:break-inside-avoid"
            v-html="active_criteria?.description"
          ></div>
        </div>
      </section>
    </div>
    <!-- PERSONAL GROUP -->
    <section
      v-if="store.cycle && personalGroup"
      class="border rounded-2xl bg-white shadow-sm overflow-hidden"
    >
      <div class="flex items-center justify-between border-b bg-slate-50 px-4 py-2">
        <div class="text-sm font-semibold text-slate-800">Personal Evaluation</div>
        <div class="text-xs text-slate-500">Fill only your lane; others appear as read-only.</div>
      </div>

      <div class="overflow-auto">
        <table class="min-w-[980px] w-full text-sm">
          <thead class="bg-slate-50 sticky top-0 z-10">
            <tr class="text-slate-700">
              <th class="px-3 py-2 w-[40px] text-center font-medium">#</th>
              <th class="text-left px-3 py-2 w-[20%] font-medium">মূল্যায়নের বিষয় (Personal)</th>
              <th class="px-3 py-2 text-center font-medium">Max</th>
              <th v-for="ln in nonHrLanes" :key="ln.key" class="px-3 py-2 text-center font-medium">
                <div class="font-medium">{{ ln.label || ln.key }}</div>
                <div class="text-[11px] text-slate-500 flex flex-col items-center">
                  <span>{{ ln.assigned_user_name || '-' }}</span>
                  <span
                    v-if="ln.key === myLaneKey && ln.can_current_user_review"
                    class="mt-0.5 inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700 border border-blue-200"
                  >
                    You can edit
                  </span>
                </div>
              </th>
            </tr>
          </thead>

          <tbody>
            <tr class="bg-slate-100/80 border-t">
              <td :colspan="3 + nonHrLanes.length" class="px-3 py-2 font-medium text-slate-800">
                {{ personalGroup.label || 'Personal' }}
              </td>
            </tr>

            <tr
              v-for="it in personalGroup.items"
              :key="it.id"
              class="border-t hover:bg-slate-50/60"
            >
              <td class="px-3 py-2 text-center text-slate-500">
                {{ serialMap[it.id] }}
              </td>

              <td class="px-3 py-2 align-top">
                <div class="font-medium text-slate-800">
                  {{ it.label }}
                </div>
                <div class="mt-1 flex gap-1 text-[11px] text-slate-500">
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
                    @click="canEditPersonal && quickFill(it.id, it.max, 'threeQuarter')"
                  >
                    ¾
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

              <td class="px-3 py-2 text-center text-slate-700">
                {{ it.max }}
              </td>

              <td v-for="ln in nonHrLanes" :key="ln.key" class="px-3 py-2 text-center">
                <div
                  v-if="ln.key === myLaneKey && ln.can_current_user_review"
                  class="flex items-center justify-center"
                >
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    :max="it.max"
                    v-model.number="marks[it.id]"
                    @change="cap(it.id, it.max)"
                    inputmode="decimal"
                    class="w-24 text-right rounded-lg border px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  />
                </div>

                <div v-else-if="ln.can_view_marks" class="text-slate-700 text-sm">
                  {{ laneMark(ln.key, it.id) }}
                </div>

                <div v-else class="text-slate-300 text-sm">—</div>
              </td>
            </tr>

            <tr class="bg-slate-50 border-t">
              <td></td>
              <td class="px-3 py-2 text-right font-medium text-slate-700">Group Total</td>
              <td class="px-3 py-2 text-center font-semibold text-slate-800">
                {{ personalGroup.items.reduce((a, b) => a + Number(b.max || 0), 0).toFixed(2) }}
              </td>
              <td :colspan="nonHrLanes.length" class="px-3 py-2 text-center text-sm">
                <span class="font-semibold text-slate-900">
                  {{
                    personalGroup.items
                      .reduce((a, b) => {
                        const v = Number(marks[b.id] || 0)
                        return a + Math.min(Math.max(v, 0), Number(b.max || 0))
                      }, 0)
                      .toFixed(2)
                  }}
                </span>
                <span class="text-slate-500">
                  / {{ personalGroup.items.reduce((a, b) => a + Number(b.max || 0), 0).toFixed(2) }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- OTHER GROUPS + RIGHT SIDEBAR -->
    <section v-if="otherGroups.length" class="mt-2">
      <div class="grid gap-4 lg:grid-cols-5">
        <!-- Main (groups tables) -->
        <div class="space-y-4 lg:col-span-3">
          <div
            v-for="(grp, gIdx) in otherGroups"
            :key="gIdx"
            class="overflow-hidden border rounded-2xl bg-white shadow-sm"
          >
            <div class="flex items-center justify-between border-b bg-slate-50 px-4 py-2.5">
              <div class="text-sm font-semibold text-slate-800">
                Group {{ gIdx + 1 }} — {{ safeGroupLabel(grp, gIdx) }}
              </div>
              <div class="flex items-center gap-2 text-[11px] text-slate-500">
                <span>Quick fill:</span>

                <button
                  class="rounded border px-1.5 py-0.5 hover:bg-slate-100 disabled:opacity-40"
                  @click="quickFillGroup(grp, 'half')"
                  :disabled="!canHR"
                >
                  All ½
                </button>
                <button
                  class="rounded border px-1.5 py-0.5 hover:bg-slate-100 disabled:opacity-40"
                  @click="quickFillGroup(grp, 'threeQuarter')"
                  :disabled="!canHR"
                >
                  All ¾
                </button>
                <button
                  class="rounded border px-1.5 py-0.5 hover:bg-slate-100 disabled:opacity-40"
                  @click="quickFillGroup(grp, 'full')"
                  :disabled="!canHR"
                >
                  All Full
                </button>
              </div>
            </div>

            <div class="overflow-auto">
              <table class="w-full text-sm">
                <thead class="sticky top-0 bg-white z-10">
                  <tr class="bg-slate-100 text-slate-700">
                    <th class="px-3 py-2 w-[40px] text-center font-medium">#</th>
                    <th class="text-left px-3 py-2 w-[30%] font-medium">Item</th>
                    <th class="px-3 py-2 text-center w-[40px] font-medium">Max</th>
                    <th class="px-3 py-2 text-center w-[80px] font-medium">HR Score</th>
                  </tr>
                </thead>

                <tbody>
                  <tr
                    v-for="(it, ii) in grp.items"
                    :key="it.id"
                    class="border-t hover:bg-slate-50/60"
                  >
                    <td class="px-3 py-2 text-center text-slate-500">
                      {{ ii + 1 }}
                    </td>

                    <td class="px-3 py-2">
                      <div class="font-medium text-slate-800">{{ it.label }}</div>
                    </td>

                    <td class="px-3 py-2 text-center text-slate-700">
                      {{ it.max }}
                    </td>

                    <td class="px-3 py-2 text-center">
                      <template v-if="canHR">
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          :max="it.max"
                          v-model.number="marks[it.id]"
                          @change="cap(it.id, it.max)"
                          inputmode="decimal"
                          class="w-24 text-right rounded-lg border px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
                        />
                      </template>
                      <template v-else>
                        <p class="text-slate-700 text-sm">
                          {{ hrMark(it.id) || '—' }}
                        </p>
                      </template>
                    </td>
                  </tr>

                  <tr class="bg-slate-50 border-t">
                    <td></td>
                    <td class="px-3 py-2 text-right font-medium text-slate-700">Group Total</td>
                    <td class="px-3 py-2 text-center font-semibold text-slate-800">
                      {{ grp.items.reduce((a, b) => a + Number(b.max || 0), 0).toFixed(2) }}
                    </td>
                    <td class="px-3 py-2 text-center text-sm">
                      {{
                        grp.items
                          .reduce((a, b) => {
                            const v = Number(marks[b.id] || 0)
                            return a + Math.min(Math.max(v, 0), Number(b.max || 0))
                          }, 0)
                          .toFixed(2)
                      }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- Right sidebar (Annual Target Summary + Comments) -->
        <aside class="lg:col-span-2 space-y-4">
          <section v-if="hasTargetSummary && canHR" class="border rounded-2xl bg-white shadow-sm">
            <header
              class="flex flex-wrap items-center justify-between border-b px-4 py-3 text-sm font-semibold text-slate-800"
            >
              <span>Annual Summary</span>
              <div class="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                <span class="rounded-full border bg-slate-50 px-2 py-0.5 text-slate-700">
                  {{ summaryLabel }}
                </span>
                <span
                  v-if="summaryYear"
                  class="rounded-full border bg-slate-50 px-2 py-0.5 text-slate-700"
                >
                  Year {{ summaryYear }}
                </span>
                <span class="rounded-full border bg-slate-50 px-2 py-0.5 text-slate-700">
                  {{ summaryMonths }} month(s)
                </span>
              </div>
            </header>

            <div class="p-4 space-y-4 max-h-[360px] overflow-y-auto">
              <div class="flex flex-wrap gap-2 border-b border-slate-100 pb-3">
                <button
                  v-for="tab in summaryTabs"
                  :key="tab.key"
                  type="button"
                  @click="setSummaryTab(tab.key)"
                  :class="[
                    'px-3 py-1 rounded-full text-xs font-semibold transition',
                    activeSummaryTab === tab.key
                      ? 'bg-slate-900 text-white shadow'
                      : 'border border-slate-200 text-slate-700 bg-white hover:border-slate-400',
                  ]"
                >
                  {{ tab.label }}
                </button>
              </div>

              <div class="space-y-4">
                <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div class="rounded-xl border bg-slate-50 p-3">
                    <div class="flex items-center justify-between">
                      <span class="text-xs font-medium text-slate-600">Incharge</span>
                      <span
                        class="text-[11px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200"
                      >
                        {{
                          pct(
                            summaryData.per_scored_month?.incharge,
                            summaryData.per_scored_month?.max,
                          )
                        }}%
                      </span>
                    </div>
                    <div class="mt-1 text-sm font-semibold text-slate-900">
                      {{ fmt(summaryData.per_scored_month?.incharge) }}
                      <span class="text-xs text-slate-500"
                        >/ {{ fmt(summaryData.per_scored_month?.max) }}</span
                      >
                    </div>
                    <div class="mt-2 h-2 rounded bg-slate-100 overflow-hidden">
                      <div
                        class="h-2 bg-blue-500"
                        :style="{
                          width:
                            pct(
                              summaryData.per_scored_month?.incharge,
                              summaryData.per_scored_month?.max,
                            ) + '%',
                        }"
                      ></div>
                    </div>
                  </div>

                  <div class="rounded-xl border bg-slate-50 p-3">
                    <div class="flex items-center justify-between">
                      <span class="text-xs font-medium text-slate-600">Coordinator</span>
                      <span
                        class="text-[11px] px-1.5 py-0.5 rounded bg-violet-50 text-violet-700 border border-violet-200"
                      >
                        {{
                          pct(
                            summaryData.per_scored_month?.coordinator,
                            summaryData.per_scored_month?.max,
                          )
                        }}%
                      </span>
                    </div>
                    <div class="mt-1 text-sm font-semibold text-slate-900">
                      {{ fmt(summaryData.per_scored_month?.coordinator) }}
                      <span class="text-xs text-slate-500"
                        >/ {{ fmt(summaryData.per_scored_month?.max) }}</span
                      >
                    </div>
                    <div class="mt-2 h-2 rounded bg-slate-100 overflow-hidden">
                      <div
                        class="h-2 bg-violet-500"
                        :style="{
                          width:
                            pct(
                              summaryData.per_scored_month?.coordinator,
                              summaryData.per_scored_month?.max,
                            ) + '%',
                        }"
                      ></div>
                    </div>
                  </div>

                  <div class="rounded-xl border bg-slate-50 p-3 sm:col-span-2">
                    <div class="flex items-center justify-between">
                      <span class="text-xs font-medium text-slate-600">Final</span>
                      <span
                        class="text-[11px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200"
                      >
                        {{
                          pct(
                            summaryData.per_form_yearly?.final,
                            summaryData.per_scored_month?.max,
                          )
                        }}%
                      </span>
                    </div>
                    <div class="mt-1 text-sm font-semibold text-slate-900">
                      {{ fmt(summaryData.per_form_yearly?.final) }}
                      <span class="text-xs text-slate-500"
                        >/ {{ fmt(summaryData.per_scored_month?.max) }}</span
                      >
                    </div>
                    <div class="mt-2 h-2 rounded bg-slate-100 overflow-hidden">
                      <div
                        class="h-2 bg-emerald-500"
                        :style="{
                          width:
                            pct(
                              summaryData.per_form_yearly?.final,
                              summaryData.per_scored_month?.max,
                            ) + '%',
                        }"
                      ></div>
                    </div>
                  </div>
                </div>

                <div class="border-t pt-2 text-xs">
                  <button
                    class="text-xs px-3 py-1.5 rounded-md border hover:bg-slate-50"
                    @click="showSummaryDetails = !showSummaryDetails"
                  >
                    {{ showSummaryDetails ? 'Hide details' : 'Show ' + summaryLabel + ' details' }}
                  </button>

                  <div
                    v-if="showSummaryDetails"
                    class="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs space-y-2"
                  >
                    <div class="grid grid-cols-2 gap-2">
                      <div class="text-slate-500">Year</div>
                      <div class="font-medium text-slate-800">{{ summaryYear || '-' }}</div>
                      <div class="text-slate-500">Months counted</div>
                      <div class="font-medium text-slate-800">{{ summaryMonths }}</div>
                      <div class="text-slate-500">Group</div>
                      <div class="font-medium text-slate-800">{{ summaryGroupLabel }}</div>
                      <div class="text-slate-500">Max (denominator)</div>
                      <div class="font-medium text-slate-800">
                        {{ fmt(summaryData.per_scored_month?.max) }}
                      </div>
                      <div class="text-slate-500">Incharge avg</div>
                      <div class="font-medium text-slate-800">
                        {{ fmt(summaryData.per_form_yearly?.incharge) }}
                      </div>
                      <div class="text-slate-500">Coordinator avg</div>
                      <div class="font-medium text-slate-800">
                        {{ fmt(summaryData.per_form_yearly?.coordinator) }}
                      </div>
                      <div class="text-slate-500">Final avg</div>
                      <div class="font-medium text-slate-800">
                        {{ fmt(summaryData.per_form_yearly?.final) }}
                      </div>
                      <div class="text-slate-500">Percent (simple)</div>
                      <div class="font-medium text-slate-800">
                        {{ fmt(summaryData.percent_simple) }}%
                      </div>
                      <div class="text-slate-500">Percent (weighted)</div>
                      <div class="font-medium text-slate-800">
                        {{ fmt(summaryData.percent_weighted) }}%
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <!-- Review comments -->
          <section v-if="reviewComments.length" class="border rounded-2xl bg-white shadow-sm">
            <header
              class="flex items-center justify-between border-b px-4 py-3 text-sm font-semibold text-slate-800"
            >
              <span>Review Comments</span>
              <span class="text-[11px] text-slate-500"> {{ reviewComments.length }} lane(s) </span>
            </header>

            <div class="p-4 space-y-3">
              <div class="max-h-96 overflow-auto border rounded-xl">
                <table class="min-w-full text-xs text-left">
                  <thead class="text-[11px] text-slate-600 uppercase tracking-wide bg-slate-50">
                    <tr>
                      <th class="px-2 py-2 w-[90px]">Lane</th>
                      <!-- <th class="px-2 py-2 w-[120px]">Reviewer</th> -->
                      <th class="px-2 py-2">Strengths</th>
                      <th class="px-2 py-2">Gaps</th>
                      <th class="px-2 py-2">Suggestions</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="item in reviewComments"
                      :key="item.key"
                      class="border-t hover:bg-slate-50/60 align-top"
                    >
                      <!-- Lane -->
                      <td class="px-2 py-2">
                        <div class="font-semibold text-slate-700">
                          {{ item.label }}
                        </div>
                        <div v-if="item.submitted_at" class="mt-0.5 text-[11px] text-slate-400">
                          {{ new Date(item.submitted_at).toLocaleDateString() }}
                        </div>
                      </td>

                      <!-- Reviewer -->
                      <!-- <td class="px-2 py-2">
                      <div class="font-medium text-slate-700">
                        {{ item.reviewer_name || '-' }}
                      </div>
                    </td> -->

                      <!-- Strengths -->
                      <td class="px-2 py-2">
                        <div
                          v-if="item.strengths && item.strengths.length"
                          class="flex flex-wrap gap-1"
                        >
                          <span
                            v-for="(s, i) in item.strengths"
                            :key="'s-' + i"
                            class="inline-flex items-center rounded-full bg-emerald-50 border border-emerald-100 px-2 py-0.5 text-[11px] text-emerald-700"
                          >
                            {{ s }}
                          </span>
                        </div>
                        <span v-else class="text-slate-400">—</span>
                      </td>

                      <!-- Gaps -->
                      <td class="px-2 py-2">
                        <div v-if="item.gaps && item.gaps.length" class="flex flex-wrap gap-1">
                          <span
                            v-for="(g, i) in item.gaps"
                            :key="'g-' + i"
                            class="inline-flex items-center rounded-full bg-amber-50 border border-amber-100 px-2 py-0.5 text-[11px] text-amber-800"
                          >
                            {{ g }}
                          </span>
                        </div>
                        <span v-else class="text-slate-400">—</span>
                      </td>

                      <!-- Suggestions -->
                      <td class="px-2 py-2">
                        <div
                          v-if="item.suggestions && item.suggestions.length"
                          class="flex flex-wrap gap-1"
                        >
                          <span
                            v-for="(sug, i) in item.suggestions"
                            :key="'su-' + i"
                            class="inline-flex items-center rounded-full bg-sky-50 border border-sky-100 px-2 py-0.5 text-[11px] text-sky-800"
                          >
                            {{ sug }}
                          </span>
                        </div>
                        <span v-else class="text-slate-400">—</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </section>

    <!-- Notes (enable if editing in either mode) -->
    <section
      v-if="canEditPersonal || canHR"
      class="rounded-2xl bg-white border shadow-sm px-4 py-4 space-y-4"
    >
      <header class="flex items-center justify-between mb-1">
        <div>
          <h2 class="text-sm font-semibold text-slate-800">Overall Review Notes</h2>
          <p class="text-[11px] text-slate-500">
            Use saved hints or write your own detailed comments.
          </p>
        </div>
        <div class="hidden md:flex items-center gap-2 text-[11px] text-slate-500">
          <span
            class="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 border border-emerald-100"
          >
            <span class="text-xs">●</span> Strengths
          </span>
          <span
            class="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 border border-amber-100"
          >
            <span class="text-xs">●</span> Gaps
          </span>
          <span
            class="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2 py-0.5 border border-sky-100"
          >
            <span class="text-xs">●</span> Suggestions
          </span>
        </div>
      </header>

      <div class="grid gap-4 md:grid-cols-3">
        <!-- Strengths -->
        <div class="space-y-3">
          <header class="flex items-center justify-between text-xs font-semibold text-slate-600">
            <div class="flex items-center gap-1">
              <span class="text-emerald-500 text-base leading-none">★</span>
              <span>Strengths</span>
            </div>
            <span v-if="strengthOptions.length" class="text-[11px] text-emerald-600">
              {{ strengthOptions.length }} saved hint(s)
            </span>
          </header>

          <!-- Hint chips -->
          <div
            v-if="strengthOptions.length"
            class="rounded-2xl border border-slate-200 bg-slate-50/70 p-3 max-h-32 overflow-y-auto"
          >
            <div class="flex flex-wrap gap-1.5">
              <button
                v-for="opt in strengthOptions"
                :key="opt"
                type="button"
                @click="applyHint('strengths', opt)"
                :disabled="hasHint('strengths', opt)"
                class="rounded-full border px-2.5 py-1 text-[11px] font-medium transition border-slate-200 bg-white text-slate-700 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {{ opt }}
              </button>
            </div>
          </div>
          <p v-else class="text-[11px] text-slate-400">
            No historical strengths yet. Write your own notes below.
          </p>

          <!-- Textarea -->
          <div class="space-y-1">
            <label class="text-[11px] font-medium text-slate-500"> Key Strength(s) </label>
            <textarea
              v-model="strengths"
              placeholder="e.g. Strong ownership, proactive problem solving…"
              class="w-full rounded-xl border px-3 py-2 text-sm min-h-28 focus:outline-none focus:ring-2 focus:ring-emerald-200"
            ></textarea>
          </div>
        </div>

        <!-- Gaps -->
        <div class="space-y-3">
          <header class="flex items-center justify-between text-xs font-semibold text-slate-600">
            <div class="flex items-center gap-1">
              <span class="text-amber-500 text-base leading-none">!</span>
              <span>Gaps</span>
            </div>
            <span v-if="gapOptions.length" class="text-[11px] text-amber-600">
              {{ gapOptions.length }} saved hint(s)
            </span>
          </header>

          <!-- Hint chips -->
          <div
            v-if="gapOptions.length"
            class="rounded-2xl border border-slate-200 bg-slate-50/70 p-3 max-h-32 overflow-y-auto"
          >
            <div class="flex flex-wrap gap-1.5">
              <button
                v-for="opt in gapOptions"
                :key="opt"
                type="button"
                @click="applyHint('gaps', opt)"
                :disabled="hasHint('gaps', opt)"
                class="rounded-full border px-2.5 py-1 text-[11px] font-medium transition border-slate-200 bg-white text-slate-700 hover:border-amber-300 hover:bg-amber-50 hover:text-amber-800 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {{ opt }}
              </button>
            </div>
          </div>
          <p v-else class="text-[11px] text-slate-400">No historical gaps yet.</p>

          <!-- Textarea -->
          <div class="space-y-1">
            <label class="text-[11px] font-medium text-slate-500">GAP(s)</label>
            <textarea
              v-model="gaps"
              placeholder="e.g. Needs improvement in documentation, communication…"
              class="w-full rounded-xl border px-3 py-2 text-sm min-h-28 focus:outline-none focus:ring-2 focus:ring-amber-200"
            ></textarea>
          </div>
        </div>

        <!-- Suggestions -->
        <div class="space-y-3">
          <header class="flex items-center justify-between text-xs font-semibold text-slate-600">
            <div class="flex items-center gap-1">
              <span class="text-sky-500 text-base leading-none">✱</span>
              <span>Suggestions / Training</span>
            </div>
            <span v-if="suggestionOptions.length" class="text-[11px] text-sky-600">
              {{ suggestionOptions.length }} common suggestion(s)
            </span>
          </header>

          <!-- Suggestion hint chips (optional but nice) -->
          <div
            v-if="suggestionOptions.length"
            class="rounded-2xl border border-slate-200 bg-slate-50/70 p-3 max-h-32 overflow-y-auto"
          >
            <div class="flex flex-wrap gap-1.5">
              <button
                v-for="opt in suggestionOptions"
                :key="opt"
                type="button"
                @click="applyHint('suggestions', opt)"
                :disabled="hasHint('suggestions', opt)"
                class="rounded-full border px-2.5 py-1 text-[11px] font-medium transition border-slate-200 bg-white text-slate-700 hover:border-sky-300 hover:bg-sky-50 hover:text-sky-800 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {{ opt }}
              </button>
            </div>
          </div>

          <!-- Textarea -->
          <div class="space-y-1">
            <label class="text-[11px] font-medium text-slate-500">
              Suggestions / Development plan
            </label>
            <textarea
              v-model="suggestions"
              placeholder="Specific actions, training plans, timeline and expectations…"
              class="w-full rounded-xl border px-3 py-2 text-sm min-h-28 focus:outline-none focus:ring-2 focus:ring-sky-200"
            ></textarea>
          </div>
        </div>
      </div>
    </section>

    <!-- Sticky action -->
    <div
      class="mt-2 flex flex-col gap-3 border-t pt-3 md:flex-row md:items-center md:justify-between"
    >
      <div class="text-sm text-slate-600">
        My (Personal) Total:
        <b class="text-slate-900">{{ personalTotals.got.toFixed(2) }}</b>
        <span class="text-slate-400">/ {{ personalTotals.max.toFixed(2) }}</span>
      </div>
      <button
        @click="submit"
        :disabled="!(canHR || canEditPersonal)"
        class="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white shadow hover:bg-emerald-700 disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-emerald-300"
      >
        Submit
      </button>
    </div>
  </div>
</template>
