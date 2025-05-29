<template>
  <div>
    <Multiselect
      v-model="selectedValue"
      :options="options"
      :multiple="multiple"
      :searchable="true"
      track-by="id"
      :label="label"
      class="w-full border-2 border-gray-400 rounded focus:ring focus:ring-indigo-200 focus:outline-none"
      :placeholder="placeholder"
      clear-on-select
    >
      <!-- Customize the option label -->
      <template #option="{ option }">
        <div>
          <span v-if="labelPrefix">{{ labelPrefix ? option[labelPrefix] : '' }}</span>

          <span v-if="option[label]">{{ option[label] }}</span>
          <span v-else-if="option?.title">{{ option?.title }}</span>
          <span v-else>{{ option?.name || option?.id }}</span>
        </div>
      </template>

      <!-- Customize the selected label -->
      <template #selected="{ option }">
        <div>
          <span v-if="labelPrefix">{{ option[labelPrefix] }}</span>

          <span v-if="option[label]">{{ option[label] }}</span>
          <span v-else-if="option?.title">{{ option?.title }}</span>
          <span v-else>{{ option?.name || option?.id }}</span>
        </div>
      </template>
    </Multiselect>
  </div>
  <!-- // :class="{'border-red-500': props.required && isInvalid}" -->
  <!-- <p v-if="props.required && isInvalid" class="text-red-500 text-sm mt-1">
    This field is required.
  </p> -->
</template>

<script setup>
import { defineProps, ref, watch } from 'vue'
import Multiselect from 'vue-multiselect'

const props = defineProps({
  modelValue: [Number, Array, Object, String, null],
  options: Array,
  multiple: Boolean,
  required: Boolean,
  placeholder: String,
  label: String,
  labelPrefix: String,
})

const emit = defineEmits(['update:modelValue'])
const selectedValue = ref(props.modelValue)

// Watcher to sync selected value with modelValue
watch(
  () => props.modelValue,
  (newValue) => {
    selectedValue.value = newValue
  },
)

// Emit updated value to parent
watch(selectedValue, (value) => {
  emit('update:modelValue', value)
})
</script>

<style>
@import 'vue-multiselect/dist/vue-multiselect.css';
</style>
