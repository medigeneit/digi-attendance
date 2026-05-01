<template>
  <div class="rounded-2xl border bg-white p-4 shadow-sm" :class="tone.border">
    <div class="flex items-start gap-3">
      <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" :class="tone.icon">
        <i :class="icon"></i>
      </div>
      <div>
        <p class="text-sm font-bold text-slate-900">{{ insight?.title || 'Insight' }}</p>
        <p class="mt-1 text-sm leading-5 text-slate-600">
          {{ insight?.message || insight?.description || 'No insight details available.' }}
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  insight: {
    type: Object,
    default: () => ({}),
  },
})

const tones = {
  danger: {
    border: 'border-rose-100',
    icon: 'bg-rose-50 text-rose-600',
    fallbackIcon: 'fas fa-triangle-exclamation',
  },
  warning: {
    border: 'border-orange-100',
    icon: 'bg-orange-50 text-orange-600',
    fallbackIcon: 'fas fa-circle-exclamation',
  },
  success: {
    border: 'border-emerald-100',
    icon: 'bg-emerald-50 text-emerald-600',
    fallbackIcon: 'fas fa-circle-check',
  },
  info: {
    border: 'border-blue-100',
    icon: 'bg-blue-50 text-blue-600',
    fallbackIcon: 'fas fa-lightbulb',
  },
}

const tone = computed(() => tones[props.insight?.type] || tones.info)
const icon = computed(() => props.insight?.icon || tone.value.fallbackIcon)
</script>
