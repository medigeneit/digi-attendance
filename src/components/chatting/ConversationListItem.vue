<script setup>
import { useChatStore } from '@/stores/chat'
import { computed } from 'vue'
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
    class="block p-1.5 md:p-3 border-b cursor-pointer hover:bg-[#24A1DE] hover:text-white group hover:opacity-90"
    :class="{ 'bg-[#24A1DE] text-white': isActive }"
    @click="chatStore.showMobileConversationList = false"
  >
    <div class="flex items-center gap-2 relative">
      <ConversationAvatar :conversation="conversation" />
      <div
        :class="{
          hidden: !chatStore.showMobileConversationList,
        }"
        class="md:block"
      >
        <h3 :title="conversation.title" class="md:text-lg font-semibold line-clamp-1">
          {{ conversation.title }}
        </h3>
        <div
          class="text-xs md:text-sm group-hover:text-gray-50 line-clamp-1"
          :class="{ 'text-gray-50': isActive, 'text-gray-600': !isActive, 'font-bold': conversation?.unread?.count }"
          v-html="conversation.subtitle"
        ></div>
      </div>
      <div v-if="conversation?.unread?.count" class="absolute right-0 top-1/2 -translate-y-1/2">
        <span
          class="flex justify-center items-center size-5 text-[9px] text-white rounded-full bg-red-600"
        >
          {{ conversation?.unread?.count }}
        </span>
      </div>
    </div>
  </RouterLink>
</template>
