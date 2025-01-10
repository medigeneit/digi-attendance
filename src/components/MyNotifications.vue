<script setup>
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

const getTargetUrl = (eventType) => {
  const eventTypes = {
    leaveApplication: '/leave-application-show/',
    shortLeave: '/short-leave-show/',
  }

  return eventTypes[eventType]
}

const emits = defineEmits(['close'])
</script>

<template>
  <div class="bg-teal-50 shadow-xl rounded-lg absolute md:right-10 md:top-20 top-16 w-80">
    <ul class="divide-y divide-gray-200">
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
        class="cursor-pointer"
      >
        <h4 class="font-bold">Notification</h4>
        <p>{{ notification.data.message }}</p>
        <span class="text-sm text-gray-500">{{
          new Date(notification.created_at).toLocaleString('en-US')
        }}</span>
      </li>

      <li v-if="notifications.length === 0" class="p-4 text-center">
        <p class="text-gray-500">No notifications found.</p>
      </li>
    </ul>
  </div>
</template>
