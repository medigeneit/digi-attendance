import { defineStore } from 'pinia'
import { ref } from 'vue'
import apiClient from '@/axios'

export const useLifecycleUsersStore = defineStore('lifecycleUsers', () => {
  const items = ref([])
  const loading = ref(false)
  const error = ref('')

  async function fetchUsers(params = {}) {
    loading.value = true
    error.value = ''

    try {
      const res = await apiClient.get('/users-lookup', { params })
      items.value = Array.isArray(res?.data?.data) ? res.data.data : []
      return items.value
    } catch (err) {
      items.value = []
      error.value = err?.response?.data?.message || err?.message || 'Failed to load users.'
      return []
    } finally {
      loading.value = false
    }
  }

  return {
    items,
    loading,
    error,
    fetchUsers,
  }
})
