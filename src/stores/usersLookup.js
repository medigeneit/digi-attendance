import { defineStore } from 'pinia'
import { ref } from 'vue'
import apiClient from '@/axios'

export const useUsersLookupStore = defineStore('usersLookup', () => {
  const items = ref([])
  const loading = ref(false)
  const error = ref('')
  const unavailable = ref(false)

  let abortCtrl = null
  let requestId = 0

  function clear() {
    items.value = []
    error.value = ''
  }

  async function searchUsers(term) {
    const q = String(term || '').trim()
    if (!q) {
      clear()
      return []
    }
    if (unavailable.value) return []

    if (abortCtrl) abortCtrl.abort()
    const ctrl = new AbortController()
    abortCtrl = ctrl

    requestId += 1
    const currentId = requestId
    loading.value = true
    error.value = ''

    try {
      const res = await apiClient.get('/users', { params: { search: q }, signal: ctrl.signal })
      const payload = res?.data || {}
      const list = payload.users || payload.data || payload || []

      if (currentId !== requestId) return []
      items.value = Array.isArray(list) ? list : []
      unavailable.value = false
      return items.value
    } catch (err) {
      if (currentId !== requestId) return []
      const status = err?.response?.status
      if ([404, 405, 501].includes(status)) {
        unavailable.value = true
        error.value = 'User lookup is unavailable.'
      } else if (err?.name !== 'CanceledError' && err?.message !== 'canceled') {
        error.value = err?.response?.data?.message || err?.message || 'Failed to search users.'
      }
      return []
    } finally {
      if (currentId === requestId) loading.value = false
      if (abortCtrl === ctrl) abortCtrl = null
    }
  }

  return {
    items,
    loading,
    error,
    unavailable,
    searchUsers,
    clear,
  }
})
