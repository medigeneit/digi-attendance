<script setup>
const props = defineProps({
  autoItems: { type: Array, default: () => [] },
  manualItems: { type: Array, default: () => [] },
})

defineEmits(['edit', 'delete'])

const itemLabel = (item) =>
  item?.title ||
  item?.reason ||
  item?.note ||
  item?.label ||
  item?.text ||
  item?.description ||
  'Untitled'
</script>

<template>
  <div class="space-y-1">
    <div
      v-for="item in autoItems"
      :key="`auto-${item?.id || item?.key || itemLabel(item)}`"
      class="list-item list-item--locked"
    >
      <i class="far fa-lock text-[11px]"></i>
      <span class="truncate">{{ itemLabel(item) }}</span>
    </div>

    <div
      v-for="item in manualItems"
      :key="`manual-${item?.id || itemLabel(item)}`"
      class="list-item"
    >
      <span class="truncate">{{ itemLabel(item) }}</span>
      <div class="list-actions">
        <button
          type="button"
          class="list-action list-action--edit"
          @click="$emit('edit', item)"
        >
          <i class="far fa-pen"></i>
        </button>
        <button
          type="button"
          class="list-action list-action--delete"
          @click="$emit('delete', item)"
        >
          <i class="far fa-trash"></i>
        </button>
      </div>
    </div>

    <p v-if="autoItems.length === 0 && manualItems.length === 0" class="empty">
      No items
    </p>
  </div>
</template>

<style scoped>
.list-item { @apply flex items-center justify-between gap-2 rounded-md border border-slate-100 bg-white/80 px-2 py-1 text-[11px] text-slate-700; }
.list-item--locked { @apply border-amber-100 bg-amber-50/70 text-amber-700; }
.list-actions { @apply flex items-center gap-1; }
.list-action { @apply inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px]; }
.list-action--edit { @apply text-slate-500 hover:bg-slate-100 hover:text-slate-700; }
.list-action--delete { @apply text-rose-500 hover:bg-rose-50 hover:text-rose-700; }
.empty { @apply text-[10px] italic text-slate-400; }
</style>
