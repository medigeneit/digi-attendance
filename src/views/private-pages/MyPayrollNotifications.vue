<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'
import apiClient from '@/axios'
import { formatCurrency } from '@/utils/currency'
import { useNotificationStore } from '@/stores/notification'
import { usePayrollAdvanceDeductionStore } from '@/stores/payrollAdvanceDeduction'

const route    = useRoute()
const router   = useRouter()
const toast    = useToast()
const notifStore = useNotificationStore()
const advStore = usePayrollAdvanceDeductionStore()

const notifications = ref([])
const loading       = ref(false)
const error         = ref(null)
const actioningId   = ref(null)

// Per-card note state: { [notifId]: { open: bool, text: string } }
const noteState = ref({})

const type = computed(() => route.query.type || '')

const title = computed(() => {
  if (type.value === 'payroll_advance_deductions') return 'Advance Deductions'
  if (type.value === 'payroll_adjustments')        return 'Payroll Adjustments'
  return 'Payroll'
})

const isAdvanceDeduction = (n) => n.notification_type === 'payroll_advance_deduction_created'
const isAdjustment       = (n) => n.notification_type === 'payroll_adjustment_created'
const isForwarded        = (n) => n.notification_type?.includes('forwarded')
const entryId = (n) => isAdvanceDeduction(n) ? n.advance_deduction_id : n.adjustment_id

const showRoute = (n) => isAdvanceDeduction(n)
  ? { name: 'PayrollAdvanceDeductionShow', params: { id: entryId(n) } }
  : { name: 'PayrollAdjustmentShow', params: { id: entryId(n) } }

const unreadCount = computed(() => notifications.value.filter(n => !n.read_at).length)

// ── Fetch ──────────────────────────────────────────────────────────────────
const fetchNotifications = async () => {
  loading.value = true
  error.value   = null
  try {
    const params = type.value ? { type: type.value } : {}
    const res = await apiClient.get('/payroll-notifications', { params })
    notifications.value = res.data?.notifications || []
    noteState.value = {}
  } catch (e) {
    error.value = e.response?.data?.message || 'Failed to load.'
  } finally {
    loading.value = false
  }
}

// Remove from local list and mark read
const removeAndRead = async (n) => {
  try { await apiClient.post(`/notifications/${n.id}/read`) } catch {}
  notifications.value = notifications.value.filter(x => x.id !== n.id)
  notifStore.fetchCountNotifications()
}

// Toggle note input
const toggleNote = (notifId) => {
  if (!noteState.value[notifId]) noteState.value[notifId] = { open: false, text: '' }
  noteState.value[notifId].open = !noteState.value[notifId].open
}
const getNote = (notifId) => noteState.value[notifId]?.text || ''

// ── Approve Advance Deduction ──────────────────────────────────────────────
const approveAdvanceDeduction = async (n) => {
  const id = entryId(n)
  if (!id) return
  actioningId.value = n.id
  try {
    const note = getNote(n.id)
    await advStore.approve(id, note)
    toast.success('Advance deduction approved.')
    await removeAndRead(n)
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
  actioningId.value = n.id
  try {
    const note = getNote(n.id)
    await apiClient.patch(`/payroll-adjustments/${id}/verify`, { note })
    toast.success('Adjustment marked ready to apply.')
    await removeAndRead(n)
  } catch (e) {
    toast.error(e.response?.data?.message || e.message || 'Action failed.')
  } finally {
    actioningId.value = null
  }
}

const formatDate = (d) => {
  if (!d) return '—'
  const date = new Date(d)
  const now  = new Date()
  const diff = Math.floor((now - date) / 1000)
  if (diff < 60)    return 'Just now'
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return date.toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

// Refresh header count after any change
const refreshHeaderCount = () => notifStore.fetchCountNotifications()

onMounted(async () => {
  await fetchNotifications()
  refreshHeaderCount()
})
</script>

<template>
  <div class="min-h-screen bg-slate-50">

    <!-- ── Header ──────────────────────────────────────────────────────────── -->
    <div class="border-b border-slate-200 bg-white">
      <div class="mx-auto max-w-2xl px-4 py-3">
        <div class="flex items-center gap-3">
          <button
            type="button"
            class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 transition"
            @click="router.back()"
          >
            <i class="far fa-arrow-left text-xs"></i>
          </button>

          <div class="flex-1 min-w-0">
            <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Payroll</p>
            <h1 class="text-base font-bold text-slate-900 leading-tight">{{ title }}</h1>
          </div>

          <div class="flex items-center gap-2">
            <span v-if="unreadCount > 0" class="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-bold text-rose-600">
              <span class="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse"></span>
              {{ unreadCount }} new
            </span>
            <button
              type="button"
              :disabled="loading"
              class="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 transition disabled:opacity-40"
              @click="fetchNotifications"
            >
              <i :class="['far fa-sync-alt text-xs', loading ? 'animate-spin' : '']"></i>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ── Content ──────────────────────────────────────────────────────────── -->
    <div class="mx-auto max-w-2xl px-4 py-4">

      <!-- Loading -->
      <div v-if="loading" class="space-y-2">
        <div v-for="i in 3" :key="i" class="h-20 animate-pulse rounded-xl bg-white border border-slate-100"></div>
      </div>

      <!-- Error -->
      <div v-else-if="error"
        class="flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
        <i class="far fa-exclamation-circle shrink-0"></i>{{ error }}
      </div>

      <!-- Empty -->
      <div v-else-if="!notifications.length"
        class="mt-6 rounded-xl border border-emerald-100 bg-emerald-50 px-6 py-8 text-center">
        <div class="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
          <i class="far fa-check text-lg text-emerald-600"></i>
        </div>
        <p class="mt-3 text-sm font-semibold text-emerald-800">All caught up!</p>
        <p class="mt-0.5 text-xs text-emerald-600">No pending {{ type === 'payroll_advance_deductions' ? 'advance deductions' : 'adjustments' }} require your action.</p>
      </div>

      <!-- Notification list -->
      <div v-else class="space-y-2">
        <Transition
          v-for="n in notifications"
          :key="n.id"
          name="notif"
          appear
        >
          <div
            class="overflow-hidden rounded-xl border bg-white transition-all"
            :class="n.read_at ? 'border-slate-100' : 'border-l-4 border-l-rose-400 border-t border-r border-b border-slate-100'"
          >
            <div class="flex items-start gap-3 px-4 py-3">

              <!-- Icon -->
              <div
                class="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm"
                :class="isAdvanceDeduction(n) ? 'bg-rose-100 text-rose-600' : 'bg-indigo-100 text-indigo-600'"
              >
                <i :class="isAdvanceDeduction(n) ? 'far fa-money-bill-alt' : 'far fa-sliders-h'"></i>
              </div>

              <!-- Body -->
              <div class="min-w-0 flex-1 space-y-1">

                <!-- Top: badge + time -->
                <div class="flex items-center justify-between gap-2">
                  <div class="flex items-center gap-1.5">
                    <span
                      class="rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide"
                      :class="isAdvanceDeduction(n) ? 'bg-rose-100 text-rose-700' : 'bg-indigo-100 text-indigo-700'"
                    >
                      {{ isAdvanceDeduction(n) ? 'Advance' : 'Adjustment' }}
                    </span>
                    <span v-if="isForwarded(n)" class="rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide bg-amber-100 text-amber-700">
                      Forwarded
                    </span>
                    <span v-if="!n.read_at" class="h-1.5 w-1.5 rounded-full bg-rose-500"></span>
                  </div>
                  <span class="shrink-0 text-[10px] text-slate-400">{{ formatDate(n.created_at) }}</span>
                </div>

                <!-- Message -->
                <p class="text-[12px] text-slate-700 leading-snug">{{ n.message }}</p>

                <!-- Meta chips -->
                <div class="flex flex-wrap items-center gap-2 text-[10px] text-slate-500">
                  <span v-if="n.employee_name" class="flex items-center gap-1">
                    <i class="far fa-user text-slate-400"></i>{{ n.employee_name }}
                  </span>
                  <span v-if="n.amount !== undefined" class="flex items-center gap-1 font-mono font-semibold text-slate-700">
                    <i class="far fa-money-bill-alt text-slate-400"></i>{{ formatCurrency(n.amount) }}
                  </span>
                  <span v-if="n.carry_on_month || n.ref_month" class="flex items-center gap-1">
                    <i class="far fa-calendar-alt text-slate-400"></i>{{ n.carry_on_month || n.ref_month }}
                  </span>
                  <span v-if="n.actor_name" class="flex items-center gap-1">
                    <i class="far fa-user-edit text-slate-400"></i>{{ n.actor_name }}
                  </span>
                </div>

                <!-- Note input (inline, optional) -->
                <div v-if="noteState[n.id]?.open" class="pt-1">
                  <input
                    v-model="noteState[n.id].text"
                    type="text"
                    placeholder="Add approval note (optional)…"
                    class="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-100"
                    @keydown.enter="isAdvanceDeduction(n) ? approveAdvanceDeduction(n) : verifyAdjustment(n)"
                    @keydown.esc="noteState[n.id].open = false"
                  />
                </div>

                <!-- Actions -->
                <div class="flex items-center gap-1.5 pt-0.5">

                  <RouterLink
                    v-if="entryId(n)"
                    :to="showRoute(n)"
                    class="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-50 transition"
                  >
                    <i class="far fa-file-alt text-[9px]"></i> Show
                  </RouterLink>

                  <!-- Approve -->
                  <template v-if="isAdvanceDeduction(n) && entryId(n)">
                    <button
                      v-if="!noteState[n.id]?.open"
                      type="button"
                      class="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-100 transition"
                      @click="toggleNote(n.id)"
                    >
                      <i class="far fa-check-circle text-[9px]"></i> Approve
                    </button>
                    <template v-else>
                      <button
                        type="button"
                        :disabled="actioningId === n.id"
                        class="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-emerald-700 transition disabled:opacity-50"
                        @click="approveAdvanceDeduction(n)"
                      >
                        <i :class="['far text-[9px]', actioningId === n.id ? 'fa-spinner fa-spin' : 'fa-check']"></i>
                        {{ actioningId === n.id ? 'Approving…' : 'Confirm' }}
                      </button>
                      <button type="button"
                        class="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-[11px] text-slate-500 hover:bg-slate-50 transition"
                        @click="noteState[n.id].open = false">
                        Cancel
                      </button>
                    </template>
                  </template>

                  <!-- Verify -->
                  <template v-if="isAdjustment(n) && entryId(n)">
                    <button
                      v-if="!noteState[n.id]?.open"
                      type="button"
                      class="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-100 transition"
                      @click="toggleNote(n.id)"
                    >
                      <i class="far fa-shield-check text-[9px]"></i> Verify
                    </button>
                    <template v-else>
                      <button
                        type="button"
                        :disabled="actioningId === n.id"
                        class="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-emerald-700 transition disabled:opacity-50"
                        @click="verifyAdjustment(n)"
                      >
                        <i :class="['far text-[9px]', actioningId === n.id ? 'fa-spinner fa-spin' : 'fa-check']"></i>
                        {{ actioningId === n.id ? 'Verifying…' : 'Confirm' }}
                      </button>
                      <button type="button"
                        class="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-[11px] text-slate-500 hover:bg-slate-50 transition"
                        @click="noteState[n.id].open = false">
                        Cancel
                      </button>
                    </template>
                  </template>

                </div>
              </div>
            </div>
          </div>
        </Transition>
      </div>
    </div>
  </div>
</template>

<style scoped>
.notif-enter-active { transition: all 0.2s ease; }
.notif-leave-active { transition: all 0.25s ease; }
.notif-enter-from  { opacity: 0; transform: translateY(-6px); }
.notif-leave-to    { opacity: 0; transform: translateX(20px); max-height: 0; margin: 0; padding: 0; }
</style>
