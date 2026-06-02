import { defineStore } from 'pinia'
import { ref } from 'vue'
import apiClient from '@/axios'

export const useEmpReportsStore = defineStore('empReports', () => {
  const summary = ref(null)
  const isLoadingSummary = ref(false)
  const isDownloading = ref(false)

  const fetchSummary = async () => {
    isLoadingSummary.value = true
    try {
      const { data } = await apiClient.get('/empmanage/reports/summary')
      summary.value = data
    } catch {
      // leave summary null on error — UI handles gracefully
    } finally {
      isLoadingSummary.value = false
    }
  }

  const downloadUsersExcel = async (params, filename = 'employee-report.xlsx') => {
    isDownloading.value = true
    try {
      const response = await apiClient.get('/users', {
        params: { ...params, flag: 'excel', report_context: 'emp_reports' },
        responseType: 'blob',
      })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', filename)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } finally {
      isDownloading.value = false
    }
  }

  return {
    summary,
    isLoadingSummary,
    isDownloading,
    fetchSummary,
    downloadUsersExcel,
  }
})
