<script setup>
import LoaderView from '@/components/common/LoaderView.vue'
import { useUserMonthlyKpiStore } from '@/stores/user-monthly-kpi'
import { useMonthlyKpiFormsStore } from '@/stores/monthly-kpi-forms'
import { useUserStore } from '@/stores/user'
import { storeToRefs } from 'pinia'
import { ref, onMounted, watch, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useToast } from 'vue-toastification'
import EmployeeFilter from '@/components/common/EmployeeFilter.vue'
import CreateEvaluationModal from '@/components/CreateEvaluationModal.vue'

const toast = useToast()
const router = useRouter()
const route = useRoute()

// ===== stores =====
const evalStore = useUserMonthlyKpiStore()
const { list, isLoading, error } = storeToRefs(evalStore)

const formsStore = useMonthlyKpiFormsStore?.()
const forms = ref([])

const userStore = useUserStore()
const { users, isLoading: usersLoading, error: usersError } = storeToRefs(userStore)

// ===== pagination/meta (from API response) =====
const meta = ref({ total: 0, current_page: 1, last_page: 1, per_page: 10 })

// ===== Period helpers =====
function toYYYYMM(d = new Date()) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}
function monthBounds(yyyyMm) {
  if (!yyyyMm) return { start: '', end: '' }
  const [y, m] = yyyyMm.split('-').map(Number)
  const start = `${yyyyMm}-01`
  const endDay = new Date(y, m, 0).getDate() // last day of month
  const end = `${yyyyMm}-${String(endDay).padStart(2, '0')}`
  return { start, end }
}
const DEFAULT_MONTH = route.query.month || toYYYYMM()

// ===== filters =====
const filters = ref({
  company_id:    route.query.company_id ? Number(route.query.company_id) : '',
  department_id: route.query.department_id ? Number(route.query.department_id) : '',
  employee_id:   route.query.employee_id ? Number(route.query.employee_id) : '',
  line_type:     route.query.line_type ?? '',
  user_id:       route.query.user_id ? Number(route.query.user_id) : '',
  form_id:       route.query.form_id ? Number(route.query.form_id) : '',
  finalized:     route.query.finalized ?? '',
  per_page:      route.query.per_page ? Number(route.query.per_page) : 10,
  page:          route.query.page ? Number(route.query.page) : 1,

  // NEW: period filters
  period:       route.query.period || 'month',        // 'month' | 'range'
  month:        route.query.month || DEFAULT_MONTH,   // YYYY-MM
  start_month:  route.query.start_month || DEFAULT_MONTH,
  end_month:    route.query.end_month   || DEFAULT_MONTH,
})

const periodParams = computed(() => {
  if (filters.value.period === 'month') {
    const { start, end } = monthBounds(filters.value.month)
    return { month: filters.value.month, month_start: start, month_end: end }
  } else if (filters.value.period === 'range') {
    const s = monthBounds(filters.value.start_month).start
    const e = monthBounds(filters.value.end_month).end
    return { month_start: s, month_end: e }
  }
  return {}
})

const hasOrg = computed(() => !!filters.value.company_id && !!filters.value.department_id)
const hasPeriodFilter = computed(() => {
  if (filters.value.period === 'month') {
    return filters.value.month !== DEFAULT_MONTH
  }
  return (
    filters.value.start_month !== DEFAULT_MONTH ||
    filters.value.end_month !== DEFAULT_MONTH
  )
})
const hasFilters = computed(() =>
  hasOrg.value ||
  !!filters.value.form_id ||
  filters.value.finalized !== '' ||
  !!filters.value.line_type ||
  hasPeriodFilter.value
)

const creating = ref(false)
const isBusy = computed(() => isLoading.value || usersLoading.value || creating.value)

// ===== fetchers =====
async function fetchAll() {
  if (!hasOrg.value) {
    list.value = []
    meta.value = { total: 0, current_page: 1, last_page: 1, per_page: filters.value.per_page }
    return
  }

  const params = {
    company_id:    filters.value.company_id,
    department_id: filters.value.department_id,
    line_type:     filters.value.line_type || undefined,
    employee_id:   filters.value.employee_id || null,
    form_id:       filters.value.form_id || undefined,
    finalized:     filters.value.finalized === '' ? undefined : filters.value.finalized,
    per_page:      filters.value.per_page,
    page:          filters.value.page,
    ...periodParams.value, // ⬅️ include period
  }

  try {
    // users (id -> name map) — same paging
    await userStore.fetchUsers({
      company_id: params.company_id,
      department_id: params.department_id,
      line_type: params.line_type,
      employee_id: params.employee_id,
      per_page: params.per_page,
      page: params.page,
    })

    // evaluations (resource collection: data + meta)
    const res = await evalStore.fetchList(params)
    const m = res?.meta
    meta.value = m ? {
      total: m.total ?? 0,
      current_page: m.current_page ?? 1,
      last_page: m.last_page ?? 1,
      per_page: m.per_page ?? filters.value.per_page,
    } : { total: list.value?.length || 0, current_page: 1, last_page: 1, per_page: filters.value.per_page }
  } catch (e) {
    toast.error(e?.response?.data?.message || 'Failed to load list')
  }
}

function syncUrl() {
  router.replace({
    query: {
      company_id: filters.value.company_id || undefined,
      department_id: filters.value.department_id || undefined,
      line_type: filters.value.line_type || undefined,
      user_id: filters.value.user_id || undefined,
      employee_id: filters.value.employee_id || undefined,
      form_id: filters.value.form_id || undefined,
      finalized: filters.value.finalized || undefined,
      per_page: filters.value.per_page !== 10 ? String(filters.value.per_page) : undefined,
      page: filters.value.page > 1 ? String(filters.value.page) : undefined,

      // period
      period: filters.value.period || undefined,
      month: filters.value.period === 'month' ? filters.value.month : undefined,
      start_month: filters.value.period === 'range' ? filters.value.start_month : undefined,
      end_month: filters.value.period === 'range' ? filters.value.end_month : undefined,
    },
  }).catch(() => {})
}

async function onEmpFilterChange() {
  filters.value.user_id = filters.value.employee_id || ''
  filters.value.page = 1
  await fetchAll()
  syncUrl()
}

async function search() {
  if (!hasOrg.value) return toast.error('Select Company & Department')
  filters.value.page = 1
  await fetchAll()
  syncUrl()
}
async function resetFilters() {
  filters.value = {
    company_id: '', department_id: '', employee_id: '', line_type: '',
    user_id: '', form_id: '', finalized: '', per_page: 10, page: 1,

    period: 'month',
    month: DEFAULT_MONTH,
    start_month: DEFAULT_MONTH,
    end_month: DEFAULT_MONTH,
  }
  await fetchAll()
  syncUrl()
}
async function changePage(p) {
  if (p < 1 || p > meta.value.last_page) return
  filters.value.page = p
  await fetchAll()
  syncUrl()
}
async function changePerPage() {
  filters.value.page = 1
  await fetchAll()
  syncUrl()
}

// ===== Create / Assign =====
const assignOpen = ref(false)
const assignCtx = ref({ kpiId: null, userId: null, userLabel: '' })

function openAssign(evRow) {
  assignCtx.value = {
    kpiId: evRow.id,
    userId: evRow.user_id,
    userLabel: nameById(evRow.user_id),
  }
  assignOpen.value = true
}
async function afterAssigned() {
  assignOpen.value = false
  await fetchAll()
  toast.success('Form assigned')
}

// unified modal (create/assign)
const modalOpen = ref(false)
const modalMode = ref('create') // 'create' | 'assign'
const modalCtx = ref({ userId: null, userLabel: '', kpiId: null })
function openCreateFor(userId) {
  modalMode.value = 'create'
  modalCtx.value = { userId, userLabel: nameById(userId), kpiId: null }
  modalOpen.value = true
}
function openCreate() { modalOpen.value = true }
async function afterModalDone() {
  modalOpen.value = false
  await fetchAll()
}

// ===== helpers =====
function nameById(id) {
  const u = (users.value || []).find(x => x.id === id)
  return u?.name || `#${id}`
}
function statusBadge(row) {
  if (row.is_demo) return { label: 'Not created', cls: 'bg-gray-100 text-gray-700' }
  if (!row.monthly_kpi_form_id) return { label: 'Unassigned', cls: 'bg-gray-100 text-gray-700' }
  return row.finalized_at
    ? { label: 'Finalized', cls: 'bg-green-100 text-green-700' }
    : { label: 'In progress', cls: 'bg-yellow-100 text-yellow-700' }
}

// ===== lifecycle =====
onMounted(async () => {
  if (formsStore) {
    await formsStore.fetchList?.({ per_page: 100 })
    forms.value = formsStore.items || []
  }
  if (filters.value.user_id && !filters.value.employee_id) {
    filters.value.employee_id = filters.value.user_id
  }
  await fetchAll()
})

// ===== watches =====
// keep user_id synced
watch(() => filters.value.employee_id, v => { filters.value.user_id = v || '' })

// range validation: end >= start
watch(
  () => [filters.value.period, filters.value.start_month, filters.value.end_month],
  () => {
    if (filters.value.period === 'range' && filters.value.end_month < filters.value.start_month) {
      filters.value.end_month = filters.value.start_month
    }
  }
)
</script>

<template>
  <div class="space-y-4 px-4 max-w-7xl mx-auto my-6">
    <!-- Header -->
    <div class="flex items-center justify-between gap-2">
      <h1 class="title-md md:title-lg">User Monthly KPI Evaluations</h1>
      <div class="flex gap-2">
        <RouterLink :to="{ name: 'MonthlyKpiFormList' }" class="btn-2">Forms</RouterLink>
        <!-- <button class="btn-2" @click="openCreate">New Evaluation</button> -->
      </div>
    </div>

    <!-- Filters -->
    <!-- Filters (clean & compact) -->
  <div class="rounded-xl border bg-white p-4 md:p-5 shadow-sm">
    <div class="grid gap-4 md:grid-cols-12">

      <!-- Employee scope -->
      <div class="col-span-full">
        <label class="mb-1 block text-sm font-medium text-slate-700">Employee</label>
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
      </div>

      <!-- Status (quiet segmented) -->
      <div class="md:col-span-3">
        <label class="mb-1 block text-sm font-medium text-slate-700">Status</label>
        <div class="inline-flex rounded-lg bg-slate-100 p-1">
          <button type="button"
            class="px-3 py-1.5 text-xs rounded-md transition"
            :class="filters.finalized === '' ? 'bg-white shadow border border-slate-200 text-slate-900' : 'text-slate-600 hover:bg-slate-200/60'"
            @click="filters.finalized = ''">All</button>
          <button type="button"
            class="px-3 py-1.5 text-xs rounded-md transition"
            :class="filters.finalized === '0' ? 'bg-white shadow border border-slate-200 text-slate-900' : 'text-slate-600 hover:bg-slate-200/60'"
            @click="filters.finalized = '0'">In progress</button>
          <button type="button"
            class="px-3 py-1.5 text-xs rounded-md transition"
            :class="filters.finalized === '1' ? 'bg-white shadow border border-slate-200 text-slate-900' : 'text-slate-600 hover:bg-slate-200/60'"
            @click="filters.finalized = '1'">Finalized</button>
        </div>
      </div>

      <!-- Period (quiet segmented + chips + inputs) -->
      <div class="md:col-span-6 ">
        <label class="mb-1 block text-sm font-medium text-slate-700">Period</label>

        <!-- segmented -->
        <div class="inline-flex rounded-lg bg-slate-100 p-1">
          <button type="button"
            class="px-3 py-1.5 text-xs rounded-md transition"
            :class="filters.period === 'month' ? 'bg-white shadow border border-slate-200 text-slate-900' : 'text-slate-600 hover:bg-slate-200/60'"
            @click="filters.period='month'">Single month</button>
          <button type="button"
            class="px-3 py-1.5 text-xs rounded-md transition"
            :class="filters.period === 'range' ? 'bg-white shadow border border-slate-200 text-slate-900' : 'text-slate-600 hover:bg-slate-200/60'"
            @click="filters.period='range'">Month range</button>
        </div>

        <!-- quick chips -->
        <div class="inline-flex rounded-lg p-1 ml-4 gap-3">
          <button type="button"
            class="rounded-md border border-slate-300 px-2.5 py-1 text-xs text-slate-700 hover:bg-slate-50"
            @click="filters.period='month'; filters.month=toYYYYMM(new Date())">This month</button>
          <button type="button"
            class="rounded-md border border-slate-300 px-2.5 py-1 text-xs text-slate-700 hover:bg-slate-50"
            @click="(() => { const d=new Date(); d.setMonth(d.getMonth()-1); filters.period='month'; filters.month=toYYYYMM(d) })()">Last month</button>
          <button type="button"
            class="rounded-md border border-slate-300 px-2.5 py-1 text-xs text-slate-700 hover:bg-slate-50"
            @click="(() => { const d=new Date(); d.setMonth(d.getMonth()-3); filters.period='range'; filters.start_month=toYYYYMM(d); filters.end_month=toYYYYMM(new Date()) })()">Last 3 months</button>
        </div>

        <!-- inputs -->
        <div class="mt-3">
          <div v-if="filters.period === 'month'" class="relative inline-flex items-center">
            <input type="month" v-model="filters.month"
                  class="h-9 w-[200px] rounded-md border border-slate-300 pl-9 pr-3 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200" />
            <svg class="pointer-events-none absolute left-2 h-4 w-4 text-slate-500" viewBox="0 0 24 24" fill="currentColor"><path d="M7 10h5v5H7z"/><path d="M7 2h2v2h6V2h2v2h2a2 2 0 0 1 2 2v2H3V6a2 2 0 0 1 2-2h2V2zM3 10h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V10z"/></svg>
          </div>
          <div v-else class="flex flex-wrap items-end gap-3">
            <div class="relative">
              <label class="block text-[11px] text-slate-600">Start</label>
              <input type="month" v-model="filters.start_month"
                    class="mt-1 h-9 w-[200px] rounded-md border border-slate-300 pl-9 pr-3 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200" />
              <svg class="pointer-events-none absolute left-2 top-[34px] h-4 w-4 text-slate-500" viewBox="0 0 24 24" fill="currentColor"><path d="M7 10h5v5H7z"/><path d="M7 2h2v2h6V2h2v2h2a2 2 0 0 1 2 2v2H3V6a2 2 0 0 1 2-2h2V2zM3 10h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V10z"/></svg>
            </div>
            <div class="relative">
              <label class="block text-[11px] text-slate-600">End</label>
              <input type="month" v-model="filters.end_month"
                    class="mt-1 h-9 w-[200px] rounded-md border border-slate-300 pl-9 pr-3 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200" />
              <svg class="pointer-events-none absolute left-2 top-[34px] h-4 w-4 text-slate-500" viewBox="0 0 24 24" fill="currentColor"><path d="M7 10h5v5H7z"/><path d="M7 2h2v2h6V2h2v2h2a2 2 0 0 1 2 2v2H3V6a2 2 0 0 1 2-2h2V2zM3 10h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V10z"/></svg>
            </div>
          </div>
        </div>
      </div>

      <!-- Actions -->
      <div class="md:col-span-3 flex items-end justify-end gap-2">
        <button class="h-9 rounded-md border border-slate-300 px-3 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                :disabled="isBusy || !hasFilters"
                @click="resetFilters">Reset</button>
        <button class="h-9 rounded-md bg-indigo-600 px-3 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                :disabled="isBusy || !hasOrg"
                @click="search">Search</button>
      </div>
    </div>
  </div>



    <!-- Loader / Error -->
    <div v-if="isBusy" class="py-8 text-center"><LoaderView /></div>
    <div v-else-if="usersError || error" class="rounded-md border border-red-200 bg-red-50 p-3 text-red-700">
      {{ usersError || error }}
    </div>

    <!-- Table -->
    <div v-else class="overflow-x-auto rounded-xl border bg-white shadow-sm">
      <table class="min-w-full text-sm">
        <thead>
          <tr class="bg-gray-100 text-left text-gray-700">
            <th class="px-3 py-2 w-12">#</th>
            <th class="px-3 py-2">User</th>
            <th class="px-3 py-2">Period</th>
            <th class="px-3 py-2">Total</th>
            <th class="px-3 py-2">Status</th>
            <th class="px-3 py-2 text-right w-40">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, i) in list" :key="`${row.user_id}-${row.id ?? 'demo'}`" class="border-t">
            <td class="px-3 py-2">{{ (meta.current_page - 1) * meta.per_page + (i + 1) }}</td>
            <td class="px-3 py-2">
              {{ nameById(row.user_id) }}
            </td>
            <td class="px-3 py-2">
              <template v-if="row.month_start || row.month_end">
                <span class="text-gray-700">{{ row.month_start }} → {{ row.month_end }}</span>
              </template>
              <span v-else class="text-gray-400">—</span>
            </td>
            <td class="px-3 py-2">
              <span v-if="!row.is_demo">{{ row.obtained_total }} / {{ row.max_total }}</span>
              <span v-else class="text-gray-400">—</span>
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
                <!-- Not created -->
                <button v-if="row.is_demo" class="btn-3" @click="openCreateFor(row.user_id)">Create</button>

                <!-- Unassigned -->
                <button v-else-if="!row.monthly_kpi_form_id" class="btn-2" @click="openAssign(row)">Assign</button>

                <!-- Has form -->
                <RouterLink v-else :to="{ name: 'EvaluationShow', params: { id: row.id } }" class="btn-2">
                  Open
                </RouterLink>
              </div>
            </td>
          </tr>

          <tr v-if="!list || list.length === 0">
            <td colspan="7" class="px-3 py-6 text-center text-gray-600">
              {{ hasOrg ? 'No users found for this scope.' : 'Select company & department to see users.' }}
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Pagination -->
      <div v-if="meta.last_page > 1" class="flex items-center justify-between p-3 text-sm">
        <div class="text-gray-600">
          Showing
          <span class="font-medium">
            {{ (meta.current_page - 1) * meta.per_page + (list.length ? 1 : 0) }}
          </span>
          to
          <span class="font-medium">
            {{ (meta.current_page - 1) * meta.per_page + list.length }}
          </span>
          of
          <span class="font-medium">{{ meta.total }}</span>
          results
        </div>
        <div class="flex items-center gap-2">
          <button class="btn-3" :disabled="meta.current_page === 1" @click="changePage(meta.current_page - 1)">Prev</button>
          <span class="text-gray-700">Page {{ meta.current_page }} / {{ meta.last_page }}</span>
          <button class="btn-3" :disabled="meta.current_page === meta.last_page" @click="changePage(meta.current_page + 1)">Next</button>
        </div>
      </div>
    </div>

    <!-- Unified Create/Assign Modal -->
    <CreateEvaluationModal
      v-model="modalOpen"
      :mode="modalMode"
      :user-id="modalCtx.userId || ''"
      :user-label="modalCtx.userLabel || ''"
      :kpi-id="modalCtx.kpiId || null"
      @created="afterModalDone"
    />
  </div>
</template>
