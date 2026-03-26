import { defineStore } from 'pinia'
import { ref } from 'vue'
import apiClient from '@/axios'

export const useSalaryStructureStore = defineStore('salaryStructure', () => {
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
      const res = await apiClient.get('/salary-structures', { params })
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
      const e = toError(err, 'Failed to fetch salary structures')
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
      const res = await apiClient.get(`/salary-structures/${id}`)
      item.value = res.data?.data || res.data
      return item.value
    } catch (err) {
      const e = toError(err, 'Failed to fetch salary structure')
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
      const res = await apiClient.post('/salary-structures', payload)
      return res.data
    } catch (err) {
      const e = toError(err, 'Failed to create salary structure')
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
      const res = await apiClient.put(`/salary-structures/${id}`, payload)
      return res.data
    } catch (err) {
      const e = toError(err, 'Failed to update salary structure')
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
      await apiClient.delete(`/salary-structures/${id}`)
      list.value = list.value.filter((i) => i.id !== id)
    } catch (err) {
      const e = toError(err, 'Failed to delete salary structure')
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  return { list, item, loading, error, pagination, fetchList, fetchItem, createItem, updateItem, deleteItem }
})
