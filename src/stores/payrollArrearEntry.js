import { defineStore } from 'pinia'
import { ref } from 'vue'
import apiClient from '@/axios'

export const usePayrollArrearEntryStore = defineStore('payrollArrearEntry', () => {
  const list = ref([])
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
      const res = await apiClient.get('/payroll-arrear-entries', { params })
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
      const e = toError(err, 'Failed to fetch payroll arrears')
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
      const res = await apiClient.post('/payroll-arrear-entries', payload)
      return res.data
    } catch (err) {
      const e = toError(err, 'Failed to create payroll arrear')
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  const createBulk = async (payload) => {
    loading.value = true
    error.value = null
    try {
      const res = await apiClient.post('/payroll-arrear-entries/bulk-store', payload)
      return res.data
    } catch (err) {
      const e = toError(err, 'Failed to save bulk payroll arrears')
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
      await apiClient.delete(`/payroll-arrear-entries/${id}`)
      list.value = list.value.filter((item) => item.id !== id)
    } catch (err) {
      const e = toError(err, 'Failed to delete payroll arrear')
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  return {
    list,
    loading,
    error,
    pagination,
    fetchList,
    createItem,
    createBulk,
    deleteItem,
  }
})
