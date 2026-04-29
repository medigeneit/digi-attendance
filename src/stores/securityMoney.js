import { defineStore } from 'pinia'
import { ref } from 'vue'
import apiClient from '@/axios'

export const useSecurityMoneyStore = defineStore('securityMoney', () => {
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
      const res = await apiClient.get('/security-monies', { params })
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
      const e = toError(err, 'Failed to fetch security money')
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
      const res = await apiClient.post('/security-monies', payload)
      return res.data
    } catch (err) {
      const e = toError(err, 'Failed to create security money')
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
      const res = await apiClient.put(`/security-monies/${id}`, payload)
      return res.data
    } catch (err) {
      const e = toError(err, 'Failed to update security money')
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
      await apiClient.delete(`/security-monies/${id}`)
      list.value = list.value.filter((i) => i.id !== id)
    } catch (err) {
      const e = toError(err, 'Failed to delete security money')
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  return { list, item, loading, error, pagination, fetchList, createItem, updateItem, deleteItem }
})
