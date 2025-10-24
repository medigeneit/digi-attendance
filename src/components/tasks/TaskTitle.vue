<script setup>
import { computed } from 'vue'

const props = defineProps({
  title: String,
})

const taskTitle = computed(() => {
  const titleSegments = String(props.title).split('->')
  return titleSegments
})
</script>
<template>
  <span> {{ taskTitle[0] }} <span v-if="taskTitle?.[1]">&raquo;</span> {{ taskTitle?.[1] }} </span>
</template>
