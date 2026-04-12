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
