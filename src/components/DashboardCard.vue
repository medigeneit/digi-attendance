<template>
  <div class="bg-white rounded-lg p-4 shadow hover:shadow-md transition-shadow">
    <div class="flex items-center justify-between pb-2">
      <h3 class="text-sm font-medium text-gray-700">{{ title }}</h3>
      <i :class="['fas', iconClass, color, 'text-sm']" />
    </div>
    <div class="text-2xl font-bold text-gray-900">{{ value }}</div>
    <p class="text-xs text-gray-500 mt-1">{{ subtext }}</p>
  </div>
</template>

<script setup>
const props = defineProps({
  title: String,
  value: [String, Number],
  subtext: String,
  icon: String, // Font Awesome icon name like 'folder', 'file-alt'
  color: String, // Tailwind text color class, like 'text-blue-500'
})

const iconClass = `fa-${props.icon}`
</script>
