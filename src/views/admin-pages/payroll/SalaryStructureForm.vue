<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'
import { useSalaryStructureStore } from '@/stores/salaryStructure'
import { useUserStore } from '@/stores/user'
import AllowanceTable from '@/components/payroll/AllowanceTable.vue'
import EmployeeFilter from '@/components/common/EmployeeFilter.vue'
import LoaderView from '@/components/common/LoaderView.vue'
import { formatCurrency, toNum } from '@/utils/currency'
import {
  PROVIDENT_FUND_RATE,
  calculateAllowanceTotal,
  calculateBonusAmount,
  calculateCoreGross,
  calculatePfDeduction,
  getSalaryComponentPolicy,
  hasStoredPfDeduction,
  hasStoredPfPercent,
  isPfAllowedForEmploymentType,
  normalizeAllowances,
  normalizeEmploymentType,
  resolvePfDeduction,
  splitGrossByPolicy,
} from '@/utils/salaryPolicy'

const props = defineProps({ id: { type: String, default: null } })

const router = useRouter()
const toast = useToast()
const structureStore = useSalaryStructureStore()
const userStore = useUserStore()

const isEdit = computed(() => !!props.id)
const pageLoading = ref(false)
const submitting = ref(false)
const fieldErrors = ref({})
const pfApplicable = ref(false)
const selectedEmploymentType = ref('')
const isHydrating = ref(false)
const userLookupToken = ref(0)
const selectedCompanyId = ref('')
const selectedDepartmentId = ref('')
const selectedLineType = ref('all')

const form = ref({
  user_id: null,
  gross_salary: '',
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

const formatEmploymentTypeLabel = (value) => {
  const normalized = normalizeEmploymentType(value)
  if (!normalized) return 'Not Set'
  if (normalized === 'probationary') return 'Probationary'
  if (normalized === 'part_time') return 'Part Time'
  return normalized
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

const pfDefaultByEmploymentType = (employmentType) => normalizeEmploymentType(employmentType) === 'permanent'
const pfAllowedForCurrentEmploymentType = computed(() =>
  isPfAllowedForEmploymentType(selectedEmploymentType.value),
)

const employmentTypeBadgeClass = computed(() => {
  const type = normalizeEmploymentType(selectedEmploymentType.value)
  if (type === 'permanent') return 'bg-emerald-50 text-emerald-700 ring-emerald-200'
  if (type === 'contract') return 'bg-sky-50 text-sky-700 ring-sky-200'
  if (type === 'intern') return 'bg-violet-50 text-violet-700 ring-violet-200'
  if (type === 'probationary') return 'bg-amber-50 text-amber-700 ring-amber-200'
  return 'bg-slate-100 text-slate-600 ring-slate-200'
})

const employmentTypeLabel = computed(() => formatEmploymentTypeLabel(selectedEmploymentType.value))

const pfStatusLabel = computed(() => (pfApplicable.value ? 'Applicable' : 'Not Applicable'))

const pfSupportCopy = computed(() => {
  if (!selectedEmploymentType.value) return 'Select an employee to auto-suggest PF applicability.'
  if (!pfAllowedForCurrentEmploymentType.value) {
    return 'Probationary employees receive 60% of gross as basic salary. PF is not applicable.'
  }
  if (pfDefaultByEmploymentType(selectedEmploymentType.value)) {
    return 'Permanent employees default to PF on. You can still override if needed.'
  }
  return 'This employment type defaults to PF off. Enable it manually if this employee is eligible.'
})

const activePolicy = computed(() => getSalaryComponentPolicy(selectedEmploymentType.value))
const activePolicySummary = computed(() =>
  activePolicy.value.map((item) => `${Math.round(item.ratio * 100)}% ${item.shortLabel}`).join(', '),
)
const activePolicyCompact = computed(() =>
  activePolicy.value.map((item) => Math.round(item.ratio * 100)).join(' / '),
)

const componentCards = computed(() =>
  activePolicy.value.map((item) => ({
    ...item,
    amount: toNum(form.value[item.key]),
  })),
)

const policyGross = computed(() => calculateCoreGross(form.value))
const bonusAmount = computed(() =>
  calculateBonusAmount(selectedEmploymentType.value, form.value.basic_salary),
)
const allowanceTotal = computed(() => calculateAllowanceTotal(form.value.allowances))
const totalGross = computed(() => toNum(form.value.gross_salary) + allowanceTotal.value)
const netPayable = computed(() => Math.max(0, totalGross.value - toNum(form.value.pf_deduction)))

const applyPfDeduction = () => {
  form.value.pf_deduction =
    pfAllowedForCurrentEmploymentType.value &&
    pfApplicable.value &&
    toNum(form.value.basic_salary) > 0
      ? calculatePfDeduction(form.value.basic_salary)
      : null
}

const syncPolicyBreakdown = (grossValue) => {
  const gross = toNum(grossValue)
  
  if (gross <= 0) {
    form.value.basic_salary = ''
    form.value.house_rent = ''
    form.value.medical_allowance = ''
    form.value.conveyance_allowance = ''
    applyPfDeduction()
    return
  }

  const policy = getSalaryComponentPolicy(selectedEmploymentType.value)
  
  if (policy.length === 1 && policy[0].key === 'basic_salary') {
    // Probationary: only calculate basic as reference
    form.value.basic_salary = Math.round(gross * 0.6 * 100) / 100
    form.value.house_rent = ''
    form.value.medical_allowance = ''
    form.value.conveyance_allowance = ''
  } else {
    // Other employment types: calculate breakdown as reference
    const breakdown = splitGrossByPolicy(gross, selectedEmploymentType.value)
    form.value.basic_salary = breakdown.basic_salary || ''
    form.value.house_rent = breakdown.house_rent || ''
    form.value.medical_allowance = breakdown.medical_allowance || ''
    form.value.conveyance_allowance = breakdown.conveyance_allowance || ''
  }
  
  applyPfDeduction()
}

const assignUserMeta = (user) => {
  userDisplay.value = {
    name: user?.name || userDisplay.value.name,
    dept: user?.department?.name || user?.department_name || userDisplay.value.dept,
  }
  selectedEmploymentType.value = user?.employment_type || ''
}

const fetchUserMeta = async (userId, { applyPfDefault = true } = {}) => {
  if (!userId) {
    selectedEmploymentType.value = ''
    if (applyPfDefault) {
      pfApplicable.value = false
    }
    return
  }

  const token = ++userLookupToken.value

  try {
    const user = await userStore.fetchUser(userId)
    if (token !== userLookupToken.value || !user) return

    assignUserMeta(user)

    if (applyPfDefault) {
      pfApplicable.value =
        isPfAllowedForEmploymentType(user.employment_type) &&
        pfDefaultByEmploymentType(user.employment_type)
    }
  } catch (_) {
    if (token !== userLookupToken.value) return
    selectedEmploymentType.value = ''
    if (applyPfDefault) {
      pfApplicable.value = false
    }
  }
}

const loadForEdit = async () => {
  pageLoading.value = true
  isHydrating.value = true

  try {
    const data = await structureStore.fetchItem(props.id)
    const hasStoredPf = hasStoredPfDeduction(data) || hasStoredPfPercent(data)

    form.value = {
      user_id: data.user_id,
      gross_salary: data.gross_salary ?? calculateCoreGross(data) ?? '',
      basic_salary: data.basic_salary ?? '',
      house_rent: data.house_rent ?? '',
      medical_allowance: data.medical_allowance ?? '',
      conveyance_allowance: data.conveyance_allowance ?? '',
      pf_deduction: hasStoredPf ? resolvePfDeduction(data) : null,
      effective_from: data.effective_from || '',
      effective_to: data.effective_to || '',
      is_active: !!data.is_active,
      allowances: normalizeAllowances(data.allowances),
    }

    pfApplicable.value =
      isPfAllowedForEmploymentType(data.user?.employment_type) &&
      hasStoredPf

    if (data.user) {
      selectedCompanyId.value = data.user.company_id ? String(data.user.company_id) : ''
      selectedDepartmentId.value = data.user.department_id ? String(data.user.department_id) : ''
      selectedLineType.value = data.user.type || 'all'
      assignUserMeta(data.user)
    } else if (data.user_id) {
      await fetchUserMeta(data.user_id, { applyPfDefault: false })
    }
  } catch (error) {
    toast.error(error.message)
    router.push({ name: 'PayrollSalaryStructureList' })
  } finally {
    isHydrating.value = false
    pageLoading.value = false
  }
}

const handleEmployeeFilterChange = (payload = {}) => {
  const nextCompanyId = payload.company_id || ''
  const nextDepartmentId = payload.department_id || ''
  const nextLineType = payload.line_type || 'all'
  const nextEmployeeId = payload.employee_id || null

  const hasChanged =
    nextCompanyId !== selectedCompanyId.value ||
    nextDepartmentId !== selectedDepartmentId.value ||
    nextLineType !== selectedLineType.value ||
    String(nextEmployeeId || '') !== String(form.value.user_id || '')

  selectedCompanyId.value = nextCompanyId
  selectedDepartmentId.value = nextDepartmentId
  selectedLineType.value = nextLineType
  form.value.user_id = nextEmployeeId

  if (!hasChanged || isHydrating.value) return

  userDisplay.value = { name: null, dept: null }
  selectedEmploymentType.value = ''
  pfApplicable.value = false
}

watch(
  () => form.value.gross_salary,
  (newValue) => {
    if (isHydrating.value) return
    syncPolicyBreakdown(newValue)
  },
)

watch(pfApplicable, () => {
  if (isHydrating.value) return
  applyPfDeduction()
})

watch(selectedEmploymentType, () => {
  if (isHydrating.value) return
  if (!pfAllowedForCurrentEmploymentType.value) {
    pfApplicable.value = false
  }
  syncPolicyBreakdown(form.value.gross_salary)
})

watch(
  () => form.value.user_id,
  async (newUserId, oldUserId) => {
    if (isHydrating.value) return

    if (!newUserId) {
      selectedEmploymentType.value = ''
      pfApplicable.value = false
      userDisplay.value = { name: null, dept: null }
      return
    }

    if (newUserId !== oldUserId) {
      await fetchUserMeta(newUserId, { applyPfDefault: true })
    }
  },
)

onMounted(() => {
  if (isEdit.value) {
    loadForEdit()
  }
})

const validate = () => {
  const errors = {}

  if (!form.value.user_id) errors.user_id = 'Employee is required.'
  if (!form.value.gross_salary && form.value.gross_salary !== 0) {
    errors.gross_salary = 'Gross salary is required.'
  }
  if (toNum(form.value.gross_salary) <= 0) {
    errors.gross_salary = 'Gross salary must be greater than zero.'
  }
  if (!form.value.effective_from) errors.effective_from = 'Effective from date is required.'
  if (
    form.value.effective_from &&
    form.value.effective_to &&
    form.value.effective_to < form.value.effective_from
  ) {
    errors.effective_to = 'Effective to date must be on or after effective from.'
  }

  fieldErrors.value = errors
  return !Object.keys(errors).length
}

const handleSubmit = async () => {
  if (!validate()) return

  submitting.value = true

  try {
    const payload = {
      ...form.value,
      gross_salary: toNum(form.value.gross_salary),
      basic_salary: toNum(form.value.basic_salary),
      house_rent: toNum(form.value.house_rent),
      medical_allowance: toNum(form.value.medical_allowance),
      conveyance_allowance: toNum(form.value.conveyance_allowance),
      pf_deduction: pfApplicable.value ? toNum(form.value.pf_deduction) : null,
      allowances: normalizeAllowances(form.value.allowances),
    }

    if (isEdit.value) {
      await structureStore.updateItem(props.id, payload)
      toast.success('Salary structure updated successfully.')
    } else {
      await structureStore.createItem(payload)
      toast.success('Salary structure created successfully.')
    }

    router.push({ name: 'PayrollSalaryStructureList' })
  } catch (error) {
    if (error.errors) fieldErrors.value = error.errors
    toast.error(error.message)
  } finally {
    submitting.value = false
  }
}

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-700 shadow-sm transition focus:border-cyan-400 focus:outline-none focus:ring-4 focus:ring-cyan-100'
</script>

<template>
  <div class="mx-auto max-w-7xl space-y-4 p-4 md:p-6">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <p class="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-700">Salary Policy</p>
        <h1 class="mt-1 text-2xl font-semibold text-slate-900">
          {{ isEdit ? 'Edit Salary Structure' : 'Create Salary Structure' }}
        </h1>
        <p class="mt-1 text-sm text-slate-500">
          Gross salary is the total payable. Basic breakdown: {{ activePolicySummary }}. PF is 5% of basic.
        </p>
      </div>

      <div class="flex gap-2">
        <button class="btn-3" @click="router.push({ name: 'PayrollSalaryStructureList' })">
          <i class="far fa-arrow-left"></i>
          <span class="hidden sm:flex">Back</span>
        </button>
        <button class="btn-2" @click="handleSubmit" :disabled="submitting">
          <i class="far" :class="submitting ? 'fa-spinner fa-spin' : 'fa-save'"></i>
          <span>{{ submitting ? 'Saving...' : 'Save' }}</span>
        </button>
      </div>
    </div>

    <LoaderView v-if="pageLoading" />

    <form v-else @submit.prevent="handleSubmit" class="space-y-4">
      <div class="bg-white px-4 py-3 rounded-md space-y-4">
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div>
                  <h2 class="text-sm font-semibold text-slate-900">Employee Setup</h2>
                </div>
                <span
                  class="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1"
                  :class="employmentTypeBadgeClass"
                >
                  {{ employmentTypeLabel }}
                </span>
          </div>

          <EmployeeFilter
            :company_id="selectedCompanyId"
            :department_id="selectedDepartmentId"
            :line_type="selectedLineType"
            :employee_id="form.user_id"
            @filter-change="handleEmployeeFilterChange"
            class="w-full"
          />
      </div>
      <div class="grid gap-4 xl:grid-cols-[0.9fr_0.85fr]">
        <section class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div class="space-y-4">
  
            <p v-if="fieldErrors.user_id" class="mt-1 text-xs text-red-500">
              {{ fieldErrors.user_id }}
            </p>

            <div class="grid gap-3">
              <div class="rounded-xl bg-slate-50 px-3 py-2">
                <p class="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Department</p>
                <p class="mt-1 text-xs font-medium text-slate-800">{{ userDisplay.dept || 'Not selected' }}</p>
              </div>
              <div class="rounded-xl bg-slate-50 px-3 py-2">
                <p class="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">PF Rule</p>
                <p class="mt-1 text-xs font-medium text-sky-800">{{ pfSupportCopy }}</p>
              </div>
            </div>
            
            <div class="grid gap-3 sm:grid-cols-2">
              <div>
                <label class="mb-1 block text-sm font-medium text-slate-700">
                  Effective From <span class="text-red-500">*</span>
                </label>
                <input v-model="form.effective_from" type="date" :class="inputClass" />
                <p v-if="fieldErrors.effective_from" class="mt-1 text-xs text-red-500">
                  {{ fieldErrors.effective_from }}
                </p>
              </div>

              <div>
                <label class="mb-1 block text-sm font-medium text-slate-700">Effective To</label>
                <input v-model="form.effective_to" type="date" :class="inputClass" />
                <p v-if="fieldErrors.effective_to" class="mt-1 text-xs text-red-500">
                  {{ fieldErrors.effective_to }}
                </p>
              </div>
            </div>

            <label class="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2.5">
              <input
                v-model="form.is_active"
                type="checkbox"
                class="h-4 w-4 rounded accent-cyan-600"
              />
              <span class="text-sm font-medium text-slate-700">Mark as active salary structure</span>
            </label>
          </div>
        </section>

        <section class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div class="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 class="text-sm font-semibold text-slate-900">Policy Calculator</h2>
            </div>
            <div class="rounded-full bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-700">
              {{ activePolicyCompact }}
            </div>
          </div>

          <div class="space-y-4">
            <div>
              <label class="mb-1 block text-sm font-medium text-slate-700">
                Gross Salary <span class="text-red-500">*</span>
              </label>
              <input
                v-model="form.gross_salary"
                type="number"
                min="0"
                step="0.01"
                :class="inputClass"
                placeholder="0.00"
              />
              <p v-if="fieldErrors.gross_salary" class="mt-1 text-xs text-red-500">
                {{ fieldErrors.gross_salary }}
              </p>
            </div>

            <div class="grid gap-2 sm:grid-cols-2">
              <div
                v-for="item in componentCards"
                :key="item.key"
                class="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5"
              >
                <div class="flex items-start justify-between gap-3">
                  <div>
                    <p class="text-sm font-medium text-slate-700">{{ item.shortLabel }}</p>
                    <p class="text-[11px] text-slate-400">{{ Math.round(item.ratio * 100) }}% of gross</p>
                  </div>
                  <p class="font-mono text-sm font-semibold text-slate-900">
                    {{ formatCurrency(item.amount) }}
                  </p>
                </div>
              </div>

              <div class="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5">
                <div class="flex items-start justify-between gap-3">
                  <div>
                    <p class="text-sm font-medium text-amber-800">Bonus</p>
                    <p class="text-[11px] text-amber-600">
                      {{ normalizeEmploymentType(selectedEmploymentType) === 'probationary' ? '25% of basic' : '100% of basic for Permanent/Contract' }}
                    </p>
                  </div>
                  <p class="font-mono text-sm font-semibold text-amber-900">
                    {{ formatCurrency(bonusAmount) }}
                  </p>
                </div>
              </div>
            </div>

            <div class="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
              <div class="flex items-start justify-between gap-3">
                <div>
                  <p class="text-sm font-semibold text-slate-900">PF Deduction</p>
                  <p class="mt-1 text-xs text-slate-500">
                    {{ (PROVIDENT_FUND_RATE * 100).toFixed(0) }}% of basic salary when applicable.
                  </p>
                </div>
                <div class="text-right">
                  <p
                    class="inline-flex rounded-full px-2.5 py-1 text-xs font-semibold"
                    :class="pfApplicable ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'"
                  >
                    {{ pfStatusLabel }}
                  </p>
                  <p class="mt-2 font-mono text-sm font-semibold text-slate-900">
                    {{ formatCurrency(form.pf_deduction) }}
                  </p>
                </div>
              </div>

              <label class="mt-3 flex items-center justify-between gap-3 rounded-lg bg-white px-3 py-2 ring-1 ring-slate-200">
                <div>
                  <p class="text-sm font-medium text-slate-700">Apply PF for this employee</p>
                  <p class="text-[11px] text-slate-400">Default comes from employment type and can be overridden.</p>
                </div>
                <input
                  v-model="pfApplicable"
                  type="checkbox"
                  class="h-4 w-4 rounded accent-cyan-600"
                  :disabled="!pfAllowedForCurrentEmploymentType"
                />
              </label>
            </div>
          </div>
        </section>
      </div>

      <section class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div class="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 class="text-sm font-semibold text-slate-900">Additional Allowances</h2>
            <p class="text-xs text-slate-500">Use only for exceptions outside the selected salary policy.</p>
          </div>
          <div class="rounded-xl bg-slate-50 px-3 py-2 text-right">
            <p class="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Allowance Total</p>
            <p class="mt-1 font-mono text-sm font-semibold text-slate-900">
              {{ formatCurrency(allowanceTotal) }}
            </p>
          </div>
        </div>

        <AllowanceTable v-model="form.allowances" />
      </section>

      <section class="grid gap-3 md:grid-cols-4">
        <div class="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <p class="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Policy Breakdown (Reference)</p>
          <p class="mt-1 font-mono text-xl font-semibold text-slate-900">{{ formatCurrency(policyGross) }}</p>
          <p class="mt-1 text-xs text-slate-500">Basic + house rent + medical + conveyance (calculated for reference).</p>
        </div>

        <div class="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 shadow-sm">
          <p class="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-700">Bonus (Reference)</p>
          <p class="mt-1 font-mono text-xl font-semibold text-amber-900">{{ formatCurrency(bonusAmount) }}</p>
          <p class="mt-1 text-xs text-amber-700">Based on employment type and basic salary (reference only).</p>
        </div>

        <div class="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <p class="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Total Gross</p>
          <p class="mt-1 font-mono text-xl font-semibold text-slate-900">{{ formatCurrency(totalGross) }}</p>
          <p class="mt-1 text-xs text-slate-500">Entered gross salary + active additional allowances.</p>
        </div>

        <div class="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <p class="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Net After PF</p>
          <p class="mt-1 font-mono text-xl font-semibold text-emerald-700">{{ formatCurrency(netPayable) }}</p>
          <p class="mt-1 text-xs text-slate-500">Total gross minus PF deduction (5% of basic).</p>
        </div>
      </section>

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
