<script setup>
import { computed } from 'vue'
import { formatDecimalHours } from '@/utils/overtime'

const props = defineProps(['workingHours'])

const formattedWorkingHours = computed(() => {
  return formatDecimalHours(props.workingHours)
})
</script>

<template>
  <span>
    {{ formattedWorkingHours }}
  </span>
</template>
