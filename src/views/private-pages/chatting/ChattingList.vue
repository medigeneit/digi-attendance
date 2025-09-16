<script setup>
import AddNewButton from '@/components/chatting/AddNewButton.vue'
import AddNewConversationModal from '@/components/chatting/AddNewConversationModal.vue'
import ChatMessageContainer from '@/components/chatting/ChatMessageContainer.vue'
import ConversationHeader from '@/components/chatting/ConversationHeader.vue'
import ConversationList from '@/components/chatting/ConversationList.vue'
import SearchConversation from '@/components/chatting/SearchConversation.vue'
import SendMessageBox from '@/components/chatting/SendMessageBox.vue'
import { useChatStore } from '@/stores/chat'
import { watch } from 'vue'
import { useRoute } from 'vue-router'

const chatStore = useChatStore()

const route = useRoute()

watch(
  () => route.params.conversationId,
  (newVal) => {
    chatStore.activeConversationId = newVal
  },
  {
    immediate: true,
  },
)
</script>

<template>
  <div class="my-container">
    <div class="flex overflow-hidden border-[#24A1DE] border rounded-lg">
      <div class="grow-0 shrink-0 w-[360px] rounded-l-lg">
        <div
          class="flex items-center justify-between border-b border-[#24A1DE] bg-white rounded-tl-lg"
        >
          <SearchConversation />
          <AddNewButton />
        </div>
        <ConversationList />
      </div>
      <div
        class="relative grow shrink border-l rounded-r-lg overflow-hidden bg-gray-100 border-[#24A1DE]"
      >
        <h2 v-if="!chatStore.activeConversationId" class="text-2xl font-bold my-8 text-center">
          Select a conversation to start chatting
        </h2>
        <template v-else>
          <ConversationHeader />
          <ChatMessageContainer />
          <SendMessageBox
            class="bg-white border-t border-[#24A1DE] absolute left-0 right-0 bottom-0 w-full p-2"
          />
        </template>
      </div>
    </div>
  </div>
  <AddNewConversationModal />
</template>
