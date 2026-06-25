import { defineStore } from 'pinia'
import { ref } from 'vue'
import apiClient from '@/axios'

export const useLifecycleUsersStore = defineStore('lifecycleUsers', () => {
  const items = ref([])
  const loading = ref(false)
  const error = ref('')
  let abortCtrl = null
  let requestId = 0
  let lastSearchKey = ''

  function mergeUsers(nextItems = []) {
    const map = new Map()

    ;[...items.value, ...nextItems].forEach((item) => {
      if (item?.id == null) return
      map.set(Number(item.id), item)
    })

    items.value = Array.from(map.values())
  }

  async function fetchUsers(params = {}, { merge = false } = {}) {
    loading.value = true
    error.value = ''

    try {
      const res = await apiClient.get('/users-lookup', { params })
      const list = Array.isArray(res?.data?.data) ? res.data.data : []
      if (merge) {
        mergeUsers(list)
      } else {
        items.value = list
      }
      return list
    } catch (err) {
      if (!merge) items.value = []
      error.value = err?.response?.data?.message || err?.message || 'Failed to load users.'
      return []
    } finally {
      loading.value = false
    }
  }

  async function searchUsers(term, params = {}) {
    const q = String(term || '').trim()
    if (!q) return items.value

    const searchKey = JSON.stringify({ q, ...params })
    if (searchKey === lastSearchKey) return items.value
    lastSearchKey = searchKey

    if (abortCtrl) abortCtrl.abort()
    const ctrl = new AbortController()
    abortCtrl = ctrl
    requestId += 1
    const currentId = requestId
    loading.value = true
    error.value = ''

    try {
      const res = await apiClient.get('/users-lookup', {
        params: { ...params, q },
        signal: ctrl.signal,
      })
      if (currentId !== requestId) return []

      const list = Array.isArray(res?.data?.data) ? res.data.data : []
      mergeUsers(list)
      return list
    } catch (err) {
      if (currentId !== requestId) return []
      if (err?.name !== 'CanceledError' && err?.message !== 'canceled') {
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
    fetchUsers,
    searchUsers,
  }
})
