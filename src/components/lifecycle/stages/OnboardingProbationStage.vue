<script setup>
import { computed, onMounted } from 'vue'
import LifecycleStageEditor from '@/components/lifecycle/LifecycleStageEditor.vue'
import { useLifecycleUsersStore } from '@/stores/lifecycleUsers'

const props = defineProps({
  lifecycleId: { type: Number, default: 0 },
  stage: { type: Object, required: true },
  employee: { type: Object, default: null },
})

const usersStore = useLifecycleUsersStore()

onMounted(() => {
  if (!Array.isArray(usersStore.items) || !usersStore.items.length) {
    usersStore.fetchUsers()
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
        slab_60_status: String(item?.slab_60_status || 'pending').toLowerCase(),
        slab_60_note: String(item?.slab_60_note || ''),
        slab_final_status: String(item?.slab_final_status || 'pending').toLowerCase(),
        slab_final_note: String(item?.slab_final_note || ''),
        special_note: String(item?.special_note || ''),
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

const definition = {
  title: 'Probation Tracking',
  description:
    'Track probation reviews, reviewer assignment, and probation extensions without duplicating the base configuration.',
  fields: [
    {
      key: 'probation_start_date',
      label: 'Probation Start Date',
      type: 'date',
      readonly: true,
    },
    {
      key: 'probation_end_date',
      label: 'Probation End Date',
      type: 'date',
      readonly: true,
    },
    {
      key: 'reviewer_assignments',
      label: 'Assigned Reviewers',
      type: 'reviewer_assignment',
      reviewerTypes: [
        { value: 'incharge', label: 'Incharge' },
        { value: 'op_admin', label: 'OP Admin' },
        { value: 'coordinator', label: 'Coordinator' },
        { value: 'hr', label: 'HR' },
        { value: 'cc', label: 'Center Coordinator' },
      ],
      help: 'Add and assign specific users for each reviewer type.',
    },
    {
      key: 'reviewer_matrix',
      label: 'Review Slabs',
      type: 'reviewer_matrix',
      slabs: [
        { key: '30', label: '30 Day Review', subtitle: '1st slab' },
        { key: '60', label: '60 Day Review', subtitle: '2nd slab' },
        { key: 'final', label: 'Final Review', subtitle: 'Final slab' },
      ],
      rowSourcePath: 'reviewer_assignments',
      help: 'The slab rows follow the assigned reviewers. The active slab stays expanded while others remain minimized.',
      colSpan: 2,
    },
    {
      key: 'extended_months',
      label: 'Extended Months',
      type: 'number',
      help: 'Shown when Extend Probation is selected.',
      visibleWhen: {
        path: 'recommendation',
        equals: 'extend_probation',
      },
    },
    {
      key: 'assessment_form_attachment',
      label: 'Assessment Form',
      type: 'file',
      colSpan: 1,
    },
    {
      key: 'recommendation',
      label: 'Recommendation',
      type: 'select',
      options: [
        { value: 'confirm', label: 'Confirm' },
        { value: 'extend_probation', label: 'Extend Probation' },
        { value: 'terminate', label: 'Terminate' },
      ],
    },
    {
      key: 'supervisor_remarks',
      label: 'Supervisor Remarks',
      type: 'textarea',
      placeholder: 'Supervisor observation',
    },
    {
      key: 'hr_remarks',
      label: 'HR Remarks',
      type: 'textarea',
      placeholder: 'HR observation',
    },
  ],
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
    extended_months: extendedMonths || 0,
    reviews: buildDefaultReviews(startDate, totalMonths),
    reviewer_matrix: normalizeReviewerMatrix([]),
  }
})

const normalizedStage = computed(() => buildNormalizedStage())

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
  const assignments = Array.isArray(payload.reviewer_assignments) ? payload.reviewer_assignments : []
  const reviewerLabel = assignments.length > 0
    ? assignments.map((a) => a.user_name || a.role_label || a.role).join(', ')
    : 'Unassigned'

  return [
    { label: 'Employment Type', value: currentEmployee.employment_type || 'N/A' },
    { label: 'Joining Date', value: formatDateLabel(currentEmployee.joining_date) || 'N/A' },
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
})
</script>

<template>
  <div>
    <LifecycleStageEditor
      :lifecycle-id="lifecycleId"
      :stage="normalizedStage"
      :definition="definition"
      :summary-items="summaryItems"
      :default-payload="defaultPayload"
    />

  </div>
</template>
