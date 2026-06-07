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
const tabOptions = [
  { value: 'all', label: 'All', icon: 'fa-list' },
  { value: 'pending', label: 'Pending', icon: 'fa-clock' },
  { value: 'verified', label: 'Verified', icon: 'fa-shield-check' },
  { value: 'approved', label: 'Ready to Apply', icon: 'fa-check-circle' },
  { value: 'carried', label: 'Applied', icon: 'fa-check-double' },
]
const routeSyncing = ref(false)
const deletingIds = ref(new Set())

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
const canDelete = computed(() => String(authStore.user?.role || '').toLowerCase() === 'super_admin')
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

const summaryCards = computed(() => {
  const rows = filteredByMonth.value
  const totalAmount = rows.reduce((sum, r) => sum + Number(r.amount || 0), 0)
  const pendingAmount = rows.filter((r) => r.status === 'pending').reduce((sum, r) => sum + Number(r.amount || 0), 0)
  const approvedAmount = rows.filter((r) => r.status === 'approved').reduce((sum, r) => sum + Number(r.amount || 0), 0)
  const carriedAmount = rows.filter((r) => r.status === 'carried').reduce((sum, r) => sum + Number(r.amount || 0), 0)

  return [
    {
      label: 'Total Entries',
      value: counts.value.all,
      sub: formatCurrency(totalAmount),
      subLabel: 'total amount',
      tone: 'border-slate-200 bg-white',
      labelColor: 'text-slate-500',
      valueColor: 'text-slate-900',
      subColor: 'text-slate-500',
      icon: 'fa-layer-group',
      iconBg: 'bg-slate-100 text-slate-500',
    },
    {
      label: 'Pending',
      value: counts.value.pending,
      sub: formatCurrency(pendingAmount),
      subLabel: 'awaiting review',
      tone: 'border-amber-200 bg-amber-50',
      labelColor: 'text-amber-700',
      valueColor: 'text-amber-900',
      subColor: 'text-amber-600',
      icon: 'fa-clock',
      iconBg: 'bg-amber-100 text-amber-600',
    },
    {
      label: 'Ready to Apply',
      value: counts.value.approved,
      sub: formatCurrency(approvedAmount),
      subLabel: 'approved amount',
      tone: 'border-emerald-200 bg-emerald-50',
      labelColor: 'text-emerald-700',
      valueColor: 'text-emerald-900',
      subColor: 'text-emerald-600',
      icon: 'fa-check-circle',
      iconBg: 'bg-emerald-100 text-emerald-600',
    },
    {
      label: 'Applied',
      value: counts.value.carried,
      sub: formatCurrency(carriedAmount),
      subLabel: 'carried forward',
      tone: 'border-blue-200 bg-blue-50',
      labelColor: 'text-blue-700',
      valueColor: 'text-blue-900',
      subColor: 'text-blue-600',
      icon: 'fa-check-double',
      iconBg: 'bg-blue-100 text-blue-600',
    },
  ]
})

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
      company_id: filters.value.company_id || undefined,
      department_id: filters.value.department_id || undefined,
      employee_id: filters.value.employee_id || undefined,
      line_type: filters.value.line_type && filters.value.line_type !== 'all' ? filters.value.line_type : undefined,
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
    toast.success('Adjustment marked ready to apply.')
    await load()
  } catch (e) {
    toast.error(e.message || 'Approval failed.')
  }
}

const canDeleteRow = (row) => canDelete.value && ['pending', 'rejected'].includes(row.status)

const isDeleting = (id) => deletingIds.value.has(id)

const deleteRow = async (row) => {
  if (!canDeleteRow(row)) return
  const confirmed = window.confirm(`Delete adjustment for ${row.employee?.name || 'this employee'}?`)
  if (!confirmed) return

  deletingIds.value = new Set([...deletingIds.value, row.id])
  try {
    await adjustmentStore.remove(row.id)
    toast.success('Adjustment deleted.')
  } catch (e) {
    toast.error(e.message || 'Delete failed.')
  } finally {
    const next = new Set(deletingIds.value)
    next.delete(row.id)
    deletingIds.value = next
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
    if (routeSyncing.value) return
    load()
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
  <div class="min-h-screen space-y-4 p-4 md:p-6">

    <!-- Page Header -->
    <div class="rounded-3xl border border-slate-200 bg-gradient-to-r from-slate-50 via-white to-indigo-50 p-5 shadow-sm">
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div class="flex items-center gap-4">
          <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600">
            <i class="far fa-sliders-h text-xl"></i>
          </div>
          <div>
            <h1 class="text-xl font-bold text-slate-900">Post-Payroll Adjustments</h1>
            <p class="mt-0.5 text-sm text-slate-500">
              Manual payroll corrections for
              <span class="font-semibold text-indigo-600">{{ activeMonthLabel }}</span>.
              Ready items are applied through carry-forward.
            </p>
          </div>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <button
            class="btn-3"
            @click="router.push({ name: 'PayrollAdjustmentCarryPreview' })"
          >
            <i class="far fa-eye"></i>
            Carry Preview
          </button>
          <button
            v-if="canCreate"
            class="btn-2"
            @click="router.push({ name: 'PayrollAdjustmentCreate' })"
          >
            <i class="far fa-plus"></i>
            New Adjustment
          </button>
        </div>
      </div>
    </div>

    <!-- Filters -->
    <div class="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <div class="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-slate-400">
        <i class="far fa-filter text-slate-300"></i>
        Filters
      </div>
      <div class="space-y-3">
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
        <div class="flex items-center justify-end">
          <button class="btn-1 h-9 px-5 text-xs" @click="load">
            <i class="far fa-sync-alt"></i>
            Reload
          </button>
        </div>
      </div>
    </div>

    <!-- Summary Cards -->
    <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <button
        v-for="card in summaryCards"
        :key="card.label"
        class="group rounded-2xl border p-4 text-left shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md"
        :class="card.tone"
        @click="activeTab = card.label === 'Total Entries' ? 'all' : (card.label === 'Ready to Apply' ? 'approved' : card.label.toLowerCase())"
      >
        <div class="flex items-start justify-between gap-3">
          <div class="flex-1 min-w-0">
            <p class="text-xs font-semibold uppercase tracking-wider" :class="card.labelColor">{{ card.label }}</p>
            <p class="mt-1.5 text-3xl font-bold leading-none" :class="card.valueColor">{{ card.value }}</p>
            <p class="mt-2 text-xs font-mono" :class="card.subColor">
              {{ card.sub }}
              <span class="opacity-70"> · {{ card.subLabel }}</span>
            </p>
          </div>
          <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-base" :class="card.iconBg">
            <i :class="`far ${card.icon}`"></i>
          </div>
        </div>
      </button>
    </div>

    <!-- Table Card -->
    <div class="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">

      <!-- Tab Bar -->
      <div class="border-b border-slate-100 bg-slate-50/60 px-4 py-3">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div class="flex flex-wrap gap-1.5">
            <button
              v-for="tab in tabOptions"
              :key="tab.value"
              class="inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium transition-all duration-100"
              :class="activeTab === tab.value
                ? 'border-indigo-400 bg-indigo-600 text-white shadow-sm'
                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'"
              @click="activeTab = tab.value"
            >
              <i :class="`far ${tab.icon} text-[10px]`"></i>
              {{ tab.label }}
              <span
                class="rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none"
                :class="activeTab === tab.value ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'"
              >
                {{ counts[tab.value] }}
              </span>
            </button>
          </div>
          <div class="flex items-center gap-2 text-xs text-slate-400">
            <i class="far fa-table"></i>
            <span>{{ visibleAdjustments.length }} record{{ visibleAdjustments.length !== 1 ? 's' : '' }}</span>
          </div>
        </div>
      </div>

      <!-- Loading -->
      <LoaderView v-if="loading" />

      <!-- Error -->
      <div
        v-else-if="error"
        class="mx-4 my-4 flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
      >
        <i class="far fa-exclamation-circle shrink-0 text-base text-red-400"></i>
        <span>{{ error }}</span>
      </div>

      <!-- Empty State -->
      <div v-else-if="!visibleAdjustments.length" class="flex flex-col items-center justify-center py-16 text-center">
        <div class="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-3xl text-slate-300">
          <i class="far fa-folder-open"></i>
        </div>
        <p class="mt-4 text-base font-semibold text-slate-600">No adjustments found</p>
        <p class="mt-1 text-sm text-slate-400">
          {{ activeTab !== 'all' ? `No ${activeTab} adjustments for this period.` : 'No adjustments exist for the selected filters.' }}
        </p>
        <div class="mt-6 flex gap-2">
          <button v-if="activeTab !== 'all'" class="btn-3" @click="activeTab = 'all'">
            <i class="far fa-list"></i> View All
          </button>
          <button v-if="canCreate" class="btn-2" @click="router.push({ name: 'PayrollAdjustmentCreate' })">
            <i class="far fa-plus"></i> New Adjustment
          </button>
        </div>
      </div>

      <!-- Table -->
      <div v-else class="overflow-x-auto [scrollbar-width:thin]">
        <table class="min-w-[1060px] w-full border-collapse text-xs">
          <thead>
            <tr class="bg-slate-50 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              <th class="w-10 border-b border-r border-slate-200 px-3 py-2.5 text-center">#</th>
              <th class="border-b border-r border-slate-200 px-3 py-2.5 text-left">Employee</th>
              <th class="border-b border-r border-slate-200 px-3 py-2.5 text-left">Type / Reason</th>
              <th class="border-b border-r border-slate-200 px-3 py-2.5 text-right">Amount</th>
              <th class="border-b border-r border-slate-200 px-3 py-2.5 text-center">Ref Month</th>
              <th class="border-b border-r border-slate-200 px-3 py-2.5 text-center">Carry To</th>
              <th class="border-b border-r border-slate-200 px-3 py-2.5 text-center">Status</th>
              <th class="w-36 border-b border-slate-200 px-3 py-2.5 text-center">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr
              v-for="(row, index) in visibleAdjustments"
              :key="row.id"
              class="group transition-colors hover:bg-indigo-50/30"
              :class="index % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'"
            >
              <!-- SL -->
              <td class="border-r border-slate-100 px-3 py-2.5 text-center font-mono text-[11px] text-slate-400">
                {{ index + 1 }}
              </td>

              <!-- Employee -->
              <td class="border-r border-slate-100 px-3 py-2.5">
                <div class="flex items-center gap-2.5">
                  <div class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-[10px] font-bold text-slate-500">
                    {{ (row.employee?.name || '?').charAt(0).toUpperCase() }}
                  </div>
                  <div class="min-w-0">
                    <div class="truncate font-semibold text-slate-900">{{ row.employee?.name || '-' }}</div>
                    <div class="text-[10px] text-slate-400">{{ row.employee?.employee_id || '-' }}</div>
                  </div>
                </div>
              </td>

              <!-- Type / Reason -->
              <td class="border-r border-slate-100 px-3 py-2.5">
                <div class="font-medium capitalize text-slate-700">
                  {{ row.adjustment_type?.replace(/_/g, ' ') || '-' }}
                </div>
                <div class="mt-0.5 max-w-[220px] truncate text-[10px] text-slate-400" :title="row.reason">
                  {{ row.reason || '—' }}
                </div>
              </td>

              <!-- Amount -->
              <td class="border-r border-slate-100 px-3 py-2.5 text-right">
                <span
                  class="inline-flex items-center gap-0.5 rounded-lg px-2 py-1 font-mono text-xs font-bold"
                  :class="Number(row.amount) >= 0
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-rose-50 text-rose-700'"
                >
                  {{ Number(row.amount) >= 0 ? '+' : '' }}{{ formatCurrency(row.amount) }}
                </span>
              </td>

              <!-- Ref Month -->
              <td class="border-r border-slate-100 px-3 py-2.5 text-center">
                <span class="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-[11px] text-slate-600">
                  {{ row.ref_month_label || '-' }}
                </span>
              </td>

              <!-- Carry To -->
              <td class="border-r border-slate-100 px-3 py-2.5 text-center">
                <span
                  v-if="row.carry_to_label"
                  class="rounded-md bg-indigo-50 px-2 py-0.5 font-mono text-[11px] text-indigo-600"
                >
                  {{ row.carry_to_label }}
                </span>
                <span v-else class="text-slate-300">—</span>
              </td>

              <!-- Status -->
              <td class="border-r border-slate-100 px-3 py-2.5 text-center">
                <AdjustmentStatusBadge :status="row.status" />
              </td>

              <!-- Actions -->
              <td class="px-3 py-2.5">
                <div class="flex items-center justify-center gap-1">
                  <!-- View -->
                  <button
                    class="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600"
                    title="View details"
                    @click="openDetail(row)"
                  >
                    <i class="far fa-eye text-[11px]"></i>
                  </button>

                  <!-- Approve -->
                  <button
                    v-if="canVerify && ['pending', 'verified'].includes(row.status)"
                    class="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-600 transition hover:border-emerald-300 hover:bg-emerald-100"
                    title="Mark ready to apply"
                    @click="approveRow(row)"
                  >
                    <i class="far fa-check-circle text-[11px]"></i>
                  </button>

                  <!-- Review (for non-verify roles) -->
                  <button
                    v-else-if="canReject && ['pending', 'verified'].includes(row.status)"
                    class="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-amber-200 bg-amber-50 text-amber-600 transition hover:border-amber-300 hover:bg-amber-100"
                    title="Review"
                    @click="openDetail(row)"
                  >
                    <i class="far fa-clipboard-list text-[11px]"></i>
                  </button>

                  <span v-else class="h-7 w-7 shrink-0"></span>

                  <!-- Delete -->
                  <button
                    v-if="canDelete"
                    class="inline-flex h-7 w-7 items-center justify-center rounded-lg border transition disabled:cursor-not-allowed"
                    :class="canDeleteRow(row)
                      ? 'border-rose-200 bg-rose-50 text-rose-500 hover:border-rose-300 hover:bg-rose-100'
                      : 'border-slate-100 bg-slate-50 text-slate-300'"
                    :disabled="!canDeleteRow(row) || isDeleting(row.id)"
                    :title="canDeleteRow(row) ? 'Delete' : 'Only pending or rejected adjustments can be deleted'"
                    @click="deleteRow(row)"
                  >
                    <i
                      class="text-[11px]"
                      :class="isDeleting(row.id) ? 'far fa-spinner fa-spin' : 'far fa-trash-alt'"
                    ></i>
                  </button>

                  <span v-else class="h-7 w-7 shrink-0"></span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Table Footer -->
      <div v-if="visibleAdjustments.length" class="border-t border-slate-100 bg-slate-50/50 px-4 py-2.5">
        <div class="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
          <span>
            Showing <strong class="text-slate-700">{{ visibleAdjustments.length }}</strong> adjustment{{ visibleAdjustments.length !== 1 ? 's' : '' }}
            for <strong class="text-slate-700">{{ activeMonthLabel }}</strong>
          </span>
          <span v-if="activeTab !== 'all'" class="rounded-md bg-white border border-slate-200 px-2 py-0.5 text-slate-500">
            Filtered: <strong>{{ tabOptions.find(t => t.value === activeTab)?.label }}</strong>
          </span>
        </div>
      </div>
    </div>

  </div>
</template>
