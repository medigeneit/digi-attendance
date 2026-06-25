<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'
import { storeToRefs } from 'pinia'
import { usePayrollBatchStore } from '@/stores/payrollBatch'
import { useAttendanceStore } from '@/stores/attendance'
import { usePayrollArrearEntryStore } from '@/stores/payrollArrearEntry'
import { usePayrollAdvanceDeductionStore } from '@/stores/payrollAdvanceDeduction'
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
const arrearStore = usePayrollArrearEntryStore()
const advanceDeductionStore = usePayrollAdvanceDeductionStore()
const { loading, error, generateResult, previewResult, options, apiUnavailable } = storeToRefs(batchStore)

// Pending entry counts for the selected month
const pendingArrearCount = ref(0)
const pendingAdvanceCount = ref(0)
const pendingCountsLoading = ref(false)

const fetchPendingCounts = async () => {
  if (!form.value.salary_month) return
  pendingCountsLoading.value = true
  try {
    const params = {
      salary_month: form.value.salary_month,
      status: 'pending',
      per_page: 1,
      ...(form.value.company_id ? { company_id: form.value.company_id } : {}),
    }
    const [arrearRes, advanceRes] = await Promise.allSettled([
      arrearStore.fetchList(params),
      advanceDeductionStore.fetchList({ ...params, carry_on_month: params.salary_month, salary_month: undefined }),
    ])
    pendingArrearCount.value = arrearRes.status === 'fulfilled' ? (arrearRes.value?.total ?? arrearStore.pagination?.total ?? 0) : 0
    pendingAdvanceCount.value = advanceRes.status === 'fulfilled' ? (advanceRes.value?.total ?? advanceDeductionStore.pagination?.total ?? 0) : 0
  } catch {
    // non-critical — silently ignore
  } finally {
    pendingCountsLoading.value = false
  }
}

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
      acc.base              += Number(item.base_payable || 0)
      acc.arrear            += Number(item.arrear_amount || 0)
      acc.bonus             += Number(item.bonus || 0)
      acc.deductions        += Number(item.deductions?.total || 0)
      acc.advance_deduction += Number(item.deductions?.advance || 0)
      acc.advance           += Number(isHalfMode.value ? item.month_end_adjustable_amount || item.base_payable || 0 : item.previous_advance_adjustment || 0)
      acc.nonAdjustableBonus += Number(isHalfMode.value ? item.non_adjustable_bonus_amount || item.bonus || 0 : 0)
      acc.net               += Number(item.net_payable || 0)
      return acc
    },
    { base: 0, arrear: 0, bonus: 0, deductions: 0, advance_deduction: 0, advance: 0, nonAdjustableBonus: 0, net: 0 },
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
  if (form.value.salary_month) fetchPendingCounts()
})

watch(
  () => [form.value.salary_month, form.value.company_id],
  () => { if (form.value.salary_month) fetchPendingCounts() },
)

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
  <div class="min-h-screen bg-slate-50/50">

    <!-- ══ TOP BAR ════════════════════════════════════════════════════════ -->
    <div class="sticky top-0 z-20 border-b border-slate-200 bg-white shadow-sm">
      <div class="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 md:px-6">
        <div class="flex min-w-0 items-center gap-2.5">
          <button
            class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-50"
            @click="router.back()"
          ><i class="far fa-arrow-left text-xs"></i></button>
          <div class="hidden h-5 w-px bg-slate-200 sm:block"></div>
          <nav class="hidden items-center gap-1 text-[10px] sm:flex">
            <span class="font-bold uppercase tracking-[0.2em] text-blue-600">Payroll</span>
            <i class="far fa-chevron-right text-[9px] text-slate-300"></i>
            <span class="text-slate-400">Batches</span>
            <i class="far fa-chevron-right text-[9px] text-slate-300"></i>
            <span class="font-semibold text-slate-600">Generate</span>
          </nav>
          <div class="hidden h-4 w-px bg-slate-200 sm:block"></div>
          <h1 class="text-sm font-bold text-slate-900 sm:text-base">Generate Payroll Batch</h1>
        </div>
        <div class="flex items-center gap-2">
          <div v-if="form.salary_month"
            class="flex items-center gap-1.5 rounded-lg border border-blue-100 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
            <i class="far fa-calendar-alt text-[10px] text-blue-400"></i>
            {{ form.salary_month }}
          </div>
          <div class="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 shadow-sm">
            <span class="h-1.5 w-1.5 rounded-full"
              :class="isRegularMode ? 'bg-blue-500' : isHalfMode ? 'bg-amber-500' : 'bg-purple-500'"></span>
            {{ modeLabel }}
          </div>
        </div>
      </div>
    </div>

    <div class="space-y-5 p-4 md:p-5">

      <!-- API unavailable -->
      <div v-if="apiUnavailable" class="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        <p class="font-semibold">Payroll Batch API not ready</p>
        <p class="mt-1">Payroll generation is temporarily unavailable.</p>
      </div>

      <template v-else-if="!submitted">

        <!-- ══ MAIN GRID: [Left: form+preview] [Right: sidebar] ══════════ -->
        <div class="grid gap-4 xl:grid-cols-[minmax(0,1fr)_288px] xl:items-start">

          <!-- LEFT COLUMN ────────────────────────────────────────────── -->
          <div class="min-w-0 space-y-4">

          <!-- Setup card — compact divide-y layout -->
          <div class="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">

            <!-- Card header -->
            <div class="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-4 py-2.5">
              <div class="flex items-center gap-2.5">
                <div class="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white">1</div>
                <p class="text-sm font-bold text-slate-800">Payroll Setup</p>
                <span class="hidden text-[10px] text-slate-400 sm:inline">· Filters, month, and type</span>
              </div>
              <button
                class="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-500 transition hover:bg-slate-50"
                @click="advancedOpen = !advancedOpen"
              >
                <i class="far text-[9px]" :class="advancedOpen ? 'fa-chevron-up text-blue-500' : 'fa-sliders-h'"></i>
                {{ advancedOpen ? 'Hide' : 'Advanced' }}
              </button>
            </div>

            <div class="divide-y divide-slate-100">

              <!-- ① Employee Filter -->
              <div class="px-4 py-3">
                <label class="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Employee Filter <span class="text-red-500">*</span>
                </label>
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
                <p v-if="formErrors.company_id" class="mt-1 text-xs text-red-500">{{ formErrors.company_id }}</p>
              </div>

              <!-- ② Compact config row: Month | Type buttons | Actions -->
              <div class="flex flex-wrap items-center gap-3 px-4 py-3">
                <!-- Month picker -->
                <div class="flex-shrink-0">
                  <label class="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Month <span class="text-red-500">*</span>
                  </label>
                  <input
                    v-model="form.salary_month"
                    type="month"
                    class="h-8 rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-700 shadow-sm transition focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                  <p v-if="formErrors.salary_month" class="mt-0.5 text-[10px] text-red-500">{{ formErrors.salary_month }}</p>
                </div>

                <div class="hidden h-8 w-px flex-shrink-0 bg-slate-200 sm:block"></div>

                <!-- Payroll type pills -->
                <div class="flex flex-1 flex-wrap gap-1.5">
                  <label class="mb-1 hidden w-full text-[10px] font-bold uppercase tracking-wider text-slate-400 sm:block">
                    Payroll Type <span class="text-red-500">*</span>
                  </label>
                  <button
                    v-for="mode in modeOptions"
                    :key="mode.value"
                    type="button"
                    class="rounded-lg border px-3 py-1.5 text-xs font-semibold transition"
                    :class="form.payroll_cycle === mode.value
                      ? 'border-blue-500 bg-blue-600 text-white shadow-sm'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:bg-blue-50'"
                    @click="form.payroll_cycle = mode.value"
                  >{{ mode.label }}</button>
                </div>

                <div class="hidden h-8 w-px flex-shrink-0 bg-slate-200 sm:block"></div>

                <!-- Action buttons -->
                <div class="flex flex-shrink-0 items-center gap-1.5">
                  <button
                    class="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                    @click="router.back()"
                  >Cancel</button>
                  <button
                    class="btn-2 rounded-lg py-1"
                    :disabled="loading"
                    @click="handlePreview"
                  >
                    <i class="far text-[10px]" :class="loading ? 'fa-spinner fa-spin' : 'fa-table'"></i>
                    Preview
                  </button>
                  <button
                    v-if="selectedLineType === 'doctor' && isRegularMode"
                    class="inline-flex h-8 items-center gap-1.5 rounded-lg bg-indigo-600 px-3 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-50"
                    :disabled="loading"
                    @click="generateDoctorOnly"
                  ><i class="far fa-user-md text-[10px]"></i> Gen Doctor</button>
                  <!-- <button
                    v-else
                    class="inline-flex h-8 items-center gap-1.5 rounded-lg bg-blue-600 px-3 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50"
                    :disabled="loading || hasSnapshotIssue"
                    @click="openConfirm"
                  >
                    <i class="far text-[10px]" :class="loading ? 'fa-spinner fa-spin' : 'fa-check-circle'"></i>
                    Generate
                  </button> -->
                </div>
              </div>

              <!-- ③ Remarks (single-line, compact) -->
              <div class="flex items-center gap-2 px-4 py-2.5">
                <span class="flex-shrink-0 text-[10px] font-bold uppercase tracking-wider text-slate-400">Remarks</span>
                <textarea
                  v-model="form.remarks"
                  rows="1"
                  class="flex-1 resize-none rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-700 placeholder-slate-400 transition focus:border-blue-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
                  placeholder="Optional batch note..."
                ></textarea>
              </div>

              <!-- ④ Advanced options (expandable) -->
              <div v-if="advancedOpen" class="bg-slate-50/60 px-4 py-3">
                <div class="space-y-3 rounded-xl border border-slate-200 bg-white p-3">
                  <PayrollRuleSummary :mode="form.payroll_cycle" />

                  <div v-if="isRegularMode" class="grid gap-2 md:grid-cols-3">
                    <label class="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs">
                      <input v-model="form.apply_deductions" type="checkbox" disabled /> Apply deductions
                    </label>
                    <label class="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs">
                      <input v-model="form.include_bonus" type="checkbox" /> Include bonus
                    </label>
                    <label class="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs">
                      <input v-model="form.deduct_previous_advance" type="checkbox" /> Deduct previous advance
                    </label>
                  </div>

                  <div v-else-if="isHalfMode" class="grid gap-2 md:grid-cols-3">
                    <div>
                      <label class="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-500">Salary %</label>
                      <input v-model="form.salary_percentage" type="number" min="0" max="100" :class="inputCls" />
                      <p v-if="formErrors.salary_percentage" class="mt-1 text-xs text-red-500">{{ formErrors.salary_percentage }}</p>
                    </div>
                    <div>
                      <label class="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-500">Fixed Amount</label>
                      <input v-model="form.fixed_pay_amount" type="number" min="0" :class="inputCls" />
                    </div>
                    <label class="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs">
                      <input v-model="form.include_bonus" type="checkbox" /> Include bonus
                    </label>
                    <div class="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500 md:col-span-3">
                      Deductions and previous advance deduction are forced off for half-salary advance.
                    </div>
                    <template v-if="form.include_bonus">
                      <div>
                        <label class="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-500">Bonus Type</label>
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
                      <label class="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-500">Bonus Type</label>
                      <select v-model="form.bonus_type" :class="inputCls">
                        <option value="">Use approved bonus entries</option>
                        <option v-for="type in options?.bonus_types || []" :key="type.value" :value="type.value">{{ type.label }}</option>
                      </select>
                    </div>
                    <div class="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
                      Bonus source is loaded from approved bonus entries for the selected month.
                    </div>
                  </div>

                  <div v-if="isNonRegularMode">
                    <label class="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-500">Type Note</label>
                    <textarea v-model="form.note" rows="2" :class="inputCls" placeholder="Reason or internal note..."></textarea>
                  </div>
                </div>
              </div>

              <!-- ⑤ Inline banners (non-regular / error / snapshot) -->
              <div v-if="isNonRegularMode"
                class="flex items-start gap-2 bg-orange-50 px-4 py-2.5 text-xs text-orange-800">
                <i class="far fa-exclamation-triangle mt-0.5 flex-shrink-0 text-orange-500"></i>
                <span>Non-regular payroll changes employee payment timing. Review preview carefully.</span>
              </div>

              <div v-if="error"
                class="flex items-start gap-2 bg-red-50 px-4 py-2.5 text-xs text-red-700">
                <i class="fas fa-exclamation-circle mt-0.5 flex-shrink-0"></i>
                <span>{{ error }}</span>
              </div>

              <div v-if="hasSnapshotIssue" class="bg-red-50 px-4 py-3">
                <div class="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p class="text-xs font-bold text-red-800">
                      <i class="far fa-exclamation-triangle mr-1"></i>Attendance snapshot not ready
                    </p>
                    <p class="mt-0.5 text-[11px] text-red-600">
                      Recalculate snapshot for {{ form.salary_month }} before continuing.
                    </p>
                  </div>
                  <button
                    class="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
                    :disabled="snapshotRecalculating || loading"
                    @click="recalculateSnapshot"
                  >
                    <i class="far text-[10px]" :class="snapshotRecalculating ? 'fa-spinner fa-spin' : 'fa-sync'"></i>
                    Recalculate
                  </button>
                </div>
                <div class="mt-2.5 overflow-x-auto rounded-lg border border-red-100 bg-white">
                  <table class="w-full min-w-[700px] text-xs">
                    <thead class="bg-red-100 text-left uppercase text-red-800">
                      <tr>
                        <th class="px-3 py-2">#</th>
                        <th class="px-3 py-2">Employee</th>
                        <th class="px-3 py-2">Emp ID</th>
                        <th class="px-3 py-2">Department</th>
                        <th class="px-3 py-2">Line</th>
                        <th class="px-3 py-2">Issue</th>
                        <th class="px-3 py-2">Last Update</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-red-50 text-slate-700">
                      <tr v-for="(user, index) in snapshotMissingUsers" :key="user.user_id || index">
                        <td class="px-3 py-1.5 text-slate-400">{{ index + 1 }}</td>
                        <td class="px-3 py-1.5 font-semibold text-slate-900">{{ user.name || '-' }}</td>
                        <td class="px-3 py-1.5 font-mono">{{ user.employee_id || '-' }}</td>
                        <td class="px-3 py-1.5">{{ user.department || '-' }}</td>
                        <td class="px-3 py-1.5">{{ user.line_type || '-' }}</td>
                        <td class="px-3 py-1.5 text-red-700">{{ user.reason || 'Snapshot not ready.' }}</td>
                        <td class="px-3 py-1.5">{{ formatSnapshotDate(user.last_update) }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          </div>

          <!-- STEP 2 — PREVIEW PLACEHOLDER (no preview yet) ────────── -->
          <div v-if="!previewItems.length && !previewWarningSummaries.length"
            class="overflow-hidden rounded-xl border border-dashed border-slate-200 bg-white shadow-sm">
            <div class="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-5 py-3">
              <div class="flex items-center gap-3">
                <div class="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-slate-300 text-[11px] font-bold text-white">2</div>
                <div>
                  <p class="text-sm font-bold text-slate-400">Payroll Preview</p>
                  <p class="text-[11px] text-slate-400">Run preview to see calculated payroll values</p>
                </div>
              </div>
              <button
                class="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-500 shadow-sm transition hover:bg-slate-50 disabled:opacity-40"
                :disabled="loading"
                @click="handlePreview"
              >
                <i class="far text-[10px]" :class="loading ? 'fa-spinner fa-spin' : 'fa-table'"></i>
                Run Preview
              </button>
            </div>
            <div class="flex flex-col items-center justify-center gap-4 py-12 text-center">
              <!-- Skeleton rows -->
              <div class="w-full max-w-2xl space-y-2 px-6 opacity-25 pointer-events-none select-none">
                <div class="grid grid-cols-7 gap-2">
                  <div v-for="i in 7" :key="i" class="h-3.5 rounded bg-slate-200"></div>
                </div>
                <div v-for="row in 5" :key="row" class="grid grid-cols-7 gap-2">
                  <div class="h-3 rounded bg-slate-100"></div>
                  <div class="col-span-2 h-3 rounded bg-slate-100"></div>
                  <div class="h-3 rounded bg-slate-100"></div>
                  <div class="h-3 rounded bg-slate-100"></div>
                  <div class="h-3 rounded bg-slate-100"></div>
                  <div class="h-3 rounded bg-slate-100"></div>
                </div>
              </div>
              <!-- CTA -->
              <div class="flex flex-col items-center gap-3">
                <div class="flex h-12 w-12 items-center justify-center rounded-full border-2 border-dashed border-slate-200 bg-slate-50">
                  <i class="far fa-table text-lg text-slate-300"></i>
                </div>
                <div>
                  <p class="text-sm font-semibold text-slate-600">No preview generated yet</p>
                  <p class="mt-0.5 text-xs text-slate-400">Configure filters above, then click Preview<br>to calculate payroll values before generating.</p>
                </div>
                <button
                  class="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50"
                  :disabled="loading"
                  @click="handlePreview"
                >
                  <i class="far text-xs" :class="loading ? 'fa-spinner fa-spin' : 'fa-table'"></i>
                  Preview Payroll Calculation
                </button>
              </div>
            </div>
          </div>

          <!-- STEP 2 — PREVIEW TABLE (after preview runs) ─────────── -->
          <template v-if="previewItems.length || previewWarningSummaries.length">
            <div class="rounded-xl border border-slate-200 bg-white shadow-sm">
              <!-- Sticky action header -->
              <div class="sticky top-[49px] z-10 flex flex-wrap items-center justify-between gap-3 rounded-t-xl border-b border-slate-200 bg-white/95 px-5 py-2.5 backdrop-blur-sm">
                <div class="flex items-center gap-3">
                  <div class="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-emerald-600 text-[11px] font-bold text-white">2</div>
                  <div>
                    <p class="text-sm font-bold text-slate-900">Payroll Preview</p>
                    <p class="text-[11px] text-slate-400">{{ previewItems.length }} employee(s) · {{ form.salary_month }}</p>
                  </div>
                </div>
                <button
                  class="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-50"
                  :disabled="loading || hasSnapshotIssue"
                  @click="openConfirm"
                >
                  <i class="far fa-check-circle text-[11px]"></i>
                  Confirm &amp; Generate
                </button>
              </div>
              <!-- Table wrapper: overflow-hidden for rounded bottom -->
              <div class="overflow-hidden rounded-b-xl">
                <PayrollPreviewTable :items="previewItems" :mode="form.payroll_cycle" />
              </div>
            </div>

            <!-- Warnings table -->
            <div v-if="previewWarningSummaries.length" class="overflow-hidden rounded-xl border border-amber-200 bg-white shadow-sm">
              <div class="flex flex-wrap items-start justify-between gap-3 border-b border-amber-100 bg-amber-50 px-5 py-3">
                <div>
                  <p class="text-sm font-bold text-amber-900">
                    <i class="far fa-exclamation-triangle mr-1.5 text-amber-500"></i>
                    Warnings ({{ previewWarningSummaries.length }})
                  </p>
                  <p class="mt-0.5 text-xs text-amber-700">Review these employees before generating.</p>
                </div>
                <div class="flex flex-wrap gap-2">
                  <span v-for="warning in previewWarningSummaries" :key="warning.key"
                    class="rounded-full border border-amber-200 bg-white px-2.5 py-1 text-xs font-semibold text-amber-800">
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
                      <td class="px-4 py-3 text-slate-400">{{ index + 1 }}</td>
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
          </template>

          </div><!-- /left column -->

          <!-- ══ RIGHT SIDEBAR ══════════════════════════════════════════ -->
          <aside class="space-y-3 xl:sticky xl:top-[53px] xl:self-start">

            <!-- Readiness panel -->
            <div class="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div class="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-2.5">
                <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Readiness Check</p>
                <i v-if="pendingCountsLoading" class="far fa-spinner fa-spin text-[10px] text-slate-400"></i>
              </div>

              <div class="divide-y divide-slate-50">

                <!-- 1. Employees scope -->
                <div class="flex items-start gap-3 px-4 py-3">
                  <div class="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full"
                    :class="(regularEmployees.length + doctorEmployees.length) > 0 ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-500'">
                    <i class="far text-[9px]"
                      :class="(regularEmployees.length + doctorEmployees.length) > 0 ? 'fa-check' : 'fa-exclamation'"></i>
                  </div>
                  <div class="min-w-0 flex-1">
                    <div class="text-xs font-semibold text-slate-700">Employees</div>
                    <div class="text-[11px]"
                      :class="(regularEmployees.length + doctorEmployees.length) > 0 ? 'text-slate-500' : 'text-amber-600'">
                      <template v-if="(regularEmployees.length + doctorEmployees.length) > 0">
                        {{ regularEmployees.length }} regular
                        <template v-if="doctorEmployees.length > 0"> · {{ doctorEmployees.length }} doctor</template>
                      </template>
                      <span v-else>None selected — choose a company</span>
                    </div>
                  </div>
                </div>

                <!-- 2. Salary month -->
                <div class="flex items-start gap-3 px-4 py-3">
                  <div class="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full"
                    :class="form.salary_month ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'">
                    <i class="far text-[9px]" :class="form.salary_month ? 'fa-check' : 'fa-times'"></i>
                  </div>
                  <div class="min-w-0 flex-1">
                    <div class="text-xs font-semibold text-slate-700">Salary Month</div>
                    <div class="text-[11px]" :class="form.salary_month ? 'text-slate-500' : 'text-red-600'">
                      {{ form.salary_month || 'Not selected' }}
                    </div>
                  </div>
                </div>

                <!-- 3. Attendance Snapshot -->
                <div class="flex items-start gap-3 px-4 py-3">
                  <div class="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full"
                    :class="hasSnapshotIssue ? 'bg-red-100 text-red-600' : previewItems.length > 0 ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'">
                    <i class="far text-[9px]"
                      :class="hasSnapshotIssue ? 'fa-times' : previewItems.length > 0 ? 'fa-check' : 'fa-question'"></i>
                  </div>
                  <div class="min-w-0 flex-1">
                    <div class="text-xs font-semibold text-slate-700">Attendance Snapshot</div>
                    <div class="text-[11px]"
                      :class="hasSnapshotIssue ? 'text-red-600' : previewItems.length > 0 ? 'text-emerald-600' : 'text-slate-400'">
                      <template v-if="hasSnapshotIssue">{{ snapshotMissingUsers.length }} employee(s) not ready</template>
                      <template v-else-if="previewItems.length > 0">Ready</template>
                      <template v-else>Run preview to verify</template>
                    </div>
                  </div>
                </div>

                <!-- 4. Salary Structures (post-preview) -->
                <div v-if="previewWarningSummaries.some(w => w.key === 'missing_salary_structure')" class="flex items-start gap-3 px-4 py-3">
                  <div class="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600">
                    <i class="far fa-times text-[9px]"></i>
                  </div>
                  <div class="min-w-0 flex-1">
                    <div class="text-xs font-semibold text-slate-700">Salary Structures</div>
                    <div class="text-[11px] text-red-600">
                      {{ previewWarningSummaries.find(w => w.key === 'missing_salary_structure')?.message }}
                    </div>
                  </div>
                </div>
                <div v-else-if="previewItems.length > 0" class="flex items-start gap-3 px-4 py-3">
                  <div class="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                    <i class="far fa-check text-[9px]"></i>
                  </div>
                  <div class="min-w-0 flex-1">
                    <div class="text-xs font-semibold text-slate-700">Salary Structures</div>
                    <div class="text-[11px] text-emerald-600">All employees have active structures</div>
                  </div>
                </div>

                <!-- 5. Arrear Entries (regular only) -->
                <template v-if="isRegularMode && form.salary_month">
                  <RouterLink
                    :to="{ name: 'PayrollArrearEntryList', query: { salary_month: form.salary_month, status: 'pending', ...(form.company_id ? { company_id: form.company_id } : {}) }}"
                    class="flex items-start gap-3 px-4 py-3 transition hover:bg-emerald-50/50"
                  >
                    <div class="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full"
                      :class="pendingCountsLoading ? 'bg-slate-100 text-slate-400' : pendingArrearCount > 0 ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'">
                      <i class="far text-[9px]"
                        :class="pendingCountsLoading ? 'fa-spinner fa-spin' : pendingArrearCount > 0 ? 'fa-coins' : 'fa-check'"></i>
                    </div>
                    <div class="min-w-0 flex-1">
                      <div class="flex items-center gap-1 text-xs font-semibold text-slate-700">
                        Arrear Entries <i class="far fa-external-link text-[9px] text-slate-300"></i>
                      </div>
                      <div class="text-[11px]"
                        :class="pendingArrearCount > 0 ? 'font-semibold text-emerald-600' : 'text-slate-400'">
                        <template v-if="pendingCountsLoading">Checking...</template>
                        <template v-else-if="pendingArrearCount > 0">{{ pendingArrearCount }} pending → will be added</template>
                        <template v-else>None pending for this month</template>
                      </div>
                    </div>
                    <i class="far fa-chevron-right mt-1 flex-shrink-0 text-[9px] text-slate-300"></i>
                  </RouterLink>
                </template>

                <!-- 6. Advance Deductions (regular only) -->
                <template v-if="isRegularMode && form.salary_month">
                  <RouterLink
                    :to="{ name: 'PayrollAdvanceDeductionList', query: { carry_on_month: form.salary_month, status: 'pending', ...(form.company_id ? { company_id: form.company_id } : {}) }}"
                    class="flex items-start gap-3 px-4 py-3 transition hover:bg-rose-50/50"
                  >
                    <div class="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full"
                      :class="pendingCountsLoading ? 'bg-slate-100 text-slate-400' : pendingAdvanceCount > 0 ? 'bg-rose-100 text-rose-600' : 'bg-slate-100 text-slate-400'">
                      <i class="far text-[9px]"
                        :class="pendingCountsLoading ? 'fa-spinner fa-spin' : pendingAdvanceCount > 0 ? 'fa-minus-circle' : 'fa-check'"></i>
                    </div>
                    <div class="min-w-0 flex-1">
                      <div class="flex items-center gap-1 text-xs font-semibold text-slate-700">
                        Advance Deductions <i class="far fa-external-link text-[9px] text-slate-300"></i>
                      </div>
                      <div class="text-[11px]"
                        :class="pendingAdvanceCount > 0 ? 'font-semibold text-rose-600' : 'text-slate-400'">
                        <template v-if="pendingCountsLoading">Checking...</template>
                        <template v-else-if="pendingAdvanceCount > 0">{{ pendingAdvanceCount }} pending → will be deducted</template>
                        <template v-else>None pending for this month</template>
                      </div>
                    </div>
                    <i class="far fa-chevron-right mt-1 flex-shrink-0 text-[9px] text-slate-300"></i>
                  </RouterLink>
                </template>

                <!-- 7. Bonus entries (when include_bonus) -->
                <template v-if="form.include_bonus && form.salary_month">
                  <div class="flex items-start gap-3 px-4 py-3">
                    <div class="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full"
                      :class="previewWarningSummaries.some(w => w.key === 'missing_bonus') ? 'bg-amber-100 text-amber-600' : previewItems.length > 0 ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'">
                      <i class="far text-[9px]"
                        :class="previewWarningSummaries.some(w => w.key === 'missing_bonus') ? 'fa-exclamation' : previewItems.length > 0 ? 'fa-check' : 'fa-question'"></i>
                    </div>
                    <div class="min-w-0 flex-1">
                      <div class="text-xs font-semibold text-slate-700">Bonus Entries</div>
                      <div class="text-[11px]"
                        :class="previewWarningSummaries.some(w => w.key === 'missing_bonus') ? 'text-amber-700' : previewItems.length > 0 ? 'text-emerald-600' : 'text-slate-400'">
                        <template v-if="previewWarningSummaries.some(w => w.key === 'missing_bonus')">
                          {{ previewWarningSummaries.find(w => w.key === 'missing_bonus')?.message }}
                        </template>
                        <template v-else-if="previewItems.length > 0">OK</template>
                        <template v-else>Run preview to verify</template>
                      </div>
                    </div>
                  </div>
                </template>

                <!-- 8. Already generated payrolls (post-preview) -->
                <div v-if="previewWarningSummaries.some(w => w.key === 'skipped_payroll')" class="flex items-start gap-3 px-4 py-3">
                  <div class="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                    <i class="far fa-forward text-[9px]"></i>
                  </div>
                  <div class="min-w-0 flex-1">
                    <div class="text-xs font-semibold text-slate-700">Already Generated</div>
                    <div class="text-[11px] text-amber-700">
                      {{ previewWarningSummaries.find(w => w.key === 'skipped_payroll')?.message }}
                    </div>
                  </div>
                </div>

              </div>

              <div class="border-t border-slate-100 bg-slate-50 px-4 py-2 text-[10px] text-slate-400">
                <i class="far fa-info-circle mr-1"></i>
                Pending entries for <strong>{{ form.salary_month || 'selected month' }}</strong> auto-apply on generate.
              </div>
            </div>

            <!-- Preview summary card (shows after preview) -->
            <div v-if="previewItems.length" class="overflow-hidden rounded-xl border border-blue-200 bg-white shadow-sm">
              <div class="border-b border-blue-100 bg-blue-50 px-4 py-2.5">
                <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-600">Preview Summary</p>
              </div>
              <div class="divide-y divide-slate-50">
                <div class="flex items-center justify-between px-4 py-2.5">
                  <span class="text-xs text-slate-500">Employees</span>
                  <span class="text-xs font-bold text-slate-900">{{ previewItems.length }}</span>
                </div>
                <div class="flex items-center justify-between px-4 py-2.5">
                  <span class="text-xs text-slate-500">Base Payable</span>
                  <span class="font-mono text-xs font-semibold text-slate-700">{{ formatCurrency(previewTotals.base) }}</span>
                </div>
                <div v-if="isRegularMode && previewTotals.arrear > 0" class="flex items-center justify-between px-4 py-2.5">
                  <span class="text-xs text-slate-500">Arrears Added</span>
                  <span class="font-mono text-xs font-semibold text-emerald-600">+{{ formatCurrency(previewTotals.arrear) }}</span>
                </div>
                <div v-if="isRegularMode && previewTotals.advance_deduction > 0" class="flex items-center justify-between px-4 py-2.5">
                  <span class="text-xs text-slate-500">Adv. Deducted</span>
                  <span class="font-mono text-xs font-semibold text-rose-600">−{{ formatCurrency(previewTotals.advance_deduction) }}</span>
                </div>
                <div class="flex items-center justify-between px-4 py-2.5">
                  <span class="text-xs text-slate-500">Total Deductions</span>
                  <span class="font-mono text-xs font-semibold text-rose-700">−{{ formatCurrency(previewTotals.deductions) }}</span>
                </div>
                <div class="flex items-center justify-between bg-blue-50 px-4 py-3">
                  <span class="text-xs font-bold text-blue-700">Net Payable</span>
                  <span class="font-mono text-sm font-bold text-blue-800">{{ formatCurrency(previewTotals.net) }}</span>
                </div>
              </div>
            </div>

          </aside>
        </div>

      </template>

      <!-- ══ SUCCESS STATE ════════════════════════════════════════════════ -->
      <template v-else>
        <div class="space-y-4">
          <div class="overflow-hidden rounded-xl border border-emerald-200 bg-emerald-50 shadow-sm">
            <div class="flex flex-wrap items-center gap-4 p-5">
              <div class="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm">
                <i class="fas fa-check-circle text-2xl"></i>
              </div>
              <div class="flex-1">
                <p class="text-base font-bold text-emerald-900">Payroll Generated Successfully</p>
                <p class="text-sm text-emerald-700">
                  <span v-if="generatedBatch">Batch #{{ generatedBatch.id }} · {{ generatedBatch.salary_month }}</span>
                  <span v-else>Review the generated payrolls below.</span>
                </p>
              </div>
              <div class="flex flex-wrap gap-2">
                <button
                  class="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:opacity-50"
                  :disabled="!generatedBatch?.id"
                  @click="goToBatch"
                ><i class="far fa-eye text-[11px]"></i> View Batch</button>
                <button
                  class="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-white px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50"
                  @click="resetGeneration"
                ><i class="far fa-plus text-[11px]"></i> Generate Another</button>
              </div>
            </div>
          </div>

          <div v-if="generatedPayrolls.length" class="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div class="border-b border-slate-100 bg-slate-50 px-5 py-3">
              <p class="text-sm font-bold text-slate-900">
                Generated Payrolls
                <span class="ml-1.5 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">{{ generatedPayrolls.length }}</span>
              </p>
            </div>
            <div class="overflow-x-auto">
              <table class="w-full min-w-[720px] text-sm">
                <thead class="bg-blue-50 text-xs uppercase text-blue-900">
                  <tr>
                    <th class="px-4 py-3 text-left">Employee</th>
                    <th class="px-4 py-3 text-right">Gross</th>
                    <th class="px-4 py-3 text-right">Deductions</th>
                    <th class="px-4 py-3 text-right">Net Salary</th>
                    <th class="px-4 py-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-50">
                  <tr v-for="(p, index) in generatedPayrolls" :key="`${p.id}-${index}`" class="hover:bg-slate-50">
                    <td class="px-4 py-3">
                      <div class="font-semibold text-slate-900">{{ p.user?.name || p.employee_name }}</div>
                      <div class="text-xs text-slate-400">{{ p.user?.employee_id || p.employee_code }}</div>
                    </td>
                    <td class="px-4 py-3 text-right font-mono">{{ formatCurrency(p.gross_salary) }}</td>
                    <td class="px-4 py-3 text-right font-mono text-rose-600">{{ formatCurrency(p.total_deduction) }}</td>
                    <td class="px-4 py-3 text-right font-mono font-bold text-emerald-700">{{ formatCurrency(p.net_salary ?? p.net_payable) }}</td>
                    <td class="px-4 py-3 text-center"><PayrollStatusBadge :status="p.payment_status || p.status" /></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div v-if="skippedPayrolls.length || missingSalaryStructures.length"
            class="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            <p class="font-bold"><i class="far fa-exclamation-triangle mr-1.5"></i>Warnings</p>
            <p v-if="skippedPayrolls.length" class="mt-1.5">
              <i class="far fa-forward mr-1"></i> {{ skippedPayrolls.length }} payroll(s) skipped (already generated)
            </p>
            <p v-if="missingSalaryStructures.length" class="mt-1">
              <i class="far fa-exclamation-triangle mr-1"></i> {{ missingSalaryStructures.length }} employee(s) missing salary structure
            </p>
          </div>
        </div>
      </template>

    </div>

    <!-- ══ CONFIRM MODAL ═════════════════════════════════════════════════ -->
    <div v-if="confirmOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
      <div class="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
        <!-- Modal header -->
        <div class="flex items-start justify-between border-b border-slate-100 bg-gradient-to-r from-blue-50 to-white px-5 py-4">
          <div>
            <h2 class="text-base font-bold text-slate-900">Confirm Payroll Generation</h2>
            <p class="mt-0.5 text-xs text-slate-500">Review the summary before creating payroll records.</p>
          </div>
          <button
            class="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-50"
            @click="confirmOpen = false"
          ><i class="far fa-times text-xs"></i></button>
        </div>

        <div class="space-y-3 p-5">
          <!-- Key info -->
          <div class="grid grid-cols-3 gap-2">
            <div class="rounded-lg border border-slate-100 bg-slate-50 p-3">
              <p class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Type</p>
              <p class="mt-1 text-xs font-bold text-slate-800">{{ modeLabel }}</p>
            </div>
            <div class="rounded-lg border border-slate-100 bg-slate-50 p-3">
              <p class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Month</p>
              <p class="mt-1 text-xs font-bold text-slate-800">{{ form.salary_month || '-' }}</p>
            </div>
            <div class="rounded-lg border border-slate-100 bg-slate-50 p-3">
              <p class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Employees</p>
              <p class="mt-1 text-xs font-bold text-slate-800">{{ previewItems.length }}</p>
            </div>
          </div>

          <!-- Financials breakdown -->
          <div class="overflow-hidden rounded-xl border border-slate-200">
            <div class="divide-y divide-slate-100">
              <div class="flex items-center justify-between px-4 py-2.5">
                <span class="text-xs text-slate-500">{{ isHalfMode ? 'Salary Advance' : 'Base Payable' }}</span>
                <span class="font-mono text-xs font-semibold text-slate-800">{{ formatCurrency(previewTotals.base) }}</span>
              </div>
              <div v-if="isRegularMode && previewTotals.arrear > 0" class="flex items-center justify-between bg-emerald-50/40 px-4 py-2.5">
                <span class="text-xs text-slate-500">Arrears (added)</span>
                <span class="font-mono text-xs font-semibold text-emerald-600">+{{ formatCurrency(previewTotals.arrear) }}</span>
              </div>
              <div class="flex items-center justify-between px-4 py-2.5">
                <span class="text-xs text-slate-500">Total Bonus</span>
                <span class="font-mono text-xs font-semibold text-slate-700">{{ formatCurrency(previewTotals.bonus) }}</span>
              </div>
              <div class="flex items-center justify-between px-4 py-2.5">
                <span class="text-xs text-slate-500">Total Deductions</span>
                <span class="font-mono text-xs font-semibold text-rose-700">−{{ formatCurrency(previewTotals.deductions) }}</span>
              </div>
              <div v-if="isRegularMode && previewTotals.advance_deduction > 0"
                class="flex items-center justify-between bg-rose-50/30 px-4 py-2.5">
                <span class="text-xs text-slate-400">↳ incl. Advance Deductions</span>
                <span class="font-mono text-xs font-semibold text-rose-500">{{ formatCurrency(previewTotals.advance_deduction) }}</span>
              </div>
              <div class="flex items-center justify-between px-4 py-2.5">
                <span class="text-xs text-slate-500">{{ isHalfMode ? 'Month-end Adjustable' : 'Prev. Advance Adj.' }}</span>
                <span class="font-mono text-xs font-semibold text-amber-700">{{ formatCurrency(previewTotals.advance) }}</span>
              </div>
              <div v-if="isHalfMode" class="flex items-center justify-between px-4 py-2.5">
                <span class="text-xs text-slate-500">Non-adjustable Bonus</span>
                <span class="font-mono text-xs font-semibold text-emerald-600">{{ formatCurrency(previewTotals.nonAdjustableBonus) }}</span>
              </div>
              <div class="flex items-center justify-between bg-blue-50 px-4 py-3">
                <span class="text-sm font-bold text-blue-800">Total Net Payable</span>
                <span class="font-mono text-base font-bold text-blue-800">{{ formatCurrency(previewTotals.net) }}</span>
              </div>
            </div>
          </div>

          <!-- Warnings -->
          <div v-if="isNonRegularMode || previewWarningSummaries.length"
            class="rounded-xl border border-orange-200 bg-orange-50 p-3 text-xs text-orange-800">
            <p class="font-bold"><i class="far fa-exclamation-triangle mr-1"></i>Important</p>
            <div class="mt-1.5"><PayrollRuleSummary :mode="form.payroll_cycle" /></div>
            <ul v-if="previewWarningSummaries.length" class="mt-2 list-disc space-y-0.5 pl-5">
              <li v-for="warning in previewWarningSummaries" :key="warning.key">{{ warning.message }}</li>
            </ul>
          </div>
        </div>

        <!-- Modal footer -->
        <div class="flex justify-end gap-2 border-t border-slate-100 bg-slate-50 px-5 py-3">
          <button
            class="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
            @click="confirmOpen = false"
          >Cancel</button>
          <button
            class="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50"
            :disabled="loading || hasSnapshotIssue"
            @click="handleGenerate"
          >
            <i class="far text-[11px]" :class="loading ? 'fa-spinner fa-spin' : 'fa-check'"></i>
            Generate Payroll
          </button>
        </div>
      </div>
    </div>

  </div>
</template>
