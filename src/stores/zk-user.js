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
      const response = await apiClient.get('/zk-users')
      users.value = response.data
    } catch (err) {
      error.value = err.response?.data?.message || err.message
    } finally {
      loading.value = false
    }
  }

  // POST /zk-users
  async function createUser(data) {
    try {
      const response = await apiClient.post('/zk-users', data)
      await fetchUsers()
      return response.data
    } catch (err) {
      throw err.response?.data || err
    }
  }

  // PUT /zk-users/{id}
  async function updateUser(id, data) {
    try {
      const response = await apiClient.put(`/zk-users/${id}`, data)
      await fetchUsers()
      return response.data
    } catch (err) {
      throw err.response?.data || err
    }
  }

  // DELETE /zk-users/{id}
  async function deleteUser(id) {
    try {
      const response = await apiClient.delete(`/zk-users/${id}`)
      await fetchUsers()
      return response.data
    } catch (err) {
      throw err.response?.data || err
    }
  }

  // POST /users/{zk_userid}/push  (সব active ডিভাইসে push)
  async function pushUser(zk_userid) {
    try {
      const { data } = await apiClient.post(`/users/${encodeURIComponent(zk_userid)}/push`)
      return data // { pushed, failed, offline }
    } catch (err) {
      throw err.response?.data || err
    }
  }

  // ✅ POST /users/{zk_userid}/push-user  (এক/একাধিক ডিভাইস)
  // body: { device_ids: number[], diff: boolean }
  async function pushUserToDevices(zk_userid, { deviceIds = [], diff = true } = {}) {
    try {
      const payload = { device_ids: deviceIds, diff }
      const { data } = await apiClient.post(
        `/users/${encodeURIComponent(zk_userid)}/push-user`,
        payload
      )
      return data
    } catch (err) {
      throw err.response?.data || err
    }
  }

  // ✅ POST /devices/{device}/users/{zk_userid}/push-user?diff=true|false (সিঙ্গেল ডিভাইস)
  async function pushUserToDevice(deviceId, zk_userid, { diff = true } = {}) {
    try {
      const qs = diff ? '?diff=true' : '?diff=false'
      const { data } = await apiClient.post(
        `/devices/${encodeURIComponent(deviceId)}/users/${encodeURIComponent(zk_userid)}/push-user${qs}`
      )
      return data
    } catch (err) {
      throw err.response?.data || err
    }
  }

  // POST /devices/{device}/pull-users
  async function pullUsersFromDevice(deviceId) {
    try {
      const { data } = await apiClient.post(`/devices/${deviceId}/pull-users`)
      await fetchUsers()
      return data // { users_pulled, users_updated }
    } catch (err) {
      throw err.response?.data || err
    }
  }

  // POST /devices/{device}/sync-catchup?diff=true|false
  async function syncCatchupUsers(deviceId, { diff = true } = {}) {
    try {
      const qs = diff ? '?diff=true' : '?diff=false'
      const { data } = await apiClient.post(`/devices/${deviceId}/sync-catchup${qs}`)
      return data // { usersSynced, skipped, failed, ... }
    } catch (err) {
      throw err.response?.data || err
    }
  }

  // GET /devices/{device}/user-count
  async function getDeviceUserCount(deviceId) {
    try {
      const { data } = await apiClient.get(`/devices/${encodeURIComponent(deviceId)}/user-count`)
      return data // { device_id, ip_address, online, user_count }
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

    // push (all devices) + targeted pushes
    pushUser,
    pushUserToDevices,
    pushUserToDevice,

    // device ops
    pullUsersFromDevice,
    syncCatchupUsers,
    getDeviceUserCount,
  }
})
