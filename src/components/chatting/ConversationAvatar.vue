<script setup>
import { ref } from 'vue'
import UserAvatar from '../UserAvatar.vue'

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
    <template v-if="conversation.type === 'group'">
      <div
        class="min-w-max size-12 flex justify-center items-center text-[#24A1DE] bg-white rounded-full overflow-hidden border"
      >
        <img
          v-if="conversation?.meta?.icon && showUserPhoto"
          @error="showUserPhoto = false"
          :src="conversation?.meta?.icon"
          alt="Group Photo"
          class="object-cover w-full h-full"
        />
        <i v-else class="fas fa-users text-3xl"></i>
      </div>
    </template>
    <UserAvatar v-else :user="conversation.participants[0]?.user" size="large" />
  </div>
</template>
