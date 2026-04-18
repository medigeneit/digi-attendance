import apiClient from '@/axios'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

export const useNotificationStore = defineStore('notification', () => {
  const notifications = ref([])
  const loading = ref(false)
  const error = ref(null)
  const applicationFeedbackLoading = ref(false)
  const applicationFeedbackError = ref(null)
  const totalUnreadNotifications = ref(0)
  const grouped_counts = ref(null)
  const count_notifications = ref({})
  const applicationFeedbackNotifications = ref([])

  const approvalPermissions = ref({})
  const applicationApprovalPermissions = ref([])

  const icons = ref({
    leave_applications: 'fas fa-file-alt',
    short_leave_applications: 'fas fa-clock',
    shift_exchange_applications: 'fas fa-random',
    offday_exchange_applications: 'fas fa-random',
    manual_attendance_applications: 'fas fa-user-clock',
    overtime_applications: 'fas fa-hourglass-half',
    probation: 'fas fa-flask',
    application_feedback: 'fas fa-comments',
    discipline_attachments: 'fas fa-file-signature',
  })

  const total_notifications = computed(() => {
    if( Object.values(count_notifications.value).length === 0) {
      return 0;
    }

    return Object.values(count_notifications.value).reduce((sum, n) => sum + n, 0)
  })

  async function fetchNotifications() {
    loading.value = true
    error.value = null

    try {
      const response = await apiClient.get('/notifications')
      notifications.value = response?.data?.notifications
      totalUnreadNotifications.value = response?.data?.total_unread
      grouped_counts.value = response?.data?.grouped_counts
    } catch (err) {
      error.value = err.response?.data?.message || 'Failed to fetch notifications'
    } finally {
      loading.value = false
    }
  }

  async function fetchNotificationsByType(type) {
    loading.value = true
    error.value = null

    try {
      const response = await apiClient.get('/notifications', {
        params: { type },
      })
      notifications.value = response?.data?.notifications?.[type] || []
      totalUnreadNotifications.value = response?.data?.total_unread
      grouped_counts.value = response?.data?.grouped_counts
    } catch (err) {
      error.value = err.response?.data?.message || 'Failed to fetch notifications'
    } finally {
      loading.value = false
    }
  }

  async function fetchApprovalPermissions(notificationType, applicationId) {
    loading.value = true
    error.value = null

    try {
      const response = await apiClient.get(
        `/pending-notifications/${notificationType}/${applicationId}/permissions`,
      )

      approvalPermissions.value = response.data || {}
    } catch (err) {
      error.value = err.response?.data?.message || 'Failed to fetch notifications'
    } finally {
      loading.value = false
    }
  }

  async function fetchApprovalPermissionsByUserApplicationIds(
    notificationType,
    applicationIds,
  ) {
    loading.value = true
    error.value = null

    try {
      const response = await apiClient.get(
        `/pending-notifications/${notificationType}/${applicationIds.join(',')}/application-permissions`,
      )

      applicationApprovalPermissions.value = response.data || []
    } catch (err) {
      error.value = err.response?.data?.message || 'Failed to fetch notifications'
      console.log({
        fetchApprovalPermissionsByUserApplicationIds: err,
      })
    } finally {
      loading.value = false
    }
  }

  async function updateSpecificNotification(notificationType, applicationId, action, note = '') {
    loading.value = true
    error.value = null

    try {

      await apiClient.put(
        `/pending-notifications/${notificationType}/${applicationId}/${action}`,
        { note },
      )

      await fetchCountNotifications()
    } catch (err) {
      error.value = err.response?.data?.message || 'Failed to fetch notifications'
    } finally {
      loading.value = false
    }
  }

  async function fetchSpecificNotifications(notificationType) {
    loading.value = true
    error.value = null

    try {
      const response = await apiClient.get(`/pending-notifications/${notificationType}`)
      notifications.value = response?.data
    } catch (err) {
      error.value = err.response?.data?.message || 'Failed to fetch notifications'
    } finally {
      loading.value = false
    }
  }

  async function fetchCountNotifications() {
    loading.value = true
    error.value = null

    try {
      const response = await apiClient.get('/count-notifications')
      count_notifications.value = response.data || {}
    } catch (err) {
      error.value = err.response?.data?.message || 'Failed to fetch notifications'
    } finally {
      loading.value = false
    }
  }

  async function markAsRead(notificationId) {
    try {
      await apiClient.post(`/notifications/${notificationId}/read`)
      fetchNotifications() // Refresh notifications after marking as read
    } catch (err) {
      console.error('Failed to mark notification as read:', err)
    }
  }

  async function fetchApplicationFeedbackNotifications() {
    applicationFeedbackLoading.value = true
    applicationFeedbackError.value = null

    try {
      const response = await apiClient.get('/application-feedback-notifications')
      applicationFeedbackNotifications.value = response?.data?.notifications || []
    } catch (err) {
      applicationFeedbackError.value =
        err.response?.data?.message || 'Failed to fetch application feedback notifications'
    } finally {
      applicationFeedbackLoading.value = false
    }
  }

  async function markFeedbackNotificationAsRead(notificationId) {
    try {
      await apiClient.post(`/notifications/${notificationId}/read`)
      await fetchApplicationFeedbackNotifications()
      await fetchCountNotifications()
    } catch (err) {
      console.error('Failed to mark application feedback notification as read:', err)
    }
  }

  return {
    icons,
    notifications,
    loading,
    error,
    fetchNotifications,
    fetchNotificationsByType,
    markAsRead,
    totalUnreadNotifications,
    grouped_counts,
    fetchApprovalPermissions,
    fetchApprovalPermissionsByUserApplicationIds,
    updateSpecificNotification,
    fetchSpecificNotifications,
    fetchCountNotifications,
    count_notifications,
    total_notifications,
    approvalPermissions,
    applicationApprovalPermissions,
    applicationFeedbackNotifications,
    applicationFeedbackLoading,
    applicationFeedbackError,
    fetchApplicationFeedbackNotifications,
    markFeedbackNotificationAsRead,
  }
})

