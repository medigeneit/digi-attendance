<script setup>
import { computed, ref } from 'vue'

const props = defineProps({
  modelValue: String,
  label: { type: String, default: 'Search' },
  placeholder: { type: String, default: 'Type to search...' },
  debounceTime: { type: Number, default: 500 },
})

const searchInput = ref()
const emit = defineEmits(['update:modelValue'])

const emitSearchText = (value) => {
  emit('update:modelValue', value || undefined)
}
let timeoutId = 0

const search = computed({
  get() {
    return props.modelValue
  },
  set(value) {
    if (props.debounceTime > 0) {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(emitSearchText, props.debounceTime, value)
    } else {
      emitSearchText(value)
    }
  },
})
</script>
<template>
  <div class="text-gray-600 relative rounded-md px-2 py-1 border-2 border-gray-400">
    <input
      ref="searchInput"
      id="search"
      v-model="search"
      type="text"
      class="!pr-7 w-full placeholder:text-sm focus:outline-none h-full"
      :placeholder="placeholder"
    />
    <label class="absolute text-xs left-2.5 -top-1.5 bg-slate-100 text-blue-500" v-if="label">
      {{ label }}
    </label>
    <div class="absolute right-2 top-[50%] translate-y-[-50%] flex gap-1">
      <i
        class="fas fa-times opacity-35 hover:opacity-60 cursor-pointer"
        v-if="search"
        @click.prevent="
          () => {
            emitSearchText('')
            searchInput.focus()
          }
        "
      ></i>
      <i class="fas fa-search opacity-80"></i>
    </div>
  </div>
</template>
