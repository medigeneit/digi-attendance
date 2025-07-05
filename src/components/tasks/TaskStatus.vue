<script setup>
import { computed } from 'vue'

const props = defineProps({
  status: { type: String, required: true },
  progressPercent: { type: Number, required: true },
})

const className = computed(() => {
  switch (props.status) {
    case 'COMPLETED':
      return 'text-white bg-green-500  border-green-200 font-semibold'
    case 'PENDING':
      return 'text-red-500 bg-red-200  border-red-200'
    case 'IN_PROGRESS':
      return 'text-yellow-600 bg-yellow-200  border-yellow-200'
  }

  return 'bg-blue-100 text-blue-800 border-blue-200'
})

const iconClassName = computed(() => {
  switch (props.status) {
    case 'COMPLETED':
      return 'fas fa-check-circle'
  }

  return 'fas fa-exclamation-circle'
})
</script>

<template>
  <div class="px-2 py-0.5 text-xs rounded-full border flex items-center gap-1" :class="className">
    <i :class="iconClassName"></i>
    <span>{{ status }} </span>
    <span v-if="progressPercent !== null || progressPercent !== undefined"
      >{{ progressPercent }}%
    </span>
  </div>
</template>
