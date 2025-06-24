import apiClient from '@/axios'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { useNotificationStore } from './notification'

export const useOvertimeStore = defineStore('overtime', () => {
  const overtimes = ref([])
  const overtime = ref(null)
  const loading = ref(false)
  const error = ref(null)
  const selectedMonth = ref(new Date().toISOString().substring(0, 7))
  const selectedStatus = ref('')

  const fetchOvertimes = async (filters = {}) => {
    loading.value = true
    error.value = null
    try {
      const response = await apiClient.get('/manual-attendances', { params: filters })
      overtimes.value = response?.data
    } catch (err) {
      error.value = err.response?.data?.message || 'Failed to fetch manual attendances'
      console.error('Error fetching manual attendances:', err)
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
      error.value = err.response?.data?.message || 'Failed to fetch manual attendances'
      console.error('Error fetching manual attendances:', err)
    } finally {
      loading.value = false
    }
  }

  const fetchOvertimeById = async (id) => {
    loading.value = true
    error.value = null
    try {
      const response = await apiClient.get(`/manual-attendances/${id}`)
      overtime.value = response.data

      const notificationStore = useNotificationStore()

      await notificationStore.fetchApprovalPermissions(
        'manual_attendance_applications',
        overtime.value.id,
      )
    } catch (err) {
      error.value = err.response?.data?.message || `Failed to fetch manual attendance (ID: ${id})`
      console.error(`Error fetching manual attendance with id ${id}:`, err)
    } finally {
      loading.value = false
    }
  }

  const createOvertime = async (data) => {
    loading.value = true
    error.value = null
    try {
      const response = await apiClient.post('/manual-attendances', data)
      overtimes.value.push(response.data.data)
      return response.data.data
    } catch (err) {
      error.value = err.response?.data?.message || 'Failed to create manual attendance'
      console.error('Error creating manual attendance:', err)
      throw new Error(error.value)
    } finally {
      loading.value = false
    }
  }
  const createBulkOvertime = async (data) => {
    loading.value = true
    error.value = null
    try {
      const response = await apiClient.post('manual-attendance/bulk-store', data)

      // Optional: if your response includes created data
      if (Array.isArray(response.data.data)) {
        overtimes.value.push(...response.data.data)
      }

      return response.data
    } catch (err) {
      console.error('Error creating manual attendance:', err)
      error.value = err.response?.data?.message || 'Failed to create manual attendance'
      throw new Error(error.value)
    } finally {
      loading.value = false
    }
  }

  const updateOvertime = async (id, data) => {
    loading.value = true
    error.value = null
    try {
      const response = await apiClient.put(`/manual-attendances/${id}`, data)
      const index = overtimes.value.findIndex((attendance) => attendance.id === id)
      if (index !== -1) {
        overtimes.value[index] = response.data.data
      }
      return response.data.data
    } catch (err) {
      error.value = err.response?.data?.message || `Failed to update manual attendance (ID: ${id})`
      console.error(`Error updating manual attendance with id ${id}:`, err)
      throw new Error(error.value)
    } finally {
      loading.value = false
    }
  }

  const deleteOvertime = async (id) => {
    loading.value = true
    error.value = null
    try {
      await apiClient.delete(`/manual-attendances/${id}`)
      overtimes.value = overtimes.value.filter((attendance) => attendance.id !== id)
    } catch (err) {
      error.value = err.response?.data?.message || `Failed to delete manual attendance (ID: ${id})`
      console.error(`Error deleting manual attendance with id ${id}:`, err)
      throw new Error(error.value)
    } finally {
      loading.value = false
    }
  }

  const inChargeAccept = async (payload) => {
    loading.value = true
    error.value = null
    try {
      const response = await apiClient.post(
        `/manual-attendances/${payload?.id}/in-charge-accept`,
        payload,
      )
      const index = overtimes.value.findIndex((attendance) => attendance.id === id)
      if (index !== -1) {
        overtimes.value[index] = response.data.data
      }
      return response.data.data
    } catch (err) {
      error.value =
        err.response?.data?.message ||
        `Failed to accept in-charge for manual attendance (ID: ${id})`
      console.error(`Error accepting in-charge for manual attendance with id ${id}:`, err)
      throw new Error(error.value)
    } finally {
      loading.value = false
    }
  }

  const recommendByAccept = async (payload) => {
    loading.value = true
    error.value = null
    try {
      const response = await apiClient.post(
        `/manual-attendances/${payload?.id}/recommend-by-accept`,
        payload,
      )
      const index = overtimes.value.findIndex((attendance) => attendance.id === id)
      if (index !== -1) {
        overtimes.value[index] = response.data.data
      }
      return response.data.data
    } catch (err) {
      error.value =
        err.response?.data?.message ||
        `Failed to accept recommendation for manual attendance (ID: ${id})`
      console.error(`Error accepting recommendation for manual attendance with id ${id}:`, err)
      throw new Error(error.value)
    } finally {
      loading.value = false
    }
  }

  const approvedByAccept = async (payload) => {
    loading.value = true
    error.value = null
    try {
      const response = await apiClient.post(
        `/manual-attendances/${payload?.id}/approved-by-accept`,
        payload,
      )
      const index = overtimes.value.findIndex((attendance) => attendance.id === id)
      if (index !== -1) {
        overtimes.value[index] = response.data.data
      }
      return response.data.data
    } catch (err) {
      error.value =
        err.response?.data?.message || `Failed to approve manual attendance (ID: ${payload?.id})`
      console.error(`Error approving manual attendance with id ${payload?.id}:`, err)
      throw new Error(error.value)
    } finally {
      loading.value = false
    }
  }

  const rejectOvertime = async (id, rejectionReason) => {
    loading.value = true
    error.value = null
    try {
      const response = await apiClient.post(`/manual-attendances/${id}/reject`, {
        rejection_reason: rejectionReason,
      })
      const index = overtimes.value.findIndex((attendance) => attendance.id === id)
      if (index !== -1) {
        overtimes.value[index] = response.data.data
      }
      return response.data.data
    } catch (err) {
      error.value = err.response?.data?.message || `Failed to reject manual attendance (ID: ${id})`
      console.error(`Error rejecting manual attendance with id ${id}:`, err)
      throw new Error(error.value)
    } finally {
      loading.value = false
    }
  }

  return {
    overtimes: computed(() => overtimes.value),
    overtime: computed(() => overtime.value),
    loading: computed(() => loading.value),
    error: computed(() => error.value),
    selectedMonth,
    selectedStatus,
    fetchOvertimes,
    fetchOvertimeById,
    createOvertime,
    updateOvertime,
    deleteOvertime,
    inChargeAccept,
    recommendByAccept,
    approvedByAccept,
    rejectOvertime,
    fetchUserOvertimes,
    createBulkOvertime
  }
})
