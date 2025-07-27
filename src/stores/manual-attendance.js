import apiClient from '@/axios'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { useNotificationStore } from './notification'

export const useManualAttendanceStore = defineStore('manualAttendance', () => {
  const manualAttendances = ref([])
  const manualAttendance = ref(null)
  const attendances = ref(null)
  const loading = ref(false)
  const user = ref(null)
  const error = ref(null)
  const selectedMonth = ref(new Date().toISOString().substring(0, 7))
  const selectedStatus = ref('')

  const fetchManualAttendances = async (filters = {}) => {
    loading.value = true
    error.value = null
    try {
      const response = await apiClient.get('/manual-attendances', { params: filters })
      manualAttendances.value = response?.data
    } catch (err) {
      error.value = err.response?.data?.message || 'Failed to fetch manual attendances'
      console.error('Error fetching manual attendances:', err)
    } finally {
      loading.value = false
    }
  }

  const fetchAdminManualAttendances = async (filters = {}) => {
    loading.value = true
    error.value = null
    try {
      const response = await apiClient.get('/admin-manual-attendances', { params: filters })
      attendances.value = response?.data?.attendances
      user.value = response?.data?.user
    } catch (err) {
      error.value = err.response?.data?.message || 'Failed to fetch manual attendances'
      console.error('Error fetching manual attendances:', err)
    } finally {
      loading.value = false
    }
  }

  const fetchUserManualAttendances = async (filters = {}) => {
    loading.value = true
    error.value = null
    try {
      const response = await apiClient.get('/user-manual-attendances', { params: filters })
      manualAttendances.value = response.data.data
    } catch (err) {
      error.value = err.response?.data?.message || 'Failed to fetch manual attendances'
      console.error('Error fetching manual attendances:', err)
    } finally {
      loading.value = false
    }
  }

  const fetchManualAttendanceById = async (id) => {
    loading.value = true
    error.value = null
    try {
      const response = await apiClient.get(`/manual-attendances/${id}`)
      manualAttendance.value = response.data

      const notificationStore = useNotificationStore()

      await notificationStore.fetchApprovalPermissions(
        'manual_attendance_applications',
        manualAttendance.value.id,
      )
    } catch (err) {
      error.value = err.response?.data?.message || `Failed to fetch manual attendance (ID: ${id})`
      console.error(`Error fetching manual attendance with id ${id}:`, err)
    } finally {
      loading.value = false
    }
  }

  const createManualAttendance = async (data) => {
    loading.value = true
    error.value = null
    try {
      const response = await apiClient.post('/manual-attendances', data)
      manualAttendances.value.push(response.data.data)
      return response.data.data
    } catch (err) {
      error.value = err.response?.data?.message || 'Failed to create manual attendance'
      console.error('Error creating manual attendance:', err)
      throw new Error(error.value)
    } finally {
      loading.value = false
    }
  }
  const createBulkManualAttendance = async (data) => {
    loading.value = true
    error.value = null
    try {
      const response = await apiClient.post('manual-attendance/bulk-store', data)

      // Optional: if your response includes created data
      if (Array.isArray(response.data.data)) {
        manualAttendances.value.push(...response.data.data)
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

  const updateManualAttendance = async (id, data) => {
    loading.value = true
    error.value = null
    try {
      const response = await apiClient.put(`/manual-attendances/${id}`, data)
      const index = manualAttendances.value.findIndex((attendance) => attendance.id === id)
      if (index !== -1) {
        manualAttendances.value[index] = response.data.data
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

  const deleteManualAttendance = async (id) => {
    loading.value = true
    error.value = null
    try {
      await apiClient.delete(`/manual-attendances/${id}`)
      manualAttendances.value = manualAttendances.value.filter((attendance) => attendance.id !== id)
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
      const index = manualAttendances.value.findIndex((attendance) => attendance.id === id)
      if (index !== -1) {
        manualAttendances.value[index] = response.data.data
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
      const index = manualAttendances.value.findIndex((attendance) => attendance.id === id)
      if (index !== -1) {
        manualAttendances.value[index] = response.data.data
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
      const index = manualAttendances.value.findIndex((attendance) => attendance.id === id)
      if (index !== -1) {
        manualAttendances.value[index] = response.data.data
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

  const rejectManualAttendance = async (id, rejectionReason) => {
    loading.value = true
    error.value = null
    try {
      const response = await apiClient.post(`/manual-attendances/${id}/reject`, {
        rejection_reason: rejectionReason,
      })
      const index = manualAttendances.value.findIndex((attendance) => attendance.id === id)
      if (index !== -1) {
        manualAttendances.value[index] = response.data.data
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
    manualAttendances: computed(() => manualAttendances.value),
    manualAttendance: computed(() => manualAttendance.value),
    loading: computed(() => loading.value),
    error: computed(() => error.value),
    selectedMonth,
    selectedStatus,
    user,
    attendances,
    fetchManualAttendances,
    fetchAdminManualAttendances,
    fetchManualAttendanceById,
    createManualAttendance,
    updateManualAttendance,
    deleteManualAttendance,
    inChargeAccept,
    recommendByAccept,
    approvedByAccept,
    rejectManualAttendance,
    fetchUserManualAttendances,
    createBulkManualAttendance,
  }
})
