<script setup>
import { useChatStore } from '@/stores/chat'
import { onMounted, watch } from 'vue'
import ChatMessageCard from './ChatMessageCard.vue'
import ConversationLoader from './ConversationLoader.vue'

const props = defineProps({
  conversationId: {
    type: [String, Number],
    required: false,
    default: null,
  },
})

const chatStore = useChatStore()

const fetchData = async () => {
  if (props.conversationId) {
    await chatStore.fetchConversationMessages(props.conversationId)
  }
}

onMounted(() => {
  fetchData()
})

watch(
  () => props.conversationId,
  (newVal) => {
    if (newVal) {
      fetchData()
    }
  },
)
</script>

<template>
  <div
    class="w-full overflow-y-auto h-[calc(100vh-200px)] scrollbar space-y-8 p-4 gap-8"
    :class="{
      'justify-center': !props.conversationId || chatStore.error || chatStore.loading,
      'justify-end flex-col-reverse':
        props.conversationId && !chatStore.error && !chatStore.loading,
    }"
  >
    <ConversationLoader v-if="chatStore.loading" />
    <div v-if="chatStore.error" class="text-red-500 text-center my-4">
      {{ chatStore.error }}
    </div>
    <div v-else-if="!props.conversationId" class="text-center text-gray-500 my-4">
      Please select a conversation to view messages.
    </div>
    <template v-else>
      <ChatMessageCard v-for="message in chatStore.messages" :key="message.id" :message="message" />
    </template>
    <div class="h-10"></div>
  </div>
</template>
