<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'
import { storeToRefs } from 'pinia'
import EmployeeFilter from '@/components/common/EmployeeFilter.vue'
import FlexibleDatePicker from '@/components/FlexibleDatePicker.vue'
import PaginationBar from '@/components/PaginationBar.vue'
import AdjustmentStatusBadge from '@/components/payroll/adjustments/AdjustmentStatusBadge.vue'
import { useAdjustmentStore } from '@/stores/adjustmentStore'
import { formatCurrency } from '@/utils/currency'

defineOptions({ name: 'PayrollAdjustmentIndex' })

const route   = useRoute()
const router  = useRouter()
const toast   = useToast()
const store   = useAdjustmentStore()
const { adjustments: list, loading, error, pagination } = storeToRefs(store)

// ── Helpers ───────────────────────────────────────────────────────────────────
const defaultMonth = () => new Date().toISOString().slice(0, 7)

const monthToPeriod = (v) => {
  const m = String(v || '').slice(0, 7)
  if (!/^\d{4}-\d{2}$/.test(m)) return { year: null, month: null, day: 1 }
  return { year: Number(m.slice(0, 4)), month: Number(m.slice(5, 7)), day: 1 }
}
const periodToMonth = (v) => {
  if (!v?.year || !v?.month) return ''
  return `${v.year}-${String(v.month).padStart(2, '0')}`
}
const parseQueryInt = (v, fb = 1) => {
  const n = Number.parseInt(String(v ?? ''), 10)
  return Number.isNaN(n) ? fb : n
}

// ── Filters ───────────────────────────────────────────────────────────────────
const filters = ref({
  month:         defaultMonth(),
  company_id:    '',
  department_id: '',
  employee_id:   '',
  line_type:     'all',
  status:        '',
  page:          1,
  per_page:      15,
})
const showFilters = ref(false)

const monthPeriod = computed({
  get: () => monthToPeriod(filters.value.month),
  set: (v) => { filters.value.month = periodToMonth(v) },
})

const monthLabel = computed(() => {
  const raw = filters.value.month
  if (!raw) return ''
  const [y, m] = raw.split('-')
  return new Date(Number(y), Number(m) - 1).toLocaleString('en-US', { month: 'short', year: 'numeric' })
})

// ── Status tabs ───────────────────────────────────────────────────────────────
const statusTabs = [
  { value: '',         label: 'All',            dot: 'bg-slate-400'   },
  { value: 'pending',  label: 'Pending',         dot: 'bg-amber-400'   },
  { value: 'verified', label: 'Verified',        dot: 'bg-blue-400'    },
  { value: 'approved', label: 'Ready to Apply',  dot: 'bg-emerald-400' },
  { value: 'carried',  label: 'Applied',         dot: 'bg-indigo-400'  },
]

// ── Build params ──────────────────────────────────────────────────────────────
const buildParams = () => {
  const p = {}
  if (filters.value.month) {
    p.ref_year  = Number(filters.value.month.slice(0, 4))
    p.ref_month = Number(filters.value.month.slice(5, 7))
  }
  if (filters.value.company_id)    p.company_id    = filters.value.company_id
  if (filters.value.department_id) p.department_id = filters.value.department_id
  if (filters.value.employee_id)   p.employee_id   = filters.value.employee_id
  if (filters.value.line_type && filters.value.line_type !== 'all') p.line_type = filters.value.line_type
  if (filters.value.status)        p.status        = filters.value.status
  p.page     = filters.value.page
  p.per_page = filters.value.per_page
  return p
}

const hydrateFromQuery = () => {
  const q = route.query || {}
  const year  = q.ref_year  ? String(q.ref_year)  : ''
  const month = q.ref_month ? String(q.ref_month).padStart(2, '0') : ''
  filters.value = {
    month:         q.month ? String(q.month).slice(0, 7)
                           : (year && month ? `${year}-${month}` : defaultMonth()),
    company_id:    q.company_id    ? String(q.company_id)    : '',
    department_id: q.department_id ? String(q.department_id) : '',
    employee_id:   q.employee_id   ? String(q.employee_id)   : '',
    line_type:     q.line_type     ? String(q.line_type)     : 'all',
    status:        q.status        ? String(q.status)        : '',
    page:          parseQueryInt(q.page, 1),
    per_page:      parseQueryInt(q.per_page, 15),
  }
}

const load = async () => {
  const params = buildParams()
  const query  = { ...params, month: filters.value.month }
  delete query.ref_year
  delete query.ref_month
  await router.replace({ query })
  try {
    await store.fetchAll(params)
  } catch (e) {
    toast.error(e.message || 'Failed to load adjustments.')
  }
}

const onFilterChange = (payload = {}) => {
  filters.value.company_id    = payload.company_id    || ''
  filters.value.department_id = payload.department_id || ''
  filters.value.employee_id   = payload.employee_id   || ''
  filters.value.line_type     = payload.line_type     || 'all'
  filters.value.page = 1
  load()
}

const setTab = (status) => {
  filters.value.status = status
  filters.value.page   = 1
  load()
}

const pageChanged = (page) => { filters.value.page = page; load() }

// ── Stats ─────────────────────────────────────────────────────────────────────
const pendingCount  = computed(() => list.value.filter(r => r.status === 'pending').length)
const approvedCount = computed(() => list.value.filter(r => r.status === 'approved').length)

// ── Row actions ───────────────────────────────────────────────────────────────
const verifyingId = ref(null)
const deletingId  = ref(null)

const verifyRow = async (row) => {
  const note = window.prompt('Approval note (optional):', '')
  if (note === null) return
  verifyingId.value = row.id
  try {
    await store.verify(row.id, note)
    toast.success('Adjustment marked ready to apply.')
    await load()
  } catch (e) {
    toast.error(e.message || 'Action failed.')
  } finally {
    verifyingId.value = null
  }
}

const deleteRow = async (row) => {
  if (!['pending', 'rejected'].includes(row.status)) return
  if (!confirm(`Delete adjustment for ${row.employee?.name || 'this employee'}?`)) return
  deletingId.value = row.id
  try {
    await store.remove(row.id)
    toast.success('Deleted.')
    await load()
  } catch (e) {
    toast.error(e.message || 'Delete failed.')
  } finally {
    deletingId.value = null
  }
}

onMounted(() => {
  hydrateFromQuery()
  load()
})
</script>

<template>
  <div class="space-y-0 bg-slate-50 min-h-screen">

    <!-- ── Sticky Toolbar ─────────────────────────────────────────────────── -->
    <div class="sticky top-0 z-20 border-b border-slate-200 bg-white px-4 py-2.5 shadow-sm">
      <div class="flex flex-wrap items-center justify-between gap-2">

        <!-- Left: title + meta -->
        <div class="flex items-center gap-3 min-w-0">
          <div class="min-w-0">
            <div class="flex items-center gap-2">
              <span class="text-[10px] font-bold uppercase tracking-[0.22em] text-rose-500">Payroll</span>
              <span class="text-slate-300">/</span>
              <span class="text-sm font-bold text-slate-800">Post-Payroll Adjustments</span>
              <span v-if="monthLabel" class="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-600">
                {{ monthLabel }}
              </span>
              <svg v-if="loading" class="h-3.5 w-3.5 animate-spin text-rose-400" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
              </svg>
            </div>
            <!-- Mini stats -->
            <div class="mt-0.5 flex items-center gap-3 text-[11px]">
              <span class="text-amber-600">
                <span class="font-bold">{{ pendingCount }}</span> pending
              </span>
              <span class="text-slate-300">|</span>
              <span class="text-emerald-600">
                <span class="font-bold">{{ approvedCount }}</span> ready to apply
              </span>
            </div>
          </div>
        </div>

        <!-- Right: actions -->
        <div class="flex items-center gap-1.5">
          <button
            type="button"
            class="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
            @click="showFilters = !showFilters"
          >
            <i class="far fa-filter text-[10px]"></i>
            Filter
            <i :class="['far text-[10px] ml-0.5', showFilters ? 'fa-chevron-up' : 'fa-chevron-down']"></i>
          </button>
          <button
            type="button"
            class="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50"
            @click="router.push({ name: 'PayrollAdjustmentCarryPreview' })"
          >
            <i class="far fa-eye text-[10px]"></i>
            Carry Preview
          </button>
          <button
            type="button"
            class="inline-flex items-center gap-1 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-rose-700"
            @click="router.push({ name: 'PayrollAdjustmentCreate' })"
          >
            <i class="far fa-plus text-[10px]"></i>
            New Adjustment
          </button>
        </div>
      </div>

      <!-- ── Filter panel ──────────────────────────────────────────────── -->
      <div v-if="showFilters" class="mt-2.5 space-y-2 border-t border-slate-100 pt-2.5">
        <EmployeeFilter
          :company_id="filters.company_id"
          :department_id="filters.department_id"
          :employee_id="filters.employee_id"
          :line_type="filters.line_type"
          @filter-change="onFilterChange"
        >
          <FlexibleDatePicker
            v-model="monthPeriod"
            :show-year="false"
            :show-month="true"
            :show-date="false"
            label="Month"
            @change="filters.page = 1; load()"
          />
        </EmployeeFilter>
        <div class="flex justify-end">
          <button
            type="button"
            class="text-xs text-slate-400 hover:text-rose-600 transition"
            @click="filters = { month: defaultMonth(), company_id: '', department_id: '', employee_id: '', line_type: 'all', status: '', page: 1, per_page: 15 }; load()"
          >
            <i class="far fa-undo mr-1"></i>Reset all filters
          </button>
        </div>
      </div>
    </div>

    <!-- ── Table card ──────────────────────────────────────────────────────── -->
    <div class="bg-white">

      <!-- Status tab bar -->
      <div class="flex items-center justify-between border-b border-slate-100 px-4">
        <div class="flex">
          <button
            v-for="tab in statusTabs"
            :key="tab.value"
            type="button"
            :class="[
              'flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-xs font-semibold transition',
              filters.status === tab.value
                ? 'border-rose-500 text-rose-600'
                : 'border-transparent text-slate-500 hover:text-slate-700',
            ]"
            @click="setTab(tab.value)"
          >
            <span :class="['h-1.5 w-1.5 rounded-full', tab.dot]"></span>
            {{ tab.label }}
          </button>
        </div>
        <div class="flex items-center gap-2 py-2">
          <span class="text-[11px] text-slate-400">
            {{ pagination.total ?? list.length }} records
          </span>
          <button
            type="button"
            class="inline-flex h-6 w-6 items-center justify-center rounded border border-slate-200 text-slate-400 hover:bg-slate-50 hover:text-slate-600"
            :disabled="loading"
            @click="load"
          >
            <i :class="['far fa-sync-alt text-[10px]', loading ? 'animate-spin' : '']"></i>
          </button>
        </div>
      </div>

      <!-- Error -->
      <div v-if="error" class="border-b border-rose-100 bg-rose-50 px-4 py-2 text-xs text-rose-700">
        <i class="far fa-exclamation-circle mr-1"></i>{{ error }}
      </div>

      <!-- Table -->
      <div class="overflow-x-auto">
        <table class="min-w-full border-collapse text-xs">
          <thead>
            <tr class="bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              <th class="w-8 border-b border-slate-200 px-3 py-2 text-center">#</th>
              <th class="border-b border-slate-200 px-3 py-2 text-left">Employee</th>
              <th class="border-b border-slate-200 px-3 py-2 text-left">Type / Reason</th>
              <th class="border-b border-slate-200 px-3 py-2 text-right">Amount</th>
              <th class="border-b border-slate-200 px-3 py-2 text-center">Ref Month</th>
              <th class="border-b border-slate-200 px-3 py-2 text-center">Carry To</th>
              <th class="border-b border-slate-200 px-3 py-2 text-center">Status</th>
              <th class="w-24 border-b border-slate-200 px-3 py-2 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>

            <!-- Skeleton -->
            <template v-if="loading && !list.length">
              <tr v-for="i in 8" :key="`sk-${i}`" class="animate-pulse border-b border-slate-100">
                <td class="px-3 py-2.5 text-center"><div class="mx-auto h-3 w-4 rounded bg-slate-100"></div></td>
                <td class="px-3 py-2.5"><div class="h-3 w-28 rounded bg-slate-100"></div><div class="mt-1 h-2.5 w-16 rounded bg-slate-100"></div></td>
                <td class="px-3 py-2.5"><div class="h-3 w-24 rounded bg-slate-100"></div><div class="mt-1 h-2.5 w-32 rounded bg-slate-100"></div></td>
                <td class="px-3 py-2.5 text-right"><div class="ml-auto h-3 w-16 rounded bg-slate-100"></div></td>
                <td class="px-3 py-2.5 text-center"><div class="mx-auto h-3 w-14 rounded bg-slate-100"></div></td>
                <td class="px-3 py-2.5 text-center"><div class="mx-auto h-3 w-14 rounded bg-slate-100"></div></td>
                <td class="px-3 py-2.5 text-center"><div class="mx-auto h-4 w-16 rounded-full bg-slate-100"></div></td>
                <td class="px-3 py-2.5 text-center"><div class="mx-auto flex gap-1 justify-center"><div class="h-5 w-5 rounded bg-slate-100"></div><div class="h-5 w-5 rounded bg-slate-100"></div></div></td>
              </tr>
            </template>

            <!-- Data rows -->
            <tr
              v-for="(row, idx) in list"
              :key="row.id"
              :class="[
                'group border-b border-slate-100 border-l-2 transition hover:bg-rose-50/20',
                row.status === 'pending'  ? 'border-l-amber-300'   :
                row.status === 'verified' ? 'border-l-blue-400'    :
                row.status === 'approved' ? 'border-l-emerald-400' :
                row.status === 'carried'  ? 'border-l-indigo-400'  : 'border-l-slate-200',
                idx % 2 === 1 ? 'bg-slate-50/30' : 'bg-white',
              ]"
            >
              <td class="px-3 py-2 text-center font-mono text-[11px] text-slate-400">
                {{ (filters.page - 1) * filters.per_page + idx + 1 }}
              </td>

              <td class="px-3 py-2">
                <div class="font-semibold text-slate-800 leading-tight">{{ row.employee?.name || '-' }}</div>
                <div class="text-[10px] text-slate-400 mt-0.5">{{ row.employee?.employee_id || '—' }}</div>
              </td>

              <td class="px-3 py-2">
                <div class="font-medium capitalize text-slate-700 leading-tight">
                  {{ row.adjustment_type?.replace(/_/g, ' ') || '-' }}
                </div>
                <div class="mt-0.5 max-w-[200px] truncate text-[10px] text-slate-400" :title="row.reason">
                  {{ row.reason || '—' }}
                </div>
              </td>

              <td class="px-3 py-2 text-right">
                <span
                  class="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 font-mono text-xs font-bold"
                  :class="Number(row.amount) >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'"
                >
                  {{ Number(row.amount) >= 0 ? '+' : '' }}{{ formatCurrency(row.amount) }}
                </span>
              </td>

              <td class="px-3 py-2 text-center">
                <span class="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-600">
                  {{ row.ref_month_label || `${row.ref_year}-${String(row.ref_month).padStart(2,'0')}` || '—' }}
                </span>
              </td>

              <td class="px-3 py-2 text-center">
                <span v-if="row.carry_to_label || row.carry_to_year" class="rounded bg-indigo-50 px-1.5 py-0.5 font-mono text-[10px] text-indigo-600">
                  {{ row.carry_to_label || `${row.carry_to_year}-${String(row.carry_to_month).padStart(2,'0')}` }}
                </span>
                <span v-else class="text-slate-300">—</span>
              </td>

              <td class="px-3 py-2 text-center">
                <AdjustmentStatusBadge :status="row.status" />
              </td>

              <td class="px-3 py-2">
                <div class="flex items-center justify-center gap-1">
                  <!-- View -->
                  <RouterLink
                    :to="{ name: 'PayrollAdjustmentShow', params: { id: row.id } }"
                    class="inline-flex h-6 w-6 items-center justify-center rounded border border-slate-200 text-slate-400 transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600"
                    title="View details"
                  >
                    <i class="far fa-file-alt text-[10px]"></i>
                  </RouterLink>

                  <!-- Verify -->
                  <button
                    v-if="['pending', 'verified'].includes(row.status)"
                    type="button"
                    :disabled="verifyingId === row.id"
                    class="inline-flex h-6 w-6 items-center justify-center rounded border border-emerald-200 text-emerald-500 transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 disabled:opacity-40"
                    title="Mark ready to apply"
                    @click="verifyRow(row)"
                  >
                    <i :class="['far text-[10px]', verifyingId === row.id ? 'fa-spinner fa-spin' : 'fa-check-circle']"></i>
                  </button>

                  <!-- Delete -->
                  <button
                    v-if="['pending', 'rejected'].includes(row.status)"
                    type="button"
                    :disabled="deletingId === row.id"
                    class="inline-flex h-6 w-6 items-center justify-center rounded border border-rose-100 text-rose-400 transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-40"
                    title="Delete"
                    @click="deleteRow(row)"
                  >
                    <i :class="['far text-[10px]', deletingId === row.id ? 'fa-spinner fa-spin' : 'fa-trash-alt']"></i>
                  </button>
                </div>
              </td>
            </tr>

            <!-- Empty state -->
            <tr v-if="!loading && !list.length">
              <td colspan="8" class="py-16 text-center">
                <div class="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100">
                  <i class="far fa-inbox text-xl text-slate-300"></i>
                </div>
                <p class="mt-3 text-sm font-semibold text-slate-500">No adjustments found</p>
                <p class="text-xs text-slate-400">Try a different month or status tab</p>
                <button
                  type="button"
                  class="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-rose-700"
                  @click="router.push({ name: 'PayrollAdjustmentCreate' })"
                >
                  <i class="far fa-plus"></i> New Adjustment
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div class="border-t border-slate-100 px-4 py-2.5">
        <PaginationBar
          :page="Number(filters.page)"
          :per-page="Number(filters.per_page)"
          :total="Number(pagination.total || 0)"
          :last-page="Number(pagination.last_page || 1)"
          @page-change="pageChanged"
        />
      </div>
    </div>
  </div>
</template>
