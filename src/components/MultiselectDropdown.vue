<template>
  <div>
    <Multiselect
      :modelValue="modelValue"
      @update:modelValue="updateValue"
      :options="options"
      :multiple="multiple"
      :searchable="true"
      track-by="id"
      label="name"
      class="w-full p-2 border border-gray-300 rounded focus:ring focus:ring-indigo-200 focus:outline-none"
      :reduce="(user) => user.id"
      placeholder="Select an option"
    />
  </div>
</template>

<script setup>
import { defineEmits, defineProps } from 'vue'
import Multiselect from 'vue-multiselect'

const props = defineProps({
  modelValue: [Number, Array, Object, String, null], // Single ID (Number) or Multiple IDs (Array)
  options: Object, // Object format: { "50": "Shahnewaz", "49": "Asif" }
  multiple: Boolean, // Allows switching between single/multiple selection
  label: String,
  labelFor: String,
})

// const modelValueType = computed(() => {
//   return typeof props.modelValue; // Detects the type of modelValue
// });

const emit = defineEmits(['update:modelValue'])

// Emit updated value to parent
const updateValue = (value) => {
  emit('update:modelValue', value)
}
</script>
<style>
@import 'vue-multiselect/dist/vue-multiselect.css';
</style>
