// stores/zk-finger.js
import { ref } from 'vue'
import { defineStore } from 'pinia'
import apiClient from '@/axios'

export const useZKFingerStore = defineStore('zkFinger', () => {
  const loading = ref(false)
  const error = ref(null)

  // POST /devices/{device}/pull-fingerprints
  // → { device, seen, inserted, skipped, unmatched }
  async function pullFingerprintsFromDevice(deviceId) {
    loading.value = true
    error.value = null
    try {
      const { data } = await apiClient.post(
        `/devices/${encodeURIComponent(deviceId)}/pull-fingerprints`
      )
      return data
    } catch (err) {
      error.value = err?.response?.data?.message || err.message
      throw err?.response?.data || err
    } finally {
      loading.value = false
    }
  }

  // POST /devices/{device}/push-fingerprints
  // body: { zk_userids: string[] }
  // → { device, pushed, skipped, created_users }
  async function pushFingerprintsBulk(deviceId, zkUserIds = []) {
    loading.value = true
    error.value = null
    try {
      const payload = { zk_userids: zkUserIds }
      const { data } = await apiClient.post(
        `/devices/${encodeURIComponent(deviceId)}/push-fingerprints`,
        payload
      )
      return data
    } catch (err) {
      error.value = err?.response?.data?.message || err.message
      throw err?.response?.data || err
    } finally {
      loading.value = false
    }
  }

  // POST /devices/{device}/users/{zk_userid}/push-fingerprints
  // → { device, userid, pushed, skipped, created_users }
  async function pushFingerprintsOne(deviceId, zk_userid) {
    loading.value = true
    error.value = null
    try {
      const { data } = await apiClient.post(
        `/devices/${encodeURIComponent(deviceId)}/users/${encodeURIComponent(
          zk_userid
        )}/push-fingerprints`
      )
      return data
    } catch (err) {
      error.value = err?.response?.data?.message || err.message
      throw err?.response?.data || err
    } finally {
      loading.value = false
    }
  }

  return {
    loading,
    error,
    pullFingerprintsFromDevice,
    pushFingerprintsBulk,
    pushFingerprintsOne,
  }
})
