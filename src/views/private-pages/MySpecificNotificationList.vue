<script setup>
import { useNotificationStore } from '@/stores/notification'
import { storeToRefs } from 'pinia'
import { onMounted } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const { type } = route.params

const notificationStore = useNotificationStore()
const { loading, notifications } = storeToRefs(notificationStore)

onMounted(() => {
  if (type) {
    notificationStore.fetchSpecificNotifications(type)
  }
})

const specifications = {
  leave_applications: 'LeaveApplicationShow',
  short_leave_applications: 'ShortLeaveShow',
  shift_exchange_applications: 'ExchangeShiftShow',
  offday_exchange_applications: 'ExchangeOffdayShow',
  manual_attendance_applications: 'ManualAttendanceShow',
}
</script>

<template>
  <div class="space-y-6 px-4 py-4">
    <h2 class="text-2xl font-semibold capitalize text-gray-700">
      {{ type.replace(/([A-Z])/g, ' $1') || 'Notifications' }}
    </h2>
    <div v-if="loading" class="text-center text-red-500 py-10 text-xl italic">Data fetching....</div>
    <div v-else-if="notifications.length" class="space-y-4">
      <div
        v-for="notification in notifications"
        :key="notification.application_id"
        class="bg-white p-4 rounded-xl shadow border flex flex-wrap items-center"
      >
        <span>#{{ notification.application_id }}</span>
        <RouterLink
          :to="{
            name: specifications[type],
            params: { id: notification.application_id },
          }"
          class="btn-4 ml-auto"
        >
          <i class="far fa-eye"></i>
        </RouterLink>
      </div>
    </div>
    <div v-else class="text-center text-red-500 py-10 text-xl italic">notifications not found.</div>
  </div>
</template>
