<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '@/stores/auth'
import { usePayrollBatchStore } from '@/stores/payrollBatch'
import LoaderView from '@/components/common/LoaderView.vue'
import PayrollStatusBadge from '@/components/payroll/PayrollStatusBadge.vue'
import { formatCurrency } from '@/utils/currency'

const props = defineProps({ id: { type: [String, Number], required: true } })
const router = useRouter()
const toast = useToast()
const batchStore = usePayrollBatchStore()
const authStore = useAuthStore()
const { item, loading, error, apiUnavailable } = storeToRefs(batchStore)
const openMore = ref(false)
const actionLoading = ref(null)
const confirmAction = ref(null)
const cancellationReason = ref('')
const syncLogs = ref([])
const showSyncLogs = ref(false)

onMounted(() => {
  if (!apiUnavailable.value) batchStore.fetchItem(props.id)
})

const status = computed(() => String(item.value?.status || 'generated').toLowerCase())
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
    step_erp_sync: ['payroll.batch.step_erp_sync', accountRoles],
    step_erp_retry: ['payroll.batch.step_erp_sync', accountRoles],
    step_erp_force: ['payroll.batch.step_erp_sync', accountRoles],
    step_erp_logs: ['payroll.batch.step_erp_sync', accountRoles],
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
  step_erp_sync: {
    title: 'Send to Client?',
    message: 'Are you sure you want to send this salary sheet to client?',
    success: 'Salary sheet sync queued.',
  },
  step_erp_retry: {
    title: 'Retry Failed Sync?',
    message: 'Only failed or pending chunks will be sent again.',
    success: 'Failed or pending chunks queued for retry.',
  },
  step_erp_force: {
    title: 'Force Resync?',
    message: 'This will resend the full salary sheet even if already synced. Continue?',
    success: 'Full salary sheet force resync queued.',
  },
}

const primaryAction = computed(() => {
  const map = {
    draft: { action: 'regenerate', label: 'Regenerate', icon: 'fa-redo' },
    generated: { action: 'review', label: 'Review', icon: 'fa-clipboard-check' },
    reviewed: { action: 'approve', label: 'Approve', icon: 'fa-check-circle' },
    approved: { action: 'mark_paid', label: 'Mark as Paid', icon: 'fa-money-bill-wave' },
    paid: { action: 'lock', label: 'Lock', icon: 'fa-lock' },
  }
  const primary = map[status.value]
  return primary && hasPermissionForAction(primary.action) ? primary : null
})

const secondaryActions = computed(() => {
  const actions = {
    draft: ['view', 'regenerate', 'cancel'],
    generated: ['view', 'regenerate', 'cancel'],
    reviewed: ['view', 'cancel'],
    approved: ['view', 'export', 'cancel'],
    paid: ['view', 'export', 'adjustment'],
    locked: ['view', 'export', 'audit'],
    cancelled: ['view', 'audit'],
  }[status.value] || ['view']

  const labels = {
    view: ['View', 'fa-eye'],
    regenerate: ['Regenerate', 'fa-redo'],
    cancel: ['Cancel', 'fa-ban'],
    export: ['Export', 'fa-file-export'],
    adjustment: ['Create Adjustment', 'fa-plus-circle'],
    audit: ['Audit Trail', 'fa-history'],
    step_erp_sync: ['Send to Client', 'fa-paper-plane'],
    step_erp_retry: ['Retry Failed Sync', 'fa-redo'],
    step_erp_force: ['Force Resync', 'fa-sync-alt'],
    step_erp_logs: ['View Sync Logs', 'fa-list-alt'],
  }

  const syncStatus = String(item.value?.sync_status || 'not_sent')
  const syncActions = hasPermissionForAction('step_erp_sync')
    ? [
        ...(syncStatus !== 'success' ? ['step_erp_sync'] : []),
        ...(['failed', 'partial_failed', 'queued', 'processing'].includes(syncStatus) ? ['step_erp_retry'] : []),
        'step_erp_force',
        'step_erp_logs',
      ]
    : []

  return [...actions, ...syncActions]
    .filter((action) => action !== primaryAction.value?.action && hasPermissionForAction(action))
    .map((action) => ({ action, label: labels[action][0], icon: labels[action][1] }))
})

const hasActions = computed(() => !!primaryAction.value || secondaryActions.value.length > 0)

const canReviewPayroll = (payroll) => {
  if (!hasPermissionForAction('review')) return false
  const payrollStatus = String(payroll?.payment_status || 'pending').toLowerCase()
  const batchStatus = status.value

  return ['pending', 'generated', 'draft'].includes(payrollStatus)
    && !['approved', 'paid', 'locked', 'cancelled'].includes(batchStatus)
}

const statusAction = async (action, successMessage, payload = {}) => {
  actionLoading.value = action
  try {
    await batchStore.transitionBatch(item.value.id, action, payload)
    toast.success(successMessage)
  } catch (e) {
    toast.error(e.message || 'Payroll batch status update failed.')
  } finally {
    actionLoading.value = null
  }
}

const regenerateBatch = () => {
  router.push({
    name: 'PayrollBatchGenerate',
    query: {
      company_id: item.value.company_id,
      salary_month: item.value.salary_month?.slice(0, 7),
      salary_type: item.value.salary_type || 'Monthly',
      payroll_cycle: item.value.payroll_cycle || 'regular',
    },
  })
}

const exportBatch = () => {
  router.push({ name: 'PayrollList', query: { payroll_batch_id: item.value.id, flag: 'excel' } })
}

const createAdjustment = () => {
  router.push({
    name: 'PayrollAdjustmentCreate',
    query: {
      payroll_batch_id: item.value.id,
      salary_month: item.value.salary_month?.slice(0, 7),
    },
  })
}

const viewSyncLogs = async () => {
  actionLoading.value = 'step_erp_logs'
  try {
    const res = await batchStore.fetchStepErpLogs(item.value.id)
    syncLogs.value = res?.data && Array.isArray(res.data) ? res.data : []
    showSyncLogs.value = true
    openMore.value = false
  } catch (e) {
    toast.error(e.message || 'Failed to load Step ERP sync logs.')
  } finally {
    actionLoading.value = null
  }
}

const openConfirm = (action) => {
  if (action === 'view') return
  if (action === 'audit') {
    const firstPayrollId = item.value?.payrolls?.[0]?.id
    if (firstPayrollId) {
      router.push({ name: 'PayrollShow', params: { id: firstPayrollId } })
    } else {
      toast.info('No payroll audit trail is available for this batch yet.')
    }
    return
  }
  if (action === 'regenerate') return regenerateBatch()
  if (action === 'export') return exportBatch()
  if (action === 'adjustment') return createAdjustment()
  if (action === 'step_erp_logs') return viewSyncLogs()
  cancellationReason.value = ''
  confirmAction.value = { action, ...actionCopy[action] }
  openMore.value = false
}

const closeConfirm = () => {
  confirmAction.value = null
  cancellationReason.value = ''
}

const runConfirmedAction = async () => {
  if (!confirmAction.value || actionLoading.value) return
  if (confirmAction.value.action === 'cancel' && !cancellationReason.value.trim()) {
    toast.error('Cancellation reason is required.')
    return
  }
  if (confirmAction.value.action.startsWith('step_erp_')) {
    actionLoading.value = confirmAction.value.action
    try {
      const modeMap = {
        step_erp_sync: 'manual',
        step_erp_retry: 'retry',
        step_erp_force: 'force',
      }
      await batchStore.syncStepErp(item.value.id, modeMap[confirmAction.value.action])
      toast.success(confirmAction.value.success)
      closeConfirm()
    } catch (e) {
      toast.error(e.message || 'Step ERP sync action failed.')
    } finally {
      actionLoading.value = null
    }
    return
  }

  await statusAction(
    confirmAction.value.action,
    confirmAction.value.success,
    confirmAction.value.action === 'cancel' ? { reason: cancellationReason.value.trim() } : {},
  )
  closeConfirm()
}

const reviewPayrollRow = async (payroll) => {
  if (!payroll?.id || actionLoading.value) return
  const key = `payroll-review-${payroll.id}`
  actionLoading.value = key
  try {
    await batchStore.reviewPayroll(payroll.id)
    toast.success(`${payroll.user?.name || payroll.employee_name || 'Payroll'} reviewed.`)
  } catch (e) {
    toast.error(e.message || 'Payroll review failed.')
  } finally {
    actionLoading.value = null
  }
}
</script>

<template>
  <div class="p-4 md:p-6 space-y-5">
    <div class="flex items-center gap-3">
      <button @click="router.back()" class="btn-3"><i class="far fa-arrow-left"></i></button>
      <h1 class="title-md md:title-lg">Payroll Batch Details</h1>
    </div>

    <div v-if="apiUnavailable" class="bg-amber-50 border border-amber-200 text-amber-700 rounded-xl p-4 text-sm flex items-center gap-2">
      <i class="fas fa-info-circle"></i>
      Payroll batch API এখনো backend এ add করা হয়নি, তাই batch details আপাতত unavailable.
    </div>

    <LoaderView v-else-if="loading" />

    <div v-else-if="error"
      class="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm flex items-center gap-2">
      <i class="fas fa-exclamation-circle"></i> {{ error }}
    </div>

    <template v-else-if="item">
      <!-- Batch Header Card -->
      <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <div class="flex flex-wrap gap-4 items-start justify-between mb-4">
          <div>
            <div class="flex flex-wrap items-center gap-2">
              <h2 class="text-xl font-bold text-blue-900">
                Batch <span class="font-mono">#{{ item.id }}</span>
              </h2>
              <PayrollStatusBadge :status="item.status || 'generated'" />
              <span class="px-2 py-0.5 rounded-full border text-xs font-medium"
                :class="{
                  'bg-emerald-50 text-emerald-700 border-emerald-200': item.sync_status === 'success',
                  'bg-red-50 text-red-700 border-red-200': ['failed', 'partial_failed'].includes(item.sync_status),
                  'bg-amber-50 text-amber-700 border-amber-200': ['queued', 'processing'].includes(item.sync_status),
                  'bg-slate-50 text-slate-600 border-slate-200': !item.sync_status || item.sync_status === 'not_sent',
                }"
              >
                Client: {{ (item.sync_status || 'not_sent').replaceAll('_', ' ') }}
              </span>
            </div>
            <p class="text-sm text-gray-500 mt-0.5">{{ item.company?.name || '—' }}</p>
          </div>
          <div class="text-right text-sm text-gray-500">
            <p>Generated: {{ item.created_at?.slice(0, 10) || '—' }}</p>
            <p>Prepared by: {{ item.prepared_by?.name || '—' }}</p>
          </div>
        </div>
        <div v-if="hasActions" class="mb-4 flex flex-wrap items-center gap-2 border-y border-slate-100 py-3">
          <button
            v-if="primaryAction"
            class="btn-2"
            :disabled="!!actionLoading"
            @click="openConfirm(primaryAction.action)"
          >
            <i class="far" :class="actionLoading === primaryAction.action ? 'fa-spinner fa-spin' : primaryAction.icon"></i>
            {{ primaryAction.label }}
          </button>

          <div v-if="secondaryActions.length" class="relative">
            <button
              class="btn-3"
              :disabled="!!actionLoading"
              @click="openMore = !openMore"
            >
              <i class="far fa-ellipsis-h"></i> More
            </button>
            <div
              v-if="openMore"
              class="absolute left-0 top-10 z-20 w-52 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
            >
              <button
                v-for="action in secondaryActions"
                :key="action.action"
                class="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                @click="openConfirm(action.action)"
              >
                <i class="far w-4" :class="action.icon"></i>
                <span>{{ action.label }}</span>
              </button>
            </div>
          </div>

          <button v-if="hasPermissionForAction('audit')" class="btn-3" @click="openConfirm('audit')">
            <i class="far fa-history"></i> Audit Trail
          </button>
        </div>

        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div class="bg-blue-50 rounded-xl p-3 text-center">
            <div class="text-xs text-blue-600 mb-1">Salary Month</div>
            <div class="font-bold text-blue-800">{{ item.salary_month || '—' }}</div>
          </div>
          <div class="bg-indigo-50 rounded-xl p-3 text-center">
            <div class="text-xs text-indigo-600 mb-1">Salary Type</div>
            <div class="font-bold text-indigo-800">{{ item.salary_type || '—' }}</div>
          </div>
          <div class="bg-emerald-50 rounded-xl p-3 text-center">
            <div class="text-xs text-emerald-600 mb-1">Total Payrolls</div>
            <div class="font-bold text-emerald-800">{{ item.payrolls?.length ?? '—' }}</div>
          </div>
          <div class="bg-amber-50 rounded-xl p-3 text-center">
            <div class="text-xs text-amber-600 mb-1">Remarks</div>
            <div class="font-medium text-amber-800 text-xs break-words">{{ item.remarks || '—' }}</div>
          </div>
        </div>
      </div>

      <!-- Payrolls Table -->
      <div v-if="item.payrolls?.length" class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-x-auto">
        <div class="px-5 py-3 border-b font-semibold text-blue-800 flex items-center justify-between">
          <span>Payrolls ({{ item.payrolls.length }})</span>
        </div>
        <table class="w-full text-sm">
          <thead class="bg-blue-50 text-blue-900 text-xs uppercase">
            <tr>
              <th class="px-4 py-3 text-left">#</th>
              <th class="px-4 py-3 text-left">Employee</th>
              <th class="px-4 py-3 text-left">Dept.</th>
              <th class="px-4 py-3 text-right">Gross</th>
              <th class="px-4 py-3 text-right">Deductions</th>
              <th class="px-4 py-3 text-right">Net Salary</th>
              <th class="px-4 py-3 text-center">Status</th>
              <th class="px-4 py-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-50">
            <tr v-for="(p, i) in item.payrolls" :key="p.id" class="hover:bg-gray-50 transition-colors">
              <td class="px-4 py-3 text-gray-400 text-xs">{{ i + 1 }}</td>
              <td class="px-4 py-3">
                <div class="font-medium text-blue-900">{{ p.user?.name || '—' }}</div>
                <div class="text-xs text-gray-400">{{ p.user?.employee_id }}</div>
              </td>
              <td class="px-4 py-3 text-gray-500 text-xs">{{ p.user?.department?.name || '—' }}</td>
              <td class="px-4 py-3 text-right font-mono">{{ formatCurrency(p.gross_salary) }}</td>
              <td class="px-4 py-3 text-right font-mono text-red-600">{{ formatCurrency(p.total_deduction) }}</td>
              <td class="px-4 py-3 text-right font-mono font-bold text-emerald-700">{{ formatCurrency(p.net_salary) }}</td>
              <td class="px-4 py-3 text-center"><PayrollStatusBadge :status="p.payment_status" /></td>
              <td class="px-4 py-3 text-center">
                <div class="flex items-center justify-center gap-1.5">
                  <button
                    v-if="canReviewPayroll(p)"
                    class="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-100 disabled:opacity-60"
                    :disabled="actionLoading === `payroll-review-${p.id}`"
                    title="Review Payroll"
                    @click="reviewPayrollRow(p)"
                  >
                    <i class="far" :class="actionLoading === `payroll-review-${p.id}` ? 'fa-spinner fa-spin' : 'fa-clipboard-check'"></i>
                    Review
                  </button>
                <button @click="router.push({ name: 'PayrollShow', params: { id: p.id } })"
                  class="p-1.5 text-indigo-500 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors" title="View Payroll">
                  <i class="far fa-eye text-xs"></i>
                </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-else class="bg-gray-50 rounded-xl p-8 text-center text-gray-400">
        <i class="fas fa-folder-open text-3xl mb-2"></i>
        <p>No payrolls in this batch yet.</p>
      </div>

      <div class="flex gap-3">
        <button class="btn-3" @click="router.push({ name: 'PayrollBatchList' })">
          <i class="far fa-list"></i> All Batches
        </button>
      </div>
    </template>

    <div v-else class="bg-gray-50 rounded-xl p-12 text-center text-gray-400">
      <p>Batch not found.</p>
    </div>

    <div v-if="showSyncLogs" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div class="w-full max-w-5xl rounded-xl bg-white p-5 shadow-2xl">
        <div class="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 class="text-lg font-bold text-slate-900">Step ERP Sync Logs</h2>
            <p class="mt-1 text-sm text-slate-600">Batch #{{ item?.id }}</p>
          </div>
          <button class="btn-3" @click="showSyncLogs = false"><i class="far fa-times"></i></button>
        </div>
        <div class="max-h-[70vh] overflow-auto">
          <table class="w-full text-sm">
            <thead class="bg-slate-50 text-xs uppercase text-slate-600">
              <tr>
                <th class="px-3 py-2 text-left">Batch</th>
                <th class="px-3 py-2 text-center">Mode</th>
                <th class="px-3 py-2 text-center">Chunk</th>
                <th class="px-3 py-2 text-center">Employees</th>
                <th class="px-3 py-2 text-center">Status</th>
                <th class="px-3 py-2 text-center">HTTP</th>
                <th class="px-3 py-2 text-left">Error</th>
                <th class="px-3 py-2 text-center">Sent At</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr v-for="log in syncLogs" :key="log.id">
                <td class="px-3 py-2 font-mono text-xs">{{ log.batch_id }}</td>
                <td class="px-3 py-2 text-center">{{ log.sync_mode }}</td>
                <td class="px-3 py-2 text-center">{{ log.chunk_no }}/{{ log.total_chunks }}</td>
                <td class="px-3 py-2 text-center">{{ log.employee_count }}</td>
                <td class="px-3 py-2 text-center">{{ log.status }}</td>
                <td class="px-3 py-2 text-center">{{ log.http_status || '—' }}</td>
                <td class="px-3 py-2 text-xs text-red-600">{{ log.error_message || '—' }}</td>
                <td class="px-3 py-2 text-center text-xs">{{ log.sent_at?.slice(0, 19) || '—' }}</td>
              </tr>
              <tr v-if="!syncLogs.length">
                <td colspan="8" class="px-3 py-6 text-center text-slate-400">No Step ERP sync logs found.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

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
          <button class="btn-3" :disabled="!!actionLoading" @click="closeConfirm">Cancel</button>
          <button class="btn-2" :disabled="!!actionLoading" @click="runConfirmedAction">
            <i class="far" :class="actionLoading ? 'fa-spinner fa-spin' : 'fa-check'"></i>
            Confirm
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
