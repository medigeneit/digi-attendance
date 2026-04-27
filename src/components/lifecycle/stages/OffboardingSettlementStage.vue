<script setup>
import LifecycleStageEditor from '@/components/lifecycle/LifecycleStageEditor.vue'

defineProps({
  lifecycleId: { type: Number, default: 0 },
  stage: { type: Object, required: true },
  employee: { type: Object, default: null },
})

const definition = {
  title: 'Final Settlement',
  description:
    'Maintain the settlement calculation and approval state before closing the exit.',
  fields: [
    { key: 'due_salary', label: 'Due Salary', type: 'number', placeholder: '0' },
    {
      key: 'leave_adjustment',
      label: 'Leave Adjustment',
      type: 'number',
      placeholder: '0',
    },
    { key: 'deduction', label: 'Deduction', type: 'number', placeholder: '0' },
    { key: 'bonus', label: 'Bonus', type: 'number', placeholder: '0' },
    { key: 'asset_penalty', label: 'Asset Penalty', type: 'number', placeholder: '0' },
    {
      key: 'payable_amount',
      label: 'Payable Amount',
      type: 'number',
      placeholder: '0',
    },
    {
      key: 'settlement_status',
      label: 'Settlement Status',
      type: 'select',
      options: [
        { value: 'pending', label: 'Pending' },
        { value: 'approved', label: 'Approved' },
        { value: 'paid', label: 'Paid' },
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
