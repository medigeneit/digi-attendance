import { ref } from 'vue'
import { defineStore } from 'pinia'
import apiClient from '@/axios'

export const useSyncStore = defineStore('sync', () => {
  const loading = ref(false)
  const message = ref(null)
  const error = ref(null)

  // ✅ GET users from device → DB
  const pullUsers = async (deviceId) => {
    reset()
    loading.value = true
    try {
      const response = await apiClient.get(`/zk-users/pull/${deviceId}`)
      message.value = response.data.message
    } catch (err) {
      handleError(err)
    } finally {
      loading.value = false
    }
  }

  // ✅ PUSH users from DB → device
  const pushUsers = async (deviceId) => {
    reset()
    loading.value = true
    try {
      const response = await apiClient.post(`/zk-users/push/${deviceId}`)
      message.value = response.data.message
    } catch (err) {
      handleError(err)
    } finally {
      loading.value = false
    }
  }

  // ✅ POST pull fingerprints from device → DB
  const pullFingerprints = async (deviceId) => {
    reset()
    loading.value = true
    try {
      const response = await apiClient.post(`/zk-fingerprints/pull/${deviceId}`)
      message.value = response.data.message
    } catch (err) {
      handleError(err)
    } finally {
      loading.value = false
    }
  }

  // ✅ POST push fingerprints from DB → device
  const pushFingerprints = async (deviceId) => {
    reset()
    loading.value = true
    try {
      const response = await apiClient.post(`/zk-fingerprints/push/${deviceId}`)
      message.value = response.data.message
    } catch (err) {
      handleError(err)
    } finally {
      loading.value = false
    }
  }

  const createUser = async (deviceId, payload) => {
  reset()
  loading.value = true
  try {
    const response = await apiClient.post(`/zk-users/create/${deviceId}`, payload)
    message.value = response.data.message
  } catch (err) {
    handleError(err)
  } finally {
    loading.value = false
  }
}

  // Reset message & error
  const reset = () => {
    message.value = null
    error.value = null
  }

  // Handle API errors
  const handleError = (err) => {
    error.value = err.response?.data?.message || 'Something went wrong.'
  }

  return {
    loading,
    message,
    error,
    pullUsers,
    pushUsers,
    pullFingerprints,
    pushFingerprints,
    createUser,
    reset,
  }
})
