<template>
  <div>
    <Multiselect
      v-model="selectedValue"
      :options="options"
      :multiple="multiple"
      :searchable="true"
      track-by="id"
      label="name"
      class="w-full border border-gray-300 rounded focus:ring focus:ring-indigo-200 focus:outline-none"
      :placeholder="placeholder"
    />
  </div>
</template>

<script setup>
import { defineEmits, defineProps, ref, watch } from 'vue'
import Multiselect from 'vue-multiselect'

const props = defineProps({
  modelValue: [Number, Array, Object, String, null],
  options: Array,
  multiple: Boolean,
  placeholder: String,
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
