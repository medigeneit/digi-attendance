<script setup>
import { computed } from 'vue'

const props = defineProps(['workingHours'])

const formattedWorkingHours = computed(() => {
  if (!props.workingHours) {
    return '-'
  }

  const h = Math.floor(props.workingHours)
  const m = Math.round((props.workingHours - h) * 60)

  return m ? `${h}h ${m}m` : `${h}h`
})
</script>

<template>
  <span>
    {{ formattedWorkingHours }}
  </span>
</template>
