<script setup>
import { useRouter } from 'vue-router';

const { title, rightButtonLabel } = defineProps({
  title: {
    type: String,
    required: true,
  },
  rightButtonLabel: {
    type: String,
    default: 'Add New',
  }
});

const emit = defineEmits(['add']);

const router = useRouter();

const goBack = () => {
  router.go(-1);
};
</script>

<template>
  <div class="flex items-center justify-between gap-2">
    <button class="btn-3" @click="goBack">
      <i class="far fa-arrow-left"></i>
      <span class="hidden md:flex">Back</span>
    </button>

    <h1 class="title-md md:title-lg flex-wrap text-center">
      {{ title }}
    </h1>

    <button class="btn-2" @click="emit('add')">
      <span class="hidden md:flex">{{ rightButtonLabel }}</span>
      <i class="far fa-plus"></i>
    </button>
  </div>
</template>
