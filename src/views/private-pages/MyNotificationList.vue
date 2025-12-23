<script setup>
import { useNotificationStore } from '@/stores/notification'
import { storeToRefs } from 'pinia'
import { computed, onMounted } from 'vue'

const notificationStore = useNotificationStore()

const { icons, total_notifications, count_notifications } = storeToRefs(notificationStore)

onMounted(() => {
  notificationStore.fetchCountNotifications()
})

const loading = computed(() => notificationStore.loading)
const error = computed(() => notificationStore.error)
const totalUnread = computed(
  () =>
    (count_notifications.value?.leave_applications || 0) +
    (count_notifications.value?.short_leave_applications || 0) +
    (count_notifications.value?.shift_exchange_applications || 0) +
    (count_notifications.value?.offday_exchange_applications || 0) +
    (count_notifications.value?.manual_attendance_applications || 0) +
    (count_notifications.value?.overtime_applications || 0)
)

const notificationCards = computed(() => [
  {
    type: 'leave_applications',
    label: 'Leave Applications',
    accent: 'bg-emerald-100 text-emerald-700',
    badge: 'bg-emerald-600',
    count: count_notifications.value?.leave_applications || 0,
    icon: icons.value?.leave_applications,
  },
  {
    type: 'short_leave_applications',
    label: 'Short Leave',
    accent: 'bg-amber-100 text-amber-700',
    badge: 'bg-amber-600',
    count: count_notifications.value?.short_leave_applications || 0,
    icon: icons.value?.short_leave_applications,
  },
  {
    type: 'shift_exchange_applications',
    label: 'Shift Exchange',
    accent: 'bg-sky-100 text-sky-700',
    badge: 'bg-sky-600',
    count: count_notifications.value?.shift_exchange_applications || 0,
    icon: icons.value?.shift_exchange_applications,
  },
  {
    type: 'offday_exchange_applications',
    label: 'Offday Exchange',
    accent: 'bg-indigo-100 text-indigo-700',
    badge: 'bg-indigo-600',
    count: count_notifications.value?.offday_exchange_applications || 0,
    icon: icons.value?.offday_exchange_applications,
  },
  {
    type: 'manual_attendance_applications',
    label: 'Manual Attendance',
    accent: 'bg-rose-100 text-rose-700',
    badge: 'bg-rose-600',
    count: count_notifications.value?.manual_attendance_applications || 0,
    icon: icons.value?.manual_attendance_applications,
  },
  {
    type: 'overtime_applications',
    label: 'Overtime',
    accent: 'bg-slate-100 text-slate-700',
    badge: 'bg-slate-700',
    count: count_notifications.value?.overtime_applications || 0,
    icon: icons.value?.overtime_applications,
  },
])
</script>

<template>
  <section class="relative overflow-hidden px-4 py-6 md:px-6">
    <div class="relative mx-auto max-w-5xl">
      <div class="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p class="text-xs uppercase tracking-[0.3em] text-slate-500 font-semibold">
            Notifications
          </p>
          <h1 class="text-2xl md:text-3xl font-serif font-semibold text-slate-900">
            Track approvals and requests
          </h1>
          <p class="text-sm md:text-base text-slate-600">
            See pending requests by category and jump directly to review them.
          </p>
        </div>

        <div class="flex items-center gap-3">
          <div class="rounded-xl bg-white/80 px-4 py-2 shadow ring-1 ring-slate-200">
            <p class="text-xs uppercase text-slate-500">Total</p>
            <p class="text-lg font-semibold text-slate-900">{{ total_notifications }}</p>
          </div>
          <div class="rounded-xl bg-slate-900 px-4 py-2 shadow">
            <p class="text-xs uppercase text-slate-300">Unread</p>
            <p class="text-lg font-semibold text-white">{{ totalUnread }}</p>
          </div>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="grid gap-3 md:grid-cols-3">
        <div class="h-24 rounded-2xl bg-slate-100 animate-pulse"></div>
        <div class="h-24 rounded-2xl bg-slate-100 animate-pulse"></div>
        <div class="h-24 rounded-2xl bg-slate-100 animate-pulse"></div>
        <div class="h-24 rounded-2xl bg-slate-100 animate-pulse"></div>
        <div class="h-24 rounded-2xl bg-slate-100 animate-pulse"></div>
        <div class="h-24 rounded-2xl bg-slate-100 animate-pulse"></div>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="rounded-2xl bg-rose-50 p-4 text-rose-700 ring-1 ring-rose-200">
        {{ error }}
      </div>

      <!-- Notifications List -->
      <div v-else class="grid gap-3 md:grid-cols-3">
        <RouterLink
          v-for="card in notificationCards"
          :key="card.type"
          :to="{ name: 'MySpecificNotificationList', params: { type: card.type } }"
          class="group relative overflow-hidden rounded-2xl bg-white/80 p-4 shadow-lg ring-1 ring-slate-200 transition duration-300 hover:-translate-y-1 hover:shadow-xl"
        >
          <div class="flex items-start justify-between gap-3">
            <div class="flex items-center gap-3">
              <div
                :class="card.accent"
                class="h-10 w-10 rounded-xl flex items-center justify-center text-lg"
              >
                <span>{{ card.icon }}</span>
              </div>
              <div>
                <h3 class="text-sm font-semibold text-slate-900">{{ card.label }}</h3>
                <p class="text-xs text-slate-500">Open requests</p>
              </div>
            </div>
            <span
              v-if="card.count"
              :class="card.badge"
              class="text-xs text-white rounded-full px-2.5 py-1 font-semibold"
            >
              {{ card.count }}
            </span>
          </div>
          <div class="mt-3 text-xs text-slate-500">
            Tap to review and take action
          </div>
        </RouterLink>
      </div>
    </div>
  </section>
</template>
