<template>
  <div>
    <slot name="label"></slot>
    <Multiselect
      v-model="selectedValue"
      @select="(opt, val) => emit('select', opt, val)"
      @remove="(opt, val) => emit('remove', opt, val)"
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
        <slot name="option" :option="option">
          <div>
            <span v-if="labelPrefix">{{ labelPrefix ? option[labelPrefix] : '' }} - </span>

            <span v-if="option[label]">{{ option[label] }}</span>
            <span v-else-if="option?.title">{{ option?.title }}</span>
            <span v-else>{{ option?.name || option?.id }}</span>
          </div>
        </slot>
      </template>

      <!-- Customize the selected label for single select -->
      <template #singleLabel="{ option }">
        <slot name="singleLabel" :option="option">
          <div
            class="line-clamp-1"
            :title="option?.[label] || option?.title || option?.name || option?.id"
          >
            <span v-if="labelPrefix">{{ option?.[labelPrefix] }} - </span>
            <span v-if="option?.[label]">{{ option?.[label] }}</span>
            <span v-else-if="option?.title">{{ option?.title }}</span>
            <span v-else>{{ option?.name || option?.id }}</span>
          </div>
        </slot>
      </template>

      <!-- Customize the selections for multiple select-->
      <template #selection="{ ...attrs }">
        <slot name="selection" v-bind="{ ...attrs }"></slot>
      </template>
    </Multiselect>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
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

const emit = defineEmits(['update:modelValue', 'select', 'remove'])
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
