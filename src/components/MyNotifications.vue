<script setup>
import { useNotificationStore } from '@/stores/notification'
import { storeToRefs } from 'pinia'

const notificationStore = useNotificationStore()

const { icons, count_notifications, total_notifications } = storeToRefs(notificationStore)

const emits = defineEmits(['close'])
</script>

<template>
  <div
    class="bg-white shadow-2xl rounded-lg absolute right-4 md:left-0 top-[100%] mt-1.5 w-60 max-h-96 overflow-y-auto border border-gray-200"
  >
    <!-- Header -->
    <div
      class="flex justify-between items-center p-4 bg-gradient-to-r from-teal-100 to-teal-200 rounded-t-lg"
    >
      <RouterLink
        :to="{ name: 'MyNotificationList' }"
        @click="emits('close')"
        class="w-full flex text-base font-bold text-gray-700"
      >
        🔔 Notifications 
        <span class="ml-auto px-2 py-1 bg-red-500 text-white text-xs rounded-full">
          {{ total_notifications }}
        </span>
      </RouterLink>
    </div>

    <!-- Notification List -->
    <div class="flex flex-col divide-y divide-gray-100">
      <RouterLink
        v-if="count_notifications?.leave_applications"
        :to="{ name: 'MySpecificNotificationList', params: { type: 'leave_applications' } }"
        @click="emits('close')"
        class="px-4 py-3 hover:bg-gray-50 cursor-pointer flex justify-between"
      >
        <span class="text-sm text-gray-700">{{ icons.leave_applications }} Leave Applications</span>
        <span class="text-xs bg-teal-500 text-white rounded-full px-2 py-0.5 font-semibold">
          {{ count_notifications.leave_applications }}
        </span>
      </RouterLink>

      <RouterLink
        v-if="count_notifications?.short_leave_applications"
        :to="{ name: 'MySpecificNotificationList', params: { type: 'short_leave_applications' } }"
        @click="emits('close')"
        class="px-4 py-3 hover:bg-gray-50 cursor-pointer flex justify-between"
      >
        <span class="text-sm text-gray-700">{{ icons.short_leave_applications }} Short Leave</span>
        <span class="text-xs bg-yellow-500 text-white rounded-full px-2 py-0.5 font-semibold">
          {{ count_notifications.short_leave_applications }}
        </span>
      </RouterLink>

      <RouterLink
        v-if="count_notifications?.shift_exchange_applications"
        :to="{
          name: 'MySpecificNotificationList',
          params: { type: 'shift_exchange_applications' },
        }"
        @click="emits('close')"
        class="px-4 py-3 hover:bg-gray-50 cursor-pointer flex justify-between"
      >
        <span class="text-sm text-gray-700">
          {{ icons.shift_exchange_applications }} Shift Exchange
        </span>
        <span class="text-xs bg-purple-500 text-white rounded-full px-2 py-0.5 font-semibold">
          {{ count_notifications.shift_exchange_applications }}
        </span>
      </RouterLink>

      <RouterLink
        v-if="count_notifications?.offday_exchange_applications"
        :to="{
          name: 'MySpecificNotificationList',
          params: { type: 'offday_exchange_applications' },
        }"
        @click="emits('close')"
        class="px-4 py-3 hover:bg-gray-50 cursor-pointer flex justify-between"
      >
        <span class="text-sm text-gray-700">
          {{ icons.offday_exchange_applications }} Offday Exchange
        </span>
        <span class="text-xs bg-purple-500 text-white rounded-full px-2 py-0.5 font-semibold">
          {{ count_notifications.offday_exchange_applications }}
        </span>
      </RouterLink>

      <RouterLink
        v-if="count_notifications?.manual_attendance_applications"
        :to="{
          name: 'MySpecificNotificationList',
          params: { type: 'manual_attendance_applications' },
        }"
        @click="emits('close')"
        class="px-4 py-3 hover:bg-gray-50 cursor-pointer flex justify-between"
      >
        <span class="text-sm text-gray-700">
          {{ icons.manual_attendance_applications }} Manual Attendance
        </span>
        <span class="text-xs bg-sky-500 text-white rounded-full px-2 py-0.5 font-semibold">
          {{ count_notifications.manual_attendance_applications }}
        </span>
      </RouterLink>

      <RouterLink
        v-if="count_notifications?.overtime_applications"
        :to="{ name: 'MySpecificNotificationList', params: { type: 'overtime_applications' } }"
        @click="emits('close')"
        class="px-4 py-3 hover:bg-gray-50 cursor-pointer flex justify-between"
      >
        <span class="text-sm text-gray-700"> {{ icons.overtime_applications }} Overtime </span>
        <span class="text-xs bg-sky-500 text-white rounded-full px-2 py-0.5 font-semibold">
          {{ count_notifications.overtime_applications }}
        </span>
      </RouterLink>
      <RouterLink
        v-if="count_notifications?.discipline_attachments"
        :to="{ name: 'MySpecificNotificationList', params: { type: 'discipline_attachments' } }"
        @click="emits('close')"
        class="px-4 py-3 hover:bg-gray-50 cursor-pointer flex justify-between"
      >
        <span class="text-sm text-gray-700"> {{ icons.discipline_attachments }} Discipline Attachments </span>
        <span class="text-xs bg-sky-500 text-white rounded-full px-2 py-0.5 font-semibold">
          {{ count_notifications.discipline_attachments }}
        </span>
      </RouterLink>

      <div v-if="total_notifications === 0" class="px-4 py-3 text-center text-sm text-gray-400">
        No new notifications.
      </div>
    </div>
  </div>
</template>
