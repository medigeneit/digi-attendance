import apiClient from '@/axios'
import { defineStore } from 'pinia'
import { ref } from 'vue'

export const usePayrollStore = defineStore('payroll', () => {
  const periods = ref([])
  const period = ref(null)

  const loading = ref(false)
  const error = ref(null)
  const selectedMonth = ref(new Date().toISOString().substring(0, 7))

  const toError = (err, fallback) => {
    const message = err?.response?.data?.message || err?.message || fallback
    const e = new Error(message)
    e.status = err?.response?.status
    e.data = err?.response?.data
    return e
  }

  const fetchPeriods = async (filters = {}) => {
    loading.value = true
    error.value = null
    try {
      const res = await apiClient.get('/payroll', { params: filters })
      periods.value = res?.data?.data || res?.data || []
      return res.data
    } catch (err) {
      const e = toError(err, 'Failed to fetch payroll periods')
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  const fetchUserPeriod = async (userId, month) => {
    loading.value = true
    error.value = null
    try {
      const res = await apiClient.get(`/payroll/${userId}/${month}`)
      period.value = res.data || null
      return period.value
    } catch (err) {
      if (err?.response?.status === 404) {
        period.value = null
        return null
      }
      const e = toError(err, 'Failed to fetch user period')
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  // upsert: POST /payroll
  const upsertPeriod = async (payload) => {
    loading.value = true
    error.value = null
    try {
      const res = await apiClient.post('/payroll', payload)
      period.value = res?.data?.period || res?.data || null
      return res.data
    } catch (err) {
      const e = toError(err, 'Failed to save payroll period')
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  const updatePeriod = async (id, payload) => {
    loading.value = true
    error.value = null
    try {
      const res = await apiClient.put(`/payroll/${id}`, payload)
      period.value = res?.data?.period || res?.data || null
      return res.data
    } catch (err) {
      const e = toError(err, 'Failed to update payroll period')
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  const lockPeriod = async (id) => {
    loading.value = true
    error.value = null
    try {
      const res = await apiClient.put(`/payroll/${id}/lock`)
      period.value = res?.data?.period || res?.data || null
      return res.data
    } catch (err) {
      const e = toError(err, 'Failed to lock payroll period')
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  const unlockPeriod = async (id) => {
    loading.value = true
    error.value = null
    try {
      const res = await apiClient.put(`/payroll/${id}/unlock`)
      period.value = res?.data?.period || res?.data || null
      return res.data
    } catch (err) {
      const e = toError(err, 'Failed to unlock payroll period')
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  const deletePeriod = async (id) => {
    loading.value = true
    error.value = null
    try {
      await apiClient.delete(`/payroll/${id}`)
      periods.value = periods.value.filter((p) => p.id !== id)
      if (period.value?.id === id) period.value = null
      return true
    } catch (err) {
      const e = toError(err, 'Failed to delete payroll period')
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  return {
    periods,
    period,
    loading,
    error,
    selectedMonth,
    fetchPeriods,
    fetchUserPeriod,
    upsertPeriod,
    updatePeriod,
    lockPeriod,
    unlockPeriod,
    deletePeriod,
  }
})
