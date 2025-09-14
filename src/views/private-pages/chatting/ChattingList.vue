<script setup>
import UserAvatar from '@/components/UserAvatar.vue'
import { useChatStore } from '@/stores/chat'
import { onMounted } from 'vue'

const chatStore = useChatStore()

onMounted(() => {
  chatStore.fetchUserConversations()
})

const resolveConversationIcon = function (conversation) {
  if (conversation.icon) {
    return conversation.icon
  }

  if (conversation.participants && conversation.participants.length > 0) {
    return conversation.participants[0].user?.avatar || 'https://via.placeholder.com/40'
  }

  return 'https://via.placeholder.com/40'
}

const resolveConversationTitle = function (conversation) {
  if (conversation.title) {
    return conversation.title
  }

  if (conversation.participants && conversation.participants.length > 0) {
    return conversation.participants.map((p) => p.user?.name).join(', ')
  }

  return 'Untitled Conversation'
}
</script>

<template>
  <div class="my-container">
    <div class="flex overflow-hidden">
      <div class="border grow-0 shrink-0 w-80 rounded-l-lg">
        <div class="flex items-center justify-between border-b border-[#24A1DE] bg-white rounded-tl-lg">
          <label for="search" class="grow shrink relative block">
            <i class="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-[#24A1DE]"></i>
            <input
              id="search"
              placeholder="Search Conversations..."
              type="search"
              class="input-1 pl-10 pr-2 rounded-b-none border-none outline-[#24a0deb0] py-3 rounded-none rounded-tl-lg"
            />
          </label>
          <div class="w-12 shrink-0 grow-0 flex justify-center items-center">
            <i title="Add New Conversation" class="fas fa-comment-alt-plus text-3xl cursor-pointer text-[#24A1DE]"></i>
          </div>
        </div>
        <div
          class="overflow-y-auto h-[calc(100vh-200px)] scrollbar text-blue-900 bg-white border-0"
        >
          <div
            v-for="conversation in chatStore.conversations"
            :key="conversation.id"
            class="p-3 border-b cursor-pointer hover:bg-[#24A1DE] hover:text-white group"
          >
            <div class="flex items-center gap-2">
              <div>
                <template v-if="conversation.type === 'group'">
                  <img
                    v-if="conversation?.meta?.icon"
                    @error="showUserPhoto = false"
                    :src="user.photo"
                    :alt="userInitial"
                  />
                  <div
                    class="size-12 rounded-full border bg-white text-blue-900 flex justify-center items-center"
                  >
                    <i class="fas fa-users text-2xl"></i>
                  </div>
                </template>
                <UserAvatar v-else :user="conversation.participants[0]?.user" size="large" />
              </div>
              <div>
                <h3 class="text-lg font-semibold">
                  {{ resolveConversationTitle(conversation) }}
                </h3>
                <div
                  v-if="conversation.last_message?.body"
                  class="text-sm text-gray-600 flex items-center gap-1 group-hover:text-gray-50"
                >
                  <UserAvatar
                    v-if="conversation.last_message?.sender"
                    :user="conversation.last_message?.sender"
                    size="xsmall"
                  />
                  <p class="line-clamp-1">{{ conversation.last_message?.body }}</p>
                </div>
                <div
                  v-else
                  class="text-sm text-gray-600 flex items-center gap-1 group-hover:text-gray-50"
                >
                  <i class="fas fa-info-circle"></i>
                  <i class="line-clamp-1"> Now you can message each other. </i>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="relative grow shrink p-4 border rounded-r-lg overflow-hidden bg-white">
        <h2 class="text-2xl font-bold my-8 text-center">Select a conversation to start chatting</h2>
        <!-- Chat window will go here -->
      </div>
    </div>
  </div>
</template>
