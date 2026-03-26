import { defineStore } from 'pinia'
import { ref } from 'vue'
import apiClient from '@/axios'

export const useMealEntryStore = defineStore('mealEntry', () => {
  const list = ref([])
  const item = ref(null)
  const loading = ref(false)
  const error = ref(null)
  const pagination = ref({})

  const toError = (err, fallback) => {
    const msg = err?.response?.data?.message || err?.message || fallback
    const e = new Error(msg)
    e.status = err?.response?.status
    e.errors = err?.response?.data?.errors || {}
    return e
  }

  const fetchList = async (params = {}) => {
    loading.value = true
    error.value = null
    try {
      const res = await apiClient.get('/meal-entries', { params })
      const d = res.data
      if (d?.data && Array.isArray(d.data)) {
        list.value = d.data
        const { data: _, ...rest } = d
        pagination.value = rest
      } else {
        list.value = Array.isArray(d) ? d : []
        pagination.value = {}
      }
      return res.data
    } catch (err) {
      const e = toError(err, 'Failed to fetch meal entries')
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  const fetchItem = async (id) => {
    loading.value = true
    error.value = null
    try {
      const res = await apiClient.get(`/meal-entries/${id}`)
      item.value = res.data?.data || res.data
      return item.value
    } catch (err) {
      const e = toError(err, 'Failed to fetch meal entry')
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  const createItem = async (payload) => {
    loading.value = true
    error.value = null
    try {
      const res = await apiClient.post('/meal-entries', payload)
      return res.data
    } catch (err) {
      const e = toError(err, 'Failed to create meal entry')
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  const updateItem = async (id, payload) => {
    loading.value = true
    error.value = null
    try {
      const res = await apiClient.put(`/meal-entries/${id}`, payload)
      return res.data
    } catch (err) {
      const e = toError(err, 'Failed to update meal entry')
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  const deleteItem = async (id) => {
    loading.value = true
    error.value = null
    try {
      await apiClient.delete(`/meal-entries/${id}`)
      list.value = list.value.filter((i) => i.id !== id)
    } catch (err) {
      const e = toError(err, 'Failed to delete meal entry')
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  return { list, item, loading, error, pagination, fetchList, fetchItem, createItem, updateItem, deleteItem }
})
