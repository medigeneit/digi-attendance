<script setup>
const props = defineProps({
  show: { type: Boolean, default: false },
  title: { type: String, default: 'Confirm' },
  message: { type: String, default: 'Are you sure?' },
})
const emit = defineEmits(['close', 'confirm'])
</script>

<template>
  <div v-if="show" class="fixed inset-0 z-50 grid place-items-center bg-black/30">
    <div class="bg-white rounded-xl shadow-lg w-[480px] max-w-[95vw]">
      <div class="px-4 py-3 border-b flex items-center justify-between">
        <div class="font-semibold">{{ title }}</div>
        <button class="text-slate-500 hover:text-slate-800" @click="$emit('close')">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="p-4 text-sm text-slate-700">
        {{ message }}
      </div>
      <div class="px-4 py-3 border-t flex items-center justify-end gap-2">
        <button class="btn" @click="$emit('close')">Cancel</button>
        <button class="btn-danger" @click="$emit('confirm')">Confirm</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.btn {
  @apply inline-flex items-center gap-1 px-3 py-1.5 rounded border border-slate-300 text-sm hover:bg-slate-50;
}
.btn-danger {
  @apply inline-flex items-center gap-1 px-3 py-1.5 rounded bg-rose-600 text-white text-sm hover:bg-rose-700;
}
</style>
