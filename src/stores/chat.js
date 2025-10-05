import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import apiClient from '../axios'

export const useChatStore = defineStore('chat', () => {
  const loading = ref(false)
  const error = ref(null)
  const openAddModal = ref(false)
  const openAddMemberModal = ref(false)
  const showMobileConversationList = ref(false)

  const conversations = ref([])
  const conversation = ref({})
  const activeConversationId = ref(null)
  const messages = ref([])
  const searchText = ref('')

  const notificationCount = ref(0)

  const activeConversation = computed(() => {
    if (conversations.value?.length === 0) {
      return {}
    }

    return conversations.value?.find(
      (conversation) => parseInt(conversation.id) === parseInt(activeConversationId.value),
    )
  })

  const filteredConversations = computed(() => {
    const list = conversations.value || []
    if (list.length === 0) return []

    const q = (searchText.value || '').toLowerCase().trim()

    // 1) filter
    const filtered = q
      ? list.filter((c) => (c?.title || '').toLowerCase().includes(q))
      : list.slice() // clone, so original won't be mutated

    // 2) sort by numeric "sort_by"
    filtered.sort((a, b) => {
      const av = Number.isFinite(+a?.sort_by) ? +a.sort_by : Number.NEGATIVE_INFINITY
      const bv = Number.isFinite(+b?.sort_by) ? +b.sort_by : Number.NEGATIVE_INFINITY
      if (av === bv) {
        // tie-breaker: title (optional)
        return (a?.title || '').localeCompare(b?.title || '')
      }
      return bv - av
    })

    return filtered
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

  const createConversation = async (body = {}) => {
    loading.value = true
    error.value = null

    try {
      const response = await apiClient.post('/chat/conversations', body)
      activeConversationId.value = response.data.id
      return response.data.id
    } catch (err) {
      error.value = err.response?.data?.message || 'ডাটা Create করতে ব্যর্থ হয়েছে।'
      console.error('Error creating conversation:', err)
    } finally {
      loading.value = false
    }
  }

  const fetchConversationById = async (conversationId) => {
    loading.value = true
    error.value = null

    conversation.value = {}

    try {
      const response = await apiClient.get(`/chat/conversations/${conversationId}`)
      conversation.value = response.data
    } catch (err) {
      error.value = err.response?.data?.message || 'ডাটা লোড করতে ব্যর্থ হয়েছে।'
      console.error('Error fetching conversation:', err)
    } finally {
      loading.value = false
    }
  }

  const addConversationMembers = async (conversationId, body = {}) => {
    if (!conversationId) {
      return
    }

    loading.value = true
    error.value = null

    try {
      const response = await apiClient.post(
        `/chat/conversations/${conversationId}/add-members`,
        body,
      )

      if (response?.data?.message) {
        messages.value?.push(response.data?.message)
      }

      if (response?.data?.conversation) {
        conversations.value = conversations.value.map((conversation) =>
          parseInt(conversation.id) === parseInt(conversationId)
            ? response.data.conversation
            : conversation,
        )
      }

      // fetchUserConversations()

      return response.data
    } catch (err) {
      error.value = err.response?.data?.message || 'ডাটা Create করতে ব্যর্থ হয়েছে।'
      console.error('Error creating conversation:', err)
    } finally {
      loading.value = false
    }
  }

  const fetchConversationMessages = async (conversationId, params = {}) => {
    loading.value = true
    error.value = null

    messages.value = []

    try {
      const response = await apiClient.get(`/chat/conversations/${conversationId}/messages`, {
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

  const createConversationMessage = async (conversationId, body = {}) => {
    if (!conversationId) {
      return
    }

    loading.value = true
    error.value = null

    try {
      const response = await apiClient.post(`/chat/conversations/${conversationId}/messages`, body)

      if (response?.data?.message) {
        messages.value?.push(response.data?.message)
      }

      if (response?.data?.conversation) {
        conversations.value = conversations.value.map((conversation) =>
          parseInt(conversation.id) === parseInt(conversationId)
            ? response.data.conversation
            : conversation,
        )
      }

      // fetchUserConversations()

      return response.data?.message
    } catch (err) {
      error.value = err.response?.data?.message || 'ডাটা Create করতে ব্যর্থ হয়েছে।'
      console.error('Error creating conversation:', err)
    } finally {
      loading.value = false
    }
  }

  const fetchNotificationCount = async () => {
    loading.value = true
    error.value = null

    try {
      const response = await apiClient.get(`/chat/notifications/count`)
      notificationCount.value = parseInt(response?.data || 0) || 0
    } catch (err) {
      error.value = err.response?.data?.message || 'ডাটা লোড করতে ব্যর্থ হয়েছে।'
      console.error('Error fetching notification count:', err)
    } finally {
      loading.value = false
    }
  }

  const readAllForActiveConversation = async (conversationId, body = {}) => {
    if (!conversationId) {
      return
    }

    error.value = null

    try {
      const response = await apiClient.patch(`/chat/conversations/${conversationId}/read-all`, body)

      if (response?.data) {
        conversations.value = conversations.value.map((conversation) =>
          parseInt(conversation.id) === parseInt(conversationId) ? response.data : conversation,
        )
      }

      fetchNotificationCount()
    } catch (err) {
      error.value = err.response?.data?.message || 'ডাটা Update করতে ব্যর্থ হয়েছে।'
      console.error('Error creating read all message:', err)
    }
  }

  return {
    loading,
    error,
    openAddModal,
    openAddMemberModal,
    showMobileConversationList,
    searchText,
    conversations,
    filteredConversations,
    conversation,
    activeConversationId,
    activeConversation,
    messages,
    notificationCount,
    fetchUserConversations,
    addConversationMembers,
    createConversation,
    fetchConversationById,
    fetchConversationMessages,
    createConversationMessage,
    fetchNotificationCount,
    readAllForActiveConversation,
  }
})
