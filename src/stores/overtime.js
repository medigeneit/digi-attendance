import apiClient from '@/axios'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { useNotificationStore } from './notification'

export const useOvertimeStore = defineStore('overtime', () => {
  const overtimes = ref([])
  const reports = ref([])
  const overtime = ref(null)
  const loading = ref(false)
  const error = ref(null)
  const selectedMonth = ref(new Date().toISOString().substring(0, 7))

  const selectedMonthDisplay = computed(() => {
    const date = new Date(selectedMonth.value)
    return date.toLocaleString('default', { month: 'long', year: 'numeric' })
  })

  const fetchOvertimes = async (filters = {}) => {
    loading.value = true
    error.value = null
    try {
      const response = await apiClient.get('/overtimes', { params: filters })
      overtimes.value = response?.data
    } catch (err) {
      error.value = err.response?.data?.message || 'Failed to fetch overtimes'
      console.error('Error fetching overtimes:', err)
    } finally {
      loading.value = false
    }
  }

  const fetchUserOvertimes = async (filters = {}) => {
    loading.value = true
    error.value = null
    try {
      const response = await apiClient.get('/user-overtimes', { params: filters })
      overtimes.value = response.data
    } catch (err) {
      error.value = err.response?.data?.message || 'Failed to fetch overtimes'
      console.error('Error fetching overtimes:', err)
    } finally {
      loading.value = false
    }
  }

  const fetchUserMonthlyOvertimes = async (userId, month) => {
    loading.value = true
    error.value = null
    try {
      const response = await apiClient.get(`/user-monthly-overtimes/${userId}/${month}`)
      overtimes.value = response.data
    } catch (err) {
      error.value = err.response?.data?.message || 'Failed to fetch overtimes'
      console.error('Error fetching overtimes:', err)
    } finally {
      loading.value = false
    }
  }

  const fetchUserOvertimesByApplicationId = async (overtimeApplicationId) => {
    loading.value = true
    error.value = null
    try {
      const response = await apiClient.get(`/${overtimeApplicationId}/user-overtimes`)
      overtimes.value = response.data
      selectedMonth.value = new Date(overtimes.value[0].date).toISOString().substring(0, 7)
    } catch (err) {
      error.value = err.response?.data?.message || 'Failed to fetch overtimes'
      console.error('Error fetching overtimes:', err)
    } finally {
      loading.value = false
    }
  }

  const createOvertime = async (data = {}) => {
    loading.value = true
    error.value = null
    try {
      const response = await apiClient.post('/user-overtimes', data)
      overtimes.value.push(response.data.overtime)
      return response.data.overtime
    } catch (err) {
      error.value = err.response?.data?.message || 'Failed to create overtime'
      console.error('Error creating overtime:', err)
      throw new Error(error.value)
    } finally {
      loading.value = false
    }
  }

  const fetchOvertimeById = async (id) => {
    loading.value = true
    error.value = null

    try {
      const response = await apiClient.get(`/overtimes/${id}`)

      overtime.value = response.data || {}

      const notificationStore = useNotificationStore()

      await notificationStore.fetchApprovalPermissions('overtime_applications', overtime.value.id)

      return overtime.value
    } catch (err) {
      error.value = err.response?.data?.message || `Failed to fetch overtime (ID: ${id})`
      console.error(`Error fetching overtime with id ${id}:`, err)
      throw new Error(error.value)
    } finally {
      loading.value = false
    }
  }

  const updateApprovalTime = async (overtimeId, approvalTimeAsHour) => {
    loading.value = true
    error.value = null
    try {
      const response = await apiClient.patch(`/user-overtimes/${overtimeId}/update-approval-time`, {
        approval_overtime_hours: approvalTimeAsHour,
      })
      const index = overtimes.value.findIndex((attendance) => attendance.id === overtimeId)
      if (index !== -1) {
        overtimes.value[index] = response.data
      }
      return response.data.overtime
    } catch (err) {
      error.value = err.response?.data?.message || `Failed to update overtime (ID: ${overtimeId})`
      console.error(`Error updating overtime with id ${overtimeId}:`, err)
      throw new Error(error.value)
    } finally {
      loading.value = false
    }
  }

  const updateOvertime = async (id, data) => {
    loading.value = true
    error.value = null
    try {
      const response = await apiClient.put(`/overtimes/${id}`, data)
      const index = overtimes.value.findIndex((attendance) => attendance.id === id)
      if (index !== -1) {
        overtimes.value[index] = response.data.overtime
      }
      return response.data.overtime
    } catch (err) {
      error.value = err.response?.data?.message || `Failed to update overtime (ID: ${id})`
      console.error(`Error updating overtime with id ${id}:`, err)
      throw new Error(error.value)
    } finally {
      loading.value = false
    }
  }

  const deleteOvertime = async (id) => {
    loading.value = true
    error.value = null
    try {
      await apiClient.delete(`/overtimes/${id}`)
      overtimes.value = overtimes.value.filter((attendance) => attendance.id !== id)
    } catch (err) {
      error.value = err.response?.data?.message || `Failed to delete overtime (ID: ${id})`
      console.error(`Error deleting overtime with id ${id}:`, err)
      throw new Error(error.value)
    } finally {
      loading.value = false
    }
  }
  const getCompanyDepartmentOvertimeReport = async (month, filters = {}) => {
    loading.value = true
    error.value = null
    try {
      console.log(month, filters)
      const response = await apiClient.get(`/user-monthly-overtimes-report/${month}`, {
        params: filters,
      })
      reports.value = response?.data
      return response?.data
    } catch (err) {
      error.value = err.response?.data?.message || 'Failed to fetch overtimes'
      console.error('Error fetching overtimes:', err)
    } finally {
      loading.value = false
    }
  }

  const exportCompanyDepartmentOvertimeExcel = async (month, filters = {}) => {
    try {
      const res = await apiClient.get(`/user-monthly-overtimes-report/${month}?flag=excel`, {
        responseType: 'blob',
        params: {
          ...filters,
          excel: true, // match Laravel's `$request->excel`
        },
      })

      downloadBlob(res.data, `CompanyDepartmentOvertime-${month}.xlsx`)
    } catch (err) {
      console.error('Excel export failed:', err)
    }
  }

  const exportCompanyDepartmentOvertimePdf = async (month, filters = {}) => {
    try {
      const queryParams = new URLSearchParams({
        ...filters,
        flag: 'pdf',
      }).toString()

      const res = await apiClient.get(`/user-monthly-overtimes-report/${month}?${queryParams}`, {
        responseType: 'blob',
      })

      downloadBlob(res.data, `CompanyDepartmentOvertime-${month}.pdf`)
    } catch (err) {
      console.error('PDF Export Error:', err)
    }
  }

  function downloadBlob(blobData, filename) {
    const url = window.URL.createObjectURL(new Blob([blobData]))
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', filename)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return {
    overtimes,
    reports,
    overtime,
    loading,
    error,
    selectedMonth,
    selectedMonthDisplay,
    fetchOvertimes,
    createOvertime,
    fetchOvertimeById,
    updateApprovalTime,
    updateOvertime,
    deleteOvertime,
    fetchUserOvertimes,
    fetchUserMonthlyOvertimes,
    fetchUserOvertimesByApplicationId,
    getCompanyDepartmentOvertimeReport,
    exportCompanyDepartmentOvertimeExcel,
    exportCompanyDepartmentOvertimePdf,
  }
})
