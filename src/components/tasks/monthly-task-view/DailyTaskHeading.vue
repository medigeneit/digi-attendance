<script setup lang="ts">
import { getDisplayDate } from '@/libs/datetime'

defineProps({
  selectedDay: {
    type: String,
    required: true,
  },
  loading: {
    type: Boolean,
    default: false,
  },
})
const emit = defineEmits([
  'todayButtonClick',
  'reloadClick',
  'previousDayClick',
  'nextDayClick',
  'inputSelectedDay',
])
</script>

<template>
  <div class="px-4 py-2 flex items-center bg-gray-50 group">
    <h2 class="leading-none font-semibold text-lg">Daily Task</h2>
    <div class="mx-4">{{ getDisplayDate(selectedDay) }}</div>
    <button class="btn-3 mx-4 h-7" @click.prevent="emit('todayButtonClick')">Today</button>

    <button
      class="btn-3 px-2 py-2 mx-4 size-7 disabled:text-gray-300 disabled:border-gray-300"
      :class="{ 'animate-spin text-gray-300 border-gray-300 !bg-opacity-0': loading }"
      @click.prevent="emit('reloadClick')"
      :disabled="loading"
    >
      <i class="fas fa-redo-alt"></i>
    </button>

    <div class="ml-4 md:ml-auto flex items-center gap-2">
      <button class="btn-2 h-7" @click.prevent="emit('previousDayClick')">Previous Day</button>
      <button class="btn-2 h-7" @click.prevent="emit('nextDayClick')">Next Day</button>

      <input
        type="date"
        :value="selectedDay"
        @input="emit('inputSelectedDay', $event)"
        class="border px-2 rounded"
      />
    </div>
  </div>
</template>
