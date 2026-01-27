<script setup>
import TextEditor from '@/components/TextEditor.vue'

defineProps({
  modelValue: { type: String, default: '' },
})

defineEmits(['update:modelValue'])
</script>

<template>
  <div class="space-y-2">
    <label class="text-xs font-semibold uppercase tracking-wide text-slate-500">
      Letter Body
    </label>
    <TextEditor
      :model-value="modelValue"
      @update:model-value="$emit('update:modelValue', $event)"
    />
  </div>
</template>
