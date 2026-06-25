import { defineStore } from 'pinia'
import { ref } from 'vue'
import apiClient from '@/axios'

export const usePayrollAdvanceDeductionStore = defineStore('payrollAdvanceDeduction', () => {
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

  const currentItem = ref(null)

  const syncCurrentItem = (payload) => {
    const data = payload?.data || payload || null
    currentItem.value = data
      ? {
          ...data,
          approval_access: payload?.approval_access || data.approval_access || [],
          can_verify: Boolean(payload?.can_verify ?? data.can_verify),
        }
      : null
    return currentItem.value
  }

  const fetchOne = async (id) => {
    loading.value = true
    error.value = null
    try {
      const res = await apiClient.get(`/payroll-advance-deductions/${id}`)
      return syncCurrentItem(res.data)
    } catch (err) {
      const e = toError(err, 'Failed to fetch advance deduction')
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  const fetchList = async (params = {}) => {
    loading.value = true
    error.value = null
    try {
      const res = await apiClient.get('/payroll-advance-deductions', { params })
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
      const e = toError(err, 'Failed to fetch payroll advance deductions')
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
      const res = await apiClient.post('/payroll-advance-deductions/bulk-store', payload)
      return res.data
    } catch (err) {
      const e = toError(err, 'Failed to save bulk advance deductions')
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
      await apiClient.delete(`/payroll-advance-deductions/${id}`)
      list.value = list.value.filter((item) => item.id !== id)
    } catch (err) {
      const e = toError(err, 'Failed to delete advance deduction')
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  const approve = async (id, note = '') => {
    loading.value = true
    error.value = null
    try {
      const res = await apiClient.patch(`/payroll-advance-deductions/${id}/approve`, { note })
      return syncCurrentItem(res.data)
    } catch (err) {
      const e = toError(err, 'Failed to approve advance deduction')
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  const reject = async (id, reason = '') => {
    loading.value = true
    error.value = null
    try {
      const res = await apiClient.patch(`/payroll-advance-deductions/${id}/reject`, { reason })
      return syncCurrentItem(res.data)
    } catch (err) {
      const e = toError(err, 'Failed to reject advance deduction')
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  return {
    list,
    currentItem,
    loading,
    error,
    pagination,
    fetchOne,
    fetchList,
    createBulk,
    deleteItem,
    approve,
    reject,
  }
})
