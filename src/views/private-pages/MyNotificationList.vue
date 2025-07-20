<script setup>
import { useNotificationStore } from '@/stores/notification'
import { storeToRefs } from 'pinia'
import { computed, onMounted } from 'vue'

const notificationStore = useNotificationStore()

const { icons, total_notifications, count_notifications } = storeToRefs(notificationStore)

onMounted(() => {
  notificationStore.fetchCountNotifications()
})

const loading = computed(() => notificationStore.loading)
const error = computed(() => notificationStore.error)
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
        :to="{ name: 'MySpecificNotificationList', params: { type: 'leave_applications' } }"
        class="main-button"
      >
        <div class="w-full flex items-center gap-2">
          <span>{{ icons.leave_applications }}</span>
          <span class="mr-auto">Leave Applications</span>
          <span
            v-if="count_notifications?.leave_applications"
            class="ml-auto text-xs bg-teal-500 text-white rounded-full px-2 py-0.5 font-semibold"
          >
            {{ count_notifications?.leave_applications }}
          </span>
        </div>
      </RouterLink>
      <RouterLink
        :to="{ name: 'MySpecificNotificationList', params: { type: 'short_leave_applications' } }"
        class="main-button"
      >
        <div class="w-full flex items-center gap-2">
          <span>{{ icons.short_leave_applications }}</span>
          <span class="mr-auto">Short Leave</span>
          <span
            v-if="count_notifications?.short_leave_applications"
            class="ml-auto text-xs bg-yellow-500 text-white rounded-full px-2 py-0.5 font-semibold"
          >
            {{ count_notifications?.short_leave_applications }}
          </span>
        </div>
      </RouterLink>
      <RouterLink :to="{ name: 'MySpecificNotificationList', params: { type: 'shift_exchange_applications' } }" class="main-button">
        <div class="w-full flex items-center gap-2">
          <span>{{ icons.shift_exchange_applications }}</span>
          <span class="mr-auto">Shift Exchange</span>
          <span
            v-if="count_notifications?.shift_exchange_applications"
            class="ml-auto text-xs bg-purple-500 text-white rounded-full px-2 py-0.5 font-semibold"
          >
            {{ count_notifications?.shift_exchange_applications }}
          </span>
        </div>
      </RouterLink>
      <RouterLink :to="{ name: 'MySpecificNotificationList', params: { type: 'offday_exchange_applications' } }" class="main-button">
        <div class="w-full flex items-center gap-2">
          <span>{{ icons.offday_exchange_applications }}</span>
          <span class="mr-auto">Offday Exchange</span>
          <span
            v-if="count_notifications?.offday_exchange_applications"
            class="ml-auto text-xs bg-purple-700 text-white rounded-full px-2 py-0.5 font-semibold"
          >
            {{ count_notifications?.offday_exchange_applications }}
          </span>
        </div>
      </RouterLink>
      <RouterLink
        :to="{ name: 'MySpecificNotificationList', params: { type: 'manual_attendance_applications' } }"
        class="main-button"
      >
        <div class="w-full flex items-center gap-2">
          <span>{{ icons.manual_attendance_applications }}</span>
          <span class="mr-auto">Manual Attendance</span>
          <span
            v-if="count_notifications?.manual_attendance_applications"
            class="ml-auto text-xs bg-sky-500 text-white rounded-full px-2 py-0.5 font-semibold"
          >
            {{ count_notifications?.manual_attendance_applications }}
          </span>
        </div>
      </RouterLink>
      <RouterLink
        :to="{ name: 'MySpecificNotificationList', params: { type: 'overtime_applications' } }"
        class="main-button"
      >
        <div class="w-full flex items-center gap-2">
          <span>{{ icons.overtime_applications }}</span>
          <span class="mr-auto">Overtime</span>
          <span
            v-if="count_notifications?.overtime_applications"
            class="ml-auto text-xs bg-sky-500 text-white rounded-full px-2 py-0.5 font-semibold"
          >
            {{ count_notifications?.overtime_applications }}
          </span>
        </div>
      </RouterLink>
    </div>
  </div>
</template>
