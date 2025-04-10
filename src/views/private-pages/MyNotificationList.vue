<script setup>
import { useNotificationStore } from '@/stores/notification'
import { storeToRefs } from 'pinia'
import { computed, onMounted } from 'vue'

const notificationStore = useNotificationStore()

const { grouped_counts } = storeToRefs(notificationStore)

onMounted(() => {
  notificationStore.fetchNotifications()
})

const notifications = computed(() => notificationStore.notifications)
const loading = computed(() => notificationStore.loading)
const error = computed(() => notificationStore.error)

// ✅ Group notifications by event_type
const groupedNotifications = computed(() => {
  if (!Array.isArray(notifications.value)) return {}

  return notifications.value.reduce((acc, notification) => {
    const type = notification.data?.event_type || 'other'
    if (!acc[type]) {
      acc[type] = []
    }
    acc[type].push(notification)
    return acc
  }, {})
})

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
    offday: '/exchange-offday-show/',
    shift: '/exchange-shift-show/',
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
    <div v-if="!loading && !error" class="grid gap-4 md:grid-cols-3 px-4">
      <RouterLink
        :to="{ name: 'NotificationList', query: { type: 'leaveApplication' } }"
        class="main-button"
      >
        <div class="flex justify-between items-center gap-2">
          <span>📄 Leave Applications</span>
          <span
            v-if="grouped_counts.leaveApplication"
            class="text-xs bg-teal-500 text-white rounded-full px-2 py-0.5 font-semibold"
          >
            {{ grouped_counts.leaveApplication }}
          </span>
        </div>
      </RouterLink>
      <RouterLink
        :to="{ name: 'NotificationList', query: { type: 'shortLeave' } }"
        class="main-button"
      >
        <div class="flex gap-2">
          <span>🕒 Short Leave</span>
          <span
            v-if="grouped_counts.shortLeave"
            class="text-xs bg-yellow-500 text-white rounded-full px-2 py-0.5 font-semibold"
          >
            {{ grouped_counts.shortLeave }}
          </span>
        </div>
      </RouterLink>
      <RouterLink
        :to="{ name: 'NotificationList', query: { type: 'exchange' } }"
        class="main-button"
      >
        <div class="flex gap-2">
          <span>🔄 Exchange Request</span>
          <span
            v-if="grouped_counts.exchange"
            class="text-xs bg-purple-500 text-white rounded-full px-2 py-0.5 font-semibold"
          >
            {{ grouped_counts.exchange }}
          </span>
        </div>
      </RouterLink>
      <RouterLink :to="{ name: 'MyNoticeList' }" class="main-button">
        Manual Attendance Applications
      </RouterLink>
    </div>
  </div>
</template>
