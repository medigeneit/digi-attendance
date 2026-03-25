import { defineStore } from 'pinia'
import { ref } from 'vue'
import apiClient from '@/axios'

export const useSalaryRevisionStore = defineStore('salaryRevision', () => {
  const loading = ref(false)
  const error = ref(null)

  const toError = (err, fallback) => {
    const msg = err?.response?.data?.message || err?.message || fallback
    const e = new Error(msg)
    e.status = err?.response?.status
    e.errors = err?.response?.data?.errors || {}
    return e
  }

  const createRevision = async (payload) => {
    loading.value = true
    error.value = null
    try {
      const res = await apiClient.post('/salary-revisions', payload)
      return res.data
    } catch (err) {
      const e = toError(err, 'Failed to create salary revision')
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  return { loading, error, createRevision }
})
