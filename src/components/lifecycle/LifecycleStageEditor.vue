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

    if (field.type === 'review_list') {
      const current = getNestedValue(form.payload, path, null)
      if (!Array.isArray(current)) {
        setReviewListFieldValue(field, reviewListFieldValue(field))
      } else {
        setReviewListFieldValue(field, current)
      }
      continue
    }

    if (field.type === 'reviewer_matrix') {
      const current = getNestedValue(form.payload, path, null)
      if (!Array.isArray(current)) {
        setReviewerMatrixFieldValue(field, reviewerMatrixFieldValue(field))
      } else {
        setReviewerMatrixFieldValue(field, current)
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

function emptyReviewItem(defaults = {}) {
  return {
    key: defaults.key || '',
    label: defaults.label || '',
    due_date: defaults.due_date || '',
    status: defaults.status || 'pending',
    note: defaults.note || '',
  }
}

function emptyReviewerMatrixRow(defaults = {}) {
  return {
    role: String(defaults.role || '').trim().toLowerCase(),
    label: String(defaults.label || '').trim(),
    assigned: defaults.assigned === true,
    status: String(defaults.status || 'pending').toLowerCase(),
    note: String(defaults.note || ''),
    special_note: String(defaults.special_note || ''),
  }
}

function fallbackText(...values) {
  for (const value of values) {
    const text = String(value ?? '').trim()
    if (text) return text
  }

  return ''
}

function normalizeReviewerMatrixItem(item = {}, defaults = {}) {
  return {
    ...emptyReviewerMatrixRow(defaults),
    ...item,
    role: String(item?.role ?? defaults.role ?? '').trim().toLowerCase(),
    label: fallbackText(item?.label, defaults.label, defaults.role),
    assigned:
      item?.assigned === true ||
      String(item?.assigned || '').toLowerCase() === 'true' ||
      defaults.assigned === true,
    user_id: item?.user_id ?? defaults.user_id ?? null,
    user_name: fallbackText(item?.user_name, defaults.user_name),
    status: String(item?.status ?? defaults.status ?? 'pending').toLowerCase(),
    note: String(item?.note ?? defaults.note ?? ''),
    special_note: String(item?.special_note ?? defaults.special_note ?? ''),
  }
}

function reviewerMatrixFieldValue(field) {
  const path = fieldPath(field)
  const current = getNestedValue(form.payload, path, [])
  const sourcePath = field?.rowSourcePath || ''
  const sourceRows = sourcePath ? getNestedValue(form.payload, sourcePath, []) : []
  const rows = Array.isArray(sourceRows) && sourceRows.length
    ? sourceRows.map((item) => ({
        role: String(item?.role || '').trim().toLowerCase(),
        label: String(item?.user_name || item?.role_label || item?.label || item?.role || '').trim(),
        assigned: item?.user_id != null || item?.assigned === true,
        user_id: item?.user_id ?? null,
        user_name: String(item?.user_name || '').trim(),
      }))
    : Array.isArray(field.rows)
      ? field.rows
      : []

  if (Array.isArray(current) && current.length) {
    return rows.map((row) => {
      const existing = current.find(
        (item) => String(item?.role || '').toLowerCase() === String(row.role || '').toLowerCase(),
      )
      return normalizeReviewerMatrixItem(existing || {}, {
        role: row.role,
        label: row.label,
        assigned: row.assigned,
        user_id: row.user_id,
        user_name: row.user_name,
      })
    })
  }

  return rows.map((row) => normalizeReviewerMatrixItem({}, { role: row.role, label: row.label }))
}

function normalizeSlabKey(value) {
  return String(value || '').trim().toLowerCase()
}

function reviewerMatrixSlabs(field) {
  const slabs = Array.isArray(field?.slabs) ? field.slabs : []
  if (slabs.length) {
    return slabs.map((slab, index) => ({
      key: normalizeSlabKey(slab.key || String(index + 1)),
      label: String(slab.label || `Slab ${index + 1}`).trim(),
      subtitle: String(slab.subtitle || '').trim(),
    }))
  }

  return [
    { key: '30', label: '30 Day Review', subtitle: '1st slab' },
    { key: '60', label: '60 Day Review', subtitle: '2nd slab' },
  ]
}

function reviewerMatrixSlabStatusPath(slabKey) {
  const key = normalizeSlabKey(slabKey)
  return `slab_${key}_status`
}

function reviewerMatrixSlabNotePath(slabKey) {
  const key = normalizeSlabKey(slabKey)
  return `slab_${key}_note`
}

function reviewerMatrixSlabLabel(slab, index) {
  const suffix = slab.subtitle ? ` ${slab.subtitle}` : ` ${index + 1}${index === 0 ? 'st' : index === 1 ? 'nd' : 'th'} slab`
  return `${slab.label}${suffix}`
}

function reviewerMatrixActiveSlabKey(field) {
  const slabs = reviewerMatrixSlabs(field)
  const rows = reviewerMatrixFieldValue(field)

  for (const slab of slabs) {
    const key = normalizeSlabKey(slab.key)
    const hasPendingRow = rows.some(
      (row) => String(row?.[`slab_${key}_status`] || '').toLowerCase() !== 'completed',
    )

    if (hasPendingRow) {
      return key
    }
  }

  return normalizeSlabKey(slabs[0]?.key || '')
}

const reviewerMatrixExpandedKeys = reactive({})

function reviewerMatrixExpandedKey(field) {
  const current = normalizeSlabKey(reviewerMatrixExpandedKeys[field.key])
  return current || reviewerMatrixActiveSlabKey(field)
}

function isReviewerMatrixSlabExpanded(field, slabKey) {
  return reviewerMatrixExpandedKey(field) === normalizeSlabKey(slabKey)
}

function toggleReviewerMatrixSlab(field, slabKey) {
  const normalized = normalizeSlabKey(slabKey)
  reviewerMatrixExpandedKeys[field.key] =
    reviewerMatrixExpandedKey(field) === normalized ? '' : normalized
}

function reviewerMatrixSlabRowValue(row, slabKey, key) {
  const normalized = normalizeSlabKey(slabKey)
  return row?.[`slab_${normalized}_${key}`] ?? (key === 'status' ? 'pending' : '')
}

function updateReviewerMatrixSlabItem(field, index, slabKey, key, value) {
  const normalized = normalizeSlabKey(slabKey)
  const next = reviewerMatrixFieldValue(field).map((item, itemIndex) =>
    itemIndex === index ? { ...item, [`slab_${normalized}_${key}`]: value } : item,
  )
  setReviewerMatrixFieldValue(field, next)
}

function reviewerMatrixSlabSummary(field, slabKey) {
  const rows = reviewerMatrixFieldValue(field)
  const normalized = normalizeSlabKey(slabKey)
  const total = rows.length
  const assigned = rows.filter((row) => row.assigned !== false).length
  const completed = rows.filter((row) => String(row?.[`slab_${normalized}_status`] || '').toLowerCase() === 'completed').length
  const pending = Math.max(0, total - completed)

  return { total, assigned, completed, pending }
}

function setReviewerMatrixFieldValue(field, items) {
  updateFieldValue(
    field,
    Array.isArray(items)
      ? items.map((item) =>
          normalizeReviewerMatrixItem(item, {
            role: item?.role,
            label: item?.label,
          }),
        )
      : [],
  )
}

function updateReviewerMatrixItem(field, index, key, value) {
  const next = reviewerMatrixFieldValue(field).map((item, itemIndex) =>
    itemIndex === index ? { ...item, [key]: value } : item,
  )
  setReviewerMatrixFieldValue(field, next)
}

function emptyReviewerAssignment(defaults = {}) {
  return {
    role: String(defaults.role || '').trim().toLowerCase(),
    role_label: String(defaults.role_label || '').trim(),
    user_id: defaults.user_id || null,
    user_name: String(defaults.user_name || '').trim(),
  }
}

function normalizeReviewerAssignment(item = {}, defaults = {}) {
  return {
    ...emptyReviewerAssignment(defaults),
    ...item,
    role: String(item?.role ?? defaults.role ?? '').trim().toLowerCase(),
    role_label: String(item?.role_label ?? defaults.role_label ?? '').trim(),
    user_id: item?.user_id ?? defaults.user_id ?? null,
    user_name: String(item?.user_name ?? defaults.user_name ?? '').trim(),
  }
}

function reviewerAssignmentFieldValue(field) {
  const path = fieldPath(field)
  const current = getNestedValue(form.payload, path, [])
  
  if (Array.isArray(current)) {
    return current.map((item) => normalizeReviewerAssignment(item))
  }
  
  return []
}

function setReviewerAssignmentFieldValue(field, items) {
  updateFieldValue(
    field,
    Array.isArray(items)
      ? items.map((item) => normalizeReviewerAssignment(item))
      : [],
  )
}

function addReviewerAssignment(field, role, roleLabel) {
  const current = reviewerAssignmentFieldValue(field)
  
  // Check if role already exists
  if (current.some((item) => String(item.role || '').toLowerCase() === String(role || '').toLowerCase())) {
    return
  }
  
  const next = [
    ...current,
    normalizeReviewerAssignment({}, {
      role: role,
      role_label: roleLabel,
      user_id: null,
      user_name: '',
    }),
  ]
  setReviewerAssignmentFieldValue(field, next)
}

function removeReviewerAssignment(field, role) {
  const current = reviewerAssignmentFieldValue(field)
  const next = current.filter((item) => String(item.role || '').toLowerCase() !== String(role || '').toLowerCase())
  setReviewerAssignmentFieldValue(field, next)
}

function updateReviewerAssignment(field, role, key, value) {
  const current = reviewerAssignmentFieldValue(field)
  const next = current.map((item) =>
    String(item.role || '').toLowerCase() === String(role || '').toLowerCase()
      ? { ...item, [key]: value }
      : item,
  )
  setReviewerAssignmentFieldValue(field, next)
}

function updateReviewerAssignmentUser(field, role, userId) {
  const selected = usersStore.items.find((item) => Number(item.id) === Number(userId))
  const current = reviewerAssignmentFieldValue(field)
  const next = current.map((item) =>
    String(item.role || '').toLowerCase() === String(role || '').toLowerCase()
      ? {
          ...item,
          user_id: userId ? Number(userId) : null,
          user_name: selected?.name || '',
        }
      : item,
  )
  setReviewerAssignmentFieldValue(field, next)
}


function normalizeReviewItem(item = {}, defaults = {}) {
  return {
    ...emptyReviewItem(defaults),
    ...item,
    key: String(item?.key ?? defaults.key ?? '').trim(),
    label: String(item?.label ?? defaults.label ?? '').trim(),
    due_date: item?.due_date ?? defaults.due_date ?? '',
    status: item?.status ?? defaults.status ?? 'pending',
    note: item?.note ?? defaults.note ?? '',
  }
}

function reviewListFieldValue(field) {
  const path = fieldPath(field)
  const current = getNestedValue(form.payload, path, [])

  if (Array.isArray(current)) {
    return current.map((item, index) =>
      normalizeReviewItem(item, {
        key: `review-${index + 1}`,
        label: `Review ${index + 1}`,
      }),
    )
  }

  const normalized = []
  for (const legacy of field?.legacyReviews || []) {
    const status = getNestedValue(form.payload, legacy.statusPath || '', '')
    const note = getNestedValue(form.payload, legacy.notePath || '', '')
    const dueDate =
      getNestedValue(form.payload, legacy.dueDatePath || '', '') ||
      getNestedValue(form.payload, legacy.dueDateField || '', '')

    if (!status && !note && !dueDate) continue

    const startDate = getNestedValue(form.payload, field?.startDatePath || 'probation_start_date', '')
    const endDate = getNestedValue(form.payload, field?.endDatePath || 'probation_end_date', '')
    let fallbackDueDate = dueDate

    if (!fallbackDueDate && Number.isFinite(Number(legacy.dueDateMonths))) {
      const date = new Date(startDate)
      if (!Number.isNaN(date.getTime())) {
        const target = new Date(date)
        target.setMonth(target.getMonth() + Number(legacy.dueDateMonths))
        if (target.getDate() !== date.getDate()) {
          target.setDate(0)
        }
        fallbackDueDate = target.toISOString().slice(0, 10)
      }
    }

    if (!fallbackDueDate && legacy.key === 'final_review') {
      fallbackDueDate = endDate
    }

    normalized.push(
      normalizeReviewItem(
        {
          key: legacy.key,
          label: legacy.label,
          due_date: fallbackDueDate,
          status: status || 'pending',
          note: note || '',
        },
        {
          key: legacy.key,
          label: legacy.label,
        },
      ),
    )
  }

  return normalized
}

function setReviewListFieldValue(field, items) {
  updateFieldValue(
    field,
    items.map((item, index) =>
      normalizeReviewItem(item, {
        key: `review-${index + 1}`,
        label: `Review ${index + 1}`,
      }),
    ),
  )
}

function addReviewListItem(field, defaults = {}) {
  setReviewListFieldValue(field, [...reviewListFieldValue(field), emptyReviewItem(defaults)])
}

function updateReviewListItem(field, index, key, value) {
  const next = reviewListFieldValue(field).map((item, itemIndex) =>
    itemIndex === index ? { ...item, [key]: value } : item,
  )
  setReviewListFieldValue(field, next)
}

function removeReviewListItem(field, index) {
  setReviewListFieldValue(
    field,
    reviewListFieldValue(field).filter((_, itemIndex) => itemIndex !== index),
  )
}

function addExtensionReview(field) {
  const extensionMonthsPath = field?.extensionMonthsPath || 'extended_months'
  const extensionMonths = Number(getNestedValue(form.payload, extensionMonthsPath, 0)) || 0
  const probationEndDate = getNestedValue(form.payload, field?.endDatePath || 'probation_end_date', '')
  const key = field?.extensionReviewKey || 'extension_review'
  const label = extensionMonths > 0 ? `${extensionMonths}-Month Extension Review` : 'Extension Review'

  if (!extensionMonths && !probationEndDate) return

  const current = reviewListFieldValue(field)
  if (current.some((item) => String(item.key || '').toLowerCase() === String(key).toLowerCase())) {
    return
  }

  addReviewListItem(field, {
    key,
    label,
    due_date: probationEndDate,
    status: 'pending',
  })
}

function salarySteps(field) {
  const items = getFieldValue(field, [])
  return Array.isArray(items) ? items : []
}

function stageSalaryPlan(field) {
  return mergeStageSalaryPlan(getFieldValue(field, {}))
}

function stageSalaryTypes(field) {
  if (!field?.singleOnly) return STAGE_SALARY_TYPES

  const selectedType = normalizeEmploymentType(getNestedValue(form.payload, 'recommendation.employment_type', ''))
  const match = STAGE_SALARY_TYPES.find((item) => item.key === selectedType)
  return match ? [match] : STAGE_SALARY_TYPES
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

  return stageSalaryTypes(field).map((item) => ({
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

function validateBeforeSave() {
  for (const field of props.definition?.fields || []) {
    if (!isFieldVisible(field)) continue

    if (field.type === 'salary_steps') {
      for (const [index, item] of salarySteps(field).entries()) {
        const hasAny = ['label', 'duration_months', 'amount', 'notes'].some((key) =>
          String(item?.[key] ?? '').trim() !== '',
        )
        if (!hasAny) continue
        if (!(Number(item.duration_months) > 0)) {
          return `Condition ${index + 1}: duration must be greater than 0 months.`
        }
        if (!(Number(item.amount) >= 0)) {
          return `Condition ${index + 1}: amount must be 0 or greater.`
        }
      }
    }

    if (field.type === 'reviewer_assignment') {
      const missing = reviewerAssignmentFieldValue(field).find((item) => !item.user_id)
      if (missing) {
        return `Select a user for ${missing.role_label || missing.role}.`
      }
    }
  }

  return ''
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

  const validationError = validateBeforeSave()
  if (validationError) {
    saveState.value = 'error'
    window?.notify?.error && window.notify.error(validationError)
    return
  }

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

          <div
            v-else-if="field.type === 'review_list'"
            :key="`${field.key}-review-list`"
            :class="[
              'space-y-3 rounded-xl border border-slate-200 bg-slate-50/50 p-3',
              fieldColumnClass(field, 2),
            ]"
          >
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div class="text-sm font-semibold text-slate-800">{{ field.label }}</div>
                <div v-if="field.help" class="mt-1 text-xs text-slate-500">{{ field.help }}</div>
              </div>

              <div class="flex flex-wrap gap-2">
                <button
                  type="button"
                  class="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
                  @click="addReviewListItem(field)"
                >
                  Add Review
                </button>

                <button
                  v-if="
                    getNestedValue(form.payload, field.recommendationPath || 'recommendation', '') ===
                    'extend_probation'
                  "
                  type="button"
                  class="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-100"
                  @click="addExtensionReview(field)"
                >
                  Add Extension Checkpoint
                </button>
              </div>
            </div>

            <div v-if="reviewListFieldValue(field).length" class="space-y-2.5">
              <div
                v-for="(item, index) in reviewListFieldValue(field)"
                :key="`${field.key}-${item.key || index}`"
                class="rounded-xl border bg-white p-2.5 shadow-sm"
              >
                <div class="mb-2 flex items-center justify-between gap-3">
                  <div class="text-sm font-medium text-slate-700">
                    {{ item.label || `Review ${index + 1}` }}
                  </div>
                  <button
                    type="button"
                    class="rounded-md border border-rose-200 px-2.5 py-1 text-xs font-medium text-rose-600 hover:bg-rose-50"
                    @click="removeReviewListItem(field, index)"
                  >
                    Remove
                  </button>
                </div>

                <div class="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
                  <label class="block">
                    <span class="mb-1 block text-sm font-medium text-gray-700">Key</span>
                    <input
                      :value="item.key"
                      type="text"
                      class="w-full rounded-lg border px-2.5 py-1.5 text-sm"
                      placeholder="30"
                      @input="updateReviewListItem(field, index, 'key', $event.target.value)"
                    />
                  </label>

                  <label class="block">
                    <span class="mb-1 block text-sm font-medium text-gray-700">Label</span>
                    <input
                      :value="item.label"
                      type="text"
                      class="w-full rounded-lg border px-2.5 py-1.5 text-sm"
                      placeholder="30 Day Review"
                      @input="updateReviewListItem(field, index, 'label', $event.target.value)"
                    />
                  </label>

                  <label class="block">
                    <span class="mb-1 block text-sm font-medium text-gray-700">Due Date</span>
                    <input
                      :value="item.due_date"
                      type="date"
                      class="w-full rounded-lg border px-2.5 py-1.5 text-sm"
                      @input="updateReviewListItem(field, index, 'due_date', $event.target.value)"
                    />
                  </label>

                  <label class="block">
                    <span class="mb-1 block text-sm font-medium text-gray-700">Status</span>
                    <select
                      :value="item.status"
                      class="w-full rounded-lg border px-2.5 py-1.5 text-sm"
                      @change="updateReviewListItem(field, index, 'status', $event.target.value)"
                    >
                      <option value="pending">Pending</option>
                      <option value="completed">Completed</option>
                    </select>
                  </label>
                </div>

                <label class="mt-2 block">
                  <span class="mb-1 block text-sm font-medium text-gray-700">Note</span>
                  <textarea
                    :value="item.note"
                    class="min-h-[56px] w-full rounded-lg border px-2.5 py-1.5 text-sm"
                    placeholder="Add review feedback or concerns"
                    @input="updateReviewListItem(field, index, 'note', $event.target.value)"
                  />
                </label>
              </div>
            </div>

            <div
              v-else
              class="rounded-lg border border-dashed border-slate-300 bg-white px-3 py-3 text-sm text-slate-500"
            >
              No review checkpoint added yet.
            </div>
          </div>

          <div
            v-else-if="field.type === 'reviewer_assignment'"
            :key="`${field.key}-reviewer-assignment`"
            :class="['rounded-xl border border-slate-200 bg-slate-50/50 p-2.5', fieldColumnClass(field, 2)]"
          >
            <div class="mb-2.5 flex items-center justify-between gap-3">
              <div>
                <div class="text-sm font-semibold text-slate-800">{{ field.label }}</div>
                <div v-if="field.help" class="mt-1 text-xs text-slate-500">{{ field.help }}</div>
              </div>
              <div class="relative inline-block" v-if="field.reviewerTypes">
                <select
                  class="appearance-none rounded-lg border border-indigo-300 bg-indigo-50 px-3 py-1.5 text-sm font-medium text-indigo-700 hover:bg-indigo-100 pr-8"
                  @change="
                    (e) => {
                      const [role, label] = (e.target.value || '').split('|')
                      if (role) addReviewerAssignment(field, role, label)
                      e.target.value = ''
                    }
                  "
                >
                  <option value="">+ Add Reviewer</option>
                  <option
                    v-for="type in field.reviewerTypes"
                    :key="type.value"
                    :value="`${type.value}|${type.label}`"
                    :disabled="reviewerAssignmentFieldValue(field).some((a) => a.role === type.value)"
                  >
                    {{ type.label }}
                  </option>
                </select>
                <span class="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-indigo-600">
                  ▼
                </span>
              </div>
            </div>

            <div v-if="reviewerAssignmentFieldValue(field).length > 0" class="grid gap-2 md:grid-cols-2">
              <div
                v-for="assignment in reviewerAssignmentFieldValue(field)"
                :key="assignment.role"
                class="grid gap-2 rounded-lg border border-slate-200 bg-white p-2.5"
              >
                <div class="flex-1">
                  <div class="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                    {{ assignment.role_label }}
                  </div>
                  <div class="mt-1 flex flex-col gap-2">
                    <select
                      :value="assignment.user_id || ''"
                      class="w-full rounded-lg border px-2.5 py-1.5 text-sm"
                      @change="updateReviewerAssignmentUser(field, assignment.role, $event.target.value)"
                    >
                      <option value="">Select User</option>
                      <option
                        v-for="user in usersStore.items"
                        :key="user.id"
                        :value="user.id"
                      >
                        {{ user.name }} ({{ user.designation?.title || 'N/A' }})
                      </option>
                    </select>
                  </div>
                </div>
                <button
                  type="button"
                  class="justify-self-end rounded-lg bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100"
                  @click="removeReviewerAssignment(field, assignment.role)"
                >
                  Remove
                </button>
              </div>
            </div>

            <div
              v-else
              class="rounded-lg border border-dashed border-slate-300 bg-white px-3 py-3 text-sm text-slate-500"
            >
              No reviewers assigned. Click "Add Reviewer" to assign reviewers.
            </div>
          </div>

          <div
            v-else-if="field.type === 'reviewer_matrix'"
            :key="`${field.key}-reviewer-matrix`"
            :class="[
              'rounded-xl border border-slate-200 bg-slate-50/50 p-2.5',
              fieldColumnClass(field, 2),
            ]"
          >
            <div class="mb-2.5 flex items-start justify-between gap-3">
              <div>
                <div class="text-sm font-semibold text-slate-800">{{ field.label }}</div>
                <div v-if="field.help" class="mt-1 text-xs text-slate-500">{{ field.help }}</div>
              </div>
            </div>
            <div class="space-y-2.5">
              <div
                v-for="(slab, slabIndex) in reviewerMatrixSlabs(field)"
                :key="`${field.key}-${slab.key}`"
                class="overflow-hidden rounded-xl border bg-white shadow-sm"
              >
                <button
                  type="button"
                  class="flex w-full items-start justify-between gap-3 px-3 py-2 text-left"
                  :class="isReviewerMatrixSlabExpanded(field, slab.key) ? 'bg-blue-50/60' : 'bg-white'"
                  @click="toggleReviewerMatrixSlab(field, slab.key)"
                >
                  <div class="min-w-0">
                    <div class="text-sm font-semibold text-slate-800">
                      {{ reviewerMatrixSlabLabel(slab, slabIndex) }}
                    </div>
                    <div class="mt-0.5 text-xs text-slate-500">
                      {{ reviewerMatrixSlabSummary(field, slab.key).assigned }} assigned reviewers,
                      {{ reviewerMatrixSlabSummary(field, slab.key).completed }} completed,
                      {{ reviewerMatrixSlabSummary(field, slab.key).pending }} pending
                    </div>
                  </div>
                  <div class="rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em]" :class="isReviewerMatrixSlabExpanded(field, slab.key) ? 'border-blue-200 bg-blue-100 text-blue-700' : 'border-slate-200 bg-slate-50 text-slate-500'">
                    {{ isReviewerMatrixSlabExpanded(field, slab.key) ? 'Open' : 'Minimized' }}
                  </div>
                </button>

                <div v-if="isReviewerMatrixSlabExpanded(field, slab.key)" class="border-t">
                  <div class="overflow-x-auto">
                    <table class="min-w-full divide-y divide-slate-200 text-xs">
                      <thead class="bg-slate-100 text-slate-600">
                        <tr>
                          <th class="px-2.5 py-2 text-left font-semibold uppercase tracking-[0.08em]">Reviewer</th>
                          <th class="px-2.5 py-2 text-left font-semibold uppercase tracking-[0.08em]">Status</th>
                          <th class="px-2.5 py-2 text-left font-semibold uppercase tracking-[0.08em]">Note</th>
                          <th class="px-2.5 py-2 text-left font-semibold uppercase tracking-[0.08em]">Special Comment</th>
                        </tr>
                      </thead>
                      <tbody class="divide-y divide-slate-200 bg-white">
                        <tr
                          v-for="(row, index) in reviewerMatrixFieldValue(field)"
                          :key="`${slab.key}-${row.role}`"
                          class="hover:bg-slate-50"
                        >
                          <td class="px-2.5 py-2 font-medium text-slate-800">
                            <div>{{ row.label }}</div>
                            <div v-if="row.assigned && row.user_name" class="mt-0.5 text-xs text-slate-500">
                              {{ row.user_name }}
                            </div>
                          </td>
                          <td class="px-2.5 py-2">
                            <select
                              :value="reviewerMatrixSlabRowValue(row, slab.key, 'status')"
                              class="w-full rounded-lg border px-2 py-1.5 text-xs"
                              @change="updateReviewerMatrixSlabItem(field, index, slab.key, 'status', $event.target.value)"
                            >
                              <option value="pending">Pending</option>
                              <option value="completed">Completed</option>
                            </select>
                          </td>
                          <td class="px-2.5 py-2">
                            <textarea
                              :value="reviewerMatrixSlabRowValue(row, slab.key, 'note')"
                              class="min-h-[48px] w-full rounded-lg border px-2.5 py-1.5 text-xs"
                              placeholder="Reviewer note"
                              @input="updateReviewerMatrixSlabItem(field, index, slab.key, 'note', $event.target.value)"
                            />
                          </td>
                          <td class="px-2.5 py-2">
                            <textarea
                              :value="row.special_note"
                              class="min-h-[48px] w-full rounded-lg border px-2.5 py-1.5 text-xs"
                              placeholder="Special comments"
                              @input="updateReviewerMatrixItem(field, index, 'special_note', $event.target.value)"
                            />
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <div v-else class="space-y-2 border-t px-3 py-2.5">
                  <div class="flex flex-wrap gap-1.5">
                    <span
                      v-for="row in reviewerMatrixFieldValue(field)"
                      :key="`${slab.key}-${row.role}-chip`"
                      class="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-600"
                    >
                      {{ row.user_name || row.label }}
                    </span>
                    <span v-if="!reviewerMatrixFieldValue(field).length" class="text-xs text-slate-500">
                      No reviewers assigned in this slab yet.
                    </span>
                  </div>
                </div>
              </div>
            </div>
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
              :multiple="Boolean(field.multiple)"
              :searchBy="searchLifecycleUsers"
              :placeholder="field.multiple ? '-- SELECT USERS --' : '-- SELECT USER --'"
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
                v-for="item in stageSalaryTypes(field)"
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
