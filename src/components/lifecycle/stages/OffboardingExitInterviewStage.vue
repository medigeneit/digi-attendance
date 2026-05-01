<script setup>
import LifecycleStageEditor from '@/components/lifecycle/LifecycleStageEditor.vue'

defineProps({
  lifecycleId: { type: Number, default: 0 },
  stage: { type: Object, required: true },
  employee: { type: Object, default: null },
})

const definition = {
  title: 'Exit Interview',
  description: 'Store employee feedback, manager observations, and sign-off details.',
  fields: [
    {
      key: 'reason_for_leaving',
      label: 'Reason For Leaving',
      type: 'textarea',
      placeholder: 'Employee reason for leaving',
    },
    {
      key: 'employee_feedback',
      label: 'Employee Feedback',
      type: 'textarea',
      placeholder: 'Employee feedback',
    },
    {
      key: 'manager_feedback',
      label: 'Manager Feedback',
      type: 'textarea',
      placeholder: 'Manager feedback',
    },
    {
      key: 'improvement_suggestions',
      label: 'Improvement Suggestions',
      type: 'textarea',
      placeholder: 'Suggestions from employee or HR',
    },
    {
      key: 'sign_off',
      label: 'Sign-Off',
      type: 'select',
      options: [
        { value: 'pending', label: 'Pending' },
        { value: 'signed', label: 'Signed' },
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
