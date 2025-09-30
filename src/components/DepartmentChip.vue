<script setup>
defineProps({ department: Object })
</script>
<template>
  <div
    class="border border-sky-400 rounded-full text-sky-500 font-semibold bg-sky-50 px-1 py-0.5 text-xs inline-block"
  >
    {{ department?.name }}
  </div>
</template>
