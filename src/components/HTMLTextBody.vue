<script setup>
import { convertHttpLinks, convertTaskLinks } from '@/libs/convert-to-links'
import { computed } from 'vue'

const props = defineProps({
  message: {
    type: String,
    required: true,
  },
})

// 🔹 computed এ শুধু method কল করা হচ্ছে
const computedMessage = computed(() => {
  return convertHttpLinks(convertTaskLinks(props.message.trim()))
})
</script>

<template>
  <div class="prose prose-sm max-w-none leading-loose text-sm" v-html="computedMessage"></div>
</template>
