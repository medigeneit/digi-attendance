import apiClient from '@/axios'
import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useAdjustmentStore = defineStore('adjustment', () => {
  const adjustments = ref([])
  const carryPreview = ref({})
  const item = ref(null)
  const loading = ref(false)
  const error = ref(null)

  const toError = (err, fallback) => {
    const message = err?.response?.data?.message || err?.message || fallback
    const validationMessage = Object.values(err?.response?.data?.errors || {})
      .flat()
      .filter(Boolean)
      .join(' ')
    const e = new Error(validationMessage || message)
    e.status = err?.response?.status
    e.data = err?.response?.data
    return e
  }

  const setError = (err, fallback) => {
    const e = toError(err, fallback)
    error.value = e.message
    throw e
  }

  const normalizeList = (payload) => {
    if (Array.isArray(payload?.data)) return payload.data
    if (Array.isArray(payload)) return payload
    return []
  }

  const syncItem = (updated) => {
    if (!updated?.id) return
    const index = adjustments.value.findIndex((row) => row.id === updated.id)
    if (index !== -1) {
      adjustments.value[index] = { ...adjustments.value[index], ...updated }
    }
    if (item.value?.id === updated.id) {
      item.value = { ...item.value, ...updated }
    }
  }

  const fetchAll = async (filters = {}) => {
    loading.value = true
    error.value = null
    try {
      const params = { ...filters }
      // Backend validates per_page max=100.
      if (!params.per_page) params.per_page = 100
      const res = await apiClient.get('/payroll-adjustments', { params })
      adjustments.value = normalizeList(res.data)
      return res.data
    } catch (err) {
      setError(err, 'Failed to fetch payroll adjustments')
    } finally {
      loading.value = false
    }
  }

  const fetchOne = async (id) => {
    loading.value = true
    error.value = null
    try {
      const res = await apiClient.get(`/payroll-adjustments/${id}`)
      const data = res.data?.data || res.data || null
      item.value = data
        ? {
            ...data,
            approval_access: res.data?.approval_access || data.approval_access || [],
            can_verify: Boolean(res.data?.can_verify ?? data.can_verify),
          }
        : null
      return item.value
    } catch (err) {
      setError(err, 'Failed to fetch payroll adjustment')
    } finally {
      loading.value = false
    }
  }

  const create = async (payload) => {
    loading.value = true
    error.value = null
    try {
      const res = await apiClient.post('/payroll-adjustments', payload)
      const created = res.data?.data || res.data || null
      if (created) {
        adjustments.value = [created, ...adjustments.value]
        item.value = created
      }
      return created
    } catch (err) {
      setError(err, 'Failed to create payroll adjustment')
    } finally {
      loading.value = false
    }
  }

  const verify = async (id, note = '') => {
    loading.value = true
    error.value = null
    try {
      const res = await apiClient.patch(`/payroll-adjustments/${id}/verify`, { note })
      const updated = res.data?.data || res.data || null
      syncItem(updated)
      return updated
    } catch (err) {
      setError(err, 'Failed to verify payroll adjustment')
    } finally {
      loading.value = false
    }
  }

  const reject = async (id, reason = '') => {
    loading.value = true
    error.value = null
    try {
      const res = await apiClient.patch(`/payroll-adjustments/${id}/reject`, { reason })
      const updated = res.data?.data || res.data || null
      syncItem(updated)
      return updated
    } catch (err) {
      setError(err, 'Failed to reject payroll adjustment')
    } finally {
      loading.value = false
    }
  }

  const loadCarryPreview = async (year, month) => {
    loading.value = true
    error.value = null
    try {
      const res = await apiClient.get(`/payroll-adjustments/preview/carry-forward/${year}/${month}`)
      carryPreview.value = {
        items: res.data?.data || [],
        summary: res.data?.summary || {},
      }
      return carryPreview.value
    } catch (err) {
      setError(err, 'Failed to load carry-forward preview')
    } finally {
      loading.value = false
    }
  }

  const applyCarryForward = async (year, month) => {
    loading.value = true
    error.value = null
    try {
      const res = await apiClient.post(`/payroll-adjustments/carry-forward/${year}/${month}`)
      return res.data?.data || res.data || null
    } catch (err) {
      setError(err, 'Failed to apply carry-forward')
    } finally {
      loading.value = false
    }
  }

  const pendingList = () => adjustments.value.filter((item) => item.status === 'pending')
  const verifiedList = () => adjustments.value.filter((item) => item.status === 'verified')
  const approvedList = () => adjustments.value.filter((item) => item.status === 'approved')
  const carriedList = () => adjustments.value.filter((item) => item.status === 'carried')

  return {
    adjustments,
    carryPreview,
    item,
    loading,
    error,
    fetchAll,
    fetchOne,
    create,
    verify,
    reject,
    loadCarryPreview,
    applyCarryForward,
    pendingList,
    verifiedList,
    approvedList,
    carriedList,
  }
})
