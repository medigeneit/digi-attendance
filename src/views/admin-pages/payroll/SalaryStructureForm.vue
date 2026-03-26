<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'
import { useSalaryStructureStore } from '@/stores/salaryStructure'
import AllowanceTable from '@/components/payroll/AllowanceTable.vue'
import GrossSalaryPreview from '@/components/payroll/GrossSalaryPreview.vue'
import AsyncUserCombobox from '@/components/common/AsyncUserCombobox.vue'
import LoaderView from '@/components/common/LoaderView.vue'
import apiClient from '@/axios'
import { toNum } from '@/utils/currency'

const props = defineProps({ id: { type: String, default: null } })
const router = useRouter()
const toast = useToast()
const structureStore = useSalaryStructureStore()

const isEdit = computed(() => !!props.id)
const pageLoading = ref(false)
const submitting = ref(false)
const fieldErrors = ref({})

const form = ref({
  user_id: null,
  basic_salary: '',
  house_rent: '',
  medical_allowance: '',
  conveyance_allowance: '',
  pf_deduction: null,
  effective_from: '',
  effective_to: '',
  is_active: true,
  allowances: [],
})

const userDisplay = ref({ name: null, dept: null })
const isAutoSettingPf = ref(false)
const isPfManuallyCustomized = ref(false)
const lastAutoPfDeduction = ref(null)

const toPfDeductionAmount = (data) => {
  if (data?.pf_deduction !== null && data?.pf_deduction !== undefined && data?.pf_deduction !== '') {
    return data.pf_deduction
  }
  if (data?.pf_percent !== null && data?.pf_percent !== undefined && data?.pf_percent !== '') {
    const basic = toNum(data.basic_salary)
    const percent = toNum(data.pf_percent)
    if (basic > 0 && percent > 0) {
      return parseFloat(((basic * percent) / 100).toFixed(2))
    }
  }
  return null
}

const grossSalary = computed(() => {
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

const calculatePfFromBasic = (basicVal) => {
  const basic = toNum(basicVal)
  if (basic <= 0) return null
  return parseFloat((basic * 0.05).toFixed(2))
}

const applyAutoPfDeduction = (basicVal) => {
  const autoAmount = calculatePfFromBasic(basicVal)
  isAutoSettingPf.value = true
  form.value.pf_deduction = autoAmount
  isAutoSettingPf.value = false
  lastAutoPfDeduction.value = autoAmount
}

const fetchUsersFn = (params) =>
  apiClient
    .get('/users', { params })
    .then((r) => (Array.isArray(r.data) ? r.data : r.data?.data || r.data?.users || []))

const loadForEdit = async () => {
  pageLoading.value = true
  try {
    const data = await structureStore.fetchItem(props.id)
    form.value = {
      user_id: data.user_id,
      basic_salary: data.basic_salary ?? '',
      house_rent: data.house_rent ?? '',
      medical_allowance: data.medical_allowance ?? '',
      conveyance_allowance: data.conveyance_allowance ?? '',
      pf_deduction: toPfDeductionAmount(data),
      effective_from: data.effective_from || '',
      effective_to: data.effective_to || '',
      is_active: !!data.is_active,
      allowances: Array.isArray(data.allowances) ? data.allowances : [],
    }
    lastAutoPfDeduction.value = calculatePfFromBasic(form.value.basic_salary)
    isPfManuallyCustomized.value =
      form.value.pf_deduction !== null &&
      form.value.pf_deduction !== '' &&
      Number(form.value.pf_deduction) !== Number(lastAutoPfDeduction.value)
    if (data.user) {
      userDisplay.value = {
        name: data.user.name,
        dept: data.user.department?.name || null,
      }
    }
  } catch (e) {
    toast.error(e.message)
    router.push({ name: 'PayrollSalaryStructureList' })
  } finally {
    pageLoading.value = false
  }
}

// Auto-fill PF as 5% of basic only when the field is currently blank
watch(
  () => form.value.basic_salary,
  (newVal) => {
    const isBlank = form.value.pf_deduction === null || form.value.pf_deduction === ''
    if (isBlank || !isPfManuallyCustomized.value) {
      applyAutoPfDeduction(newVal)
    }
  }
)

watch(
  () => form.value.pf_deduction,
  (newVal) => {
    if (isAutoSettingPf.value) return
    if (newVal === null || newVal === '') {
      isPfManuallyCustomized.value = false
      return
    }
    isPfManuallyCustomized.value = Number(newVal) !== Number(lastAutoPfDeduction.value)
  }
)

onMounted(() => {
  if (isEdit.value) loadForEdit()
})

const validate = () => {
  const errors = {}
  if (!form.value.user_id) errors.user_id = 'Employee is required.'
  if (!form.value.basic_salary && form.value.basic_salary !== 0)
    errors.basic_salary = 'Basic salary is required.'
  if (parseFloat(form.value.basic_salary) < 0) errors.basic_salary = 'Must be a positive number.'
  if (!form.value.effective_from) errors.effective_from = 'Effective from date is required.'
  fieldErrors.value = errors
  return !Object.keys(errors).length
}

const handleSubmit = async () => {
  if (!validate()) return
  submitting.value = true
  try {
    // Normalize pf_deduction: empty string → null, otherwise cast to float
    const payload = { ...form.value }
    payload.pf_deduction =
      payload.pf_deduction !== '' && payload.pf_deduction !== null
        ? parseFloat(payload.pf_deduction)
        : null

    if (isEdit.value) {
      await structureStore.updateItem(props.id, payload)
      toast.success('Salary structure updated successfully.')
    } else {
      await structureStore.createItem(payload)
      toast.success('Salary structure created successfully.')
    }
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
      <h1 class="title-md md:title-lg text-center capitalize">
        {{ isEdit ? 'Edit Salary Structure' : 'Create Salary Structure' }}
      </h1>
      <button class="btn-2" @click="handleSubmit" :disabled="submitting">
        <i class="far" :class="submitting ? 'fa-spinner fa-spin' : 'fa-save'"></i>
        <span class="hidden md:flex">{{ submitting ? 'Saving...' : 'Save' }}</span>
      </button>
    </div>

    <LoaderView v-if="pageLoading" />

    <form v-else @submit.prevent="handleSubmit" class="space-y-5">
      <!-- Employee Selection -->
      <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h3 class="font-semibold text-blue-900 mb-4 flex items-center gap-2">
          <i class="fas fa-user text-blue-400"></i> Employee
        </h3>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            Select Employee <span class="text-red-500">*</span>
          </label>
          <AsyncUserCombobox
            v-model="form.user_id"
            v-model:display="userDisplay"
            :fetcher="fetchUsersFn"
            placeholder="Search by name or employee ID..."
          />
          <p v-if="fieldErrors.user_id" class="text-red-500 text-xs mt-1">
            {{ fieldErrors.user_id }}
          </p>
        </div>
      </div>

      <!-- Salary Components -->
      <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h3 class="font-semibold text-blue-900 mb-4 flex items-center gap-2">
          <i class="fas fa-money-bill-wave text-blue-400"></i> Salary Components
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
          <!-- PF Deduction -->
          <div class="sm:col-span-2">
            <label class="block text-sm font-medium text-gray-700 mb-1">PF Deduction</label>
            <div class="relative">
              <input
                v-model="form.pf_deduction"
                type="number"
                min="0"
                step="0.01"
                :class="inputClass"
                placeholder="0.00"
              />
              <button
                v-if="form.pf_deduction !== null && form.pf_deduction !== ''"
                type="button"
                @click="form.pf_deduction = null"
                class="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500 text-xs px-1"
                title="Clear PF deduction"
              >
                <i class="far fa-times"></i>
              </button>
            </div>
            <p class="text-xs text-gray-400 mt-1">
              Leave blank if PF is not applicable. Typically 5% of basic salary — auto-filled when basic changes.
            </p>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Effective From <span class="text-red-500">*</span>
            </label>
            <input
              v-model="form.effective_from"
              type="date"
              :class="inputClass"
            />
            <p v-if="fieldErrors.effective_from" class="text-red-500 text-xs mt-1">
              {{ fieldErrors.effective_from }}
            </p>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Effective To</label>
            <input v-model="form.effective_to" type="date" :class="inputClass" />
            <p class="text-xs text-gray-400 mt-1">Leave blank for open-ended structure.</p>
          </div>
        </div>
        <div class="mt-4 flex items-center gap-2">
          <input
            v-model="form.is_active"
            type="checkbox"
            id="is_active_struct"
            class="w-4 h-4 accent-blue-600"
          />
          <label for="is_active_struct" class="text-sm font-medium text-gray-700">
            Mark as Active Structure
          </label>
        </div>
      </div>

      <!-- Additional Allowances -->
      <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <AllowanceTable v-model="form.allowances" />
      </div>

      <!-- Gross Preview -->
      <GrossSalaryPreview :gross="grossSalary" />

      <!-- Submit -->
      <div class="flex justify-end gap-3">
        <button
          type="button"
          class="btn-3"
          @click="router.push({ name: 'PayrollSalaryStructureList' })"
        >
          Cancel
        </button>
        <button type="submit" class="btn-2" :disabled="submitting">
          <i
            class="far"
            :class="submitting ? 'fa-spinner fa-spin' : isEdit ? 'fa-save' : 'fa-plus'"
          ></i>
          {{ submitting ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Structure' }}
        </button>
      </div>
    </form>
  </div>
</template>
