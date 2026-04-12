<script setup>
import { computed } from 'vue'
import LifecycleStageEditor from '@/components/lifecycle/LifecycleStageEditor.vue'

const props = defineProps({
  lifecycleId: { type: Number, default: 0 },
  stage: { type: Object, required: true },
  employee: { type: Object, default: null },
})

const definition = {
  title: 'Probation Tracking',
  description:
    'Track probation reviews against the employee master setup without duplicating the base configuration.',
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
      key: 'review_30',
      label: '30 Day Review',
      noteLabel: '30 Day Review Note',
      type: 'training_block',
      statusPath: 'review_30_status',
      notePath: 'review_30_note',
      rows: 2,
      placeholder: 'Add 30 day review note',
      options: [
        { value: 'pending', label: 'Pending' },
        { value: 'completed', label: 'Completed' },
      ],
    },
    {
      key: 'review_60',
      label: '60 Day Review',
      noteLabel: '60 Day Review Note',
      type: 'training_block',
      statusPath: 'review_60_status',
      notePath: 'review_60_note',
      rows: 2,
      placeholder: 'Add 60 day review note',
      options: [
        { value: 'pending', label: 'Pending' },
        { value: 'completed', label: 'Completed' },
      ],
    },
    {
      key: 'final_review',
      label: 'Final Review',
      noteLabel: 'Final Review Note',
      type: 'training_block',
      statusPath: 'final_review_status',
      notePath: 'final_review_note',
      rows: 2,
      placeholder: 'Add final review note',
      options: [
        { value: 'pending', label: 'Pending' },
        { value: 'completed', label: 'Completed' },
      ],
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

const defaultPayload = computed(() => {
  const currentEmployee = props.employee || {}
  const totalMonths =
    Number(currentEmployee.probation_months_total) ||
    (Number(currentEmployee.provisional_month) || 0) +
      (Number(currentEmployee.extended_provisional_month) || 0)

  return {
    probation_start_date: currentEmployee.joining_date || '',
    probation_end_date: addMonthsToIsoDate(currentEmployee.joining_date, totalMonths),
  }
})

const summaryItems = computed(() => {
  const currentEmployee = props.employee || {}
  const baseMonths = Number(currentEmployee.provisional_month) || 0
  const extendedMonths = Number(currentEmployee.extended_provisional_month) || 0
  const totalMonths = Number(currentEmployee.probation_months_total) || baseMonths + extendedMonths
  const calculatedEndDate = addMonthsToIsoDate(currentEmployee.joining_date, totalMonths)

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
