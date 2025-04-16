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
    />
  </div>
  <!-- // :class="{'border-red-500': props.required && isInvalid}" -->
  <!-- <p v-if="props.required && isInvalid" class="text-red-500 text-sm mt-1">
    This field is required.
  </p> -->
</template>

<script setup>
import { computed, defineProps, ref, watch } from 'vue'
import Multiselect from 'vue-multiselect'

const props = defineProps({
  modelValue: [Number, Array, Object, String, null],
  options: Array,
  multiple: Boolean,
  required: Boolean,
  placeholder: String,
  label: String,
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

const isInvalid = computed(() => {
  return (
    props.required &&
    (!selectedValue.value ||
      (Array.isArray(selectedValue.value) && selectedValue.value.length === 0))
  )
})
</script>

<style>
@import 'vue-multiselect/dist/vue-multiselect.css';
</style>
