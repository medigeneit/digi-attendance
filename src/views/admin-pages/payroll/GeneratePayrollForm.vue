<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'
import { storeToRefs } from 'pinia'
import { usePayrollBatchStore } from '@/stores/payrollBatch'
import { useCompanyStore } from '@/stores/company'
import PayrollStatusBadge from '@/components/payroll/PayrollStatusBadge.vue'
import PayrollAdjustmentPreviewModal from '@/components/payroll/PayrollAdjustmentPreviewModal.vue'
import { formatCurrency } from '@/utils/currency'

const router = useRouter()
const toast = useToast()
const batchStore = usePayrollBatchStore()
const companyStore = useCompanyStore()

const { loading, error, generateResult, apiUnavailable } = storeToRefs(batchStore)
const { companies } = storeToRefs(companyStore)

const form = ref({
  company_id: '',
  salary_month: '',
  salary_type: 'Monthly',
  employee_ids: [],
  remarks: '',
})
const formErrors = ref({})
const submitted = ref(false)
const adjustmentModalOpen = ref(false)
const adjustmentModalRef = ref(null)
const pendingGeneratePayload = ref(null)

onMounted(() => companyStore.fetchCompanies())

const generatedPayload = computed(() => generateResult.value?.data || generateResult.value || null)
const generatedBatch = computed(() => generatedPayload.value?.batch || null)
const generatedPayrolls = computed(() => generatedPayload.value?.generated || generatedPayload.value?.payrolls || [])
const skippedPayrolls = computed(() => generatedPayload.value?.skipped || [])
const missingSalaryStructures = computed(() => generatedPayload.value?.missing_salary_structures || [])
const summaryCards = computed(() => [
  {
    label: 'Generated',
    value: generatedPayrolls.value.length,
    tone: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  {
    label: 'Skipped',
    value: skippedPayrolls.value.length,
    tone: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  {
    label: 'Missing Structure',
    value: missingSalaryStructures.value.length,
    tone: 'bg-rose-50 text-rose-700 border-rose-200',
  },
])

const validate = () => {
  const errors = {}
  if (!form.value.company_id) errors.company_id = 'Company is required.'
  if (!form.value.salary_month) errors.salary_month = 'Salary month is required.'
  if (!form.value.salary_type) errors.salary_type = 'Salary type is required.'
  formErrors.value = errors
  return !Object.keys(errors).length
}

const handleSubmit = async () => {
  if (!validate()) return
  
  // Save the payload and open the adjustment preview modal
  const [year, month] = form.value.salary_month.split('-')
  pendingGeneratePayload.value = { ...form.value }
  adjustmentModalOpen.value = true
  
  // Trigger the modal to load preview data
  await new Promise(resolve => setTimeout(resolve, 100))
  adjustmentModalRef.value?.handleOpen()
}

const handleConfirmAdjustments = async () => {
  if (!pendingGeneratePayload.value) return
  
  const payload = pendingGeneratePayload.value
  if (!payload.employee_ids?.length) delete payload.employee_ids
  if (!payload.remarks) delete payload.remarks
  
  try {
    await batchStore.generatePayroll(payload)
    submitted.value = true
    toast.success('Payroll batch generated successfully!')
    pendingGeneratePayload.value = null
  } catch (e) {
    if (e.errors) formErrors.value = e.errors
    toast.error(e.message || 'Generation failed.')
  }
}

const goToBatch = () => {
  if (generatedBatch.value?.id) {
    router.push({ name: 'PayrollBatchShow', params: { id: generatedBatch.value.id } })
  }
}

const resetGeneration = () => {
  submitted.value = false
  batchStore.$patch({ generateResult: null })
}

const inputCls =
  'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 shadow-sm transition focus:border-blue-400 focus:outline-none focus:ring-4 focus:ring-blue-100'
</script>

<template>
  <div class="space-y-6 p-4 md:p-6">
    <div class="rounded-3xl border border-slate-200 bg-gradient-to-r from-slate-50 via-white to-emerald-50 p-5 shadow-sm">
      <div class="flex flex-wrap items-center gap-3">
        <button @click="router.back()" class="btn-3"><i class="far fa-arrow-left"></i></button>
        <div>
          <h1 class="title-md md:title-lg">Generate Payroll</h1>
          <p class="text-sm text-slate-500">Create one payroll batch for the selected company and salary month.</p>
        </div>
      </div>
    </div>

    <div v-if="apiUnavailable" class="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-amber-800 max-w-2xl">
      <h3 class="font-bold mb-1">Payroll Batch API not ready</h3>
      <p class="text-sm">আপনি backend এ payroll-batch API ignore করে build করছেন, তাই এই page থেকে generate করা আপাতত বন্ধ রাখা হয়েছে.</p>
      <div class="pt-3">
        <button class="btn-3" @click="router.push({ name: 'PayrollList' })">
          <i class="far fa-list"></i> Go to Payroll List
        </button>
      </div>
    </div>

    <!-- Form (shown when not yet submitted) -->
    <template v-else-if="!submitted">
      <div class="grid gap-5 xl:grid-cols-[minmax(0,2fr)_320px]">
        <div class="bg-white rounded-3xl shadow-sm border border-slate-100 p-5 md:p-6 space-y-5">
        <!-- Company -->
        <div>
          <label class="mb-1 block text-sm font-medium text-slate-700">Company <span class="text-red-500">*</span></label>
          <select v-model="form.company_id" :class="inputCls">
            <option value="">Select Company</option>
            <option v-for="c in companies" :key="c.id" :value="c.id">{{ c.name }}</option>
          </select>
          <p v-if="formErrors.company_id" class="text-red-500 text-xs mt-1">{{ formErrors.company_id }}</p>
        </div>

        <!-- Salary Month + Salary Type -->
        <div class="grid gap-4 md:grid-cols-2">
          <div>
            <label class="mb-1 block text-sm font-medium text-slate-700">Salary Month <span class="text-red-500">*</span></label>
            <input v-model="form.salary_month" type="month" :class="inputCls" />
            <p v-if="formErrors.salary_month" class="text-red-500 text-xs mt-1">{{ formErrors.salary_month }}</p>
          </div>
          <div>
            <label class="mb-1 block text-sm font-medium text-slate-700">Salary Type <span class="text-red-500">*</span></label>
            <select v-model="form.salary_type" :class="inputCls">
              <option value="Monthly">Monthly</option>
              <option value="Bonus">Bonus</option>
              <option value="Final">Final</option>
            </select>
            <p v-if="formErrors.salary_type" class="text-red-500 text-xs mt-1">{{ formErrors.salary_type }}</p>
          </div>
        </div>

        <!-- Remarks -->
        <div>
          <label class="mb-1 block text-sm font-medium text-slate-700">Remarks</label>
          <textarea v-model="form.remarks" rows="3" :class="inputCls" placeholder="Optional note for this batch..."></textarea>
        </div>

        <!-- Info -->
        <div class="flex gap-2 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-700">
          <i class="far fa-info-circle mt-0.5 flex-shrink-0"></i>
          <span>Prepared by is now taken automatically from the logged-in user. Payroll will be generated for all active employees in the selected company for the given month.</span>
        </div>

        <!-- Submit -->
        <div class="flex items-center gap-3 pt-2">
          <button class="btn-3" @click="router.back()">Cancel</button>
          <button class="btn-2" @click="handleSubmit" :disabled="loading">
            <i class="far" :class="loading ? 'fa-spinner fa-spin' : 'fa-cog'"></i>
            {{ loading ? 'Generating...' : 'Generate Payroll' }}
          </button>
        </div>

        <div v-if="error" class="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm flex gap-2">
          <i class="fas fa-exclamation-circle mt-0.5"></i> {{ error }}
        </div>
        </div>

        <aside class="space-y-4">
          <div class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Checklist</p>
            <div class="mt-4 space-y-3 text-sm text-slate-600">
              <div class="flex items-start gap-3">
                <span class="mt-1 h-2 w-2 rounded-full bg-emerald-500"></span>
                <p>Select a company first to target the correct employees.</p>
              </div>
              <div class="flex items-start gap-3">
                <span class="mt-1 h-2 w-2 rounded-full bg-blue-500"></span>
                <p>Choose the exact salary month you want to generate.</p>
              </div>
              <div class="flex items-start gap-3">
                <span class="mt-1 h-2 w-2 rounded-full bg-amber-500"></span>
                <p>Use remarks if you want an internal note visible on the batch.</p>
              </div>
            </div>
          </div>

          <div class="rounded-3xl border border-slate-200 bg-slate-900 p-5 text-slate-100 shadow-sm">
            <p class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">What Happens</p>
            <div class="mt-3 space-y-2 text-sm text-slate-300">
              <p>Existing payrolls for the same month and type are reused.</p>
              <p>Employees without salary structure will be reported separately.</p>
              <p>The generated batch can be reviewed immediately after success.</p>
            </div>
          </div>
        </aside>
      </div>
    </template>

    <!-- Result view -->
    <template v-else-if="generatedPayload">
      <!-- Batch summary card -->
      <div class="space-y-5">
        <div class="rounded-3xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-white p-5 shadow-sm">
          <div class="flex flex-wrap items-center gap-4">
            <div class="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
              <i class="fas fa-check-circle text-3xl"></i>
            </div>
            <div>
              <p class="text-lg font-bold text-emerald-800">Payroll Generated</p>
              <p class="text-sm text-emerald-700">
                <span v-if="generatedBatch">
                  Batch <span class="font-mono font-bold">#{{ generatedBatch.id }}</span>
                  &middot; {{ generatedBatch.salary_month }}
                  &middot; {{ generatedBatch.company?.name || '' }}
                </span>
                <span v-else>Review the generated payrolls below.</span>
              </p>
            </div>
            <div class="ml-auto flex flex-wrap gap-3">
              <button class="btn-2" :disabled="!generatedBatch?.id" @click="goToBatch">
                <i class="far fa-eye"></i> View Batch
              </button>
              <button class="btn-3" @click="resetGeneration">
                <i class="far fa-plus"></i> Generate Another
              </button>
            </div>
          </div>
        </div>

        <div class="grid gap-4 md:grid-cols-3">
          <div
            v-for="card in summaryCards"
            :key="card.label"
            class="rounded-2xl border p-4 shadow-sm"
            :class="card.tone"
          >
            <p class="text-xs font-semibold uppercase tracking-[0.18em]">{{ card.label }}</p>
            <p class="mt-2 text-3xl font-bold">{{ card.value }}</p>
          </div>
        </div>

      <!-- Generated payrolls -->
      <div v-if="generatedPayrolls.length" class="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-x-auto">
        <div class="px-5 py-4 border-b font-semibold text-blue-800">
          Generated Payrolls ({{ generatedPayrolls.length }})
        </div>
        <table class="w-full text-sm">
          <thead class="bg-blue-50 text-blue-900 text-xs uppercase">
            <tr>
              <th class="px-4 py-3 text-left">Employee</th>
              <th class="px-4 py-3 text-right">Gross</th>
              <th class="px-4 py-3 text-right">Deductions</th>
              <th class="px-4 py-3 text-right">Net Salary</th>
              <th class="px-4 py-3 text-center">Status</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-50">
            <tr v-for="p in generatedPayrolls" :key="p.id" class="hover:bg-gray-50 transition-colors">
              <td class="px-4 py-3">
                <div class="font-medium">{{ p.user?.name }}</div>
                <div class="text-xs text-gray-400">{{ p.user?.employee_id }}</div>
              </td>
              <td class="px-4 py-3 text-right font-mono">{{ formatCurrency(p.gross_salary) }}</td>
              <td class="px-4 py-3 text-right font-mono text-red-600">{{ formatCurrency(p.total_deduction) }}</td>
              <td class="px-4 py-3 text-right font-mono font-bold text-emerald-700">{{ formatCurrency(p.net_salary) }}</td>
              <td class="px-4 py-3 text-center"><PayrollStatusBadge :status="p.payment_status" /></td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Skipped Payrolls -->
      <div v-if="skippedPayrolls.length" class="bg-white rounded-3xl shadow-sm border border-amber-200 overflow-x-auto">
        <div class="px-5 py-3 border-b font-semibold text-amber-700 flex items-center gap-2">
          <i class="fas fa-exclamation-triangle text-amber-500"></i>
          Skipped Employees ({{ skippedPayrolls.length }})
        </div>
        <table class="w-full text-sm">
          <thead class="bg-amber-50 text-amber-800 text-xs uppercase">
            <tr>
              <th class="px-4 py-3 text-left">Employee</th>
              <th class="px-4 py-3 text-left">Reason</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-amber-50">
            <tr v-for="(skip, i) in skippedPayrolls" :key="i" class="hover:bg-amber-50 transition-colors">
              <td class="px-4 py-3">{{ skip.user?.name || skip.name || skip.employee_id }}</td>
              <td class="px-4 py-3 text-gray-600">{{ skip.reason || '—' }}</td>
            </tr>
          </tbody>
        </table>
      </div>

        <div v-if="missingSalaryStructures.length" class="rounded-3xl border border-rose-200 bg-white shadow-sm overflow-x-auto">
          <div class="px-5 py-3 border-b font-semibold text-rose-700 flex items-center gap-2">
            <i class="fas fa-ban text-rose-500"></i>
            Missing Salary Structures ({{ missingSalaryStructures.length }})
          </div>
          <table class="w-full text-sm">
            <thead class="bg-rose-50 text-rose-800 text-xs uppercase">
              <tr>
                <th class="px-4 py-3 text-left">Employee</th>
                <th class="px-4 py-3 text-left">Reason</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-rose-50">
              <tr v-for="user in missingSalaryStructures" :key="`${user.user_id}-${user.salary_month}`" class="hover:bg-rose-50 transition-colors">
                <td class="px-4 py-3">{{ user.name || user.user_id }}</td>
                <td class="px-4 py-3 text-slate-600">{{ user.reason }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="flex gap-3">
          <button class="btn-3" @click="router.push({ name: 'PayrollBatchList' })">
            <i class="far fa-list"></i> All Batches
          </button>
        </div>
      </div>
    </template>

    <!-- Adjustment Preview Modal -->
    <PayrollAdjustmentPreviewModal
      ref="adjustmentModalRef"
      v-model="adjustmentModalOpen"
      :year="form.salary_month ? parseInt(form.salary_month.split('-')[0]) : new Date().getFullYear()"
      :month="form.salary_month ? parseInt(form.salary_month.split('-')[1]) : new Date().getMonth() + 1"
      @confirmed="handleConfirmAdjustments"
    />
  </div>
</template>
