<script setup>
const props = defineProps({ modelValue: { type: String, default: '' } })
const emit = defineEmits(['update:modelValue'])
</script>
<template>
  <div class="flex flex-col md:flex-row justify-center md:items-center gap-2">
    <label for="title" class="text-sm text-gray-700 shrink-0 w-20 text-right">
        Group Title
    </label>
    <input
      id="title"
      :value="modelValue"
      @input="$emit('update:modelValue', $event.target.value)"
      type="text"
      class="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
    />
  </div>
</template>
