<script setup>
const props = defineProps({
  modelValue: { type: String, default: 'custom' }, // 'all' | 'custom'
  options: {
    type: Array,
    default: () => ([
      { value: 'all', label: 'All' },
      { value: 'custom', label: 'Custom' },
    ])
  }
})
const emit = defineEmits(['update:modelValue'])
const setVal = (v) => emit('update:modelValue', v)
</script>

<template>
  <div class="inline-flex rounded-lg border bg-white overflow-hidden">
    <button
      v-for="opt in options"
      :key="opt.value"
      type="button"
      class="px-3 py-1.5 text-sm hover:bg-gray-50"
      :class="modelValue === opt.value ? 'bg-gray-900 text-white' : 'text-gray-700'"
      @click="setVal(opt.value)"
    >
      {{ opt.label }}
    </button>
  </div>
</template>
