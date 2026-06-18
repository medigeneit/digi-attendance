<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'
import { storeToRefs } from 'pinia'
import { usePayrollAdvanceDeductionStore } from '@/stores/payrollAdvanceDeduction'
import { useAuthStore } from '@/stores/auth'
import LoaderView from '@/components/common/LoaderView.vue'
import { formatCurrency } from '@/utils/currency'

const props = defineProps({
  id: { type: [String, Number], required: true },
})

const router  = useRouter()
const route   = useRoute()
const toast   = useToast()
const store   = usePayrollAdvanceDeductionStore()
const authStore = useAuthStore()
const { currentItem: item, loading, error } = storeToRefs(store)
const approveNote = ref('')
const rejectReason = ref('')
const rejectBusy = ref(false)
const showRejectModal = ref(false)

// ─── Permissions (same as adjustment list) ────────────────────────────────
const userRole = computed(() => String(authStore.user?.role || '').toLowerCase())
const canDelete = computed(() =>
  ['super_admin', 'developer'].includes(userRole.value) && paymentStatus.value === 'pending' && !item.value?.payroll_id
)
const canVerify = computed(() => Boolean(item.value?.can_verify))
const canReject = computed(() => Boolean(item.value?.can_verify))

// ─── Helpers ───────────────────────────────────────────────────────────────

const formatDate = (value) => {
  if (!value) return '-'
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`)
  if (Number.isNaN(date.getTime())) return String(value)
  return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }).format(date)
}

const monthLabel = (value) => {
  if (!value) return '-'
  const m = String(value).slice(0, 7)
  const [y, mo] = m.split('-').map(Number)
  if (!y || !mo) return m
  return new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric' }).format(new Date(y, mo - 1, 1))
}

const statusCfg = (status) => {
  if (status === 'approved') return { label: 'Approved', cls: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200', dot: 'bg-emerald-400' }
  if (status === 'rejected') return { label: 'Rejected', cls: 'bg-rose-50 text-rose-700 ring-1 ring-rose-200', dot: 'bg-rose-400' }
  if (status === 'pending') return { label: 'Pending', cls: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',     dot: 'bg-amber-400'   }
  return                           { label: status,    cls: 'bg-slate-50 text-slate-700 ring-1 ring-slate-200',     dot: 'bg-slate-400'   }
}
const paymentStatus = computed(() =>
  item.value?.payment_status || (item.value?.status === 'rejected' ? 'rejected' : (item.value?.approved_at ? 'approved' : 'pending'))
)

const creatorName = computed(() =>
  item.value?.creator?.name || '-'
)
const authorizedByName = computed(() =>
  item.value?.approved_by?.name || item.value?.approved_by_name || '-'
)
const rejectedByName = computed(() =>
  item.value?.rejected_by?.name || item.value?.rejected_by_name || '-'
)
const payrollApplied = computed(() => Boolean(item.value?.payroll_id || item.value?.payroll || item.value?.status === 'applied'))

// ─── Load ──────────────────────────────────────────────────────────────────

const load = async () => {
  try {
    await store.fetchOne(props.id || route.params.id)
  } catch (e) {
    toast.error(e.message || 'Failed to load advance deduction.')
  }
}

const deleteEntry = async () => {
  if (!confirm('Delete this advance deduction?')) return
  try {
    await store.deleteItem(item.value.id)
    toast.success('Deleted.')
    router.push({ name: 'PayrollAdvanceDeductionList' })
  } catch (e) {
    toast.error(e.message || 'Failed to delete.')
  }
}

const approveEntry = async () => {
  try {
    await store.approve(props.id || route.params.id, approveNote.value)
    toast.success('Advance deduction approved.')
    approveNote.value = ''
    await load()
  } catch (e) {
    toast.error(e.message || 'Approval failed.')
  }
}

const rejectEntry = async () => {
  if (!rejectReason.value.trim()) {
    toast.error('Please enter a rejection reason.')
    return
  }

  rejectBusy.value = true
  try {
    await store.reject(props.id || route.params.id, rejectReason.value)
    toast.success('Advance deduction rejected.')
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

    <!-- Screen header ───────────────────────────────────────── no-print -->
    <div class="no-print -mx-4 -mt-4 mb-2 border-b border-slate-200 bg-white px-4 py-3 shadow-sm md:-mx-6 md:-mt-6">
      <div class="flex flex-wrap items-center justify-between gap-3">

        <!-- Left: back · breadcrumb · title · status -->
        <div class="flex min-w-0 items-center gap-3">
          <button
            class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:border-slate-300 hover:bg-slate-50"
            @click="router.back()"
          >
            <i class="far fa-arrow-left text-xs"></i>
          </button>

          <div class="h-8 w-px bg-slate-200"></div>

          <div class="min-w-0">
            <!-- Breadcrumb -->
            <div class="flex items-center gap-1 text-[10px]">
              <span class="font-bold uppercase tracking-[0.2em] text-rose-500">Payroll</span>
              <i class="far fa-chevron-right text-[9px] text-slate-300"></i>
              <button
                class="text-slate-400 transition hover:text-slate-700"
                @click="router.push({ name: 'PayrollAdvanceDeductionList' })"
              >Advance Deductions</button>
              <i class="far fa-chevron-right text-[9px] text-slate-300"></i>
              <span class="font-semibold text-slate-600">#{{ item?.id ?? '…' }}</span>
            </div>
            <!-- Title + status badge -->
            <div class="mt-0.5 flex items-center gap-2">
              <h1 class="text-base font-bold leading-none text-slate-900">Advance Slip</h1>
              <span
                v-if="item"
                :class="['inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold', statusCfg(paymentStatus).cls]"
              >
                <span :class="['h-1 w-1 rounded-full', statusCfg(paymentStatus).dot]"></span>
                {{ statusCfg(paymentStatus).label }}
              </span>
            </div>
          </div>
        </div>

        <!-- Right: employee quick-info + actions -->
        <div class="flex items-center gap-3">

          <!-- Employee pill (md+) -->
          <div v-if="item" class="hidden items-center gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-1.5 md:flex">
            <div class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-rose-100 text-[11px] font-bold text-rose-600">
              {{ (item.employee?.name || '?')[0].toUpperCase() }}
            </div>
            <div class="text-right leading-tight">
              <div class="text-xs font-semibold text-slate-800">{{ item.employee?.name || '—' }}</div>
              <div class="text-[10px] text-slate-400">
                {{ item.employee?.employee_id || '' }}
                <span v-if="item.carry_on_month"> · {{ monthLabel(item.carry_on_month) }}</span>
              </div>
            </div>
          </div>

          <div class="h-8 w-px bg-slate-200"></div>

          <!-- Action buttons -->
          <div class="flex items-center gap-1.5">
            <button
              v-if="canDelete"
              class="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-50"
              @click="deleteEntry"
            >
              <i class="far fa-trash-alt text-[10px]"></i> Delete
            </button>
            <button
              class="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
              onclick="window.print()"
            >
              <i class="far fa-print text-[10px]"></i> Print
            </button>
            <button
              class="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-rose-700"
              @click="router.push({ name: 'PayrollAdvanceDeductionList' })"
            >
              <i class="far fa-list text-[10px]"></i> All Records
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Loader / Error ──────────────────────────────────────────────────── -->
    <LoaderView v-if="loading" />

    <div
      v-else-if="error"
      class="no-print rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700"
    >
      {{ error }}
    </div>

    <!-- ══════════════════════════════════════════════════════════════════ -->
    <!-- SLIP                                                              -->
    <!-- ══════════════════════════════════════════════════════════════════ -->
    <template v-else-if="item">
      <div class="print-page mx-auto w-full max-w-3xl rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">

        <!-- Slip header -->
        <div class="slip-header relative border-b border-slate-300 pb-3 text-center">
          <div class="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
            Payroll Department
          </div>
          <div class="mt-1 text-2xl font-bold uppercase tracking-wide text-slate-950">
            Advance Slip
          </div>
          <div class="mt-1 text-xs font-medium text-slate-600">
            For internal record and payroll deduction reference
          </div>
          <div class="absolute right-0 top-0 text-right text-[11px] text-slate-500">
            <div>Slip No.</div>
            <div class="font-semibold text-slate-900">#{{ item.id }}</div>
          </div>
        </div>

        <!-- Status + Date -->
        <div class="mt-4 flex flex-wrap items-center justify-between gap-2">
          <div class="flex items-center gap-2">
            <span class="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">Payment Status</span>
            <span :class="['inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold', statusCfg(paymentStatus).cls]">
              {{ statusCfg(paymentStatus).label }}
            </span>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">Payroll Deduction</span>
            <span
              :class="[
                'inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold',
                payrollApplied
                  ? 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200'
                  : 'bg-slate-50 text-slate-600 ring-1 ring-slate-200',
              ]"
            >
              {{ payrollApplied ? 'Applied to Payroll' : 'Not Applied' }}
            </span>
          </div>
          <div class="text-right text-[11px] text-slate-500">
            Date: <span class="font-semibold text-slate-800">{{ formatDate(item.created_at) }}</span>
          </div>
        </div>

        <!-- Employee Info -->
        <div class="section-block mt-4">
          <div class="section-title text-sm font-bold uppercase tracking-wide text-slate-900">
            Employee Information
          </div>
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
                <td>{{ item.employee?.department?.name || '-' }}</td>
                <th>Company</th>
                <td>{{ item.employee?.company?.name || '-' }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Deduction Details -->
        <div class="section-block mt-4">
          <div class="section-title text-sm font-bold uppercase tracking-wide text-slate-900">
            Deduction Details
          </div>
          <table class="slip-table mt-2 w-full">
            <tbody>
              <tr>
                <th>Carry On Month</th>
                <td>{{ monthLabel(item.carry_on_month) }}</td>
                <th>Date Created</th>
                <td>{{ formatDate(item.created_at) }}</td>
              </tr>
              <tr>
                <th>Amount</th>
                <td colspan="3" class="font-semibold text-rose-700">
                  {{ formatCurrency(item.amount) }}
                </td>
              </tr>
              <tr v-if="item.reason || item.note">
                <th>Reason / Note</th>
                <td colspan="3" class="whitespace-pre-wrap">{{ item.reason || item.note || '-' }}</td>
              </tr>
              <tr v-if="item.approved_by || item.approved_at">
                <th>Authorized By</th>
                <td>{{ authorizedByName }}</td>
                <th>Authorized At</th>
                <td>{{ formatDate(item.approved_at) }}</td>
              </tr>
              <tr v-if="paymentStatus === 'rejected'">
                <th>Rejected By</th>
                <td>{{ rejectedByName }}</td>
                <th>Rejected At</th>
                <td>{{ formatDate(item.rejected_at) }}</td>
              </tr>
              <tr v-if="paymentStatus === 'rejected'">
                <th>Reject Reason</th>
                <td colspan="3" class="whitespace-pre-wrap">{{ item.rejected_reason || '-' }}</td>
              </tr>
              <tr v-if="item.payroll">
                <th>Applied To Payroll</th>
                <td colspan="3">
                  {{ item.payroll?.salary_month ? monthLabel(item.payroll.salary_month) : '-' }}
                  <span v-if="item.applied_at" class="ml-2 text-[11px] text-slate-500">
                    (applied {{ formatDate(item.applied_at) }})
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="no-print mt-4 flex flex-wrap gap-2">
          <button v-if="canVerify && paymentStatus === 'pending'" class="btn-2" @click="approveEntry">
            <i class="far fa-check-circle"></i> Approve
          </button>
          <button v-if="canReject && paymentStatus === 'pending'" class="btn-3" @click="showRejectModal = true">
            <i class="far fa-times-circle"></i> Reject
          </button>
        </div>

        <div v-if="canVerify && paymentStatus === 'pending'" class="no-print mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <label class="mb-1 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Authorization Note</label>
          <textarea
            v-model="approveNote"
            rows="3"
            class="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm focus:border-blue-400 focus:outline-none focus:ring-4 focus:ring-blue-100"
            placeholder="Optional note for authorization"
          />
          <div class="mt-3 flex justify-end">
            <button class="btn-2" @click="approveEntry">
              <i class="far fa-check"></i>
              Approve with Note
            </button>
          </div>
        </div>

        <!-- Signature grid -->
        <div class="signature-grid mt-8 grid grid-cols-3 gap-6">
          <div class="text-center">
            <div class="signature-name mt-1 text-sm font-semibold text-slate-900">{{ creatorName }}</div>
            <div class="signature-line mx-auto"></div>
            <div class="signature-label mt-1 text-xs font-bold uppercase tracking-wide text-slate-700">
              Prepared By
            </div>
          </div>
          <div class="text-center">
            <div class="signature-name mt-1 text-sm font-semibold text-slate-900">{{ authorizedByName }}</div>
            <div class="signature-line mx-auto"></div>
            <div class="signature-label mt-1 text-xs font-bold uppercase tracking-wide text-slate-700">
              Authorized By
            </div>
          </div>
          <div class="text-center">
            <div class="signature-name mt-1 text-sm font-semibold text-slate-900">&nbsp;</div>
            <div class="signature-line mx-auto"></div>
            <div class="signature-label mt-1 text-xs font-bold uppercase tracking-wide text-slate-700">
              Received By
            </div>
          </div>
        </div>

        <p class="mt-6 border-t border-slate-100 pt-3 text-center text-[10px] text-slate-400">
          This is a system-generated advance deduction slip. For internal use only.
        </p>
      </div>
    </template>

    <!-- Not found -->
    <div
      v-else
      class="no-print rounded-xl border border-dashed border-slate-200 bg-white p-12 text-center text-slate-500"
    >
      <i class="far fa-file-times text-4xl text-slate-200"></i>
      <p class="mt-3 text-base font-semibold">Record not found</p>
      <button class="mt-4 btn-3" @click="router.back()">Go Back</button>
    </div>

    <div v-if="showRejectModal" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
      <div class="w-full max-w-lg rounded-3xl bg-white p-5 shadow-2xl">
        <h3 class="text-lg font-semibold text-slate-900">Reject Advance Deduction</h3>
        <p class="mt-1 text-sm text-slate-500">Provide a clear rejection reason.</p>
        <textarea
          v-model="rejectReason"
          rows="4"
          class="mt-4 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-blue-400 focus:outline-none focus:ring-4 focus:ring-blue-100"
          placeholder="Reason for rejection"
        />
        <div class="mt-4 flex justify-end gap-2">
          <button class="btn-3" @click="showRejectModal = false">Cancel</button>
          <button class="btn-2" :disabled="rejectBusy" @click="rejectEntry">
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
  margin: 0;
}

@media print {
  html, body {
    width: 210mm;
    min-height: 0 !important;
    background: #ffffff !important;
    print-color-adjust: exact;
    -webkit-print-color-adjust: exact;
  }

  .no-print {
    display: none !important;
  }

  .print-wrap {
    padding: 0 !important;
    margin: 0 !important;
    min-height: 0 !important;
  }

  /* suppress space-y-4 child margins so the slip sits flush */
  .print-wrap > * {
    margin-top: 0 !important;
  }

  .print-page {
    width: 190mm !important;
    min-height: 128mm !important;
    max-height: none !important;
    margin: 8mm auto 0 !important;
    box-shadow: none !important;
    border: 1px solid #94a3b8 !important;
    border-radius: 0 !important;
    overflow: visible !important;
    padding: 8mm !important;
    color: #111827 !important;
    break-inside: avoid !important;
    print-color-adjust: exact !important;
    -webkit-print-color-adjust: exact !important;
  }

  .print-page .text-2xl {
    font-size: 17px !important;
    line-height: 22px !important;
  }

  .section-block {
    margin-top: 10px !important;
  }

  .signature-grid {
    margin-top: 18px !important;
    page-break-inside: avoid !important;
  }

  .signature-name {
    min-height: 15px !important;
    font-size: 11px !important;
  }

  .signature-label {
    font-size: 10px !important;
  }
}

.slip-table {
  border-collapse: collapse;
  table-layout: fixed;
  border: 1px solid #64748b;
  print-color-adjust: exact;
  -webkit-print-color-adjust: exact;
}

.slip-table th,
.slip-table td {
  border: 1px solid #94a3b8;
  padding: 8px 10px;
  font-size: 12px;
  vertical-align: top;
  print-color-adjust: exact;
  -webkit-print-color-adjust: exact;
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

.print-page {
  print-color-adjust: exact;
  -webkit-print-color-adjust: exact;
}

.signature-line {
  width: 88%;
  border-top: 1px solid #475569;
  height: 0;
  margin-top: 4px;
}
</style>
