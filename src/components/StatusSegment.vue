<script setup>
const model = defineModel({ type:String, default:'PENDING' })
const options = [
  {v:'PENDING', t:'Pending'},
  {v:'WORKING', t:'Working'},
  {v:'COMPLETED', t:'Completed'}
]
</script>

<template>
  <div class="inline-flex rounded-lg border overflow-hidden">
    <button
      v-for="o in options"
      :key="o.v"
      type="button"
      class="px-3 py-1.5 text-sm"
      :class="model===o.v ? 'bg-gray-900 text-white' : 'bg-white hover:bg-gray-50'"
      @click="model = o.v"
    >
      {{ o.t }}
    </button>
  </div>
</template>
