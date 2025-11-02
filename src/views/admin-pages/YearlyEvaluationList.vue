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
// kpiStore.fetchUsers({ company_id, department_id?, employee_id?, user_id?, line_type?, finalized?, q? })

/* ===== filters (no pagination) ===== */
const filters = ref({
  company_id:    route.query.company_id ? Number(route.query.company_id) : '',
  department_id: route.query.department_id ? Number(route.query.department_id) : '',
  employee_id:   route.query.employee_id ? Number(route.query.employee_id) : '',
  line_type:     route.query.line_type ?? '',
  user_id:       route.query.user_id ? Number(route.query.user_id) : '',
  finalized:     route.query.finalized ?? '', // '' | '0' | '1'
  q:             route.query.q ?? '',
})

/* ===== local UI state ===== */
const sortBy  = ref(route.query.sortBy || 'name') // name | grade | score | status
const sortDir = ref(route.query.sortDir || 'asc')  // asc | desc

/* ===== performance helpers ===== */
let debounceTimer = null
let fetchToken = 0
let lastParamsKey = ''
const refreshing = ref(false)          // show light overlay while refetching with previous data visible
const lastSnapshot = ref([])           // keeps last successful dataset for “previous data” behavior

/* ===== computed ===== */
const hasOrg = computed(() => !!filters.value.company_id && !!filters.value.department_id)
const hasFilters = computed(() =>
  hasOrg.value || filters.value.finalized !== '' || !!filters.value.line_type || !!filters.value.q
)
const isBusy = computed(() => loading.value)

/** base rows = current store users if we have org selected, otherwise last good snapshot */
const baseRows = computed(() => {
  return hasOrg.value ? (Array.isArray(users.value) ? users.value : []) : lastSnapshot.value
})

/* quick stats on what's currently visible */
const stat = computed(() => {
  let total = baseRows.value.length
  let fin = 0, prog = 0, none = 0
  for (const r of baseRows.value) {
    const st = r?.latest_kpi_result?.status
    if (st === 'finalized' || st === 'approved') fin++
    else if (st === 'in_progress' || st === 'draft') prog++
    else none++
  }
  return { total, fin, prog, none }
})

/* sorted rows (client-side, stable) applied on top of baseRows */
const sortedRows = computed(() => {
  const arr = [...baseRows.value]
  const d = sortDir.value === 'desc' ? -1 : 1
  const key = sortBy.value

  const getScore = (r) => Number(r?.latest_kpi_result?.final_obtained ?? -Infinity)
  const getGrade = (r) => String(r?.latest_kpi_result?.grade ?? '')
  const getStatusRank = (r) => {
    const st = r?.latest_kpi_result?.status
    if (st === 'finalized' || st === 'approved') return 0
    if (st === 'in_progress' || st === 'draft')   return 1
    return 2
  }

  arr.sort((a, b) => {
    if (key === 'score')  return (getScore(a) > getScore(b) ? 1 : getScore(a) < getScore(b) ? -1 : 0) * d
    if (key === 'grade')  return getGrade(a).localeCompare(getGrade(b)) * d
    if (key === 'status') return (getStatusRank(a) - getStatusRank(b)) * d
    // default: name
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

/* debounce helper so typing in Search does not spam API */
function debouncedSyncUrl() {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    if (hasOrg.value) syncUrl()
  }, 350)
}

/* Pull from URL, then load (single source of truth for fetching) */
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
    finalized:     filters.value.finalized, // '' | '0' | '1'
    q:             filters.value.q || undefined,
  }
}

async function load () {
  const params = buildParams()
  const key = JSON.stringify(params)
  if (key === lastParamsKey) return // no-op if nothing changed
  lastParamsKey = key

  const token = ++fetchToken
  // show overlay when we already have something to show
  refreshing.value = baseRows.value.length > 0

  try {
    const maybeData = await kpiStore.fetchUsers(params)
    // accept only the latest response
    if (token !== fetchToken) return
    // Prefer returned data if action returns it; fallback to store's users
    const data = Array.isArray(maybeData) ? maybeData : (Array.isArray(users.value) ? users.value : [])
    // capture a fresh snapshot for “previous data” behavior
    lastSnapshot.value = [...data]
  } catch (e) {
    console.error(e)
    toast.error('Failed to load users.')
  } finally {
    if (token === fetchToken) refreshing.value = false
  }
}

function onEmpFilterChange() {
  // Keep user_id in sync with employee_id for server-side narrowing
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
  // IMPORTANT: Do NOT clear lastSnapshot — we want previous data to keep showing
  syncUrl()
}

function toggleSort(nextBy) {
  if (sortBy.value === nextBy) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortBy.value = nextBy
    sortDir.value = 'asc'
  }
  // client-side only; no fetch needed
  syncUrl()
}

function openReview(row) {
  const employeeId = row?.id
  if (employeeId) {
    router.push({ name: 'KpiReview', params: { employeeId } })
  }
}

/* ===== helpers ===== */
function statusBadge(row) {
  const st = row?.latest_kpi_result?.status
  if (st === 'finalized' || st === 'approved')
    return { label: 'Finalized', cls: 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200' }
  if (st === 'in_progress' || st === 'draft')
    return { label: 'In progress', cls: 'bg-amber-100 text-amber-700 ring-1 ring-amber-200' }
  return { label: 'Not evaluated', cls: 'bg-slate-100 text-slate-700 ring-1 ring-slate-200' }
}

function gradeTone(grade) {
  const g = String(grade || '').toUpperCase()
  if (['A+', 'A'].includes(g)) return 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
  if (['A-', 'B+', 'B'].includes(g)) return 'bg-sky-50 text-sky-700 ring-1 ring-sky-200'
  if (['B-', 'C+', 'C'].includes(g)) return 'bg-amber-50 text-amber-700 ring-1 ring-amber-200'
  if (!g || g === '—') return 'text-slate-400'
  return 'bg-rose-50 text-rose-700 ring-1 ring-rose-200'
}

/* client CSV export (uses currently visible rows) */
function exportCsv() {
  if (!sortedRows.value.length) return
  const headers = ['#','User','Grade','Score','Status']
  const lines = sortedRows.value.map((r, i) => {
    const grade = r?.latest_kpi_result?.grade ?? ''
    const score = r?.latest_kpi_result?.final_obtained ?? ''
    const st    = statusBadge(r).label
    const name  = r?.name ?? `#${r?.id}`
    return [i+1, `"${name.replace(/"/g,'""')}"`, grade, score, st].join(',')
  })
  const csv = [headers.join(','), ...lines].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'kpi-users.csv'
  a.click()
  URL.revokeObjectURL(url)
}

/* mirror employee_id -> user_id */
watch(() => filters.value.employee_id, v => { filters.value.user_id = v || '' })

/* auto-search debounce: typing triggers URL sync (and then load) */
watch(() => filters.value.q, () => { if (hasOrg.value) debouncedSyncUrl() })
watch(() => [filters.value.finalized, filters.value.line_type], () => { if (hasOrg.value) syncUrl() })

/* driven by route watcher; just ensure first load if URL already had scope */
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
          <h1 class="text-lg md:text-xl font-semibold">User Yearly KPI Evaluations</h1>
          <p class="text-xs text-slate-600 mt-0.5">
            Filter by company/department, then refine by status or search.
          </p>
        </div>

        <div class="flex items-center gap-2">
          <div class="hidden md:flex items-center gap-2 text-xs">
            <span class="px-2 py-1 rounded-full bg-slate-100 text-slate-700">Total: {{ stat.total }}</span>
            <span class="px-2 py-1 rounded-full bg-emerald-100 text-emerald-700">Finalized: {{ stat.fin }}</span>
            <span class="px-2 py-1 rounded-full bg-amber-100 text-amber-700">In progress: {{ stat.prog }}</span>
            <span class="px-2 py-1 rounded-full bg-slate-100 text-slate-700">None: {{ stat.none }}</span>
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
        <!-- Employee scope -->
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
          <p class="mt-1 text-[11px] text-slate-500">Tip: resetting the scope keeps showing the previous results until you pick a new scope.</p>
        </div>

        <!-- Search -->
        <div class="md:col-span-4">
          <label class="mb-1 block text-sm font-medium text-slate-700">Search</label>
          <input
            v-model.trim="filters.q"
            @keyup.enter="search"
            :placeholder="hasOrg ? 'Search name, grade…' : 'Select company & department first'"
            class="h-9 w-full rounded-md border border-slate-300 px-3 text-sm disabled:bg-slate-100"
            :disabled="!hasOrg"
          />
        </div>

        <!-- Sort -->
        <div class="md:col-span-2">
          <label class="mb-1 block text-sm font-medium text-slate-700">Sort by</label>
          <select
            class="h-9 w-full rounded-md border border-slate-300 px-2 text-sm"
            v-model="sortBy"
            @change="toggleSort(sortBy)"
          >
            <option value="name">Name</option>
            <option value="grade">Grade</option>
            <option value="score">Score</option>
            <option value="status">Status</option>
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

        <!-- Actions -->
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

    <!-- Table (no pagination) -->
    <div v-else class="relative overflow-x-auto rounded-xl border bg-white shadow-sm">
      <!-- light overlay while refetching but keep previous rows visible -->
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
            <th class="px-3 py-2">Grade</th>
            <th class="px-3 py-2">Score</th>
            <th class="px-3 py-2">Status</th>
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
              <span
                class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
                :class="gradeTone(row?.latest_kpi_result?.grade)"
              >
                {{ row?.latest_kpi_result?.grade ?? '—' }}
              </span>
            </td>

            <td class="px-3 py-2">
              {{ row?.latest_kpi_result?.final_obtained ?? '—' }}
            </td>

            <td class="px-3 py-2">
              <span
                class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
                :class="statusBadge(row).cls"
              >
                {{ statusBadge(row).label }}
              </span>
            </td>

            <td class="px-3 py-2 text-right">
              <div class="flex items-center justify-end gap-2">
                <button class="h-9 px-3 rounded-md border border-slate-300 text-sm hover:bg-slate-50" @click="openReview(row)">
                  Open
                </button>
              </div>
            </td>
          </tr>

          <tr v-if="!sortedRows.length">
            <td colspan="6" class="px-3 py-6 text-center text-gray-600">
              {{ hasOrg ? 'No users found for this scope.' : 'Select company & department to see users (previous results remain visible on reset).' }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
