import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import apiClient from '../axios'

export const useChatStore = defineStore('chat', () => {
  const loading = ref(false)
  const error = ref(null)
  const openAddModal = ref(false)
  const conversations = ref([])
  const conversation = ref({})
  const activeConversationId = ref(null)
  const messages = ref([])
  const searchText = ref('')

  const activeConversation = computed(() => {
    if (conversations.value?.length === 0) {
      return {}
    }

    return conversations.value?.find(
      (conversation) => parseInt(conversation.id) === parseInt(activeConversationId.value),
    )
  })

  const filteredConversations = computed(() => {
    if (conversations.value?.length === 0) {
      return []
    }

    if (!searchText.value) {
      return conversations.value
    }

    return conversations.value?.filter((conversation) =>
      conversation?.title?.toLowerCase().includes(searchText.value),
    )
  })

  const fetchUserConversations = async (params = {}) => {
    loading.value = true
    error.value = null

    try {
      const response = await apiClient.get('/chat/conversations', { params })
      conversations.value = response.data
    } catch (err) {
      error.value = err.response?.data?.message || 'ডাটা লোড করতে ব্যর্থ হয়েছে।'
      console.error('Error fetching conversations:', err)
    } finally {
      loading.value = false
    }
  }

  const fetchConversationById = async (conversationsId) => {
    loading.value = true
    error.value = null

    conversation.value = {}

    try {
      const response = await apiClient.get(`/chat/conversations/${conversationsId}`)
      conversation.value = response.data
    } catch (err) {
      error.value = err.response?.data?.message || 'ডাটা লোড করতে ব্যর্থ হয়েছে।'
      console.error('Error fetching conversation:', err)
    } finally {
      loading.value = false
    }
  }

  const fetchConversationMessages = async (conversationsId, params = {}) => {
    loading.value = true
    error.value = null

    messages.value = []

    try {
      const response = await apiClient.get(`/chat/conversations/${conversationsId}/messages`, {
        params,
      })
      messages.value = response.data
    } catch (err) {
      error.value = err.response?.data?.message || 'ডাটা লোড করতে ব্যর্থ হয়েছে।'
      console.error('Error fetching messages:', err)
    } finally {
      loading.value = false
    }
  }

  return {
    loading,
    error,
    openAddModal,
    searchText,
    conversations,
    filteredConversations,
    conversation,
    activeConversationId,
    activeConversation,
    messages,
    fetchUserConversations,
    fetchConversationById,
    fetchConversationMessages,
  }
})
