<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'
import { storeToRefs } from 'pinia'
import { usePayrollBatchStore } from '@/stores/payrollBatch'
import { useCompanyStore } from '@/stores/company'
import AsyncUserCombobox from '@/components/common/AsyncUserCombobox.vue'
import PayrollStatusBadge from '@/components/payroll/PayrollStatusBadge.vue'
import LoaderView from '@/components/common/LoaderView.vue'
import { formatCurrency } from '@/utils/currency'
import apiClient from '@/axios'

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
  prepared_by_user_id: null,
  employee_ids: [],
  remarks: '',
})
const preparedByDisplay = ref({ name: null, dept: null })
const formErrors = ref({})
const submitted = ref(false)

const fetchUsersFn = (params) =>
  apiClient
    .get('/users', { params })
    .then((r) => (Array.isArray(r.data) ? r.data : r.data?.data || r.data?.users || []))

onMounted(() => companyStore.fetchCompanies())

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
  const payload = { ...form.value }
  if (!payload.prepared_by_user_id) delete payload.prepared_by_user_id
  if (!payload.employee_ids?.length) delete payload.employee_ids
  if (!payload.remarks) delete payload.remarks
  try {
    await batchStore.generatePayroll(payload)
    submitted.value = true
    toast.success('Payroll batch generated successfully!')
  } catch (e) {
    if (e.errors) formErrors.value = e.errors
    toast.error(e.message || 'Generation failed.')
  }
}

const goToBatch = () => {
  if (generateResult.value?.id) {
    router.push({ name: 'PayrollBatchShow', params: { id: generateResult.value.id } })
  }
}

const inputCls =
  'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400'
</script>

<template>
  <div class="p-4 md:p-6 space-y-5">
    <div class="flex items-center gap-3">
      <button @click="router.back()" class="btn-3"><i class="far fa-arrow-left"></i></button>
      <h1 class="title-md md:title-lg">Generate Payroll</h1>
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
      <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 md:p-6 max-w-2xl space-y-4">
        <!-- Company -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Company <span class="text-red-500">*</span></label>
          <select v-model="form.company_id" :class="inputCls">
            <option value="">Select Company</option>
            <option v-for="c in companies" :key="c.id" :value="c.id">{{ c.name }}</option>
          </select>
          <p v-if="formErrors.company_id" class="text-red-500 text-xs mt-1">{{ formErrors.company_id }}</p>
        </div>

        <!-- Salary Month + Salary Type -->
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Salary Month <span class="text-red-500">*</span></label>
            <input v-model="form.salary_month" type="month" :class="inputCls" />
            <p v-if="formErrors.salary_month" class="text-red-500 text-xs mt-1">{{ formErrors.salary_month }}</p>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Salary Type <span class="text-red-500">*</span></label>
            <select v-model="form.salary_type" :class="inputCls">
              <option value="Monthly">Monthly</option>
              <option value="Weekly">Weekly</option>
              <option value="Bi-Weekly">Bi-Weekly</option>
              <option value="Hourly">Hourly</option>
            </select>
            <p v-if="formErrors.salary_type" class="text-red-500 text-xs mt-1">{{ formErrors.salary_type }}</p>
          </div>
        </div>

        <!-- Prepared By -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Prepared By</label>
          <AsyncUserCombobox
            v-model="form.prepared_by_user_id"
            v-model:display="preparedByDisplay"
            :fetcher="fetchUsersFn"
            placeholder="Select preparer (optional)..."
          />
        </div>

        <!-- Remarks -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
          <textarea v-model="form.remarks" rows="2" :class="inputCls" placeholder="Optional..."></textarea>
        </div>

        <!-- Info -->
        <div class="bg-blue-50 border border-blue-200 rounded-xl p-3 text-sm text-blue-700 flex gap-2">
          <i class="far fa-info-circle mt-0.5 flex-shrink-0"></i>
          <span>Payroll will be generated for all active employees in the selected company for the given month. Leaving employee IDs blank generates for everyone.</span>
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
    </template>

    <!-- Result view -->
    <template v-else-if="generateResult">
      <!-- Batch summary card -->
      <div class="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 flex flex-wrap gap-4 items-center">
        <i class="fas fa-check-circle text-3xl text-emerald-500 flex-shrink-0"></i>
        <div>
          <p class="font-bold text-emerald-800 text-lg">Payroll Generated!</p>
          <p class="text-emerald-700 text-sm">
            Batch <span class="font-mono font-bold">#{{ generateResult.id }}</span>
            &middot; {{ generateResult.salary_month }}
            &middot; {{ generateResult.company?.name || '' }}
          </p>
        </div>
        <button class="btn-2 ml-auto" @click="goToBatch">
          <i class="far fa-eye"></i> View Batch
        </button>
      </div>

      <!-- Generated payrolls -->
      <div v-if="generateResult.payrolls?.length" class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-x-auto">
        <div class="px-5 py-3 border-b font-semibold text-blue-800">
          Generated Payrolls ({{ generateResult.payrolls.length }})
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
            <tr v-for="p in generateResult.payrolls" :key="p.id" class="hover:bg-gray-50">
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
      <div v-if="generateResult.skipped?.length" class="bg-white rounded-2xl shadow-sm border border-amber-200 overflow-x-auto">
        <div class="px-5 py-3 border-b font-semibold text-amber-700 flex items-center gap-2">
          <i class="fas fa-exclamation-triangle text-amber-500"></i>
          Skipped Employees ({{ generateResult.skipped.length }})
        </div>
        <table class="w-full text-sm">
          <thead class="bg-amber-50 text-amber-800 text-xs uppercase">
            <tr>
              <th class="px-4 py-3 text-left">Employee</th>
              <th class="px-4 py-3 text-left">Reason</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-amber-50">
            <tr v-for="(skip, i) in generateResult.skipped" :key="i" class="hover:bg-amber-50">
              <td class="px-4 py-3">{{ skip.user?.name || skip.name || skip.employee_id }}</td>
              <td class="px-4 py-3 text-gray-600">{{ skip.reason || '—' }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="flex gap-3">
        <button class="btn-3" @click="router.push({ name: 'PayrollBatchList' })">
          <i class="far fa-list"></i> All Batches
        </button>
        <button class="btn-2" @click="() => { submitted = false; batchStore.$patch({ generateResult: null }) }">
          <i class="far fa-plus"></i> Generate Another
        </button>
      </div>
    </template>
  </div>
</template>
