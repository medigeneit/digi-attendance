<template>
  <div class="grid grid-cols-[160px_1fr_auto] items-start gap-2">
    <dt class="flex items-center gap-2 text-sm font-medium text-zinc-600">
      <i v-if="icon" :class="['far', icon, 'text-[11px]']"></i>
      {{ label }}:
    </dt>
    <dd class="text-sm text-zinc-800 break-words" v-html="value"></dd>
    <div class="flex items-center">
      <slot name="valueRight" />
    </div>
  </div>
</template>

<script setup>
defineProps({
  label: { type: String, required: true },
  value: { type: [String, Number], default: 'N/A' },
  icon: { type: String, default: '' }, // pass "fa-user", "fa-envelope", etc.
})
</script>
