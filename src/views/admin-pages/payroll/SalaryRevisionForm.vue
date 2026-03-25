<script setup>
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'
import { useSalaryRevisionStore } from '@/stores/salaryRevision'
import AllowanceTable from '@/components/payroll/AllowanceTable.vue'
import GrossSalaryPreview from '@/components/payroll/GrossSalaryPreview.vue'
import AsyncUserCombobox from '@/components/common/AsyncUserCombobox.vue'
import apiClient from '@/axios'
import { toNum, formatCurrency } from '@/utils/currency'

const router = useRouter()
const toast = useToast()
const revisionStore = useSalaryRevisionStore()

const submitting = ref(false)
const fieldErrors = ref({})
const currentStructure = ref(null)
const loadingStructure = ref(false)

const userDisplay = ref({ name: null, dept: null })

const form = ref({
  user_id: null,
  review_date: '',
  effective_month: '',
  basic_salary: '',
  house_rent: '',
  medical_allowance: '',
  conveyance_allowance: '',
  increment_type: 'fixed',
  increment_value: '',
  remarks: '',
  allowances: [],
})

const fetchUsersFn = (params) =>
  apiClient
    .get('/users', { params })
    .then((r) => (Array.isArray(r.data) ? r.data : r.data?.data || r.data?.users || []))

// Load current structure when user changes
watch(
  () => form.value.user_id,
  async (userId) => {
    currentStructure.value = null
    if (!userId) return
    loadingStructure.value = true
    try {
      const res = await apiClient.get('/salary-structures', {
        params: { user_id: userId, is_active: 1, per_page: 1 },
      })
      const d = res.data
      const list = Array.isArray(d) ? d : d?.data || []
      if (list.length) {
        currentStructure.value = list[0]
        // Pre-fill form with current values
        form.value.basic_salary = currentStructure.value.basic_salary ?? ''
        form.value.house_rent = currentStructure.value.house_rent ?? ''
        form.value.medical_allowance = currentStructure.value.medical_allowance ?? ''
        form.value.conveyance_allowance = currentStructure.value.conveyance_allowance ?? ''
        form.value.allowances = Array.isArray(currentStructure.value.allowances)
          ? currentStructure.value.allowances.map((a) => ({ ...a }))
          : []
      }
    } catch (_) {
      // no current structure is fine
    } finally {
      loadingStructure.value = false
    }
  },
)

const newGross = computed(() => {
  const base =
    toNum(form.value.basic_salary) +
    toNum(form.value.house_rent) +
    toNum(form.value.medical_allowance) +
    toNum(form.value.conveyance_allowance)
  const addons = form.value.allowances
    .filter((a) => a.is_active)
    .reduce((sum, a) => sum + toNum(a.amount), 0)
  return base + addons
})

const currentGross = computed(() => {
  if (!currentStructure.value) return null
  return (
    toNum(currentStructure.value.basic_salary) +
    toNum(currentStructure.value.house_rent) +
    toNum(currentStructure.value.medical_allowance) +
    toNum(currentStructure.value.conveyance_allowance) +
    (Array.isArray(currentStructure.value.allowances)
      ? currentStructure.value.allowances
          .filter((a) => a.is_active)
          .reduce((s, a) => s + toNum(a.amount), 0)
      : 0)
  )
})

const validate = () => {
  const errors = {}
  if (!form.value.user_id) errors.user_id = 'Employee is required.'
  if (!form.value.review_date) errors.review_date = 'Review date is required.'
  if (!form.value.effective_month) errors.effective_month = 'Effective month is required.'
  if (!form.value.basic_salary && form.value.basic_salary !== 0)
    errors.basic_salary = 'Basic salary is required.'
  fieldErrors.value = errors
  return !Object.keys(errors).length
}

const handleSubmit = async () => {
  if (!validate()) return
  submitting.value = true
  try {
    await revisionStore.createRevision(form.value)
    toast.success('Salary revision created. New structure has been applied.')
    router.push({ name: 'PayrollSalaryStructureList' })
  } catch (e) {
    if (e.errors) fieldErrors.value = e.errors
    toast.error(e.message)
  } finally {
    submitting.value = false
  }
}

const inputClass =
  'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400'
</script>

<template>
  <div class="p-4 md:p-6 max-w-3xl mx-auto space-y-5">
    <!-- Header -->
    <div class="flex items-center justify-between gap-2">
      <button class="btn-3" @click="router.push({ name: 'PayrollSalaryStructureList' })">
        <i class="far fa-arrow-left"></i>
        <span class="hidden md:flex">Back</span>
      </button>
      <h1 class="title-md md:title-lg text-center">Salary Revision</h1>
      <button class="btn-2" @click="handleSubmit" :disabled="submitting">
        <i class="far" :class="submitting ? 'fa-spinner fa-spin' : 'fa-save'"></i>
        <span class="hidden md:flex">{{ submitting ? 'Saving...' : 'Apply Revision' }}</span>
      </button>
    </div>

    <!-- Info banner -->
    <div
      class="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-5 py-4 flex items-start gap-3 text-sm"
    >
      <i class="fas fa-info-circle mt-0.5 text-amber-500"></i>
      <div>
        <p class="font-semibold">How salary revision works</p>
        <p class="text-xs mt-1 text-amber-700">
          A revision creates a new active salary structure for the employee starting from the
          effective month, while preserving history. The previous structure will be marked inactive.
        </p>
      </div>
    </div>

    <form @submit.prevent="handleSubmit" class="space-y-5">
      <!-- Employee -->
      <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h3 class="font-semibold text-blue-900 mb-4 flex items-center gap-2">
          <i class="fas fa-user text-blue-400"></i> Employee
        </h3>
        <AsyncUserCombobox
          v-model="form.user_id"
          v-model:display="userDisplay"
          :fetcher="fetchUsersFn"
          placeholder="Search employee..."
        />
        <p v-if="fieldErrors.user_id" class="text-red-500 text-xs mt-1">
          {{ fieldErrors.user_id }}
        </p>

        <!-- Current structure summary -->
        <div v-if="loadingStructure" class="mt-4 text-sm text-gray-400 flex items-center gap-2">
          <i class="fas fa-spinner fa-spin"></i> Loading current structure...
        </div>
        <div
          v-else-if="currentStructure"
          class="mt-4 bg-blue-50 border border-blue-100 rounded-lg p-4 text-sm"
        >
          <p class="font-semibold text-blue-800 mb-2">
            Current Active Structure (effective {{ currentStructure.effective_from }})
          </p>
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <p class="text-xs text-blue-500">Basic</p>
              <p class="font-mono font-medium">{{ formatCurrency(currentStructure.basic_salary) }}</p>
            </div>
            <div>
              <p class="text-xs text-blue-500">House Rent</p>
              <p class="font-mono font-medium">{{ formatCurrency(currentStructure.house_rent) }}</p>
            </div>
            <div>
              <p class="text-xs text-blue-500">Medical</p>
              <p class="font-mono font-medium">
                {{ formatCurrency(currentStructure.medical_allowance) }}
              </p>
            </div>
            <div>
              <p class="text-xs text-blue-500">Gross</p>
              <p class="font-mono font-semibold text-blue-700">
                {{ formatCurrency(currentGross) }}
              </p>
            </div>
          </div>
        </div>
        <div
          v-else-if="form.user_id && !loadingStructure"
          class="mt-3 text-xs text-gray-400 italic"
        >
          No active salary structure found for this employee.
        </div>
      </div>

      <!-- Revision Details -->
      <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h3 class="font-semibold text-blue-900 mb-4 flex items-center gap-2">
          <i class="fas fa-calendar-alt text-blue-400"></i> Revision Details
        </h3>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Review Date <span class="text-red-500">*</span>
            </label>
            <input v-model="form.review_date" type="date" :class="inputClass" />
            <p v-if="fieldErrors.review_date" class="text-red-500 text-xs mt-1">
              {{ fieldErrors.review_date }}
            </p>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Effective Month <span class="text-red-500">*</span>
            </label>
            <input v-model="form.effective_month" type="month" :class="inputClass" />
            <p v-if="fieldErrors.effective_month" class="text-red-500 text-xs mt-1">
              {{ fieldErrors.effective_month }}
            </p>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Increment Type</label>
            <select v-model="form.increment_type" :class="inputClass">
              <option value="fixed">Fixed Amount</option>
              <option value="percentage">Percentage (%)</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Increment Value</label>
            <input
              v-model="form.increment_value"
              type="number"
              min="0"
              step="0.01"
              :class="inputClass"
              :placeholder="form.increment_type === 'percentage' ? 'e.g. 10 (%)' : '0.00'"
            />
          </div>
          <div class="col-span-full">
            <label class="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
            <textarea
              v-model="form.remarks"
              rows="2"
              :class="inputClass + ' resize-none'"
              placeholder="Optional notes about this revision..."
            ></textarea>
          </div>
        </div>
      </div>

      <!-- New Salary Components -->
      <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h3 class="font-semibold text-blue-900 mb-4 flex items-center gap-2">
          <i class="fas fa-money-bill-wave text-blue-400"></i> New Salary Components
        </h3>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Basic Salary <span class="text-red-500">*</span>
            </label>
            <input
              v-model="form.basic_salary"
              type="number"
              min="0"
              step="0.01"
              :class="inputClass"
              placeholder="0.00"
            />
            <p v-if="fieldErrors.basic_salary" class="text-red-500 text-xs mt-1">
              {{ fieldErrors.basic_salary }}
            </p>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">House Rent</label>
            <input
              v-model="form.house_rent"
              type="number"
              min="0"
              step="0.01"
              :class="inputClass"
              placeholder="0.00"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Medical Allowance</label>
            <input
              v-model="form.medical_allowance"
              type="number"
              min="0"
              step="0.01"
              :class="inputClass"
              placeholder="0.00"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1"
              >Conveyance Allowance</label
            >
            <input
              v-model="form.conveyance_allowance"
              type="number"
              min="0"
              step="0.01"
              :class="inputClass"
              placeholder="0.00"
            />
          </div>
        </div>
      </div>

      <!-- Additional Allowances -->
      <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <AllowanceTable v-model="form.allowances" />
      </div>

      <!-- New Gross Preview -->
      <GrossSalaryPreview :gross="newGross" label="New Gross Salary After Revision" />

      <!-- Actions -->
      <div class="flex justify-end gap-3">
        <button
          type="button"
          class="btn-3"
          @click="router.push({ name: 'PayrollSalaryStructureList' })"
        >
          Cancel
        </button>
        <button type="submit" class="btn-2" :disabled="submitting">
          <i class="far" :class="submitting ? 'fa-spinner fa-spin' : 'fa-check'"></i>
          {{ submitting ? 'Applying...' : 'Apply Revision' }}
        </button>
      </div>
    </form>
  </div>
</template>
