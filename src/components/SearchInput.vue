<script setup>
import { computed, ref } from 'vue'

const props = defineProps({
  modelValue: String,
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
    clearTimeout(timeoutId)
    timeoutId = setTimeout(emitSearchText, 500, value)
  },
})
</script>
<template>
  <div class="text-gray-600 relative">
    <label class="absolute text-xs left-2.5 -top-1.5 bg-slate-100 text-blue-500">Search</label>
    <input
      ref="searchInput"
      id="search"
      v-model="search"
      type="text"
      class="input-1 !pr-7 w-full"
      placeholder="Search by main task title"
    />
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
