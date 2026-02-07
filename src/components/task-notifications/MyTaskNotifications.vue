<script setup>
import { useTaskNotificationStore } from '@/stores/task-notification'
import { storeToRefs } from 'pinia'

const taskNotificationStore = useTaskNotificationStore()

const props = defineProps({
  markNotification: {
    type: Function,
    required: false,
  },
})

const { total_task_notifications, notification_count } = storeToRefs(taskNotificationStore)

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
      <div
        class="w-full flex text-base font-bold text-gray-700"
      >
        🔔 Task Notifications 
        <span class="ml-auto px-2 py-1 bg-red-500 text-white text-xs rounded-full">
          {{ total_task_notifications }}
        </span>
      </div>
    </div>

    <!-- Notification List -->
    <div class="flex flex-col divide-y divide-gray-100">
      <RouterLink
        v-if="notification_count?.['pending-requirements']"
        :to="{ name: 'MyTaskNotificationList', params: { type: 'pending-requirements' } }"
        @click="emits('close')"
        class="px-4 py-3 hover:bg-gray-50 cursor-pointer flex justify-between"
      >
        <span class="text-sm text-gray-700">Pending Requirements</span>
        <span class="text-xs bg-teal-500 text-white rounded-full px-2 py-0.5 font-semibold">
          {{ notification_count?.['pending-requirements'] }}
        </span>
      </RouterLink>

      <div
        v-if="total_task_notifications === 0"
        class="px-4 py-3 text-center text-sm text-gray-400"
      >
        No new notifications.
      </div>
    </div>
  </div>
</template>
