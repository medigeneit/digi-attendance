// stores/zkUser.js
import { defineStore } from 'pinia'
import { ref } from 'vue'
import apiClient from '@/axios'

export const useZKUserStore = defineStore('zkUser', () => {
  const users   = ref([])
  const loading = ref(false)
  const error   = ref(null)

  const setErr = (e, fallback) => {
    error.value = e?.response?.data?.message || e?.message || fallback
  }

  async function fetchUsers() {
    loading.value = true; error.value = null
    try {
      const { data } = await apiClient.get('/zk-users')
      users.value = data
      return data
    } catch (e) { setErr(e, 'ইউজার লোড ব্যর্থ'); return [] }
    finally { loading.value = false }
  }

  async function searchUsers(query, limit = 25) {
    try {
      const { data } = await apiClient.get('/zk-users/search', { params: { query, limit } })
      return data
    } catch (e) { setErr(e, 'সার্চ ব্যর্থ'); throw e?.response?.data || e }
  }

  async function createUser(payload) {
    try {
      const { data } = await apiClient.post('/zk-users', payload)
      await fetchUsers()
      return data
    } catch (e) { setErr(e, 'ইউজার তৈরিতে ব্যর্থ'); throw e?.response?.data || e }
  }

  async function updateUser(id, payload) {
    try {
      const { data } = await apiClient.put(`/zk-users/${encodeURIComponent(id)}`, payload)
      await fetchUsers()
      return data
    } catch (e) { setErr(e, 'ইউজার আপডেট ব্যর্থ'); throw e?.response?.data || e }
  }

  async function deleteUser(id) {
    try {
      const { data } = await apiClient.delete(`/zk-users/${encodeURIComponent(id)}`)
      await fetchUsers()
      return data
    } catch (e) { setErr(e, 'ইউজার ডিলিট ব্যর্থ'); throw e?.response?.data || e }
  }

  // ---- device-scoped user sync
  async function pullUsersFromDevice(deviceId) {
    const { data } = await apiClient.post(`/devices/${encodeURIComponent(deviceId)}/pull-users`)
    await fetchUsers()
    return data
  }

  async function pushAllUsersToDevice(deviceId) {
    const { data } = await apiClient.post(`/devices/${encodeURIComponent(deviceId)}/push-users`)
    return data
  }

  async function pushSingleUserToDevice(deviceId, zk_userid) {
    const { data } = await apiClient.post(
      `/devices/${encodeURIComponent(deviceId)}/users/${encodeURIComponent(zk_userid)}/push`
    )
    return data
  }

  async function userCountOnDevice(deviceId) {
    const { data } = await apiClient.get(`/devices/${encodeURIComponent(deviceId)}/user-count`)
    return data
  }

  async function removeUserFromDevice(deviceId, zk_userid) {
    const { data } = await apiClient.post(
      `/devices/${encodeURIComponent(deviceId)}/users/${encodeURIComponent(zk_userid)}/remove`
    )
    return data
  }

  // (ইম্পোর্ট/এক্সপোর্ট device store-এ রাখা হয়েছে)

  return {
    users, loading, error,
    fetchUsers, searchUsers, createUser, updateUser, deleteUser,
    pullUsersFromDevice, pushAllUsersToDevice, pushSingleUserToDevice,
    userCountOnDevice, removeUserFromDevice
  }
})
