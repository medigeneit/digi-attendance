<script setup>
import { RouterView } from 'vue-router'
</script>

<template>
  <RouterView />
</template>

<style>
.multiselect__tags {
  @apply !border-0;
}

.multiselect__select {
  @apply !bottom-0 !top-auto right-0;
}
</style>
