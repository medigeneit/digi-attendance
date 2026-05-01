import { defineStore } from 'pinia'
import { ref } from 'vue'
import apiClient from '@/axios'

export const useDoctorPayrollStore = defineStore('doctorPayroll', () => {
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
      const res = await apiClient.get('/doctor-payrolls', { params })
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
      const e = toError(err, 'Failed to fetch doctor payrolls')
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
      const res = await apiClient.get(`/doctor-payrolls/${id}`)
      item.value = res.data?.data || res.data
      return item.value
    } catch (err) {
      const e = toError(err, 'Failed to fetch doctor payroll')
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  const approve = async (id, payload = {}) => {
    loading.value = true
    error.value = null

    try {
      const res = await apiClient.patch(`/doctor-payrolls/${id}/approve`, payload)
      const updated = res.data?.data || res.data
      const idx = list.value.findIndex((row) => row.id === id)
      if (idx !== -1) list.value[idx] = updated
      if (item.value?.id === id) item.value = updated
      return updated
    } catch (err) {
      const e = toError(err, 'Failed to approve doctor payroll')
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  const update = async (id, payload = {}) => {
    loading.value = true
    error.value = null

    try {
      const res = await apiClient.patch(`/doctor-payrolls/${id}`, payload)
      const updated = res.data?.data || res.data
      const idx = list.value.findIndex((row) => row.id === id)
      if (idx !== -1) list.value[idx] = updated
      if (item.value?.id === id) item.value = updated
      return updated
    } catch (err) {
      const e = toError(err, 'Failed to update doctor payroll')
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  const markPaid = async (id, payload = {}) => {
    loading.value = true
    error.value = null

    try {
      const res = await apiClient.patch(`/doctor-payrolls/${id}/paid`, payload)
      const updated = res.data?.data || res.data
      const idx = list.value.findIndex((row) => row.id === id)
      if (idx !== -1) list.value[idx] = updated
      if (item.value?.id === id) item.value = updated
      return updated
    } catch (err) {
      const e = toError(err, 'Failed to mark doctor payroll as paid')
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
    update,
    approve,
    markPaid,
  }
})
