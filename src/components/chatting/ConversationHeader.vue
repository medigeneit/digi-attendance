<script setup>
import { useChatStore } from '@/stores/chat'
import AddNewMemberButton from './AddNewMemberButton.vue'
import ConversationAvatar from './ConversationAvatar.vue'

const chatStore = useChatStore()
</script>

<template>
  <div class="bg-[#24A1DE] border-b border-[#24A1DE] text-white h-[48px] md:h-[56px] flex items-center">
    <div
      v-if="chatStore?.activeConversation?.id"
      class="w-full flex items-center justify-start gap-2 px-1 py-[3px]"
    >
      <ConversationAvatar :conversation="chatStore.activeConversation" />
      <div>
        <h3 class="md:text-lg font-semibold line-clamp-1">
          {{ chatStore.activeConversation?.title }}
        </h3>
        <div
          v-if="chatStore.activeConversation.type === 'group'"
          class="text-xs md:text-sm text-gray-50 flex items-center gap-1 font-thin"
        >
          <i class="fas fa-users"></i>
          <i class="line-clamp-1">Group chatting</i>
        </div>
        <div v-else class="text-xs md:text-sm text-gray-50 flex items-center gap-1 font-thin">
          <i class="fas fa-handshake"></i>
          <i class="line-clamp-1">One to One chatting</i>
        </div>
      </div>
      <AddNewMemberButton class="ml-auto md:mr-3" />
    </div>
  </div>
</template>
