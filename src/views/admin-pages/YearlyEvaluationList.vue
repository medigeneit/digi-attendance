<script setup>
import LoaderView from '@/components/common/LoaderView.vue'
import EmployeeFilter from '@/components/common/EmployeeFilter.vue'
import { useKpiStore } from '@/stores/kpi'
import { storeToRefs } from 'pinia'
import { ref, onMounted, watch, computed, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useToast } from 'vue-toastification'

const toast = useToast()
const router = useRouter()
const route  = useRoute()

/* ===== store ===== */
const kpiStore = useKpiStore()
const { users, loading, error, usersError } = storeToRefs(kpiStore)

/* ===== filters (no pagination) ===== */
const filters = ref({
  company_id:    route.query.company_id ? Number(route.query.company_id) : '',
  department_id: route.query.department_id ? Number(route.query.department_id) : '',
  employee_id:   route.query.employee_id ? Number(route.query.employee_id) : '',
  line_type:     route.query.line_type ?? '',
  user_id:       route.query.user_id ? Number(route.query.user_id) : '',
  finalized:     route.query.finalized ?? '', // kept for backend compatibility
  q:             route.query.q ?? '',
})

/* ===== local UI state ===== */
const sortBy  = ref(route.query.sortBy || 'name')     // name | progress | stage
const sortDir = ref(route.query.sortDir || 'asc')     // asc | desc

/* ===== performance helpers ===== */
let debounceTimer = null
let fetchToken = 0
let lastParamsKey = ''
const refreshing = ref(false)
const lastSnapshot = ref([])

/* ===== computed ===== */
const hasOrg = computed(() => !!filters.value.company_id && !!filters.value.department_id)
const hasFilters = computed(() =>
  hasOrg.value || filters.value.finalized !== '' || !!filters.value.line_type || !!filters.value.q
)
const isBusy = computed(() => loading.value)

/** base rows = current store users if org selected, otherwise last snapshot */
const baseRows = computed(() => {
  return hasOrg.value ? (Array.isArray(users.value) ? users.value : []) : lastSnapshot.value
})

/* ===== KPI progress helpers ===== */
function getProgress(row) {
  const p = row?.kpi?.progress
  const total = Number(p?.total_lanes ?? 0)
  const submitted = Number(p?.submitted_lanes ?? 0)
  const pending = Number(p?.pending_lanes ?? Math.max(0, total - submitted))
  const stage = String(p?.stage ?? (total ? 'not_started' : 'n/a'))
  const percent = total > 0 ? Math.round((submitted / total) * 100) : 0
  return { total, submitted, pending, stage, percent }
}

function stageRank(stage) {
  // completed first
  if (stage === 'completed') return 0
  if (stage === 'in_progress') return 1
  if (stage === 'not_started') return 2
  return 3
}

function stageBadge(row) {
  const { stage, submitted, total } = getProgress(row)

  if (stage === 'completed') {
    return { label: `Completed (${submitted}/${total})`, cls: 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200' }
  }
  if (stage === 'in_progress') {
    return { label: `In progress (${submitted}/${total})`, cls: 'bg-amber-100 text-amber-700 ring-1 ring-amber-200' }
  }
  if (stage === 'not_started') {
    return { label: 'Not started', cls: 'bg-slate-100 text-slate-700 ring-1 ring-slate-200' }
  }
  return { label: 'N/A', cls: 'bg-slate-100 text-slate-700 ring-1 ring-slate-200' }
}

function completedStageInfo(row) {
  const review = row?.kpi?.latest_review ?? {}
  const laneValue = String(review?.reviewer_lane ?? '').trim()
  if (!laneValue) {
    return {
      label: 'Not completed yet',
      detail: 'No reviewer lane has finished',
      cls: 'border-slate-200 bg-slate-50 text-slate-500',
    }
  }

  const stageValue = review?.stage ? String(review.stage) : ''
  const stageLabel = stageValue
    ? stageValue
      .split('_')
      .map(segment => segment ? segment[0]?.toUpperCase() + segment.slice(1) : '')
      .filter(Boolean)
      .join(' ')
    : ''

  return {
    label: laneValue,
    detail: stageLabel ? `Stage: ${stageLabel}` : 'Latest completed lane',
    cls: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  }
}

function cycleLabel(row) {
  const c = row?.kpi?.cycle
  if (!c?.id) return '—'
  const year = c?.year ? String(c.year) : ''
  const slug = c?.slug ? String(c.slug) : ''
  return [year, slug].filter(Boolean).join(' • ') || `#${c.id}`
}

/* quick stats on currently visible rows */
const stat = computed(() => {
  let total = baseRows.value.length
  let completed = 0, inProgress = 0, notStarted = 0, na = 0

  for (const r of baseRows.value) {
    const st = getProgress(r).stage
    if (st === 'completed') completed++
    else if (st === 'in_progress') inProgress++
    else if (st === 'not_started') notStarted++
    else na++
  }
  return { total, completed, inProgress, notStarted, na }
})

/* sorted rows (client-side) */
const sortedRows = computed(() => {
  const arr = [...baseRows.value]
  const d = sortDir.value === 'desc' ? -1 : 1
  const key = sortBy.value

  const progressRatio = (r) => {
    const { total, submitted } = getProgress(r)
    if (total <= 0) return -Infinity
    return submitted / total
  }

  arr.sort((a, b) => {
    if (key === 'progress') {
      const av = progressRatio(a)
      const bv = progressRatio(b)
      return (av > bv ? 1 : av < bv ? -1 : 0) * d
    }
    if (key === 'stage') {
      return (stageRank(getProgress(a).stage) - stageRank(getProgress(b).stage)) * d
    }
    // default name
    const an = String(a?.name ?? '')
    const bn = String(b?.name ?? '')
    return an.localeCompare(bn) * d
  })
  return arr
})

/* ===== URL sync ===== */
function syncUrl () {
  router.replace({
    query: {
      company_id:    filters.value.company_id || undefined,
      department_id: filters.value.department_id || undefined,
      line_type:     filters.value.line_type || undefined,
      user_id:       filters.value.user_id || undefined,
      employee_id:   filters.value.employee_id || undefined,
      finalized:     filters.value.finalized || undefined,
      q:             filters.value.q || undefined,
      sortBy:        sortBy.value !== 'name' ? sortBy.value : undefined,
      sortDir:       sortDir.value !== 'asc'  ? sortDir.value : undefined,
    },
  }).catch(() => {})
}

function debouncedSyncUrl() {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    if (hasOrg.value) syncUrl()
  }, 350)
}

/* Pull from URL, then load */
watch(() => route.fullPath, async () => {
  const q = route.query
  filters.value.company_id    = q.company_id ? Number(q.company_id) : ''
  filters.value.department_id = q.department_id ? Number(q.department_id) : ''
  filters.value.employee_id   = q.employee_id ? Number(q.employee_id) : ''
  filters.value.user_id       = q.user_id ? Number(q.user_id) : ''
  filters.value.line_type     = q.line_type ?? ''
  filters.value.finalized     = q.finalized ?? ''
  filters.value.q             = q.q ?? ''
  sortBy.value                = q.sortBy || 'name'
  sortDir.value               = q.sortDir || 'asc'

  if (hasOrg.value) await load()
})

/* ===== actions ===== */
function buildParams () {
  return {
    company_id:    filters.value.company_id,
    department_id: filters.value.department_id || undefined,
    employee_id:   filters.value.employee_id || undefined,
    user_id:       filters.value.user_id || undefined,
    line_type:     filters.value.line_type || undefined,
    finalized:     filters.value.finalized, // keep
    q:             filters.value.q || undefined,
  }
}

async function load () {
  const params = buildParams()
  const key = JSON.stringify(params)
  if (key === lastParamsKey) return
  lastParamsKey = key

  const token = ++fetchToken
  refreshing.value = baseRows.value.length > 0

  try {
    const maybeData = await kpiStore.fetchUsers(params)
    if (token !== fetchToken) return
    const data = Array.isArray(maybeData) ? maybeData : (Array.isArray(users.value) ? users.value : [])
    lastSnapshot.value = [...data]
  } catch (e) {
    console.error(e)
    toast.error('Failed to load users.')
  } finally {
    if (token === fetchToken) refreshing.value = false
  }
}

function onEmpFilterChange() {
  filters.value.user_id = filters.value.employee_id || ''
  syncUrl()
}

function search() {
  if (!hasOrg.value) return toast.error('Select Company & Department')
  syncUrl()
}

function resetFilters() {
  filters.value = {
    company_id: '', department_id: '', employee_id: '', line_type: '',
    user_id: '', finalized: '', q: '',
  }
  sortBy.value = 'name'
  sortDir.value = 'asc'
  syncUrl()
}

function toggleSort(nextBy) {
  if (sortBy.value === nextBy) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortBy.value = nextBy
    sortDir.value = 'asc'
  }
  syncUrl()
}

function openReview(row) {
  const employeeId = row?.id
  if (employeeId) router.push({ name: 'KpiReview', params: { employeeId } })
}

/* export (visible rows) */
function exportCsv() {
  if (!sortedRows.value.length) return
  const headers = ['#','User','Cycle','Submitted','Total','Pending','Stage','Progress%']
  const lines = sortedRows.value.map((r, i) => {
    const name = r?.name ?? `#${r?.id}`
    const cyc  = cycleLabel(r)
    const p    = getProgress(r)
    return [
      i + 1,
      `"${name.replace(/"/g,'""')}"`,
      `"${String(cyc).replace(/"/g,'""')}"`,
      p.submitted,
      p.total,
      p.pending,
      p.stage,
      p.percent
    ].join(',')
  })
  const csv = [headers.join(','), ...lines].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'kpi-progress.csv'
  a.click()
  URL.revokeObjectURL(url)
}

/* mirror employee_id -> user_id */
watch(() => filters.value.employee_id, v => { filters.value.user_id = v || '' })

/* auto-sync */
watch(() => filters.value.q, () => { if (hasOrg.value) debouncedSyncUrl() })
watch(() => [filters.value.finalized, filters.value.line_type], () => { if (hasOrg.value) syncUrl() })

onMounted(async () => {
  await nextTick()
  if (hasOrg.value) await load()
})
</script>

<template>
  <div class="space-y-4 px-4 max-w-7xl mx-auto my-6">
    <!-- Sticky header with stats -->
    <div class="sticky top-0 z-10 -mx-4 px-4 bg-white/80 backdrop-blur border-b">
      <div class="flex flex-col gap-3 py-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 class="text-lg md:text-xl font-semibold">User KPI Progress</h1>
          <p class="text-xs text-slate-600 mt-0.5">Select company/department to see progress stage per user.</p>
        </div>

        <div class="flex items-center gap-2">
          <div class="hidden md:flex items-center gap-2 text-xs">
            <span class="px-2 py-1 rounded-full bg-slate-100 text-slate-700">Total: {{ stat.total }}</span>
            <span class="px-2 py-1 rounded-full bg-emerald-100 text-emerald-700">Completed: {{ stat.completed }}</span>
            <span class="px-2 py-1 rounded-full bg-amber-100 text-amber-700">In progress: {{ stat.inProgress }}</span>
            <span class="px-2 py-1 rounded-full bg-slate-100 text-slate-700">Not started: {{ stat.notStarted }}</span>
          </div>

          <button
            class="h-9 rounded-md border border-slate-300 px-3 text-xs md:text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            :disabled="!sortedRows.length"
            @click="exportCsv"
          >
            Export CSV
          </button>
        </div>
      </div>
    </div>

    <!-- Filters card -->
    <div class="rounded-xl border bg-white p-4 md:p-5 shadow-sm">
      <div class="grid gap-4 md:grid-cols-12">
        <div class="col-span-full">
          <label class="mb-1 block text-sm font-medium text-slate-700">Employee scope</label>
          <EmployeeFilter
            v-model:company_id="filters.company_id"
            v-model:department_id="filters.department_id"
            v-model:employee_id="filters.employee_id"
            v-model:line_type="filters.line_type"
            :with-type="true"
            :initial-value="{ ...$route.query }"
            @filter-change="onEmpFilterChange"
            class="w-full"
          />
          <p class="mt-1 text-[11px] text-slate-500">Reset করলে আগের data দেখাবে যতক্ষণ না নতুন scope select করো।</p>
        </div>

        <!-- Search -->
        <div class="md:col-span-4">
          <label class="mb-1 block text-sm font-medium text-slate-700">Search</label>
          <input
            v-model.trim="filters.q"
            @keyup.enter="search"
            :placeholder="hasOrg ? 'Search name, type…' : 'Select company & department first'"
            class="h-9 w-full rounded-md border border-slate-300 px-3 text-sm disabled:bg-slate-100"
            :disabled="!hasOrg"
          />
        </div>

        <!-- Sort -->
        <div class="md:col-span-3">
          <label class="mb-1 block text-sm font-medium text-slate-700">Sort by</label>
          <select
            class="h-9 w-full rounded-md border border-slate-300 px-2 text-sm"
            v-model="sortBy"
            @change="toggleSort(sortBy)"
          >
            <option value="name">Name</option>
            <option value="progress">Progress</option>
            <option value="stage">Stage</option>
          </select>
        </div>

        <div class="md:col-span-1">
          <label class="mb-1 block text-sm font-medium text-slate-700">Order</label>
          <button
            class="h-9 w-full rounded-md border border-slate-300 text-sm hover:bg-slate-50"
            @click="toggleSort(sortBy)"
          >
            {{ sortDir === 'asc' ? 'Asc' : 'Desc' }}
          </button>
        </div>

        <div class="md:col-span-2 flex items-end justify-end gap-2">
          <button
            class="h-9 rounded-md border border-slate-300 px-3 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            :disabled="!hasFilters"
            @click="resetFilters"
          >
            Reset
          </button>
        </div>
      </div>
    </div>

    <!-- Loader / Error -->
    <div v-if="isBusy && !baseRows.length" class="py-8 text-center">
      <LoaderView />
    </div>
    <div v-else-if="usersError || error" class="rounded-md border border-red-200 bg-red-50 p-3 text-red-700">
      {{ usersError || error }}
    </div>

    <!-- Table -->
    <div v-else class="relative overflow-x-auto rounded-xl border bg-white shadow-sm">
      <div
        v-if="refreshing"
        class="absolute inset-0 grid place-items-center bg-white/50 backdrop-blur-[1px] z-10"
        aria-live="polite"
        aria-busy="true"
      >
        <LoaderView />
      </div>

      <table class="min-w-full text-sm">
        <thead class="sticky top-0 bg-gray-100">
          <tr class="text-left text-gray-700">
            <th class="px-3 py-2 w-12">#</th>
            <th class="px-3 py-2">User</th>
            <th class="px-3 py-2">Cycle</th>
            <th class="px-3 py-2 w-[340px]">Progress</th>
            <th class="px-3 py-2">Stage</th>
            <th class="px-3 py-2">Completed Stage</th>
            <th class="px-3 py-2 text-right w-40">Actions</th>
          </tr>
        </thead>

        <tbody>
          <tr v-for="(row, i) in sortedRows" :key="row.id" class="border-t hover:bg-slate-50/50">
            <td class="px-3 py-2">{{ i + 1 }}</td>

            <td class="px-3 py-2">
              <div class="flex items-center gap-3">
                <div class="h-8 w-8 rounded-full bg-slate-200 grid place-items-center text-xs font-medium text-slate-700">
                  {{ (row?.name || '#').slice(0,1).toUpperCase() }}
                </div>
                <div>
                  <div class="font-medium text-slate-900">{{ row?.name ?? ('#' + row.id) }}</div>
                  <div class="text-[11px] text-slate-500">
                    {{ row?.department?.name || '—' }}
                    <span v-if="row?.type" class="mx-1">•</span>
                    <span v-if="row?.type">{{ row.type }}</span>
                  </div>
                </div>
              </div>
            </td>

            <td class="px-3 py-2">
              <span class="text-xs text-slate-700">{{ cycleLabel(row) }}</span>
            </td>

            <td class="px-3 py-2">
              <div class="flex items-center gap-3">
                <div class="w-full max-w-[260px]">
                  <div class="h-2 rounded-full bg-slate-200 overflow-hidden">
                    <div
                      class="h-2 rounded-full bg-slate-700"
                      :style="{ width: (getProgress(row).percent || 0) + '%' }"
                    />
                  </div>
                  <div class="mt-1 text-[11px] text-slate-600">
                    {{ getProgress(row).submitted }} / {{ getProgress(row).total }}
                    <span class="mx-1">•</span>
                    Pending: {{ getProgress(row).pending }}
                    <span class="mx-1">•</span>
                    {{ getProgress(row).percent }}%
                  </div>
                </div>
              </div>
            </td>

            <td class="px-3 py-2">
              <span
                class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
                :class="stageBadge(row).cls"
              >
                {{ stageBadge(row).label }}
              </span>
            </td>

            <td class="px-3 py-2">
              <div class="flex flex-col gap-1">
                <!-- <span class="text-[11px] font-semibold tracking-wide text-slate-400 uppercase">Completed lane</span> -->
                <span
                  class="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset"
                  :class="completedStageInfo(row).cls"
                >
                  {{ completedStageInfo(row).label }}
                </span>
                <!-- <span class="text-[11px] text-slate-500">
                  {{ completedStageInfo(row).detail }}
                </span> -->
              </div>
            </td>

            <td class="px-3 py-2 text-right">
              <div class="flex items-center justify-end gap-2">
                <button
                  class="h-9 px-3 rounded-md border border-slate-300 text-sm hover:bg-slate-50"
                  @click="openReview(row)"
                >
                  Open
                </button>
              </div>
            </td>
          </tr>

          <tr v-if="!sortedRows.length">
            <td colspan="6" class="px-3 py-6 text-center text-gray-600">
              {{ hasOrg ? 'No users found for this scope.' : 'Select company & department to see users.' }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
