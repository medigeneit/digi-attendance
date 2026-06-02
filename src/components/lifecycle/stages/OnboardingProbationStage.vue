<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import SelectDropdown from '@/components/SelectDropdown.vue'
import UserChip from '@/components/user/UserChip.vue'
import { useAuthStore } from '@/stores/auth'
import { useLifecycleStore } from '@/stores/lifecycle'
import { useLifecycleUsersStore } from '@/stores/lifecycleUsers'

const props = defineProps({
  lifecycleId: { type: Number, default: 0 },
  stage: { type: Object, required: true },
  employee: { type: Object, default: null },
})

const store = useLifecycleStore()
const usersStore = useLifecycleUsersStore()
const authStore = useAuthStore()
const saving = ref(false)
const uploading = ref({})
const saveState = ref('idle')
const lastSavedAt = ref('')
const baselineSnapshot = ref('')
const reviewerMatrixExpandedKey = ref('')

const form = reactive({
  status: 'not_started',
  remarks: '',
  payload: {},
})

const reviewerTypes = [
  { value: 'incharge', label: 'Incharge' },
  { value: 'op_admin', label: 'OP Admin' },
  { value: 'coordinator', label: 'Coordinator' },
  { value: 'hr', label: 'HR' },
  { value: 'cc', label: 'Center Coordinator' },
]

const reviewerSlabs = [
  { key: '30', label: '30 Day Review', subtitle: '1st slab' },
  { key: '60', label: '60 Day Review', subtitle: '2nd slab' },
  { key: 'final', label: 'Final Review', subtitle: 'Final slab' },
]

const recommendationOptions = [
  { value: 'confirm', label: 'Confirm' },
  { value: 'extend_probation', label: 'Extend Probation' },
  { value: 'terminate', label: 'Terminate' },
]

onMounted(() => {
  if (!Array.isArray(usersStore.items) || !usersStore.items.length) {
    usersStore.fetchUsers({ all: 1 })
  }
})

function toNumber(value) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function addMonthsToIsoDate(value, monthsToAdd) {
  if (!value) return ''

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  const target = new Date(date)
  target.setMonth(target.getMonth() + toNumber(monthsToAdd))

  if (target.getDate() !== date.getDate()) {
    target.setDate(0)
  }

  return target.toISOString().slice(0, 10)
}

function toDateAtStartOfDay(value) {
  if (!value) return null

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null

  date.setHours(0, 0, 0, 0)
  return date
}

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

function createReviewItem({
  key = '',
  label = '',
  due_date = '',
  status = 'pending',
  note = '',
} = {}) {
  return {
    key: String(key || '').trim(),
    label: String(label || '').trim(),
    due_date: due_date || '',
    status: status || 'pending',
    note: note || '',
  }
}

function normalizeReviewerRoles(value) {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item || '').trim())
      .filter((item) => item !== '')
      .map((item) => item.toLowerCase())
      .filter((item, index, arr) => arr.indexOf(item) === index)
  }

  const single = String(value || '').trim().toLowerCase()
  return single ? [single] : []
}

function normalizeReviewerMatrix(items = []) {
  return Array.isArray(items)
    ? items.map((item) => ({
        role: String(item?.role || '').trim().toLowerCase(),
        role_label: String(item?.role_label || item?.label || '').trim(),
        user_id: item?.user_id ?? null,
        user_name: String(item?.user_name || '').trim(),
        slab_30_status: String(item?.slab_30_status || 'pending').toLowerCase(),
        slab_30_note: String(item?.slab_30_note || ''),
        slab_30_special_note: String(item?.slab_30_special_note ?? item?.special_note ?? ''),
        slab_30_special_note_updated_by_id: item?.slab_30_special_note_updated_by_id ?? item?.special_note_updated_by_id ?? null,
        slab_30_special_note_updated_by_name: String(item?.slab_30_special_note_updated_by_name ?? item?.special_note_updated_by_name ?? ''),
        slab_30_updated_by_id: item?.slab_30_updated_by_id ?? null,
        slab_30_updated_by_name: String(item?.slab_30_updated_by_name || ''),
        slab_60_status: String(item?.slab_60_status || 'pending').toLowerCase(),
        slab_60_note: String(item?.slab_60_note || ''),
        slab_60_special_note: String(item?.slab_60_special_note ?? item?.special_note ?? ''),
        slab_60_special_note_updated_by_id: item?.slab_60_special_note_updated_by_id ?? item?.special_note_updated_by_id ?? null,
        slab_60_special_note_updated_by_name: String(item?.slab_60_special_note_updated_by_name ?? item?.special_note_updated_by_name ?? ''),
        slab_60_updated_by_id: item?.slab_60_updated_by_id ?? null,
        slab_60_updated_by_name: String(item?.slab_60_updated_by_name || ''),
        slab_final_status: String(item?.slab_final_status || 'pending').toLowerCase(),
        slab_final_note: String(item?.slab_final_note || ''),
        slab_final_special_note: String(item?.slab_final_special_note ?? item?.special_note ?? ''),
        slab_final_special_note_updated_by_id: item?.slab_final_special_note_updated_by_id ?? item?.special_note_updated_by_id ?? null,
        slab_final_special_note_updated_by_name: String(item?.slab_final_special_note_updated_by_name ?? item?.special_note_updated_by_name ?? ''),
        slab_final_updated_by_id: item?.slab_final_updated_by_id ?? null,
        slab_final_updated_by_name: String(item?.slab_final_updated_by_name || ''),
      }))
    : []
}

function normalizeReviewItem(item = {}, fallback = {}) {
  return createReviewItem({
    key: item?.key ?? fallback.key,
    label: item?.label ?? fallback.label,
    due_date: item?.due_date ?? fallback.due_date,
    status: item?.status ?? fallback.status ?? 'pending',
    note: item?.note ?? fallback.note ?? '',
  })
}

function buildDefaultReviews(startDate, totalMonths) {
  const endDate = addMonthsToIsoDate(startDate, totalMonths)
  const defaults = [
    createReviewItem({
      key: '30',
      label: '30 Day Review',
      due_date: addMonthsToIsoDate(startDate, 1),
    }),
    createReviewItem({
      key: '60',
      label: '60 Day Review',
      due_date: addMonthsToIsoDate(startDate, 2),
    }),
    createReviewItem({
      key: 'final_review',
      label: 'Final Review',
      due_date: endDate,
    }),
  ]

  return defaults.filter((item) => item.label || item.due_date)
}

function legacyReviewItems(payload, startDate, totalMonths) {
  const endDate = addMonthsToIsoDate(startDate, totalMonths)
  const legacy = [
    createReviewItem({
      key: '30',
      label: '30 Day Review',
      due_date: addMonthsToIsoDate(startDate, 1),
      status: payload?.review_30_status || 'pending',
      note: payload?.review_30_note || '',
    }),
    createReviewItem({
      key: '60',
      label: '60 Day Review',
      due_date: addMonthsToIsoDate(startDate, 2),
      status: payload?.review_60_status || 'pending',
      note: payload?.review_60_note || '',
    }),
    createReviewItem({
      key: 'final_review',
      label: 'Final Review',
      due_date: endDate,
      status: payload?.final_review_status || 'pending',
      note: payload?.final_review_note || '',
    }),
  ]

  return legacy.filter((item) => item.label || item.due_date || item.note)
}

function normalizeProbationPayload(payload = {}, employee = {}) {
  const baseMonths = toNumber(employee.provisional_month)
  const currentExtendedMonths = toNumber(employee.extended_provisional_month)
  const explicitExtendedMonths = payload.extended_months
  const recommendation = String(payload.recommendation || '').trim()
  const startDate = payload.probation_start_date || employee.joining_date || ''
  const extendedMonths =
    recommendation === 'extend_probation'
      ? Math.max(toNumber(explicitExtendedMonths), toNumber(currentExtendedMonths))
      : toNumber(explicitExtendedMonths) || currentExtendedMonths
  const totalMonths = baseMonths + extendedMonths
  const probationEndDate = payload.probation_end_date || addMonthsToIsoDate(startDate, totalMonths)

  let reviews = Array.isArray(payload.reviews) ? payload.reviews.map((item) => normalizeReviewItem(item)) : []

  if (!reviews.length) {
    reviews = legacyReviewItems(payload, startDate, totalMonths)
  }

  if (!reviews.length) {
    reviews = buildDefaultReviews(startDate, totalMonths)
  }

  const normalizedReviews = reviews
    .map((item, index) =>
      normalizeReviewItem(item, {
        key: `review-${index + 1}`,
        label: `Review ${index + 1}`,
      }),
    )
    .filter((item) => item.key || item.label || item.due_date || item.note)

  const reviewerAssignments = Array.isArray(payload.reviewer_assignments) ? payload.reviewer_assignments : []
  const reviewerRoles = reviewerAssignments.length
    ? reviewerAssignments.map((a) => String(a.role || '').trim().toLowerCase()).filter(Boolean)
    : normalizeReviewerRoles(payload.reviewer_ids ?? payload.reviewer_id ?? [])

  const nextPayload = {
    ...payload,
    reviewer_ids: reviewerRoles,
    reviewer_id: reviewerRoles[0] ?? null,
    reviewer_assignments: reviewerAssignments,
    probation_start_date: startDate,
    probation_end_date: probationEndDate,
    extended_months: extendedMonths,
    reviews: normalizedReviews,
    reviewer_matrix: normalizeReviewerMatrix(payload.reviewer_matrix ?? reviewerAssignments ?? []),
    role_notes: {
      reviewer_note: payload?.role_notes?.reviewer_note ?? payload?.supervisor_remarks ?? '',
      hr_internal_note: payload?.role_notes?.hr_internal_note ?? payload?.hr_remarks ?? '',
      final_summary: payload?.role_notes?.final_summary ?? payload?.final_summary ?? '',
    },
  }

  normalizedReviews.forEach((item) => {
    const key = String(item.key || '').toLowerCase()

    if (key === '30') {
      nextPayload.review_30_status = item.status || 'pending'
      nextPayload.review_30_note = item.note || ''
    } else if (key === '60') {
      nextPayload.review_60_status = item.status || 'pending'
      nextPayload.review_60_note = item.note || ''
    } else if (key === 'final_review' || key === 'final') {
      nextPayload.final_review_status = item.status || 'pending'
      nextPayload.final_review_note = item.note || ''
    }
  })

  if (recommendation === 'extend_probation') {
    const extensionReview = createReviewItem({
      key: 'extension_review',
      label: 'Extension Review',
      due_date: probationEndDate,
      status: 'pending',
      note: '',
    })

    if (!nextPayload.reviews.some((item) => String(item.key || '').toLowerCase() === 'extension_review')) {
      nextPayload.reviews = [...nextPayload.reviews, extensionReview]
    }
  }

  return nextPayload
}

function buildNormalizedStage() {
  const currentEmployee = props.employee || {}
  const record = props.stage?.record || null
  const normalizedRecord = record
    ? {
        ...record,
        payload: normalizeProbationPayload(record.payload || {}, currentEmployee),
      }
    : record

  return {
    ...props.stage,
    record: normalizedRecord,
  }
}

const defaultPayload = computed(() => {
  const currentEmployee = props.employee || {}
  const baseMonths = toNumber(currentEmployee.provisional_month)
  const extendedMonths = toNumber(currentEmployee.extended_provisional_month)
  const totalMonths = toNumber(currentEmployee.probation_months_total) || baseMonths + extendedMonths
  const startDate = currentEmployee.joining_date || ''
  const endDate = addMonthsToIsoDate(startDate, totalMonths)

  return {
    probation_start_date: startDate,
    probation_end_date: endDate,
    reviewer_assignments: [],
    recommendation: '',
    extended_months: extendedMonths || 0,
    reviews: buildDefaultReviews(startDate, totalMonths),
    reviewer_matrix: normalizeReviewerMatrix([]),
    role_notes: {
      reviewer_note: '',
      hr_internal_note: '',
      final_summary: '',
    },
  }
})

const normalizedStage = computed(() => buildNormalizedStage())

const reviewerAssignments = computed(() => {
  const payload = normalizedStage.value?.record?.payload || defaultPayload.value
  return Array.isArray(payload.reviewer_assignments) ? payload.reviewer_assignments : []
})

const isSuperAdmin = computed(() => String(authStore.user?.role || '').toLowerCase() === 'super_admin')

const isCurrentUserAssignedReviewer = computed(() => {
  const currentUserId = Number(authStore.user?.id)
  if (!currentUserId) return false

  return reviewerAssignments.value.some((item) => Number(item?.user_id) === currentUserId)
})

const canManageProbation = computed(() => isSuperAdmin.value)
const canSeeInternalDecisionFields = computed(() => isSuperAdmin.value)

const summaryItems = computed(() => {
  const currentEmployee = props.employee || {}
  const payload = normalizedStage.value?.record?.payload || defaultPayload.value
  const baseMonths = toNumber(currentEmployee.provisional_month)
  const extendedMonths = toNumber(payload.extended_months ?? currentEmployee.extended_provisional_month)
  const totalMonths = toNumber(currentEmployee.probation_months_total) || baseMonths + extendedMonths
  const calculatedEndDate = payload.probation_end_date || addMonthsToIsoDate(currentEmployee.joining_date, totalMonths)
  const reviews = Array.isArray(payload.reviews) ? payload.reviews : []
  const pendingReviews = reviews.filter((item) => String(item.status || '').toLowerCase() === 'pending').length
  const completedReviews = reviews.filter((item) => String(item.status || '').toLowerCase() === 'completed').length
  
  // Get reviewer label from assignments
  const assignments = reviewerAssignments.value
  const reviewerLabel = assignments.length > 0
    ? assignments.map((a) => a.user_name || a.role_label || a.role).join(', ')
    : 'Unassigned'

  const items = [
    { label: 'Base Probation', value: `${baseMonths} month${baseMonths === 1 ? '' : 's'}` },
    {
      label: 'Extended Probation',
      value: `${extendedMonths} month${extendedMonths === 1 ? '' : 's'}`,
    },
    { label: 'Total Probation', value: `${totalMonths} month${totalMonths === 1 ? '' : 's'}` },
    { label: 'Calculated End Date', value: formatDateLabel(calculatedEndDate) || 'N/A' },
    {
      label: 'Assigned Reviewers',
      value: reviewerLabel,
    },
    {
      label: 'Review Checkpoints',
      value: `${reviews.length} total, ${pendingReviews} pending, ${completedReviews} completed`,
    },
  ]

  return isCurrentUserAssignedReviewer.value
    ? items.filter((item) => item.label !== 'Assigned Reviewers')
    : items
})

const probationSummary = computed(() => {
  const currentEmployee = props.employee || {}
  const payload = normalizedStage.value?.record?.payload || defaultPayload.value
  const baseMonths = toNumber(currentEmployee.provisional_month)
  const extendedMonths = toNumber(payload.extended_months ?? currentEmployee.extended_provisional_month)
  const totalMonths = toNumber(currentEmployee.probation_months_total) || baseMonths + extendedMonths
  const calculatedEndDate = payload.probation_end_date || addMonthsToIsoDate(currentEmployee.joining_date, totalMonths)
  const completed = reviewerSlabs.filter((slab) => reviewerSlabSummary(slab.key).pending === 0 && reviewerMatrixRows.value.length).length

  return {
    baseMonths,
    extendedMonths,
    totalMonths,
    calculatedEndDate: formatDateLabel(calculatedEndDate) || 'N/A',
    checkpointText: `${completed} / ${reviewerSlabs.length} done`,
  }
})

const localReviewerAssignments = computed(() =>
  Array.isArray(form.payload.reviewer_assignments)
    ? form.payload.reviewer_assignments.map((item) => normalizeReviewerAssignment(item))
    : [],
)

const reviewerMatrixRows = computed(() =>
  syncReviewerMatrixWithAssignments(form.payload.reviewer_matrix, localReviewerAssignments.value),
)

const activeReviewerSlabKey = computed(() => {
  const payload = normalizedStage.value?.record?.payload || defaultPayload.value
  const startDate = payload.probation_start_date || props.employee?.joining_date || ''
  const firstCheckpoint = toDateAtStartOfDay(addMonthsToIsoDate(startDate, 1))
  const secondCheckpoint = toDateAtStartOfDay(addMonthsToIsoDate(startDate, 2))
  const today = toDateAtStartOfDay(new Date())

  if (!today || !firstCheckpoint || !secondCheckpoint) return reviewerSlabs[0]?.key || ''
  if (today >= secondCheckpoint) return 'final'
  if (today >= firstCheckpoint) return '60'
  return '30'
})

const expandedSlabKey = computed(() => reviewerMatrixExpandedKey.value || activeReviewerSlabKey.value)
const activeSlabIndex = computed(() =>
  Math.max(0, reviewerSlabs.findIndex((slab) => slab.key === activeReviewerSlabKey.value)),
)
const isExtendProbation = computed(() => normalizeDecisionValue(form.payload.recommendation) === 'extend_probation')
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
  () => [normalizedStage.value, defaultPayload.value],
  ([stage, defaults]) => {
    form.status = stage?.record?.status || stage?.data_status || 'not_started'
    form.remarks = stage?.record?.remarks || ''
    form.payload = mergePayloadDefaults(defaults || {}, stage?.record?.payload || {})
    form.payload.reviewer_matrix = syncReviewerMatrixWithAssignments(
      form.payload.reviewer_matrix,
      form.payload.reviewer_assignments,
    )
    reviewerMatrixExpandedKey.value = activeReviewerSlabKey.value
    baselineSnapshot.value = createFormSnapshot()
    saveState.value = 'idle'
    lastSavedAt.value = formatSaveTimestamp(stage?.record?.updated_at || stage?.updated_at || '')
  },
  { immediate: true, deep: true },
)

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

function createFormSnapshot() {
  return JSON.stringify({
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

function normalizeDecisionValue(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

function normalizeReviewerAssignment(item = {}, defaults = {}) {
  return {
    role: String(item?.role ?? defaults.role ?? '').trim().toLowerCase(),
    role_label: String(item?.role_label ?? defaults.role_label ?? '').trim(),
    user_id: item?.user_id ?? defaults.user_id ?? null,
    user_name: String(item?.user_name ?? defaults.user_name ?? '').trim(),
  }
}

function syncReviewerMatrixWithAssignments(matrix = [], assignments = []) {
  const rows = Array.isArray(assignments) ? assignments : []
  const current = Array.isArray(matrix) ? matrix : []

  return rows.map((assignment) => {
    const normalizedAssignment = normalizeReviewerAssignment(assignment)
    const existing = current.find(
      (item) => String(item?.role || '').toLowerCase() === normalizedAssignment.role,
    )

    return normalizeReviewerMatrixItem(existing || {}, {
      role: normalizedAssignment.role,
      label: normalizedAssignment.user_name || normalizedAssignment.role_label || normalizedAssignment.role,
      assigned: Boolean(normalizedAssignment.user_id),
      user_id: normalizedAssignment.user_id,
      user_name: normalizedAssignment.user_name,
    })
  })
}

function normalizeReviewerMatrixItem(item = {}, defaults = {}) {
  return {
    role: String(item?.role ?? defaults.role ?? '').trim().toLowerCase(),
    label: String(item?.label ?? defaults.label ?? '').trim(),
    assigned: item?.assigned ?? defaults.assigned ?? true,
    user_id: item?.user_id ?? defaults.user_id ?? null,
    user_name: String(item?.user_name ?? defaults.user_name ?? '').trim(),
    slab_30_status: String(item?.slab_30_status ?? defaults.slab_30_status ?? 'pending').toLowerCase(),
    slab_30_note: String(item?.slab_30_note ?? defaults.slab_30_note ?? ''),
    slab_30_special_note: String(item?.slab_30_special_note ?? defaults.slab_30_special_note ?? item?.special_note ?? defaults.special_note ?? ''),
    slab_30_special_note_updated_by_id: item?.slab_30_special_note_updated_by_id ?? defaults.slab_30_special_note_updated_by_id ?? item?.special_note_updated_by_id ?? defaults.special_note_updated_by_id ?? null,
    slab_30_special_note_updated_by_name: String(item?.slab_30_special_note_updated_by_name ?? defaults.slab_30_special_note_updated_by_name ?? item?.special_note_updated_by_name ?? defaults.special_note_updated_by_name ?? ''),
    slab_30_updated_by_id: item?.slab_30_updated_by_id ?? defaults.slab_30_updated_by_id ?? null,
    slab_30_updated_by_name: String(item?.slab_30_updated_by_name ?? defaults.slab_30_updated_by_name ?? ''),
    slab_60_status: String(item?.slab_60_status ?? defaults.slab_60_status ?? 'pending').toLowerCase(),
    slab_60_note: String(item?.slab_60_note ?? defaults.slab_60_note ?? ''),
    slab_60_special_note: String(item?.slab_60_special_note ?? defaults.slab_60_special_note ?? item?.special_note ?? defaults.special_note ?? ''),
    slab_60_special_note_updated_by_id: item?.slab_60_special_note_updated_by_id ?? defaults.slab_60_special_note_updated_by_id ?? item?.special_note_updated_by_id ?? defaults.special_note_updated_by_id ?? null,
    slab_60_special_note_updated_by_name: String(item?.slab_60_special_note_updated_by_name ?? defaults.slab_60_special_note_updated_by_name ?? item?.special_note_updated_by_name ?? defaults.special_note_updated_by_name ?? ''),
    slab_60_updated_by_id: item?.slab_60_updated_by_id ?? defaults.slab_60_updated_by_id ?? null,
    slab_60_updated_by_name: String(item?.slab_60_updated_by_name ?? defaults.slab_60_updated_by_name ?? ''),
    slab_final_status: String(item?.slab_final_status ?? defaults.slab_final_status ?? 'pending').toLowerCase(),
    slab_final_note: String(item?.slab_final_note ?? defaults.slab_final_note ?? ''),
    slab_final_special_note: String(item?.slab_final_special_note ?? defaults.slab_final_special_note ?? item?.special_note ?? defaults.special_note ?? ''),
    slab_final_special_note_updated_by_id: item?.slab_final_special_note_updated_by_id ?? defaults.slab_final_special_note_updated_by_id ?? item?.special_note_updated_by_id ?? defaults.special_note_updated_by_id ?? null,
    slab_final_special_note_updated_by_name: String(item?.slab_final_special_note_updated_by_name ?? defaults.slab_final_special_note_updated_by_name ?? item?.special_note_updated_by_name ?? defaults.special_note_updated_by_name ?? ''),
    slab_final_updated_by_id: item?.slab_final_updated_by_id ?? defaults.slab_final_updated_by_id ?? null,
    slab_final_updated_by_name: String(item?.slab_final_updated_by_name ?? defaults.slab_final_updated_by_name ?? ''),
  }
}

function canEditReviewerMatrixRow(row = {}) {
  if (isSuperAdmin.value) return true

  const currentUserId = Number(authStore.user?.id)
  return Boolean(currentUserId && Number(row?.user_id) === currentUserId)
}

function setPayloadValue(key, value) {
  form.payload = { ...(form.payload || {}), [key]: value }
}

function setRoleNote(key, value) {
  form.payload = {
    ...(form.payload || {}),
    role_notes: {
      ...(form.payload?.role_notes || {}),
      [key]: value,
    },
  }
}

function addReviewerAssignment(role, roleLabel) {
  if (!canManageProbation.value) return

  const current = localReviewerAssignments.value
  if (current.some((item) => item.role === role)) return

  const next = [
    ...current,
    normalizeReviewerAssignment({}, { role, role_label: roleLabel, user_id: null, user_name: '' }),
  ]
  setPayloadValue('reviewer_assignments', next)
  setPayloadValue('reviewer_matrix', syncReviewerMatrixWithAssignments(form.payload.reviewer_matrix, next))
}

function removeReviewerAssignment(role) {
  if (!canManageProbation.value) return

  const next = localReviewerAssignments.value.filter((item) => item.role !== role)
  setPayloadValue('reviewer_assignments', next)
  setPayloadValue('reviewer_matrix', syncReviewerMatrixWithAssignments(form.payload.reviewer_matrix, next))
}

function updateReviewerAssignmentUser(role, userId) {
  if (!canManageProbation.value) return

  const selected = usersStore.items.find((item) => Number(item.id) === Number(userId))
  const next = localReviewerAssignments.value.map((item) =>
    item.role === role
      ? {
          ...item,
          user_id: userId ? Number(userId) : null,
          user_name: selected?.name || '',
        }
      : item,
  )
  setPayloadValue('reviewer_assignments', next)
  setPayloadValue('reviewer_matrix', syncReviewerMatrixWithAssignments(form.payload.reviewer_matrix, next))
}

function updateReviewerMatrixRow(index, key, value) {
  const currentRow = reviewerMatrixRows.value[index]
  if (!canEditReviewerMatrixRow(currentRow)) return

  const next = reviewerMatrixRows.value.map((item, itemIndex) =>
    itemIndex === index ? { ...item, [key]: value } : item,
  )
  setPayloadValue('reviewer_matrix', next)
}

function reviewerSlabSummary(slabKey) {
  const total = reviewerMatrixRows.value.length
  const assigned = reviewerMatrixRows.value.filter((row) => row.assigned !== false).length
  const completed = reviewerMatrixRows.value.filter(
    (row) => String(row?.[`slab_${slabKey}_status`] || '').toLowerCase() === 'completed',
  ).length
  return { total, assigned, completed, pending: Math.max(0, total - completed) }
}

function reviewerSlabLabel(slab) {
  return `${slab.label} ${slab.subtitle}`
}

function roleLabel(role) {
  const match = reviewerTypes.find((item) => item.value === role)
  return match?.label || String(role || '').replace(/_/g, ' ').toUpperCase()
}

function reviewerInitials(name) {
  return String(name || '--')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('') || '--'
}

function statusTone(status) {
  const value = String(status || '').toLowerCase()
  if (value === 'completed') return 'border-emerald-300 bg-emerald-50 text-emerald-700'
  if (value === 'blocked') return 'border-rose-300 bg-rose-50 text-rose-700'
  return 'border-amber-300 bg-amber-50 text-amber-700'
}

function reviewerSlabTone(slabKey, isExpanded = false) {
  const tones = {
    30: {
      card: 'border-sky-200 bg-sky-50/60',
      header: isExpanded ? 'bg-sky-100/80' : 'bg-sky-50/80',
      title: 'text-sky-900',
      meta: 'text-sky-700',
      badge: isExpanded
        ? 'border-sky-300 bg-sky-200 text-sky-800'
        : 'border-sky-200 bg-white text-sky-700',
      tableHead: 'bg-sky-50 text-sky-700',
    },
    60: {
      card: 'border-violet-200 bg-violet-50/60',
      header: isExpanded ? 'bg-violet-100/80' : 'bg-violet-50/80',
      title: 'text-violet-900',
      meta: 'text-violet-700',
      badge: isExpanded
        ? 'border-violet-300 bg-violet-200 text-violet-800'
        : 'border-violet-200 bg-white text-violet-700',
      tableHead: 'bg-violet-50 text-violet-700',
    },
    final: {
      card: 'border-emerald-200 bg-emerald-50/60',
      header: isExpanded ? 'bg-emerald-100/80' : 'bg-emerald-50/80',
      title: 'text-emerald-900',
      meta: 'text-emerald-700',
      badge: isExpanded
        ? 'border-emerald-300 bg-emerald-200 text-emerald-800'
        : 'border-emerald-200 bg-white text-emerald-700',
      tableHead: 'bg-emerald-50 text-emerald-700',
    },
  }

  return tones[slabKey] || tones['30']
}

function searchLifecycleUsers(options, term) {
  const needle = (term || '').trim().toLowerCase()
  if (!needle) return Array.isArray(options) ? [...options] : []

  if (needle.length >= 2) {
    usersStore.searchUsers(needle, { all: 1, limit: 50 })
  }

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

function fileUrl(file) {
  return file?.url || file?.path || '#'
}

async function onFileChange(event) {
  const file = event?.target?.files?.[0]
  if (!file) return

  uploading.value = { ...uploading.value, assessment_form_attachment: true }

  try {
    const doc = await store.uploadDocument(file)
    setPayloadValue('assessment_form_attachment', doc)
    window?.notify?.success && window.notify.success('Attachment uploaded')
  } catch (error) {
    window?.notify?.error && window.notify.error('Attachment upload failed')
  } finally {
    uploading.value = { ...uploading.value, assessment_form_attachment: false }
    if (event?.target) event.target.value = ''
  }
}

function clearFile() {
  setPayloadValue('assessment_form_attachment', null)
}

function validateBeforeSave() {
  if (canManageProbation.value) {
    const missing = localReviewerAssignments.value.find((item) => !item.user_id)
    if (missing) return `Select a user for ${missing.role_label || missing.role}.`
  }

  if (isExtendProbation.value && !(Number(form.payload.extended_months) > 0)) {
    return 'Extended Months must be greater than 0.'
  }

  return ''
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
      payload: {
        ...form.payload,
        reviewer_matrix: reviewerMatrixRows.value,
      },
      remarks: canSeeInternalDecisionFields.value ? form.remarks || null : null,
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
  <section class="rounded-lg border bg-white shadow-sm">
    <div class="border-b px-3 py-2">
      <h2 class="inline-flex rounded-md bg-blue-100 px-2 py-1 text-[12px] font-black uppercase tracking-[0.18em] text-blue-800">
        Probation Tracking
      </h2>
    </div>

    <div class="space-y-3 px-3 py-2 text-[12px]">
      <div class="grid gap-2 rounded-lg border-2 border-slate-800 bg-[#fffdf8] px-3 py-2 shadow-sm sm:grid-cols-2 xl:grid-cols-4">
        <div>
          <div class="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Base Probation</div>
          <div class="mt-0.5 text-base font-black text-slate-950">{{ probationSummary.baseMonths }} months</div>
        </div>
        <div>
          <div class="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Extended</div>
          <div class="mt-0.5 text-base font-black text-slate-950">{{ probationSummary.extendedMonths }} months</div>
        </div>
        <div>
          <div class="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Calculated End</div>
          <div class="mt-0.5 text-base font-black text-slate-950">{{ probationSummary.calculatedEndDate }}</div>
        </div>
        <div>
          <div class="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Checkpoints</div>
          <div class="mt-0.5 text-base font-black text-slate-950">{{ probationSummary.checkpointText }}</div>
        </div>
      </div>

      <div>
        <div class="mb-1.5 inline-flex rounded bg-blue-100 px-2 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-blue-800">
          Review Timeline
        </div>
        <div class="grid gap-2 lg:grid-cols-3">
          <button
            v-for="(slab, index) in reviewerSlabs"
            :key="slab.key"
            type="button"
            class="relative rounded-lg border-2 bg-white px-3 py-2 text-left transition"
            :class="activeReviewerSlabKey === slab.key
              ? 'border-blue-500 bg-blue-50 shadow-sm'
              : 'border-slate-200 hover:border-slate-300'"
            @click="reviewerMatrixExpandedKey = slab.key"
          >
            <span
              v-if="index < reviewerSlabs.length - 1"
              class="pointer-events-none absolute -right-4 top-1/2 z-10 hidden h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border border-slate-300 bg-white text-sm font-black text-slate-700 shadow-sm lg:inline-flex"
            >
              →
            </span>
            <div class="text-[10px] font-bold uppercase tracking-[0.16em]" :class="activeReviewerSlabKey === slab.key ? 'text-blue-600' : 'text-slate-400'">
              {{ activeReviewerSlabKey === slab.key ? 'Open now' : index < activeSlabIndex ? 'Done' : 'Upcoming' }}
            </div>
            <div class="mt-1 text-sm font-black text-slate-950">{{ slab.label }} · {{ slab.subtitle }}</div>
            <div class="mt-1 text-xs text-slate-500">
              {{ reviewerSlabSummary(slab.key).completed }}/{{ reviewerSlabSummary(slab.key).assigned }} reviewers
            </div>
          </button>
        </div>
      </div>

      <div class="rounded-lg border border-slate-200 bg-[#fffdf8] p-2">
        <div class="mb-1.5 flex flex-wrap items-center justify-between gap-2">
          <div class="inline-flex rounded bg-emerald-100 px-2 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-emerald-800">
            Assigned Reviewers · tap a cell to set status
          </div>
          <div v-if="canManageProbation" class="flex flex-wrap gap-1">
            <button
              v-for="type in reviewerTypes"
              :key="type.value"
              type="button"
              class="rounded-full border border-slate-300 bg-white px-2 py-0.5 text-[11px] font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              :disabled="localReviewerAssignments.some((item) => item.role === type.value)"
              @click="addReviewerAssignment(type.value, type.label)"
            >
              + {{ type.label }}
            </button>
          </div>
        </div>

        <div class="overflow-x-auto">
          <table class="min-w-full border-y border-slate-800 text-left text-xs">
            <thead class="border-b border-slate-800 text-[10px] uppercase tracking-[0.18em] text-slate-500">
              <tr>
                <th class="px-2 py-2">Role</th>
                <th class="min-w-[220px] px-2 py-2">Reviewer</th>
                <th v-for="slab in reviewerSlabs" :key="`head-${slab.key}`" class="px-2 py-2 text-center">
                  {{ slab.label.replace(' Review', '') }}
                </th>
                <th class="min-w-[190px] px-2 py-2">Note</th>
                <th v-if="canManageProbation" class="w-20 px-2 py-2"></th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-200 bg-white/70">
              <tr v-for="(row, index) in reviewerMatrixRows" :key="row.role">
                <td class="px-2 py-2 font-bold uppercase text-slate-800">{{ roleLabel(row.role) }}</td>
                <td class="px-2 py-2">
                  <div v-if="canManageProbation" class="min-w-[210px]">
                    <SelectDropdown
                      :model-value="row.user_id"
                      :options="usersStore.items"
                      label="name"
                      :searchBy="searchLifecycleUsers"
                      placeholder="-- SELECT USER --"
                      class="h-8 w-full text-xs"
                      clearable
                      searchable
                      @update:model-value="updateReviewerAssignmentUser(row.role, $event)"
                    >
                      <template #option="{ option }">
                        <UserChip :user="option || {}" class="relative w-full overflow-hidden border" />
                      </template>
                      <template #selected-option="{ option }">
                        <UserChip v-if="option" :user="option || {}" />
                      </template>
                    </SelectDropdown>
                  </div>
                  <div v-else class="flex items-center gap-2">
                    <span class="inline-flex h-7 w-7 items-center justify-center rounded-md border-2 border-slate-700 bg-blue-50 text-[10px] font-bold text-blue-700">
                      {{ reviewerInitials(row.user_name || row.label) }}
                    </span>
                    <span class="font-semibold text-slate-800">{{ row.user_name || row.label || 'Unassigned' }}</span>
                  </div>
                </td>
                <td v-for="slab in reviewerSlabs" :key="`${row.role}-${slab.key}`" class="px-2 py-2 text-center">
                  <select
                    :value="row[`slab_${slab.key}_status`] || 'pending'"
                    class="h-7 rounded-full border px-2 text-[11px] font-semibold disabled:cursor-not-allowed disabled:bg-slate-100"
                    :class="statusTone(row[`slab_${slab.key}_status`])"
                    :disabled="!canEditReviewerMatrixRow(row)"
                    @change="updateReviewerMatrixRow(index, `slab_${slab.key}_status`, $event.target.value)"
                  >
                    <option value="pending">Pending</option>
                    <option value="completed">Done</option>
                    <option value="blocked">Blocked</option>
                  </select>
                </td>
                <td class="px-2 py-2">
                  <textarea
                    :value="row[`slab_${expandedSlabKey}_note`] || ''"
                    class="min-h-[32px] w-full rounded-md border px-2 py-1 text-xs disabled:bg-slate-100"
                    :disabled="!canEditReviewerMatrixRow(row)"
                    placeholder="Reviewer note"
                    @input="updateReviewerMatrixRow(index, `slab_${expandedSlabKey}_note`, $event.target.value)"
                  />
                </td>
                <td v-if="canManageProbation" class="px-2 py-2 text-right">
                  <button
                    type="button"
                    class="rounded border border-rose-200 px-2 py-1 text-[11px] font-semibold text-rose-600 hover:bg-rose-50"
                    @click="removeReviewerAssignment(row.role)"
                  >
                    Remove
                  </button>
                </td>
              </tr>
              <tr v-if="!reviewerMatrixRows.length">
                <td colspan="6" class="px-3 py-6 text-center text-sm text-slate-500">
                  No reviewer assigned yet.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="grid gap-2 md:grid-cols-2">
        <div class="rounded-lg border px-3 py-2">
          <div class="mb-1.5 inline-flex rounded bg-slate-100 px-2 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-700">
            Assessment Form
          </div>
          <input type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" class="block w-full text-sm text-gray-600" @change="onFileChange" />
          <div
            v-if="form.payload.assessment_form_attachment"
            class="mt-2.5 flex items-center justify-between gap-3 rounded-lg bg-gray-50 px-3 py-2 text-sm"
          >
            <a :href="fileUrl(form.payload.assessment_form_attachment)" target="_blank" class="truncate text-blue-600 underline">
              {{ form.payload.assessment_form_attachment?.name || 'Open attachment' }}
            </a>
            <button type="button" class="rounded border px-2 py-1 text-xs text-gray-600" @click="clearFile">
              Remove
            </button>
          </div>
          <div v-if="uploading.assessment_form_attachment" class="mt-2 text-xs text-gray-500">Uploading...</div>
        </div>

        <div v-if="canManageProbation" class="rounded-lg border border-slate-200 bg-slate-50/60 p-2">
          <div class="mb-2 inline-flex rounded bg-violet-100 px-2 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-violet-800">
            Probation Decision
          </div>
          <div class="grid gap-2 md:grid-cols-2">
            <label class="block">
              <span class="mb-1 block text-sm font-medium text-gray-700">Recommendation</span>
              <select v-model="form.payload.recommendation" class="w-full rounded-lg border bg-white px-2.5 py-1.5 text-sm">
                <option value="">Select</option>
                <option v-for="option in recommendationOptions" :key="option.value" :value="option.value">
                  {{ option.label }}
                </option>
              </select>
            </label>

            <label class="block">
              <span class="mb-1 block text-sm font-medium text-gray-700">Extended Months</span>
              <input
                v-model="form.payload.extended_months"
                type="number"
                :disabled="!isExtendProbation"
                class="w-full rounded-lg border px-2.5 py-1.5 text-sm"
                :class="isExtendProbation ? 'bg-white text-slate-900' : 'bg-slate-100 text-slate-400'"
                placeholder="0"
              />
            </label>
          </div>
        </div>

        <label class="block">
          <span class="mb-1 block text-sm font-medium text-gray-700">Reviewer Note</span>
          <textarea
            :value="form.payload.role_notes?.reviewer_note || ''"
            class="min-h-[42px] w-full rounded-lg border px-2.5 py-1.5 text-sm"
            rows="2"
            placeholder="Reviewer observation or consolidated reviewer note"
            @input="setRoleNote('reviewer_note', $event.target.value)"
          />
        </label>

        <label v-if="canSeeInternalDecisionFields" class="block">
          <span class="mb-1 block text-sm font-medium text-gray-700">HR Internal Note</span>
          <textarea
            :value="form.payload.role_notes?.hr_internal_note || ''"
            class="min-h-[42px] w-full rounded-lg border px-2.5 py-1.5 text-sm"
            rows="2"
            placeholder="Internal HR observation or follow-up note"
            @input="setRoleNote('hr_internal_note', $event.target.value)"
          />
        </label>

        <label v-if="canSeeInternalDecisionFields" class="block">
          <span class="mb-1 block text-sm font-medium text-gray-700">Final Summary / Decision Note</span>
          <textarea
            :value="form.payload.role_notes?.final_summary || ''"
            class="min-h-[42px] w-full rounded-lg border px-2.5 py-1.5 text-sm"
            rows="2"
            placeholder="Final decision summary, handoff note, or confirmation context"
            @input="setRoleNote('final_summary', $event.target.value)"
          />
        </label>

        <label v-if="canSeeInternalDecisionFields" class="block">
          <span class="mb-1 block text-sm font-medium text-gray-700">Remarks</span>
          <textarea
            v-model="form.remarks"
            class="min-h-[42px] w-full rounded-lg border px-2.5 py-1.5 text-sm"
            rows="2"
            placeholder="Notes, context, handover remarks, or HR observations"
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
