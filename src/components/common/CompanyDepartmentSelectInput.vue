<script setup>
import { computed } from 'vue'

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
    <select
      v-model="department_id"
      class="w-full border rounded-md focus:ring-2 focus:ring-blue-500"
      :class="className.select"
    >
      <option value="">{{ defaultOption }}</option>
      <optgroup v-for="company in companies" :key="company.id" :label="company.name">
        <option
          v-for="department in company.departments"
          :value="department.id"
          :key="department.id"
        >
          {{ department.name }}
        </option>
      </optgroup>
    </select>
  </div>
</template>
