<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'
import apiClient from '@/axios'
import { formatCurrency } from '@/utils/currency'
import { usePayrollAdvanceDeductionStore } from '@/stores/payrollAdvanceDeduction'

const route  = useRoute()
const router = useRouter()
const toast  = useToast()
const advStore = usePayrollAdvanceDeductionStore()

const notifications = ref([])
const loading       = ref(false)
const error         = ref(null)
const actioningId   = ref(null)

const type = computed(() => route.query.type || '')

const title = computed(() => {
  if (type.value === 'payroll_advance_deductions') return 'Advance Deduction Notifications'
  if (type.value === 'payroll_adjustments')        return 'Payroll Adjustment Notifications'
  return 'Payroll Notifications'
})

const isAdvanceDeduction = (n) => n.notification_type === 'payroll_advance_deduction_created'
const isAdjustment       = (n) => n.notification_type === 'payroll_adjustment_created'

const entryId = (n) => isAdvanceDeduction(n) ? n.advance_deduction_id : n.adjustment_id

const showRoute = (n) => {
  if (isAdvanceDeduction(n)) {
    return { name: 'PayrollAdvanceDeductionShow', params: { id: entryId(n) } }
  }
  return { name: 'PayrollAdjustmentShow', params: { id: entryId(n) } }
}

const notifTypeLabel = (n) => {
  if (isAdvanceDeduction(n)) return 'Advance Deduction'
  if (isAdjustment(n))       return 'Payroll Adjustment'
  return 'Payroll'
}

// ── Fetch ──────────────────────────────────────────────────────────────────
const fetchNotifications = async () => {
  loading.value = true
  error.value   = null
  try {
    const params = type.value ? { type: type.value } : {}
    const res = await apiClient.get('/payroll-notifications', { params })
    notifications.value = res.data?.notifications || []
  } catch (e) {
    error.value = e.response?.data?.message || 'Failed to load notifications.'
  } finally {
    loading.value = false
  }
}

// ── Mark single notification as read ──────────────────────────────────────
const markOneRead = async (notifId) => {
  try {
    await apiClient.post(`/notifications/${notifId}/read`)
  } catch {}
}

// ── Approve Advance Deduction ──────────────────────────────────────────────
const approveAdvanceDeduction = async (n) => {
  const id = entryId(n)
  if (!id) return

  const note = window.prompt('Approval note (optional):', '')
  if (note === null) return

  actioningId.value = n.id
  try {
    await advStore.approve(id, note)
    await markOneRead(n.id)
    toast.success('Advance deduction approved.')
    await fetchNotifications()
  } catch (e) {
    toast.error(e.message || 'Approval failed.')
  } finally {
    actioningId.value = null
  }
}

// ── Verify Adjustment ──────────────────────────────────────────────────────
const verifyAdjustment = async (n) => {
  const id = entryId(n)
  if (!id) return

  const note = window.prompt('Approval note (optional):', '')
  if (note === null) return

  actioningId.value = n.id
  try {
    await apiClient.patch(`/payroll-adjustments/${id}/verify`, { note })
    await markOneRead(n.id)
    toast.success('Adjustment marked ready to apply.')
    await fetchNotifications()
  } catch (e) {
    toast.error(e.response?.data?.message || e.message || 'Action failed.')
  } finally {
    actioningId.value = null
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────
const formatDate = (d) => {
  if (!d) return '—'
  return new Date(d).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

onMounted(fetchNotifications)
</script>

<template>
  <section class="mx-auto max-w-3xl px-4 py-6 space-y-5">

    <!-- Header -->
    <div class="flex items-center justify-between gap-3 flex-wrap">
      <div>
        <p class="text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">Payroll</p>
        <h1 class="text-2xl font-semibold text-slate-900">{{ title }}</h1>
      </div>
      <div class="flex items-center gap-2">
        <button
          type="button"
          class="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
          @click="router.back()"
        >
          <i class="far fa-arrow-left text-xs"></i> Back
        </button>
        <button
          type="button"
          class="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
          :disabled="loading"
          @click="fetchNotifications"
        >
          <i :class="['far fa-sync-alt text-xs', loading ? 'animate-spin' : '']"></i>
        </button>
      </div>
    </div>

    <!-- Loading skeleton -->
    <div v-if="loading" class="space-y-3">
      <div v-for="i in 4" :key="i" class="h-24 animate-pulse rounded-2xl bg-slate-100"></div>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="rounded-2xl bg-rose-50 p-4 text-sm text-rose-700 ring-1 ring-rose-200">
      <i class="far fa-exclamation-circle mr-1"></i>{{ error }}
    </div>

    <!-- Empty -->
    <div v-else-if="!notifications.length" class="flex flex-col items-center py-16 text-center">
      <div class="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-3xl text-slate-300">
        <i class="far fa-bell-slash"></i>
      </div>
      <p class="mt-4 text-base font-semibold text-slate-600">No notifications</p>
      <p class="text-sm text-slate-400">You're all caught up.</p>
    </div>

    <!-- List -->
    <div v-else class="space-y-2">
      <div
        v-for="n in notifications"
        :key="n.id"
        :class="[
          'rounded-2xl border p-4 transition',
          n.read_at
            ? 'border-slate-100 bg-white'
            : 'border-rose-100 bg-rose-50/40',
        ]"
      >
        <div class="flex items-start gap-3">

          <!-- Icon -->
          <div
            :class="isAdvanceDeduction(n)
              ? 'bg-rose-100 text-rose-600'
              : 'bg-indigo-100 text-indigo-600'"
            class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm"
          >
            <i :class="isAdvanceDeduction(n) ? 'fas fa-money-bill-wave' : 'fas fa-sliders-h'"></i>
          </div>

          <!-- Content -->
          <div class="min-w-0 flex-1 space-y-1.5">

            <!-- Top row: type badge + date + unread dot -->
            <div class="flex items-center justify-between gap-2 flex-wrap">
              <div class="flex items-center gap-2">
                <span class="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
                  {{ notifTypeLabel(n) }}
                </span>
                <span v-if="!n.read_at" class="h-2 w-2 rounded-full bg-rose-500 inline-block"></span>
              </div>
              <span class="text-[11px] text-slate-400">{{ formatDate(n.created_at) }}</span>
            </div>

            <!-- Message -->
            <p class="text-sm font-medium text-slate-800 leading-snug">{{ n.message }}</p>

            <!-- Meta -->
            <div class="flex flex-wrap gap-3 text-[11px] text-slate-500">
              <span v-if="n.employee_name">
                <i class="far fa-user mr-1"></i>{{ n.employee_name }}
              </span>
              <span v-if="n.amount !== undefined">
                <i class="far fa-money-bill-alt mr-1"></i>{{ formatCurrency(n.amount) }}
              </span>
              <span v-if="n.carry_on_month || n.ref_month">
                <i class="far fa-calendar mr-1"></i>{{ n.carry_on_month || n.ref_month }}
              </span>
              <span v-if="n.actor_name">
                <i class="far fa-user-edit mr-1"></i>by {{ n.actor_name }}
              </span>
            </div>

            <!-- Actions -->
            <div class="flex items-center gap-2 pt-1">

              <!-- Show button -->
              <RouterLink
                v-if="entryId(n)"
                :to="showRoute(n)"
                class="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 transition"
              >
                <i class="far fa-file-alt text-[10px]"></i>
                Show
              </RouterLink>

              <!-- Approve — Advance Deduction -->
              <button
                v-if="isAdvanceDeduction(n) && entryId(n)"
                type="button"
                :disabled="actioningId === n.id"
                class="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition disabled:opacity-50"
                @click="approveAdvanceDeduction(n)"
              >
                <i :class="['far text-[10px]', actioningId === n.id ? 'fa-spinner fa-spin' : 'fa-check-circle']"></i>
                {{ actioningId === n.id ? 'Approving...' : 'Approve' }}
              </button>

              <!-- Verify — Adjustment -->
              <button
                v-if="isAdjustment(n) && entryId(n)"
                type="button"
                :disabled="actioningId === n.id"
                class="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition disabled:opacity-50"
                @click="verifyAdjustment(n)"
              >
                <i :class="['far text-[10px]', actioningId === n.id ? 'fa-spinner fa-spin' : 'fa-shield-check']"></i>
                {{ actioningId === n.id ? 'Processing...' : 'Verify' }}
              </button>

            </div>
          </div>
        </div>
      </div>
    </div>

  </section>
</template>
