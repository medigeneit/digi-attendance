<script setup>
import { useAuthStore } from '@/stores/auth'
import { useKpiStore } from '@/stores/kpi'
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import KpiGroupTable from '@/components/kpi/KpiGroupTable.vue'
import apiClient from '@/axios'

const route = useRoute()
const store = useKpiStore()
const auth = useAuthStore()

const props = defineProps({
  mode: { type: String, default: 'full' },
  allowedLanes: { type: Array, default: () => ['supv_director', 'da'] },
  groupFilter: { type: String, default: null },
  initialLane: { type: String, default: '' },
  employeeId: { type: [Number, String], default: null },
  employeeName: { type: String, default: '' },
  year: { type: Number, default: null },
})

const emit = defineEmits(['saved'])

const compactMode = computed(() => props.mode === 'compact')

/* ---------- Local state ---------- */
const marks = ref({})
const employee = ref({})
const strengths = ref(''),
  gaps = ref(''),
  suggestions = ref('')
const getTargetMarks = ref(null)
const getPerformanceMarks = ref(null)
const showSummaryDetails = ref(false)

/* ---------- Compact mode (unchanged) ---------- */
const compactEmployeeId = computed(() => {
  const value = Number(props.employeeId)
  return Number.isFinite(value) && value > 0 ? value : null
})
const compactYear = computed(() => {
  const value = Number(props.year)
  return Number.isFinite(value) && value > 0 ? value : new Date().getFullYear()
})
const compactGroup = computed(() => (props.groupFilter ? String(props.groupFilter) : 'personal'))
const compactLanes = computed(() => {
  const list = Array.isArray(props.allowedLanes) ? props.allowedLanes.filter(Boolean) : []
  return list.length ? list : ['supv_director', 'da']
})
const compactLane = ref(props.initialLane || compactLanes.value[0] || '')
const compactItems = ref([])
const compactMarks = ref({})
const compactComments = ref({})
const compactLoading = ref(false)
const compactSaving = ref(false)
const compactError = ref('')
const compactEmployeeLabel = computed(() => props.employeeName || employee.value?.name || 'Employee')

const compactLaneLabels = {
  supv_director: 'Supv. Director',
  da: 'DA',
}
const compactLaneLabel = (key) => compactLaneLabels[key] || key

const compactGroupLabel = computed(() =>
  compactGroup.value ? compactGroup.value.replace(/_/g, ' ') : 'personal',
)

function normalizeCompactItems(rawItems) {
  if (!Array.isArray(rawItems)) return []
  return rawItems.map((item, index) => {
    const id = item?.id ?? item?.item_id ?? item?.kpi_item_id ?? item?.kpi_id ?? index
    const title = item?.title ?? item?.name ?? item?.label ?? `Item ${index + 1}`
    const weight =
      item?.weight ?? item?.weightage ?? item?.weight_value ?? item?.score_weight ?? null
    const maxScore = item?.max_score ?? item?.max ?? item?.max_marks ?? item?.score_max ?? 0
    const score = item?.score ?? item?.mark ?? item?.obtained ?? item?.value ?? null
    const comment = item?.comment ?? item?.note ?? item?.remark ?? ''
    return { id, title, weight, maxScore, score, comment }
  })
}

function buildScoreOptions(maxScore) {
  const max = Number(maxScore)
  if (!Number.isFinite(max) || max <= 0) return [0]
  const step = Number.isInteger(max) ? 1 : 0.5
  const options = []
  for (let value = 0; value <= max + 0.0001; value += step) {
    const rounded = step === 1 ? Math.round(value) : Number(value.toFixed(1))
    options.push(rounded)
  }
  if (options[options.length - 1] !== max) options.push(max)
  return options
}

async function fetchCompactForm() {
  if (!compactMode.value) return
  if (!compactEmployeeId.value || !compactYear.value || !compactLane.value) return
  compactLoading.value = true
  compactError.value = ''
  try {
    const { data } = await apiClient.get(
      `/kpi/yearly/${compactYear.value}/employees/${compactEmployeeId.value}/marking-form`,
      {
        params: {
          lane: compactLane.value,
          group: compactGroup.value,
        },
      },
    )

    const payload = data?.data ?? data ?? {}
    const rawItems = payload?.items || payload?.form?.items || payload?.group?.items || payload?.data || []
    const normalized = normalizeCompactItems(rawItems)

    const nextMarks = {}
    const nextComments = {}

    normalized.forEach((item) => {
      const scoreFromMap = payload?.marks?.[item.id]
      const commentFromMap = payload?.comments?.[item.id]
      const score = item.score ?? scoreFromMap ?? 0
      const comment = item.comment ?? commentFromMap ?? ''
      nextMarks[item.id] = score === '' || score == null ? 0 : Number(score)
      nextComments[item.id] = comment ?? ''
    })

    compactItems.value = normalized
    compactMarks.value = nextMarks
    compactComments.value = nextComments
  } catch (err) {
    compactError.value = err?.response?.data?.message || 'Failed to load KPI marking form.'
    compactItems.value = []
  } finally {
    compactLoading.value = false
  }
}

async function saveCompact(submit) {
  if (!compactEmployeeId.value || !compactYear.value || !compactLane.value) return
  compactSaving.value = true
  compactError.value = ''
  try {
    const itemsPayload = compactItems.value.map((item) => ({
      item_id: item.id,
      score: Number(compactMarks.value[item.id] ?? 0),
      comment: compactComments.value[item.id] ?? '',
    }))

    const payload = {
      lane: compactLane.value,
      group: compactGroup.value,
      submit: Boolean(submit),
      items: itemsPayload,
      marks: { ...compactMarks.value },
      comments: { ...compactComments.value },
    }

    await apiClient.post(
      `/kpi/yearly/${compactYear.value}/employees/${compactEmployeeId.value}/marking-form`,
      payload,
    )
    emit('saved')
  } catch (err) {
    compactError.value = err?.response?.data?.message || 'Failed to save KPI marking form.'
  } finally {
    compactSaving.value = false
  }
}

watch(
  () => props.initialLane,
  (value) => {
    if (!value) return
    compactLane.value = value
  },
)

watch(
  compactLanes,
  (lanes) => {
    if (!lanes.length) return
    if (!lanes.includes(compactLane.value)) compactLane.value = lanes[0]
  },
  { immediate: true },
)

watch(
  [compactMode, compactLane, compactEmployeeId, compactYear, compactGroup],
  ([isCompact, lane, empId, year, group]) => {
    if (!isCompact || !lane || !empId || !year || !group) return
    fetchCompactForm()
  },
  { immediate: true },
)

/**
 * lanes: [{ key,label,rank,assigned_user_id,can_current_user_review,can_view_marks,is_hr_lane? }, ...]
 * reviewsByLane: { laneKey: [ { marks, obtained_total, submitted_at } ] }
 */
const lanes = ref([])
const reviewsByLane = ref({})
const isHR = ref(false)

/* ---------- Mode & groups (cycle-driven) ---------- */
const groupsAll = computed(() => store.cycle?.groups_json || [])

const mode = computed(() => {
  const cycle = store.cycle || {}
  const groups = Array.isArray(cycle?.groups_json) ? cycle.groups_json : []
  const isStaff = cycle?.slug === 'support_staff' && groups.length === 1 && groups[0]?.id === 'personal'
  return isStaff ? 'staff' : 'executive'
})

const staffMode = computed(() => mode.value === 'staff')

const isPersonalGroup = (g) => {
  if (!g) return false
  const normalizedId = String(g.id || '').toLowerCase()
  const normalizedLabel = String(g.label || '').toLowerCase()
  if (normalizedId === 'personal' || normalizedId === 'personal_evaluation' || normalizedId === 'personal_eval') {
    return true
  }
  return normalizedLabel.includes('personal')
}

const personalGroup = computed(() => groupsAll.value.find(isPersonalGroup) || null)
const otherGroups = computed(() => (staffMode.value ? [] : groupsAll.value.filter((g) => !isPersonalGroup(g))))

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
const personalLanes = computed(() => (staffMode.value ? sortedLanes.value : nonHrLanes.value))

const myEditablePersonalLaneKey = computed(
  () => personalLanes.value.find((ln) => ln.can_current_user_review)?.key || null,
)
const myPersonalLane = computed(
  () => personalLanes.value.find((ln) => ln.key === myEditablePersonalLaneKey.value) || null,
)
const myPersonalLaneRank = computed(() => myPersonalLane.value?.rank ?? null)

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
const canEditPersonal = computed(() => !!myEditablePersonalLaneKey.value)

/**
 * ✅ Dual-role detect:
 * - executive mode
 * - canHR true
 * - personal lane আছে (incharge)
 * - hr lane আছে
 * - দুইটা lane key আলাদা
 * - otherGroups আছে
 */
const hasDualRolePersonalAndHR = computed(() => {
  if (staffMode.value) return false
  if (!canHR.value) return false
  const p = myEditablePersonalLaneKey.value
  const h = myHrLaneKey.value
  if (!p || !h) return false
  if (p === h) return false
  return otherGroups.value.length > 0
})

/**
 * UI label (আগের মতই রাখলাম)
 * reviewerLaneKey শুধু display/legacy fallback এ আছে; submit এখন split করে।
 */
const reviewerLaneKey = computed(() => {
  if (staffMode.value) return myEditablePersonalLaneKey.value
  if (canHR.value && myHrLaneKey.value) return myHrLaneKey.value
  return myEditablePersonalLaneKey.value
})

const reviewingAsHR = computed(() =>
  Boolean(reviewerLaneKey.value && myHrLaneKey.value && reviewerLaneKey.value === myHrLaneKey.value),
)

/* ---------- Existing review readers ---------- */
function laneLatestReview(laneKey) {
  const raw = reviewsByLane.value?.[laneKey]
  if (!raw) return null
  const list = Array.isArray(raw) ? raw : [raw]
  return list.reduce((latest, entry) => {
    if (!entry) return latest
    if (!latest) return entry
    const a = new Date(entry.submitted_at || 0).getTime()
    const b = new Date(latest.submitted_at || 0).getTime()
    return a > b ? entry : latest
  }, null)
}

function laneMark(laneKey, itemId) {
  const r = laneLatestReview(laneKey)
  return r?.marks?.[itemId] ?? ''
}

/** HR mark: prefer my assigned HR lane; fallback to latest among hr* lanes */
function hrMark(itemId) {
  if (myHrLaneKey.value) {
    const r = laneLatestReview(myHrLaneKey.value)
    const v = r?.marks?.[itemId]
    if (v != null) return v
  }
  let chosen = null
  for (const ln of hrLanes.value) {
    const r = laneLatestReview(ln.key)
    if (!r || r?.marks?.[itemId] == null) continue
    if (!chosen) {
      chosen = r
      continue
    }
    const a = new Date(r.submitted_at || 0).getTime()
    const b = new Date(chosen.submitted_at || 0).getTime()
    if (a > b) chosen = r
  }
  return chosen?.marks?.[itemId] ?? ''
}

/* ---------- Marks safety ---------- */
function setMark(id, value) {
  marks.value[id] = value === '' ? '' : Number(value)
}

function cap(id, max) {
  const v = Number(marks.value[id] ?? 0)
  if (v < 0) marks.value[id] = 0
  if (v > Number(max)) marks.value[id] = Number(max)
}
function quickFill(id, max, t) {
  if (t === 'zero') marks.value[id] = 0
  else if (t === 'quarter') marks.value[id] = Number(max) / 4
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
  if (grp && Array.isArray(grp.items)) {
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
const hasTargetSummary = computed(() => !!getTargetMarks.value && typeof getTargetMarks.value === 'object')

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
const performanceMonths = computed(() => getPerformanceMarks.value?.months_total_form ?? targetMonths.value)

const summaryData = computed(() => (activeSummaryTab.value === 'target' ? targetAvg.value : performanceAvg.value))
const summaryFinal = computed(() => Number(summaryData.value?.per_form_yearly?.final || 0))
const summaryMax = computed(() => Number(summaryData.value?.per_scored_month?.max || 0))

const summaryPercent = computed(() => {
  if (!summaryMax.value) return 0
  return Math.round((summaryFinal.value / summaryMax.value) * 100)
})

const canAutoFillFromSummary = computed(() => canHR.value && !staffMode.value)
const summaryYear = computed(() => (activeSummaryTab.value === 'target' ? targetYear.value : performanceYear.value))
const summaryMonths = computed(() => (activeSummaryTab.value === 'target' ? targetMonths.value : performanceMonths.value))

const summaryLabel = computed(() => summaryTabs.find((tab) => tab.key === activeSummaryTab.value)?.label || 'Annual Target')

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

const normalizeLabel = (value) => String(value || '').toLowerCase()

const matchGroupForTab = (group, tabKey) => {
  if (!group) return false
  if (tabKey === 'target') {
    if (group.id === 'monthly_target') return true
    return normalizeLabel(group.label).includes('monthly target')
  }
  if (tabKey === 'performance') {
    if (group.id === 'execution') return true
    const label = normalizeLabel(group.label)
    return label.includes('execution') || String(group.label || '').includes('কার্যসম্পাদন')
  }
  return false
}

const mappedGroupForTab = (tabKey) => {
  return otherGroups.value.find((g) => matchGroupForTab(g, tabKey)) || null
}

const applySummaryToMappedGroup = (tabKey, { overwrite } = { overwrite: false }) => {
  if (!canAutoFillFromSummary.value) return
  const group = mappedGroupForTab(tabKey)
  if (!group || !Array.isArray(group.items) || group.items.length === 0) return

  const items = group.items
  const allEmpty = items.every((it) => Number(marks.value[it.id] || 0) === 0)
  if (!overwrite && !allEmpty) return

  const finalScore = summaryFinal.value
  const groupMax = items.reduce((acc, item) => acc + Number(item.max || 0), 0)
  if (!groupMax) return

  if (items.length === 1) {
    const item = items[0]
    marks.value[item.id] = Math.min(finalScore, Number(item.max || 0))
    cap(item.id, item.max)
    return
  }

  items.forEach((item) => {
    const portion = (Number(item.max || 0) / groupMax) * finalScore
    const rounded = Number(portion.toFixed(1))
    marks.value[item.id] = rounded
    cap(item.id, item.max)
  })
}

const autoFillLabel = computed(() => {
  const label = activeSummaryTab.value === 'target' ? 'Annual Target' : 'Annual Performance'
  return `Auto: ${label} (${summaryPercent.value}%)`
})

watch(
  activeSummaryTab,
  (tabKey) => {
    applySummaryToMappedGroup(tabKey, { overwrite: false })
  },
  { immediate: true },
)

/* ---------- Review comments (unchanged) ---------- */
const reviewComments = computed(() => {
  const orderedLanes = staffMode.value ? sortedLanes.value : nonHrLanes.value
  const result = []

  const viewerRank =
    reviewingAsHR.value || canHR.value ? Infinity : myPersonalLaneRank.value ?? null

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

  orderedLanes.forEach((ln) => {
    const laneKey = ln.key
    if (!laneKey) return

    if (viewerRank != null) {
      const laneRank = ln.rank ?? 999
      if (laneRank > viewerRank) return
    }

    const entry = laneLatestReview(laneKey)
    if (!entry) return

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

const reviewCommentModalOpen = ref(false)
const reviewCommentModalItem = ref(null)

function openReviewCommentModal(item) {
  reviewCommentModalItem.value = item
  reviewCommentModalOpen.value = true
}

function closeReviewCommentModal() {
  reviewCommentModalOpen.value = false
  reviewCommentModalItem.value = null
}

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
  if (grp && Array.isArray(grp.items)) {
    grp.items.forEach((it) => {
      map[it.id] = i++
    })
  }
  return map
})

/* ---------- Helpers: pick marks only for group items ---------- */
function groupItemIds(group) {
  const items = Array.isArray(group?.items) ? group.items : []
  return items.map((it) => it.id).filter((id) => id != null)
}

function pickMarksByItemIds(ids) {
  const out = {}
  ;(Array.isArray(ids) ? ids : []).forEach((id) => {
    out[id] = Number(marks.value?.[id] ?? 0)
  })
  return out
}

function pickMarksFromGroup(group) {
  return pickMarksByItemIds(groupItemIds(group))
}

function pickMarksFromGroups(groups) {
  const ids = []
  ;(Array.isArray(groups) ? groups : []).forEach((g) => {
    ids.push(...groupItemIds(g))
  })
  // unique
  const uniq = Array.from(new Set(ids))
  return pickMarksByItemIds(uniq)
}

function applyLaneMarksToItemIds(laneKey, ids) {
  if (!laneKey || !ids?.length) return false
  const r = laneLatestReview(laneKey)
  const laneMarks = r?.marks
  if (!laneMarks) return false

  let applied = false
  ids.forEach((id) => {
    const v = laneMarks?.[id]
    if (v !== '' && v != null) {
      marks.value[id] = Number(v)
      applied = true
    }
  })
  return applied
}

/* ---------- Init / Hydrate ---------- */
const employeeId = computed(() => Number(route.params.employeeId))

const hydrateReviewData = (resp) => {
  employee.value = resp.employee
  getTargetMarks.value = resp?.annual_target_avg_marks || null
  getPerformanceMarks.value = resp?.annual_performance_avg_marks || null
  lanes.value = resp.lanes || []
  reviewsByLane.value = resp.reviews_by_lane || {}
  isHR.value = !!(resp?.meta?.is_hr ?? resp?.hr ?? false)

  // reset all marks = 0 for all items
  marks.value = {}
  const allGroups = Array.isArray(groupsAll.value) ? groupsAll.value : []
  allGroups.forEach((g) => {
    const items = Array.isArray(g?.items) ? g.items : []
    items.forEach((it) => {
      marks.value[it.id] = 0
    })
  })

  // ✅ PERSONAL: prefer personal lane (incharge). If not found, legacy fallback: HR lane (older bug data)
  const personalIds = groupItemIds(personalGroup.value)
  const personalLane = myEditablePersonalLaneKey.value
  const hrLane = myHrLaneKey.value

  const appliedPersonal = applyLaneMarksToItemIds(personalLane, personalIds)
  if (!appliedPersonal && hrLane) {
    // legacy fallback (আগে ভুল করে hr lane-এ personal save হয়ে থাকলে)
    applyLaneMarksToItemIds(hrLane, personalIds)
  }

  // ✅ OTHER GROUPS: fill from HR lane (or latest hr*)
  if (canHR.value && otherGroups.value.length) {
    otherGroups.value.forEach((g) => {
      const ids = groupItemIds(g)
      ids.forEach((id) => {
        let v = hrLane ? laneMark(hrLane, id) : ''
        if (v === '' || v == null) v = hrMark(id)
        if (v !== '' && v != null) marks.value[id] = Number(v)
      })
    })
  }
}

const loadReviewData = async (id) => {
  if (!id) return
  await store.fetchActiveCycle(id)
  const resp = await store.fetchLanes(store.cycle.id, id)
  hydrateReviewData(resp)
}

const refreshReviewData = async () => {
  if (!employeeId.value || !store.cycle?.id) return
  const resp = await store.fetchLanes(store.cycle.id, employeeId.value)
  hydrateReviewData(resp)
}

watch(
  employeeId,
  async (id, prev) => {
    if (!id || (prev && id === prev)) return
    await loadReviewData(id)
  },
  { immediate: true },
)

/* ---------- Submit (✅ UPDATED: split submit for incharge+hr dual role) ---------- */
async function submit() {
  const empId = Number(route.params.employeeId)
  const cycleId = store.cycle?.id

  if (!cycleId || !empId) {
    alert('Invalid cycle/employee.')
    return
  }

  const personalLane = myEditablePersonalLaneKey.value
  const hrLane = myHrLaneKey.value

  // fallback single-lane mode
  const singleLane = reviewerLaneKey.value

  try {
    // ✅ Dual submit: Personal -> incharge lane, Others -> hr lane
    if (hasDualRolePersonalAndHR.value && personalLane && hrLane) {
      // 1) personal only -> personal lane
      await store.submitReview({
        cycle_id: cycleId,
        employee_id: empId,
        reviewer_lane: personalLane,
        marks: pickMarksFromGroup(personalGroup.value),
        // notes avoid duplicate: keep empty here (you can change if you want incharge notes)
        strengths: '',
        gaps: '',
        suggestions: '',
      })

      // 2) other groups -> hr lane (notes here)
      await store.submitReview({
        cycle_id: cycleId,
        employee_id: empId,
        reviewer_lane: hrLane,
        marks: pickMarksFromGroups(otherGroups.value),
        strengths: strengths.value,
        gaps: gaps.value,
        suggestions: suggestions.value,
      })

      await refreshReviewData()
      alert('Submitted')
      return
    }

    // ✅ Normal submit (single lane as before)
    if (!singleLane) {
      alert('Unable to determine reviewer lane.')
      return
    }

    await store.submitReview({
      cycle_id: cycleId,
      employee_id: empId,
      reviewer_lane: singleLane,
      marks: marks.value,
      strengths: strengths.value,
      gaps: gaps.value,
      suggestions: suggestions.value,
    })

    await refreshReviewData()
    alert('Submitted')
  } catch (e) {
    const msg = e?.response?.data?.message || e?.message || 'Failed to submit.'
    alert(msg)
  }
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

  if (hasHint(field, text)) return
  target.value = appendWithNewline(target.value, text)
}
</script>


<template>
  <div v-if="compactMode" class="space-y-4">
    <div class="flex items-start justify-between gap-3">
      <div>
        <div class="text-sm font-semibold text-slate-900">{{ compactEmployeeLabel }}</div>
        <div class="text-xs text-slate-500">
          Year {{ compactYear }} / Group {{ compactGroupLabel }}
        </div>
      </div>
      <div class="text-xs text-slate-400" v-if="compactLane">
        Lane: {{ compactLaneLabel(compactLane) }}
      </div>
    </div>

    <div class="flex flex-wrap items-center gap-2">
      <button
        v-for="lane in compactLanes"
        :key="lane"
        type="button"
        class="rounded-full border px-3 py-1 text-xs font-semibold transition"
        :class="
          lane === compactLane
            ? 'bg-slate-900 text-white border-slate-900'
            : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
        "
        @click="compactLane = lane"
      >
        {{ compactLaneLabel(lane) }}
      </button>
    </div>

    <div
      v-if="compactLoading"
      class="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600"
    >
      Loading KPI items...
    </div>
    <div
      v-else-if="compactError"
      class="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700"
    >
      {{ compactError }}
    </div>
    <div v-else class="space-y-3">
      <div
        v-if="!compactItems.length"
        class="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600"
      >
        No KPI items found for this lane.
      </div>
      <div v-else class="space-y-3">
        <div
          v-for="item in compactItems"
          :key="item.id"
          class="rounded-xl border border-slate-200 bg-white p-3"
        >
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <div class="text-sm font-semibold text-slate-900 truncate" :title="item.title">
                {{ item.title }}
              </div>
              <div class="mt-0.5 text-[11px] text-slate-500">
                <span v-if="item.weight != null">Weight: {{ item.weight }}</span>
                <span v-if="item.maxScore != null"> / Max: {{ item.maxScore }}</span>
              </div>
            </div>
            <div class="shrink-0">
              <select
                v-model.number="compactMarks[item.id]"
                class="rounded-lg border border-slate-300 bg-white px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400/50"
              >
                <option
                  v-for="opt in buildScoreOptions(item.maxScore)"
                  :key="opt"
                  :value="opt"
                >
                  {{ opt }}
                </option>
              </select>
            </div>
          </div>
          <div class="mt-2">
            <label class="block text-[11px] font-medium text-slate-500">Comment (optional)</label>
            <textarea
              v-model="compactComments[item.id]"
              rows="2"
              class="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400/40"
              placeholder="Add a note if needed"
            ></textarea>
          </div>
        </div>
      </div>
    </div>

    <div class="flex items-center justify-end gap-2 pt-2">
      <button
        type="button"
        class="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
        :disabled="compactSaving || compactLoading || !compactItems.length"
        @click="saveCompact(false)"
      >
        {{ compactSaving ? 'Saving...' : 'Save Draft' }}
      </button>
      <button
        type="button"
        class="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
        :disabled="compactSaving || compactLoading || !compactItems.length"
        @click="saveCompact(true)"
      >
        {{ compactSaving ? 'Saving...' : 'Submit' }}
      </button>
    </div>
  </div>

  <div v-else class="max-w-7xl mx-auto px-4 py-6 space-y-6">
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

        <div
          v-if="employee?.active_criteria?.length === 0"
          class="p-4 text-sm font-bold text-slate-500"
        >
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
    <KpiGroupTable
      v-if="store.cycle && personalGroup"
      :group="personalGroup"
      :is-personal="true"
      :lanes="personalLanes"
      :editable-lane-key="myEditablePersonalLaneKey"
      :can-edit="canEditPersonal"
      :marks="marks"
      :header-label="'Personal Evaluation'"
      :item-label="personalGroup?.label || 'Personal'"
      :helper-text="staffMode ? 'All reviewer lanes score the Personal table.' : 'Fill only your lane; others appear as read-only.'"
      :serial-map="serialMap"
      :get-lane-mark="laneMark"
      :on-mark-change="setMark"
      :on-cap="cap"
      :on-quick-fill-item="quickFill"
    />

    <!-- OTHER GROUPS + RIGHT SIDEBAR -->
    <section class="mt-2">
      <div class="grid gap-4 lg:grid-cols-5">
        <!-- Main (groups tables) -->
        <div class="space-y-4 lg:col-span-3" v-if="otherGroups.length">
          <KpiGroupTable
            v-for="(grp, gIdx) in otherGroups"
            :key="gIdx"
            :group="grp"
            :is-personal="false"
            :can-edit="canHR"
            :marks="marks"
            :header-label="`Group ${gIdx + 1} - ${safeGroupLabel(grp, gIdx)}`"
            :item-label="'Item'"
            :show-quick-fill-group="true"
            :auto-fill-visible="canAutoFillFromSummary && matchGroupForTab(grp, activeSummaryTab)"
            :auto-fill-label="autoFillLabel"
            :on-auto-fill="() => applySummaryToMappedGroup(activeSummaryTab, { overwrite: true })"
            :get-hr-mark="hrMark"
            :on-mark-change="setMark"
            :on-cap="cap"
            :on-quick-fill-group="quickFillGroup"
          />
        </div>

        <!-- Right sidebar (Annual Target Summary + Comments) -->
        <aside
          class="space-y-4 sticky top-10 z-50"
          :class="[otherGroups.length === 0 ? 'lg:col-span-full' : 'lg:col-span-2']"
        >
          <section
            v-if="!staffMode && hasTargetSummary && canHR"
            class="sticky top-6 border rounded-2xl bg-white shadow-sm"
          >
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
                      <th class="px-2 py-2 w-[140px]">Lane</th>
                      <th class="px-2 py-2 text-right">Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="item in reviewComments"
                      :key="item.key"
                      class="border-t hover:bg-slate-50/60 align-top"
                    >
                      <td class="px-2 py-2">
                        <div class="font-semibold text-slate-700">
                          {{ item.label }}
                        </div>
                        <div v-if="item.submitted_at" class="mt-0.5 text-[11px] text-slate-400">
                          {{ new Date(item.submitted_at).toLocaleDateString() }}
                        </div>
                      </td>
                      <td class="px-2 py-2 text-right">
                        <button
                          type="button"
                          class="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-600 hover:border-slate-300 hover:text-slate-800"
                          @click="openReviewCommentModal(item)"
                        >
                          <span>View comments</span>
                          <span class="text-[10px] text-slate-400">Strengths · Gaps · Suggestions</span>
                        </button>
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
            class="rounded-2xl border border-slate-200 bg-slate-50/70 p-3 h-40 overflow-y-auto"
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
            class="rounded-2xl border border-slate-200 bg-slate-50/70 p-3 h-40 overflow-y-auto"
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
            class="rounded-2xl border border-slate-200 bg-slate-50/70 p-3 h-40 overflow-y-auto"
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

<transition name="fade-scale">
  <div
    v-if="reviewCommentModalOpen && reviewCommentModalItem"
    class="fixed inset-0 z-50 flex items-center justify-center px-4 py-6"
    @keydown.escape.window="closeReviewCommentModal"
  >
    <div
      class="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
      aria-hidden="true"
      @click="closeReviewCommentModal"
    ></div>

    <div
      class="relative w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-5 shadow-xl"
      role="dialog"
      aria-modal="true"
    >
      <div class="flex items-start justify-between gap-3">
        <div>
          <p class="text-lg font-semibold text-slate-900">{{ reviewCommentModalItem.label }}</p>
          <p class="text-xs text-slate-500">
            Lane: {{ reviewCommentModalItem.lane }} - Reviewed by {{ reviewCommentModalItem.reviewer_name || '––' }}
          </p>
          <p class="text-xs text-slate-400 mt-1" v-if="reviewCommentModalItem.submitted_at">
            {{ new Date(reviewCommentModalItem.submitted_at).toLocaleString() }}
          </p>
        </div>
        <button
          type="button"
          class="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
          @click="closeReviewCommentModal"
        >
          Close
        </button>
      </div>

      <div class="mt-5 space-y-4 text-sm text-slate-700">
        <div>
          <div class="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase">
            <span>Strengths</span>
          </div>
          <div class="mt-2 min-h-[40px] space-y-1 text-[13px] text-slate-600">
            <div v-if="reviewCommentModalItem.strengths?.length">
                <p v-for="(text, idx) in reviewCommentModalItem.strengths" :key="'modal-strength-'+idx">
                  - {{ text }}
                </p>
            </div>
            <p v-else class="text-slate-400">No strengths entered.</p>
          </div>
        </div>

        <div>
          <div class="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase">
            <span>Gaps</span>
          </div>
          <div class="mt-2 min-h-[40px] space-y-1 text-[13px] text-slate-600">
            <div v-if="reviewCommentModalItem.gaps?.length">
                <p v-for="(text, idx) in reviewCommentModalItem.gaps" :key="'modal-gap-'+idx">
                  - {{ text }}
                </p>
            </div>
            <p v-else class="text-slate-400">No gaps recorded.</p>
          </div>
        </div>

        <div>
          <div class="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase">
            <span>Suggestions</span>
          </div>
          <div class="mt-2 min-h-[40px] space-y-1 text-[13px] text-slate-600">
            <div v-if="reviewCommentModalItem.suggestions?.length">
                <p v-for="(text, idx) in reviewCommentModalItem.suggestions" :key="'modal-sug-'+idx">
                  - {{ text }}
                </p>
            </div>
            <p v-else class="text-slate-400">No suggestions provided.</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</transition>
</template>
