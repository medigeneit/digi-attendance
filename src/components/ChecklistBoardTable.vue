<script setup>
import { ref, computed, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useChecklistBoardStore } from '@/stores/checklistBoard'

const store = useChecklistBoardStore()
const router = useRouter()

/* ---------------- UI State ---------------- */
const q = ref('')
const showOnlyMissing = ref(false)
const sortBy = ref('progress_desc')
const saving = reactive({}) // { [userId]: true|false }

/* ---------------- Helpers ---------------- */
const rowOf = (u) => store.rows?.[String(u?.id)] || {}
const clamp = (v, min, max) => Math.min(Math.max(Number(v || 0), min), max)
const nice = (v) => (v < 0 ? 0 : v > 100 ? 100 : Math.round(v))
const asDate = (d) => (d ? new Date(d) : null)
const addMonths = (date, months) => {
  const dt = new Date(date.getTime())
  const m = dt.getMonth() + (months || 0)
  dt.setMonth(m)
  // handle month overflow (e.g., Jan 31 + 1m -> Mar 3x); normalize to last day of target month
  if (dt.getMonth() !== (m % 12 + 12) % 12) dt.setDate(0)
  return dt
}
const diffDays = (a, b) => Math.round((a - b) / 86400000)

/* ---------------- Progress (Checklist) ---------------- */
const actualPercent = (u) => {
  const r = rowOf(u)
  const val = r.percent ?? u?.percent ?? 0
  return clamp(val, 0, 100)
}
const targetPercent = (u) =>
  clamp(u?.checklist?.required_completion_percent ?? 100, 1, 100)

/* ---------------- Search ---------------- */
const personMatches = (u) => {
  const n = (s) => String(s || '').toLowerCase()
  const needle = n(q.value)
  if (!needle) return true
  return [u?.name, u?.employee_id, u?.department, u?.designation]
    .filter(Boolean)
    .some((v) => n(v).includes(needle))
}

/* ---------------- Nav ---------------- */
function goOpen(u) {
  const tplId = store.templateId
  if (!tplId) return
  router.push({
    name: 'checklist.create',
    params: { userId: u.id, templateId: tplId },
  })
}

/* ---------------- Sorting/Filtering ---------------- */
const preparedUsers = computed(() => {
  let arr = (store.users || []).filter(personMatches)
  if (showOnlyMissing.value) {
    arr = arr.filter((u) => actualPercent(u) < targetPercent(u))
  }
  if (sortBy.value === 'name_asc') {
    arr = [...arr].sort((a, b) => (a.name || '').localeCompare(b.name || ''))
  } else if (sortBy.value === 'progress_asc') {
    arr = [...arr].sort((a, b) => actualPercent(a) - actualPercent(b))
  } else {
    arr = [...arr].sort((a, b) => actualPercent(b) - actualPercent(a))
  }
  return arr
})

/* ---------------- Employment Type ---------------- */
// canonical values are lowercase; labels are nice-cased
const EMP_TYPES = [
  { value: 'probationary', label: 'Probationary' },
  { value: 'permanent', label: 'Permanent' },
  { value: 'contract', label: 'Contract' },
]
const normType = (v) => String(v || '').toLowerCase()

const typeLabel = (v) => {
  const t = normType(v)
  return EMP_TYPES.find((x) => x.value === t)?.label || '—'
}
const typeBadgeClass = (v) => {
  const t = normType(v)
  if (t === 'probationary') return 'bg-amber-50 text-amber-700 ring-amber-200'
  if (t === 'permanent') return 'bg-green-50 text-green-700 ring-green-200'
  if (t === 'contract') return 'bg-blue-50 text-blue-700 ring-blue-200'
  return 'bg-gray-50 text-gray-700 ring-gray-200'
}

async function changeEmploymentType(u, newValue) {
  if (!u?.id) return
  const next = normType(newValue)
  const prev = normType(u.employment_type)
  if (!EMP_TYPES.some((x) => x.value === next) || prev === next) return

  const prevLabel = typeLabel(u.employment_type)
  const nextLabel = typeLabel(next)

  saving[u.id] = true
  // optimistic
  u.employment_type = nextLabel
  try {
    // If your API expects Title Case, we pass the label
    await store.updateEmploymentType(u.id, nextLabel)
  } catch (e) {
    u.employment_type = prevLabel
    console.error(e)
    alert('Failed to update employment type. Please try again.')
  } finally {
    saving[u.id] = false
  }
}

function getProbationInfo(u) {
  const isProb = normType(u?.employment_type) === 'probationary'
  if (!isProb) return { enabled: false }

  const start = asDate(u?.joining_date) || asDate(u?.created_at)

  // months
  const baseMonths =
    Number(u?.probation_months) ||  0

  const extMonths = Number(u?.probation_extension_months) || 0

  if (!start || Number.isNaN(baseMonths)) return { enabled: false }

  const totalMonths = Math.max(1, baseMonths + (extMonths || 0))
  const end = addMonths(start, totalMonths)

  const today = new Date()
  const totalDays = Math.max(1, diffDays(end, start))
  const elapsedDays = Math.max(0, Math.min(totalDays, diffDays(today, start)))
  const leftDays = diffDays(end, today) // can be negative if overdue

  const pct = nice((elapsedDays / totalDays) * 100)
  const status =
    leftDays < 0 ? 'overdue' : leftDays <= 14 ? 'near_end' : 'active'

  return {
    enabled: true,
    start,
    end,
    pct,
    leftDays,
    status, // 'active' | 'near_end' | 'overdue'
  }
}

function getContractInfo(u) {
  const isContract = normType(u?.employment_type) === 'contract'
  if (!isContract) return { enabled: false }

  const start = asDate(u?.joining_date) || asDate(u?.created_at)

  // supports: contract_month | contract_months | contract_duration_months
  const baseMonths = Number(
    u?.contract_month ?? u?.contract_months ?? u?.contract_duration_months ?? 0
  )
  const extMonths = Number(u?.contract_extension_months ?? 0)

  if (!start || Number.isNaN(baseMonths) || baseMonths <= 0) {
    return { enabled: false }
  }

  const totalMonths = Math.max(1, baseMonths + (extMonths || 0))
  const end = addMonths(start, totalMonths)

  const today = new Date()
  const totalDays   = Math.max(1, diffDays(end, start))
  const elapsedDays = Math.max(0, Math.min(totalDays, diffDays(today, start)))
  const leftDays    = diffDays(end, today)

  const pct = nice((elapsedDays / totalDays) * 100)
  // near_end: 30 days window (change to 14 if you prefer)
  const status = leftDays < 0 ? 'overdue' : leftDays <= 30 ? 'near_end' : 'active'

  return { enabled: true, start, end, pct, leftDays, status }
}

const fmtDate = (d) =>
  d ? d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : ''

// percent short/over info (UI label)
const checklistInfo = (actual, target) => {
  const a = clamp(actual, 0, 100)
  const t = clamp(target, 1, 100)
  const diff = Math.max(0, t - a)
  return a >= t ? { text: 'Met', tone: 'ok', diff: 0 } : { text: `Short by ${diff}%`, tone: 'warn', diff }
}

// palette helpers
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
  return {
    track: base === 'blue' ? 'bg-blue-100' : 'bg-amber-100',
    fill : base === 'blue' ? 'bg-blue-500' : 'bg-amber-500',
    tone : 'text-gray-600'
  }
}
</script>

<template>
  <div class="space-y-4">
    <!-- Toolbar -->
    <div class="flex flex-wrap items-center gap-2">
      <div class="relative">
        <input
          v-model="q"
          type="search"
          placeholder="Search name / ID / dept / designation…"
          class="w-64 md:w-80 max-w-full rounded-lg border bg-white/90 px-8 py-2 text-sm outline-none focus:border-gray-400"
        />
        <svg class="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M12.9 14.32a8 8 0 111.414-1.414l3.387 3.387a1 1 0 01-1.414 1.414L12.9 14.32zM14 8a6 6 0 11-12 0 6 6 0 0112 0z" clip-rule="evenodd"/></svg>
        <button
          v-if="q"
          class="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-500"
          @click="q = ''"
          aria-label="Clear search"
        >✕</button>
      </div>

      <div class="rounded-lg border p-1 text-xs">
        <button
          class="rounded-md px-2 py-1"
          :class="showOnlyMissing ? '' : 'bg-gray-900 text-white'"
          @click="showOnlyMissing = false"
        >All</button>
        <button
          class="rounded-md px-2 py-1"
          :class="showOnlyMissing ? 'bg-gray-900 text-white' : ''"
          @click="showOnlyMissing = true"
          title="Show only users below their checklist target"
        >Only Missing</button>
      </div>

      <select v-model="sortBy" class="rounded-md border bg-white px-2 py-1 text-xs outline-none">
        <option value="progress_desc">Sort: Progress ↓</option>
        <option value="progress_asc">Sort: Progress ↑</option>
        <option value="name_asc">Sort: Name A–Z</option>
      </select>

      <div class="ml-auto">
        <span class="inline-flex items-center rounded-full bg-blue-50 px-2 py-1 text-xs text-blue-700">
          Template: <span class="ml-1 font-medium">{{ store.templateId || 'Not selected' }}</span>
        </span>
      </div>
    </div>

    <!-- Table (dense & responsive) -->
    <div class="overflow-x-auto rounded-xl border shadow-sm">
      <table class="min-w-full text-[13px]">
        <thead class="sticky top-0 bg-gray-50/90 backdrop-blur">
          <tr class="text-left border-b">
            <th class="p-2 w-10">#</th>
            <th class="p-2 min-w-[220px]">User</th>
            <th class="p-2 hidden md:table-cell min-w-[160px]">Role</th>
            <th class="p-2 min-w-[260px]">Progress</th>
            <th class="p-2 w-44">Status</th>
            <th class="p-2 w-36">Actions</th>
          </tr>
        </thead>

        <tbody>
          <tr v-for="(u, idx) in preparedUsers" :key="u.id" class="border-b hover:bg-gray-50/70">
            <td class="p-2">{{ idx + 1 }}</td>

            <!-- User -->
            <td class="p-2">
              <div class="flex items-center gap-2">
                <div class="relative h-8 w-8 shrink-0">
                  <img v-if="u.avatar" :src="u.avatar" alt="" class="h-8 w-8 rounded-full object-cover" />
                  <div v-else class="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 text-[11px] font-semibold text-gray-700">
                    {{ (u.name || u.full_name || u.email || '??').slice(0,2).toUpperCase() }}
                  </div>
                </div>
                <div class="min-w-0">
                  <div class="font-medium truncate">{{ u.name || u.full_name || u.email }}</div>
                  <div class="text-[11px] text-gray-500 space-x-2 truncate">
                    <span v-if="u.joining_date">Joining Date: {{ u.joining_date }}</span>
                    <span class="hidden sm:inline">Dept: {{ u.department || '—' }}</span>
                  </div>
                </div>
              </div>
            </td>

            <!-- Role -->
            <td class="p-2 hidden md:table-cell">
              <div class="truncate" :title="u.designation">{{ u.designation || '—' }}</div>
            </td>

            <!-- Progress (Checklist + Probation micro bar) -->
            <!-- Progress (Checklist + Probation/Contract micro bars) -->
          <td class="p-2 card-bg mt-2 mb-2">
            <!-- Checklist progress -->
            <div class="group relative w-full border-b">
              <div class="relative h-2 w-full overflow-hidden rounded-full bg-gray-100 ring-1 ring-inset ring-gray-200">
                <!-- target marker -->
                <div
                  class="pointer-events-none absolute top-0 h-2 w-0.5 bg-gray-600/60"
                  :style="{ left: `calc(${targetPercent(u)}% - 1px)` }"
                />
                <!-- progress fill -->
                <div
                  class="h-2 transition-all duration-500 ease-out will-change-[width]"
                  :class="barGradient(actualPercent(u) >= targetPercent(u))"
                  :style="{ width: actualPercent(u) + '%' }"
                  :aria-valuemin="0"
                  :aria-valuemax="100"
                  :aria-valuenow="actualPercent(u)"
                  role="progressbar"
                />
              </div>

              <!-- labels row -->
              <div class="mt-1 flex items-center justify-between text-[11px] text-gray-600">
                <div class="flex items-center gap-2">
                  <span class="font-medium">Actual: {{ actualPercent(u) }}%</span>
                  <span class="hidden sm:inline">Target: {{ targetPercent(u) }}%</span>
                </div>
                <span
                  class="rounded-full px-1.5 py-0.5 ring-1 text-[10px]"
                  :class="( () => {
                    const info = checklistInfo(actualPercent(u), targetPercent(u))
                    return info.tone === 'ok'
                      ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                      : 'bg-amber-50 text-amber-700 ring-amber-200'
                  })()"
                >
                  {{ checklistInfo(actualPercent(u), targetPercent(u)).text }}
                </span>
              </div>

              <!-- hover detail (optional, subtle) -->
              <div
                class="pointer-events-none absolute inset-x-0 -bottom-6 hidden justify-between text-[10px] text-gray-500 group-hover:flex"
              >
                <span>Target marker indicates {{ targetPercent(u) }}%</span>
                <span>Progress updates live</span>
              </div>
            </div>

            <!-- Probation micro progress -->
            <template v-if="getProbationInfo(u).enabled">
              <div class="mt-1">
                <div
                  class="relative w-full h-1.5 overflow-hidden rounded-full"
                  :class="microColors(getProbationInfo(u).status).track"
                >
                  <div
                    class="h-1.5 transition-all duration-500 ease-out"
                    :class="microColors(getProbationInfo(u).status).fill"
                    :style="{ width: getProbationInfo(u).pct + '%' }"
                  />
                </div>
                <div class="mt-1 flex items-center justify-between text-[11px]"
                    :class="microColors(getProbationInfo(u).status).tone">
                  <span>Probation: {{ getProbationInfo(u).pct }}%</span>
                  <span v-if="getProbationInfo(u).leftDays >= 0">
                    {{ fmtDate(getProbationInfo(u).start) }} → {{ fmtDate(getProbationInfo(u).end) }} · {{ getProbationInfo(u).leftDays }}d left
                  </span>
                  <span v-else class="text-red-600">
                    {{ fmtDate(getProbationInfo(u).start) }} → {{ fmtDate(getProbationInfo(u).end) }} · Overdue {{ Math.abs(getProbationInfo(u).leftDays) }}d
                  </span>
                </div>
              </div>
            </template>

            <!-- Contract micro progress (always independent; চাইলে Probation-এর সাথে একসাথে দেখাবেন) -->
            <template v-if="getContractInfo(u).enabled">
              <div class="mt-1">
                <div
                  class="relative w-full h-1.5 overflow-hidden rounded-full"
                  :class="microColors(getContractInfo(u).status, 'blue').track"
                >
                  <div
                    class="h-1.5 transition-all duration-500 ease-out"
                    :class="microColors(getContractInfo(u).status, 'blue').fill"
                    :style="{ width: getContractInfo(u).pct + '%' }"
                  />
                </div>
                <div class="mt-1 flex items-center justify-between text-[11px]"
                    :class="microColors(getContractInfo(u).status, 'blue').tone">
                  <span>Contract: {{ getContractInfo(u).pct }}%</span>
                  <span v-if="getContractInfo(u).leftDays >= 0">
                    {{ fmtDate(getContractInfo(u).start) }} → {{ fmtDate(getContractInfo(u).end) }} · {{ getContractInfo(u).leftDays }}d left
                  </span>
                  <span v-else class="text-red-600">
                    {{ fmtDate(getContractInfo(u).start) }} → {{ fmtDate(getContractInfo(u).end) }} · Expired {{ Math.abs(getContractInfo(u).leftDays) }}d
                  </span>
                </div>
              </div>
            </template>
          </td>


            <!-- Status -->
            <td class="p-2">
              <div class="flex items-center gap-2">
                <span
                  class="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] ring-1"
                  :class="typeBadgeClass(u.employment_type)"
                >
                  {{ typeLabel(u.employment_type) }}
                </span>

                <div class="relative">
                  <select
                    :disabled="!!saving[u.id]"
                    :value="normType(u.employment_type)"
                    class="rounded-md border bg-white px-2 py-1 text-[11px] outline-none disabled:opacity-50"
                    @change="e => changeEmploymentType(u, e.target.value)"
                    aria-label="Change employment type"
                  >
                    <option v-for="t in EMP_TYPES" :key="t.value" :value="t.value">
                      {{ t.label }}
                    </option>
                  </select>
                  <svg
                    v-if="saving[u.id]"
                    class="absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 animate-spin text-gray-400"
                    viewBox="0 0 24 24"
                  >
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" fill="none"/>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v3A5 5 0 007 12H4z"/>
                  </svg>
                </div>
              </div>
            </td>

            <!-- Actions -->
            <td class="p-2">
              <button
                class="px-3 py-1.5 rounded-md text-[12px] font-medium bg-gray-900 text-white hover:bg-black disabled:opacity-40"
                :disabled="!store.templateId"
                :title="store.templateId ? '' : 'Select a template first'"
                @click="goOpen(u)"
              >
                {{ u?.checklist ? 'Open' : 'Create' }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Empty/Loading -->
    <div v-if="store.loading" class="text-gray-600 text-sm">Loading…</div>
    <div
      v-else-if="!store.loading && preparedUsers.length === 0"
      class="rounded-xl border border-dashed p-10 text-center text-sm text-gray-500"
    >
      No users found for the current filters.
    </div>
  </div>
</template>
