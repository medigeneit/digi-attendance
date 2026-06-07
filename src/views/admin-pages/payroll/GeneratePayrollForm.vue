<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'
import { storeToRefs } from 'pinia'
import { usePayrollBatchStore } from '@/stores/payrollBatch'
import { useAttendanceStore } from '@/stores/attendance'
import EmployeeFilter from '@/components/common/EmployeeFilter.vue'
import PayrollRuleSummary from '@/components/payroll/PayrollRuleSummary.vue'
import PayrollPreviewTable from '@/components/payroll/PayrollPreviewTable.vue'
import PayrollStatusBadge from '@/components/payroll/PayrollStatusBadge.vue'
import { formatCurrency } from '@/utils/currency'

const router = useRouter()
const route = useRoute()
const toast = useToast()
const batchStore = usePayrollBatchStore()
const attendanceStore = useAttendanceStore()
const { loading, error, generateResult, previewResult, options, apiUnavailable } = storeToRefs(batchStore)

const queryValue = (key, fallback = '') => {
  const value = route.query[key]
  return Array.isArray(value) ? String(value[0] || fallback) : String(value || fallback)
}

const allowedPayrollCycles = ['regular', 'half_salary_advance', 'bonus_only']
const queryPayrollCycle = () => {
  const cycle = queryValue('payroll_cycle', 'regular') || 'regular'
  return allowedPayrollCycles.includes(cycle) ? cycle : 'regular'
}

const form = ref({
  company_id: queryValue('company_id'),
  department_id: queryValue('department_id'),
  line_type: queryValue('line_type', 'all'),
  salary_month: queryValue('salary_month'),
  salary_type: queryValue('salary_type', 'Monthly') || 'Monthly',
  employee_id: queryValue('employee_id') || queryValue('user_id'),
  payroll_cycle: queryPayrollCycle(),
  salary_percentage: 50,
  fixed_pay_amount: '',
  period_start: '',
  period_end: '',
  apply_deductions: true,
  include_bonus: false,
  deduct_previous_advance: true,
  bonus_type: '',
  note: '',
  remarks: '',
})

const formErrors = ref({})
const submitted = ref(false)
const advancedOpen = ref(false)
const confirmOpen = ref(false)
const employeeFilterRef = ref(null)
const doctorGenerateResult = ref(null)
const snapshotIssue = ref(null)
const snapshotRecalculating = ref(false)

const modeOptions = computed(() => {
  const labels = {
    regular: 'Regular Monthly Payroll',
    half_salary_advance: 'Half Salary Advance',
    bonus_only: 'Bonus Only',
  }
  const cycles = options.value?.cycles || []
  return allowedPayrollCycles.map((value) => ({
    value,
    label: cycles.find((cycle) => cycle.value === value)?.label || labels[value],
  }))
})

const inputCls =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm transition focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50 disabled:text-slate-400'

const isRegularMode = computed(() => form.value.payroll_cycle === 'regular')
const isHalfMode = computed(() => form.value.payroll_cycle === 'half_salary_advance')
const isBonusOnlyMode = computed(() => form.value.payroll_cycle === 'bonus_only')
const isNonRegularMode = computed(() => !isRegularMode.value)

const filteredEmployees = computed(() => {
  const exposed = employeeFilterRef.value?.employees
  return Array.isArray(exposed) ? exposed : exposed?.value || []
})
const selectedEmployees = computed(() => {
  if (form.value.employee_id) {
    return filteredEmployees.value.filter((employee) => String(employee.id) === String(form.value.employee_id))
  }
  return filteredEmployees.value
})
const normalizeLineType = (value) => String(value || 'all').trim().toLowerCase()
const regularEmployees = computed(() =>
  selectedEmployees.value.filter((employee) => normalizeLineType(employee.type) !== 'doctor'),
)
const doctorEmployees = computed(() =>
  selectedEmployees.value.filter((employee) => normalizeLineType(employee.type) === 'doctor'),
)
const selectedLineType = computed(() => normalizeLineType(form.value.line_type))
const shouldGenerateDoctor = computed(
  () => isRegularMode.value && ['all', 'doctor'].includes(selectedLineType.value) && doctorEmployees.value.length > 0,
)
const targetEmployees = computed(() => (isRegularMode.value ? regularEmployees.value : regularEmployees.value))

const previewItems = computed(() => previewResult.value?.items || [])
const previewWarnings = computed(() => previewResult.value?.warnings || [])
const previewWarningSummaries = computed(() => {
  const warnings = previewWarnings.value || []
  const skipped = warnings.filter((warning) => warning.type === 'skipped_payroll')
  const missingSalary = warnings.filter((warning) => warning.type === 'missing_salary_structure')
  const missingBonus = warnings.filter((warning) => warning.type === 'missing_bonus')
  const other = warnings.filter((warning) => !['skipped_payroll', 'missing_salary_structure', 'missing_bonus'].includes(warning.type))
  const summaries = []

  if (missingSalary.length) {
    summaries.push({
      key: 'missing_salary_structure',
      message: `${missingSalary.length} employee${missingSalary.length > 1 ? 's do' : ' does'} not have an active salary structure for this payroll month.`,
    })
  }

  if (missingBonus.length) {
    summaries.push({
      key: 'missing_bonus',
      message: `${missingBonus.length} employee${missingBonus.length > 1 ? 's do' : ' does'} not have an approved bonus for this payroll month.`,
    })
  }

  if (skipped.length) {
    summaries.push({
      key: 'skipped_payroll',
      message: `${skipped.length} employee${skipped.length > 1 ? 's already have' : ' already has'} a reviewed, approved, paid, locked, or cancelled payroll and will be skipped.`,
    })
  }

  other.forEach((warning, index) => {
    summaries.push({
      key: `other-${index}-${warning.employee_id || ''}`,
      message: warning.message,
    })
  })

  return summaries
})
const warningTypeMeta = {
  missing_salary_structure: {
    label: 'Missing Salary Structure',
    tone: 'bg-red-50 text-red-700 border-red-200',
  },
  missing_bonus: {
    label: 'Missing Bonus',
    tone: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  skipped_payroll: {
    label: 'Skipped Payroll',
    tone: 'bg-slate-50 text-slate-700 border-slate-200',
  },
  blocked_advance_recovery: {
    label: 'Advance Not Finalized',
    tone: 'bg-orange-50 text-orange-700 border-orange-200',
  },
}
const warningTypeLabel = (type) => warningTypeMeta[type]?.label || 'Warning'
const warningTypeClass = (type) => warningTypeMeta[type]?.tone || 'bg-orange-50 text-orange-700 border-orange-200'
const previewWarningRows = computed(() =>
  (previewWarnings.value || []).map((warning, index) => ({
    key: `${warning.type || 'warning'}-${warning.employee_id || warning.employee_code || index}`,
    type: warning.type || 'warning',
    employee_name: warning.employee_name || warning.name || '-',
    employee_code: warning.employee_code || warning.employee_no || '-',
    department: warning.department || '-',
    line_type: warning.line_type || '-',
    salary_month: warning.salary_month || previewResult.value?.batch?.salary_month || form.value.salary_month || '-',
    message: warning.message || 'Review this employee before generating payroll.',
  })),
)
const generatedPayload = computed(() => generateResult.value?.data || generateResult.value || null)
const generatedBatch = computed(() => generatedPayload.value?.batch || null)
const generatedPayrolls = computed(() => [
  ...(generatedPayload.value?.generated || generatedPayload.value?.payrolls || []),
  ...(doctorGenerateResult.value?.data?.generated || doctorGenerateResult.value?.generated || []),
])
const skippedPayrolls = computed(() => [
  ...(generatedPayload.value?.skipped || []),
  ...(doctorGenerateResult.value?.data?.skipped || doctorGenerateResult.value?.skipped || []),
])
const missingSalaryStructures = computed(() => [
  ...(generatedPayload.value?.missing_salary_structures || []),
  ...(doctorGenerateResult.value?.data?.missing_salary_structures ||
    doctorGenerateResult.value?.missing_salary_structures ||
    []),
])
const snapshotMissingUsers = computed(() => snapshotIssue.value?.missing_users || [])
const hasSnapshotIssue = computed(() => Boolean(snapshotIssue.value?.required_recalculation))

const previewTotals = computed(() =>
  previewItems.value.reduce(
    (acc, item) => {
      acc.base += Number(item.base_payable || 0)
      acc.bonus += Number(item.bonus || 0)
      acc.deductions += Number(item.deductions?.total || 0)
      acc.advance += Number(isHalfMode.value ? item.month_end_adjustable_amount || item.base_payable || 0 : item.previous_advance_adjustment || 0)
      acc.nonAdjustableBonus += Number(isHalfMode.value ? item.non_adjustable_bonus_amount || item.bonus || 0 : 0)
      acc.net += Number(item.net_payable || 0)
      return acc
    },
    { base: 0, bonus: 0, deductions: 0, advance: 0, nonAdjustableBonus: 0, net: 0 },
  )
)

const modeLabel = computed(() =>
  modeOptions.value.find((mode) => mode.value === form.value.payroll_cycle)?.label || 'Regular Monthly Payroll',
)

watch(
  () => form.value.payroll_cycle,
  (mode) => {
    if (mode === 'regular') {
      form.value.apply_deductions = true
      form.value.include_bonus = false
      form.value.deduct_previous_advance = true
    } else if (mode === 'half_salary_advance') {
      form.value.salary_percentage = form.value.salary_percentage || 50
      form.value.apply_deductions = false
      form.value.deduct_previous_advance = false
      advancedOpen.value = true
    } else if (mode === 'bonus_only') {
      form.value.apply_deductions = false
      form.value.include_bonus = true
      form.value.deduct_previous_advance = false
      advancedOpen.value = true
    }
    batchStore.$patch({ previewResult: null })
    snapshotIssue.value = null
  },
)

onMounted(() => {
  batchStore.fetchOptions().catch(() => {})
})

const handleEmployeeFilterChange = (payload = {}) => {
  form.value.company_id = payload.company_id || ''
  form.value.department_id = payload.department_id || ''
  form.value.line_type = payload.line_type || 'all'
  form.value.employee_id = payload.employee_id || ''
  batchStore.$patch({ previewResult: null })
  snapshotIssue.value = null
}

const validate = () => {
  const errors = {}
  if (!form.value.company_id) errors.company_id = 'Company is required.'
  if (!form.value.salary_month) errors.salary_month = 'Salary month is required.'
  if (isHalfMode.value && !Number(form.value.salary_percentage || 0) && !Number(form.value.fixed_pay_amount || 0)) {
    errors.salary_percentage = 'Salary percentage or fixed amount is required.'
  }
  formErrors.value = errors
  return !Object.keys(errors).length
}

const buildPayrollPayload = () => {
  const employees = targetEmployees.value
  const payload = {
    company_id: form.value.company_id,
    department_id: form.value.department_id || undefined,
    line_type: form.value.line_type && form.value.line_type !== 'all' ? form.value.line_type : undefined,
    salary_month: form.value.salary_month,
    salary_type: 'Monthly',
    payroll_cycle: form.value.payroll_cycle,
    employee_ids: employees.map((employee) => Number(employee.id)).filter(Boolean),
    apply_deductions: form.value.apply_deductions,
    include_bonus: form.value.include_bonus,
    deduct_previous_advance: form.value.deduct_previous_advance,
    remarks: form.value.remarks || undefined,
    note: form.value.note || undefined,
  }

  if (isHalfMode.value) {
    payload.salary_percentage = form.value.salary_percentage || undefined
    payload.fixed_pay_amount = form.value.fixed_pay_amount || undefined
  }
  if (isBonusOnlyMode.value) {
    payload.include_bonus = true
  }
  if (!payload.employee_ids.length) delete payload.employee_ids
  Object.keys(payload).forEach((key) => {
    if (payload[key] === '' || payload[key] === undefined || payload[key] === null) delete payload[key]
  })
  return payload
}

const captureSnapshotIssue = (error) => {
  const meta = error?.meta || {}
  if (meta.required_recalculation) {
    snapshotIssue.value = meta
    return true
  }
  snapshotIssue.value = null
  return false
}

const formatSnapshotDate = (value) => {
  if (!value) return 'Never'
  const date = new Date(String(value).replace(' ', 'T'))
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString()
}

const buildDoctorPayload = () => {
  const payload = {
    company_id: form.value.company_id,
    salary_month: form.value.salary_month,
    employee_ids: doctorEmployees.value.map((employee) => Number(employee.id)).filter(Boolean),
    remarks: form.value.remarks || undefined,
  }
  if (!payload.employee_ids.length) delete payload.employee_ids
  if (!payload.remarks) delete payload.remarks
  return payload
}

const handlePreview = async () => {
  if (!validate()) return
  if (!targetEmployees.value.length && !shouldGenerateDoctor.value) {
    toast.error('No employees found for the selected filters.')
    return
  }
  if (!targetEmployees.value.length && shouldGenerateDoctor.value) {
    toast.info('Doctor payroll uses the existing generate flow and is not included in this preview.')
    return
  }
  try {
    snapshotIssue.value = null
    await batchStore.previewPayroll(buildPayrollPayload())
    toast.success('Payroll preview is ready.')
  } catch (e) {
    if (captureSnapshotIssue(e)) {
      toast.error(e.message || 'Recalculate monthly attendance snapshot first.')
      return
    }
    if (e.errors) formErrors.value = e.errors
    toast.error(e.message || 'Preview failed.')
  }
}

const openConfirm = async () => {
  if (hasSnapshotIssue.value) {
    toast.error('Recalculate monthly attendance snapshot first.')
    return
  }
  if (!previewItems.value.length) {
    await handlePreview()
    if (!previewItems.value.length) return
  }
  if (hasSnapshotIssue.value) return
  confirmOpen.value = true
}

const handleGenerate = async () => {
  try {
    snapshotIssue.value = null
    doctorGenerateResult.value = null
    await batchStore.generatePayroll(buildPayrollPayload())
    if (shouldGenerateDoctor.value) {
      doctorGenerateResult.value = await batchStore.generateDoctorPayroll(buildDoctorPayload())
    }
    submitted.value = true
    confirmOpen.value = false
    toast.success(shouldGenerateDoctor.value ? 'Payroll and doctor payroll generated successfully.' : 'Payroll batch generated successfully.')
  } catch (e) {
    if (captureSnapshotIssue(e)) {
      confirmOpen.value = false
      toast.error(e.message || 'Recalculate monthly attendance snapshot first.')
      return
    }
    if (e.errors) formErrors.value = e.errors
    toast.error(e.message || 'Generation failed.')
  }
}

const recalculateSnapshot = async () => {
  if (!form.value.company_id || !form.value.salary_month) {
    toast.error('Company and salary month are required.')
    return
  }

  snapshotRecalculating.value = true
  try {
    await attendanceStore.recalculateMonthlySnapshot(
      form.value.company_id,
      form.value.department_id || undefined,
      form.value.line_type || 'all',
      form.value.employee_id || undefined,
      form.value.salary_month,
    )
    snapshotIssue.value = null
    toast.success('Monthly attendance snapshot recalculated.')
    await handlePreview()
  } catch (e) {
    toast.error(e?.response?.data?.message || e.message || 'Snapshot recalculation failed.')
  } finally {
    snapshotRecalculating.value = false
  }
}

const generateDoctorOnly = async () => {
  if (!validate()) return
  try {
    doctorGenerateResult.value = await batchStore.generateDoctorPayroll(buildDoctorPayload())
    submitted.value = true
    toast.success('Doctor payroll generated successfully.')
  } catch (e) {
    toast.error(e.message || 'Doctor payroll generation failed.')
  }
}

const resetGeneration = () => {
  submitted.value = false
  doctorGenerateResult.value = null
  batchStore.$patch({ generateResult: null, previewResult: null })
}

const goToBatch = () => {
  if (generatedBatch.value?.id) router.push({ name: 'PayrollBatchShow', params: { id: generatedBatch.value.id } })
}
</script>

<template>
  <div class="space-y-4 p-4 md:p-5">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div class="flex min-w-0 items-center gap-3">
        <button class="btn-3 shrink-0" @click="router.back()"><i class="far fa-arrow-left"></i></button>
        <div class="min-w-0">
          <h1 class="title-md md:title-lg">Generate Payroll</h1>
          <p class="text-xs text-slate-500">Select employees, preview totals, then generate the payroll batch.</p>
        </div>
      </div>
      <div class="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 shadow-sm">
        <i class="far fa-calendar text-blue-600"></i>
        <span>{{ form.salary_month || 'No month selected' }}</span>
      </div>
    </div>

    <div v-if="apiUnavailable" class="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
      <p class="font-semibold">Payroll Batch API not ready</p>
      <p class="mt-1">Payroll generation is temporarily unavailable.</p>
    </div>

    <template v-else-if="!submitted">
      <div class="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div class="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div class="border-b border-slate-100 bg-slate-50 px-4 py-3">
            <div class="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p class="text-sm font-semibold text-slate-900">Payroll setup</p>
                <p class="text-xs text-slate-500">Required filters and month are kept at the top for faster entry.</p>
              </div>
              <button class="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50" @click="advancedOpen = !advancedOpen">
                <i class="far" :class="advancedOpen ? 'fa-chevron-up' : 'fa-sliders-h'"></i>
                Advanced
              </button>
            </div>
          </div>

          <div class="space-y-4 p-4">
            <section class="space-y-2">
              <label class="block text-xs font-semibold uppercase text-slate-500">Employee Filter <span class="text-red-500">*</span></label>
              <EmployeeFilter
                ref="employeeFilterRef"
                :company_id="form.company_id"
                :department_id="form.department_id"
                :line_type="form.line_type"
                :employee_id="form.employee_id"
                :with-employee="true"
                active-only
                @filter-change="handleEmployeeFilterChange"
              />
              <p v-if="formErrors.company_id" class="text-xs text-red-500">{{ formErrors.company_id }}</p>
              <p v-if="formErrors.employee_id" class="text-xs text-red-500">{{ formErrors.employee_id }}</p>
            </section>

            <section class="grid gap-3 lg:grid-cols-[220px_minmax(0,1fr)]">
              <div>
                <label class="mb-1 block text-xs font-semibold uppercase text-slate-500">Salary Month <span class="text-red-500">*</span></label>
                <input v-model="form.salary_month" type="month" :class="inputCls" />
                <p v-if="formErrors.salary_month" class="mt-1 text-xs text-red-500">{{ formErrors.salary_month }}</p>
              </div>

              <div>
                <label class="mb-1 block text-xs font-semibold uppercase text-slate-500">Payroll Type <span class="text-red-500">*</span></label>
                <div class="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                  <button
                    v-for="mode in modeOptions"
                    :key="mode.value"
                    type="button"
                    class="rounded-lg border px-3 py-2 text-left text-xs font-semibold transition"
                    :class="form.payroll_cycle === mode.value ? 'border-blue-500 bg-blue-50 text-blue-800 shadow-sm' : 'border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:bg-slate-50'"
                    @click="form.payroll_cycle = mode.value"
                  >
                    {{ mode.label }}
                  </button>
                </div>
                <p v-if="formErrors.payroll_cycle" class="mt-1 text-xs text-red-500">{{ formErrors.payroll_cycle }}</p>
              </div>
            </section>

            <section v-if="advancedOpen" class="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
              <PayrollRuleSummary :mode="form.payroll_cycle" />

              <div v-if="isRegularMode" class="grid gap-2 md:grid-cols-3">
                <label class="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
                  <input v-model="form.apply_deductions" type="checkbox" disabled /> Apply deductions
                </label>
                <label class="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
                  <input v-model="form.include_bonus" type="checkbox" /> Include bonus
                </label>
                <label class="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
                  <input v-model="form.deduct_previous_advance" type="checkbox" /> Deduct previous advance
                </label>
              </div>

              <div v-else-if="isHalfMode" class="grid gap-2 md:grid-cols-3">
                <div>
                  <label class="mb-1 block text-xs font-semibold uppercase text-slate-500">Salary Percentage</label>
                  <input v-model="form.salary_percentage" type="number" min="0" max="100" :class="inputCls" />
                  <p v-if="formErrors.salary_percentage" class="mt-1 text-xs text-red-500">{{ formErrors.salary_percentage }}</p>
                </div>
                <div>
                  <label class="mb-1 block text-xs font-semibold uppercase text-slate-500">Fixed Amount Optional</label>
                  <input v-model="form.fixed_pay_amount" type="number" min="0" :class="inputCls" />
                </div>
                <label class="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
                  <input v-model="form.include_bonus" type="checkbox" /> Include bonus
                </label>
                <div class="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 md:col-span-2">
                  Deductions and previous advance deduction are forced off.
                </div>
                <template v-if="form.include_bonus">
                  <div>
                    <label class="mb-1 block text-xs font-semibold uppercase text-slate-500">Bonus Type</label>
                    <select v-model="form.bonus_type" :class="inputCls">
                      <option value="">Use approved bonus entries</option>
                      <option v-for="type in options?.bonus_types || []" :key="type.value" :value="type.value">{{ type.label }}</option>
                    </select>
                  </div>
                  <div class="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700 md:col-span-2">
                    Bonus is paid with advance and not adjusted from month-end payroll.
                  </div>
                </template>
              </div>

              <div v-else-if="isBonusOnlyMode" class="grid gap-3 md:grid-cols-2">
                <div>
                  <label class="mb-1 block text-xs font-semibold uppercase text-slate-500">Bonus Type</label>
                  <select v-model="form.bonus_type" :class="inputCls">
                    <option value="">Use approved bonus entries</option>
                    <option v-for="type in options?.bonus_types || []" :key="type.value" :value="type.value">{{ type.label }}</option>
                  </select>
                </div>
                <div class="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
                  Bonus source/list is loaded from approved bonus entries for the selected month.
                </div>
              </div>

              <div v-if="isNonRegularMode">
                <label class="mb-1 block text-xs font-semibold uppercase text-slate-500">Type Note</label>
                <textarea v-model="form.note" rows="2" :class="inputCls" placeholder="Reason or internal note for this payroll type..."></textarea>
              </div>
            </section>

            <section class="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
              <div>
                <label class="mb-1 block text-xs font-semibold uppercase text-slate-500">Remarks</label>
                <textarea v-model="form.remarks" rows="2" :class="inputCls" placeholder="Optional note for this batch..."></textarea>
              </div>
              <div class="flex flex-wrap gap-2">
                <button class="btn-3" @click="router.back()">Cancel</button>
                <button class="btn-3" :disabled="loading" @click="handlePreview">
                  <i class="far" :class="loading ? 'fa-spinner fa-spin' : 'fa-table'"></i>
                  Preview
                </button>
                <button v-if="selectedLineType === 'doctor' && isRegularMode" class="btn-2" :disabled="loading" @click="generateDoctorOnly">
                  <i class="far fa-user-md"></i> Generate Doctor
                </button>
                <button v-else class="btn-2" :disabled="loading || hasSnapshotIssue" @click="openConfirm">
                  <i class="far fa-check-circle"></i> Generate
                </button>
              </div>
            </section>

            <div v-if="isNonRegularMode" class="rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-xs text-orange-800">
              <i class="far fa-exclamation-triangle mr-1"></i>
              Non-regular payroll changes employee payment timing. Review the preview and confirmation totals before generating.
            </div>

            <div v-if="error" class="flex gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <i class="fas fa-exclamation-circle mt-0.5"></i> {{ error }}
            </div>

            <section v-if="hasSnapshotIssue" class="space-y-3 rounded-lg border border-red-200 bg-red-50 p-3">
              <div class="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p class="text-sm font-bold text-red-800">Monthly attendance snapshot is not ready</p>
                  <p class="mt-1 text-xs text-red-700">
                    Recalculate attendance snapshot for {{ form.salary_month }} before payroll preview/generation.
                  </p>
                </div>
                <button class="btn-2" :disabled="snapshotRecalculating || loading" @click="recalculateSnapshot">
                  <i class="far" :class="snapshotRecalculating ? 'fa-spinner fa-spin' : 'fa-sync'"></i>
                  Recalculate Snapshot
                </button>
              </div>

              <div class="overflow-x-auto rounded-lg border border-red-100 bg-white">
                <table class="w-full min-w-[760px] text-xs">
                  <thead class="bg-red-100 text-left uppercase text-red-800">
                    <tr>
                      <th class="px-3 py-2">#</th>
                      <th class="px-3 py-2">Employee</th>
                      <th class="px-3 py-2">Emp ID</th>
                      <th class="px-3 py-2">Department</th>
                      <th class="px-3 py-2">Line Type</th>
                      <th class="px-3 py-2">Issue</th>
                      <th class="px-3 py-2">Last Update</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-red-50 text-slate-700">
                    <tr v-for="(user, index) in snapshotMissingUsers" :key="user.user_id || index">
                      <td class="px-3 py-2">{{ index + 1 }}</td>
                      <td class="px-3 py-2 font-semibold text-slate-900">{{ user.name || '-' }}</td>
                      <td class="px-3 py-2 font-mono">{{ user.employee_id || '-' }}</td>
                      <td class="px-3 py-2">{{ user.department || '-' }}</td>
                      <td class="px-3 py-2">{{ user.line_type || '-' }}</td>
                      <td class="px-3 py-2 text-red-700">{{ user.reason || 'Snapshot is not ready.' }}</td>
                      <td class="px-3 py-2">{{ formatSnapshotDate(user.last_update) }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </div>

        <aside class="space-y-3 xl:sticky xl:top-4 xl:self-start">
          <div class="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <p class="text-xs font-semibold uppercase text-slate-400">Current Mode</p>
            <p class="mt-1 text-base font-bold text-slate-900">{{ modeLabel }}</p>
            <PayrollRuleSummary class="mt-3" :mode="form.payroll_cycle" />
          </div>

          <div class="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <p class="text-xs font-semibold uppercase text-slate-400">Selection</p>
            <div class="mt-3 grid grid-cols-3 gap-2 xl:grid-cols-1">
              <div class="rounded-lg bg-slate-50 p-3">
                <p class="text-[11px] uppercase text-slate-400">Regular</p>
                <p class="text-lg font-bold text-slate-900">{{ regularEmployees.length }}</p>
              </div>
              <div class="rounded-lg bg-slate-50 p-3">
                <p class="text-[11px] uppercase text-slate-400">Doctor</p>
                <p class="text-lg font-bold text-slate-900">{{ doctorEmployees.length }}</p>
              </div>
              <div class="rounded-lg bg-blue-50 p-3">
                <p class="text-[11px] uppercase text-blue-500">Preview</p>
                <p class="text-lg font-bold text-blue-900">{{ previewItems.length }}</p>
              </div>
            </div>
          </div>
        </aside>
      </div>

      <div v-if="previewItems.length || previewWarningSummaries.length" class="space-y-3">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 class="text-base font-bold text-slate-900">Payroll Preview</h2>
            <p class="text-xs text-slate-500">Review calculated values before generating payroll.</p>
          </div>
          <button class="btn-2" :disabled="loading || hasSnapshotIssue" @click="openConfirm">
            <i class="far fa-check-circle"></i> Confirm Generate
          </button>
        </div>
        <PayrollPreviewTable :items="previewItems" :mode="form.payroll_cycle" />
        <div v-if="previewWarningSummaries.length" class="overflow-hidden rounded-lg border border-amber-200 bg-white shadow-sm">
          <div class="flex flex-wrap items-start justify-between gap-3 border-b border-amber-100 bg-amber-50 px-4 py-3">
            <div>
              <p class="text-sm font-bold text-amber-900">Warnings</p>
              <p class="mt-0.5 text-xs text-amber-700">Review these employees before generating payroll.</p>
            </div>
            <div class="flex flex-wrap gap-2">
              <span
                v-for="warning in previewWarningSummaries"
                :key="warning.key"
                class="rounded-full border border-amber-200 bg-white px-2.5 py-1 text-xs font-semibold text-amber-800"
              >
                {{ warning.message }}
              </span>
            </div>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full min-w-[920px] text-sm">
              <thead class="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th class="px-4 py-3 text-left">#</th>
                  <th class="px-4 py-3 text-left">Employee</th>
                  <th class="px-4 py-3 text-left">Emp ID</th>
                  <th class="px-4 py-3 text-left">Department</th>
                  <th class="px-4 py-3 text-left">Line Type</th>
                  <th class="px-4 py-3 text-left">Type</th>
                  <th class="px-4 py-3 text-left">Details</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                <tr v-for="(warning, index) in previewWarningRows" :key="warning.key" class="align-top hover:bg-amber-50/40">
                  <td class="px-4 py-3 text-slate-500">{{ index + 1 }}</td>
                  <td class="px-4 py-3">
                    <div class="font-semibold text-slate-900">{{ warning.employee_name }}</div>
                    <div class="text-xs text-slate-400">Month: {{ warning.salary_month }}</div>
                  </td>
                  <td class="px-4 py-3 font-mono text-slate-600">{{ warning.employee_code }}</td>
                  <td class="px-4 py-3 text-slate-600">{{ warning.department }}</td>
                  <td class="px-4 py-3 text-slate-600">{{ warning.line_type }}</td>
                  <td class="px-4 py-3">
                    <span class="inline-flex rounded-full border px-2 py-1 text-xs font-semibold" :class="warningTypeClass(warning.type)">
                      {{ warningTypeLabel(warning.type) }}
                    </span>
                  </td>
                  <td class="px-4 py-3 text-slate-700">{{ warning.message }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </template>

    <template v-else>
      <div class="space-y-4">
        <div class="rounded-lg border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
          <div class="flex flex-wrap items-center gap-3">
            <div class="flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
              <i class="fas fa-check-circle text-2xl"></i>
            </div>
            <div>
              <p class="text-base font-bold text-emerald-800">Payroll Generated</p>
              <p class="text-sm text-emerald-700">
                <span v-if="generatedBatch">Batch #{{ generatedBatch.id }} &middot; {{ generatedBatch.salary_month }}</span>
                <span v-else>Review the generated payrolls below.</span>
              </p>
            </div>
            <div class="ml-auto flex flex-wrap gap-2">
              <button class="btn-2" :disabled="!generatedBatch?.id" @click="goToBatch"><i class="far fa-eye"></i> View Batch</button>
              <button class="btn-3" @click="resetGeneration"><i class="far fa-plus"></i> Generate Another</button>
            </div>
          </div>
        </div>

        <div v-if="generatedPayrolls.length" class="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div class="border-b px-4 py-3 text-sm font-semibold text-blue-800">Generated Payrolls ({{ generatedPayrolls.length }})</div>
          <div class="overflow-x-auto">
            <table class="w-full min-w-[760px] text-sm">
              <thead class="bg-blue-50 text-xs uppercase text-blue-900">
                <tr>
                  <th class="px-4 py-3 text-left">Employee</th>
                  <th class="px-4 py-3 text-right">Gross</th>
                  <th class="px-4 py-3 text-right">Deductions</th>
                  <th class="px-4 py-3 text-right">Net Salary</th>
                  <th class="px-4 py-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-50">
                <tr v-for="(p, index) in generatedPayrolls" :key="`${p.id}-${index}`">
                  <td class="px-4 py-3">
                    <div class="font-medium">{{ p.user?.name || p.employee_name }}</div>
                    <div class="text-xs text-gray-400">{{ p.user?.employee_id || p.employee_code }}</div>
                  </td>
                  <td class="px-4 py-3 text-right font-mono">{{ formatCurrency(p.gross_salary) }}</td>
                  <td class="px-4 py-3 text-right font-mono text-red-600">{{ formatCurrency(p.total_deduction) }}</td>
                  <td class="px-4 py-3 text-right font-mono font-bold text-emerald-700">{{ formatCurrency(p.net_salary ?? p.net_payable) }}</td>
                  <td class="px-4 py-3 text-center"><PayrollStatusBadge :status="p.payment_status || p.status" /></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div v-if="skippedPayrolls.length || missingSalaryStructures.length" class="rounded-lg border border-amber-200 bg-white p-4 text-sm text-amber-800">
          <p class="font-semibold">Warnings</p>
          <p v-if="skippedPayrolls.length" class="mt-2">Skipped payrolls: {{ skippedPayrolls.length }}</p>
          <p v-if="missingSalaryStructures.length" class="mt-1">Missing salary structures: {{ missingSalaryStructures.length }}</p>
        </div>
      </div>
    </template>

    <div v-if="confirmOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div class="w-full max-w-2xl rounded-lg bg-white p-5 shadow-2xl">
        <div class="flex items-start justify-between gap-4">
          <div>
            <h2 class="text-lg font-bold text-slate-900">Confirm Payroll Generation</h2>
            <p class="mt-1 text-sm text-slate-500">Review totals before creating payroll records.</p>
          </div>
          <button class="btn-3" @click="confirmOpen = false"><i class="far fa-times"></i></button>
        </div>

        <div class="mt-4 grid gap-2 md:grid-cols-2">
          <div class="rounded-lg bg-slate-50 p-3 text-sm"><span class="text-slate-500">Payroll Type</span><p class="font-semibold">{{ modeLabel }}</p></div>
          <div class="rounded-lg bg-slate-50 p-3 text-sm"><span class="text-slate-500">Month</span><p class="font-semibold">{{ form.salary_month || '-' }}</p></div>
          <div class="rounded-lg bg-slate-50 p-3 text-sm"><span class="text-slate-500">Employee count</span><p class="font-semibold">{{ previewItems.length }}</p></div>
          <div class="rounded-lg bg-slate-50 p-3 text-sm"><span class="text-slate-500">{{ isHalfMode ? 'Total salary advance' : 'Total base payable' }}</span><p class="font-semibold">{{ formatCurrency(previewTotals.base) }}</p></div>
          <div class="rounded-lg bg-slate-50 p-3 text-sm"><span class="text-slate-500">Total bonus</span><p class="font-semibold">{{ formatCurrency(previewTotals.bonus) }}</p></div>
          <div class="rounded-lg bg-slate-50 p-3 text-sm"><span class="text-slate-500">Total deductions</span><p class="font-semibold">{{ formatCurrency(previewTotals.deductions) }}</p></div>
          <div class="rounded-lg bg-slate-50 p-3 text-sm"><span class="text-slate-500">{{ isHalfMode ? 'Amount to adjust in month-end payroll' : 'Total advance adjusted' }}</span><p class="font-semibold">{{ formatCurrency(previewTotals.advance) }}</p></div>
          <div v-if="isHalfMode" class="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900"><span class="text-emerald-700">Non-adjustable bonus</span><p class="font-semibold">{{ formatCurrency(previewTotals.nonAdjustableBonus) }}</p></div>
          <div class="rounded-lg bg-blue-50 p-3 text-sm text-blue-900"><span class="text-blue-600">Total net payable</span><p class="font-semibold">{{ formatCurrency(previewTotals.net) }}</p></div>
        </div>

        <div v-if="isNonRegularMode || previewWarningSummaries.length" class="mt-4 rounded-lg border border-orange-200 bg-orange-50 p-3 text-sm text-orange-800">
          <p class="font-semibold">Important warnings</p>
          <div class="mt-2"><PayrollRuleSummary :mode="form.payroll_cycle" /></div>
          <ul v-if="previewWarningSummaries.length" class="mt-2 list-disc pl-5">
            <li v-for="warning in previewWarningSummaries" :key="warning.key">{{ warning.message }}</li>
          </ul>
        </div>

        <div class="mt-5 flex justify-end gap-2">
          <button class="btn-3" @click="confirmOpen = false">Cancel</button>
          <button class="btn-2" :disabled="loading || hasSnapshotIssue" @click="handleGenerate">
            <i class="far" :class="loading ? 'fa-spinner fa-spin' : 'fa-check'"></i>
            Generate Payroll
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
