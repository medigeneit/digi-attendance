<script setup>
import EmployeeFilter from '@/components/common/EmployeeFilter.vue'
import FlexibleDatePicker from '@/components/FlexibleDatePicker.vue'
import LoaderView from '@/components/common/LoaderView.vue'
import UpdateOrCreate from '@/components/paycut/UpdateOrCreate.vue'
import { useAuthStore } from '@/stores/auth'
import { usePaycutStore } from '@/stores/paycut'
import { ref, onMounted, watch, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const authStore = useAuthStore()
const router = useRouter()
const route = useRoute()
const payCutStore = usePaycutStore()

// ---------- State ----------
const selectedMonth = ref(route.query.month || new Date().toISOString().slice(0, 7))
const pad = (value) => value.toString().padStart(2, '0')
const period = ref({
  year: Number(selectedMonth.value.split('-')[0] || new Date().getFullYear()),
  month: Number(selectedMonth.value.split('-')[1] || new Date().getMonth() + 1),
  day: 1,
})
const periodMonth = computed(() => {
  if (!period.value.year || !period.value.month) return ''
  return `${period.value.year}-${pad(period.value.month)}`
})
const filters = ref({
  company_id: route.query.company_id || '',
  department_id: route.query.department_id || '',
  line_type: route.query.line_type || 'all',
  employee_id: route.query.employee_id || ''
})
const loading = ref(false)
const totalPaycuts = computed(() => payCutStore.paycuts.length)
const statusSummary = computed(() => {
  const summary = { total: 0, pending: 0, approved: 0, rejected: 0 }
  const list = payCutStore.paycuts || []
  summary.total = list.length
  list.forEach((cut) => {
    const s = (cut.status || '').toLowerCase()
    if (s === 'pending') summary.pending++
    else if (s === 'approved') summary.approved++
    else if (s === 'rejected') summary.rejected++
  })
  return summary
})
const statusChip = (status) => {
  const key = (status || '').toLowerCase()
  if (key === 'approved') return 'text-emerald-700 bg-emerald-50 border border-emerald-100'
  if (key === 'rejected') return 'text-rose-700 bg-rose-50 border border-rose-100'
  if (key === 'pending') return 'text-amber-700 bg-amber-50 border border-amber-100'
  return 'text-slate-700 bg-slate-100 border border-slate-200'
}

// ---------- Helpers ----------
async function fetchPaycutListData () {
  // Guard: need month + company
  if (!periodMonth.value || !filters.value.company_id) {
    payCutStore.paycuts = [] // optional: clear list if not fetchable
    return
  }

  const query = {
    month: periodMonth.value,
    company_id: String(filters.value.company_id)
  }
  if (filters.value.employee_id) query.user_id = String(filters.value.employee_id)

  loading.value = true
  try {
    await payCutStore.fetchPaycuts(query)
  } finally {
    loading.value = false
  }
}

function buildQueryFromFilters () {
  const q = {}

  if (periodMonth.value) q.month = String(periodMonth.value)
  if (filters.value.company_id) q.company_id = String(filters.value.company_id)
  if (filters.value.department_id) q.department_id = String(filters.value.department_id) // keep only when not empty
  if (filters.value.employee_id) q.employee_id = String(filters.value.employee_id)
  if (filters.value.line_type && filters.value.line_type !== 'all') q.line_type = String(filters.value.line_type)

  return q
}

let qTimer = null
function syncQueryDebounced () {
  if (qTimer) clearTimeout(qTimer)
  qTimer = setTimeout(() => {
    const next = buildQueryFromFilters()
    router.replace({ query: next }).catch(() => {})
  }, 120)
}

// Debounced apply + fetch with fetch-key guard
let applyTimer = null
const lastKey = ref('')
async function runApply () {
  // Sync URL
  syncQueryDebounced()

  // Build key for fetch guard
  const key = JSON.stringify({
    m: periodMonth.value || '',
    c: filters.value.company_id || '',
    d: filters.value.department_id || '',
    t: filters.value.line_type || 'all',
    e: filters.value.employee_id || ''
  })

  if (key !== lastKey.value) {
    await fetchPaycutListData()
    lastKey.value = key
  }
}
function scheduleApply () {
  if (applyTimer) clearTimeout(applyTimer)
  applyTimer = setTimeout(runApply, 200)
}

// ---------- Watches ----------
watch(
  () => ({ ...filters.value, month: periodMonth.value }),
  () => scheduleApply(),
  { deep: true }
)

watch(periodMonth, () => {
  if (!periodMonth.value) return
  selectedMonth.value = periodMonth.value
  scheduleApply()
})

// Optional: if route gets changed externally, rehydrate (rare)
watch(
  () => route.query,
  (q) => {
    // Only adopt changes if different (prevents loops)
    const nextMonth = q.month || ''
    if (nextMonth !== selectedMonth.value) {
      selectedMonth.value = nextMonth
      period.value.year = Number(nextMonth.split('-')[0] || period.value.year)
      period.value.month = Number(nextMonth.split('-')[1] || period.value.month)
    }

    const next = {
      company_id: q.company_id || '',
      department_id: q.department_id || '',
      line_type: q.line_type || 'all',
      employee_id: q.employee_id || ''
    }
    const cur = filters.value
    if (
      next.company_id !== cur.company_id ||
      next.department_id !== cur.department_id ||
      next.line_type !== cur.line_type ||
      next.employee_id !== cur.employee_id
    ) {
      filters.value = next
    }
  }
)

// First load
onMounted(async () => {
  scheduleApply()
})

// Called from EmployeeFilter via @filter-change
function handleFilterChange () {
  scheduleApply()
}

async function deletePaycut (id) {
  const confirmed = confirm('Are you sure you want to delete this paycut?')
  if (!confirmed) return
  await payCutStore.deletePaycut(id)
  await fetchPaycutListData()
}

const formatDate = (ts) => {
  if (!ts) return ''
  const d = new Date(ts)
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

</script>

<template>
  <div class="px-4 space-y-5">
    <div class="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div>
        <p class="text-xs uppercase tracking-widest text-slate-500">Monthly Paycut</p>
        <h1 class="text-2xl font-semibold text-slate-900">Paycut log</h1>
        <p class="text-sm text-slate-500">Use filters to narrow down the report.</p>
      </div>
      <div class="flex flex-wrap gap-2 p-3 rounded-2xl border border-white/20
         bg-white/60 backdrop-blur-md shadow-sm
         supports-[backdrop-filter]:bg-white/50 sticky top-14">
        <EmployeeFilter
          v-model:company_id="filters.company_id"
          v-model:department_id="filters.department_id"
          v-model:employee_id="filters.employee_id"
          v-model:line_type="filters.line_type"
          :with-type="true"
          :initial-value="$route.query"
          @filter-change="handleFilterChange"
          class="min-w-[220px]"
        >
        <div class="relative">
          <label class="top-label -top-1">Month</label>
          <FlexibleDatePicker
            v-model="period"
            :show-year="false"
            :show-month="true"
            :show-date="false"
          />
        </div>
        </EmployeeFilter>
      </div>
    </div>

    <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
      <div class="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
        <p class="text-[11px] uppercase tracking-wider text-slate-500">Total</p>
        <p class="text-2xl font-semibold text-slate-900">{{ statusSummary.total }}</p>
      </div>
      <div class="rounded-2xl border border-slate-100 bg-white px-4 py-3">
        <p class="text-[11px] uppercase tracking-wider text-slate-500">Pending</p>
        <p class="text-xl font-semibold text-amber-700">{{ statusSummary.pending }}</p>
      </div>
      <div class="rounded-2xl border border-slate-100 bg-white px-4 py-3">
        <p class="text-[11px] uppercase tracking-wider text-slate-500">Approved</p>
        <p class="text-xl font-semibold text-emerald-700">{{ statusSummary.approved }}</p>
      </div>
      <div class="rounded-2xl border border-slate-100 bg-white px-4 py-3">
        <p class="text-[11px] uppercase tracking-wider text-slate-500">Rejected</p>
        <p class="text-xl font-semibold text-rose-700">{{ statusSummary.rejected }}</p>
      </div>
    </div>

    <LoaderView v-if="loading" />

    <div v-else class="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div class="overflow-x-auto">
        <table class="min-w-full text-sm">
          <thead class="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th class="px-4 py-3 text-left">#</th>
              <th class="px-4 py-3 text-left">Employee</th>
              <th class="px-4 py-3 text-left">Created Date</th>
              <th class="px-4 py-3 text-left">Paycut Hours</th>
              <th class="px-4 py-3 text-left">Reason</th>
              <th class="px-4 py-3 text-left">Note</th>
              <th class="px-4 py-3 text-left">Status</th>
              <th class="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(cut, index) in payCutStore.paycuts"
              :key="cut.id"
              class="border-t hover:bg-slate-50 transition-colors"
            >
              <td class="px-4 py-3">{{ index + 1 }}</td>
              <td class="px-4 py-3">{{ cut.user?.name || 'N/A' }}</td>
              <td class="px-4 py-3">{{ formatDate(cut.created_at) }}</td>
              <td class="px-4 py-3">{{ cut.paycut_hours }}</td>
              <td class="px-4 py-3">{{ cut.reason || '—' }}</td>
              <td class="px-4 py-3">{{ cut.note || '—' }}</td>
              <td class="px-4 py-3">
                <span
                  class="inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold tracking-wide border"
                  :class="statusChip(cut.status)"
                >
                  {{ cut.status || 'Pending' }}
                </span>
              </td>
              <td class="px-4 py-3 text-right">
                <div class="flex items-center justify-end gap-2">
                  <UpdateOrCreate
                    v-if="authStore.user?.id === 8"
                    :userId="cut.user_id"
                    :month="selectedMonth"
                    @updated="fetchPaycutListData"
                  />
                  <button type="button" class="text-red-500" @click="deletePaycut(cut.id)">
                    <i class="fa fa-trash"></i>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-if="!payCutStore.paycuts.length" class="px-4 py-10 text-center text-slate-500">
        <p v-if="!filters.company_id">Please select a company to load paycut data.</p>
        <p v-else>No paycuts found for the selected filters.</p>
      </div>
    </div>
  </div>
</template>
