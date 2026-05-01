<template>
  <RouterLink
    v-if="to"
    :to="to"
    class="kpi-card"
    :class="borderClass"
  >
    <CardContent />
  </RouterLink>
  <div v-else class="kpi-card" :class="borderClass">
    <CardContent />
  </div>
</template>

<script setup>
import { computed, h } from 'vue'

const props = defineProps({
  label: {
    type: String,
    required: true,
  },
  value: {
    type: [Number, String],
    default: 0,
  },
  icon: {
    type: String,
    default: 'far fa-chart-bar',
  },
  tone: {
    type: String,
    default: 'blue',
  },
  subtitle: {
    type: String,
    default: '',
  },
  to: {
    type: Object,
    default: null,
  },
})

const toneClasses = {
  green: {
    border: 'border-l-emerald-500',
    icon: 'bg-emerald-50 text-emerald-600',
  },
  orange: {
    border: 'border-l-orange-500',
    icon: 'bg-orange-50 text-orange-600',
  },
  blue: {
    border: 'border-l-blue-500',
    icon: 'bg-blue-50 text-blue-600',
  },
  red: {
    border: 'border-l-rose-500',
    icon: 'bg-rose-50 text-rose-600',
  },
  purple: {
    border: 'border-l-violet-500',
    icon: 'bg-violet-50 text-violet-600',
  },
  slate: {
    border: 'border-l-slate-400',
    icon: 'bg-slate-100 text-slate-600',
  },
}

const currentTone = computed(() => toneClasses[props.tone] || toneClasses.blue)
const borderClass = computed(() => currentTone.value.border)

const CardContent = () =>
  h('div', { class: 'flex items-start justify-between gap-3' }, [
    h('div', [
      h('p', { class: 'text-xs font-semibold uppercase tracking-wide text-slate-500' }, props.label),
      h('p', { class: 'mt-2 text-3xl font-bold text-slate-900' }, String(props.value ?? 0)),
      props.subtitle ? h('p', { class: 'mt-1 text-xs text-slate-500' }, props.subtitle) : null,
    ]),
    h('div', { class: ['flex h-11 w-11 shrink-0 items-center justify-center rounded-xl', currentTone.value.icon] }, [
      h('i', { class: props.icon }),
    ]),
  ])
</script>

<style scoped>
.kpi-card {
  display: block;
  min-height: 126px;
  border-left-width: 4px;
  border-radius: 16px;
  background: #ffffff;
  padding: 20px;
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08);
  transition:
    transform 0.18s ease,
    box-shadow 0.18s ease;
}

.kpi-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 14px 36px rgba(15, 23, 42, 0.11);
}
</style>
