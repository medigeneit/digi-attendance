<script setup>
import { computed } from 'vue'
import SelectDropdown from '../SelectDropdown.vue'

const props = defineProps({
  companies: { type: Array, required: true },
  modelValue: { type: [Number, String] },
  className: {
    type: Object,
    default: () => ({
      select: '',
    }),
  },
  defaultOption: { type: String, default: '--select department--' },
  disabled: { type: Boolean, default: false },
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

function departmentFilterBy(options, term) {
  return options.filter((dept) => {
    return (
      dept?.short_name?.toLowerCase().includes(term) || dept?.name?.toLowerCase().includes(term)
    )
  })
}
</script>

<template>
  <div>
    <slot name="label">Department </slot>
    <SelectDropdown
      :options="companies"
      :isOptionGroup="true"
      :class="className.select"
      :searchBy="departmentFilterBy"
      v-model="department_id"
      optGroupOptionKey="departments"
      label="name"
      class="w-full border rounded-md focus:ring-2 focus:ring-blue-500"
      clearable
      :disabled="disabled"
    >
      <template #selected-option="{ option }">
        <div>
          <span v-if="option?.name" class="text-gray-800 line-clamp-1">{{ option?.name }}</span>
          <span v-else class="text-gray-500">{{ defaultOption }}</span>
        </div>
      </template>
    </SelectDropdown>
  </div>
</template>
