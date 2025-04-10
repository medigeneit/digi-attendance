<script setup>
import { useAuthStore } from '@/stores/auth'
import { useLeaveApplicationStore } from '@/stores/leave-application'
import { useNotificationStore } from '@/stores/notification'
import { storeToRefs } from 'pinia'
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ExchangeApplicationApprovalSection from './ExchangeApplicationApprovalSection.vue'
import LeaveApplicationApprovalSection from './LeaveApplicationApprovalSection.vue'
import ShortLeaveApplicationApprovalSection from './ShortLeaveApplicationApprovalSection.vue'

const router = useRouter()
const route = useRoute()
const notificationStore = useNotificationStore()
const { notifications } = storeToRefs(notificationStore)
const leaveApplicationStore = useLeaveApplicationStore()
const authStore = useAuthStore()
const { user } = storeToRefs(authStore)
const loading = ref(false)
const showRejectNote = ref({})
const rejectNotes = ref({})
onMounted(() => {
  notificationStore.fetchNotifications()
})

const goBack = () => {
  router.go(-1)
}

const toggleRejectNote = (id) => {
  if (showRejectNote.value[id] && rejectNotes.value[id]) {
    reject(itemById(id), rejectNotes.value[id])
    showRejectNote.value[id] = false
  } else {
    showRejectNote.value[id] = !showRejectNote.value[id]
  }
}

const itemById = (id) => {
  return notifications[route.query.type]?.find((n) => n.id === id)
}

const markNotification = async (notificationId, url) => {
  await notificationStore.markAsRead(notificationId)
  if (url) {
    window.location.href = url
  }
}

const getEventTitle = (eventModel, eventType) => {
  if (!eventModel) return 'No application details'
  switch (eventType) {
    case 'leaveApplication':
      return `Leave: ${eventModel.last_working_date} → ${eventModel.resumption_date}`
    case 'shortLeave':
      return `Short Leave on ${formatTime(eventModel.start_time) ?? 'N/A'}`
    case 'exchange':
      return `Exchange (${eventModel.exchange_type}) on ${eventModel.exchange_date}`
    default:
      return 'Unknown Event'
  }
}

const getEventIcon = (eventType) => {
  switch (eventType) {
    case 'leaveApplication':
      return 'fas fa-calendar-alt'
    case 'shortLeave':
      return 'fas fa-clock'
    case 'exchange':
      return 'fas fa-random'
    default:
      return 'fas fa-bell'
  }
}

const formatDate = (date) => {
  return new Date(date).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const formatTime = (timeString) => {
  const [hour, minute] = timeString.split(':').map(Number) // Extract hour & minute
  const date = new Date()
  date.setHours(hour, minute)

  return date.toLocaleString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true, // Ensures AM/PM format
  })
}

const getTargetUrl = (eventType, id) => {
  const eventTypes = {
    leaveApplication: '/leave-application-show/',
    shortLeave: '/short-leave-show/',
    offday: '/exchange-offday-show/',
    shift: '/exchange-shift-show/',
    manualAttendance: '/manual-attendance-show/',
  }
  return eventTypes[eventType] ? `${eventTypes[eventType]}${id}` : '#'
}

const handleNotificationClick = (notification) => {
  const eventType = notification?.data?.event_type
  const targetId = notification?.data?.event_id
  const url = getTargetUrl(eventType, targetId)
  // markNotification(notification.id, url)
}
</script>

<template>
  <div class="space-y-6 px-4 py-4">
    <h2 class="text-2xl font-semibold capitalize text-gray-700">
      {{ route.query.type.replace(/([A-Z])/g, ' $1') }}
    </h2>

    <div v-if="notifications[route.query.type]" class="space-y-4">
      <div
        v-for="(item, index) in notifications[route.query.type]"
        :key="item.id"
        class="bg-white p-4 rounded-xl shadow border"
      >
        <div class="flex items-start gap-4">
          <div class="text-2xl text-blue-500">
            <i :class="getEventIcon(item.event_type)"></i>
          </div>
          <div class="flex-1">
            <p class="text-gray-800 font-medium">{{ item.message }}</p>
            <p class="text-gray-800 font-medium">{{ item.event_model?.user_name }}</p>
            <p class="text-gray-800 font-medium">Reason: {{ item.event_model?.reason }}</p>
            <p class="text-gray-600 text-sm">
              {{ getEventTitle(item.event_model, item.event_type) }}
            </p>
            <p class="text-xs text-gray-400" v-if="item?.event_model?.total_leave">
              Total Leave: {{ item?.event_model.total_leave }} days
            </p>
            <p class="text-xs" v-if="item?.event_model?.type">
              Type : {{ item?.event_model?.type }}
            </p>
            <p class="text-xs text-gray-400">{{ formatDate(item.created_at) }}</p>
          </div>
          <div class="flex items-center justify-between" v-if="item?.event_model">
            <RouterLink
              v-if="route.query.type === 'leaveApplication'"
              :to="{ name: 'LeaveApplicationShow', params: { id: item?.event_model?.id } }"
              class="btn-icon"
            >
              <i class="far fa-eye"></i>
            </RouterLink>
            <RouterLink
              v-if="route.query.type === 'shortLeave'"
              :to="{ name: 'ShortLeaveShow', params: { id: item?.event_model?.id } }"
              class="btn-icon"
            >
              <i class="far fa-eye"></i>
            </RouterLink>
            <RouterLink
              v-if="route.query.type === 'exchange'"
              :to="{
                name:
                  item?.event_model?.exchange_type == 'offday'
                    ? 'ExchangeOffdayShow'
                    : 'ExchangeShiftShow',
                params: { id: item?.event_model?.id },
              }"
              class="btn-icon"
            >
              <i class="far fa-eye"></i>
            </RouterLink>
          </div>
        </div>

        <!-- Approve/Reject buttons -->
        <LeaveApplicationApprovalSection
          v-if="item?.event_model && item.event_type === 'leaveApplication'"
          :application="item.event_model"
          :notification-id="item.id"
        />

        <ShortLeaveApplicationApprovalSection
          v-if="item?.event_model && item.event_type === 'shortLeave'"
          :application="item.event_model"
          :notification-id="item.id"
        />
        <ExchangeApplicationApprovalSection
          v-if="item?.event_model && item.event_type === 'exchange'"
          :application="item.event_model"
          :notificationId="item.id"
        />
      </div>
    </div>

    <div v-else class="text-center text-red-500 py-10">No notifications found.</div>
  </div>
</template>
