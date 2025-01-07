<script setup>
import { defineProps, defineEmits } from 'vue'

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

const emits = defineEmits(['close'])
</script>

<template>
  <div class="bg-teal-50 shadow-xl rounded-lg absolute md:right-10 md:top-20 top-16 w-80">
    <ul class="divide-y divide-gray-200">
      <!-- Notification Items -->
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
            '/leave-application-show/' + notification.data.leave_application_id,
          )
        "
        class="cursor-pointer"
      >
        <h4 class="font-bold">Notification</h4>
        <p>{{ notification.data.message }}</p>
        <span class="text-sm text-gray-500">{{
          new Date(notification.created_at).toLocaleString('en-US')
        }}</span>

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
