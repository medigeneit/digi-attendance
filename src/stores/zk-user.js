// stores/zk-user.js
import { ref } from 'vue'
import { defineStore } from 'pinia'
import apiClient from '@/axios'

export const useZKUserStore = defineStore('zkUser', () => {
  const users = ref([])
  const loading = ref(false)
  const error = ref(null)

  // GET /zk-users
  async function fetchUsers() {
    loading.value = true
    error.value = null
    try {
      const { data } = await apiClient.get('/zk-users')
      users.value = data
      return data
    } catch (err) {
      error.value = err?.response?.data?.message || err.message
      return []
    } finally {
      loading.value = false
    }
  }

  // POST /zk-users
  async function createUser(payload) {
    try {
      const { data } = await apiClient.post('/zk-users', payload)
      await fetchUsers()
      return data
    } catch (err) {
      throw err?.response?.data || err
    }
  }

  // PUT /zk-users/{id}
  async function updateUser(id, payload) {
    try {
      const { data } = await apiClient.put(`/zk-users/${encodeURIComponent(id)}`, payload)
      await fetchUsers()
      return data
    } catch (err) {
      throw err?.response?.data || err
    }
  }

  // DELETE /zk-users/{id}
  async function deleteUser(id) {
    try {
      const { data } = await apiClient.delete(`/zk-users/${encodeURIComponent(id)}`)
      await fetchUsers()
      return data
    } catch (err) {
      throw err?.response?.data || err
    }
  }

  // POST /devices/{device}/pull-users
  async function pullUsersFromDevice(deviceId) {
    try {
      const { data } = await apiClient.post(
        `/devices/${encodeURIComponent(deviceId)}/pull-users`
      )
      await fetchUsers()
      return data // { seen, inserted, mapped } (আমাদের কন্ট্রোলার আউটপুট)
    } catch (err) {
      throw err?.response?.data || err
    }
  }

  // POST /devices/{device}/push-users
  async function pushAllUsersToDevice(deviceId) {
    try {
      const { data } = await apiClient.post(
        `/devices/${encodeURIComponent(deviceId)}/push-users`
      )
      return data // { pushed, already }
    } catch (err) {
      throw err?.response?.data || err
    }
  }

  // POST /devices/{device}/users/{zk_userid}/push
  async function pushSingleUserToDevice(deviceId, zk_userid) {
    try {
      const { data } = await apiClient.post(
        `/devices/${encodeURIComponent(deviceId)}/users/${encodeURIComponent(zk_userid)}/push`
      )
      return data // { device, userid, pushed, already }
    } catch (err) {
      throw err?.response?.data || err
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

    pullUsersFromDevice,
    pushAllUsersToDevice,
    pushSingleUserToDevice,
  }
})
