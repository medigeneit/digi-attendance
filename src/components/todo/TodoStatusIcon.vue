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
  }
  return ''
})
</script>

<template>
  <span :class="color">
    <i class="fa fa-exclamation-square" v-if="todoDate.status == 'PENDING'" title="Pending"></i>
    <i class="fa fa-pause" v-if="todoDate.status == 'WORKING'" title="Working"></i>
    <i class="fa fa-check-square" v-if="todoDate.status == 'COMPLETED'" title="Completed"></i>
  </span>
</template>
