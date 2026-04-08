<script setup>
import { onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useNotificationStore } from '@/stores/notification'

const notificationStore = useNotificationStore()
const {
  applicationFeedbackNotifications,
  applicationFeedbackLoading,
  applicationFeedbackError,
} = storeToRefs(notificationStore)

onMounted(() => {
  notificationStore.fetchApplicationFeedbackNotifications()
})

const formatDate = (value) => {
  if (!value) return 'N/A'

  return new Date(value).toLocaleString('en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
}

const formatDateLabel = (value) => {
  if (!value) return '—'

  return new Date(value).toLocaleDateString('en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

const markNotificationAsRead = async (notificationId) => {
  await notificationStore.markFeedbackNotificationAsRead(notificationId)
}

const formatAppType = (value) => {
  if (!value) return 'Application Feedback'

  const parts = value.split('\\')
  return parts[parts.length - 1] || value
}
</script>

<template>
  <section class="my-container space-y-6 px-4 py-6">
    <div>
      <p class="text-xs uppercase tracking-[0.3em] text-slate-500 font-semibold">Notifications</p>
      <h1 class="text-2xl md:text-3xl font-serif font-semibold text-slate-900">Application Feedback</h1>
      <p class="text-sm md:text-base text-slate-600">
        Actionable notes from approvers and reviewers. Read them here before moving on.
      </p>
    </div>

    <div v-if="applicationFeedbackLoading" class="rounded-2xl border border-slate-200 bg-white/80 p-6 text-center text-slate-600">
      Loading feedback…
    </div>

    <div v-else-if="applicationFeedbackError" class="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-700">
      {{ applicationFeedbackError }}
    </div>

    <div v-else-if="!applicationFeedbackNotifications.length" class="rounded-2xl border border-slate-200 bg-white/90 p-6 text-center text-slate-500">
      No application feedback notifications yet.
    </div>

    <div v-else class="space-y-4">
      <article
        v-for="notification in applicationFeedbackNotifications"
        :key="notification.id"
        class="space-y-3 rounded-2xl border p-4 shadow-sm transition"
        :class="notification.read_at ? 'bg-white border-slate-200' : 'bg-rose-50 border-rose-200 ring-1 ring-rose-200'"
      >
        <div class="flex gap-3">
          <div class="flex-1 space-y-2">
            <p class="text-xs uppercase tracking-[0.3em] text-slate-500 font-semibold">
              {{ formatAppType(notification.application_type) }}
            </p>
            <p class="text-base md:text-lg font-semibold text-slate-900 leading-relaxed" v-html="notification.message"></p>
            <p v-if="notification.application?.user_name" class="text-sm text-slate-600">
              <span class="font-semibold text-slate-700">Applicant:</span>
              {{ notification.application.user_name }}
            </p>
            <p v-if="notification.author_name || notification.role_key" class="text-sm text-slate-600 space-y-0.5 gap-2 flex flex-wrap">
              <span v-if="notification.author_name">
                <span class="font-semibold text-slate-700">Author:</span>
                {{ notification.author_name }}
              </span>
              <span v-if="notification.role_key">
                <span class="font-semibold text-slate-700">Role:</span>
                {{ notification.role_key }}
              </span>
            </p>
          </div>
          <span
            class="text-[11px] font-semibold uppercase tracking-wide"
            :class="notification.read_at ? 'text-slate-500' : 'text-rose-600'"
          >
            {{ notification.read_at ? 'Read' : 'Unread' }}
          </span>
        </div>
        <div
          v-if="
            notification.application &&
            notification.application_type === 'App\\Models\\LeaveApplication'
          "
          class="space-y-1 text-sm text-slate-500"
        >
          <div class="flex flex-wrap gap-4 text-sm">
            <span>
              <span class="font-semibold text-slate-700">Type:</span>
              {{ notification.application.leave_type_name || 'Leave' }}
            </span>
            <span>
              <span class="font-semibold text-slate-700">Duration:</span>
              {{ notification.application.duration_label || 'N/A' }}
            </span>
          </div>
        </div>
        <div class="flex flex-wrap items-center gap-6 text-xs text-slate-500">
          <div>Created: {{ formatDate(notification.created_at) }}</div>
          <div v-if="notification.read_at">Read at: {{ formatDate(notification.read_at) }}</div>
          <button
            v-if="!notification.read_at"
            class="btn-1 rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-700 transition hover:bg-slate-100"
            @click="markNotificationAsRead(notification.id)"
          >
            Mark as read
          </button>
        </div>
      </article>
    </div>
  </section>
</template>
