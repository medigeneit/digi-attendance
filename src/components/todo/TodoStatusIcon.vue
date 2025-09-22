<script setup>
defineProps({
  todo: { type: Object, required: true },
})
</script>

<template>
  <i
    class="fa fa-exclamation-circle text-red-400"
    v-if="todo.status == 'PENDING'"
    title="Pending"
  ></i>
  <i
    class="fa fa-exclamation-square text-yellow-400"
    v-if="todo.status == 'WORKING'"
    title="Wording"
  ></i>
  <i
    class="fa fa-check-square text-green-400"
    v-if="todo.status == 'COMPLETED'"
    title="Completed"
  ></i>
</template>
