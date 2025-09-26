<script setup>
import { useAuthStore } from '@/stores/auth'
import { useChatStore } from '@/stores/chat'
import { computed } from 'vue'
import UserAvatar from '../UserAvatar.vue'
import ChatMessageUnreadMarker from './ChatMessageUnreadMarker.vue'

const authStore = useAuthStore()
const chatStore = useChatStore()

const props = defineProps({
  message: {
    type: Object,
    required: true,
  },
  index: Number,
})

const isOwnMessage = computed(() => {
  return props.message.is_own_message
})

const isSystemMessage = computed(() => {
  return props.message.type === 'system'
})

const isUnreadMarker = computed(() => {
  const unread = chatStore.activeConversation?.unread
  if (!unread?.count) return false

  const lastReadId = unread.last_read_message_id ?? 0
  return lastReadId === 0 ? props.index === 0 : props.message.id === lastReadId
})
</script>

<template>
  <div class="px-2 md:px-4 grid gap-4">
    <div
      class="flex order-2"
      :class="{
        'justify-end pl-6 md:pl-12': !isSystemMessage && isOwnMessage,
        'justify-start pr-6 md:pr-12': !isSystemMessage && !isOwnMessage,
        'justify-center': isSystemMessage,
      }"
    >
      <div
        v-if="isSystemMessage"
        class="flex flex-wrap gap-x-0.5 md:gap-x-1 items-center justify-center"
      >
        <i class="far fa-cog text-gray-700 text-xs md:text-base"></i>
        <strong class="text-xs md:text-sm">
          {{ isOwnMessage ? 'You' : message.sender?.name }}
        </strong>
        <div
          v-html="message.body"
          class="block text-xs md:text-sm italic whitespace-pre-wrap break-words leading-relaxed"
        ></div>
      </div>
      <div v-else>
        <div class="border rounded-lg max-w-lg w-full min-w-40 md:min-w-80">
          <div
            class="flex justify-between items-center p-1 rounded-t-lg gap-1 md:gap-4"
            :class="{
              'bg-[#24A1DE] text-white': isOwnMessage,
              'bg-gray-200 text-black': !isOwnMessage,
            }"
          >
            <div class="grow w-full flex items-center gap-1">
              <UserAvatar :user="message.sender" size="small" />
              <div class="font-semibold sm:inline-block text-sm line-clamp-1">
                {{ message.sender?.name }}
              </div>
            </div>
            <div class="shrink md:shrink-0 text-[10px] md:text-xs mt-1 text-right">
              {{ message.send_at }}
            </div>
          </div>
          <div
            class="block py-1 px-2 rounded-b-lg bg-white text-xs md:text-sm whitespace-pre-wrap break-words leading-relaxed"
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
            <template v-for="reader in message.last_readers" :key="reader.id">
              <UserAvatar :title="reader.name" :user="reader" size="xsmall" />
            </template>
          </div>
        </div>
      </div>
    </div>
    <ChatMessageUnreadMarker v-if="isUnreadMarker" />
  </div>
</template>
