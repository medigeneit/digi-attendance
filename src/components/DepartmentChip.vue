<script setup>
defineProps({ department: Object, shortName: { Boolean, default: false } })
</script>
<template>
  <div
    class="border border-sky-400 rounded-full text-sky-500 font-semibold bg-sky-50 px-2 py-0.5 text-xs inline-block"
    :title="department?.name"
  >
    <template v-if="shortName">
      {{ department?.short_name || department?.name }}
    </template>
    <template v-else>
      {{ department?.name }}
    </template>
  </div>
</template>
