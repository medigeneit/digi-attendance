<script setup>
import { useChatStore } from '@/stores/chat'
import { computed, onMounted, ref, watch } from 'vue'
import ConversationListItem from './ConversationListItem.vue'
import ConversationLoader from './ConversationLoader.vue'
import ConversationNotFoundMessage from './ConversationNotFoundMessage.vue'

const chatStore = useChatStore()
const isLoading = ref(false)

let searchTimeout = null

watch(() => chatStore.searchText, (newVal) => {
  if (searchTimeout) clearTimeout(searchTimeout)
  
  if (!newVal) {
    chatStore.searchedUsers = []
    return
  }

  searchTimeout = setTimeout(() => {
    chatStore.searchUsers(newVal)
  }, 300)
})

const selectUser = async (user) => {
  // Check if we already have a direct conversation with this user
  const existingConversation = chatStore.conversations.find(c => 
    c.type === 'direct' && 
    c.participants?.some(p => p.user_id === user.id)
  )

  if (existingConversation) {
    chatStore.activeConversationId = existingConversation.id
  } else {
    // Create new conversation
    try {
      const newId = await chatStore.createConversation({
        type: 'direct',
        user_ids: [user.id]
      })
      if (newId) {
        chatStore.activeConversationId = newId
        // Refresh list to show new conversation
        await chatStore.fetchUserConversations()
      }
    } catch (error) {
      console.error('Failed to create conversation', error)
    }
  }
  
  chatStore.clearSearch()
}

// Filter out users who already have conversations
const filteredUsers = computed(() => {
  if (!chatStore.searchedUsers || chatStore.searchedUsers.length === 0) return []
  
  // Get all user IDs from existing direct conversations
  const existingUserIds = chatStore.conversations
    .filter(c => c.type === 'direct')
    .flatMap(c => c.participants?.map(p => p.user_id) || [])
  
  // Return users not in existing conversations
  return chatStore.searchedUsers.filter(user => !existingUserIds.includes(user.id))
})

onMounted(async () => {
  isLoading.value = true
  await chatStore.fetchUserConversations()
  isLoading.value = false
})
</script>

<template>
  <div>
    <div class="overflow-y-auto h-[calc(100dvh-150px)] scrollbar-hide text-blue-900 bg-white border-0">
      <ConversationLoader v-if="isLoading" />
      
      <ConversationNotFoundMessage v-else-if="chatStore.conversations.length === 0 && !chatStore.searchText" />
      
      <div v-else-if="chatStore.searchText && chatStore.filteredConversations.length === 0 && filteredUsers.length === 0" class="p-4 text-center text-gray-500">
        No results found
      </div>
      
      <template v-else>
        <!-- Conversations Section -->
        <div v-if="chatStore.filteredConversations.length > 0">
          <h3 v-if="chatStore.searchText" class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-4 pt-2">Conversations</h3>
          <ConversationListItem
            v-for="conversation in chatStore.filteredConversations"
            :key="conversation.id"
            :conversation="conversation"
          />
        </div>

        <!-- People Section -->
        <div v-if="chatStore.searchText && filteredUsers.length > 0" class="p-2">
          <h3 class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-2">People</h3>
          <div 
            v-for="user in filteredUsers" 
            :key="user.id"
            @click="selectUser(user)"
            class="flex items-center p-2 hover:bg-gray-100 rounded-lg cursor-pointer transition-colors"
          >
            <img 
              :src="user.photo || 'https://ui-avatars.com/api/?name=' + user.name" 
              class="w-10 h-10 rounded-full object-cover mr-3"
              alt=""
            >
            <div>
              <div class="font-medium text-gray-900">{{ user.name }}</div>
              <div class="text-xs text-gray-500">{{ user.designation?.title || 'Employee' }}</div>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>
