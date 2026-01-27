<script setup>
const props = defineProps({
  count: { type: Number, default: 0 },
})

defineEmits(['view'])
</script>

<template>
  <div class="flex items-center justify-between gap-2 rounded-md border border-slate-100 bg-white/80 px-2 py-1 text-[11px] text-slate-700">
    <span class="font-semibold text-slate-600">{{ count }}</span>
    <button
      type="button"
      class="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-600 hover:border-slate-300 hover:text-slate-800"
      @click="$emit('view')"
    >
      <i class="far fa-eye"></i>
      View
    </button>
  </div>
</template>
