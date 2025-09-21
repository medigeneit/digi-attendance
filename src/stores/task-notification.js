import apiClient from '@/axios'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

export const useTaskNotificationStore = defineStore( 'task-notification', () => {

  const notifications = ref([])
  const error = ref()
  const loading = ref(false)

  const notification_count = ref({
    'pending-requirements': 0,
    'pending-tasks': 0,
  })

  const icons = {
    'pending-requirements': '📜',
    'pending-tasks': '📜',
  }


  async function fetchTaskNotificationCount() {
    loading.value = true
    error.value = null

    try {
      const response = await apiClient.get('/task-notification-count')
      notification_count.value = response.data || {}
    } catch (err) {
      error.value = err.response?.data?.message || 'Failed to fetch notifications'
    } finally {
      loading.value = false
    }
  }

  async function fetchTaskNotification( notificationType ){

    error.value = null
    loading.value = true

    try {
      const response = await apiClient.get(`/task-notifications/${notificationType}`)
      notifications.value = response?.data?.notifications
      notification_count.value[notificationType] = response?.data?.notification_count || 0

      return response?.data
    } catch (err) {
      error.value = err.response?.data?.message || 'Failed to fetch notifications'
      throw err;
    } finally {
      loading.value = false
    }
  }

  async function updateNotification( notificationType, applicationId, action, note ){

    error.value = null

    try {
      const response = await apiClient.put(
        `/task-notifications/${notificationType}/${applicationId}/${action}`,
        {
          note
        }
      )
      notifications.value = response?.data?.notifications
      return response?.data
    } catch (err) {
      error.value = err.response?.data?.message || 'Failed to update notifications'
      throw err;
    }

  }

  const total_task_notifications = computed(() => {

    if( Object.values(notification_count.value).length === 0) {
      return 0;
    }
    return Object.values(notification_count.value).reduce((sum, n) => sum + n, 0)
  })


  return {
    fetchTaskNotification,
    updateNotification,
    fetchTaskNotificationCount,
    loading,
    notifications,
    notification_count,
    total_task_notifications,
    error,
    icons
  }

})
