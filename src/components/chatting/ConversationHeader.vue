<script setup>
import { useChatStore } from '@/stores/chat'
import { computed, onMounted, watch } from 'vue'
import UserAvatar from '../UserAvatar.vue'
import ConversationAvatar from './ConversationAvatar.vue'

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
    await chatStore.fetchConversationById(props.conversationId)
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

const resolveConversationTitle = computed(() => {
  if (chatStore.conversation?.title) {
    return chatStore.conversation.title
  }

  if (chatStore.conversation.participants && chatStore.conversation.participants.length > 0) {
    return chatStore.conversation.participants.map((p) => p.user?.name).join(', ')
  }

  return 'Untitled Conversation'
})
</script>

<template>
  <div
    v-if="chatStore?.conversation?.id"
    class="flex items-center justify-start gap-2 px-1 py-[3px] bg-[#24A1DE] border-b border-[#24A1DE] text-white"
  >
    <ConversationAvatar :conversation="chatStore.conversation" />
    <div>
      <h3 class="text-lg font-semibold">
        {{ resolveConversationTitle }}
      </h3>
      <div
        v-if="chatStore.conversation.type === 'group'"
        class="text-sm text-gray-50 flex items-center gap-0.5 overflow-hidden"
      >
        <div
          v-for="participant in chatStore.conversation?.participants"
          :key="participant.id"
          class="flex gap-0.5 items-center min-w-max"
        >
          <UserAvatar :user="participant.user" size="xsmall" :title="participant.user?.name" />
          <!-- <span>{{ participant.user?.name }}</span> -->
        </div>
      </div>
      <div v-else class="text-sm text-gray-50 flex items-center gap-1 font-thin">
        <i class="fas fa-handshake"></i>
        <i>One to One chatting</i>
      </div>
    </div>
  </div>
</template>
