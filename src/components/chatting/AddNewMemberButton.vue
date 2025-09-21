<script setup>
import { useAuthStore } from '@/stores/auth'
import { useChatStore } from '@/stores/chat'

const chatStore = useChatStore()
const authStore = useAuthStore()
</script>

<template>
  <div
    v-if="
      chatStore.activeConversationId &&
      chatStore.activeConversation.type === 'group' &&
      ['admin', 'super_admin', 'developer'].includes(authStore.user?.role)
    "
  >
    <div
      class="size-8 rounded-full text-sm border flex justify-center items-center cursor-pointer"
      title="Add New Members"
      @click="chatStore.openAddMemberModal = true"
    >
      <i class="fas fa-user-plus"></i>
    </div>
  </div>
</template>
