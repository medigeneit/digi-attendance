<script setup>
import { computed } from 'vue'

const props = defineProps({
  user: {
    type: Object,
    default: null,
  },
  date: {
    type: String,
    default: '',
  },
})

const jobCardUrl = computed(() => {
  const u = props.user || {}
  const employeeId = u.id || u.user_id || u.employee_id

  if (!employeeId) return ''

  const departmentId = u.department?.id || u.department_id
  const companyId = u.department?.company?.id || u.company_id

  const params = new URLSearchParams()
  if (departmentId) params.set('department_id', departmentId)
  if (companyId) params.set('company_id', companyId)
  params.set('employee_id', employeeId)

  if (props.date) {
    params.set('date', props.date)
  }

  return `/hrd/em-attendance?${params.toString()}`
})
</script>

<template>
  <slot :url="jobCardUrl" />
</template>
