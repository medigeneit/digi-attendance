<script setup>
import AddNewButton from '@/components/chatting/AddNewButton.vue'
import AddNewConversationModal from '@/components/chatting/AddNewConversationModal.vue'
import AddNewMemberModal from '@/components/chatting/AddNewMemberModal.vue'
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
      <div
        class="min-w-11 md:block grow-0 shrink-0 md:w-[360px] rounded-l-lg"
        :class="{
          'w-full': chatStore.showMobileConversationList,
        }"
      >
        <div
          class="h-[48px] md:h-[56px] flex justify-center items-center border-b border-[#24A1DE] bg-white rounded-tl-lg"
        >
          <div
            @click="chatStore.showMobileConversationList = true"
            class="md:hidden flex justify-center items-center text-2xl text-[#24A1DE]"
            :class="{
              hidden: chatStore.showMobileConversationList,
            }"
          >
            <i class="fas fa-bars"></i>
          </div>
          <div
            :class="chatStore.showMobileConversationList ? 'flex' : 'hidden'"
            class="w-full md:flex items-center justify-between"
          >
            <SearchConversation />
            <AddNewButton />
          </div>
        </div>
        <ConversationList />
      </div>
      <div
        class="md:block relative grow shrink border-l rounded-r-lg overflow-hidden bg-gray-100 border-[#24A1DE]"
        :class="{
          hidden: chatStore.showMobileConversationList,
        }"
      >
        <div
          v-if="!chatStore.activeConversationId"
          class="my-8 text-center px-4 grid justify-center items-center gap-2"
        >
          <i class="fad text-blue-600 fa-info-circle text-4xl md:text-7xl"></i>
          <p class="text-gray-500 md:text-4xl ">
            Select a conversation <br />
            to start chatting
          </p>
        </div>
        <template v-else>
          <ConversationHeader />
          <ChatMessageContainer>
            <SendMessageBox
              class="bg-white border-t border-[#24A1DE] sticky bottom-0 mt-auto z-10 w-full p-2"
            />
          </ChatMessageContainer>
        </template>
      </div>
    </div>
  </div>
  <AddNewConversationModal />
  <AddNewMemberModal v-if="chatStore.openAddMemberModal" />
</template>
