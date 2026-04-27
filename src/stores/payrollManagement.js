import { defineStore } from 'pinia'
import { ref } from 'vue'
import apiClient from '@/axios'

export const usePayrollManagementStore = defineStore('payrollManagement', () => {
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
      const res = await apiClient.get('/payrolls', { params })
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
      const e = toError(err, 'Failed to fetch payrolls')
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
      const res = await apiClient.get(`/payrolls/${id}`)
      item.value = res.data?.data || res.data
      return item.value
    } catch (err) {
      const e = toError(err, 'Failed to fetch payroll')
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  const updatePaymentStatus = async (id, payload) => {
    loading.value = true
    error.value = null
    try {
      const res = await apiClient.patch(`/payrolls/${id}/payment-status`, payload)
      if (item.value && item.value.id === id) {
        item.value = { ...item.value, ...res.data?.data || res.data }
      }
      const idx = list.value.findIndex((r) => r.id === id)
      if (idx !== -1) {
        list.value[idx] = { ...list.value[idx], ...res.data?.data || res.data }
      }
      return res.data
    } catch (err) {
      const e = toError(err, 'Failed to update payment status')
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  const updateAdvanceDeduction = async (id, payload) => {
    loading.value = true
    error.value = null
    try {
      const res = await apiClient.patch(`/payrolls/${id}/advance-deduction`, payload)
      if (item.value && item.value.id === id) {
        item.value = { ...item.value, ...res.data?.data || res.data }
      }
      const idx = list.value.findIndex((r) => r.id === id)
      if (idx !== -1) {
        list.value[idx] = { ...list.value[idx], ...res.data?.data || res.data }
      }
      return res.data
    } catch (err) {
      const e = toError(err, 'Failed to update advance deduction')
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  const downloadExcel = async (params = {}) => {
    loading.value = true
    error.value = null
    try {
      const res = await apiClient.get('/payrolls?flag=excel', {
        params,
        responseType: 'blob',
      })

      const url = window.URL.createObjectURL(new Blob([res.data]))
      const link = document.createElement('a')
      link.href = url
      const month = params.salary_month ? String(params.salary_month).slice(0, 7) : 'all-months'
      link.setAttribute('download', `payroll-report-${month}.xlsx`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      return true
    } catch (err) {
      const e = toError(err, 'Failed to download payroll report')
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  return {
    list,
    item,
    loading,
    error,
    pagination,
    fetchList,
    fetchItem,
    updatePaymentStatus,
    updateAdvanceDeduction,
    downloadExcel,
  }
})
