import { defineStore } from 'pinia'
import { ref } from 'vue'
import apiClient from '../axios'

export const useChatStore = defineStore('chat', () => {
  const loading = ref(false)
  const error = ref(null)
  const conversations = ref([])

  const fetchUserConversations = async (params = {}) => {
    loading.value = true
    error.value = null

    try {
      const response = await apiClient.get('/chat/conversations', { params })
      conversations.value = response.data
    } catch (err) {
      error.value = err.response?.data?.message || 'ডাটা লোড করতে ব্যর্থ হয়েছে।'
      console.error('Error fetching companies:', err)
    } finally {
      loading.value = false
    }
  }

  return { loading, error, conversations, fetchUserConversations }
})
