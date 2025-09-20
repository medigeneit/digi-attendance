<script setup>
import { useChatStore } from '@/stores/chat'
import { onMounted, ref } from 'vue'
import ConversationListItem from './ConversationListItem.vue'
import ConversationLoader from './ConversationLoader.vue'
import ConversationNotFoundMessage from './ConversationNotFoundMessage.vue'

const chatStore = useChatStore()
const isLoading = ref(false)

onMounted(async () => {
  isLoading.value = true
  await chatStore.fetchUserConversations()
  isLoading.value = false
})
</script>

<template>
  <div>
    <div class="overflow-y-auto h-[calc(100vh-150px)] scrollbar text-blue-900 bg-white border-0">
      <ConversationLoader v-if="isLoading" />
      <ConversationNotFoundMessage v-else-if="chatStore.conversations.length === 0" />
      <template v-else>
        <ConversationListItem
          v-for="conversation in chatStore.filteredConversations"
          :key="conversation.id"
          :conversation="conversation"
        />
      </template>
    </div>
  </div>
</template>
