import apiClient from '@/axios'
import { defineStore } from 'pinia'
import { reactive, ref } from 'vue'

export const useTaskNotificationStore = defineStore( 'task-notification', () => {

  const notifications = ref([])
  const error = ref()
  const loading = ref(false)

  const notification_count = reactive({
    'pending-requirements': 0,
    'pending-tasks': 0,
  })

  const icons = {
    'pending-requirements': '📜',
    'pending-tasks': '📜',
  }

  async function fetchTaskNotification( notificationType ){

    error.value = null
    loading.value = true

    try {
      const response = await apiClient.get(`/task-notifications/${notificationType}`)
      notifications.value = response?.data?.notifications

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



  return {fetchTaskNotification,updateNotification, loading, notifications, notification_count, error, icons}

})
