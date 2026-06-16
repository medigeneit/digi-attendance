<script setup>
import { computed, ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '@/stores/auth'
import { usePayrollBatchStore } from '@/stores/payrollBatch'
import LoaderView from '@/components/common/LoaderView.vue'
import PaginationBar from '@/components/PaginationBar.vue'
import EmployeeFilter from '@/components/common/EmployeeFilter.vue'
import FlexibleDatePicker from '@/components/FlexibleDatePicker.vue'
import PayrollStatusBadge from '@/components/payroll/PayrollStatusBadge.vue'

const router = useRouter()
const route = useRoute()
const toast = useToast()
const batchStore = usePayrollBatchStore()
const authStore = useAuthStore()

const { list, loading, error, pagination, apiUnavailable } = storeToRefs(batchStore)
const actionLoadingId = ref(null)
const confirmAction = ref(null)
const cancellationReason = ref('')
const syncLogs = ref([])
const showSyncLogsFor = ref(null)

const currentMonth = () => {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

const filters = ref({
  company_id: '',
  department_id: '',
  line_type: 'all',
  salary_month: currentMonth(),
  payroll_cycle: '',
  page: 1,
  per_page: 15,
})

const payrollTypeOptions = [
  { value: '', label: 'All Types' },
  { value: 'regular', label: 'Regular Monthly Payroll' },
  { value: 'half_salary_advance', label: 'Half Salary Advance' },
  { value: 'bonus_only', label: 'Bonus Only' },
  { value: 'final_settlement', label: 'Final Settlement' },
]

const payrollTypeLabels = payrollTypeOptions.reduce((labels, option) => {
  if (option.value) labels[option.value] = option.label
  return labels
}, {})

const payrollTypeLabel = (value, fallback = '') =>
  payrollTypeLabels[String(value || '').toLowerCase()] || fallback || '—'

const toMonthValue = (value) => {
  const v = String(value || '').trim()
  if (!v) return ''
  if (/^\d{4}-\d{2}$/.test(v)) return v
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v.slice(0, 7)
  return ''
}

const parseQueryInt = (value, fallback = 1) => {
  if (value === undefined || value === null || value === '') return fallback
  const parsed = Number.parseInt(String(value), 10)
  return Number.isNaN(parsed) ? fallback : parsed
}

const salaryMonthPicker = computed({
  get() {
    const monthValue = toMonthValue(filters.value.salary_month)
    if (!monthValue) return { year: null, month: null, day: 1 }
    const [year, month] = monthValue.split('-').map(Number)
    return { year, month, day: 1 }
  },
  set(value) {
    if (!value?.year || !value?.month) {
      filters.value.salary_month = ''
      return
    }
    filters.value.salary_month = `${value.year}-${String(value.month).padStart(2, '0')}`
  },
})

const buildFilterParams = () => {
  const params = { ...filters.value, salary_month: toMonthValue(filters.value.salary_month) }
  if (!params.company_id) delete params.company_id
  if (!params.department_id) delete params.department_id
  if (!params.line_type || params.line_type === 'all') delete params.line_type
  if (!params.salary_month) delete params.salary_month
  if (!params.payroll_cycle) delete params.payroll_cycle
  return params
}

const syncFiltersToQuery = async (params) => { await router.replace({ query: { ...params } }) }

const hydrateFiltersFromQuery = () => {
  const q = route.query || {}
  filters.value = {
    ...filters.value,
    company_id: q.company_id ? String(q.company_id) : '',
    department_id: q.department_id ? String(q.department_id) : '',
    line_type: q.line_type ? String(q.line_type) : 'all',
    salary_month: toMonthValue(q.salary_month) || currentMonth(),
    payroll_cycle: q.payroll_cycle ? String(q.payroll_cycle) : '',
    page: parseQueryInt(q.page, 1),
    per_page: parseQueryInt(q.per_page, 15),
  }
}

async function load() {
  const params = buildFilterParams()
  await syncFiltersToQuery(params)
  await batchStore.fetchList(params)
}

onMounted(async () => {
  hydrateFiltersFromQuery()
  await load()
})

const onEmployeeFilterChange = (payload = {}) => {
  filters.value = {
    ...filters.value,
    company_id: payload.company_id || '',
    department_id: payload.department_id || '',
    line_type: payload.line_type || 'all',
    page: 1,
  }
  load()
}

const applyMonthFilter = () => { filters.value.page = 1; load() }

const resetFilters = () => {
  filters.value = { company_id: '', department_id: '', line_type: 'all', salary_month: currentMonth(), payroll_cycle: '', page: 1, per_page: 15 }
  load()
}

const lineTypeLabels = {
  executive: 'Executive',
  support_staff: 'Support Staff',
  doctor: 'Doctor',
  academy_body: 'Academy Body',
  academic_body: 'Academy Body',
}
const lineTypeLabel = (value) => lineTypeLabels[value] || value || '—'

const goToGenerate = () => router.push({ name: 'PayrollBatchGenerate', query: buildFilterParams() })
const goToShow = (batch) => router.push({ name: 'PayrollBatchShow', params: { id: batch.id }, query: buildFilterParams() })

const normalizeStatus = (batch) => String(batch?.status || 'generated').toLowerCase()
const privilegedRoles = ['admin', 'super_admin', 'developer']
const payrollRoles = ['admin', 'super_admin', 'developer', 'hr', 'accounts']
const accountRoles = ['admin', 'super_admin', 'developer', 'accounts']

const userPermissions = computed(() => {
  const raw = authStore.user?.permissions || authStore.user?.permission_names || authStore.user?.abilities || []
  return Array.isArray(raw)
    ? raw.map((p) => String(p?.name || p).toLowerCase())
    : []
})

const userRoles = computed(() => {
  const roles = [authStore.user?.role, ...(authStore.user?.roles || [])]
  return roles.map((r) => String(r?.name || r || '').toLowerCase()).filter(Boolean)
})

const hasRole = (roles) => userRoles.value.some((r) => roles.includes(r))
const can = (permission, fallbackRoles = payrollRoles) =>
  userPermissions.value.includes(permission.toLowerCase()) || hasRole(fallbackRoles)

const hasPermissionForAction = (action) => {
  const map = {
    view: ['payroll.batch.view', payrollRoles],
    review: ['payroll.batch.review', payrollRoles],
    approve: ['payroll.batch.approve', privilegedRoles],
    mark_paid: ['payroll.batch.mark_paid', accountRoles],
    lock: ['payroll.batch.lock', privilegedRoles],
    regenerate: ['payroll.batch.regenerate', payrollRoles],
    cancel: ['payroll.batch.cancel', privilegedRoles],
    export: ['payroll.batch.export', payrollRoles],
    adjustment: ['payroll.adjustment.create', payrollRoles],
    audit: ['payroll.batch.view', payrollRoles],
    step_erp_sync: ['payroll.batch.step_erp_sync', accountRoles],
    step_erp_retry: ['payroll.batch.step_erp_sync', accountRoles],
    step_erp_force: ['payroll.batch.step_erp_sync', accountRoles],
    step_erp_logs: ['payroll.batch.step_erp_sync', accountRoles],
  }
  const [permission, roles] = map[action] || []
  return permission ? can(permission, roles) : false
}

const actionCopy = {
  review:        { title: 'Review Payroll Batch?',        message: 'This batch will move to Reviewed status.',                                                                    success: 'Payroll batch reviewed.' },
  approve:       { title: 'Approve Payroll Batch?',       message: 'Approved payroll cannot be regenerated without reverting approval.',                                           success: 'Payroll batch approved.' },
  mark_paid:     { title: 'Mark Payroll Batch as Paid?',  message: 'Paid payroll cannot be edited or regenerated. Corrections must be made through adjustment.',                  success: 'Payroll batch marked as paid.' },
  lock:          { title: 'Lock Payroll Batch?',          message: 'Locked payroll is final and cannot be edited, regenerated, deleted, or recalculated.',                        success: 'Payroll batch locked.' },
  cancel:        { title: 'Cancel Payroll Batch?',        message: 'Cancelled payroll cannot be paid or locked.',                                                                  success: 'Payroll batch cancelled.' },
  step_erp_sync: { title: 'Send to Client?',              message: 'Are you sure you want to send this salary sheet to client?',                                                   success: 'Salary sheet sync queued.' },
  step_erp_retry:{ title: 'Retry Failed Sync?',           message: 'Only failed or pending chunks will be sent again.',                                                            success: 'Failed or pending chunks queued for retry.' },
  step_erp_force:{ title: 'Force Resync?',                message: 'This will resend the full salary sheet even if already synced. Continue?',                                    success: 'Full salary sheet force resync queued.' },
}

const primaryActionFor = (batch) => {
  const status = normalizeStatus(batch)
  const map = {
    draft:     { action: 'regenerate', label: 'Regenerate', icon: 'fa-redo',           cls: 'bg-slate-600 hover:bg-slate-700' },
    generated: { action: 'review',     label: 'Review',     icon: 'fa-clipboard-check', cls: 'bg-violet-600 hover:bg-violet-700' },
    reviewed:  { action: 'approve',    label: 'Approve',    icon: 'fa-check-circle',    cls: 'bg-emerald-600 hover:bg-emerald-700' },
    approved:  { action: 'mark_paid',  label: 'Mark Paid',  icon: 'fa-money-bill-wave', cls: 'bg-blue-600 hover:bg-blue-700' },
    paid:      { action: 'lock',       label: 'Lock',       icon: 'fa-lock',            cls: 'bg-orange-600 hover:bg-orange-700' },
  }
  const primary = map[status]
  return primary && hasPermissionForAction(primary.action) ? primary : null
}

const syncStatusMeta = (syncStatus) => {
  const s = syncStatus || 'not_sent'
  const map = {
    success:        { cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: 'fa-check-circle',   label: 'Synced' },
    failed:         { cls: 'bg-red-50 text-red-700 border-red-200',             icon: 'fa-times-circle',   label: 'Failed' },
    partial_failed: { cls: 'bg-orange-50 text-orange-700 border-orange-200',    icon: 'fa-exclamation-circle', label: 'Partial' },
    queued:         { cls: 'bg-amber-50 text-amber-700 border-amber-200',       icon: 'fa-clock',          label: 'Queued' },
    processing:     { cls: 'bg-blue-50 text-blue-700 border-blue-200',          icon: 'fa-spinner fa-spin',label: 'Processing' },
    not_sent:       { cls: 'bg-slate-50 text-slate-500 border-slate-200',       icon: 'fa-minus-circle',   label: 'Not Sent' },
  }
  return map[s] || map.not_sent
}

const visibleActionsFor = (batch) => {
  const status = normalizeStatus(batch)
  const sync = String(batch.sync_status || 'not_sent')
  const primary = primaryActionFor(batch)?.action

  const secondary = ({
    draft:     ['regenerate', 'cancel'],
    generated: ['regenerate', 'cancel'],
    reviewed:  ['cancel'],
    approved:  ['export', 'cancel'],
    paid:      ['export', 'adjustment'],
    locked:    ['export', 'audit'],
    cancelled: ['audit'],
  }[status] || []).filter((a) => a !== primary && hasPermissionForAction(a))

  const syncActions = hasPermissionForAction('step_erp_sync')
    ? [
        ...(sync !== 'success' ? [{ action: 'step_erp_sync', icon: 'fa-paper-plane', title: 'Send to Client', cls: 'text-indigo-500 hover:bg-indigo-50 hover:text-indigo-700' }] : []),
        ...(['failed', 'partial_failed', 'queued', 'processing'].includes(sync) ? [{ action: 'step_erp_retry', icon: 'fa-redo', title: 'Retry Sync', cls: 'text-amber-500 hover:bg-amber-50 hover:text-amber-700' }] : []),
        { action: 'step_erp_force', icon: 'fa-sync-alt', title: 'Force Resync', cls: 'text-orange-500 hover:bg-orange-50 hover:text-orange-700' },
        { action: 'step_erp_logs', icon: 'fa-list-alt', title: 'View Sync Logs', cls: 'text-slate-500 hover:bg-slate-100 hover:text-slate-700' },
      ]
    : []

  const secondaryMeta = {
    regenerate: { icon: 'fa-redo',         title: 'Regenerate',       cls: 'text-slate-500 hover:bg-slate-100 hover:text-slate-700' },
    cancel:     { icon: 'fa-ban',          title: 'Cancel',           cls: 'text-red-400 hover:bg-red-50 hover:text-red-600' },
    export:     { icon: 'fa-file-export',  title: 'Export',           cls: 'text-teal-500 hover:bg-teal-50 hover:text-teal-700' },
    adjustment: { icon: 'fa-plus-circle',  title: 'Create Adjustment',cls: 'text-purple-500 hover:bg-purple-50 hover:text-purple-700' },
    audit:      { icon: 'fa-history',      title: 'Audit Trail',      cls: 'text-slate-500 hover:bg-slate-100 hover:text-slate-700' },
  }

  return [
    ...secondary.map((a) => ({ action: a, ...secondaryMeta[a] })),
    ...syncActions,
  ]
}

const regenerateBatch = (batch) => router.push({
  name: 'PayrollBatchGenerate',
  query: { ...buildFilterParams(), company_id: batch.company_id, salary_month: toMonthValue(batch.salary_month), salary_type: batch.salary_type || 'Monthly', payroll_cycle: batch.payroll_cycle || 'regular' },
})
const exportBatch = (batch) => router.push({ name: 'PayrollList', query: { payroll_batch_id: batch.id, flag: 'excel' } })
const createAdjustment = (batch) => router.push({ name: 'PayrollAdjustmentCreate', query: { payroll_batch_id: batch.id, salary_month: toMonthValue(batch.salary_month) } })
const showAuditTrail = (batch) => goToShow(batch)

const viewSyncLogs = async (batch) => {
  actionLoadingId.value = `${batch.id}:step_erp_logs`
  try {
    const res = await batchStore.fetchStepErpLogs(batch.id)
    syncLogs.value = res?.data && Array.isArray(res.data) ? res.data : []
    showSyncLogsFor.value = batch
  } catch (e) {
    toast.error(e.message || 'Failed to load Step ERP sync logs.')
  } finally {
    actionLoadingId.value = null
  }
}

const openConfirm = (batch, action) => {
  if (action === 'regenerate') return regenerateBatch(batch)
  if (action === 'view') return goToShow(batch)
  if (action === 'export') return exportBatch(batch)
  if (action === 'adjustment') return createAdjustment(batch)
  if (action === 'audit') return showAuditTrail(batch)
  if (action === 'step_erp_logs') return viewSyncLogs(batch)
  cancellationReason.value = ''
  confirmAction.value = { batch, action, ...actionCopy[action] }
}

const closeConfirm = () => { confirmAction.value = null; cancellationReason.value = '' }

const runConfirmedAction = async () => {
  if (!confirmAction.value || actionLoadingId.value) return
  const { batch, action, success } = confirmAction.value
  if (action === 'cancel' && !cancellationReason.value.trim()) {
    toast.error('Cancellation reason is required.')
    return
  }
  actionLoadingId.value = `${batch.id}:${action}`
  try {
    if (action.startsWith('step_erp_')) {
      const modeMap = { step_erp_sync: 'manual', step_erp_retry: 'retry', step_erp_force: 'force' }
      await batchStore.syncStepErp(batch.id, modeMap[action])
    } else {
      await batchStore.transitionBatch(batch.id, action, action === 'cancel' ? { reason: cancellationReason.value.trim() } : {})
    }
    toast.success(success)
    closeConfirm()
    await batchStore.fetchList(buildFilterParams())
  } catch (e) {
    toast.error(e.message || 'Payroll batch status update failed.')
  } finally {
    actionLoadingId.value = null
  }
}

const syncLogStatusMeta = (status) => ({
  success: 'bg-emerald-100 text-emerald-700',
  failed:  'bg-red-100 text-red-700',
  pending: 'bg-amber-100 text-amber-700',
}[status] || 'bg-slate-100 text-slate-600')
</script>

<template>
  <div class="min-h-screen bg-slate-50 p-4 md:p-6 space-y-5">

    <!-- Header -->
    <div class="flex items-center justify-between gap-3">
      <div>
        <h1 class="text-xl font-bold text-slate-800">Payroll Batches</h1>
        <p class="text-xs text-slate-500 mt-0.5">Manage and track salary sheet generation & sync</p>
      </div>
      <button
        class="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition disabled:opacity-60 disabled:cursor-not-allowed"
        :disabled="apiUnavailable"
        @click="goToGenerate"
      >
        <i class="far fa-cog"></i>
        <span>Generate Payroll</span>
      </button>
    </div>

    <!-- API Unavailable -->
    <div v-if="apiUnavailable" class="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
      <i class="fas fa-exclamation-triangle text-base"></i>
      <span>Payroll batch API এখনো backend এ build করা হয়নি. এই অংশ আপাতত disabled রাখা হয়েছে.</span>
    </div>

    <!-- Filters -->
    <div class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div class="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_auto]">
        <EmployeeFilter
          :company_id="filters.company_id"
          :department_id="filters.department_id"
          :line_type="filters.line_type"
          :with-employee="false"
          @update:company_id="(v) => (filters.company_id = v)"
          @update:department_id="(v) => (filters.department_id = v)"
          @update:line_type="(v) => (filters.line_type = v)"
          @filter-change="onEmployeeFilterChange"
        />
        <div class="flex flex-wrap items-end gap-3">
          <div class="min-w-[200px]">
            <label class="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Payroll Type</label>
            <select
              v-model="filters.payroll_cycle"
              class="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
              @change="() => { filters.page = 1; load() }"
            >
              <option v-for="opt in payrollTypeOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
            </select>
          </div>
          <FlexibleDatePicker
            v-model="salaryMonthPicker"
            label="Salary Month"
            :show-year="false"
            :show-month="true"
            :show-date="false"
            :show-summary="false"
            allow-empty
            @change="applyMonthFilter"
          />
          <button class="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 transition" @click="resetFilters">
            <i class="far fa-undo text-xs"></i> Reset
          </button>
        </div>
      </div>
    </div>

    <!-- Loading -->
    <LoaderView v-if="loading" />

    <!-- Error -->
    <div v-else-if="error" class="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
      <i class="fas fa-exclamation-circle"></i> {{ error }}
    </div>

    <!-- Empty -->
    <div v-else-if="!list.length" class="rounded-xl border border-slate-200 bg-white p-16 text-center shadow-sm">
      <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
        <i class="fas fa-layer-group text-2xl text-slate-400"></i>
      </div>
      <p class="text-base font-semibold text-slate-600">
        {{ apiUnavailable ? 'Payroll batch module is not active yet' : 'No payroll batches found' }}
      </p>
      <p class="mt-1 text-sm text-slate-400">Try adjusting your filters or generate a new payroll batch.</p>
      <button
        class="mt-5 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition disabled:opacity-60"
        :disabled="apiUnavailable"
        @click="goToGenerate"
      >
        <i class="far fa-cog"></i> Generate Payroll
      </button>
    </div>

    <!-- Table -->
    <div v-else class="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-slate-200 bg-slate-50">
              <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 w-8">#</th>
              <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Batch</th>
              <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Company / Dept</th>
              <th class="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">Month</th>
              <th class="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">Type</th>
              <th class="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">Status</th>
              <th class="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">Client Sync</th>
              <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Prepared By</th>
              <th class="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">Payrolls</th>
              <th class="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500 min-w-[220px]">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr
              v-for="(batch, i) in list"
              :key="batch.id"
              class="group hover:bg-blue-50/30 transition-colors"
            >
              <!-- # -->
              <td class="px-4 py-3 text-xs text-slate-400">{{ (filters.page - 1) * filters.per_page + i + 1 }}</td>

              <!-- Batch ID + date -->
              <td class="px-4 py-3">
                <button class="font-mono text-sm font-bold text-blue-600 hover:text-blue-800 hover:underline" @click="goToShow(batch)">
                  #{{ batch.id }}
                </button>
                <div class="text-[11px] text-slate-400 mt-0.5">{{ batch.created_at?.slice(0, 10) || '—' }}</div>
              </td>

              <!-- Company / Dept -->
              <td class="px-4 py-3">
                <div class="font-medium text-slate-800">{{ batch.company?.name || '—' }}</div>
                <div class="text-xs text-slate-400 mt-0.5">
                  {{ batch.department?.name || '—' }}
                  <span v-if="batch.line_type" class="ml-1 text-slate-300">·</span>
                  <span v-if="batch.line_type" class="ml-1">{{ lineTypeLabel(batch.line_type) }}</span>
                </div>
              </td>

              <!-- Month -->
              <td class="px-4 py-3 text-center">
                <span class="text-sm font-semibold text-slate-700">{{ batch.salary_month?.slice(0, 7) || '—' }}</span>
              </td>

              <!-- Type -->
              <td class="px-4 py-3 text-center">
                <span class="inline-flex flex-col items-center rounded-lg border border-indigo-100 bg-indigo-50 px-2.5 py-1 leading-tight">
                  <span class="text-xs font-semibold text-indigo-700">{{ payrollTypeLabel(batch.payroll_cycle, batch.salary_type) }}</span>
                  <span v-if="batch.salary_type" class="text-[10px] text-indigo-400">{{ batch.salary_type }}</span>
                </span>
              </td>

              <!-- Status -->
              <td class="px-4 py-3 text-center">
                <PayrollStatusBadge :status="batch.status || 'generated'" />
              </td>

              <!-- Client Sync -->
              <td class="px-4 py-3 text-center">
                <span
                  class="inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium"
                  :class="syncStatusMeta(batch.sync_status).cls"
                  :title="batch.last_sync_error || ''"
                >
                  <i class="far text-[10px]" :class="syncStatusMeta(batch.sync_status).icon"></i>
                  {{ syncStatusMeta(batch.sync_status).label }}
                </span>
              </td>

              <!-- Prepared By -->
              <td class="px-4 py-3">
                <span class="text-sm text-slate-700">{{ batch.prepared_by?.name || '—' }}</span>
              </td>

              <!-- Payrolls count -->
              <td class="px-4 py-3 text-center">
                <span class="inline-flex h-7 w-7 items-center justify-center rounded-full bg-blue-50 text-sm font-bold text-blue-700">
                  {{ batch.payrolls_count ?? (batch.payrolls?.length ?? '—') }}
                </span>
              </td>

              <!-- Actions — all visible, no dropdown -->
              <td class="px-4 py-3">
                <div class="flex items-center justify-center gap-1 flex-wrap">

                  <!-- View icon -->
                  <button
                    v-if="hasPermissionForAction('view')"
                    class="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-blue-50 hover:text-blue-600"
                    title="View"
                    @click="goToShow(batch)"
                  >
                    <i class="far fa-eye text-xs"></i>
                  </button>

                  <!-- Primary action -->
                  <button
                    v-if="primaryActionFor(batch)"
                    class="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold text-white shadow-sm transition disabled:cursor-not-allowed disabled:opacity-60"
                    :class="primaryActionFor(batch).cls"
                    :disabled="!!actionLoadingId"
                    :title="primaryActionFor(batch).label"
                    @click="openConfirm(batch, primaryActionFor(batch).action)"
                  >
                    <i
                      class="far"
                      :class="actionLoadingId === `${batch.id}:${primaryActionFor(batch).action}` ? 'fa-spinner fa-spin' : primaryActionFor(batch).icon"
                    ></i>
                    <span>{{ primaryActionFor(batch).label }}</span>
                  </button>

                  <!-- Divider -->
                  <span v-if="visibleActionsFor(batch).length" class="h-5 w-px bg-slate-200 mx-0.5"></span>

                  <!-- Secondary + sync action icon buttons -->
                  <button
                    v-for="act in visibleActionsFor(batch)"
                    :key="act.action"
                    class="inline-flex h-8 w-8 items-center justify-center rounded-lg transition disabled:cursor-not-allowed disabled:opacity-60"
                    :class="act.cls"
                    :title="act.title"
                    :disabled="!!actionLoadingId"
                    @click="openConfirm(batch, act.action)"
                  >
                    <i
                      class="far text-xs"
                      :class="actionLoadingId === `${batch.id}:${act.action}` ? 'fa-spinner fa-spin' : act.icon"
                    ></i>
                  </button>

                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Pagination -->
    <PaginationBar
      v-if="pagination.total > 0"
      :page="pagination.current_page || filters.page"
      :per-page="pagination.per_page || filters.per_page"
      :total="pagination.total || list.length"
      :last-page="pagination.last_page || 1"
      @page-change="(p) => { filters.page = p; load() }"
    />

    <!-- ── Sync Logs Modal ── -->
    <Teleport to="body">
      <div v-if="showSyncLogsFor" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
        <div class="w-full max-w-5xl rounded-2xl bg-white shadow-2xl overflow-hidden">
          <!-- Header -->
          <div class="flex items-center justify-between gap-3 border-b border-slate-100 px-6 py-4 bg-slate-50">
            <div class="flex items-center gap-3">
              <div class="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-100">
                <i class="fas fa-list-alt text-indigo-600 text-sm"></i>
              </div>
              <div>
                <h2 class="text-base font-bold text-slate-800">Step ERP Sync Logs</h2>
                <p class="text-xs text-slate-500">Batch #{{ showSyncLogsFor.id }}</p>
              </div>
            </div>
            <button class="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition" @click="showSyncLogsFor = null">
              <i class="far fa-times"></i>
            </button>
          </div>
          <!-- Table -->
          <div class="max-h-[65vh] overflow-auto">
            <table class="w-full text-sm">
              <thead class="sticky top-0 bg-white border-b border-slate-100">
                <tr>
                  <th class="px-4 py-2.5 text-left text-xs font-semibold uppercase text-slate-500">Batch ID</th>
                  <th class="px-4 py-2.5 text-center text-xs font-semibold uppercase text-slate-500">Mode</th>
                  <th class="px-4 py-2.5 text-center text-xs font-semibold uppercase text-slate-500">Chunk</th>
                  <th class="px-4 py-2.5 text-center text-xs font-semibold uppercase text-slate-500">Employees</th>
                  <th class="px-4 py-2.5 text-center text-xs font-semibold uppercase text-slate-500">Status</th>
                  <th class="px-4 py-2.5 text-center text-xs font-semibold uppercase text-slate-500">HTTP</th>
                  <th class="px-4 py-2.5 text-left text-xs font-semibold uppercase text-slate-500">Error</th>
                  <th class="px-4 py-2.5 text-center text-xs font-semibold uppercase text-slate-500">Sent At</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-50">
                <tr v-for="log in syncLogs" :key="log.id" class="hover:bg-slate-50">
                  <td class="px-4 py-2.5 font-mono text-xs text-slate-500 max-w-[160px] truncate" :title="log.batch_id">{{ log.batch_id }}</td>
                  <td class="px-4 py-2.5 text-center">
                    <span class="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">{{ log.sync_mode }}</span>
                  </td>
                  <td class="px-4 py-2.5 text-center text-xs font-semibold text-slate-700">{{ log.chunk_no }}/{{ log.total_chunks }}</td>
                  <td class="px-4 py-2.5 text-center text-xs">{{ log.employee_count }}</td>
                  <td class="px-4 py-2.5 text-center">
                    <span class="rounded-full px-2 py-0.5 text-xs font-semibold" :class="syncLogStatusMeta(log.status)">{{ log.status }}</span>
                  </td>
                  <td class="px-4 py-2.5 text-center text-xs font-mono" :class="log.http_status === 200 ? 'text-emerald-600' : 'text-red-600'">
                    {{ log.http_status || '—' }}
                  </td>
                  <td class="px-4 py-2.5 text-xs text-red-600 max-w-[260px]">
                    <span :title="log.error_message">{{ log.error_message || '—' }}</span>
                  </td>
                  <td class="px-4 py-2.5 text-center text-xs text-slate-500">{{ log.sent_at?.slice(0, 19) || '—' }}</td>
                </tr>
                <tr v-if="!syncLogs.length">
                  <td colspan="8" class="px-4 py-10 text-center text-slate-400 text-sm">
                    <i class="fas fa-inbox text-2xl mb-2 block text-slate-300"></i>
                    No Step ERP sync logs found.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- ── Confirm Action Modal ── -->
    <Teleport to="body">
      <div v-if="confirmAction" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
        <div class="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden">
          <!-- Header -->
          <div class="flex items-start justify-between gap-3 border-b border-slate-100 px-6 py-4">
            <div>
              <h2 class="text-base font-bold text-slate-800">{{ confirmAction.title }}</h2>
              <p class="mt-1 text-sm text-slate-500">{{ confirmAction.message }}</p>
            </div>
            <button class="mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition" @click="closeConfirm">
              <i class="far fa-times text-xs"></i>
            </button>
          </div>

          <!-- Batch info -->
          <div class="bg-slate-50 px-6 py-3 flex items-center gap-3 text-sm text-slate-600 border-b border-slate-100">
            <span class="font-mono font-bold text-blue-700">#{{ confirmAction.batch.id }}</span>
            <span class="text-slate-300">·</span>
            <span>{{ confirmAction.batch.company?.name || '—' }}</span>
            <span class="text-slate-300">·</span>
            <span>{{ confirmAction.batch.salary_month?.slice(0, 7) }}</span>
          </div>

          <!-- Cancellation reason -->
          <div v-if="confirmAction.action === 'cancel'" class="px-6 pt-4">
            <label class="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Cancellation Reason <span class="text-red-500">*</span>
            </label>
            <textarea
              v-model="cancellationReason"
              rows="3"
              class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
              placeholder="Reason for cancelling this payroll batch"
            ></textarea>
          </div>

          <!-- Buttons -->
          <div class="flex justify-end gap-2 px-6 py-4">
            <button
              class="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition disabled:opacity-60"
              :disabled="!!actionLoadingId"
              @click="closeConfirm"
            >
              Cancel
            </button>
            <button
              class="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition disabled:opacity-60 disabled:cursor-not-allowed"
              :disabled="!!actionLoadingId"
              @click="runConfirmedAction"
            >
              <i class="far" :class="actionLoadingId ? 'fa-spinner fa-spin' : 'fa-check'"></i>
              Confirm
            </button>
          </div>
        </div>
      </div>
    </Teleport>

  </div>
</template>
