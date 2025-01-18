<script setup>
import { onMounted, computed } from 'vue'
import { useNotificationStore } from '@/stores/notification'

const notificationStore = useNotificationStore()

onMounted(() => {
  notificationStore.fetchNotifications()
})

const notifications = computed(() => notificationStore.notifications)
const loading = computed(() => notificationStore.loading)
const error = computed(() => notificationStore.error)

const markNotification = async (notificationId, url) => {
  await notificationStore.markAsRead(notificationId)
  if (url) {
    window.location.href = url
  }
}

const getTargetUrl = (eventType) => {
  const eventTypes = {
    leaveApplication: '/leave-application-show/',
    shortLeave: '/short-leave-show/',
    exchange: '/exchange-show/',
    manualAttendance: '/manual-attendance-show/',
  }

  return eventTypes[eventType] || '#'
}
</script>

<template>
  <div class="my-container">
    <!-- Loading State -->
    <p v-if="loading" class="text-center text-gray-500">Loading notifications...</p>

    <!-- Error State -->
    <p v-if="error" class="text-center text-red-500">{{ error }}</p>

    <!-- Notifications List -->
    <ul v-if="!loading && !error" class="divide-y divide-gray-200">
      <li
        v-for="notification in notifications"
        :key="notification.id"
        :class="{
          'p-4 bg-white': notification.read_at,
          'p-4 bg-teal-100': !notification.read_at,
        }"
        @click="
          markNotification(
            notification.id,
            getTargetUrl(notification.data.event_type) + notification.data.event_id,
          )
        "
        class="cursor-pointer relative"
      >
        <p>{{ notification.data.message }}</p>
        <span class="text-sm text-gray-500">{{
          new Date(notification.created_at).toLocaleString('en-US')
        }}</span>

        <!-- Unread Indicator -->
        <div v-if="!notification.read_at" class="absolute top-2 right-2">
          <span class="relative flex h-3 w-3">
            <span
              class="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"
            ></span>
            <span class="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
          </span>
        </div>
      </li>

      <!-- No Notifications -->
      <li v-if="notifications.length === 0" class="p-4 text-center">
        <p class="text-gray-500">No notifications found.</p>
      </li>
    </ul>
  </div>
</template>
