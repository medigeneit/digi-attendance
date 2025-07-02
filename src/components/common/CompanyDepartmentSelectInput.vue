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
  <div class="mb-4">
    <label class="block text-gray-600 text-sm mb-1 font-medium">
      Requested Department <RequiredIcon />
    </label>
    <select
      v-model="department_id"
      class="w-full border rounded-md focus:ring-2 focus:ring-blue-500"
      :class="className.select"
    >
      <option value="">--select department--</option>
      <optgroup v-for="company in companyStore.companies" :key="company.id" :label="company.name">
        <option
          v-for="department in company.departments"
          :value="department.id"
          :key="department.id"
        >
          {{ company.name }} - {{ department.name }}
        </option>
      </optgroup>
    </select>
  </div>
</template>
