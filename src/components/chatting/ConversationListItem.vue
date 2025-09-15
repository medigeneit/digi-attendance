<script setup>
import { computed } from 'vue'
import UserAvatar from '../UserAvatar.vue'
import ConversationAvatar from './ConversationAvatar.vue'

const props = defineProps({
  conversation: {
    type: Object,
    required: true,
  },
  isActive: {
    type: Boolean,
    default: false,
  },
})

const resolveConversationTitle = computed(() => {
  if (props.conversation?.title) {
    return props.conversation.title
  }

  if (props.conversation.participants && props.conversation.participants.length > 0) {
    return props.conversation.participants.map((p) => p.user?.name).join(', ')
  }

  return 'Untitled Conversation'
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
          {{ resolveConversationTitle }}
        </h3>
        <div
          v-if="conversation.last_message?.body"
          class="text-sm text-gray-600 flex items-center gap-1 group-hover:text-gray-50"
          :class="{ 'text-gray-50': isActive }"
        >
          <UserAvatar
            v-if="conversation.last_message?.sender"
            :user="conversation.last_message?.sender"
            size="xsmall"
            :title="conversation.last_message?.sender?.name"
          />
          <div class="line-clamp-1">
            {{ conversation.last_message?.body }}
          </div>
        </div>
        <div
          v-else
          class="text-sm text-gray-600 flex items-center gap-1 group-hover:text-gray-50"
          :class="{ 'text-white': isActive }"
        >
          <i class="fas fa-info-circle"></i>
          <i class="line-clamp-1">Now you can message each other.</i>
        </div>
      </div>
    </div>
  </RouterLink>
</template>
