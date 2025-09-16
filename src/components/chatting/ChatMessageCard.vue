<script setup>
import { useAuthStore } from '@/stores/auth'
import { computed } from 'vue'
import UserAvatar from '../UserAvatar.vue'

const authStore = useAuthStore()

const props = defineProps({
  message: {
    type: Object,
    required: true,
  },
})

const isOwnMessage = computed(() => {
  return props.message.is_own_message
})
</script>

<template>
  <div
    class="flex"
    :class="{
      'justify-end pl-12': isOwnMessage,
      'justify-start pr-12': !isOwnMessage,
    }"
  >
    <div>
      <div class="border rounded-lg max-w-lg w-full">
        <div
          class="flex justify-between items-center p-1 rounded-t-lg gap-4"
          :class="{
            'bg-[#24A1DE] text-white': isOwnMessage,
            'bg-gray-200 text-black': !isOwnMessage,
          }"
        >
          <div class="flex items-center gap-1">
            <UserAvatar :user="message.sender" size="small" />
            <div class="font-semibold hidden sm:inline-block text-sm">
              {{ message.sender?.name }}
            </div>
          </div>
          <div class="text-xs mt-1" :class="isOwnMessage ? 'text-right' : 'text-left'">
            {{ message.send_at }}
          </div>
        </div>
        <div
          class="block py-1 px-2 rounded-b-lg bg-white text-sm whitespace-pre-wrap break-words leading-relaxed"
          v-html="message.body"
        ></div>
      </div>
      <div
        class="flex"
        :class="{
          'justify-end': isOwnMessage,
          'justify-start': !isOwnMessage,
        }"
      >
        <div
          class="flex flex-wrap gap-1 max-w-[280px] pt-1"
          :class="{
            'justify-end': isOwnMessage,
            'justify-start': !isOwnMessage,
          }"
        >
          <template v-for="photo in message.last_reader_photos" :key="photo">
            <UserAvatar v-if="photo" :user="{ photo }" size="xsmall" />
          </template>
        </div>
      </div>
    </div>
  </div>
</template>
