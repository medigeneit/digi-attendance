import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import apiClient from '@/axios';

export const useNotificationStore = defineStore('notification', () => {
  const notifications = ref([]);
  const loading = ref(false);
  const error = ref(null);

  async function fetchNotifications() {
    loading.value = true;
    error.value = null;

    try {
      const response = await apiClient.get('/notifications');
      notifications.value = response.data;
    } catch (err) {
      error.value = err.response?.data?.message || 'Failed to fetch notifications';
    } finally {
      loading.value = false;
    }
  }

  async function markAsRead(notificationId) {
    try {
      await apiClient.post(`/notifications/${notificationId}/read`);
      const notification = notifications.value.find((n) => n.id === notificationId);
      if (notification) {
        notification.read_at = new Date().toISOString();
      }
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  }

  const unreadCount = computed(() => {
    return notifications.value.filter((notification) => !notification.read_at).length;
  });

  return { notifications, loading, error, fetchNotifications, markAsRead, unreadCount };
});
