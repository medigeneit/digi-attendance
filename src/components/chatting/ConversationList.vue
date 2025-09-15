<script setup>
import { useChatStore } from '@/stores/chat'
import { onMounted } from 'vue'
import ConversationListItem from './ConversationListItem.vue'
import ConversationLoader from './ConversationLoader.vue'
import ConversationNotFoundMessage from './ConversationNotFoundMessage.vue'

const chatStore = useChatStore()

const props = defineProps({
  conversationId: {
    type: [String, Number],
    required: false,
    default: null,
  },
})

onMounted(() => {
  chatStore.fetchUserConversations()
})
</script>

<template>
  <div>
    <div class="overflow-y-auto h-[calc(100vh-200px)] scrollbar text-blue-900 bg-white border-0">
      <ConversationLoader v-if="chatStore.loading" />
      <ConversationNotFoundMessage v-else-if="chatStore.conversations.length === 0" />
      <template v-else>
        <ConversationListItem
          v-for="conversation in chatStore.conversations"
          :key="conversation.id"
          :conversation="conversation"
          :isActive="parseInt(conversationId) === parseInt(conversation.id)"
        />
      </template>
    </div>
  </div>
</template>
