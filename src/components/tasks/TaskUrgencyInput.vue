<script setup>
import { computed } from 'vue'

const props = defineProps({
  isImportant: { type: [Boolean, Number], required: true },
  isUrgent: { type: [Boolean, Number], required: true },
})

const emit = defineEmits(['update:isUrgent', 'update:isImportant'])

const is_urgent = computed({
  get() {
    return props.isUrgent
  },
  set(value) {
    emit('update:isUrgent', value)
  },
})

const is_important = computed({
  get() {
    return props.isImportant
  },
  set(value) {
    emit('update:isImportant', value)
  },
})

const is_regular_task = computed({
  set: () => {
    is_important.value = false
    is_urgent.value = false
  },
  get: () => {
    return !(is_important.value || is_urgent.value)
  },
})
</script>

<template>
  <div class="flex-col sm:flex-row flex gap-x-16 gap-y-4 items-center">
    <label
      class="w-full border px-2 py-0.5 rounded cursor-pointer"
      :class="{
        'border-blue-500 bg-green-200': is_regular_task,
        'bg-gray-50 hover:bg-green-50': !is_regular_task,
      }"
    >
      <div class="flex gap-1 items-center">
        <input
          type="checkbox"
          v-model="is_regular_task"
          class="size-4"
          :disabled="is_regular_task"
        />
        <span class="block text-gray-600 text-base font-medium flex-shrink-0">Regular Task</span>
      </div>
      <div class="text-sm text-gray-500 flex-shrink-0">1-30 Days</div>
    </label>

    <label
      class="w-full border px-2 py-0.5 rounded cursor-pointer"
      :class="{
        'border-yellow-500 bg-yellow-200': is_important,
        'bg-gray-50 hover:bg-yellow-50': !is_important,
      }"
    >
      <div class="flex gap-1 items-center">
        <input type="checkbox" v-model="is_important" class="size-4" />
        <span class="block text-gray-600 text-base font-medium flex-shrink-0">Important Task</span>
      </div>
      <div class="text-sm text-gray-500 flex-shrink-0">1-7 Days</div>
    </label>

    <label
      class="w-full border px-2 py-0.5 rounded cursor-pointer"
      :class="{
        'border-red-500 bg-red-200': is_urgent,
        'bg-gray-50 hover:bg-red-50': !is_urgent,
      }"
    >
      <div class="flex gap-1 items-center">
        <input type="checkbox" v-model="is_urgent" class="size-4" />
        <span class="block text-gray-600 text-base font-medium flex-shrink-0">Urgent Task</span>
      </div>
      <div class="text-sm text-gray-500 flex-shrink-0">1-3 Days</div>
    </label>
  </div>
</template>
