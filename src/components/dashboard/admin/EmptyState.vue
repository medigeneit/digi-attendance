<template>
  <div class="flex min-h-[180px] items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/70 px-4 py-8 text-center">
    <div>
      <div class="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-400 shadow-sm">
        <i :class="icon"></i>
      </div>
      <p class="text-sm font-semibold text-slate-700">{{ title }}</p>
      <p v-if="message" class="mt-1 text-xs text-slate-500">{{ message }}</p>
    </div>
  </div>
</template>

<script setup>
defineProps({
  title: {
    type: String,
    default: 'No data available',
  },
  message: {
    type: String,
    default: '',
  },
  icon: {
    type: String,
    default: 'far fa-chart-bar',
  },
})
</script>
