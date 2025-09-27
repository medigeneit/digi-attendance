<template>
  <div>
    <button class="px-4 py-2 rounded-xl bg-neutral-900 text-white" @click="open = true">
      Open dialog
    </button>

    <!-- Modal -->
    <div v-if="open" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-black/50" @click="open = false"></div>
      <div
        class="relative w-full max-w-md rounded-2xl bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 p-5"
      >
        <h3 class="text-lg font-semibold">Confirm action</h3>
        <p class="mt-1 text-sm text-neutral-500">Are you sure you want to continue?</p>
        <div class="mt-4 flex justify-end gap-2">
          <button
            class="px-4 py-2 rounded-xl border border-neutral-300 hover:bg-neutral-100"
            @click="open = false"
          >
            Cancel
          </button>
          <button class="px-4 py-2 rounded-xl bg-rose-600 text-white" @click="confirm()">
            Confirm
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
const open = ref(false)
function confirm() {
  open.value = false
  alert('Confirmed!')
}
</script>
