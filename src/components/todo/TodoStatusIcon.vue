<script setup>
import { computed } from 'vue'

const props = defineProps({
  todoDate: { type: Object, required: true },
  size: { type: String, default: 'medium' },
})

const color = computed(() => {
  switch (props.todoDate.status) {
    case 'PENDING':
      return 'text-red-400'
    case 'WORKING':
      return 'text-yellow-600'
    case 'COMPLETED':
      return 'text-green-400'
    case 'DEPENDANT':
      return 'text-orange-400'
    case 'BACK_LOG':
      return 'text-purple-400'
  }
  return ''
})

const iconSize = computed(() => {
  switch (props.size) {
    case 'x-small':
      return 'text-xs'
    case 'small':
      return 'text-sm'
    case 'medium':
      return 'text-base'
    case 'large':
      return 'text-lg'
    default:
      return 'text-base'
  }
})

</script>

<template>
  <span :class="[color]">
    <i class="fas fa-clock" :class="iconSize" v-if="todoDate.status == 'PENDING'" title="Pending"></i>
    <i class="fas fa-sync" :class="iconSize" v-if="todoDate.status == 'WORKING'" title="Working"></i>
    <i
      class="fas fa-check-square"
      :class="iconSize"
      v-if="todoDate.status == 'COMPLETED'"
      title="Completed"
    ></i>
    <i
      class="fas fa-pause-circle"
      :class="iconSize"
      v-if="todoDate.status == 'DEPENDANT'"
      title="Dependant"
    ></i>
    <i class="fas fa-history" :class="iconSize" v-if="todoDate.status == 'BACK_LOG'" title="Back Log"></i>
  </span>
</template>
