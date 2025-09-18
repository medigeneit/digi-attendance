import apiClient from '@/axios'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

export const useNotificationStore = defineStore('notification', () => {
  const notifications = ref([])
  const loading = ref(false)
  const error = ref(null)
  const totalUnreadNotifications = ref(0)
  const grouped_counts = ref(null)
  const count_notifications = ref({})

  const approvalPermissions = ref({})
  const applicationApprovalPermissions = ref([])

  const icons = ref({
    leave_applications: '📜',
    short_leave_applications: '📋',
    shift_exchange_applications: '🔄',
    offday_exchange_applications: '🔄',
    manual_attendance_applications: '🕒',
    overtime_applications: '⏱️',
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

  return {
    icons,
    notifications,
    loading,
    error,
    fetchNotifications,
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
  }
})
