<script setup>
import { useChatStore } from '@/stores/chat'
import { computed } from 'vue'
import ConversationAvatar from './ConversationAvatar.vue'

const chatStore = useChatStore()

const resolveConversationTitle = computed(() => {
  if (chatStore.activeConversation?.title) {
    return chatStore.activeConversation.title
  }

  if (
    chatStore.activeConversation?.participants &&
    chatStore.activeConversation?.participants?.length > 0
  ) {
    return chatStore.activeConversation?.participants?.map((p) => p.user?.name).join(', ')
  }

  return 'Untitled Conversation'
})
</script>

<template>
  <div
    v-if="chatStore?.activeConversation?.id"
    class="flex items-center justify-start gap-2 px-1 py-[3px] bg-[#24A1DE] border-b border-[#24A1DE] text-white"
  >
    <ConversationAvatar :conversation="chatStore.activeConversation" />
    <div>
      <h3 class="text-lg font-semibold">
        {{ resolveConversationTitle }}
      </h3>
      <div
        v-if="chatStore.activeConversation.type === 'group'"
        class="text-sm text-gray-50 flex items-center gap-1 font-thin"
      >
        <i class="fas fa-users"></i>
        <i>Group chatting</i>
      </div>
      <div v-else class="text-sm text-gray-50 flex items-center gap-1 font-thin">
        <i class="fas fa-handshake"></i>
        <i>One to One chatting</i>
      </div>
    </div>
  </div>
</template>
