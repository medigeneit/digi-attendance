<script setup>
import { useChatStore } from '@/stores/chat'
import { computed } from 'vue'
import UserAvatar from '../UserAvatar.vue'
import ConversationAvatar from './ConversationAvatar.vue'

const chatStore = useChatStore()

const props = defineProps({
  conversation: {
    type: Object,
    required: true,
  },
})

const isActive = computed(() => {
  return parseInt(props.conversation.id) === parseInt(chatStore.activeConversationId)
})
</script>

<template>
  <RouterLink
    v-if="conversation?.id"
    :to="`/chatting/${conversation.id}`"
    class="block p-3 border-b cursor-pointer hover:bg-[#24A1DE] hover:text-white group hover:opacity-90"
    :class="{ 'bg-[#24A1DE] text-white': isActive }"
  >
    <div class="flex items-center gap-2">
      <ConversationAvatar :conversation="conversation" />
      <div>
        <h3 class="text-lg font-semibold">
          {{ conversation.title }}
        </h3>
        <div
          class="text-sm group-hover:text-gray-50 line-clamp-1"
          :class="{ 'text-gray-50': isActive, 'text-gray-600': !isActive }"
          v-html="conversation.subtitle"
        ></div>
      </div>
    </div>
  </RouterLink>
</template>
