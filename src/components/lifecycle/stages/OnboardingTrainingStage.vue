<script setup>
import LifecycleStageEditor from '@/components/lifecycle/LifecycleStageEditor.vue'

defineProps({
  lifecycleId: { type: Number, default: 0 },
  stage: { type: Object, required: true },
  employee: { type: Object, default: null },
})

const definition = {
  title: 'Training',
  description:
    'Track resource setup, orientation, and initial training items without affecting the existing checklist module.',
  fields: [
    {
      key: 'basic_training',
      label: 'Basic Training',
      noteLabel: 'Basic Training Note',
      type: 'training_block',
      colSpan: 1,
      statusPath: 'basic_training_status',
      notePath: 'basic_training_note',
      options: [
        { value: 'assigned', label: 'Assigned' },
        { value: 'completed', label: 'Completed' },
      ],
      rows: 2,
      placeholder: 'Trainer, session date, coverage, or completion note',
    },
    {
      key: 'technical_training',
      label: 'Technical Training',
      noteLabel: 'Technical Training Note',
      type: 'training_block',
      colSpan: 1,
      statusPath: 'technical_training_status',
      notePath: 'technical_training_note',
      options: [
        { value: 'assigned', label: 'Assigned' },
        { value: 'completed', label: 'Completed' },
      ],
      rows: 2,
      placeholder: 'Technical module, assessment result, or resource note',
    },
    {
      key: 'advanced_training',
      label: 'Advanced Training',
      noteLabel: 'Advanced Training Note',
      type: 'training_block',
      colSpan: 1,
      statusPath: 'advanced_training_status',
      notePath: 'advanced_training_note',
      options: [
        { value: 'assigned', label: 'Assigned' },
        { value: 'completed', label: 'Completed' },
      ],
      rows: 2,
      placeholder: 'Advanced topic, mentor feedback, or readiness note',
    },
    {
      key: 'training_materials_attachment',
      label: 'Training Materials',
      type: 'file',
      colSpan: 1,
    },
    { key: 'supervisor_id', label: 'Supervisor Assigned', type: 'user_select', colSpan: 1 },
    {
      key: 'orientation_complete',
      label: 'Department Orientation Complete',
      type: 'checkbox',
      colSpan: 1,
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
