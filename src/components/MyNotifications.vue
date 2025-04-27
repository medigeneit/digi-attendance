<script setup>
import { useNotificationStore } from '@/stores/notification'
import { storeToRefs } from 'pinia'

const notificationStore = useNotificationStore()

const props = defineProps({
  notifications: {
    type: Array,
    required: true,
  },
  markNotification: {
    type: Function,
    required: true,
  },
})

const { grouped_counts, totalUnreadNotifications } = storeToRefs(notificationStore)

const emits = defineEmits(['close'])
</script>

<template>
  <div
    class="bg-white shadow-2xl rounded-lg absolute md:right-10 md:top-20 top-16 w-80 max-h-96 overflow-y-auto border border-gray-200"
  >
    <!-- Header -->
    <div
      class="flex justify-between items-center p-4 bg-gradient-to-r from-teal-100 to-teal-200 rounded-t-lg"
    >
      <RouterLink
        :to="{ name: 'MyNotificationList' }"
        @click="emits('close')"
        class="text-base font-bold text-gray-700"
      >
        🔔 Notifications
        <span class="ml-2 px-2 py-1 bg-red-500 text-white text-xs rounded-full">
          {{ totalUnreadNotifications }}
        </span>
      </RouterLink>
    </div>

    <!-- Notification List -->
    <div class="flex flex-col divide-y divide-gray-100">
      <RouterLink
        v-if="grouped_counts.leaveApplication"
        :to="{ name: 'NotificationList', query: { type: 'leaveApplication' } }"
        @click="emits('close')"
        class="px-4 py-3 hover:bg-gray-50 cursor-pointer flex justify-between"
      >
        <span class="text-sm text-gray-700">📄 Leave Applications</span>
        <span class="text-xs bg-teal-500 text-white rounded-full px-2 py-0.5 font-semibold">
          {{ grouped_counts.leaveApplication }}
        </span>
      </RouterLink>
      <RouterLink
        v-if="grouped_counts.shortLeave"
        :to="{ name: 'NotificationList', query: { type: 'shortLeave' } }"
        @click="emits('close')"
        class="px-4 py-3 hover:bg-gray-50 cursor-pointer flex justify-between"
      >
        <span class="text-sm text-gray-700">🕒 Short Leave</span>
        <span class="text-xs bg-yellow-500 text-white rounded-full px-2 py-0.5 font-semibold">
          {{ grouped_counts.shortLeave }}
        </span>
      </RouterLink>

      <RouterLink
        v-if="grouped_counts.exchange"
        :to="{ name: 'NotificationList', query: { type: 'exchange' } }"
        @click="emits('close')"
        class="px-4 py-3 hover:bg-gray-50 cursor-pointer flex justify-between"
      >
        <span class="text-sm text-gray-700">🔄 Exchange Request</span>
        <span class="text-xs bg-purple-500 text-white rounded-full px-2 py-0.5 font-semibold">
          {{ grouped_counts.exchange }}
        </span>
      </RouterLink>
      <RouterLink
        v-if="grouped_counts.shift"
        :to="{ name: 'NotificationList', query: { type: 'shift' } }"
        @click="emits('close')"
        class="px-4 py-3 hover:bg-gray-50 cursor-pointer flex justify-between"
      >
        <span class="text-sm text-gray-700">🔄 Shift Exchange Request</span>
        <span class="text-xs bg-purple-500 text-white rounded-full px-2 py-0.5 font-semibold">
          {{ grouped_counts?.shift }}
        </span>
      </RouterLink>

      <RouterLink
        v-if="grouped_counts.offday"
        :to="{ name: 'NotificationList', query: { type: 'offday' } }"
        @click="emits('close')"
        class="px-4 py-3 hover:bg-gray-50 cursor-pointer flex justify-between"
      >
        <span class="text-sm text-gray-700">🔄 Offday Exchange Request</span>
        <span class="text-xs bg-purple-500 text-white rounded-full px-2 py-0.5 font-semibold">
          {{ grouped_counts.offday }}
        </span>
      </RouterLink>
      <RouterLink
        v-if="grouped_counts.manualAttendance"
        :to="{ name: 'NotificationList', query: { type: 'manualAttendance' } }"
        @click="emits('close')"
        class="px-4 py-3 hover:bg-gray-50 cursor-pointer flex justify-between"
      >
        <span class="text-sm text-gray-700"
          ><i class="fal fa-clipboard-user text-lg"></i> Manual Attendance Request</span
        >
        <span class="text-xs bg-sky-500 text-white rounded-full px-2 py-0.5 font-semibold">
          {{ grouped_counts.manualAttendance }}
        </span>
      </RouterLink>
      <div
        v-if="!Object.keys(grouped_counts).length"
        class="px-4 py-3 text-center text-sm text-gray-400"
      >
        No new notifications.
      </div>
    </div>
  </div>
</template>
