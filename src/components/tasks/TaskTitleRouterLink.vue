<script setup>
defineProps({ task: Object })
</script>
<template>
  <RouterLink
    :to="{
      name: 'TaskShow',
      params: { id: task.id },
    }"
    class="font-medium text-gray-700 cursor-pointer hover:text-sky-700"
  >
    <div>
      {{ task.title }}
    </div>
  </RouterLink>
</template>
