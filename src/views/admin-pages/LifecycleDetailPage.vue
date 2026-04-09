<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ChecklistTable from '@/components/ChecklistTable.vue'
import LifecycleStageEditor from '@/components/lifecycle/LifecycleStageEditor.vue'
import { useChecklistStore } from '@/stores/checklist'
import { useLifecycleStore } from '@/stores/lifecycle'

const route = useRoute()
const router = useRouter()
const lifecycleStore = useLifecycleStore()
const checklistStore = useChecklistStore()

const flowType = computed(() => (route.params.flowType === 'offboarding' ? 'offboarding' : 'onboarding'))
const userId = computed(() => Number(route.params.userId))

const lifecycle = computed(() => lifecycleStore.currentRecord?.lifecycle || null)
const employee = computed(() => lifecycleStore.currentRecord?.employee || null)
const checklist = computed(() => lifecycleStore.currentRecord?.checklist || null)
const template = computed(() => lifecycleStore.currentRecord?.template || null)
const stages = computed(() => lifecycleStore.currentRecord?.stages || [])
const activeStageCode = ref(null)

function formatDateLabel(value) {
  if (!value) return ''

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function addMonthsToIsoDate(value, monthsToAdd) {
  if (!value) return ''

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  const months = Number(monthsToAdd) || 0
  const target = new Date(date)
  target.setMonth(target.getMonth() + months)

  if (target.getDate() !== date.getDate()) {
    target.setDate(0)
  }

  return target.toISOString().slice(0, 10)
}

const STAGE_DEFINITIONS = {
  onboarding: {
    pre_boarding: {
      title: 'Pre-Boarding',
      description: 'Capture candidate approvals, salary proposal, and joining prerequisites before the standard joining checklist starts.',
      fields: [
        { key: 'cv_submitted', label: 'CV Submitted', type: 'checkbox' },
        { key: 'exam_result', label: 'Exam Result / Evaluation', type: 'text', placeholder: 'Passed / score / evaluator note' },
        { key: 'recommendation', label: 'Recommendation', type: 'textarea', placeholder: 'Recommendation summary or committee note' },
        { key: 'offer_letter_attachment', label: 'Offer / Appointment Letter', type: 'file', accept: '.pdf,.jpg,.jpeg,.png,.doc,.docx' },
        { key: 'joining_conditions', label: 'Joining Conditions', type: 'textarea', placeholder: 'Mention any conditions to be fulfilled before joining' },
        { key: 'proposed_salary', label: 'Proposed Salary', type: 'number', placeholder: '0' },
        { key: 'salary_at_joining', label: 'Salary At Joining', type: 'number', placeholder: '0' },
        { key: 'candidate_approval', label: 'Candidate Approval', type: 'select', options: [
          { value: 'pending', label: 'Pending' },
          { value: 'approved', label: 'Approved' },
          { value: 'rejected', label: 'Rejected' },
        ] },
      ],
    },
    training: {
      title: 'Training',
      description: 'Track resource setup, orientation, and initial training items without affecting the existing checklist module.',
      fields: [
        { key: 'basic_training_status', label: 'Basic Training', type: 'select', options: [
          { value: 'assigned', label: 'Assigned' },
          { value: 'completed', label: 'Completed' },
        ] },
        { key: 'technical_training_status', label: 'Technical Training', type: 'select', options: [
          { value: 'assigned', label: 'Assigned' },
          { value: 'completed', label: 'Completed' },
        ] },
        { key: 'advanced_training_status', label: 'Advanced Training', type: 'select', options: [
          { value: 'assigned', label: 'Assigned' },
          { value: 'completed', label: 'Completed' },
        ] },
        { key: 'supervisor_id', label: 'Supervisor Assigned', type: 'user_select' },
        { key: 'orientation_complete', label: 'Department Orientation Complete', type: 'checkbox' },
        { key: 'training_materials_attachment', label: 'Training Materials', type: 'file' },
      ],
    },
    probation: {
      title: 'Probation Tracking',
      description: 'Track probation reviews against the employee master setup without duplicating the base configuration.',
      fields: [
        { key: 'probation_start_date', label: 'Probation Start Date', type: 'date', readonly: true },
        { key: 'probation_end_date', label: 'Probation End Date', type: 'date', readonly: true },
        { key: 'review_30_status', label: '30 Day Review', type: 'select', options: [
          { value: 'pending', label: 'Pending' },
          { value: 'completed', label: 'Completed' },
        ] },
        { key: 'review_60_status', label: '60 Day Review', type: 'select', options: [
          { value: 'pending', label: 'Pending' },
          { value: 'completed', label: 'Completed' },
        ] },
        { key: 'final_review_status', label: 'Final Review', type: 'select', options: [
          { value: 'pending', label: 'Pending' },
          { value: 'completed', label: 'Completed' },
        ] },
        { key: 'recommendation', label: 'Recommendation', type: 'select', options: [
          { value: 'confirm', label: 'Confirm' },
          { value: 'extend_probation', label: 'Extend Probation' },
          { value: 'terminate', label: 'Terminate' },
        ] },
        { key: 'assessment_form_attachment', label: 'Assessment Form', type: 'file' },
        { key: 'supervisor_remarks', label: 'Supervisor Remarks', type: 'textarea', placeholder: 'Supervisor observation' },
        { key: 'hr_remarks', label: 'HR Remarks', type: 'textarea', placeholder: 'HR observation' },
      ],
    },
    confirmation: {
      title: 'Confirmation',
      description: 'Finalize regularization or extension using the probation outcome.',
      fields: [
        { key: 'decision', label: 'Decision', type: 'select', options: [
          { value: 'confirmed', label: 'Confirm Employee' },
          { value: 'extend_probation', label: 'Extend Probation' },
          { value: 'needs_improvement', label: 'Needs Improvement' },
          { value: 'terminated', label: 'Terminate Employment' },
        ] },
        { key: 'effective_date', label: 'Effective Date', type: 'date' },
        { key: 'decision_attachment', label: 'Confirmation / Regularization Form', type: 'file' },
        { key: 'decision_notes', label: 'Decision Notes', type: 'textarea', placeholder: 'Approval or decision summary' },
      ],
    },
  },
  offboarding: {
    exit_request: {
      title: 'Exit Request',
      description: 'Capture the resignation or termination request before the clearance checklist begins.',
      fields: [
        { key: 'request_type', label: 'Request Type', type: 'select', options: [
          { value: 'resignation', label: 'Resignation' },
          { value: 'termination', label: 'Termination' },
        ] },
        { key: 'resignation_letter_attachment', label: 'Resignation Letter', type: 'file' },
        { key: 'termination_note', label: 'Termination Note', type: 'textarea', placeholder: 'Termination context if applicable' },
        { key: 'last_working_date', label: 'Last Working Date', type: 'date' },
        { key: 'notice_period_days', label: 'Notice Period (Days)', type: 'number', placeholder: '0' },
        { key: 'exit_reason', label: 'Exit Reason', type: 'textarea', placeholder: 'Reason for leaving' },
        { key: 'approval_status', label: 'Approval Status', type: 'select', options: [
          { value: 'pending', label: 'Pending' },
          { value: 'approved', label: 'Approved' },
          { value: 'rejected', label: 'Rejected' },
        ] },
      ],
    },
    handover_in_progress: {
      title: 'Handover',
      description: 'Track handover responsibilities and the receiving employee before final closure.',
      fields: [
        { key: 'handover_to_employee', label: 'Handover To', type: 'text', placeholder: 'Employee name / ID' },
        { key: 'handover_summary', label: 'Handover Items / Tasks', type: 'textarea', placeholder: 'List major tasks or assets handed over' },
        { key: 'handover_attachment', label: 'Handover Attachment', type: 'file' },
        { key: 'handover_completed', label: 'Handover Completed', type: 'checkbox' },
      ],
    },
    exit_interview: {
      title: 'Exit Interview',
      description: 'Store employee feedback, manager observations, and sign-off details.',
      fields: [
        { key: 'reason_for_leaving', label: 'Reason For Leaving', type: 'textarea', placeholder: 'Employee reason for leaving' },
        { key: 'employee_feedback', label: 'Employee Feedback', type: 'textarea', placeholder: 'Employee feedback' },
        { key: 'manager_feedback', label: 'Manager Feedback', type: 'textarea', placeholder: 'Manager feedback' },
        { key: 'improvement_suggestions', label: 'Improvement Suggestions', type: 'textarea', placeholder: 'Suggestions from employee or HR' },
        { key: 'sign_off', label: 'Sign-Off', type: 'select', options: [
          { value: 'pending', label: 'Pending' },
          { value: 'signed', label: 'Signed' },
        ] },
      ],
    },
    settlement_pending: {
      title: 'Final Settlement',
      description: 'Maintain the settlement calculation and approval state before closing the exit.',
      fields: [
        { key: 'due_salary', label: 'Due Salary', type: 'number', placeholder: '0' },
        { key: 'leave_adjustment', label: 'Leave Adjustment', type: 'number', placeholder: '0' },
        { key: 'deduction', label: 'Deduction', type: 'number', placeholder: '0' },
        { key: 'bonus', label: 'Bonus', type: 'number', placeholder: '0' },
        { key: 'asset_penalty', label: 'Asset Penalty', type: 'number', placeholder: '0' },
        { key: 'payable_amount', label: 'Payable Amount', type: 'number', placeholder: '0' },
        { key: 'settlement_status', label: 'Settlement Status', type: 'select', options: [
          { value: 'pending', label: 'Pending' },
          { value: 'approved', label: 'Approved' },
          { value: 'paid', label: 'Paid' },
        ] },
      ],
    },
  },
}

async function load() {
  lifecycleStore.setFlowType(flowType.value)
  await lifecycleStore.fetchDetail(userId.value, flowType.value)

  if (checklist.value?.id) {
    await checklistStore.fetchChecklist(userId.value, checklist.value.id)
    return
  }

  checklistStore.reset()
}

watch([flowType, userId], load, { immediate: true })
watch(
  stages,
  (value) => {
    const requested = String(route.query.stage || '')
    const allowed = value.map((item) => item.code)
    const fallback = value.find((item) => item.status === 'current')?.code || value[0]?.code || null
    activeStageCode.value = allowed.includes(requested) ? requested : fallback
  },
  { immediate: true },
)

watch(activeStageCode, (value) => {
  if (!value) return
  router.replace({ query: { ...route.query, stage: value } })
})

function stageTone(status) {
  if (status === 'done') return 'border-emerald-200 bg-emerald-50 text-emerald-700'
  if (status === 'current') return 'border-blue-200 bg-blue-50 text-blue-700'
  return 'border-gray-200 bg-gray-50 text-gray-500'
}

const activeStage = computed(() => stages.value.find((item) => item.code === activeStageCode.value) || stages.value[0] || null)
const activeDefinition = computed(() => STAGE_DEFINITIONS[flowType.value]?.[activeStageCode.value] || null)
const isChecklistStage = computed(() => activeStageCode.value === 'joining' || activeStageCode.value === 'clearance_in_progress')
const isStageEditorVisible = computed(() => !!activeStage.value && !isChecklistStage.value && !!activeDefinition.value)
const probationSummaryItems = computed(() => {
  const currentEmployee = employee.value || {}
  const baseMonths = Number(currentEmployee.provisional_month) || 0
  const extendedMonths = Number(currentEmployee.extended_provisional_month) || 0
  const totalMonths = Number(currentEmployee.probation_months_total) || (baseMonths + extendedMonths)
  const calculatedEndDate = addMonthsToIsoDate(currentEmployee.joining_date, totalMonths)

  return [
    { label: 'Employment Type', value: currentEmployee.employment_type || 'N/A' },
    { label: 'Joining Date', value: formatDateLabel(currentEmployee.joining_date) || 'N/A' },
    { label: 'Base Probation', value: `${baseMonths} month${baseMonths === 1 ? '' : 's'}` },
    { label: 'Extended Probation', value: `${extendedMonths} month${extendedMonths === 1 ? '' : 's'}` },
    { label: 'Total Probation', value: `${totalMonths} month${totalMonths === 1 ? '' : 's'}` },
    { label: 'Calculated End Date', value: formatDateLabel(calculatedEndDate) || 'N/A' },
  ]
})
const probationDefaultPayload = computed(() => {
  const currentEmployee = employee.value || {}
  const totalMonths = Number(currentEmployee.probation_months_total)
    || (Number(currentEmployee.provisional_month) || 0) + (Number(currentEmployee.extended_provisional_month) || 0)

  return {
    probation_start_date: currentEmployee.joining_date || '',
    probation_end_date: addMonthsToIsoDate(currentEmployee.joining_date, totalMonths),
  }
})

function openChecklistPage() {
  if (checklist.value?.id) {
    router.push({
      name: 'checklist.show',
      params: {
        userId: userId.value,
        checklistId: checklist.value.id,
      },
    })
    return
  }

  if (template.value?.id) {
    router.push({
      name: 'checklist.create',
      params: {
        userId: userId.value,
        templateId: template.value.id,
      },
    })
  }
}

const currentStageLabel = computed(() => {
  const row = stages.value.find((item) => item.code === lifecycle.value?.current_stage)
  return row?.label || 'Not started'
})

const checklistSectionTitle = computed(() =>
  flowType.value === 'onboarding' ? 'Joining Checklist Phase' : 'Exit Checklist / Clearance Phase',
)
</script>

<template>
  <div class="space-y-6 p-6">
    <div class="rounded-2xl border bg-white shadow-sm">
      <div class="border-b bg-gradient-to-r from-slate-50 via-white to-slate-50 px-6 py-5">
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div class="text-xs uppercase tracking-wide text-gray-500">{{ lifecycleStore.flowLabel }}</div>
            <h1 class="text-2xl font-semibold">{{ employee?.name || 'Lifecycle Detail' }}</h1>
            <div class="mt-1 text-sm text-gray-500">
              <span>{{ employee?.employee_id || 'No employee ID' }}</span>
              <span class="mx-2">•</span>
              <span>{{ employee?.department?.name || 'No department' }}</span>
              <span class="mx-2">•</span>
              <span>{{ employee?.designation?.title || 'No designation' }}</span>
            </div>
          </div>

          <div class="min-w-[240px]">
            <div class="mb-2 flex items-center justify-between text-sm text-gray-600">
              <span>{{ currentStageLabel }}</span>
              <span>{{ lifecycle?.overall_progress || 0 }}%</span>
            </div>
            <div class="h-3 overflow-hidden rounded-full bg-gray-200">
              <div
                class="h-3 rounded-full bg-gradient-to-r from-emerald-500 to-indigo-500"
                :style="{ width: `${lifecycle?.overall_progress || 0}%` }"
              />
            </div>
          </div>
        </div>
      </div>

      <div class="px-6 py-5">
        <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <div
            v-for="stage in stages"
            :key="stage.code"
            class="rounded-xl border p-3"
            :class="stageTone(stage.status)"
          >
            <div class="text-xs uppercase tracking-wide">{{ stage.status }}</div>
            <div class="mt-1 font-medium">{{ stage.label }}</div>
          </div>
        </div>
      </div>
    </div>

    <div class="grid gap-6 xl:grid-cols-[2fr,1fr]">
      <section class="rounded-2xl border bg-white shadow-sm">
        <div class="flex flex-wrap items-center justify-between gap-3 border-b px-6 py-4">
          <div>
            <h2 class="text-lg font-semibold">Lifecycle Stages</h2>
            <p class="text-sm text-gray-500">Follow the structure you shared: stage-by-stage under onboarding and offboarding.</p>
          </div>
        </div>

        <div class="px-6 py-5">
          <div class="mb-6 flex flex-wrap gap-3">
            <button
              v-for="stage in stages"
              :key="stage.code"
              type="button"
              class="rounded-xl border px-4 py-3 text-left transition"
              :class="[
                stageTone(stage.status),
                activeStageCode === stage.code ? 'ring-2 ring-blue-200' : 'hover:border-gray-300'
              ]"
              @click="activeStageCode = stage.code"
            >
              <div class="text-xs uppercase tracking-wide">{{ stage.status }}</div>
              <div class="mt-1 font-medium">{{ stage.label }}</div>
            </button>
          </div>

          <div v-if="lifecycleStore.detailLoading || checklistStore.loading" class="text-gray-600">Loading...</div>
          <div v-else-if="lifecycleStore.detailError || checklistStore.error" class="text-red-600">Failed to load lifecycle detail.</div>

          <div v-else-if="isChecklistStage">
            <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 class="text-lg font-semibold">{{ checklistSectionTitle }}</h2>
                <p class="text-sm text-gray-500">
                  Existing attachment, comment, status, checked by, and checked at behavior is reused here.
                </p>
              </div>

              <button
                class="rounded-md bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-black"
                @click="openChecklistPage"
              >
                {{ checklist?.id ? 'Open Full Checklist View' : 'Start Checklist' }}
              </button>
            </div>

            <ChecklistTable v-if="checklistStore.checklist" :items="checklistStore.items" />
            <div v-else class="rounded-xl border border-dashed bg-gray-50 p-6 text-sm text-gray-600">
              Checklist is not created yet. Start the checklist from this page when you are ready to move from the current lifecycle stage.
            </div>
          </div>

          <LifecycleStageEditor
            v-else-if="isStageEditorVisible"
            :lifecycle-id="lifecycle?.id"
            :stage="activeStage"
            :definition="activeDefinition"
            :summary-items="activeStageCode === 'probation' ? probationSummaryItems : []"
            :default-payload="activeStageCode === 'probation' ? probationDefaultPayload : {}"
          />

          <div v-else class="rounded-xl border border-dashed bg-gray-50 p-6 text-sm text-gray-600">
            This stage is part of the lifecycle structure, but its detailed form is not configured yet.
          </div>
        </div>
      </section>

      <aside class="space-y-6">
        <section class="rounded-2xl border bg-white shadow-sm">
          <div class="border-b px-6 py-4">
            <h2 class="text-lg font-semibold">Checklist Summary</h2>
          </div>
          <div class="space-y-3 px-6 py-5 text-sm">
            <div class="flex items-center justify-between">
              <span class="text-gray-500">Template</span>
              <span class="font-medium text-gray-800">{{ checklist?.template_name || template?.name || '-' }}</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-gray-500">Checklist Progress</span>
              <span class="font-medium text-gray-800">{{ checklist?.progress || 0 }}%</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-gray-500">Current Stage</span>
              <span class="font-medium text-gray-800">{{ currentStageLabel }}</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-gray-500">Lifecycle Status</span>
              <span class="font-medium text-gray-800">{{ lifecycle?.status || '-' }}</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-gray-500">Active Tab</span>
              <span class="font-medium text-gray-800">{{ activeStage?.label || '-' }}</span>
            </div>
          </div>
        </section>

        <section class="rounded-2xl border bg-white shadow-sm">
          <div class="border-b px-6 py-4">
            <h2 class="text-lg font-semibold">Next Phases</h2>
          </div>
          <div class="space-y-3 px-6 py-5 text-sm text-gray-600">
            <div v-if="flowType === 'onboarding'">Onboarding now follows your structure: Pre-Boarding, Joining Checklist, Training, Probation Tracking, and Confirmation.</div>
            <div v-else>Offboarding now follows your structure: Exit Request, Exit Checklist, Handover, Exit Interview, and Final Settlement.</div>
          </div>
        </section>
      </aside>
    </div>
  </div>
</template>
