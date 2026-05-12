<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { useLifecycleStore } from '@/stores/lifecycle'
import { normalizeEmploymentType } from '@/utils/salaryPolicy'

const props = defineProps({
  lifecycleId: { type: Number, default: 0 },
  stage: { type: Object, required: true },
  employee: { type: Object, default: null },
})

const store = useLifecycleStore()
const saving = ref(false)
const saveState = ref('idle')
const lastSavedAt = ref('')
const baselineSnapshot = ref('')

const form = reactive({
  status: 'not_started',
  remarks: '',
  payload: {},
})

const statusOptions = [
  { value: 'not_started', label: 'Not Started' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'on_hold', label: 'On Hold' },
  { value: 'completed', label: 'Completed' },
]

const cvStatusOptions = [
  { value: 'pending', label: 'Pending' },
  { value: 'reviewed', label: 'Reviewed' },
  { value: 'shortlisted', label: 'Shortlisted' },
  { value: 'rejected', label: 'Rejected' },
]

const salaryModeOptions = [
  { value: 'stage_based', label: 'Stage Based' },
  { value: 'contract_steps', label: 'Contract Slabs' },
]

const evaluationItems = [
  { key: 'written', label: 'Written', tone: 'border-sky-200 bg-sky-50/70 text-sky-900' },
  { key: 'practical', label: 'Practical', tone: 'border-violet-200 bg-violet-50/70 text-violet-900' },
  { key: 'viva', label: 'Viva', tone: 'border-emerald-200 bg-emerald-50/70 text-emerald-900' },
]

const salaryStageItems = [
  {
    key: 'intern',
    title: 'Intern',
    card: 'border-sky-200 bg-sky-50/60',
    header: 'bg-sky-100/80 text-sky-900',
  },
  {
    key: 'probationary',
    title: 'Probationary',
    card: 'border-violet-200 bg-violet-50/60',
    header: 'bg-violet-100/80 text-violet-900',
  },
  {
    key: 'permanent',
    title: 'Permanent',
    card: 'border-emerald-200 bg-emerald-50/60',
    header: 'bg-emerald-100/80 text-emerald-900',
  },
]

const employmentType = computed(() => normalizeEmploymentType(props.employee?.employment_type))

const employmentTypeLabel = computed(() => {
  const type = employmentType.value
  if (type === 'contract') return 'Contract'
  if (type === 'intern') return 'Intern'
  if (type === 'permanent') return 'Permanent'
  if (type === 'probationary') return 'Probationary'
  return 'Not Set'
})

const selectedStatusLabel = computed(
  () => statusOptions.find((item) => item.value === form.status)?.label || 'Not Started',
)

const selectedStatusTone = computed(() => {
  if (form.status === 'completed') return 'bg-emerald-100 text-emerald-700 ring-emerald-200'
  if (form.status === 'in_progress') return 'bg-blue-100 text-blue-700 ring-blue-200'
  if (form.status === 'on_hold') return 'bg-amber-100 text-amber-700 ring-amber-200'
  return 'bg-slate-100 text-slate-600 ring-slate-200'
})

const evaluationTotal = computed(() =>
  evaluationItems.reduce((total, item) => total + numberValue(form.payload?.evaluation?.[item.key]), 0),
)

const salaryMode = computed(() => form.payload?.recommendation?.salary_mode || defaultSalaryMode())

const summaryItems = computed(() => [
  { label: 'Employment Type', value: employmentTypeLabel.value },
  {
    label: 'Salary Plan',
    value: salaryMode.value === 'contract_steps' ? 'Contract Slabs' : 'Stage Based',
  },
  {
    label: 'CV Status',
    value: cvStatusOptions.find((item) => item.value === form.payload?.cv_review_status)?.label || 'Pending',
  },
  { label: 'Total Mark', value: `${evaluationTotal.value}` },
  {
    label: 'Condition',
    value: form.payload?.recommendation?.joining_condition ? 'Added' : 'Pending',
  },
  { label: 'Stage Status', value: selectedStatusLabel.value },
])

const hasUnsavedChanges = computed(() => createFormSnapshot() !== baselineSnapshot.value)

const saveStatusMeta = computed(() => {
  if (saving.value) {
    return {
      tone: 'saving',
      label: 'Saving changes...',
      detail: 'Please wait while the stage record is being updated.',
    }
  }

  if (saveState.value === 'error') {
    return {
      tone: 'error',
      label: 'Save failed',
      detail: 'The latest changes were not submitted. Try again.',
    }
  }

  if (hasUnsavedChanges.value) {
    return {
      tone: 'pending',
      label: 'Unsaved changes',
      detail: 'The form has changes that are not submitted yet.',
    }
  }

  if (saveState.value === 'success' && lastSavedAt.value) {
    return {
      tone: 'success',
      label: 'Saved',
      detail: `Last saved at ${lastSavedAt.value}.`,
    }
  }

  return {
    tone: 'idle',
    label: 'No pending changes',
    detail: 'Update the form and click save when ready.',
  }
})

watch(
  () => props.stage?.record,
  (record) => {
    form.status = record?.status || props.stage?.data_status || 'not_started'
    form.remarks = record?.remarks || ''
    form.payload = normalizePayload(record?.payload || {})
    baselineSnapshot.value = createFormSnapshot()
    saveState.value = 'idle'
    lastSavedAt.value = formatSaveTimestamp(record?.updated_at || props.stage?.updated_at || '')
  },
  { immediate: true, deep: true },
)

function defaultSalaryMode() {
  return employmentType.value === 'contract' ? 'contract_steps' : 'stage_based'
}

function defaultPayload() {
  return {
    cv_review_status: 'pending',
    evaluation: {
      written: '',
      practical: '',
      viva: '',
      total: 0,
      notes: '',
    },
    recommendation: {
      employment_type: ['intern', 'probationary', 'permanent', 'contract'].includes(employmentType.value)
        ? employmentType.value
        : 'probationary',
      salary_mode: defaultSalaryMode(),
      joining_condition: '',
      notes: '',
    },
    salary_steps: [],
    salary_stages: {
      intern: { amount: '', duration_months: '', notes: '' },
      probationary: { amount: '', duration_months: '', notes: '' },
      permanent: { amount: '', duration_months: '', notes: '' },
    },
  }
}

function normalizePayload(payload = {}) {
  const fallback = defaultPayload()
  const next = {
    ...fallback,
    ...payload,
    evaluation: {
      ...fallback.evaluation,
      ...(payload.evaluation || {}),
    },
    recommendation: {
      ...fallback.recommendation,
      ...(payload.recommendation || {}),
      employment_type: payload.recommendation?.employment_type || fallback.recommendation.employment_type,
      salary_mode: payload.recommendation?.salary_mode || fallback.recommendation.salary_mode,
    },
    salary_steps: Array.isArray(payload.salary_steps) ? payload.salary_steps : [],
    salary_stages: {
      ...fallback.salary_stages,
      ...(payload.salary_stages || {}),
    },
  }

  next.evaluation.total = evaluationTotalFrom(next.evaluation)

  return next
}

function numberValue(value) {
  const number = Number(value)
  return Number.isFinite(number) ? number : 0
}

function evaluationTotalFrom(evaluation = {}) {
  return numberValue(evaluation.written) + numberValue(evaluation.practical) + numberValue(evaluation.viva)
}

function updateEvaluation(key, value) {
  const evaluation = {
    ...(form.payload.evaluation || {}),
    [key]: value,
  }
  evaluation.total = evaluationTotalFrom(evaluation)
  form.payload = {
    ...(form.payload || {}),
    evaluation,
  }
}

function updateEvaluationNote(value) {
  form.payload = {
    ...(form.payload || {}),
    evaluation: {
      ...(form.payload.evaluation || {}),
      notes: value,
      total: evaluationTotal.value,
    },
  }
}

function updateRecommendation(key, value) {
  form.payload = {
    ...(form.payload || {}),
    recommendation: {
      ...(form.payload.recommendation || {}),
      [key]: value,
    },
  }
}

function updateSalaryMode(value) {
  form.payload = {
    ...(form.payload || {}),
    recommendation: {
      ...(form.payload.recommendation || {}),
      salary_mode: value,
    },
  }
}

function updateSalaryStage(stageKey, field, value) {
  form.payload = {
    ...(form.payload || {}),
    salary_stages: {
      ...(form.payload.salary_stages || {}),
      [stageKey]: {
        ...(form.payload.salary_stages?.[stageKey] || {}),
        [field]: value,
      },
    },
  }
}

function addSalaryStep() {
  form.payload = {
    ...(form.payload || {}),
    salary_steps: [
      ...(Array.isArray(form.payload.salary_steps) ? form.payload.salary_steps : []),
      { label: '', duration_months: '', amount: '', notes: '' },
    ],
  }
}

function removeSalaryStep(index) {
  const rows = [...(Array.isArray(form.payload.salary_steps) ? form.payload.salary_steps : [])]
  rows.splice(index, 1)
  form.payload = { ...(form.payload || {}), salary_steps: rows }
}

function updateSalaryStep(index, field, value) {
  const rows = [...(Array.isArray(form.payload.salary_steps) ? form.payload.salary_steps : [])]
  rows[index] = { ...(rows[index] || {}), [field]: value }
  form.payload = { ...(form.payload || {}), salary_steps: rows }
}

function createFormSnapshot() {
  const payload = normalizePayload({
    ...(form.payload || {}),
    evaluation: {
      ...(form.payload?.evaluation || {}),
      total: evaluationTotal.value,
    },
  })

  return JSON.stringify({
    status: form.status,
    remarks: form.remarks || '',
    payload,
  })
}

function formatSaveTimestamp(value) {
  if (!value) return ''

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  return date.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

async function save() {
  if (!hasUnsavedChanges.value) return

  saving.value = true
  saveState.value = 'saving'

  try {
    const payload = normalizePayload({
      ...(form.payload || {}),
      evaluation: {
        ...(form.payload?.evaluation || {}),
        total: evaluationTotal.value,
      },
    })

    await store.saveStageRecord(props.lifecycleId, props.stage.code, {
      status: form.status,
      payload,
      remarks: form.remarks || null,
    })

    form.payload = payload
    baselineSnapshot.value = createFormSnapshot()
    lastSavedAt.value = formatSaveTimestamp(new Date())
    saveState.value = 'success'
    window?.notify?.success && window.notify.success('Stage updated')
  } catch (error) {
    saveState.value = 'error'
    window?.notify?.error && window.notify.error('Failed to update stage')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <section class="rounded-lg border bg-white shadow-sm">
    <div class="border-b px-3 py-2">
      <h2 class="text-sm font-semibold text-slate-900 md:text-base">Pre-Boarding</h2>
    </div>

    <div class="space-y-2 px-3 py-2">
      <div class="grid gap-x-3 gap-y-1 rounded-xl border border-blue-100 bg-blue-50/60 px-2 py-1.5 md:grid-cols-3 xl:grid-cols-6">
        <div v-for="item in summaryItems" :key="item.label" class="min-w-0">
          <div class="text-[10px] font-medium uppercase tracking-wide text-blue-700">
            {{ item.label }}
          </div>
          <div class="truncate text-xs font-semibold text-slate-800" :title="item.value || 'N/A'">
            {{ item.value || 'N/A' }}
          </div>
        </div>
      </div>

      <div class="grid gap-2 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.7fr)]">
        <div class="rounded-xl border border-slate-200 bg-slate-50/50 p-2">
          <div class="mb-1.5 flex flex-wrap items-center justify-between gap-2">
            <div class="text-sm font-semibold text-slate-800">CV / Exam Review</div>
            <label class="flex items-center gap-2 text-xs font-medium text-slate-600">
              CV Status
              <select
                :value="form.payload.cv_review_status"
                class="rounded-lg border bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-900"
                @change="form.payload = { ...(form.payload || {}), cv_review_status: $event.target.value }"
              >
                <option v-for="option in cvStatusOptions" :key="option.value" :value="option.value">
                  {{ option.label }}
                </option>
              </select>
            </label>
          </div>

          <div class="grid gap-2 md:grid-cols-4">
            <label
              v-for="item in evaluationItems"
              :key="item.key"
              class="rounded-xl border p-2"
              :class="item.tone"
            >
              <span class="mb-1 block text-[10px] font-bold uppercase tracking-[0.12em]">
                {{ item.label }}
              </span>
              <input
                :value="form.payload.evaluation?.[item.key] || ''"
                type="number"
                min="0"
                class="w-full rounded-lg border bg-white px-2.5 py-1.5 text-sm font-semibold text-slate-900"
                placeholder="0"
                @input="updateEvaluation(item.key, $event.target.value)"
              />
            </label>

            <div class="rounded-xl border border-slate-200 bg-white p-2">
              <div class="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">Total Mark</div>
              <div class="mt-1 rounded-lg bg-slate-900 px-3 py-2 text-lg font-semibold text-white">
                {{ evaluationTotal }}
              </div>
            </div>
          </div>

          <label class="mt-2 block">
            <span class="mb-1 block text-sm font-medium text-slate-700">Exam Review Note</span>
            <textarea
              :value="form.payload.evaluation?.notes || ''"
              rows="2"
              class="min-h-[46px] w-full rounded-lg border bg-white px-2.5 py-1.5 text-sm"
              placeholder="CV screening note, exam outcome, or reviewer comment"
              @input="updateEvaluationNote($event.target.value)"
            />
          </label>
        </div>

        <div class="rounded-xl border border-slate-200 bg-slate-50/50 p-2">
          <div class="mb-1.5 text-sm font-semibold text-slate-800">Recommendation</div>

          <div class="grid gap-2 sm:grid-cols-2">
            <label class="block">
              <span class="mb-1 block text-xs font-medium text-slate-600">Employment Type</span>
              <input
                :value="employmentTypeLabel"
                class="w-full rounded-lg border bg-slate-100 px-2.5 py-1.5 text-sm font-semibold text-slate-800"
                readonly
              />
            </label>

            <label class="block">
              <span class="mb-1 block text-xs font-medium text-slate-600">Salary Plan</span>
              <select
                :value="salaryMode"
                class="w-full rounded-lg border bg-white px-2.5 py-1.5 text-sm font-semibold text-slate-900"
                @change="updateSalaryMode($event.target.value)"
              >
                <option v-for="option in salaryModeOptions" :key="option.value" :value="option.value">
                  {{ option.label }}
                </option>
              </select>
            </label>
          </div>

          <label class="mt-2 block">
            <span class="mb-1 block text-sm font-medium text-slate-700">Recommendation Notes</span>
            <textarea
              :value="form.payload.recommendation?.notes || ''"
              rows="3"
              class="min-h-[74px] w-full rounded-lg border bg-white px-2.5 py-1.5 text-sm"
              placeholder="Committee note, approval note, or final recommendation summary"
              @input="updateRecommendation('notes', $event.target.value)"
            />
          </label>
        </div>
      </div>

      <div class="rounded-xl border border-slate-200 bg-slate-50/50 p-2">
        <div class="mb-1.5 flex flex-wrap items-center justify-between gap-2">
          <div class="text-sm font-semibold text-slate-800">Salary Recommendation</div>
          <button
            v-if="salaryMode === 'contract_steps'"
            type="button"
            class="rounded-full border border-blue-300 bg-white px-3 py-1 text-xs font-semibold text-blue-700"
            @click="addSalaryStep"
          >
            + Add Slab
          </button>
        </div>

        <div v-if="salaryMode === 'contract_steps'" class="space-y-2">
          <div
            v-for="(row, index) in form.payload.salary_steps"
            :key="index"
            class="grid gap-2 rounded-xl border border-sky-200 bg-sky-50/50 p-2 lg:grid-cols-[1fr_120px_140px_minmax(180px,1fr)_auto]"
          >
            <label>
              <span class="mb-1 block text-xs font-medium text-slate-600">Slab Label</span>
              <input
                :value="row.label || ''"
                class="w-full rounded-lg border bg-white px-2.5 py-1.5 text-sm"
                placeholder="0-3 months"
                @input="updateSalaryStep(index, 'label', $event.target.value)"
              />
            </label>
            <label>
              <span class="mb-1 block text-xs font-medium text-slate-600">Months</span>
              <input
                :value="row.duration_months || ''"
                type="number"
                min="0"
                class="w-full rounded-lg border bg-white px-2.5 py-1.5 text-sm"
                placeholder="3"
                @input="updateSalaryStep(index, 'duration_months', $event.target.value)"
              />
            </label>
            <label>
              <span class="mb-1 block text-xs font-medium text-slate-600">Amount</span>
              <input
                :value="row.amount || ''"
                type="number"
                min="0"
                class="w-full rounded-lg border bg-white px-2.5 py-1.5 text-sm"
                placeholder="0"
                @input="updateSalaryStep(index, 'amount', $event.target.value)"
              />
            </label>
            <label>
              <span class="mb-1 block text-xs font-medium text-slate-600">Notes</span>
              <input
                :value="row.notes || ''"
                class="w-full rounded-lg border bg-white px-2.5 py-1.5 text-sm"
                placeholder="Condition or context"
                @input="updateSalaryStep(index, 'notes', $event.target.value)"
              />
            </label>
            <button
              type="button"
              class="self-end rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-600"
              @click="removeSalaryStep(index)"
            >
              Remove
            </button>
          </div>

          <div v-if="!form.payload.salary_steps?.length" class="rounded-xl border border-dashed border-slate-300 bg-white px-3 py-3 text-sm text-slate-500">
            No contract slab added yet.
          </div>
        </div>

        <div v-else class="grid gap-2 lg:grid-cols-3">
          <div
            v-for="item in salaryStageItems"
            :key="item.key"
            class="overflow-hidden rounded-xl border"
            :class="item.card"
          >
            <div class="border-b px-2.5 py-1.5 text-sm font-semibold" :class="item.header">
              {{ item.title }}
            </div>
            <div class="grid gap-2 bg-white/80 p-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              <label>
                <span class="mb-1 block text-xs font-medium text-slate-600">Amount</span>
                <input
                  :value="form.payload.salary_stages?.[item.key]?.amount || ''"
                  type="number"
                  min="0"
                  class="w-full rounded-lg border bg-white px-2.5 py-1.5 text-sm"
                  placeholder="0"
                  @input="updateSalaryStage(item.key, 'amount', $event.target.value)"
                />
              </label>
              <label>
                <span class="mb-1 block text-xs font-medium text-slate-600">Months</span>
                <input
                  :value="form.payload.salary_stages?.[item.key]?.duration_months || ''"
                  type="number"
                  min="0"
                  class="w-full rounded-lg border bg-white px-2.5 py-1.5 text-sm"
                  placeholder="0"
                  @input="updateSalaryStage(item.key, 'duration_months', $event.target.value)"
                />
              </label>
              <label class="sm:col-span-2 lg:col-span-1 xl:col-span-2">
                <span class="mb-1 block text-xs font-medium text-slate-600">Notes</span>
                <textarea
                  :value="form.payload.salary_stages?.[item.key]?.notes || ''"
                  rows="2"
                  class="min-h-[48px] w-full rounded-lg border bg-white px-2.5 py-1.5 text-sm"
                  placeholder="Condition or notes"
                  @input="updateSalaryStage(item.key, 'notes', $event.target.value)"
                />
              </label>
            </div>
          </div>
        </div>
      </div>

      <div class="grid gap-2 lg:grid-cols-2">
        <label class="block">
          <span class="mb-1 block text-sm font-medium text-slate-700">Joining Condition</span>
          <textarea
            :value="form.payload.recommendation?.joining_condition || ''"
            rows="2"
            class="min-h-[52px] w-full rounded-lg border px-2.5 py-1.5 text-sm"
            placeholder="Mention conditions to be fulfilled before joining"
            @input="updateRecommendation('joining_condition', $event.target.value)"
          />
        </label>

        <label class="block">
          <span class="mb-1 block text-sm font-medium text-gray-700">Remarks</span>
          <textarea
            v-model="form.remarks"
            class="min-h-[52px] w-full rounded-lg border px-2.5 py-1.5 text-sm"
            rows="2"
            placeholder="Pre-boarding handover note or follow-up remarks"
          />
        </label>
      </div>

      <div class="flex flex-wrap items-end justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2.5">
        <div
          class="flex min-w-0 items-start gap-3"
          :class="{
            'text-amber-700': saveStatusMeta.tone === 'pending',
            'text-emerald-700': saveStatusMeta.tone === 'success',
            'text-rose-700': saveStatusMeta.tone === 'error',
            'text-blue-700': saveStatusMeta.tone === 'saving',
            'text-slate-600': saveStatusMeta.tone === 'idle',
          }"
        >
          <div
            class="mt-1 h-2.5 w-2.5 flex-none rounded-full"
            :class="{
              'animate-pulse bg-amber-500': saveStatusMeta.tone === 'pending',
              'animate-pulse bg-blue-500': saveStatusMeta.tone === 'saving',
              'bg-emerald-500': saveStatusMeta.tone === 'success',
              'bg-rose-500': saveStatusMeta.tone === 'error',
              'bg-slate-300': saveStatusMeta.tone === 'idle',
            }"
          />
          <div class="min-w-0">
            <div class="text-sm font-semibold">{{ saveStatusMeta.label }}</div>
            <div class="text-xs opacity-90">{{ saveStatusMeta.detail }}</div>
          </div>
        </div>

        <div class="flex flex-wrap items-end gap-2">
          <label class="block min-w-[190px]">
            <span class="mb-1 flex items-center justify-between gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-blue-800">
              Stage Status
              <span class="rounded-full px-2 py-0.5 text-[10px] font-semibold normal-case tracking-normal ring-1" :class="selectedStatusTone">
                {{ selectedStatusLabel }}
              </span>
            </span>
            <select
              v-model="form.status"
              class="w-full rounded-lg border border-blue-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-200"
            >
              <option v-for="item in statusOptions" :key="item.value" :value="item.value">
                {{ item.label }}
              </option>
            </select>
          </label>

          <button
            type="button"
            class="inline-flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-sm font-medium text-white transition disabled:cursor-not-allowed disabled:opacity-60"
            :class="
              saving
                ? 'bg-blue-600 hover:bg-blue-600'
                : hasUnsavedChanges
                  ? 'bg-gray-900 hover:bg-black'
                  : 'bg-emerald-600 hover:bg-emerald-600'
            "
            :disabled="saving || !hasUnsavedChanges"
            @click="save"
          >
            <span v-if="saving" class="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
            <span
              v-else-if="!hasUnsavedChanges && saveState === 'success'"
              class="inline-flex h-4 w-4 items-center justify-center rounded-full bg-white/20 text-[10px]"
            >
              OK
            </span>
            {{ saving ? 'Submitting...' : !hasUnsavedChanges && saveState === 'success' ? 'Saved' : 'Save Stage' }}
          </button>
        </div>
      </div>
    </div>
  </section>
</template>
