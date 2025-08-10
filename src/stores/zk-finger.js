// stores/zk-finger.js
import { ref } from 'vue'
import { defineStore } from 'pinia'
import apiClient from '@/axios'

export const useZKFingerStore = defineStore('zkFinger', () => {
  const loading = ref(false)
  const error = ref(null)
  const verifyResult = ref(null) // { devices: [...] }
  const lastPullSummary = ref(null) // যেকোনো pull-এর শেষ সারাংশ দেখাতে চাইলে

  // একজন ইউজারের নির্দিষ্ট finger সব ডিভাইসে push
  async function pushFinger(zk_userid, finger) {
    try {
      const { data } = await apiClient.post(
        `/users/${encodeURIComponent(zk_userid)}/fingers/${finger}/push`
      )
      return data // { finger, pushed, offline, failed }
    } catch (err) {
      throw err.response?.data || err
    }
  }

  // ডিভাইস → সেন্ট্রাল: পুরো ডিভাইসের সব ইউজারের ফিঙ্গার Pull (big batch)
  async function pullFingerprintsFromDevice(deviceId, { limit = null, offset = null } = {}) {
    try {
      const params = new URLSearchParams()
      if (limit !== null) params.append('limit', String(limit))
      if (offset !== null) params.append('offset', String(offset))
      const url =
        params.toString().length > 0
          ? `/devices/${deviceId}/pull-fingerprints?` + params.toString()
          : `/devices/${deviceId}/pull-fingerprints`

      const { data } = await apiClient.post(url)
      lastPullSummary.value = data // { fingerprints_pulled, limit, offset }
      return data
    } catch (err) {
      throw err.response?.data || err
    }
  }

  // একটি ডিভাইসে (তোমার ম্যাপ করা) pushFingerprintsToDevice রাউট কল
  async function pushFingerprintsToDevice(deviceId, { diff = true } = {}) {
    try {
      const qs = diff ? '?diff=true' : '?diff=false'
      const { data } = await apiClient.post(
        `/devices/${deviceId}/push-fingerprints${qs}`
      )
      return data // { device_id, diff, users_processed, users_created, ... }
    } catch (err) {
      throw err.response?.data || err
    }
  }

  // ডিভাইস → সেন্ট্রাল: একজন ইউজারের সব ফিঙ্গার Pull (টার্গেটেড, ফাস্টার)
  async function pullUserFingersFromDevice(deviceId, zk_userid) {
    try {
      const { data } = await apiClient.post(
        `/devices/${deviceId}/users/${encodeURIComponent(zk_userid)}/pull-fingers`
      )
      lastPullSummary.value = data // { fingers_pulled, fingers:[], user_present, ... }
      return data
    } catch (err) {
      throw err.response?.data || err
    }
  }

  // লাইভ Verify: কোন কোন ডিভাইসে ইউজার/ফিঙ্গার আছে — ডিভাইস হিট করে
  async function verifyUser(zk_userid) {
    loading.value = true
    error.value = null
    try {
      const { data } = await apiClient.get(`/users/${encodeURIComponent(zk_userid)}/verify`)
      verifyResult.value = data // { devices: [ {device_id,online,user,fingers[]} ] }
      return data
    } catch (err) {
      error.value = err.response?.data?.message || err.message
      throw err.response?.data || err
    } finally {
      loading.value = false
    }
  }

  return {
    loading,
    error,
    verifyResult,
    lastPullSummary,
    pushFinger,
    pullFingerprintsFromDevice,
    pushFingerprintsToDevice,
    pullUserFingersFromDevice,
    verifyUser,
  }
})
