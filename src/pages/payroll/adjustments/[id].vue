<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'
import { storeToRefs } from 'pinia'
import { useAdjustmentStore } from '@/stores/adjustmentStore'
import { useAuthStore } from '@/stores/auth'
import AdjustmentStatusBadge from '@/components/payroll/adjustments/AdjustmentStatusBadge.vue'
import LoaderView from '@/components/common/LoaderView.vue'
import { formatCurrency } from '@/utils/currency'

const props = defineProps({
  id: { type: [String, Number], required: true },
})

const router = useRouter()
const route = useRoute()
const toast = useToast()
const store = useAdjustmentStore()
const authStore = useAuthStore()
const { item, loading, error } = storeToRefs(store)

const approveNote = ref('')
const rejectReason = ref('')
const rejectBusy = ref(false)
const showRejectModal = ref(false)

const canVerify = computed(() => Boolean(item.value?.can_verify))
const canReject = computed(() => ['admin', 'super_admin', 'developer'].includes(String(authStore.user?.role || '').toLowerCase()))

const userName = (user) => {
  if (!user) return ''
  if (typeof user === 'string') return user
  return user.name || user.full_name || user.employee?.name || ''
}

const preparedByName = computed(() => userName(item.value?.raised_by) || item.value?.raised_by_name || '-')
const authorizedByName = computed(() => userName(item.value?.approved_by) || item.value?.approved_by_name || '-')

const formatDate = (value) => {
  if (!value) return '-'
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`)
  if (Number.isNaN(date.getTime())) return String(value)

  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(date)
}

const printSlip = () => {
  window.print()
}

const load = async () => {
  try {
    await store.fetchOne(props.id || route.params.id)
  } catch (e) {
    toast.error(e.message || 'Failed to load adjustment.')
  }
}

const verify = async () => {
  try {
    await store.verify(props.id, approveNote.value)
    toast.success('Adjustment approved.')
    approveNote.value = ''
    await load()
  } catch (e) {
    toast.error(e.message || 'Approval failed.')
  }
}

const reject = async () => {
  if (!rejectReason.value.trim()) {
    toast.error('Please enter a rejection reason.')
    return
  }

  rejectBusy.value = true
  try {
    await store.reject(props.id, rejectReason.value)
    toast.success('Adjustment rejected.')
    rejectReason.value = ''
    showRejectModal.value = false
    await load()
  } catch (e) {
    toast.error(e.message || 'Reject failed.')
  } finally {
    rejectBusy.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="print-wrap space-y-4 p-4 md:p-6">
    <div class="no-print flex flex-wrap items-center justify-between gap-3">
      <div class="flex items-center gap-3">
        <button class="btn-3" @click="router.back()"><i class="far fa-arrow-left"></i></button>
        <div>
          <h1 class="text-2xl font-bold text-slate-900">Adjustment Slip</h1>
          <p class="text-sm text-slate-500">Printable view for payroll adjustment.</p>
        </div>
      </div>

      <button class="btn-2" @click="printSlip">
        <i class="far fa-print"></i> Print
      </button>
    </div>

    <LoaderView v-if="loading" />

    <div v-else-if="error" class="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
      {{ error }}
    </div>

    <template v-else-if="item">
      <div class="print-page mx-auto w-full max-w-3xl rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div class="text-center">
          <div class="text-2xl font-bold text-slate-900">Payroll Adjustment Slip</div>
          <div class="mt-1 text-sm text-slate-500">For internal approval and record</div>
        </div>

        <div class="mt-5 flex items-center justify-between gap-3">
          <div>
            <div class="text-lg font-semibold text-slate-900">{{ item.employee?.name || '-' }}</div>
            <div class="text-sm text-slate-500">{{ item.employee?.employee_id || '-' }}</div>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Status</span>
            <AdjustmentStatusBadge :status="item.status" />
          </div>
        </div>

        <div class="mt-6">
          <div class="text-base font-semibold text-slate-900">Employee Information</div>
          <table class="slip-table mt-2 w-full">
            <tbody>
              <tr>
                <th>Employee Name</th>
                <td>{{ item.employee?.name || '-' }}</td>
                <th>Employee ID</th>
                <td>{{ item.employee?.employee_id || '-' }}</td>
              </tr>
              <tr>
                <th>Department</th>
                <td> {{ item.department_name || '-' }}</td>
                <th>Date</th>
                <td>{{ formatDate(item.created_at) }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="mt-6">
          <div class="text-base font-semibold text-slate-900">Adjustment Details</div>
          <table class="slip-table mt-2 w-full">
            <tbody>
              <tr>
                <th>Type</th>
                <td class="capitalize">{{ item.adjustment_type?.replace(/_/g, ' ') || '-' }}</td>
                <th>Settlement</th>
                <td class="capitalize">
                  {{ (item.settlement_type || 'carry_forward').replace(/_/g, ' ') }}
                </td>
              </tr>
              <tr>
                <th>Reference Month</th>
                <td>{{ item.ref_month_label || '-' }}</td>
                <th>Carry To</th>
                <td>{{ item.carry_to_label || '-' }}</td>
              </tr>
              <tr>
                <th>Amount</th>
                <td colspan="3" class="font-semibold" :class="Number(item.amount) >= 0 ? 'text-emerald-700' : 'text-rose-700'">
                  {{ formatCurrency(item.amount) }}
                </td>
              </tr>
              <tr>
                <th>Reason</th>
                <td colspan="3" class="whitespace-pre-wrap">{{ item.reason || '-' }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="no-print mt-4 flex flex-wrap gap-2">
          <button v-if="canVerify && ['pending', 'verified'].includes(item.status)" class="btn-2" @click="verify">
            <i class="far fa-check-circle"></i> Approve
          </button>
          <button v-if="canReject && ['pending', 'verified'].includes(item.status)" class="btn-3" @click="showRejectModal = true">
            <i class="far fa-times-circle"></i> Reject
          </button>
        </div>

        <div v-if="canVerify && ['pending', 'verified'].includes(item.status)" class="no-print mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <label class="mb-1 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Approval Note</label>
          <textarea
            v-model="approveNote"
            rows="3"
            class="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm focus:border-blue-400 focus:outline-none focus:ring-4 focus:ring-blue-100"
            placeholder="Optional note for approval"
          />
          <div class="mt-3 flex justify-end">
            <button class="btn-2" @click="verify">
              <i class="far fa-check"></i>
              Approve with Note
            </button>
          </div>
        </div>

        <div class="mt-10 grid grid-cols-2 gap-8">
          <div class="text-center">
            <div class="mt-1 text-sm font-semibold text-slate-900">{{ preparedByName }}</div>
            <div class="signature-line mx-auto"></div>
            <div class="mt-1 text-sm font-semibold text-slate-700">Prepared By</div>
          </div>
          <div class="text-center">
            <div class="mt-1 text-sm font-semibold text-slate-900">{{ authorizedByName }}</div>
            <div class="signature-line mx-auto"></div>
            <div class="mt-1 text-sm font-semibold text-slate-700">Authorized By</div>
          </div>
        </div>
      </div>
    </template>

    <div v-else class="rounded-xl border border-dashed border-slate-200 bg-white p-10 text-center text-slate-500">
      Adjustment not found.
    </div>

    <div v-if="showRejectModal" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
      <div class="w-full max-w-lg rounded-3xl bg-white p-5 shadow-2xl">
        <h3 class="text-lg font-semibold text-slate-900">Reject Adjustment</h3>
        <p class="mt-1 text-sm text-slate-500">Provide a clear rejection reason.</p>
        <textarea
          v-model="rejectReason"
          rows="4"
          class="mt-4 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-blue-400 focus:outline-none focus:ring-4 focus:ring-blue-100"
          placeholder="Reason for rejection"
        />
        <div class="mt-4 flex justify-end gap-2">
          <button class="btn-3" @click="showRejectModal = false">Cancel</button>
          <button class="btn-2" :disabled="rejectBusy" @click="reject">
            <i class="far" :class="rejectBusy ? 'fa-spinner fa-spin' : 'fa-paper-plane'"></i>
            {{ rejectBusy ? 'Rejecting...' : 'Reject' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style>
@page {
  size: A4 portrait;
  margin: 12mm;
}

@media print {
  .no-print {
    display: none !important;
  }

  .print-wrap {
    padding: 0 !important;
  }

  .print-page {
    box-shadow: none !important;
    border: 1px solid #cbd5e1 !important;
    border-radius: 0 !important;
    padding: 16px !important;
  }
}

.slip-table {
  border-collapse: collapse;
  table-layout: fixed;
  border: 1px solid #94a3b8;
}

.slip-table th,
.slip-table td {
  border: 1px solid #94a3b8;
  padding: 10px 12px;
  font-size: 12px;
  vertical-align: top;
}

.slip-table th {
  width: 22%;
  text-align: left;
  background: #f8fafc;
  color: #0f172a;
  font-weight: 700;
}

.slip-table td {
  color: #0f172a;
}

.signature-line {
  width: 90%;
  border-top: 1px solid #475569;
  height: 0;
}
</style>
