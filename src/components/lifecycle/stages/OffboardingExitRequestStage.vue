<script setup>
import LifecycleStageEditor from '@/components/lifecycle/LifecycleStageEditor.vue'

defineProps({
  lifecycleId: { type: Number, default: 0 },
  stage: { type: Object, required: true },
  employee: { type: Object, default: null },
})

const definition = {
  title: 'Exit Request',
  description:
    'Capture the resignation or termination request before the clearance checklist begins.',
  fields: [
    {
      key: 'request_type',
      label: 'Request Type',
      type: 'select',
      options: [
        { value: 'resignation', label: 'Resignation' },
        { value: 'termination', label: 'Termination' },
      ],
    },
    { key: 'resignation_letter_attachment', label: 'Resignation Letter', type: 'file' },
    {
      key: 'termination_note',
      label: 'Termination Note',
      type: 'textarea',
      placeholder: 'Termination context if applicable',
    },
    { key: 'last_working_date', label: 'Last Working Date', type: 'date' },
    {
      key: 'notice_period_days',
      label: 'Notice Period (Days)',
      type: 'number',
      placeholder: '0',
    },
    {
      key: 'exit_reason',
      label: 'Exit Reason',
      type: 'textarea',
      placeholder: 'Reason for leaving',
    },
    {
      key: 'approval_status',
      label: 'Approval Status',
      type: 'select',
      options: [
        { value: 'pending', label: 'Pending' },
        { value: 'approved', label: 'Approved' },
        { value: 'rejected', label: 'Rejected' },
      ],
    },
  ],
}
</script>

<template>
  <LifecycleStageEditor
    :lifecycle-id="lifecycleId"
    :stage="stage"
    :definition="definition"
  />
</template>
