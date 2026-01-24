<script setup>
import { computed } from 'vue'

const props = defineProps({
  todoDate: { type: Object, required: true },
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
</script>

<template>
  <span :class="color">
    <i class="fas fa-clock text-base" v-if="todoDate.status == 'PENDING'" title="Pending"></i>
    <i class="fas fa-sync text-base" v-if="todoDate.status == 'WORKING'" title="Working"></i>
    <i
      class="fas fa-check-square text-lg"
      v-if="todoDate.status == 'COMPLETED'"
      title="Completed"
    ></i>
    <i
      class="fas fa-pause-circle text-base"
      v-if="todoDate.status == 'DEPENDANT'"
      title="Dependant"
    ></i>
    <i class="fas fa-history text-base" v-if="todoDate.status == 'BACK_LOG'" title="Back Log"></i>
  </span>
</template>
