// stores/device.js
import { defineStore } from 'pinia'
import { ref } from 'vue'
import apiClient from '@/axios'

export const useDeviceStore = defineStore('device', () => {
  const devices = ref([])
  const device  = ref(null)
  const loading = ref(false)
  const error   = ref(null)

  const setErr = (e, fallback) => {
    error.value = e?.response?.data?.message || e?.message || fallback
  }

  async function fetchDevices() {
    loading.value = true; error.value = null
    try {
      const { data } = await apiClient.get('/devices')
      devices.value = data
      return data
    } catch (e) { setErr(e, 'ডিভাইস লোড ব্যর্থ') ; return [] }
    finally { loading.value = false }
  }

  async function fetchDevice(id) {
    loading.value = true; error.value = null
    try {
      const { data } = await apiClient.get(`/devices/${encodeURIComponent(id)}`)
      device.value = data
      return data
    } catch (e) { setErr(e, `ডিভাইস (${id}) লোড ব্যর্থ`) ; return null }
    finally { loading.value = false }
  }

  async function createDevice(payload) {
    loading.value = true; error.value = null
    try {
      const { data } = await apiClient.post('/devices', payload)
      // API রেসপন্সে device অবজেক্ট থাকলে push করো
      await fetchDevices()
      return data
    } catch (e) { setErr(e, 'ডিভাইস তৈরি ব্যর্থ'); throw e?.response?.data || e }
    finally { loading.value = false }
  }

  async function updateDevice(id, payload) {
    loading.value = true; error.value = null
    try {
      const { data } = await apiClient.put(`/devices/${encodeURIComponent(id)}`, payload)
      await fetchDevices()
      return data
    } catch (e) { setErr(e, `ডিভাইস (${id}) আপডেট ব্যর্থ`); throw e?.response?.data || e }
    finally { loading.value = false }
  }

  async function deleteDevice(id) {
    loading.value = true; error.value = null
    try {
      const { data } = await apiClient.delete(`/devices/${encodeURIComponent(id)}`)
      devices.value = devices.value.filter(d => d.id !== id)
      return data
    } catch (e) { setErr(e, `ডিভাইস (${id}) ডিলিট ব্যর্থ`); throw e?.response?.data || e }
    finally { loading.value = false }
  }

    async function ping(id, { modes = ['udp','tcp'] } = {}) {
    try {
      const { data } = await apiClient.get(`/devices/${encodeURIComponent(id)}/ping`, {
        params: { modes }
      })
      return data
    } catch (e) {
      setErr(e, 'কনেকশন চেক ব্যর্থ'); throw e?.response?.data || e
    }
  }


  // --- device ops
  const info        = (id) => apiClient.get(`/devices/${encodeURIComponent(id)}/info`).then(r=>r.data)
  const enable      = (id) => apiClient.post(`/devices/${encodeURIComponent(id)}/enable`).then(r=>r.data)
  const disable     = (id) => apiClient.post(`/devices/${encodeURIComponent(id)}/disable`).then(r=>r.data)
  const restart     = (id) => apiClient.post(`/devices/${encodeURIComponent(id)}/restart`).then(r=>r.data)
  const shutdown    = (id) => apiClient.post(`/devices/${encodeURIComponent(id)}/shutdown`).then(r=>r.data)
  const testVoice   = (id) => apiClient.post(`/devices/${encodeURIComponent(id)}/test-voice`).then(r=>r.data)

  function setTime(id, { datetime, date, time }) {
    const payload = datetime ? { datetime } : { date, time }
    return apiClient.post(`/devices/${encodeURIComponent(id)}/time/sync`, payload).then(r=>r.data)
  }

  // --- users live / diff
  const usersLive = (id) =>
    apiClient.get(`/devices/${encodeURIComponent(id)}/users/live`).then(r=>r.data)

  const usersDiff = (id, { include_inactive = false } = {}) =>
    apiClient.get(`/devices/${encodeURIComponent(id)}/users/diff`, { include_inactive }).then(r=>r.data)

  // --- import/export (file)
  async function importUsers(deviceId, file, { pushNow = true } = {}) {
    const fd = new FormData()
    fd.append('file', file)
    if (pushNow) fd.append('push_now', '1')
    const { data } = await apiClient.post(`/devices/${encodeURIComponent(deviceId)}/users/import`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    return data
  }

  // blob রিটার্ন করি—caller চাইলে ডাউনলোড হ্যান্ডেল করবে
  async function exportUsers(deviceId) {
    const res = await apiClient.get(`/devices/${encodeURIComponent(deviceId)}/users/export`, {
      responseType: 'blob'
    })
    return res.data
  }

  return {
    devices, device, loading, error,
    fetchDevices, fetchDevice, createDevice, updateDevice, deleteDevice,
    ping,
    info, setTime, enable, disable, restart, shutdown, testVoice,
    usersLive, usersDiff, importUsers, exportUsers
  }
})
