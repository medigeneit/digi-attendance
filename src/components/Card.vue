<template>
    <div class="rounded-lg border bg-white p-4 shadow-sm">
      <div class="flex flex-row items-center justify-between pb-2">
        <h3 class="text-sm font-medium text-gray-700">{{ title }}</h3>
        <component :is="iconComponent" class="h-4 w-4 text-gray-400" />
      </div>
      <div class="text-2xl font-bold text-gray-900">{{ value }}</div>
      <p class="text-xs text-gray-500">{{ subtitle }}</p>
    </div>
  </template>
  
  <script setup>
  import { defineProps, computed } from 'vue'
  
  const props = defineProps({
    title: String,
    value: [String, Number],
    subtitle: String,
    icon: String
  })
  
  const iconMap = {
    'list-checks': 'checks',
    'clock': 'clock',
    'check-circle': 'check-circle',
    'file-check': 'check-circle'
  }
  
  const iconComponent = computed(() => iconMap[props.icon] || ListChecks)
  </script>
  
  <style scoped>
  /* Optional additional styling */
  </style>
  