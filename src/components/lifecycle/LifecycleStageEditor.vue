<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import SelectDropdown from '@/components/SelectDropdown.vue'
import UserChip from '@/components/user/UserChip.vue'
import { useLifecycleStore } from '@/stores/lifecycle'
import { useLifecycleUsersStore } from '@/stores/lifecycleUsers'
import { normalizeEmploymentType } from '@/utils/salaryPolicy'

const props = defineProps({
  lifecycleId: { type: Number, required: true },
  stage: { type: Object, required: true },
  definition: { type: Object, required: true },
  summaryItems: { type: Array, default: () => [] },
  defaultPayload: { type: Object, default: () => ({}) },
})

const store = useLifecycleStore()
const usersStore = useLifecycleUsersStore()
const saving = ref(false)
const uploading = ref({})
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

const STAGE_SALARY_TYPES = [
  { key: 'intern', label: 'Intern' },
  { key: 'probationary', label: 'Probationary' },
  { key: 'permanent', label: 'Permanent' },
]

onMounted(() => {
  if (props.definition?.fields?.some((field) => field.type === 'user_select')) {
    usersStore.fetchUsers()
  }
})

watch(
  () => [props.stage, props.defaultPayload],
  ([stage, defaultPayload]) => {
    form.status = stage?.record?.status || stage?.data_status || 'not_started'
    form.remarks = stage?.record?.remarks || ''
    form.payload = mergePayloadDefaults(defaultPayload || {}, stage?.record?.payload || {})
    normalizeComplexPayload()
    syncDerivedDefaultPayload()
    baselineSnapshot.value = createFormSnapshot()
    saveState.value = 'idle'
    lastSavedAt.value = formatSaveTimestamp(stage?.record?.updated_at || stage?.updated_at || '')
  },
  { immediate: true, deep: true },
)

watch(
  () => [
    getNestedValue(form.payload, 'evaluation.written', ''),
    getNestedValue(form.payload, 'evaluation.practical', ''),
    getNestedValue(form.payload, 'evaluation.viva', ''),
  ],
  ([written, practical, viva]) => {
    if (!hasFieldPath('evaluation.total')) return

    const total = toNumber(written) + toNumber(practical) + toNumber(viva)
    if (getNestedValue(form.payload, 'evaluation.total', 0) !== total) {
      setNestedValue('evaluation.total', total)
    }
  },
)

watch(
  () => getNestedValue(form.payload, 'recommendation.employment_type', ''),
  (value) => {
    if (!hasFieldPath('recommendation.salary_mode')) return

    const normalized = normalizeEmploymentType(value)
    if (!normalized) return

    const nextMode = normalized === 'contract' ? 'contract_steps' : 'stage_based'
    if (getNestedValue(form.payload, 'recommendation.salary_mode', '') !== nextMode) {
      setNestedValue('recommendation.salary_mode', nextMode)
    }
  },
  { immediate: true },
)

function fileUrl(file) {
  return file?.url || file?.path || '#'
}

function splitPath(path) {
  return String(path || '')
    .split('.')
    .filter(Boolean)
}

function mergePayloadDefaults(baseValue, incomingValue) {
  if (Array.isArray(baseValue)) {
    return Array.isArray(incomingValue) ? [...incomingValue] : [...baseValue]
  }

  if (baseValue && typeof baseValue === 'object') {
    const next = { ...baseValue }

    if (incomingValue && typeof incomingValue === 'object' && !Array.isArray(incomingValue)) {
      Object.keys(incomingValue).forEach((key) => {
        next[key] =
          key in next
            ? mergePayloadDefaults(next[key], incomingValue[key])
            : incomingValue[key]
      })
    }

    return next
  }

  return incomingValue ?? baseValue
}

function hasFieldPath(path) {
  return (props.definition?.fields || []).some((field) => (field.path || field.key) === path)
}

function getNestedValue(source, path, fallback = '') {
  const keys = splitPath(path)
  if (!keys.length) return fallback

  let current = source
  for (const key of keys) {
    if (current == null || !(key in current)) return fallback
    current = current[key]
  }

  return current ?? fallback
}

function setNestedValue(path, value) {
  const keys = splitPath(path)
  if (!keys.length) return

  const nextPayload = { ...(form.payload || {}) }
  let cursor = nextPayload

  keys.forEach((key, index) => {
    if (index === keys.length - 1) {
      cursor[key] = value
      return
    }

    const current = cursor[key]
    cursor[key] =
      current && typeof current === 'object' && !Array.isArray(current) ? { ...current } : {}
    cursor = cursor[key]
  })

  form.payload = nextPayload
}

function fieldPath(field) {
  return field?.path || field?.key
}

function isFieldVisible(field) {
  const rule = field?.visibleWhen
  if (!rule) return true

  const current = getNestedValue(form.payload, rule.path || rule.field || '', '')

  if (Array.isArray(rule.in)) {
    return rule.in.map((item) => String(item)).includes(String(current))
  }

  if (Object.prototype.hasOwnProperty.call(rule, 'equals')) {
    return String(current) === String(rule.equals)
  }

  if (Object.prototype.hasOwnProperty.call(rule, 'notEquals')) {
    return String(current) !== String(rule.notEquals)
  }

  return Boolean(current)
}

const visibleFields = computed(() => (props.definition?.fields || []).filter(isFieldVisible))

function getFieldValue(field, fallback = '') {
  return getNestedValue(form.payload, fieldPath(field), fallback)
}

function updateFieldValue(field, value) {
  setNestedValue(fieldPath(field), value)
}

function trainingBlockStatusPath(field) {
  return field?.statusPath || `${field.key}_status`
}

function trainingBlockNotePath(field) {
  return field?.notePath || `${field.key}_note`
}

function fieldColumnClass(field, defaultSpan = 1) {
  const span = Number(field?.colSpan ?? defaultSpan)
  return span >= 2 ? 'md:col-span-2' : ''
}

function textareaHeightClass(field) {
  return Number(field?.colSpan ?? 2) === 1 ? 'min-h-[52px]' : 'min-h-[64px]'
}

function createFormSnapshot() {
  return JSON.stringify({
    status: form.status,
    remarks: form.remarks || '',
    payload: form.payload || {},
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

function toNumber(value) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function normalizeComplexPayload() {
  for (const field of props.definition?.fields || []) {
    const path = fieldPath(field)

    if (field.type === 'salary_steps') {
      const current = getNestedValue(form.payload, path, [])
      if (!Array.isArray(current)) setNestedValue(path, [])
      continue
    }

    if (field.type === 'salary_stages') {
      const current = getNestedValue(form.payload, path, {})
      if (!current || typeof current !== 'object' || Array.isArray(current)) {
        setNestedValue(path, emptyStageSalaryPlan())
      } else {
        setNestedValue(path, mergeStageSalaryPlan(current))
      }
      continue
    }

    if (path.includes('.')) {
      const parentPath = splitPath(path).slice(0, -1).join('.')
      const current = getNestedValue(form.payload, parentPath, null)
      if (!current || typeof current !== 'object' || Array.isArray(current)) {
        setNestedValue(parentPath, {})
      }
    }
  }
}

function syncDerivedDefaultPayload() {
  const derivedPaths = ['recommendation.employment_type', 'recommendation.salary_mode']

  derivedPaths.forEach((path) => {
    const defaultValue = getNestedValue(props.defaultPayload || {}, path, '')
    if (defaultValue === '') return
    if (hasFieldPath(path)) return
    if (getNestedValue(form.payload, path, '') !== defaultValue) {
      setNestedValue(path, defaultValue)
    }
  })
}

function emptySalaryStep() {
  return {
    label: '',
    duration_months: '',
    amount: '',
    notes: '',
  }
}

function emptyStageSalaryItem() {
  return {
    amount: '',
    duration_months: '',
    notes: '',
  }
}

function emptyStageSalaryPlan() {
  return STAGE_SALARY_TYPES.reduce((acc, item) => {
    acc[item.key] = emptyStageSalaryItem()
    return acc
  }, {})
}

function mergeStageSalaryPlan(source = {}) {
  return STAGE_SALARY_TYPES.reduce((acc, item) => {
    const current = source?.[item.key]
    acc[item.key] =
      current && typeof current === 'object' && !Array.isArray(current)
        ? { ...emptyStageSalaryItem(), ...current }
        : emptyStageSalaryItem()
    return acc
  }, {})
}

function formatAmount(value) {
  const amount = Number(value)
  if (!Number.isFinite(amount) || amount <= 0) return 'Not set'

  return new Intl.NumberFormat('en-BD', {
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatMonthLabel(value, fallback = 'Duration not set') {
  const months = Number(value)
  if (!Number.isFinite(months) || months <= 0) return fallback
  return `${months} ${months === 1 ? 'month' : 'months'}`
}

function salarySteps(field) {
  const items = getFieldValue(field, [])
  return Array.isArray(items) ? items : []
}

function stageSalaryPlan(field) {
  return mergeStageSalaryPlan(getFieldValue(field, {}))
}

function salaryStepTimeline(field) {
  let currentMonth = 0

  return salarySteps(field).map((item, index) => {
    const duration = Number(item?.duration_months)
    const hasDuration = Number.isFinite(duration) && duration > 0
    const startMonth = currentMonth
    const endMonth = hasDuration ? currentMonth + duration : null

    if (hasDuration) {
      currentMonth = endMonth
    }

    return {
      ...item,
      previewLabel:
        String(item?.label || '').trim() ||
        (hasDuration ? `${startMonth}-${endMonth} months` : `Condition ${index + 1}`),
      previewDuration: hasDuration
        ? `${startMonth}-${endMonth} months`
        : formatMonthLabel(item?.duration_months),
      previewAmount: formatAmount(item?.amount),
    }
  })
}

function stageSalaryPreview(field) {
  const plan = stageSalaryPlan(field)

  return STAGE_SALARY_TYPES.map((item) => ({
    key: item.key,
    label: item.label,
    amount: formatAmount(plan[item.key]?.amount),
    duration:
      item.key === 'permanent'
        ? formatMonthLabel(plan[item.key]?.duration_months, 'Open ended')
        : formatMonthLabel(plan[item.key]?.duration_months),
  }))
}

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

function addSalaryStep(field) {
  updateFieldValue(field, [...salarySteps(field), emptySalaryStep()])
}

function updateSalaryStep(field, index, key, value) {
  const next = salarySteps(field).map((item, itemIndex) =>
    itemIndex === index ? { ...item, [key]: value } : item,
  )
  updateFieldValue(field, next)
}

function removeSalaryStep(field, index) {
  updateFieldValue(
    field,
    salarySteps(field).filter((_, itemIndex) => itemIndex !== index),
  )
}

function updateStageSalary(field, stageKey, key, value) {
  const next = stageSalaryPlan(field)
  next[stageKey] = { ...next[stageKey], [key]: value }
  updateFieldValue(field, next)
}

async function onFileChange(fieldKey, event) {
  const file = event?.target?.files?.[0]
  if (!file) return

  uploading.value = { ...uploading.value, [fieldKey]: true }

  try {
    const doc = await store.uploadDocument(file)
    form.payload = { ...form.payload, [fieldKey]: doc }
    window?.notify?.success && window.notify.success('Attachment uploaded')
  } catch (error) {
    window?.notify?.error && window.notify.error('Attachment upload failed')
  } finally {
    uploading.value = { ...uploading.value, [fieldKey]: false }
    if (event?.target) event.target.value = ''
  }
}

function clearFile(fieldKey) {
  form.payload = { ...form.payload, [fieldKey]: null }
}

function searchLifecycleUsers(options, term) {
  const needle = (term || '').trim().toLowerCase()
  if (!needle) return Array.isArray(options) ? [...options] : []

  return (Array.isArray(options) ? options : []).filter((option) => {
    const haystacks = [
      option?.name,
      option?.employee_id,
      option?.email,
      option?.department?.name,
      option?.designation?.title,
    ]

    return haystacks.some((value) => String(value || '').toLowerCase().includes(needle))
  })
}

async function save() {
  if (!hasUnsavedChanges.value) return

  saving.value = true
  saveState.value = 'saving'

  try {
    await store.saveStageRecord(props.lifecycleId, props.stage.code, {
      status: form.status,
      payload: form.payload,
      remarks: form.remarks || null,
    })
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
  <section class="rounded-xl border bg-white shadow-sm">
    <div class="flex flex-wrap items-start justify-between gap-2.5 border-b px-4 py-2.5 md:px-4.5">
      <div>
        <h2 class="text-sm font-semibold text-slate-900 md:text-base">{{ definition.title }}</h2>
        <p class="text-xs text-gray-500">{{ definition.description }}</p>
      </div>

      <div class="min-w-[160px]">
        <label class="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500">Stage Status</label>
        <select v-model="form.status" class="w-full rounded-lg border px-2.5 py-1.5 text-sm">
          <option v-for="item in statusOptions" :key="item.value" :value="item.value">{{ item.label }}</option>
        </select>
      </div>
    </div>

    <div class="space-y-3 px-4 py-3 md:px-4.5">
      <div
        v-if="summaryItems.length"
        class="grid gap-1.5 rounded-xl border border-blue-100 bg-blue-50/60 px-2.5 py-2.5 md:grid-cols-2 xl:grid-cols-3"
      >
        <div v-for="item in summaryItems" :key="item.label" class="min-w-0">
          <div class="text-xs font-medium uppercase tracking-wide text-blue-700">{{ item.label }}</div>
          <div class="truncate text-sm font-semibold text-slate-800" :title="item.value || 'N/A'">
            {{ item.value || 'N/A' }}
          </div>
        </div>
      </div>

      <div class="grid gap-2.5 md:grid-cols-2">
        <template v-for="field in visibleFields">
          <div v-if="field.type === 'section'" :key="`${field.key}-section`" :class="fieldColumnClass(field, 2)">
            <div class="flex items-center gap-2.5">
              <div class="h-px flex-1 bg-slate-200" />
              <div class="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-600">
                {{ field.label }}
              </div>
              <div class="h-px flex-1 bg-slate-200" />
            </div>
          </div>

          <label
            v-else-if="field.type === 'text' || field.type === 'date' || field.type === 'number'"
            :key="`${field.key}-input`"
            :class="['block', fieldColumnClass(field)]"
          >
            <span class="mb-1 block text-sm font-medium text-gray-700">{{ field.label }}</span>
            <input
              :value="getFieldValue(field)"
              :type="field.type"
              class="w-full rounded-lg border px-2.5 py-1.5 text-sm"
              :class="{ 'bg-gray-50 text-gray-500': field.readonly }"
              :placeholder="field.placeholder || ''"
              :readonly="field.readonly"
              :disabled="field.readonly"
              @input="updateFieldValue(field, $event.target.value)"
            />
          </label>

          <div
            v-else-if="field.type === 'training_block'"
            :key="`${field.key}-training-block`"
            :class="[
              'space-y-2.5 rounded-lg border border-slate-200 bg-slate-50/40 p-3',
              fieldColumnClass(field),
            ]"
          >
            <label class="block">
              <span class="mb-1 block text-sm font-medium text-gray-700">{{ field.label }}</span>
              <select
                :value="getNestedValue(form.payload, trainingBlockStatusPath(field), '')"
                class="w-full rounded-lg border bg-white px-2.5 py-1.5 text-sm"
                @change="setNestedValue(trainingBlockStatusPath(field), $event.target.value)"
              >
                <option value="">Select</option>
                <option v-for="option in field.options || []" :key="option.value" :value="option.value">
                  {{ option.label }}
                </option>
              </select>
            </label>

            <label class="block">
              <span class="mb-1 block text-sm font-medium text-gray-700">
                {{ field.noteLabel || `${field.label} Note` }}
              </span>
              <textarea
                :value="getNestedValue(form.payload, trainingBlockNotePath(field), '')"
                :rows="field.rows || 2"
                class="min-h-[56px] w-full rounded-lg border bg-white px-2.5 py-1.5 text-sm"
                :placeholder="field.placeholder || ''"
                @input="setNestedValue(trainingBlockNotePath(field), $event.target.value)"
              />
            </label>
          </div>

          <label
            v-else-if="field.type === 'textarea'"
            :key="`${field.key}-textarea`"
            :class="['block', fieldColumnClass(field, 2)]"
          >
            <span class="mb-1 block text-sm font-medium text-gray-700">{{ field.label }}</span>
            <textarea
              :value="getFieldValue(field)"
              :rows="field.rows || 3"
              :class="[
                textareaHeightClass(field),
                'w-full rounded-lg border px-2.5 py-1.5 text-sm',
              ]"
              :placeholder="field.placeholder || ''"
              @input="updateFieldValue(field, $event.target.value)"
            />
          </label>

          <label
            v-else-if="field.type === 'select'"
            :key="`${field.key}-select`"
            :class="['block', fieldColumnClass(field)]"
          >
            <span class="mb-1 block text-sm font-medium text-gray-700">{{ field.label }}</span>
            <select
              :value="getFieldValue(field)"
              class="w-full rounded-lg border px-2.5 py-1.5 text-sm"
              @change="updateFieldValue(field, $event.target.value)"
            >
              <option value="">Select</option>
              <option v-for="option in field.options || []" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
            <span v-if="field.help" class="mt-1 block text-xs text-slate-500">{{ field.help }}</span>
          </label>

          <label
            v-else-if="field.type === 'user_select'"
            :key="`${field.key}-user`"
            :class="['block', fieldColumnClass(field)]"
          >
            <span class="mb-1 block text-sm font-medium text-gray-700">{{ field.label }}</span>
            <SelectDropdown
              :model-value="getFieldValue(field)"
              :options="usersStore.items"
              label="name"
              :searchBy="searchLifecycleUsers"
              placeholder="-- SELECT USER --"
              class="h-10 w-full"
              clearable
              searchable
              @update:model-value="updateFieldValue(field, $event)"
            >
              <template #option="{ option }">
                <UserChip :user="option || {}" class="w-full overflow-hidden border relative" />
              </template>
              <template #selected-option="{ option }">
                <UserChip v-if="option" :user="option || {}" />
              </template>
            </SelectDropdown>
          </label>

          <label
            v-else-if="field.type === 'checkbox'"
            :key="`${field.key}-checkbox`"
            :class="['flex items-center gap-3 rounded-lg border px-3 py-2', fieldColumnClass(field)]"
          >
            <input
              :checked="Boolean(getFieldValue(field, false))"
              type="checkbox"
              class="h-4 w-4 rounded border-gray-300"
              @change="updateFieldValue(field, $event.target.checked)"
            />
            <span class="text-sm font-medium text-gray-700">{{ field.label }}</span>
          </label>

          <div
            v-else-if="field.type === 'salary_steps'"
            :key="`${field.key}-salary-steps`"
            class="rounded-xl border bg-slate-50/70 p-2.5 md:col-span-2"
          >
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div class="text-sm font-semibold text-slate-800">{{ field.label }}</div>
                <div v-if="field.help" class="mt-1 text-xs text-slate-500">{{ field.help }}</div>
              </div>

              <button
                type="button"
                class="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
                @click="addSalaryStep(field)"
              >
                Add Salary Condition
              </button>
            </div>

            <div v-if="salarySteps(field).length" class="mt-2.5 grid gap-2.5 xl:grid-cols-[minmax(0,1fr),220px]">
              <div class="space-y-2">
                <div
                  v-for="(item, index) in salarySteps(field)"
                  :key="`${field.key}-${index}`"
                  class="rounded-xl border bg-white p-2.5 shadow-sm"
                >
                  <div class="mb-2 flex items-center justify-between gap-3">
                    <div class="text-sm font-medium text-slate-700">Condition {{ index + 1 }}</div>
                    <button
                      type="button"
                      class="rounded-md border border-rose-200 px-2.5 py-1 text-xs font-medium text-rose-600 hover:bg-rose-50"
                      @click="removeSalaryStep(field, index)"
                    >
                      Remove
                    </button>
                  </div>

                  <div class="grid gap-2 md:grid-cols-3">
                    <label class="block">
                      <span class="mb-1 block text-sm font-medium text-gray-700">Label</span>
                      <input
                        :value="item.label"
                        type="text"
                        class="w-full rounded-lg border px-2.5 py-1.5 text-sm"
                        placeholder="0-3 months"
                        @input="updateSalaryStep(field, index, 'label', $event.target.value)"
                      />
                    </label>

                    <label class="block">
                      <span class="mb-1 block text-sm font-medium text-gray-700">Duration (Months)</span>
                      <input
                        :value="item.duration_months"
                        type="number"
                        class="w-full rounded-lg border px-2.5 py-1.5 text-sm"
                        placeholder="3"
                        @input="updateSalaryStep(field, index, 'duration_months', $event.target.value)"
                      />
                    </label>

                    <label class="block">
                      <span class="mb-1 block text-sm font-medium text-gray-700">Amount</span>
                      <input
                        :value="item.amount"
                        type="number"
                        class="w-full rounded-lg border px-2.5 py-1.5 text-sm"
                        placeholder="15000"
                        @input="updateSalaryStep(field, index, 'amount', $event.target.value)"
                      />
                    </label>
                  </div>

                  <label class="mt-2 block">
                    <span class="mb-1 block text-sm font-medium text-gray-700">Condition / Notes</span>
                    <textarea
                      :value="item.notes"
                      class="min-h-[56px] w-full rounded-lg border px-2.5 py-1.5 text-sm"
                      placeholder="Mention appraisal trigger, confirmation rule, or any condition for this salary step"
                      @input="updateSalaryStep(field, index, 'notes', $event.target.value)"
                    />
                  </label>
                </div>
              </div>

              <div class="rounded-xl border border-dashed border-slate-300 bg-white px-2.5 py-2.5">
                <div class="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Salary Preview</div>
                <div class="mt-2.5 space-y-1.5">
                  <div
                    v-for="(item, index) in salaryStepTimeline(field)"
                    :key="`${field.key}-preview-${index}`"
                    class="rounded-lg bg-slate-50 px-2.5 py-2"
                  >
                    <div class="flex items-center justify-between gap-3">
                      <div class="text-sm font-semibold text-slate-800">{{ item.previewLabel }}</div>
                      <div class="text-sm font-semibold text-blue-700">{{ item.previewAmount }}</div>
                    </div>
                    <div class="mt-1 text-xs text-slate-500">{{ item.previewDuration }}</div>
                    <div v-if="item.notes" class="mt-1 line-clamp-2 text-xs text-slate-500">
                      {{ item.notes }}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div v-else class="mt-2.5 rounded-lg border border-dashed border-slate-300 bg-white px-3 py-3 text-sm text-slate-500">
              No salary condition added yet. Example: 1st 3 month - 15000, 2nd 6 month - 25000, 3rd 12 month - 40000.
            </div>
          </div>

          <div
            v-else-if="field.type === 'salary_stages'"
            :key="`${field.key}-salary-stages`"
            class="rounded-xl border bg-slate-50/70 p-2.5 md:col-span-2"
          >
            <div>
              <div class="text-sm font-semibold text-slate-800">{{ field.label }}</div>
              <div v-if="field.help" class="mt-1 text-xs text-slate-500">{{ field.help }}</div>
            </div>

            <div class="mt-2.5 grid gap-1.5 sm:grid-cols-3">
              <div
                v-for="item in stageSalaryPreview(field)"
                :key="`${field.key}-summary-${item.key}`"
                class="rounded-lg border border-dashed border-slate-300 bg-white px-2.5 py-2"
              >
                <div class="text-xs font-medium uppercase tracking-wide text-slate-500">{{ item.label }}</div>
                <div class="mt-1 text-sm font-semibold text-slate-800">{{ item.amount }}</div>
                <div class="mt-0.5 text-xs text-slate-500">{{ item.duration }}</div>
              </div>
            </div>

            <div class="mt-2.5 grid gap-2 xl:grid-cols-3">
              <div
                v-for="item in STAGE_SALARY_TYPES"
                :key="`${field.key}-${item.key}`"
                class="rounded-xl border bg-white p-2.5 shadow-sm"
              >
                <div class="text-sm font-semibold text-slate-800">{{ item.label }}</div>

                <div class="mt-2 space-y-2">
                  <label class="block">
                    <span class="mb-1 block text-sm font-medium text-gray-700">Gross Amount</span>
                    <input
                      :value="stageSalaryPlan(field)[item.key]?.amount"
                      type="number"
                      class="w-full rounded-lg border px-2.5 py-1.5 text-sm"
                      placeholder="0"
                      @input="updateStageSalary(field, item.key, 'amount', $event.target.value)"
                    />
                  </label>

                  <label class="block">
                      <span class="mb-1 block text-sm font-medium text-gray-700">Duration (Months)</span>
                      <input
                        :value="stageSalaryPlan(field)[item.key]?.duration_months"
                        type="number"
                        class="w-full rounded-lg border px-2.5 py-1.5 text-sm"
                        :placeholder="item.key === 'permanent' ? 'Optional' : '0'"
                        @input="updateStageSalary(field, item.key, 'duration_months', $event.target.value)"
                      />
                    </label>

                  <label class="block">
                    <span class="mb-1 block text-sm font-medium text-gray-700">Condition / Notes</span>
                    <textarea
                      :value="stageSalaryPlan(field)[item.key]?.notes"
                      class="min-h-[56px] w-full rounded-lg border px-2.5 py-1.5 text-sm"
                      placeholder="Mention review condition, confirmation rule, or salary note"
                      @input="updateStageSalary(field, item.key, 'notes', $event.target.value)"
                    />
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div
            v-else-if="field.type === 'file'"
            :key="`${field.key}-file`"
            :class="['rounded-lg border px-3 py-2.5', fieldColumnClass(field, 2)]"
          >
            <div class="mb-1.5 text-sm font-medium text-gray-700">{{ field.label }}</div>
            <input
              type="file"
              :accept="field.accept || '.pdf,.jpg,.jpeg,.png,.doc,.docx'"
              class="block w-full text-sm text-gray-600"
              @change="onFileChange(field.key, $event)"
            />
            <div v-if="form.payload[field.key]" class="mt-2.5 flex items-center justify-between gap-3 rounded-lg bg-gray-50 px-3 py-2 text-sm">
              <a :href="fileUrl(form.payload[field.key])" target="_blank" class="truncate text-blue-600 underline">
                {{ form.payload[field.key]?.name || 'Open attachment' }}
              </a>
              <button type="button" class="rounded border px-2 py-1 text-xs text-gray-600" @click="clearFile(field.key)">
                Remove
              </button>
            </div>
            <div v-if="uploading[field.key]" class="mt-2 text-xs text-gray-500">Uploading...</div>
          </div>
        </template>
      </div>

      <label class="block">
        <span class="mb-1 block text-sm font-medium text-gray-700">Remarks</span>
        <textarea
          v-model="form.remarks"
          class="min-h-[68px] w-full rounded-lg border px-2.5 py-1.5 text-sm"
          placeholder="Notes, context, handover remarks, or HR observations"
        />
      </label>

      <div v-if="usersStore.error" class="text-sm text-red-600">{{ usersStore.error }}</div>

      <div
        class="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2.5"
      >
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
          <span
            v-if="saving"
            class="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
          />
          <span
            v-else-if="!hasUnsavedChanges && saveState === 'success'"
            class="inline-flex h-4 w-4 items-center justify-center rounded-full bg-white/20 text-[10px]"
          >
            ✓
          </span>
          {{ saving ? 'Submitting...' : !hasUnsavedChanges && saveState === 'success' ? 'Saved' : 'Save Stage' }}
        </button>
      </div>
    </div>
  </section>
</template>
