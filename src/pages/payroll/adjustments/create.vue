<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'
import apiClient from '@/axios'
import AsyncUserCombobox from '@/components/common/AsyncUserCombobox.vue'
import LoaderView from '@/components/common/LoaderView.vue'
import { useAdjustmentStore } from '@/stores/adjustmentStore'
import { formatCurrency } from '@/utils/currency'

const router = useRouter()
const toast = useToast()
const store = useAdjustmentStore()

const employeeDisplay = ref({ name: null, dept: null })
const latestPayroll = ref(null)
const payrollLoading = ref(false)
const payrollError = ref('')
const submitting = ref(false)

const form = ref({
  employee_id: '',
  payroll_id: '',
  ref_year: '',
  ref_month: '',
  adjustment_type: 'overtime',
  settlement_type: 'carry_forward',
  amount: '',
  reason: '',
})

const adjustmentTypes = [
  { value: 'overtime', label: 'Overtime' },
  { value: 'paycut_reversal', label: 'Paycut Reversal' },
  { value: 'bonus', label: 'Bonus' },
  { value: 'deduction', label: 'Deduction' },
  { value: 'other', label: 'Other' },
]

const settlementTypes = [
  { value: 'carry_forward', label: 'Carry Forward (affects net salary)' },
  { value: 'manual_settled', label: 'Manual Settled (contra entry next month, net unchanged)' },
]

const employeeFetcher = async ({ q, limit }) => {
  const res = await apiClient.get('/employees', { params: { q, limit: limit || 20 } })
  return res.data?.data || res.data || []
}

const carryToLabel = computed(() => {
  if (!form.value.ref_year || !form.value.ref_month) return '-'
  const year = Number(form.value.ref_year)
  const month = Number(form.value.ref_month)
  const next = new Date(Date.UTC(year, month, 1))
  return new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric' }).format(next)
})

const payrollMonthLabel = computed(() => {
  if (!latestPayroll.value?.salary_month) return '-'
  const date = new Date(`${String(latestPayroll.value.salary_month).slice(0, 10)}T00:00:00`)
  if (Number.isNaN(date.getTime())) return String(latestPayroll.value.salary_month).slice(0, 10)
  return new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric' }).format(date)
})

const payrollNet = computed(() => Number(latestPayroll.value?.net_salary || 0))

const loadLatestPayroll = async (employeeId) => {
  payrollError.value = ''
  latestPayroll.value = null

  if (!employeeId) return

  payrollLoading.value = true
  try {
    const res = await apiClient.get('/payrolls', {
      params: {
        user_id: employeeId,
        per_page: 1,
      },
    })

    const payload = res.data?.data || []
    latestPayroll.value = Array.isArray(payload) ? payload[0] || null : payload?.[0] || null

    if (!latestPayroll.value) {
      payrollError.value = 'No payroll found for this employee.'
      return
    }

    const month = String(latestPayroll.value.salary_month).slice(0, 7)
    form.value.payroll_id = latestPayroll.value.id
    form.value.ref_year = Number(month.slice(0, 4))
    form.value.ref_month = Number(month.slice(5, 7))
  } catch (e) {
    payrollError.value = e.message || 'Failed to load latest payroll.'
  } finally {
    payrollLoading.value = false
  }
}

const onEmployeePicked = async (value, display) => {
  form.value.employee_id = value || ''
  employeeDisplay.value = display || { name: null, dept: null }
  form.value.payroll_id = ''
  form.value.ref_year = ''
  form.value.ref_month = ''
  latestPayroll.value = null
  await loadLatestPayroll(value)
}

const submit = async () => {
  if (!form.value.employee_id) return toast.error('Select an employee.')
  if (!form.value.payroll_id) return toast.error('No payroll found for this employee.')
  if (!form.value.adjustment_type) return toast.error('Select adjustment type.')
  if (!form.value.amount || Number(form.value.amount) === 0) return toast.error('Enter a valid amount.')
  if (!form.value.reason) return toast.error('Reason is required.')

  submitting.value = true
  try {
    const payload = {
      employee_id: form.value.employee_id,
      payroll_id: form.value.payroll_id,
      ref_year: form.value.ref_year,
      ref_month: form.value.ref_month,
      adjustment_type: form.value.adjustment_type,
      settlement_type: form.value.settlement_type,
      amount: form.value.amount,
      reason: form.value.reason,
    }

    const created = await store.create(payload)
    toast.success('Adjustment created successfully.')
    router.push({ name: 'PayrollAdjustmentShow', params: { id: created.id } })
  } catch (e) {
    toast.error(e.message || 'Failed to create adjustment.')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="space-y-4 p-4 md:p-6">
    <div class="flex items-center gap-3">
      <button class="btn-3" @click="router.back()"><i class="far fa-arrow-left"></i></button>
      <div>
        <h1 class="text-2xl font-bold text-slate-900">Create Adjustment</h1>
        <p class="text-sm text-slate-500">Link an adjustment to the employee's latest payroll month.</p>
      </div>
    </div>

    <div class="grid gap-4 xl:grid-cols-[1.3fr_0.9fr]">
      <div class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div class="space-y-4">
          <div>
            <label class="mb-1 block text-xs font-medium text-slate-600">Employee</label>
            <AsyncUserCombobox
              :model-value="form.employee_id ? Number(form.employee_id) : null"
              :display="employeeDisplay"
              placeholder="Search employee..."
              :fetcher="employeeFetcher"
              @update:modelValue="(value) => onEmployeePicked(value, employeeDisplay)"
              @update:display="(value) => (employeeDisplay = value)"
            />
          </div>

          <div class="grid gap-4 md:grid-cols-2">
            <div>
              <label class="mb-1 block text-xs font-medium text-slate-600">Adjustment Type</label>
              <select
                v-model="form.adjustment_type"
                class="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm focus:border-blue-400 focus:outline-none focus:ring-4 focus:ring-blue-100"
              >
                <option v-for="type in adjustmentTypes" :key="type.value" :value="type.value">
                  {{ type.label }}
                </option>
              </select>
            </div>
            <div>
              <label class="mb-1 block text-xs font-medium text-slate-600">Settlement Type</label>
              <select
                v-model="form.settlement_type"
                class="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm focus:border-blue-400 focus:outline-none focus:ring-4 focus:ring-blue-100"
              >
                <option v-for="type in settlementTypes" :key="type.value" :value="type.value">
                  {{ type.label }}
                </option>
              </select>
            </div>
            <div>
              <label class="mb-1 block text-xs font-medium text-slate-600">Amount</label>
              <input
                v-model="form.amount"
                type="number"
                step="0.01"
                class="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm focus:border-blue-400 focus:outline-none focus:ring-4 focus:ring-blue-100"
                placeholder="Use positive or negative value"
              />
            </div>
          </div>

          <div>
            <label class="mb-1 block text-xs font-medium text-slate-600">Reason</label>
            <textarea
              v-model="form.reason"
              rows="5"
              class="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm focus:border-blue-400 focus:outline-none focus:ring-4 focus:ring-blue-100"
              placeholder="Explain why this adjustment is needed"
            />
          </div>

          <div class="flex flex-wrap items-center gap-3">
            <button class="btn-2" :disabled="submitting || store.loading || payrollLoading" @click="submit">
              <i class="far" :class="submitting ? 'fa-spinner fa-spin' : 'fa-save'"></i>
              {{ submitting ? 'Saving...' : 'Submit Adjustment' }}
            </button>
            <button class="btn-3" @click="router.push({ name: 'PayrollAdjustmentList' })">Cancel</button>
          </div>
        </div>
      </div>

      <div class="space-y-4">
        <div class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 class="text-lg font-semibold text-slate-900">Latest Payroll</h2>
          <LoaderView v-if="payrollLoading" />
          <div v-else-if="payrollError" class="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            {{ payrollError }}
          </div>
          <div v-else-if="latestPayroll" class="mt-3 space-y-2 text-sm">
            <div class="flex items-center justify-between">
              <span class="text-slate-500">Month</span>
              <span class="font-semibold text-slate-800">{{ payrollMonthLabel }}</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-slate-500">Net Salary</span>
              <span class="font-mono font-semibold text-emerald-700">{{ formatCurrency(payrollNet) }}</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-slate-500">Carry To</span>
              <span class="font-semibold text-slate-800">{{ carryToLabel }}</span>
            </div>
            <div class="rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <div class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Selection</div>
              <div class="mt-1 font-semibold text-slate-900">{{ employeeDisplay?.name || 'No employee selected' }}</div>
              <div class="text-sm text-slate-500">{{ employeeDisplay?.dept || ' ' }}</div>
            </div>
          </div>
          <div v-else class="mt-3 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
            Choose an employee to load the latest payroll.
          </div>
        </div>

        <div class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 class="text-base font-semibold text-slate-900">Submission Rules</h3>
          <ul class="mt-3 space-y-2 text-sm text-slate-600">
            <li>Use a positive amount for additions and a negative amount for deductions.</li>
            <li>The adjustment is linked to the employee's latest payroll month automatically.</li>
            <li>Carry-forward month is set to the next calendar month on save.</li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>
