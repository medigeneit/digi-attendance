import apiClient from '@/axios'; // Assuming axios is configured in '@/axios'
import { defineStore } from 'pinia';
import { ref } from 'vue';
import { useNotificationStore } from './notification';

export const useLeaveApplicationStore = defineStore('leaveApplication', () => {
  const leaveApplications = ref([])
  const leaveApplication = ref(null)
  const loading = ref(false)
  const error = ref(null)
  const selectedMonth = ref(new Date().toISOString().substring(0, 7))
  const selectedYear = ref(new Date().getFullYear())
  const user = ref(null)
  const selectedStatus = ref('')

  async function fetchLeaveApplications(filters = {}) {
    loading.value = true
    error.value = null
    try {
      const response = await apiClient.get('/leave-applications', { params: filters })
      if (response.data) {
        leaveApplications.value = response.data
      } else {
        leaveApplications.value = []
      }
    } catch (err) {
      error.value = err.response?.data?.message || 'Failed to fetch leave applications'
    } finally {
      loading.value = false
    }
  }

  async function fetchYearlyUserLeaveApplications(filters = {}) {
    loading.value = true
    error.value = null
    try {
      const response = await apiClient.get('/yearly-user-leave-applications', { params: filters })
      if (response.data) {
        leaveApplications.value = response?.data?.leave_applications
        user.value = response?.data?.user
      } else {
        leaveApplications.value = []
        user.value = []
      }
    } catch (err) {
      error.value = err.response?.data?.message || 'Failed to fetch leave applications'
    } finally {
      loading.value = false
    }
  }

  async function fetchMyLeaveApplications(filters = {}) {
    loading.value = true
    error.value = null
    try {
      const response = await apiClient.get('/my-leave-applications', { params: filters })
      leaveApplications.value = response.data.data
    } catch (err) {
      error.value = err.response?.data?.message || 'Failed to fetch leave applications'
    } finally {
      loading.value = false
    }
  }

  async function storeLeaveApplication(payload) {
    loading.value = true
    error.value = null
    try {
      const response = await apiClient.post('/leave-applications/store', payload)
      leaveApplications.value.push(response?.data?.data)
      return response?.data?.data
    } catch (err) {
      error.value = err.response?.data?.message || 'Failed to store leave application'
      throw new Error(error.value)
    } finally {
      loading.value = false
    }
  }

  async function deleteLeaveApplication(applicationId) {
    loading.value = true
    error.value = null
    try {
      await apiClient.delete(`/my-leave-application/destroy/${applicationId}`)
      await fetchLeaveApplications()
    } catch (err) {
      error.value = err.response?.data?.message || 'Failed to store leave application'
      throw new Error(error.value)
    } finally {
      loading.value = false
    }
  }

   const fetchFileUpload = async (payload) => {
      try {
        loading.value = true
        const response = await apiClient.post('cental-attachment-upload', payload, {
          headers: {
            'Content-Type': 'multipart/form-data', // ✅ Content-Type ঠিক রাখা
          },
        })
        return response.data
      } catch (err) {
        error.value = err.response?.data?.message || 'Something went wrong'
      } finally {
        loading.value = false
      }
  }

  async function updateLeaveApplication(id, payload) {
    loading.value = true
    error.value = null
    try {
      const response = await apiClient.post(`/leave-applications/${id}/update`, payload)
      const index = leaveApplications.value.findIndex((app) => app.id === id)
      if (index !== -1) {
        leaveApplications.value[index] = response.data.data
      }
      return response.data.data
    } catch (err) {
      error.value = err.response?.data?.message || 'Failed to update leave application'
      throw new Error(error.value)
    } finally {
      loading.value = false
    }
  }

   const uploadLeaveApplicationAttachment = async (id, data) => {
      loading.value = true
      error.value = null
      try {
        const response = await apiClient.put(`/leave-attachment/${id}`, data)
        const index = leaveApplications.value.findIndex((leave) => leave.id === id)
        if (index !== -1) {
          leaveApplications.value[index] = response.data.data
        }
        return response.data.data
      } catch (err) {
        error.value = err.response?.data?.message || `Failed to update application leave (ID: ${id})`
        console.error(`Error updating application leave with id ${id}:`, err)
        throw new Error(error.value)
      } finally {
        loading.value = false
      }
    }

  async function fetchLeaveApplicationById(id) {
    loading.value = true
    error.value = null
    try {
      const response = await apiClient.get(`/leave-applications/${id}`)
      leaveApplication.value = response?.data

      const notificationStore = useNotificationStore()

      await notificationStore.fetchApprovalPermissions(
        'leave_applications',
        leaveApplication.value.id,
      )
    } catch (err) {
      error.value = err.response?.data?.message || 'Failed to fetch leave application'
    } finally {
      loading.value = false
    }
  }

  async function acceptHandover(payload) {
    loading.value = true
    error.value = null

    try {
      const response = await apiClient.post(
        `/leave-applications/${payload.id}/handover-accept`,
        payload,
      )
      const index = leaveApplications.value.findIndex((app) => app.id === payload?.id)
      if (index !== -1) {
        leaveApplications.value[index] = response.data.data
      }
      return response.data.data
    } catch (err) {
      error.value = err.response?.data?.message || 'Failed to accept handover'
      throw new Error(error.value)
    } finally {
      loading.value = false
    }
  }

  async function acceptInCharge(payload) {
    loading.value = true
    error.value = null

    try {
      const response = await apiClient.post(
        `/leave-applications/${payload.id}/incharge-accept`,
        payload,
      )
      const index = leaveApplications.value.findIndex((app) => app.id === payload?.id)
      if (index !== -1) {
        leaveApplications.value[index] = response.data.data
      }
      return response?.data?.data
    } catch (err) {
      error.value = err.response?.data?.message || 'Failed to accept in-charge approval'
      throw new Error(error.value)
    } finally {
      loading.value = false
    }
  }

  async function acceptCoordinator(payload) {
    loading.value = true
    error.value = null

    try {
      const response = await apiClient.post(
        `/leave-applications/${payload.id}/coordinator-accept`,
        payload,
      )
      const index = leaveApplications.value.findIndex((app) => app.id === payload?.id)
      if (index !== -1) {
        leaveApplications.value[index] = response.data.data
      }
      return response?.data?.data
    } catch (err) {
      error.value = err.response?.data?.message || 'Failed to accept coordinator approval'
      throw new Error(error.value)
    } finally {
      loading.value = false
    }
  }

  async function acceptOperationalAdmin(payload) {
    loading.value = true
    error.value = null

    try {
      const response = await apiClient.post(
        `/leave-applications/${payload.id}/operational-admin-accept`,
        payload,
      )
      const index = leaveApplications.value.findIndex((app) => app.id === payload?.id)
      if (index !== -1) {
        leaveApplications.value[index] = response.data.data
      }
      return response?.data?.data
    } catch (err) {
      error.value = err.response?.data?.message || 'Failed to accept operational admin approval'
      throw new Error(error.value)
    } finally {
      loading.value = false
    }
  }

  async function acceptRecommendBy(payload) {
    loading.value = true
    error.value = null

    try {
      const response = await apiClient.post(
        `/leave-applications/${payload.id}/recommend-by-accept`,
        payload,
      )

      const index = leaveApplications.value.findIndex((app) => app.id === payload?.id)

      if (index !== -1) {
        leaveApplications.value[index] = response.data.data
      }
      return response?.data?.data
    } catch (err) {
      error.value = err.response?.data?.message || 'Failed to accept recommend by approval'
      throw new Error(error.value)
    } finally {
      loading.value = false
    }
  }

  async function acceptApprovedBy(payload) {
    loading.value = true
    error.value = null

    try {
      const response = await apiClient.post(
        `/leave-applications/${payload?.id}/approved-by-accept`,
        payload,
      )
      const index = leaveApplications.value.findIndex((app) => app.id === payload?.id)
      if (index !== -1) {
        leaveApplications.value[index] = response.data.data
      }
      return response?.data?.data
    } catch (err) {
      error.value = err.response?.data?.message || 'Failed to accept approval by admin'
      throw new Error(error.value)
    } finally {
      loading.value = false
    }
  }

  async function rejectLeaveApplication(id, payload) {
    loading.value = true
    error.value = null

    try {
      const response = await apiClient.post(`/leave-applications/${id}/reject`, payload)
      const index = leaveApplications.value.findIndex((app) => app.id === id)
      if (index !== -1) {
        leaveApplications.value[index] = response.data.data
      }
      return response.data.data
    } catch (err) {
      error.value = err.response?.data?.message || 'Failed to reject leave application'
      throw new Error(error.value)
    } finally {
      loading.value = false
    }
  }
  return {
    leaveApplications,
    leaveApplication,
    loading,
    error,
    selectedMonth,
    selectedYear,
    user,
    selectedStatus,
    fetchLeaveApplications,
    storeLeaveApplication,
    updateLeaveApplication,
    fetchLeaveApplicationById,
    acceptHandover,
    acceptInCharge,
    acceptCoordinator,
    acceptOperationalAdmin,
    acceptRecommendBy,
    acceptApprovedBy,
    rejectLeaveApplication,
    fetchMyLeaveApplications,
    deleteLeaveApplication,
    fetchFileUpload,
    uploadLeaveApplicationAttachment,
    fetchYearlyUserLeaveApplications
  }
})
