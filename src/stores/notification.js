import apiClient from '@/axios';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

export const useNotificationStore = defineStore('notification', () => {
  const notifications = ref([]);
  const loading = ref(false);
  const error = ref(null);
  const totalUnreadNotifications = ref(0);
  const grouped_counts = ref(null);

  async function fetchNotifications() {
    loading.value = true;
    error.value = null;

    try {
      const response = await apiClient.get('/notifications');
      notifications.value = response?.data?.notifications;
      totalUnreadNotifications.value = response?.data?.total_unread;
      grouped_counts.value = response?.data?.grouped_counts;
    } catch (err) {
      error.value = err.response?.data?.message || 'Failed to fetch notifications';
    } finally {
      loading.value = false;
    }
  }

  async function markAsRead(notificationId) {
    try {
      await apiClient.post(`/notifications/${notificationId}/read`);
      fetchNotifications(); // Refresh notifications after marking as read
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  }

  const unreadCount = computed(() => {
    // return notifications?.value.filter((notification) => !notification.read_at).length;
  });

  return { 
    notifications, 
    loading, 
    error, 
    fetchNotifications, 
    markAsRead, 
    unreadCount, 
    totalUnreadNotifications, 
    grouped_counts 
  };
});
