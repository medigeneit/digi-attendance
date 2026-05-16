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
  const previewResult = ref(null)
  const options = ref(null)
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
    let lastErr = null
    for (let i = 0; i < endpoints.length; i += 1) {
      const endpoint = endpoints[i]
      try {
        let response = null
        if (method === 'get') response = await apiClient.get(endpoint, configOrPayload)
        if (method === 'post') response = await apiClient.post(endpoint, configOrPayload, config)
        if (method === 'patch') response = await apiClient.patch(endpoint, configOrPayload, config)
        if (response) {
          apiUnavailable.value = false
          return response
        }
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

  const previewPayroll = async (payload) => {
    loading.value = true
    error.value = null
    previewResult.value = null
    try {
      const res = await requestWithFallback('post', ['/payroll/preview'], payload)
      previewResult.value = res.data?.data || res.data
      return previewResult.value
    } catch (err) {
      const e = toError(err, 'Failed to preview payroll')
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  const fetchOptions = async () => {
    try {
      const res = await requestWithFallback('get', ['/payroll/options'])
      options.value = res.data?.data || res.data
      return options.value
    } catch (err) {
      if (err?.isApiUnavailable || err?.status === 404) return null
      throw toError(err, 'Failed to fetch payroll options')
    }
  }

  const transitionBatch = async (id, action, payload = {}) => {
    error.value = null
    try {
      const actionEndpoints = {
        review: [`/payroll-batches/${id}/review`],
        approve: [`/payroll-batches/${id}/approve`],
        mark_paid: [`/payroll-batches/${id}/mark-paid`, `/payroll-batches/${id}/paid`],
        paid: [`/payroll-batches/${id}/mark-paid`, `/payroll-batches/${id}/paid`],
        lock: [`/payroll-batches/${id}/lock`],
        cancel: [`/payroll-batches/${id}/cancel`],
      }
      const res = await requestWithFallback('post', actionEndpoints[action] || [`/payroll-batches/${id}/${action}`], payload)
      item.value = res.data?.data || res.data
      return item.value
    } catch (err) {
      const e = toError(err, 'Failed to update payroll batch status')
      error.value = e.message
      throw e
    }
  }

  const generateDoctorPayroll = async (payload) => {
    loading.value = true
    error.value = null
    try {
      const res = await requestWithFallback(
        'post',
        ['/doctor-payrolls/generate'],
        payload,
      )
      return res.data
    } catch (err) {
      if (err?.isApiUnavailable || err?.status === 404) {
        const e = new Error(API_UNAVAILABLE_MESSAGE)
        e.isApiUnavailable = true
        error.value = e.message
        throw e
      }
      const e = toError(err, 'Failed to generate doctor payroll')
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
    previewResult,
    options,
    apiUnavailable,
    fetchList,
    fetchItem,
    generatePayroll,
    previewPayroll,
    fetchOptions,
    transitionBatch,
    generateDoctorPayroll,
  }
})
