<script setup>
import { computed, onMounted, ref } from 'vue'
import { useToast } from 'vue-toastification'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import { useAdjustmentStore } from '@/stores/adjustmentStore'
import { useAuthStore } from '@/stores/auth'
import LoaderView from '@/components/common/LoaderView.vue'
import AdjustmentStatusBadge from '@/components/payroll/adjustments/AdjustmentStatusBadge.vue'
import { formatCurrency } from '@/utils/currency'

const router = useRouter()
const toast = useToast()
const store = useAdjustmentStore()
const authStore = useAuthStore()
const { carryPreview, loading, error } = storeToRefs(store)

const month = ref(new Date().toISOString().slice(0, 7))
const applying = ref(false)

const canApply = computed(() => ['admin', 'super_admin', 'developer'].includes(String(authStore.user?.role || '').toLowerCase()))

const year = computed(() => Number(month.value.slice(0, 4)))
const monthNumber = computed(() => Number(month.value.slice(5, 7)))

const load = async () => {
  try {
    await store.loadCarryPreview(year.value, monthNumber.value)
  } catch (e) {
    toast.error(e.message || 'Failed to load carry preview.')
  }
}

const applyNow = async () => {
  applying.value = true
  try {
    await store.applyCarryForward(year.value, monthNumber.value)
    toast.success('Carry-forward applied successfully.')
    await load()
  } catch (e) {
    toast.error(e.message || 'Carry-forward failed.')
  } finally {
    applying.value = false
  }
}

const summary = computed(() => carryPreview.value?.summary || {})
const items = computed(() => carryPreview.value?.items || [])

onMounted(load)
</script>

<template>
  <div class="space-y-4 p-4 md:p-6">
    <div class="flex items-center gap-3">
      <button class="btn-3" @click="router.back()"><i class="far fa-arrow-left"></i></button>
      <div>
        <h1 class="text-2xl font-bold text-slate-900">Carry-Forward Preview</h1>
        <p class="text-sm text-slate-500">Review approved adjustments before applying them to payroll.</p>
      </div>
    </div>

    <div class="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <div class="flex flex-wrap items-end gap-3">
        <div>
          <label class="mb-1 block text-xs font-medium text-slate-600">Target Month</label>
          <input
            v-model="month"
            type="month"
            class="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm focus:border-blue-400 focus:outline-none focus:ring-4 focus:ring-blue-100"
          />
        </div>
        <button class="btn-2" :disabled="loading" @click="load">
          <i class="far" :class="loading ? 'fa-spinner fa-spin' : 'fa-search'"></i> Load Preview
        </button>
        <button v-if="canApply" class="btn-3" :disabled="loading || applying || !items.length" @click="applyNow">
          <i class="far" :class="applying ? 'fa-spinner fa-spin' : 'fa-play'"></i>
          {{ applying ? 'Applying...' : 'Apply Now' }}
        </button>
      </div>
    </div>

    <div class="grid gap-3 md:grid-cols-3">
      <div class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Total Adjustments</div>
        <div class="mt-1 text-2xl font-bold text-slate-900">{{ summary.count || 0 }}</div>
      </div>
      <div class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Net Amount</div>
        <div class="mt-1 text-2xl font-bold text-emerald-700">{{ formatCurrency(summary.total_amount || 0) }}</div>
      </div>
      <div class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Target Period</div>
        <div class="mt-1 text-2xl font-bold text-slate-900">{{ month }}</div>
      </div>
    </div>

    <LoaderView v-if="loading" />

    <div v-else-if="error" class="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
      {{ error }}
    </div>

    <div v-else-if="!items.length" class="rounded-3xl border border-dashed border-slate-200 bg-white p-10 text-center text-slate-500">
      <i class="far fa-inbox text-3xl text-slate-300"></i>
      <p class="mt-2 text-sm font-medium">No approved adjustments pending carry-forward.</p>
    </div>

    <div v-else class="overflow-x-auto rounded-3xl border border-slate-200 bg-white shadow-sm">
      <table class="min-w-[980px] w-full border-collapse text-sm">
        <thead class="bg-slate-50 text-slate-700">
          <tr>
            <th class="border border-slate-200 px-3 py-2 text-left">Employee</th>
            <th class="border border-slate-200 px-3 py-2 text-left">Type</th>
            <th class="border border-slate-200 px-3 py-2 text-right">Amount</th>
            <th class="border border-slate-200 px-3 py-2 text-center">Original Month</th>
            <th class="border border-slate-200 px-3 py-2 text-left">Reason</th>
            <th class="border border-slate-200 px-3 py-2 text-center">Status</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in items" :key="row.id" class="odd:bg-white even:bg-slate-50/40">
            <td class="border border-slate-200 px-3 py-2">
              <div class="font-semibold text-slate-900">{{ row.employee?.name || '-' }}</div>
              <div class="text-xs text-slate-500">{{ row.employee?.employee_id || '-' }}</div>
            </td>
            <td class="border border-slate-200 px-3 py-2 capitalize text-slate-800">{{ row.adjustment_type?.replace(/_/g, ' ') }}</td>
            <td class="border border-slate-200 px-3 py-2 text-right font-mono font-semibold" :class="Number(row.amount) >= 0 ? 'text-emerald-700' : 'text-rose-700'">
              {{ Number(row.amount) >= 0 ? '+' : '' }}{{ formatCurrency(row.amount) }}
            </td>
            <td class="border border-slate-200 px-3 py-2 text-center font-mono text-slate-700">{{ row.ref_month_label }}</td>
            <td class="border border-slate-200 px-3 py-2 text-slate-700">{{ row.reason }}</td>
            <td class="border border-slate-200 px-3 py-2 text-center"><AdjustmentStatusBadge :status="row.status" /></td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
