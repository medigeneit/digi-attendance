// stores/zkteco.js
import { defineStore } from 'pinia'
import { ref } from 'vue'
import apiClient from '@/axios'

export const useZktecoStore = defineStore('zkteco', () => {
  const loading  = ref(false)
  const error    = ref(null)
  const lastPull = ref(null)
  const lastPush = ref(null)

  const setErr = (e, fallback) => {
    error.value = e?.response?.data?.error
      || e?.response?.data?.message
      || e?.message
      || fallback
  }

  // POST /zkteco/pull
  async function pull({ deviceId, what = 'both' } = {}) {
    loading.value = true; error.value = null
    try {
      const payload = { device_id: deviceId, what }
      const { data } = await apiClient.post('/zkteco/pull', payload)
      lastPull.value = data
      return data
    } catch (e) { setErr(e, 'পুল ব্যর্থ'); throw (e?.response?.data || e) }
    finally { loading.value = false }
  }

  // POST /zkteco/push
  async function push({
    deviceId,
    what = 'both',          // 'users' | 'biometrics' | 'both'
    scope = 'all',          // 'all' | 'only'
    userIds = [],           // scope==='only' হলে প্রয়োজন
    disableDuringSync = true
  } = {}) {
    loading.value = true; error.value = null
    try {
      const payload = {
        device_id: deviceId,
        what,
        scope,
        ...(scope === 'only' ? { user_ids: userIds } : {}),
        disable_during_sync: !!disableDuringSync,
      }
      const { data } = await apiClient.post('/zkteco/push', payload)
      lastPush.value = data
      return data
    } catch (e) { setErr(e, 'পুশ ব্যর্থ'); throw (e?.response?.data || e) }
    finally { loading.value = false }
  }

  // সুবিধার জন্য: এক ইউজার পুশ (internally /zkteco/push ব্যবহার করে)
  async function pushUser({ deviceId, userId, what = 'both', disableDuringSync = true } = {}) {
    return push({
      deviceId,
      what,
      scope: 'only',
      userIds: [userId],
      disableDuringSync,
    })
  }

  return {
    loading, error, lastPull, lastPush,
    pull, push, pushUser,
  }
})
