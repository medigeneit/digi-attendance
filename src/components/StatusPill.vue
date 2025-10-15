<script setup>
const props = defineProps({ v: { type: String, default: 'PENDING' } })
</script>

<template>
  <span
    class="badge"
    :class="{
      'bg-amber-100 text-amber-800': v==='PENDING',
      'bg-blue-100 text-blue-800':  v==='WORKING',
      'bg-emerald-100 text-emerald-800': v==='COMPLETED',
      'bg-gray-100 text-gray-700': !['PENDING','WORKING','COMPLETED'].includes(v)
    }"
  >{{ v }}</span>
</template>
