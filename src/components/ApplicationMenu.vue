<script setup>
import { onMounted, onBeforeUnmount } from 'vue'

const actions = [
  { label: 'Add Leave Application', route: 'LeaveApplicationAdd' },
  { label: 'Add Offday Exchange', route: 'OffdayExchangeAdd' },
  { label: 'Add Shift Exchange', route: 'ShiftExchangeAdd' },
  { label: 'Add Manual Attendance', route: 'ManualAttendanceAdd' },
  { label: 'Add Overtime', route: 'MyOvertimeAdd' },
]

const emits = defineEmits(['close'])

// Escape key close
const handleKeydown = (e) => {
  if (e.key === 'Escape') emits('close')
}

onMounted(() => document.addEventListener('keydown', handleKeydown))
onBeforeUnmount(() => document.removeEventListener('keydown', handleKeydown))
</script>

<template>
  <!-- Overlay for clicking outside -->
  <div class="fixed inset-0 bg-black bg-opacity-25 z-40" @click.self="emits('close')">
    <!-- Dropdown Panel -->
    <div
      class="absolute right-4 md:right-10 md:top-16 top-20 w-72 max-h-[28rem] overflow-y-auto bg-white shadow-xl border border-gray-200 rounded-xl p-4 z-50 transition-all duration-200 ease-out"
    >
      <!-- Header -->
      <div class="flex items-center justify-between mb-4 border-b pb-2">
        <h2 class="text-lg font-semibold text-gray-800">Application Category</h2>
        <button @click="emits('close')" class="text-gray-400 hover:text-red-500 text-2xl leading-none">
          &times;
        </button>
      </div>

      <!-- Action Links -->
      <div class="space-y-3">
        <router-link
          v-for="(item, i) in actions"
          :key="i"
          :to="{ name: item.route }"
          class="block w-full text-center bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 font-medium py-2 rounded-md hover:from-blue-200 hover:to-blue-300 transition"
        >
          {{ item.label }}
        </router-link>
      </div>

      <!-- Close Button -->
      <button
        @click="emits('close')"
        class="mt-6 w-full bg-red-500 hover:bg-red-600 text-white py-2 rounded-md font-semibold transition"
      >
        Close
      </button>
    </div>
  </div>
</template>
