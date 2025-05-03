<script setup>
import { useAuthStore } from '@/stores/auth'
import { useLeaveApplicationStore } from '@/stores/leave-application'
import { useNotificationStore } from '@/stores/notification'
import { storeToRefs } from 'pinia'
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ExchangeApplicationApprovalSection from './ExchangeApplicationApprovalSection.vue'
import LeaveApplicationApprovalSection from './LeaveApplicationApprovalSection.vue'
import ManualAttendanceApprovalSection from './ManualAttendanceApprovalSection.vue'
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
  if (!eventModel) return 'application not found'

  switch (eventType) {
    case 'leaveApplication':
      return `Last Office ( ${eventModel.last_working_date} ) → Join Date ( ${eventModel.resumption_date} )`

    case 'shortLeave':
      return `Short Leave on ${eventModel.date} form ${formatTime(eventModel.start_time) ?? 'N/A'} to ${
        eventModel.end_time ? formatTime(eventModel.end_time) : 'N/A'
      }`

    case 'shift':
      if (eventModel.exchange_type === 'shift') {
        return `Exchange (${eventModel.exchange_type}) on ${eventModel.current_date} (${eventModel?.shift_name ?? 'No Shift'})`
      }
      return `Exchange (${eventModel.exchange_type})`

    case 'exchange':
      return `Exchange (${eventModel.exchange_type}) on ${eventModel.current_date} (${eventModel?.shift_name ?? 'No Shift'})`

    case 'offday':
      if (eventModel.exchange_type === 'offday') {
        return `Exchange (Offday): ${eventModel.exchange_date} → ${eventModel.current_date}`
      }
      return `Exchange (${eventModel.exchange_type})`

    case 'manualAttendance':
      const formattedCheckIn = eventModel.check_in ? formatDateTime(eventModel.check_in) : 'N/A'
      const formattedCheckOut = eventModel.check_out ? formatDateTime(eventModel.check_out) : 'N/A'
      return `Checked in (${formattedCheckIn}) → Checked out (${formattedCheckOut})`

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
    case 'manualAttendance':
      return 'fas fa-clock'
    case 'exchange':
      return 'fas fa-random'
    case 'offday':
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

function formatDateTime(datetime) {
  const options = {
    year: 'numeric',
    month: 'short', // Mar
    day: '2-digit',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }
  return new Date(datetime).toLocaleString('en-US', options)
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
</script>

<template>
  <div class="space-y-6 px-4 py-4">
    <h2 class="text-2xl font-semibold capitalize text-gray-700">
      {{ route.query.type.replace(/([A-Z])/g, ' $1') }}
    </h2>

    <div
      v-if="
        Array.isArray(notifications[route.query.type]) && notifications[route.query.type].length
      "
      class="space-y-4"
    >
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
            <div class="flex items-center gap-8">
              <p class="text-gray-800 font-medium">{{ item.event_model?.user_name }}</p>
              <p v-if="item?.monthly_short_leave_count" class="flex gap-2 text-sm btn-4">
                <strong>Pending: {{ item?.monthly_short_leave_count.Pending || 0 }}</strong
                >/
                <strong>Approved: {{ item?.monthly_short_leave_count.Approved || 0 }}</strong>
              </p>
            </div>
            <p class="text-gray-800 font-medium" v-if="item.event_model?.reason">
              Reason: {{ item.event_model?.reason }}
            </p>
            <p class="text-red-600 text-sm font-semibold">
              {{ getEventTitle(item.event_model, item.event_type) }}
            </p>

            <p
              class="text-xs text-gray-400"
              v-if="item?.event_model?.total_leave_days_without_week"
            >
              Total Leave: {{ item?.event_model.total_leave_days_without_week }} days
            </p>
          </div>
          <div class="grid gap-1" v-if="item?.event_model">
            <div class="flex items-center gap-4">
              <a
                v-if="item?.event_model.attachment"
                :href="item?.event_model?.attachment"
                target="_blank"
                class="btn-1"
              >
                <i class="fad fa-link"></i>
              </a>
              <RouterLink
                v-if="route.query.type === 'leaveApplication'"
                :to="{
                  name: 'LeaveApplicationShow',
                  params: { id: item?.event_model?.id },
                  query: { notifyId: item?.id },
                }"
                class="btn-4"
              >
                <i class="far fa-eye"></i>
              </RouterLink>
              <RouterLink
                v-if="route.query.type === 'shortLeave'"
                :to="{
                  name: 'ShortLeaveShow',
                  params: { id: item?.event_model?.id },
                  query: { notifyId: item?.id },
                }"
                class="btn-4"
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
                  query: { notifyId: item?.id },
                }"
                class="btn-4"
              >
                <i class="far fa-eye"></i>
              </RouterLink>
              <RouterLink
                v-if="route.query.type === 'offday'"
                :to="{
                  name: 'ExchangeOffdayShow',
                  params: { id: item?.event_model?.id },
                  query: { notifyId: item?.id },
                }"
                class="btn-4"
              >
                <i class="far fa-eye"></i>
              </RouterLink>
              <RouterLink
                v-if="route.query.type === 'shift'"
                :to="{
                  name: 'ExchangeShiftShow',
                  params: { id: item?.event_model?.id },
                  query: { notifyId: item?.id },
                }"
                class="btn-4"
              >
                <i class="far fa-eye"></i>
              </RouterLink>
              <RouterLink
                v-if="route.query.type === 'manualAttendance'"
                :to="{
                  name: 'ManualAttendanceShow',
                  params: { id: item?.event_model?.id },
                  query: { notifyId: item?.id },
                }"
                class="btn-4"
              >
                <i class="far fa-eye"></i>
              </RouterLink>
            </div>
            <div class="grow-0 w-full">
              <p class="text-xs font-semibold" v-if="item?.event_model?.type">
                Type : {{ item?.event_model?.type }}
              </p>
              <p class="text-xs text-gray-400">{{ formatDate(item.created_at) }}</p>
            </div>
          </div>
        </div>

        <!-- Approve/Reject buttons -->
        <LeaveApplicationApprovalSection
          v-if="item?.event_model && item.event_type === 'leaveApplication'"
          :application="item.event_model"
          :notification-id="item.id"
        />

        <ManualAttendanceApprovalSection
          v-if="item?.event_model && item.event_type === 'manualAttendance'"
          :application="item.event_model"
          :notification-id="item.id"
        />

        <ShortLeaveApplicationApprovalSection
          v-if="item?.event_model && item.event_type === 'shortLeave'"
          :application="item.event_model"
          :notification-id="item.id"
        />
        <ExchangeApplicationApprovalSection
          v-if="
            item?.event_model &&
            (item.event_type === 'offday' ||
              item.event_type === 'shift' ||
              item.event_type === 'exchange')
          "
          :application="item.event_model"
          :notificationId="item.id"
        />
      </div>
    </div>
    <div v-else class="text-center text-red-500 py-10 text-xl italic">notifications not found.</div>
  </div>
</template>
