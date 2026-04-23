<script setup>
import LifecycleStageEditor from '@/components/lifecycle/LifecycleStageEditor.vue'

defineProps({
  lifecycleId: { type: Number, default: 0 },
  stage: { type: Object, required: true },
  employee: { type: Object, default: null },
})

const definition = {
  title: 'Confirmation',
  description: 'Finalize regularization or extension using the probation outcome.',
  fields: [
    {
      key: 'decision',
      label: 'Decision',
      type: 'select',
      options: [
        { value: 'confirmed', label: 'Confirm Employee' },
        { value: 'extend_probation', label: 'Extend Probation' },
        { value: 'needs_improvement', label: 'Needs Improvement' },
        { value: 'terminated', label: 'Terminate Employment' },
      ],
    },
    { key: 'effective_date', label: 'Effective Date', type: 'date' },
    {
      key: 'extended_months',
      label: 'Extension Months',
      type: 'number',
      visibleWhen: {
        path: 'decision',
        equals: 'extend_probation',
      },
    },
    {
      key: 'decision_attachment',
      label: 'Confirmation / Regularization Form',
      type: 'file',
    },
    {
      key: 'decision_notes',
      label: 'Decision Notes',
      type: 'textarea',
      placeholder: 'Approval or decision summary',
    },
    {
      key: 'remarks',
      label: 'Remarks',
      type: 'textarea',
      placeholder: 'Optional confirmation or regularization remarks',
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
