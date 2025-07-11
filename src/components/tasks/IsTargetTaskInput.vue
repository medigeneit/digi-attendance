<script setup>
import { computed } from 'vue'

const props = defineProps({
  modelValue: { type: [Boolean, Number], required: true },
})

const emit = defineEmits(['update:modelValue'])

const is_target = computed({
  get() {
    return props.modelValue
  },
  set(value) {
    emit('update:modelValue', value)
  },
})
</script>

<template>
  <div>
    <label
      class="flex gap-1 items-center mt-4 border rounded py-2 px-2 cursor-pointer"
      :class="{ 'bg-yellow-100/80 border-yellow-300': is_target }"
    >
      <input type="checkbox" v-model="is_target" class="size-6" />
      <span class="block text-gray-600 text-base font-medium">Is Target Task</span>
    </label>
  </div>
</template>
