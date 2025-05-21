import { ref } from 'vue'
import { defineStore } from 'pinia'
import apiClient from '@/axios'

export const useZKUserStore = defineStore('zkUser', () => {
  const users = ref([])
  const loading = ref(false)
  const error = ref(null)

  async function fetchUsers() {
    loading.value = true
    error.value = null
    try {
      const response = await apiClient.get('/zk-users')
      users.value = response.data
    } catch (err) {
      error.value = err.response?.data?.message || err.message
    } finally {
      loading.value = false
    }
  }

  async function createUser(data) {
    try {
      const response = await apiClient.post('/zk-users', data)
      await fetchUsers()
      return response.data
    } catch (err) {
      throw err.response?.data || err
    }
  }

  async function updateUser(id, data) {
    try {
      const response = await apiClient.put(`/zk-users/${id}`, data)
      await fetchUsers()
      return response.data
    } catch (err) {
      throw err.response?.data || err
    }
  }

  async function deleteUser(id) {
    try {
      const response = await apiClient.delete(`/zk-users/${id}`)
      await fetchUsers()
      return response.data
    } catch (err) {
      throw err.response?.data || err
    }
  }

  async function bulkPush(deviceId, userIds) {
    try {
      const response = await apiClient.post('/zk-users/bulk-push', {
        device_id: deviceId,
        user_ids: userIds
      })
      return response.data
    } catch (err) {
      throw err.response?.data || err
    }
  }

  return {
    users,
    loading,
    error,
    fetchUsers,
    createUser,
    updateUser,
    deleteUser,
    bulkPush
  }
})
