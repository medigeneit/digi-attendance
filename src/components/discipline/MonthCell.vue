<script setup>
const props = defineProps({
  showAdd: { type: Boolean, default: true },
  addLabel: { type: String, default: 'Add' },
})

defineEmits(['add'])
</script>

<template>
  <div class="month-cell">
    <div class="month-cell__header">
      <slot name="header"></slot>
      <button
        v-if="showAdd"
        type="button"
        class="month-cell__add"
        @click="$emit('add')"
      >
        <i class="far fa-plus"></i>
        {{ addLabel }}
      </button>
    </div>
    <div class="month-cell__body">
      <slot></slot>
    </div>
  </div>
</template>

<style scoped>
.month-cell { @apply flex h-full flex-col gap-2; }
.month-cell__header { @apply flex items-center justify-between gap-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400; }
.month-cell__add { @apply inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-600 hover:border-slate-300 hover:text-slate-800; }
.month-cell__body { @apply space-y-1; }
</style>
