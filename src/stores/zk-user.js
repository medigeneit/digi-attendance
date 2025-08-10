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

    // NEW: একজন ইউজারের বেসিক ইনফো সব ডিভাইসে push
  async function pushUser(zk_userid) {
    try {
      const { data } = await apiClient.post(`/users/${encodeURIComponent(zk_userid)}/push`)
      return data // { pushed, failed, offline }
    } catch (err) {
      throw err.response?.data || err
    }
  }

  // NEW: DB-ভিউ — কোন কোন ডিভাইসে আছে (লাইভ কল নয়)
  async function getUserDevices(zk_userid) {
    try {
      const { data } = await apiClient.get(`/users/${encodeURIComponent(zk_userid)}/devices`)
      return data // { devices: [...] }
    } catch (err) {
      throw err.response?.data || err
    }
  }

  // NEW: ডিভাইস → সেন্ট্রাল: সব ইউজার Pull
  async function pullUsersFromDevice(deviceId) {
    try {
      const { data } = await apiClient.post(`/devices/${deviceId}/pull-users`)
      // চাইলে fetchUsers() রিফ্রেশ করতে পারেন
      await fetchUsers()
      return data // { users_pulled, users_updated }
    } catch (err) {
      throw err.response?.data || err
    }
  }

  // NEW: Catch-up (user-only, diff=true ডিফল্ট)
  async function syncCatchupUsers(deviceId, { diff = true } = {}) {
    try {
      const qs = diff ? '?diff=true' : '?diff=false'
      const { data } = await apiClient.post(`/devices/${deviceId}/sync-catchup${qs}`)
      return data // { usersSynced, skipped, failed, ... }
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
    pushUser,
    getUserDevices,
    pullUsersFromDevice,
    syncCatchupUsers,
  }
})
