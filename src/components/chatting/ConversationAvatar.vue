<script setup>
import { ref } from 'vue'

defineProps({
  conversation: {
    type: Object,
    required: true,
  },
})

const showUserPhoto = ref(true)
</script>

<template>
  <div>
    <div
      class="min-w-max size-8 md:size-12 flex justify-center items-center text-[#24A1DE] bg-white rounded-full overflow-hidden border"
    >
      <img
        v-if="conversation?.avatar && showUserPhoto"
        @error="showUserPhoto = false"
        :src="conversation?.avatar"
        alt="Photo"
        class="object-cover w-full h-full"
      />
      <template v-else>
        <i v-if="conversation.type === 'group'" class="fas fa-users md:text-3xl"></i>
        <i v-else class="fas fa-user md:text-3xl"></i>
      </template>
    </div>
  </div>
</template>
