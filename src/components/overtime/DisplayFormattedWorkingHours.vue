<script setup>
import { computed } from 'vue'

const props = defineProps(['workingHours'])

const formattedWorkingHours = computed(() => {
  if (!props.workingHours) {
    return '-'
  }

  const h = Math.floor(props.workingHours)
  const m = Math.round((props.workingHours - h) * 60)
  return `${h}h ${m}m`
})
</script>

<template>
  <span>
    {{ formattedWorkingHours }}
  </span>
</template>
