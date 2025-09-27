<script setup>
import { computed } from 'vue'

const props = defineProps({
  todo: { type: Object, required: true },
})

const color = computed(() => {
  switch (props.todo.status) {
    case 'PENDING':
      return 'text-red-400'
    case 'WORKING':
      return 'text-yellow-600'
    case 'COMPLETED':
      return 'text-green-400'
  }
  return ''
})
</script>

<template>
  <span :class="color">
    <i class="fa fa-exclamation-square" v-if="todo.status == 'PENDING'" title="Pending"></i>
    <i class="fa fa-pause" v-if="todo.status == 'WORKING'" title="Working"></i>
    <i class="fa fa-check-square" v-if="todo.status == 'COMPLETED'" title="Completed"></i>
  </span>
</template>
