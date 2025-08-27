<script setup>
import { computed } from 'vue'
import SelectDropdown from '../SelectDropdown.vue'

const props = defineProps({
  companies: { type: Array, required: true },
  modelValue: { type: [Number, String] },
  className: {
    type: Object,
    default: () => ({
      select: 'px-4 py-2',
    }),
  },
  defaultOption: { type: String, default: '--select department--' },
})

const emit = defineEmits(['update:modelValue'])

const department_id = computed({
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
    <slot name="label">Department</slot>
    <SelectDropdown
      :options="companies"
      v-model="department_id"
      :isOptionGroup="true"
      optGroupOptionKey="departments"
      label="name"
      class="w-full border rounded-md focus:ring-2 focus:ring-blue-500"
      :class="className.select"
      clearable
    >
      <template #selected-option="{ option, group }">
        <div>
          <span v-if="option?.name" class="text-gray-800 line-clamp-1">{{ option?.name }}</span>
          <span v-else class="text-gray-500">{{ defaultOption }}</span>
        </div>
      </template>
    </SelectDropdown>
  </div>
</template>
