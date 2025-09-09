// stores/zkFinger.js
import { defineStore } from 'pinia'
import { ref } from 'vue'
import apiClient from '@/axios'

export const useZKFingerStore = defineStore('zkFinger', () => {
  const loading = ref(false)
  const error   = ref(null)

  const setErr = (e, fallback) => {
    error.value = e?.response?.data?.message || e?.message || fallback
  }

  // (10) GET /zk-users/{id}/fingerprints?include_template=0|1
  async function listFingerprints(userId, { includeTemplate = false } = {}) {
    loading.value = true; error.value = null
    try {
      const { data } = await apiClient.get(
        `/zk-users/${encodeURIComponent(userId)}/fingerprints`,
        { params: { include_template: includeTemplate ? 1 : 0 } }
      )
      return data
    } catch (e) { setErr(e, 'ফিঙ্গারপ্রিন্ট লোড ব্যর্থ'); throw e?.response?.data || e }
    finally { loading.value = false }
  }

  // (12) POST /zk-users/{id}/fingerprints/upsert
  // payload: { index, template_b64, algo?, version?, valid?, duress? }
  async function upsertFingerprint(userId, payload) {
    loading.value = true; error.value = null
    try {
      const { data } = await apiClient.post(
        `/zk-users/${encodeURIComponent(userId)}/fingerprints/upsert`,
        payload
      )
      return data
    } catch (e) { setErr(e, 'ফিঙ্গারপ্রিন্ট আপসার্ট ব্যর্থ'); throw e?.response?.data || e }
    finally { loading.value = false }
  }

  // (device) POST /devices/{device}/pull-fingerprints
  async function pullFingerprintsFromDevice(deviceId) {
    loading.value = true; error.value = null
    try {
      const { data } = await apiClient.post(
        `/devices/${encodeURIComponent(deviceId)}/pull-fingerprints`
      )
      return data
    } catch (e) { setErr(e, 'ডিভাইস থেকে ফিঙ্গার টানা ব্যর্থ'); throw e?.response?.data || e }
    finally { loading.value = false }
  }

  // (device) POST /devices/{device}/push-fingerprints
  // NOTE: backend expects { user_ids: number[] }  (আগে userids ছিল—এখানে user_ids পাঠাও)
  async function pushFingerprintsBulk(deviceId, userIds = [], { force = false } = {}) {
    loading.value = true; error.value = null
    try {
      const payload = { user_ids: userIds, force }
      const { data } = await apiClient.post(
        `/devices/${encodeURIComponent(deviceId)}/push-fingerprints`,
        payload
      )
      return data
    } catch (e) { setErr(e, 'বাল্ক ফিঙ্গার পুশ ব্যর্থ'); throw e?.response?.data || e }
    finally { loading.value = false }
  }

  // (device) POST /devices/{device}/users/{userid}/push-fingerprints
  async function pushFingerprintsOne(deviceId, userid) {
    loading.value = true; error.value = null
    try {
      const { data } = await apiClient.post(
        `/devices/${encodeURIComponent(deviceId)}/users/${encodeURIComponent(userid)}/push-fingerprints`
      )
      return data
    } catch (e) { setErr(e, 'সিঙ্গেল ফিঙ্গার পুশ ব্যর্থ'); throw e?.response?.data || e }
    finally { loading.value = false }
  }

  // (device) POST /devices/{device}/fingerprints/remove  body: { userid, indexes[] }
  async function removeFingerprints(deviceId, userid, indexes) {
    loading.value = true; error.value = null
    try {
      const { data } = await apiClient.post(
        `/devices/${encodeURIComponent(deviceId)}/fingerprints/remove`,
        { userid, indexes }
      )
      return data
    } catch (e) { setErr(e, 'ফিঙ্গারপ্রিন্ট রিমুভ ব্যর্থ'); throw e?.response?.data || e }
    finally { loading.value = false }
  }

  return {
    loading, error,
    listFingerprints, upsertFingerprint,
    pullFingerprintsFromDevice, pushFingerprintsBulk, pushFingerprintsOne,
    removeFingerprints
  }
})
