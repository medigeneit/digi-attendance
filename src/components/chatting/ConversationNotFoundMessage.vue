<script setup>
import AddNewButton from './AddNewButton.vue'
</script>

<template>
  <div class="flex flex-col items-center justify-center p-4 text-center text-gray-600">
    <i class="fas fa-info-circle text-xl"></i>
    <p class="mt-2 mb-4">
      No conversations found. <br />
      Start a new conversation!
    </p>
    <AddNewButton />
  </div>
</template>
