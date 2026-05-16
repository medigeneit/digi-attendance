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
const openMoreId = ref(null)
const actionLoadingId = ref(null)
const confirmAction = ref(null)
const cancellationReason = ref('')

const currentMonth = () => {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

const filters = ref({
  company_id: '',
  department_id: '',
  line_type: 'all',
  salary_month: currentMonth(),
  page: 1,
  per_page: 15,
})

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
  const params = {
    ...filters.value,
    salary_month: toMonthValue(filters.value.salary_month),
  }

  if (!params.company_id) delete params.company_id
  if (!params.department_id) delete params.department_id
  if (!params.line_type || params.line_type === 'all') delete params.line_type
  if (!params.salary_month) delete params.salary_month

  return params
}

const syncFiltersToQuery = async (params) => {
  await router.replace({ query: { ...params } })
}

const hydrateFiltersFromQuery = () => {
  const q = route.query || {}

  filters.value = {
    ...filters.value,
    company_id: q.company_id ? String(q.company_id) : '',
    department_id: q.department_id ? String(q.department_id) : '',
    line_type: q.line_type ? String(q.line_type) : 'all',
    salary_month: toMonthValue(q.salary_month) || currentMonth(),
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

const applyMonthFilter = () => {
  filters.value.page = 1
  load()
}

const resetFilters = () => {
  filters.value = {
    company_id: '',
    department_id: '',
    line_type: 'all',
    salary_month: currentMonth(),
    page: 1,
    per_page: 15,
  }
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

const goToGenerate = () => {
  router.push({
    name: 'PayrollBatchGenerate',
    query: buildFilterParams(),
  })
}

const goToShow = (batch) => {
  router.push({
    name: 'PayrollBatchShow',
    params: { id: batch.id },
    query: buildFilterParams(),
  })
}

const normalizeStatus = (batch) => String(batch?.status || 'generated').toLowerCase()
const privilegedRoles = ['admin', 'super_admin', 'developer']
const payrollRoles = ['admin', 'super_admin', 'developer', 'hr', 'accounts']
const accountRoles = ['admin', 'super_admin', 'developer', 'accounts']

const userPermissions = computed(() => {
  const raw = authStore.user?.permissions || authStore.user?.permission_names || authStore.user?.abilities || []
  return Array.isArray(raw)
    ? raw.map((permission) => String(permission?.name || permission).toLowerCase())
    : []
})

const userRoles = computed(() => {
  const roles = [authStore.user?.role, ...(authStore.user?.roles || [])]
  return roles.map((role) => String(role?.name || role || '').toLowerCase()).filter(Boolean)
})

const hasRole = (roles) => userRoles.value.some((role) => roles.includes(role))
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
  }
  const [permission, roles] = map[action] || []
  return permission ? can(permission, roles) : false
}

const actionCopy = {
  review: {
    title: 'Review Payroll Batch?',
    message: 'This batch will move to Reviewed status.',
    success: 'Payroll batch reviewed.',
  },
  approve: {
    title: 'Approve Payroll Batch?',
    message: 'Approved payroll cannot be regenerated without reverting approval.',
    success: 'Payroll batch approved.',
  },
  mark_paid: {
    title: 'Mark Payroll Batch as Paid?',
    message: 'Paid payroll cannot be edited or regenerated. Corrections must be made through adjustment.',
    success: 'Payroll batch marked as paid.',
  },
  lock: {
    title: 'Lock Payroll Batch?',
    message: 'Locked payroll is final and cannot be edited, regenerated, deleted, or recalculated.',
    success: 'Payroll batch locked.',
  },
  cancel: {
    title: 'Cancel Payroll Batch?',
    message: 'Cancelled payroll cannot be paid or locked.',
    success: 'Payroll batch cancelled.',
  },
}

const primaryActionFor = (batch) => {
  const status = normalizeStatus(batch)
  const map = {
    draft: { action: 'regenerate', label: 'Regenerate', icon: 'fa-redo' },
    generated: { action: 'review', label: 'Review', icon: 'fa-clipboard-check' },
    reviewed: { action: 'approve', label: 'Approve', icon: 'fa-check-circle' },
    approved: { action: 'mark_paid', label: 'Mark Paid', icon: 'fa-money-bill-wave' },
    paid: { action: 'lock', label: 'Lock', icon: 'fa-lock' },
  }
  const primary = map[status]
  return primary && hasPermissionForAction(primary.action) ? primary : null
}

const moreActionsFor = (batch) => {
  const status = normalizeStatus(batch)
  const actions = {
    draft: ['view', 'regenerate', 'cancel'],
    generated: ['view', 'regenerate', 'cancel'],
    reviewed: ['view', 'cancel'],
    approved: ['view', 'export', 'cancel'],
    paid: ['view', 'export', 'adjustment'],
    locked: ['view', 'export', 'audit'],
    cancelled: ['view', 'audit'],
  }[status] || ['view']

  const primary = primaryActionFor(batch)?.action
  const labels = {
    view: ['View', 'fa-eye'],
    regenerate: ['Regenerate', 'fa-redo'],
    cancel: ['Cancel', 'fa-ban'],
    export: ['Export', 'fa-file-export'],
    adjustment: ['Create Adjustment', 'fa-plus-circle'],
    audit: ['Audit Trail', 'fa-history'],
  }

  return actions
    .filter((action) => action !== primary && hasPermissionForAction(action))
    .map((action) => ({ action, label: labels[action][0], icon: labels[action][1] }))
}

const regenerateBatch = (batch) => {
  router.push({
    name: 'PayrollBatchGenerate',
    query: {
      ...buildFilterParams(),
      company_id: batch.company_id,
      salary_month: toMonthValue(batch.salary_month),
      salary_type: batch.salary_type || 'Monthly',
      payroll_cycle: batch.payroll_cycle || 'regular',
    },
  })
}

const exportBatch = (batch) => {
  router.push({
    name: 'PayrollList',
    query: {
      payroll_batch_id: batch.id,
      flag: 'excel',
    },
  })
}

const createAdjustment = (batch) => {
  router.push({
    name: 'PayrollAdjustmentCreate',
    query: {
      payroll_batch_id: batch.id,
      salary_month: toMonthValue(batch.salary_month),
    },
  })
}

const showAuditTrail = (batch) => goToShow(batch)

const openConfirm = (batch, action) => {
  if (action === 'regenerate') return regenerateBatch(batch)
  if (action === 'view') return goToShow(batch)
  if (action === 'export') return exportBatch(batch)
  if (action === 'adjustment') return createAdjustment(batch)
  if (action === 'audit') return showAuditTrail(batch)
  cancellationReason.value = ''
  confirmAction.value = { batch, action, ...actionCopy[action] }
  openMoreId.value = null
}

const closeConfirm = () => {
  confirmAction.value = null
  cancellationReason.value = ''
}

const runConfirmedAction = async () => {
  if (!confirmAction.value || actionLoadingId.value) return
  const { batch, action, success } = confirmAction.value
  if (action === 'cancel' && !cancellationReason.value.trim()) {
    toast.error('Cancellation reason is required.')
    return
  }

  actionLoadingId.value = `${batch.id}:${action}`
  try {
    await batchStore.transitionBatch(batch.id, action, action === 'cancel' ? { reason: cancellationReason.value.trim() } : {})
    toast.success(success)
    closeConfirm()
    await batchStore.fetchList(buildFilterParams())
  } catch (e) {
    toast.error(e.message || 'Payroll batch status update failed.')
  } finally {
    actionLoadingId.value = null
  }
}
</script>

<template>
  <div class="p-4 md:p-6 space-y-4">
    <div class="flex items-center justify-between gap-2">
      <h1 class="title-md md:title-lg">Payroll Batches</h1>
      <button class="btn-2" :disabled="apiUnavailable" :class="{ 'opacity-60 cursor-not-allowed': apiUnavailable }" @click="goToGenerate">
        <i class="far fa-cog"></i>
        <span class="hidden md:flex">Generate Payroll</span>
      </button>
    </div>

    <div v-if="apiUnavailable" class="bg-amber-50 border border-amber-200 text-amber-700 rounded-xl p-4 text-sm flex items-center gap-2">
      <i class="fas fa-info-circle"></i>
      Payroll batch API এখনো backend এ build করা হয়নি. এই অংশ আপাতত disabled রাখা হয়েছে.
    </div>

    <!-- Filters -->
    <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
      <div class="grid grid-cols-1 gap-3 xl:grid-cols-[1fr_220px]">
        <EmployeeFilter
          :company_id="filters.company_id"
          :department_id="filters.department_id"
          :line_type="filters.line_type"
          :with-employee="false"
          @update:company_id="(value) => (filters.company_id = value)"
          @update:department_id="(value) => (filters.department_id = value)"
          @update:line_type="(value) => (filters.line_type = value)"
          @filter-change="onEmployeeFilterChange"
        />
      <div>
        
        <div class="flex items-end justify-end gap-4">
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
          <button class="btn-1 rounded-md" @click="resetFilters">
            <i class="far fa-undo"></i> Reset
          </button>
        </div>
        </div>
      </div>
    </div>

    <LoaderView v-if="loading" />

    <div v-else-if="error"
      class="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm flex items-center gap-2">
      <i class="fas fa-exclamation-circle"></i> {{ error }}
    </div>

    <div v-else-if="!list.length" class="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
      <i class="fas fa-layer-group text-4xl text-gray-300 mb-3"></i>
      <p class="text-lg font-medium text-gray-500">{{ apiUnavailable ? 'Payroll batch module is not active yet' : 'No payroll batches found' }}</p>
      <button class="btn-2 mt-4" :disabled="apiUnavailable" :class="{ 'opacity-60 cursor-not-allowed': apiUnavailable }" @click="goToGenerate">
        <i class="far fa-cog"></i> Generate Payroll
      </button>
    </div>

    <div v-else class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
      <table class="w-full text-sm">
        <thead class="bg-blue-50 text-blue-900 text-xs uppercase">
          <tr>
            <th class="px-4 py-3 text-left">#</th>
            <th class="px-4 py-3 text-left">Batch ID</th>
            <th class="px-4 py-3 text-left">Company</th>
            <th class="px-4 py-3 text-left">Department</th>
            <th class="px-4 py-3 text-left">Line Type</th>
            <th class="px-4 py-3 text-center">Salary Month</th>
            <th class="px-4 py-3 text-center">Salary Type</th>
            <th class="px-4 py-3 text-center">Status</th>
            <th class="px-4 py-3 text-left">Prepared By</th>
            <th class="px-4 py-3 text-center">Generated At</th>
            <th class="px-4 py-3 text-center">Payrolls</th>
            <th class="px-4 py-3 text-center">Actions</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-50">
          <tr v-for="(batch, i) in list" :key="batch.id" class="hover:bg-gray-50 transition-colors">
            <td class="px-4 py-3 text-gray-400 text-xs">{{ (filters.page - 1) * filters.per_page + i + 1 }}</td>
            <td class="px-4 py-3 font-mono text-blue-700 font-medium">#{{ batch.id }}</td>
            <td class="px-4 py-3 font-medium">{{ batch.company?.name || '—' }}</td>
            <td class="px-4 py-3 text-gray-600">{{ batch.department?.name || '—' }}</td>
            <td class="px-4 py-3 text-gray-600">{{ lineTypeLabel(batch.line_type) }}</td>
            <td class="px-4 py-3 text-center">{{ batch.salary_month || '—' }}</td>
            <td class="px-4 py-3 text-center">
              <span class="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-medium">
                {{ batch.salary_type || '—' }}
              </span>
            </td>
            <td class="px-4 py-3 text-center"><PayrollStatusBadge :status="batch.status || 'generated'" /></td>
            <td class="px-4 py-3 text-gray-600">{{ batch.prepared_by?.name || '—' }}</td>
            <td class="px-4 py-3 text-center text-gray-500 text-xs">{{ batch.created_at?.slice(0, 10) || '—' }}</td>
            <td class="px-4 py-3 text-center">
              <span class="font-semibold text-blue-800">{{ batch.payrolls_count ?? (batch.payrolls?.length ?? '—') }}</span>
            </td>
            <td class="px-4 py-3 text-center">
              <div class="relative inline-flex items-center justify-center gap-1">
                <button
                  v-if="hasPermissionForAction('view')"
                  @click="goToShow(batch)"
                  class="inline-flex h-8 w-8 items-center justify-center rounded-lg text-indigo-500 transition-colors hover:bg-indigo-50 hover:text-indigo-700"
                  title="View"
                >
                  <i class="far fa-eye text-xs"></i>
                </button>

                <button
                  v-if="primaryActionFor(batch)"
                  class="inline-flex h-8 items-center gap-1.5 rounded-lg bg-blue-600 px-3 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                  :disabled="!!actionLoadingId"
                  @click="openConfirm(batch, primaryActionFor(batch).action)"
                >
                  <i
                    class="far"
                    :class="actionLoadingId === `${batch.id}:${primaryActionFor(batch).action}` ? 'fa-spinner fa-spin' : primaryActionFor(batch).icon"
                  ></i>
                  <span>{{ primaryActionFor(batch).label }}</span>
                </button>

                <button
                  v-if="moreActionsFor(batch).length"
                  class="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-800"
                  title="More actions"
                  @click="openMoreId = openMoreId === batch.id ? null : batch.id"
                >
                  <i class="far fa-ellipsis-h text-xs"></i>
                </button>

                <div
                  v-if="openMoreId === batch.id"
                  class="absolute right-0 top-9 z-20 w-48 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 text-left shadow-lg"
                >
                  <button
                    v-for="action in moreActionsFor(batch)"
                    :key="action.action"
                    class="flex w-full items-center gap-2 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                    :disabled="!!actionLoadingId"
                    @click="openConfirm(batch, action.action)"
                  >
                    <i class="far w-4" :class="action.icon"></i>
                    <span>{{ action.label }}</span>
                  </button>
                </div>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <PaginationBar v-if="pagination.total > 0" :page="pagination.current_page || filters.page"
      :per-page="pagination.per_page || filters.per_page" :total="pagination.total || list.length"
      :last-page="pagination.last_page || 1"
      @page-change="(p) => { filters.page = p; load() }" />

    <div v-if="confirmAction" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div class="w-full max-w-md rounded-xl bg-white p-5 shadow-2xl">
        <div class="flex items-start justify-between gap-3">
          <div>
            <h2 class="text-lg font-bold text-slate-900">{{ confirmAction.title }}</h2>
            <p class="mt-1 text-sm text-slate-600">{{ confirmAction.message }}</p>
          </div>
          <button class="btn-3" @click="closeConfirm"><i class="far fa-times"></i></button>
        </div>

        <div v-if="confirmAction.action === 'cancel'" class="mt-4">
          <label class="mb-1 block text-xs font-semibold uppercase text-slate-500">Cancellation Reason <span class="text-red-500">*</span></label>
          <textarea
            v-model="cancellationReason"
            rows="3"
            class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
            placeholder="Reason for cancelling this payroll batch"
          ></textarea>
        </div>

        <div class="mt-5 flex justify-end gap-2">
          <button class="btn-3" :disabled="!!actionLoadingId" @click="closeConfirm">Cancel</button>
          <button class="btn-2" :disabled="!!actionLoadingId" @click="runConfirmedAction">
            <i class="far" :class="actionLoadingId ? 'fa-spinner fa-spin' : 'fa-check'"></i>
            Confirm
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
