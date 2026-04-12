<script setup>
import LifecycleStageEditor from '@/components/lifecycle/LifecycleStageEditor.vue'

defineProps({
  lifecycleId: { type: Number, default: 0 },
  stage: { type: Object, required: true },
  employee: { type: Object, default: null },
})

const definition = {
  title: 'Handover',
  description:
    'Track handover responsibilities and the receiving employee before final closure.',
  fields: [
    {
      key: 'handover_to_employee',
      label: 'Handover To',
      type: 'text',
      placeholder: 'Employee name / ID',
    },
    {
      key: 'handover_summary',
      label: 'Handover Items / Tasks',
      type: 'textarea',
      placeholder: 'List major tasks or assets handed over',
    },
    { key: 'handover_attachment', label: 'Handover Attachment', type: 'file' },
    { key: 'handover_completed', label: 'Handover Completed', type: 'checkbox' },
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
