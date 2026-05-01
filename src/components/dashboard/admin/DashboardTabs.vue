<template>
  <div class="overflow-x-auto">
    <div class="inline-flex min-w-max gap-2 rounded-2xl bg-white p-2 shadow-sm ring-1 ring-slate-100">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        type="button"
        class="rounded-xl px-4 py-2 text-sm font-semibold transition"
        :class="modelValue === tab.key
          ? 'bg-blue-600 text-white shadow-sm'
          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'"
        @click="$emit('update:modelValue', tab.key)"
      >
        {{ tab.label }}
      </button>
    </div>
  </div>
</template>

<script setup>
defineProps({
  modelValue: {
    type: String,
    required: true,
  },
  tabs: {
    type: Array,
    required: true,
  },
})

defineEmits(['update:modelValue'])
</script>
