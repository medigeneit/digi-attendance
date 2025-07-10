<script setup>
import AcceptAndRejectHandler from '@/components/applications/AcceptAndRejectHandler.vue'
import LoaderView from '@/components/common/LoaderView.vue'
import { useNotificationStore } from '@/stores/notification'
import { storeToRefs } from 'pinia'
import { computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()

const notificationStore = useNotificationStore()
const { icons, loading, notifications, count_notifications } = storeToRefs(notificationStore)

onMounted(() => {
  if (route.params.type) {
    notificationStore.fetchCountNotifications()
    notificationStore.fetchSpecificNotifications(route.params.type)
  }
})

watch(
  () => route.params.type,
  (newType, oldType) => {
    if (newType && newType !== oldType) {
      notificationStore.fetchCountNotifications()
      notificationStore.fetchSpecificNotifications(newType)
    }
  },
)

const onSuccess = async () => {
  await notificationStore.fetchSpecificNotifications(route.params.type)
}

const specifications = {
  leave_applications: 'LeaveApplicationShow',
  short_leave_applications: 'ShortLeaveShow',
  shift_exchange_applications: 'ExchangeShiftShow',
  offday_exchange_applications: 'ExchangeOffdayShow',
  manual_attendance_applications: 'ManualAttendanceShow',
}

const formattedType = computed(() => {
  if (!route.params.type) return ''
  return route.params.type
    .replace(/[_-]/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
})
</script>

<template>
  <div class="my-container space-y-6 px-4 py-4">
    <h2 class="md:text-2xl font-semibold capitalize text-gray-700">
      {{ formattedType || 'Notifications' }}
      <span
        v-if="count_notifications[route.params.type]"
        class="ml-auto text-xs bg-red-500 text-white rounded-full px-2 py-0.5 font-semibold"
      >
        {{ count_notifications[route.params.type] }}
      </span>
    </h2>
    <div v-if="loading" class="text-center text-red-500 py-10 text-xl italic">
      <LoaderView />
    </div>
    <div v-else-if="notifications.length" class="space-y-4">
      <div
        v-for="notification in notifications"
        :key="notification.application_id"
        class="bg-white p-3 md:p-4 rounded-xl shadow border grid gap-2"
      >
        <div class="flex gap-2 md:gap-3 items-center">
          <div class="shrink-0 grow-0 btn-1 size-8 p-0">{{ icons[route.params.type] }}</div>
          <div class="shrink grow font-semibold text-sm md:text-base">
            {{ notification.user_name }}
          </div>
          <div class="ml-auto shrink-0 grow-0 flex gap-2 md:gap-3 items-center">
            <a
              v-if="notification?.attachment"
              :href="notification.attachment"
              target="_blank"
              class="btn-4 px-2"
            >
              <i class="fad fa-link"></i>
            </a>
            <RouterLink
              :to="{
                name: specifications[route.params.type],
                params: { id: notification.application_id },
              }"
              class="btn-1 px-3"
            >
              <i class="far fa-eye"></i>
            </RouterLink>
          </div>
        </div>
        <div
          class="flex items-center text-red-600 text-xs md:text-sm lg:text-base"
          v-html="notification.message"
        ></div>
        <div
          v-if="notification.type || notification.duration"
          class="flex flex-wrap gap-y-1 gap-x-3 items-center text-xs md:text-sm lg:text-base"
        >
          <div v-if="notification.type">
            <span class="text-gray-400">Type:</span>
            {{ notification.type }}
          </div>
          <div v-if="notification.duration">
            <span class="text-gray-400">Duration:</span>
            {{ notification.duration }}
          </div>
        </div>
        <div
          v-if="notification.reason"
          class="flex flex-wrap gap-y-1 gap-x-3 items-center text-xs md:text-sm lg:text-base"
        >
          <div>
            <span class="text-gray-400">Reason:</span>
            {{ notification.reason }}
          </div>
        </div>
        <div
          v-if="notification.last_approver_note"
          class="flex flex-wrap gap-y-1 gap-x-3 items-center text-xs md:text-sm lg:text-base"
        >
          <div>
            <span class="text-gray-400">Last Approver Note:</span>
            {{ notification.last_approver_note }}
          </div>
        </div>
        <div class="flex gap-3 items-center">
          <div class="flex items-center gap-8">
            <p
              v-if="notification.messages?.length"
              class="flex flex-wrap flex-col md:flex-row gap-x-1 text-xs md:text-sm text-left"
            >
              <template v-for="(message, index) in notification.messages" :key="index">
                <span v-if="index" class="hidden md:inline font-bold">|</span>
                <span v-html="message" class="text-black font-semibold"></span>
              </template>
            </p>
          </div>
          <AcceptAndRejectHandler
            class="ml-auto"
            :notificationType="route.params.type"
            :applicationId="notification.application_id"
            :onSuccess="onSuccess"
            :variant="2"
          />
        </div>
      </div>
    </div>
  </div>
</template>
