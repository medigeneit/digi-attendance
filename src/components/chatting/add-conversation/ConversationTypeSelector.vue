<script setup>
import { computed } from 'vue'

const props = defineProps({
  modelValue: { type: String, default: '' },
  onSelect: { tyep: Function, default: () => {} },
})

const emit = defineEmits(['update:modelValue'])

const options = computed(() => [
  {
    label: 'Group',
    value: 'group',
    iconClass: 'fas fa-users',
  },
])

function handleSelect(opt) {
  emit('update:modelValue', opt.value)
  props.onSelect()
}
</script>
<template>
  <div class="flex justify-center items-center gap-3">
    <button
      v-for="opt in options"
      :key="opt.value"
      class="cursor-pointer px-6 py-1 border rounded-lg transition font-bold"
      @click="handleSelect(opt)"
      :class="
        modelValue === opt.value ? 'bg-sky-600 text-white border-sky-600' : 'hover:bg-gray-50'
      "
    >
      <i :class="opt.iconClass"></i>
      {{ opt.label }}
    </button>
  </div>
</template>
