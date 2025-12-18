<script setup>
import LoaderView from '@/components/common/LoaderView.vue'
import EmployeeFilter from '@/components/common/EmployeeFilter.vue'
import { useKpiReportStore } from '@/stores/kpi-report'
import { storeToRefs } from 'pinia'
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

/* =========================
 * Store & Router
 * ========================= */
const store = useKpiReportStore()
const { reports, isLoading, error } = storeToRefs(store)
const route = useRoute()
const router = useRouter()

/* =========================
 * Filters (from query)
 * ========================= */
const initialFilterValue = computed(() => ({
  company_id: route.query.company_id ?? '',
  department_id: route.query.department_id ?? '',
  employee_id: route.query.employee_id ?? '',
  line_type: route.query.line_type ?? 'executive',
}))

const filters = reactive({
  company_id: initialFilterValue.value.company_id,
  department_id: initialFilterValue.value.department_id,
  employee_id: initialFilterValue.value.employee_id,
  line_type: initialFilterValue.value.line_type,
})

const filtersInitialized = ref(false)

/* =========================
 * Year options
 * ========================= */
const currentYear = new Date().getFullYear()
const year = ref(Number(route.query.year ?? currentYear))
const years = ref([])

function buildYearOptions(from = 2020, to = currentYear + 1) {
  const arr = []
  for (let y = to; y >= from; y--) arr.push(y)
  years.value = arr
}

/* =========================
 * Response mapping (NEW SHAPE)
 * reports.value shape:
 * {
 *   cycle, filters, lane_definitions, summary, data:[...]
 * }
 * ========================= */
const report = computed(() => reports.value || {})
const cycle = computed(() => report.value?.cycle || {})
const apiFilters = computed(() => report.value?.filters || {})

const laneDefinitions = computed(() => {
  const arr = Array.isArray(report.value?.lane_definitions)
    ? report.value.lane_definitions
    : []
  return [...arr].sort((a, b) => Number(a.rank || 0) - Number(b.rank || 0))
})

const summary = computed(() => report.value?.summary || {})
const items = computed(() => (Array.isArray(report.value?.data) ? report.value.data : []))

const laneCount = computed(() => {
  if (laneDefinitions.value.length) return laneDefinitions.value.length
  const n = Number(cycle.value?.lane_count ?? 0)
  return Number.isFinite(n) && n > 0 ? n : 0
})

/* =========================
 * Helpers
 * ========================= */
function pct(n) {
  const x = Number(n)
  if (!Number.isFinite(x)) return '0%'
  return `${Math.round(x)}%`
}

function safeText(v, fallback = '-') {
  const s = (v ?? '').toString().trim()
  return s ? s : fallback
}

function formatDateLabel(value) {
  if (!value) return null
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed.toLocaleDateString()
}

function nowStr() {
  return new Date().toLocaleString()
}

function doPrint() {
  window.print()
}

function joinList(arr) {
  if (!Array.isArray(arr) || arr.length === 0) return null
  return arr.join('; ')
}

function normalizeCommentArray(value) {
  if (Array.isArray(value)) {
    return value
      .map((v) => (typeof v === 'string' ? v.trim() : ''))
      .filter((v) => v !== '')
  }
  if (typeof value === 'string') {
    return value
      .split(/[\r\n;]+/)
      .map((v) => v.trim())
      .filter((v) => v !== '')
  }
  return []
}

/* =========================
 * Progress badge
 * ========================= */
function progressBadgeClass(row) {
  const reviewed = Number(row?.progress?.lanes_reviewed ?? 0)
  const total = Number(laneCount.value ?? 0)
  if (!total) return 'bg-slate-50 text-slate-600 border-slate-200'
  if (reviewed >= total) return 'bg-emerald-50 text-emerald-700 border-emerald-200'
  if (reviewed > 0) return 'bg-amber-50 text-amber-700 border-amber-200'
  return 'bg-rose-50 text-rose-700 border-rose-200'
}

function progressText(row) {
  const reviewed = Number(row?.progress?.lanes_reviewed ?? 0)
  const total = Number(laneCount.value ?? 0)
  return total ? `${reviewed}/${total}` : `${reviewed}`
}

/* =========================
 * Latest review formatter (modal uses this)
 * ========================= */
function formatReviewSummary(review) {
  if (!review) return 'No reviews submitted yet'
  const reviewer = review.reviewer_name || 'Latest reviewer'
  const laneHint = review.reviewer_lane ? ` (${review.reviewer_lane})` : ''
  const obtained = review.obtained_total ?? null
  const maxTotal = review.max_total ?? null
  const hasNumericScore = Number.isFinite(Number(obtained)) && Number.isFinite(Number(maxTotal))
  const scoreText = hasNumericScore
    ? `${Number(obtained)}/${Number(maxTotal)}`
    : (obtained !== null ? `${obtained}` : null)
  const submittedAt = formatDateLabel(review.submitted_at)

  const parts = [`${reviewer}${laneHint}`]
  if (scoreText) parts.push(scoreText)
  if (submittedAt) parts.push(submittedAt)
  return parts.join(' • ')
}

/* =========================
 * Lane status (best-effort)
 * If row.lanes is empty => "—"
 * ========================= */
function laneCell(row, laneKey) {
  const lanes = Array.isArray(row?.lanes) ? row.lanes : []
  const found = lanes.find((l) => l?.key === laneKey) || null

  if (!found) {
    return {
      text: '-',
      cls: 'bg-slate-50 text-slate-500 border border-slate-200',
      percentText: '--',
    }
  }

  const submittedAt = found.submitted_at || found.submittedAt || found.review?.submitted_at
  const completed = !!(found.completed ?? found.is_completed ?? found.review_submitted ?? submittedAt)
  const rawPercent = found.average_marks ?? 0
  // const percent = Number.isFinite(Number(rawPercent)) ? Number(rawPercent) : null
  // const percentText = percent !== null ? pct(percent) : '--'

  if (completed) {
    return {
      text: rawPercent,
      cls: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    }
  }

  return {
    text: rawPercent,
    cls: 'bg-amber-50 text-amber-700 border-amber-200',
  }
}
/* =========================
 * Derived rows for UI
 * - aggregatedStrengths/Gaps/Suggestions => table shows these
 * - latestReview* => modal shows these
 * ========================= */
const rows = computed(() =>
  items.value.map((x) => {
    const emp = x.employee || {}
    const latest = x.latest_review || null
    const comments = x.comments || {}

    return {
      ...x,
      _name: safeText(emp.name),
      _company: safeText(emp.company, ''),
      _dept: safeText(emp.department, ''),
      _joining: formatDateLabel(emp.joining_date),
      _type: safeText(emp.type, ''),
      latestReviewSummary: formatReviewSummary(latest),
      latestReviewStrengths: joinList(latest?.strengths) || null,
      latestReviewGaps: joinList(latest?.gaps) || null,
      latestReviewSuggestions: joinList(latest?.suggestions) || null,
      aggregatedStrengthsList: normalizeCommentArray(comments?.strengths),
      aggregatedGapsList: normalizeCommentArray(comments?.gaps),
      aggregatedSuggestionsList: normalizeCommentArray(comments?.suggestions),
      aggregatedStrengths: joinList(comments?.strengths),
      aggregatedGaps: joinList(comments?.gaps),
      aggregatedSuggestions: joinList(comments?.suggestions),
      finalPercent:
        x?.kpi_result?.final_percent ??
        x?.kpi_result?.final_percentage ??
        x?.kpi_result?.final ??
        null,
    }
  })
)

const searchTerm = ref('')
const commentScope = ref('all')
const commentScopeOptions = [
  { value: 'all', label: 'Any comment' },
  { value: 'strengths', label: 'Strengths' },
  { value: 'gaps', label: 'Gaps' },
  { value: 'suggestions', label: 'Suggestions' },
]

const normalizedSearchTerm = computed(() => searchTerm.value.trim().toLowerCase())

const filteredRows = computed(() => {
  const term = normalizedSearchTerm.value
  if (!term) {
    return rows.value
  }

  return rows.value.filter((row) => {
    const scope = commentScope.value
    const arrays = []
    if (scope === 'all' || scope === 'strengths') arrays.push(row.aggregatedStrengthsList || [])
    if (scope === 'all' || scope === 'gaps') arrays.push(row.aggregatedGapsList || [])
    if (scope === 'all' || scope === 'suggestions') arrays.push(row.aggregatedSuggestionsList || [])
    return arrays.some((arr) =>
      arr.some((value) => value.toLowerCase().includes(term)),
    )
  })
})

const displayRows = computed(() => filteredRows.value)

/* =========================
 * Modal state
 * ========================= */
const reviewModalRow = ref(null)
const reviewModalOpen = ref(false)

function viewReviewDetails(row) {
  reviewModalRow.value = row
  reviewModalOpen.value = true
}

function closeReviewModal() {
  reviewModalOpen.value = false
  reviewModalRow.value = null
}

const exportingExcel = ref(false)

function buildExportParams() {
  return {
    year: Number(year.value),
    company_id: filters.company_id || undefined,
    department_id: filters.department_id || undefined,
    employee_id: filters.employee_id || undefined,
    line_type: filters.line_type || undefined,
    flag: 'excel',
  }
}

async function downloadExcel() {
  exportingExcel.value = true

  try {
    await store.exportYearly(buildExportParams())
  } catch (e) {
    console.error('exportYearly failed:', e)
  } finally {
    exportingExcel.value = false
  }
}

/* =========================
 * Data load
 * ========================= */
function updateQuery(params = {}) {
  const next = {
    ...route.query,
    ...params,
  }
  Object.keys(next).forEach((key) => {
    const value = next[key]
    if (value === undefined || value === null || value === '') {
      delete next[key]
    }
  })
  router.replace({ query: next })
}

async function load() {
  try {
    if(filters.company_id) {
      await store.fetchYearlyExecutive({
        year: Number(year.value),
        company_id: filters.company_id || undefined,
        department_id: filters.department_id || undefined,
        employee_id: filters.employee_id || undefined,
        line_type: filters.line_type || undefined,
      })
    }
  } catch (e) {
    console.error('fetchYearlyExecutive failed:', e)
  }
}

function handleFilterChange(payload = {}) {
  filters.company_id = payload.company_id ?? ''
  filters.department_id = payload.department_id ?? ''
  filters.employee_id = payload.employee_id ?? ''
  filters.line_type = payload.line_type ?? initialFilterValue.value.line_type ?? 'executive'

  filtersInitialized.value = true
  updateQuery({
    company_id: filters.company_id || undefined,
    department_id: filters.department_id || undefined,
    employee_id: filters.employee_id || undefined,
    line_type: filters.line_type || undefined,
    year: Number(year.value),
  })
  load()
}

watch(year, () => {
  const y = Number(year.value)
  if (!Number.isInteger(y) || y < 2000 || y > 2100) return
  if (!filtersInitialized.value) return
  updateQuery({ year: y })
  load()
})

onMounted(() => {
  buildYearOptions()
})

function formatDateTime(value) {
  if (!value) return null
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d.toLocaleString()
}

const modalLaneGroups = computed(() => {
  const row = reviewModalRow.value
  const lanes = Array.isArray(row?.lanes) ? row.lanes : []

  // sort by laneDefinitions rank if possible
  const rankMap = new Map(laneDefinitions.value.map(l => [l.key, Number(l.rank ?? 0)]))

  const sorted = [...lanes].sort((a, b) => {
    const ra = rankMap.get(a.key) ?? 9999
    const rb = rankMap.get(b.key) ?? 9999
    return ra - rb
  })

  return sorted.map(l => {
    const reviewers = Array.isArray(l.reviewers) ? l.reviewers : []
    // keep latest first if time exists
    const reviewersSorted = [...reviewers].sort((a, b) => {
      const ta = new Date(a.submitted_at || a.updated_at || 0).getTime()
      const tb = new Date(b.submitted_at || b.updated_at || 0).getTime()
      return tb - ta
    })

    return {
      ...l,
      label: laneDefinitions.value.find(x => x.key === l.key)?.label || l.key,
      reviewers: reviewersSorted,
    }
  })
})

</script>

<template>
  <div class="space-y-4 px-4 print:px-0">
    <!-- Print Header -->
    <div class="hidden print:block mx-auto text-center mb-3">
      <h1 class="text-xl font-semibold text-gray-900">Yearly KPI Report</h1>
      <div class="text-sm text-gray-600">
        Cycle: <span class="font-medium">{{ cycle?.slug || '-' }}</span>
        • Year: <span class="font-medium">{{ year }}</span>
        • Generated: <span>{{ nowStr() }}</span>
      </div>
    </div>

    <!-- Controls -->
    <div class="flex flex-wrap items-end gap-3 sticky top-0 z-10 bg-white/80 backdrop-blur print:hidden p-2 -mx-2 rounded-xl border border-gray-100">
      <div class="w-full flex items-start gap-3">
        <EmployeeFilter
          v-model:company_id="filters.company_id"
          v-model:department_id="filters.department_id"
          v-model:employee_id="filters.employee_id"
          v-model:line_type="filters.line_type"
          :initial-value="initialFilterValue"
          class="w-full"
          @filter-change="handleFilterChange"
        > 
        <div class="flex items-center gap-2">
          <select
            v-model.number="year"
            class="w-32 rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400/50 disabled:opacity-60"
            :disabled="isLoading"
            aria-label="Select year"
          >
            <option v-for="y in years" :key="y" :value="y">{{ y }}</option>
          </select>
        </div>
        </EmployeeFilter>
      </div>

      <div class="flex flex-wrap items-center gap-2 w-full">
        <input
          v-model="searchTerm"
          type="search"
          placeholder="Search gaps/strengths/suggestions"
          class="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm focus:border-sky-400 focus:ring-2 focus:ring-sky-400/50"
        />
        <select
          v-model="commentScope"
          class="rounded-lg border border-gray-300 bg-white px-2 py-1 text-sm focus:border-sky-400 focus:ring-2 focus:ring-sky-400/50"
        >
          <option v-for="opt in commentScopeOptions" :key="opt.value" :value="opt.value">
            {{ opt.label }}
          </option>
        </select>
          <button
            class="btn-1"
            @click="downloadExcel"
            :disabled="exportingExcel || isLoading"
          >
            <i class="far fa-file-excel mr-1"></i>
            {{ exportingExcel ? 'Preparing...' : 'Download Excel' }}
          </button>
      </div>


    </div>

    <!-- Loader / Error -->
    <div v-if="isLoading" class="py-10 text-center">
      <LoaderView />
    </div>
    <div v-else-if="error" class="rounded-xl border border-red-200 bg-red-50 p-3 text-red-700" role="alert">
      {{ error }}
    </div>

    <template v-else>
      <!-- Summary -->
      <div class="rounded-2xl border border-gray-200 bg-white shadow-sm p-4 print:hidden">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div class="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-500">
              KPI Cycle • {{ safeText(cycle?.slug) }}
            </div>
            <h2 class="mt-1 text-lg font-semibold text-slate-900">
              Year {{ year }} • {{ safeText(filters.line_type) }}
            </h2>
            <div class="mt-1 flex flex-wrap gap-2 text-xs text-slate-600">
              <span class="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5">
                Employees: <b class="text-slate-900">{{ summary?.total_employees ?? 0 }}</b>
              </span>
              <span class="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5">
                With results: <b class="text-slate-900">{{ summary?.with_results ?? 0 }}</b>
              </span>
              <span class="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5">
                Avg final: <b class="text-slate-900">{{ pct(summary?.avg_final_percent ?? 0) }}</b>
              </span>
              <span class="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5">
                Completion: <b class="text-slate-900">{{ pct(summary?.review_completion_percent ?? 0) }}</b>
              </span>
              <span v-if="laneCount" class="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5">
                Lanes: <b class="text-slate-900">{{ laneCount }}</b>
              </span>
            </div>
          </div>

          <div class="text-xs text-slate-500">
            <div><b class="text-slate-700">API Filters</b></div>
            <div>line_type: {{ apiFilters?.line_type ?? '-' }}</div>
            <div>submitted_only: {{ apiFilters?.submitted_only ? 'true' : 'false' }}</div>
          </div>
        </div>
      </div>

      <!-- ===== Mobile Cards ===== -->
      <div class="space-y-3 md:hidden">
        <div
          v-for="(r, i) in displayRows"
          :key="'m-'+(r.employee?.id ?? i)"
          class="rounded-2xl border border-gray-200 bg-white shadow-sm p-3"
        >
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <div class="text-sm font-semibold text-slate-900 truncate" :title="r._name">
                {{ i + 1 }}. {{ r._name }}
              </div>
              <div class="mt-0.5 text-[11px] text-slate-500">
                <span v-if="r._dept">{{ r._dept }}</span>
                <span v-if="r._dept && r._company"> • </span>
                <span v-if="r._company">{{ r._company }}</span>
                <span v-if="r._joining"> • Joined {{ r._joining }}</span>
              </div>
            </div>

            <div class="shrink-0">
              <span class="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold"
                    :class="progressBadgeClass(r)">
                {{ progressText(r) }}
              </span>
            </div>
          </div>

          <div class="mt-2 grid grid-cols-4 gap-2" v-if="laneDefinitions.length">
            <div
              v-for="ld in laneDefinitions"
              :key="'m-lane-'+ld.key"
              class="rounded-xl border p-2 text-center"
            >
              <div class="text-[10px] font-medium text-slate-600 truncate" :title="ld.label">
                {{ ld.label }}
              </div>
              <div class="mt-1 flex flex-col items-center gap-1">
                <span
                  class="inline-flex items-center justify-center rounded-md border px-2 py-0.5 text-[11px] font-semibold"
                  :class="laneCell(r, ld.key).cls"
                >
                  {{ laneCell(r, ld.key).text }}
                </span>
              </div>
            </div>
          </div>

          <div class="mt-3 flex items-center justify-between gap-3">
            <button
              type="button"
              class="text-xs font-semibold text-sky-600 hover:text-sky-800"
              @click="viewReviewDetails(r)"
            >
              Open review modal
            </button>
          </div>
        </div>

        <div v-if="displayRows.length === 0" class="px-3 py-8 text-center text-gray-600">No data</div>
      </div>

      <!-- ===== Desktop Table ===== -->
      <div class="hidden md:block overflow-x-auto rounded-2xl border bg-white shadow-sm">
        <table class="w-full text-sm">
          <thead class="sticky top-0 z-[5] bg-gray-100/95 backdrop-blur">
            <tr>
              <th class="sticky left-0 z-[6] border-b border-r bg-gray-100/95 px-3 py-2 text-center"
                  style="min-width:3rem;width:3rem">
                SL
              </th>

              <th class="sticky z-[6] border-b border-r bg-gray-100/95 px-3 py-2 text-left"
                  :style="{ left: '3rem', minWidth:'18rem', width:'18rem'}">
                Employee
              </th>

              <th class="border-b border-r px-3 py-2 text-center" style="min-width:7rem">
                Progress
              </th>

              <th
                v-for="ld in laneDefinitions"
                :key="'lane-head-'+ld.key"
                class="border-b border-r px-2 py-2 text-center"
                style="min-width:6.5rem"
              >
                <span class="text-xs font-semibold text-slate-700">{{ ld.label }}</span>
              </th>

              <th class="border-b border-r px-3 py-2 text-center" style="min-width:8rem">
                Final
              </th>

              <th class="border-b px-3 py-2 text-left">
                All comments
              </th>
            </tr>
          </thead>

          <tbody>
            <tr
              v-for="(r, i) in displayRows"
              :key="'d-'+(r.employee?.id ?? i)"
              class="border-t hover:bg-slate-50/80 transition-colors"
            >
              <td class="sticky left-0 z-[4] border-r bg-inherit px-3 py-2 text-center">
                {{ i + 1 }}
              </td>

              <td class="sticky z-[4] border-r bg-inherit px-3 py-2" :style="{ left: '3rem' }">
                <div class="max-w-[17rem]">
                  <div class="font-semibold text-slate-900 truncate" :title="r._name">{{ r._name }}</div>
                  <div class="text-[11px] text-slate-500 truncate">
                    <span v-if="r._dept">{{ r._dept }}</span>
                    <span v-if="r._dept && r._company"> • </span>
                    <span v-if="r._company">{{ r._company }}</span>
                    <span v-if="r._joining"> • Joined {{ r._joining }}</span>
                  </div>
                </div>
              </td>

              <td class="border-r px-3 py-2 text-center">
                <span class="inline-flex items-center justify-center rounded-full border px-2 py-0.5 text-[12px] font-semibold"
                      :class="progressBadgeClass(r)">
                  {{ progressText(r) }}
                </span>
              </td>

              <td v-for="ld in laneDefinitions" :key="'lane-'+ld.key+'-'+i" class="border-r px-2 py-2 text-center">
                <div class="flex flex-col items-center gap-1">
                  <span
                    class="inline-flex items-center justify-center rounded-md border px-2 py-0.5 text-[11px] font-semibold"
                    :class="laneCell(r, ld.key).cls"
                  >
                    {{ laneCell(r, ld.key).text }}
                  </span>
                </div>
              </td>

              <td class="border-r px-3 py-2 text-center">
                <span class="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[12px] font-semibold text-slate-700">
                  {{ r.finalPercent == null ? '—' : pct(r.finalPercent) }}
                </span>
              </td>

              <td class="px-3 py-2">
                <div class="space-y-1 text-[11px] text-slate-600">
                  <div class="mt-2 flex items-center justify-between gap-3">
                    <button
                      type="button"
                      class="text-[11px] font-semibold text-sky-600 hover:text-sky-800"
                      @click="viewReviewDetails(r)"
                    >
                      Open review modal
                    </button>
                  </div>
                </div>
              </td>
            </tr>

            <tr v-if="displayRows.length === 0">
              <td colspan="100" class="px-3 py-8 text-center text-gray-600">No data</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- =========================
           Modal: Latest Review ONLY
           ========================= -->
      <transition name="fade-scale">
        <div
          v-if="reviewModalOpen && reviewModalRow"
          class="fixed inset-0 z-50 flex items-center justify-center px-4 py-6"
          @keydown.escape.window="closeReviewModal"
        >
          <!-- backdrop -->
          <div
            class="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            aria-hidden="true"
            @click="closeReviewModal"
          ></div>

          <!-- panel -->
          <div
            class="relative max-w-2xl w-full rounded-2xl border border-slate-200 bg-white p-5 shadow-xl"
            role="dialog"
            aria-modal="true"
            aria-label="Latest review details"
          >
            <div class="flex items-start justify-between gap-4">
              <div>
                <p class="text-lg font-semibold text-slate-900">{{ reviewModalRow._name }}</p>
                <p class="text-xs text-slate-500">
                  {{ reviewModalRow._dept || 'Department unknown' }}
                  <span v-if="reviewModalRow._company"> • {{ reviewModalRow._company }}</span>
                  <span v-if="reviewModalRow._joining"> • Joined {{ reviewModalRow._joining }}</span>
                </p>
                <p class="text-xs text-slate-500">Line type: {{ reviewModalRow._type }}</p>
              </div>

              <button
                type="button"
                class="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                @click="closeReviewModal"
              >
                Close
              </button>
            </div>

            <div class="mt-4 space-y-4 text-slate-700">
              <article class="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div class="mt-3 space-y-2 text-xs text-slate-700">
                  <div v-if="reviewModalRow.latestReviewStrengths">
                    <span class="font-semibold text-slate-800">Strengths:</span>
                    <div class="mt-1 text-slate-600">{{ reviewModalRow.latestReviewStrengths }}</div>
                  </div>

                  <div v-if="reviewModalRow.latestReviewGaps">
                    <span class="font-semibold text-slate-800">Gaps:</span>
                    <div class="mt-1 text-slate-600">{{ reviewModalRow.latestReviewGaps }}</div>
                  </div>

                  <div v-if="reviewModalRow.latestReviewSuggestions">
                    <span class="font-semibold text-slate-800">Suggestions:</span>
                    <div class="mt-1 text-slate-600">{{ reviewModalRow.latestReviewSuggestions }}</div>
                  </div>

                  <div
                    v-if="!reviewModalRow.latestReviewStrengths && !reviewModalRow.latestReviewGaps && !reviewModalRow.latestReviewSuggestions"
                    class="text-slate-500"
                  >
                    No latest review comments
                  </div>
                </div>
              </article>
            </div>
          </div>
        </div>
      </transition>
    </template>

    <!-- =========================
     Modal: ALL reviewer comments (lane-wise)
     ========================= -->
<transition name="fade-scale">
  <div
    v-if="reviewModalOpen && reviewModalRow"
    class="fixed inset-0 z-50 flex items-center justify-center px-4 py-6"
    @keydown.escape.window="closeReviewModal"
  >
    <!-- backdrop -->
    <div
      class="absolute inset-0"
      aria-hidden="true"
      @click="closeReviewModal"
    ></div>

    <!-- panel -->
    <div
      class="relative max-w-3xl w-full rounded-2xl border border-slate-200 bg-white shadow-xl overflow-hidden"
      role="dialog"
      aria-modal="true"
      aria-label="All reviewer comments"
    >
      <!-- header -->
      <div class="p-5 border-b border-slate-200 bg-white">
        <div class="flex items-start justify-between gap-4">
          <div class="min-w-0">
            <p class="text-lg font-semibold text-slate-900 truncate">
              {{ reviewModalRow._name }}
            </p>
            <p class="mt-0.5 text-xs text-slate-500">
              {{ reviewModalRow._dept || 'Department unknown' }}
              <span v-if="reviewModalRow._company"> • {{ reviewModalRow._company }}</span>
              <span v-if="reviewModalRow._joining"> • Joined {{ reviewModalRow._joining }}</span>
            </p>
            <div class="mt-2 flex flex-wrap gap-2 text-[11px] text-slate-600">
              <span class="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5">
                Progress: <b class="text-slate-900">{{ progressText(reviewModalRow) }}</b>
              </span>
              <span class="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5">
                Final: <b class="text-slate-900">{{ reviewModalRow.finalPercent == null ? '—' : pct(reviewModalRow.finalPercent) }}</b>
              </span>
              <span class="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5">
                Reviews: <b class="text-slate-900">{{ reviewModalRow.progress?.review_count ?? 0 }}</b>
              </span>
            </div>
            <!-- {{ reviewModalRow }} -->
          </div>

          <button
            type="button"
            class="shrink-0 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
            @click="closeReviewModal"
          >
            Close
          </button>
        </div>
      </div>

      

      <!-- body scroll -->
      <div class="max-h-[75vh] overflow-y-auto p-5 space-y-4">
        <div v-if="!modalLaneGroups.length" class="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
          No reviews found for this employee.
        </div>

        <!-- lane groups -->
        <div
          v-for="lane in modalLaneGroups"
          :key="'lane-group-'+lane.key"
          class="rounded-2xl border border-slate-200 bg-white overflow-hidden"
        >
          <!-- lane header -->
          <div class="px-4 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
            <div class="flex items-center gap-2 min-w-0">
              <span class="text-sm font-semibold text-slate-900 truncate" :title="lane.label">
                {{ lane.label }}
              </span>
              <span class="text-[11px] text-slate-500 truncate">
                (key: {{ lane.key }})
              </span>
            </div>
            <div class="flex flex-wrap gap-2 text-[11px] text-slate-600">
              <span class="rounded-full border border-slate-200 bg-white px-2 py-0.5">
                Count: <b class="text-slate-900">{{ lane.count ?? (lane.reviewers?.length ?? 0) }}</b>
              </span>
              <span class="rounded-full border border-slate-200 bg-white px-2 py-0.5">
                Avg: <b class="text-slate-900">{{ lane.average_marks == null ? '—' : pct(lane.average_marks) }}</b>
              </span>
              <span class="rounded-full border border-slate-200 bg-white px-2 py-0.5">
                Latest: <b class="text-slate-900">{{ formatDateTime(lane.latest_review_at) || '—' }}</b>
              </span>
            </div>
          </div>

          <!-- reviewers list -->
          <div class="p-4 space-y-3">
            <div
              v-for="(rv, idx) in (lane.reviewers || [])"
              :key="'rv-'+lane.key+'-'+idx+'-'+(rv.id ?? 'x')"
              class="rounded-xl border border-slate-200 bg-white p-3"
            >
              <div class="flex flex-wrap items-start justify-between gap-2">
                <div class="min-w-0">
                  <div class="text-sm font-semibold text-slate-900 truncate">
                    {{ rv.name || 'Reviewer' }}
                  </div>
                  <div class="mt-0.5 text-[11px] text-slate-500">
                    Lane: {{ rv.lane || lane.key }}
                    <span v-if="rv.submitted_at || rv.updated_at">
                      • {{ formatDateTime(rv.submitted_at || rv.updated_at) }}
                    </span>
                  </div>
                </div>

                <div class="flex flex-wrap gap-2">
                  <span class="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                    {{ rv.percent == null ? '—' : pct(rv.percent) }}
                  </span>
                  <span
                    v-if="rv.obtained_total != null && rv.max_total != null"
                    class="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-700"
                  >
                    {{ rv.obtained_total }}
                    <!-- {{ rv.obtained_total }}/{{ rv.max_total }} -->
                  </span>
                </div>
              </div>

              <!-- comments -->
              <div class="mt-3 space-y-2 text-xs text-slate-700">
                <div v-if="rv.strengths && rv.strengths.length">
                  <div class="font-semibold text-slate-900">Strengths</div>
                  <ul class="mt-1 list-disc pl-5 text-slate-600 space-y-1">
                    <li v-for="(t, si) in rv.strengths" :key="'s-'+si">{{ t }}</li>
                  </ul>
                </div>

                <div v-if="rv.gaps && rv.gaps.length">
                  <div class="font-semibold text-slate-900">Gaps</div>
                  <ul class="mt-1 list-disc pl-5 text-slate-600 space-y-1">
                    <li v-for="(t, gi) in rv.gaps" :key="'g-'+gi">{{ t }}</li>
                  </ul>
                </div>

                <div v-if="rv.suggestions && rv.suggestions.length">
                  <div class="font-semibold text-slate-900">Suggestions</div>
                  <ul class="mt-1 list-disc pl-5 text-slate-600 space-y-1">
                    <li v-for="(t, ui) in rv.suggestions" :key="'u-'+ui">{{ t }}</li>
                  </ul>
                </div>

                <div
                  v-if="(!rv.strengths || !rv.strengths.length) && (!rv.gaps || !rv.gaps.length) && (!rv.suggestions || !rv.suggestions.length)"
                  class="text-slate-500"
                >
                  No comments in this review.
                </div>
              </div>
            </div>

            <div v-if="!lane.reviewers || lane.reviewers.length === 0" class="text-sm text-slate-500">
              No reviewers found in this lane.
            </div>
          </div>
        </div>
      </div>

      <!-- footer -->
      <div class="p-4 border-t border-slate-200 bg-white flex items-center justify-end gap-2">
        <button
          type="button"
          class="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
          @click="closeReviewModal"
        >
          Close
        </button>
      </div>
    </div>
  </div>
</transition>

  </div>
</template>

<style scoped>
thead tr { -webkit-print-color-adjust: exact; print-color-adjust: exact; }

.fade-scale-enter-active,
.fade-scale-leave-active {
  transition: opacity 160ms ease, transform 160ms ease;
}
.fade-scale-enter-from,
.fade-scale-leave-to {
  opacity: 0;
  transform: scale(0.98);
}

@media print {
  .print\:hidden { display: none !important; }
  .rounded-2xl, .rounded-xl, .rounded-lg { border-radius: 0 !important; }
  .shadow-sm { box-shadow: none !important; }
  table { width: 100% !important; }
}
</style>
