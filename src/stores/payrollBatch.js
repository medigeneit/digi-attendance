import { defineStore } from 'pinia'
import { ref } from 'vue'
import apiClient from '@/axios'

export const usePayrollBatchStore = defineStore('payrollBatch', () => {
  const list = ref([])
  const item = ref(null)
  const loading = ref(false)
  const error = ref(null)
  const pagination = ref({})
  const generateResult = ref(null)
  const apiUnavailable = ref(false)
  const API_UNAVAILABLE_MESSAGE = 'Payroll batch API is not available yet. You can continue without this module for now.'

  const toError = (err, fallback) => {
    const msg = err?.response?.data?.message || err?.message || fallback
    const e = new Error(msg)
    e.status = err?.response?.status
    e.errors = err?.response?.data?.errors || {}
    return e
  }

  const requestWithFallback = async (method, endpoints, configOrPayload = undefined, config = undefined) => {
    if (apiUnavailable.value) {
      const e = new Error(API_UNAVAILABLE_MESSAGE)
      e.status = 404
      e.isApiUnavailable = true
      throw e
    }

    let lastErr = null
    for (let i = 0; i < endpoints.length; i += 1) {
      const endpoint = endpoints[i]
      try {
        if (method === 'get') return await apiClient.get(endpoint, configOrPayload)
        if (method === 'post') return await apiClient.post(endpoint, configOrPayload, config)
      } catch (err) {
        lastErr = err
        // Only try next endpoint when route is missing
        if (err?.response?.status !== 404) throw err
      }
    }

    const unavailableError = new Error(API_UNAVAILABLE_MESSAGE)
    unavailableError.status = 404
    unavailableError.isApiUnavailable = true
    apiUnavailable.value = true
    throw lastErr?.response?.status === 404 ? unavailableError : lastErr
  }

  const fetchList = async (params = {}) => {
    loading.value = true
    error.value = null
    try {
      const res = await requestWithFallback('get', ['/payroll-batches'], {
        params,
      })
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
      if (err?.isApiUnavailable || err?.status === 404) {
        list.value = []
        pagination.value = {}
        error.value = null
        return []
      }
      const e = toError(err, 'Failed to fetch payroll batches')
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
      const res = await requestWithFallback('get', [`/payroll-batches/${id}`])
      item.value = res.data?.data || res.data
      return item.value
    } catch (err) {
      if (err?.isApiUnavailable || err?.status === 404) {
        item.value = null
        error.value = null
        return null
      }
      const e = toError(err, 'Failed to fetch payroll batch')
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  const generatePayroll = async (payload) => {
    loading.value = true
    error.value = null
    generateResult.value = null
    try {
      const res = await requestWithFallback(
        'post',
        ['/payroll-batches/generate'],
        payload,
      )
      generateResult.value = res.data
      return res.data
    } catch (err) {
      if (err?.isApiUnavailable || err?.status === 404) {
        const e = new Error(API_UNAVAILABLE_MESSAGE)
        e.isApiUnavailable = true
        error.value = e.message
        throw e
      }
      const e = toError(err, 'Failed to generate payroll')
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
    generateResult,
    apiUnavailable,
    fetchList,
    fetchItem,
    generatePayroll,
  }
})
