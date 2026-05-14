<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'
import { storeToRefs } from 'pinia'
import LoaderView from '@/components/common/LoaderView.vue'
import AdjustmentStatusBadge from '@/components/payroll/adjustments/AdjustmentStatusBadge.vue'
import EmployeeFilter from '@/components/common/EmployeeFilter.vue'
import FlexibleDatePicker from '@/components/FlexibleDatePicker.vue'
import { useAdjustmentStore } from '@/stores/adjustmentStore'
import { useAuthStore } from '@/stores/auth'
import { formatCurrency } from '@/utils/currency'

const route = useRoute()
const router = useRouter()
const toast = useToast()
const adjustmentStore = useAdjustmentStore()
const authStore = useAuthStore()
const { adjustments, loading, error } = storeToRefs(adjustmentStore)

defineOptions({
  name: 'PayrollAdjustmentIndex',
})

const defaultMonth = () => new Date().toISOString().slice(0, 7)
const allowedTabs = ['all', 'pending', 'verified', 'approved', 'carried']
const routeSyncing = ref(false)

const queryValue = (value, fallback = '') => {
  if (Array.isArray(value)) return value[0] ? String(value[0]) : fallback
  return value !== undefined && value !== null && value !== '' ? String(value) : fallback
}

const validMonth = (value) => {
  const month = String(value || '').slice(0, 7)
  return /^\d{4}-\d{2}$/.test(month) ? month : defaultMonth()
}

const queryMonth = (query = {}) => {
  if (query.month) return validMonth(queryValue(query.month))
  if (query.ref_year && query.ref_month) {
    const year = queryValue(query.ref_year)
    const month = String(queryValue(query.ref_month)).padStart(2, '0')
    return validMonth(`${year}-${month}`)
  }
  return defaultMonth()
}

const filters = ref({
  company_id: '',
  department_id: '',
  employee_id: '',
  line_type: 'all',
  month: defaultMonth(),
})

const activeTab = ref('all')

const applyQueryFilters = (query = {}) => {
  routeSyncing.value = true
  filters.value = {
    company_id: queryValue(query.company_id),
    department_id: queryValue(query.department_id),
    employee_id: queryValue(query.employee_id || query.user_id),
    line_type: queryValue(query.line_type, 'all') || 'all',
    month: queryMonth(query),
  }

  const tab = queryValue(query.tab || query.status, 'all')
  activeTab.value = allowedTabs.includes(tab) ? tab : 'all'
  routeSyncing.value = false
}

const buildRouteQuery = () => {
  const query = {}
  if (filters.value.company_id) query.company_id = filters.value.company_id
  if (filters.value.department_id) query.department_id = filters.value.department_id
  if (filters.value.employee_id) query.employee_id = filters.value.employee_id
  if (filters.value.line_type && filters.value.line_type !== 'all') query.line_type = filters.value.line_type
  if (filters.value.month) query.month = filters.value.month
  if (activeTab.value && activeTab.value !== 'all') query.tab = activeTab.value
  return query
}

const syncRouteQuery = async () => {
  if (routeSyncing.value) return
  const nextQuery = buildRouteQuery()
  if (JSON.stringify(route.query) === JSON.stringify(nextQuery)) return
  await router.replace({ query: nextQuery })
}

const monthToPeriod = (value) => {
  const month = String(value || '').slice(0, 7)
  if (!/^\d{4}-\d{2}$/.test(month)) return { year: null, month: null, day: 1 }
  return { year: Number(month.slice(0, 4)), month: Number(month.slice(5, 7)), day: 1 }
}

const periodToMonth = (value) => {
  if (!value?.year || !value?.month) return ''
  return `${value.year}-${String(value.month).padStart(2, '0')}`
}

const filterMonthPeriod = computed({
  get: () => monthToPeriod(filters.value.month),
  set: (value) => {
    filters.value.month = periodToMonth(value)
  },
})

const canCreate = computed(() => ['hr', 'super_admin', 'developer'].includes(String(authStore.user?.role || '').toLowerCase()))
const canVerify = computed(() => ['accounts', 'super_admin', 'developer'].includes(String(authStore.user?.role || '').toLowerCase()))
const canReject = computed(() => ['admin', 'super_admin', 'developer'].includes(String(authStore.user?.role || '').toLowerCase()))

const filteredByMonth = computed(() => {
  const month = filters.value.month ? String(filters.value.month) : ''
  const selectedYear = month ? Number(month.slice(0, 4)) : null
  const selectedMonth = month ? Number(month.slice(5, 7)) : null

  return (adjustments.value || []).filter((item) => {
    if (filters.value.employee_id && String(item.employee_id) !== String(filters.value.employee_id)) {
      return false
    }

    if (selectedYear && Number(item.ref_year) !== selectedYear) return false
    if (selectedMonth && Number(item.ref_month) !== selectedMonth) return false
    return true
  })
})

const visibleAdjustments = computed(() => {
  const rows = filteredByMonth.value
  if (activeTab.value === 'all') return rows
  return rows.filter((item) => item.status === activeTab.value)
})

const counts = computed(() => {
  const rows = filteredByMonth.value
  return {
    all: rows.length,
    pending: rows.filter((r) => r.status === 'pending').length,
    verified: rows.filter((r) => r.status === 'verified').length,
    approved: rows.filter((r) => r.status === 'approved').length,
    carried: rows.filter((r) => r.status === 'carried').length,
  }
})

const summaryCards = computed(() => [
  { label: 'All', value: counts.value.all, tone: 'border-slate-200 bg-white text-slate-800' },
  { label: 'Pending', value: counts.value.pending, tone: 'border-amber-200 bg-amber-50 text-amber-800' },
  { label: 'Verified', value: counts.value.verified, tone: 'border-blue-200 bg-blue-50 text-blue-800' },
  { label: 'Approved', value: counts.value.approved, tone: 'border-emerald-200 bg-emerald-50 text-emerald-800' },
  { label: 'Carried', value: counts.value.carried, tone: 'border-slate-200 bg-slate-50 text-slate-700' },
])

const activeMonthLabel = computed(() => {
  if (!filters.value.month) return '-'
  const [year, month] = String(filters.value.month).split('-').map(Number)
  return new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric' }).format(
    new Date(Date.UTC(year, month - 1, 1)),
  )
})

const load = async () => {
  try {
    await syncRouteQuery()
    await adjustmentStore.fetchAll({
      employee_id: filters.value.employee_id || undefined,
      ref_year: filters.value.month ? Number(filters.value.month.slice(0, 4)) : undefined,
      ref_month: filters.value.month ? Number(filters.value.month.slice(5, 7)) : undefined,
    })
  } catch (e) {
    toast.error(e.message || 'Failed to load adjustments.')
  }
}

const onEmployeeFilterChange = (payload = {}) => {
  filters.value.company_id = payload.company_id || ''
  filters.value.department_id = payload.department_id || ''
  filters.value.employee_id = payload.employee_id || ''
  filters.value.line_type = payload.line_type || 'all'
}

const approveRow = async (row) => {
  const note = window.prompt('Approval note (optional):', '')
  if (note === null) return

  try {
    await adjustmentStore.verify(row.id, note)
    toast.success('Adjustment approved.')
    await load()
  } catch (e) {
    toast.error(e.message || 'Approval failed.')
  }
}

const openDetail = (row) => {
  router.push({ name: 'PayrollAdjustmentShow', params: { id: row.id } })
}

watch(
  () => filters.value.month,
  () => {
    if (routeSyncing.value) return
    load()
  },
)

watch(
  () => [filters.value.company_id, filters.value.department_id, filters.value.employee_id, filters.value.line_type, activeTab.value],
  () => {
    syncRouteQuery()
  },
)

watch(
  () => route.query,
  async () => {
    if (routeSyncing.value) return
    applyQueryFilters(route.query)
    await load()
  },
)

onMounted(() => {
  applyQueryFilters(route.query)
  load()
})
</script>

<template>
  <div class="space-y-4 p-4 md:p-6">
    <div class="rounded-3xl border border-slate-200 bg-gradient-to-r from-slate-50 via-white to-amber-50 p-5 shadow-sm">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 class="text-2xl font-bold text-slate-900">Post-Payroll Adjustments</h1>
          <p class="mt-1 text-sm text-slate-500">
            Manage approved carry-forward adjustments for {{ activeMonthLabel }}.
          </p>
        </div>
        <div class="flex flex-wrap gap-2">
          <button class="btn-3" @click="router.push({ name: 'PayrollAdjustmentCarryPreview' })">
            <i class="far fa-eye"></i> Carry Preview
          </button>
          <button v-if="canCreate" class="btn-2" @click="router.push({ name: 'PayrollAdjustmentCreate' })">
            <i class="far fa-plus"></i> New Adjustment
          </button>
        </div>
      </div>
    </div>

    <div class="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <div class="grid gap-4 lg:grid-cols-[8fr_0.8fr_auto] items-end">
        <div>
          <label class="mb-1 block text-xs font-medium text-slate-600">Employee</label>
          <EmployeeFilter
            :company_id="filters.company_id"
            :department_id="filters.department_id"
            :employee_id="filters.employee_id"
            :line_type="filters.line_type"
            :with-type="true"
            @update:company_id="filters.company_id = $event"
            @update:department_id="filters.department_id = $event"
            @update:employee_id="filters.employee_id = $event"
            @update:line_type="filters.line_type = $event"
            @filter-change="onEmployeeFilterChange"
          >
          <FlexibleDatePicker
            v-model="filterMonthPeriod"
            :show-year="false"
            :show-month="true"
            :show-date="false"
            label="Month"
          />
          </EmployeeFilter> 
        </div>
        <div>
          <button class="btn-1" @click="load">
            <i class="far fa-search"></i> Load
          </button>
        </div>
      </div>
    </div>

    <div class="grid gap-2 md:grid-cols-2 xl:grid-cols-5">
      <button
        v-for="card in summaryCards"
        :key="card.label"
        class="rounded-2xl border p-3 text-left shadow-sm transition hover:-translate-y-0.5"
        :class="card.tone"
        @click="activeTab = card.label.toLowerCase()"
      >
        <div class="text-[11px] font-semibold uppercase tracking-[0.2em] opacity-70">{{ card.label }}</div>
        <div class="mt-1 text-xl font-bold">{{ card.value }}</div>
      </button>
    </div>

    <div class="rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div class="border-b border-slate-100 px-4 py-3">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div class="flex flex-wrap gap-2">
            <button
              v-for="tab in ['all', 'pending', 'verified', 'approved', 'carried']"
              :key="tab"
              class="rounded-full border px-3 py-1.5 text-sm font-medium transition"
              :class="activeTab === tab ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-600'"
              @click="activeTab = tab"
            >
              {{ tab.charAt(0).toUpperCase() + tab.slice(1) }}
              <span class="ml-1 rounded-full bg-slate-100 px-1.5 py-0.5 text-[11px]">{{ counts[tab] }}</span>
            </button>
          </div>
          <div class="text-xs text-slate-400">Rows: {{ visibleAdjustments.length }}</div>
        </div>
      </div>
      

      <LoaderView v-if="loading" />

      <div v-else-if="error" class="m-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        {{ error }}
      </div>

      <div v-else-if="!visibleAdjustments.length" class="p-12 text-center text-slate-500">
        <i class="far fa-folder-open text-3xl text-slate-300"></i>
        <p class="mt-2 text-sm font-medium">No adjustments found.</p>
      </div>

      <div v-else class="overflow-x-auto">
        <table class="min-w-[1180px] w-full border-collapse text-sm">
          <thead class="bg-slate-50 text-slate-700">
            <tr>
              <th class="border border-slate-200 px-3 py-2 text-left">Employee</th>
              <th class="border border-slate-200 px-3 py-2 text-left">Type</th>
              <th class="border border-slate-200 px-3 py-2 text-right">Amount</th>
              <th class="border border-slate-200 px-3 py-2 text-center">Ref Month</th>
              <th class="border border-slate-200 px-3 py-2 text-center">Carry To</th>
              <th class="border border-slate-200 px-3 py-2 text-center">Status</th>
              <th class="border border-slate-200 px-3 py-2 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in visibleAdjustments" :key="row.id" class="odd:bg-white even:bg-slate-50/40">
              <td class="border border-slate-200 px-3 py-2">
                <div class="font-semibold text-slate-900">{{ row.employee?.name || '-' }}</div>
                <div class="text-xs text-slate-500">{{ row.employee?.employee_id || '-' }}</div>
              </td>
              <td class="border border-slate-200 px-3 py-2">
                <div class="capitalize text-slate-800">{{ row.adjustment_type?.replace(/_/g, ' ') }}</div>
                <div class="text-xs text-slate-500 break-words">{{ row.reason }}</div>
              </td>
              <td class="border border-slate-200 px-3 py-2 text-right font-mono font-semibold" :class="Number(row.amount) >= 0 ? 'text-emerald-700' : 'text-rose-700'">
                {{ Number(row.amount) >= 0 ? '+' : '' }}{{ formatCurrency(row.amount) }}
              </td>
              <td class="border border-slate-200 px-3 py-2 text-center font-mono text-slate-700">{{ row.ref_month_label }}</td>
              <td class="border border-slate-200 px-3 py-2 text-center font-mono text-slate-700">{{ row.carry_to_label || '-' }}</td>
              <td class="border border-slate-200 px-3 py-2 text-center"><AdjustmentStatusBadge :status="row.status" /></td>
              <td class="border border-slate-200 px-3 py-2">
                <div class="flex flex-wrap items-center justify-center gap-1">
                  <button class="btn-3 h-8 text-xs" @click="openDetail(row)">
                    <i class="far fa-eye"></i> View
                  </button>
                  <button
                    v-if="canVerify && ['pending', 'verified'].includes(row.status)"
                    class="btn-3 h-8 text-xs"
                    @click="approveRow(row)"
                  >
                    <i class="far fa-check-circle"></i> Approve
                  </button>
                  <button
                    v-else-if="canReject && ['pending', 'verified'].includes(row.status)"
                    class="btn-3 h-8 text-xs"
                    @click="openDetail(row)"
                  >
                    <i class="far fa-clipboard-list"></i> Review
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
