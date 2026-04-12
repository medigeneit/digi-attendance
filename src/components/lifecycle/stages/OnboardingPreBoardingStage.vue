<script setup>
import { computed } from 'vue'
import LifecycleStageEditor from '@/components/lifecycle/LifecycleStageEditor.vue'
import { normalizeEmploymentType } from '@/utils/salaryPolicy'

const props = defineProps({
  lifecycleId: { type: Number, default: 0 },
  stage: { type: Object, required: true },
  employee: { type: Object, default: null },
})

const definition = {
  title: 'Pre-Boarding',
  fields: [
    { key: 'section_cv_review', label: 'CV / Exam Review', type: 'section' },
    {
      key: 'cv_review_status',
      label: 'CV Review Status',
      type: 'select',
      options: [
        { value: 'pending', label: 'Pending' },
        { value: 'reviewed', label: 'Reviewed' },
        { value: 'shortlisted', label: 'Shortlisted' },
        { value: 'rejected', label: 'Rejected' },
      ],
    },
    {
      key: 'evaluation.written',
      path: 'evaluation.written',
      label: 'Written Mark',
      type: 'number',
      placeholder: '0',
    },
    {
      key: 'evaluation.practical',
      path: 'evaluation.practical',
      label: 'Practical Mark',
      type: 'number',
      placeholder: '0',
    },
    {
      key: 'evaluation.viva',
      path: 'evaluation.viva',
      label: 'Viva Mark',
      type: 'number',
      placeholder: '0',
    },
    {
      key: 'evaluation.total',
      path: 'evaluation.total',
      label: 'Total Mark',
      type: 'number',
      placeholder: '0',
      readonly: true,
    },
    {
      key: 'evaluation.notes',
      path: 'evaluation.notes',
      label: 'Exam Review Note',
      type: 'textarea',
      placeholder: 'CV screening note, exam outcome, or reviewer comment',
    },
    { key: 'section_recommendation', label: 'Recommendation', type: 'section' },
    {
      key: 'salary_steps',
      label: 'Salary Slabs',
      type: 'salary_steps',
      help: 'Employment type is contract. Add one or more slabs such as 0-3 months, 3-9 months, or 9-15 months with separate amounts.',
      visibleWhen: {
        path: 'recommendation.salary_mode',
        equals: 'contract_steps',
      },
    },
    {
      key: 'salary_stages',
      label: 'Salary Recommendation',
      type: 'salary_stages',
      help: 'Employment type is non-contract. Define intern, probationary, and permanent stage amounts here.',
      visibleWhen: {
        path: 'recommendation.salary_mode',
        equals: 'stage_based',
      },
    },
    { key: 'section_conditions', label: 'Conditions & Notes', type: 'section' },
    {
      key: 'recommendation.joining_condition',
      path: 'recommendation.joining_condition',
      label: 'Joining Condition',
      type: 'textarea',
      placeholder: 'Mention conditions to be fulfilled before joining',
    },
    {
      key: 'recommendation.notes',
      path: 'recommendation.notes',
      label: 'Recommendation Notes',
      type: 'textarea',
      placeholder: 'Committee note, approval note, or final recommendation summary',
    },
  ],
}

const defaultPayload = computed(() => ({
  cv_review_status: 'pending',
  evaluation: {
    written: '',
    practical: '',
    viva: '',
    total: 0,
    notes: '',
  },
  recommendation: {
    employment_type: ['intern', 'probationary', 'permanent', 'contract'].includes(
      normalizeEmploymentType(props.employee?.employment_type),
    )
      ? normalizeEmploymentType(props.employee?.employment_type)
      : 'probationary',
    salary_mode:
      normalizeEmploymentType(props.employee?.employment_type) === 'contract'
        ? 'contract_steps'
        : 'stage_based',
    joining_condition: '',
    notes: '',
  },
  salary_steps: [],
  salary_stages: {
    intern: {
      amount: '',
      duration_months: '',
      notes: '',
    },
    probationary: {
      amount: '',
      duration_months: '',
      notes: '',
    },
    permanent: {
      amount: '',
      duration_months: '',
      notes: '',
    },
  },
}))

const summaryItems = computed(() => {
  const type = normalizeEmploymentType(props.employee?.employment_type)
  const label =
    type === 'contract'
      ? 'Contract'
      : type === 'probationary'
        ? 'Probationary'
        : type === 'intern'
          ? 'Intern'
          : type === 'permanent'
            ? 'Permanent'
            : 'Not Set'

  return [
    { label: 'Employment Type', value: label },
    {
      label: 'Salary Plan',
      value: type === 'contract' ? 'Contract Slabs' : 'Intern / Probation / Permanent',
    },
    {
      label: 'Review Flow',
      value: 'CV Review -> Recommendation',
    },
  ]
})
</script>

<template>
  <LifecycleStageEditor
    :lifecycle-id="lifecycleId"
    :stage="stage"
    :definition="definition"
    :summary-items="summaryItems"
    :default-payload="defaultPayload"
  />
</template>
