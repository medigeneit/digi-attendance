import { defineStore } from 'pinia'
import { ref } from 'vue'
import apiClient from '@/axios'

export const useLeaveReportStore = defineStore('leaveReport', () => {
  const isLoading = ref(false)
  const error = ref(null)

  const selectedYear = ref(String(new Date().getFullYear()))

  const pagination = ref(null)

  // ✅ always array (matrix rows)
  const companyReports = ref([])

  // ✅ backend extra flags (fallback info etc)
  const filters = ref(null)

  const reset = () => {
    error.value = null
    pagination.value = null
    companyReports.value = []
    filters.value = null
  }

  const fetchYearlyLeaveReport = async (params) => {
    isLoading.value = true
    error.value = null

    try {
      const { data } = await apiClient.get('/leave/yearly-report', { params })

      pagination.value = data?.pagination ?? null
      companyReports.value = Array.isArray(data?.data) ? data.data : []
      filters.value = data?.filters ?? null

      return data
    } catch (e) {
      error.value = e?.response?.data?.message || e?.message || 'Failed to load report'
      throw e
    } finally {
      isLoading.value = false
    }
  }

  return {
    // state
    isLoading,
    error,
    selectedYear,
    pagination,
    companyReports,
    filters,

    // actions
    reset,
    fetchYearlyLeaveReport,
  }
})
