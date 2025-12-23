<script setup>
import { useNoticeStore } from '@/stores/notice'
import { storeToRefs } from 'pinia'
import { computed, onMounted } from 'vue'

const noticeStore = useNoticeStore()

const { notices } = storeToRefs(noticeStore)

onMounted(() => {
  noticeStore.fetchUserNotices()
})

const loading = computed(() => noticeStore.isLoading)
const error = computed(() => noticeStore.error)
const unreadCount = computed(() => notices.value.filter((n) => !n.user_feedback).length)
</script>

<template>
  <section class="relative overflow-hidden px-4 py-6 md:px-6">
    <div
      class="pointer-events-none absolute -top-20 -right-16 h-64 w-64 rounded-full bg-gradient-to-br from-amber-200 via-rose-200 to-transparent blur-3xl"
    ></div>
    <div
      class="pointer-events-none absolute -bottom-24 -left-20 h-72 w-72 rounded-full bg-gradient-to-tr from-sky-200 via-emerald-200 to-transparent blur-3xl"
    ></div>

    <div class="relative mx-auto max-w-5xl">
      <div class="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p class="text-xs uppercase tracking-[0.3em] text-slate-500 font-semibold">
            Notices
          </p>
          <h1 class="text-2xl md:text-3xl font-serif font-semibold text-slate-900">
            All company updates
          </h1>
          <p class="text-sm md:text-base text-slate-600">
            Tap a notice to view details and confirm you have read it.
          </p>
        </div>

        <div class="flex items-center gap-3">
          <div class="rounded-xl bg-white/80 px-4 py-2 shadow ring-1 ring-slate-200">
            <p class="text-xs uppercase text-slate-500">Total</p>
            <p class="text-lg font-semibold text-slate-900">{{ notices.length }}</p>
          </div>
          <div class="rounded-xl bg-slate-900 px-4 py-2 shadow">
            <p class="text-xs uppercase text-slate-300">Unread</p>
            <p class="text-lg font-semibold text-white">{{ unreadCount }}</p>
          </div>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="grid gap-3 md:grid-cols-2">
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
      <ul v-else class="grid gap-3 md:grid-cols-2">
        <li v-for="notification in notices" :key="notification.id">
          <RouterLink
            :to="{ name: 'MyNoticeDetails', params: { id: notification.id } }"
            class="group relative block overflow-hidden rounded-2xl bg-white/80 p-4 shadow-lg ring-1 ring-slate-200 transition duration-300 hover:-translate-y-1 hover:shadow-xl"
          >
            <div class="flex items-start justify-between gap-4">
              <div>
                <h3 class="text-base font-semibold text-slate-900">
                  {{ notification?.title }}
                </h3>
                <p class="text-xs text-slate-500 mt-1">
                  {{ new Date(notification.created_at).toLocaleString('en-US') }}
                </p>
              </div>
              <span
                :class="
                  notification.user_feedback
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-rose-50 text-rose-700'
                "
                class="rounded-full px-2.5 py-1 text-xs font-semibold"
              >
                {{ notification.user_feedback ? 'Read' : 'Unread' }}
              </span>
            </div>

            <div v-if="!notification.user_feedback" class="absolute top-3 right-3">
              <span class="relative flex h-2.5 w-2.5">
                <span
                  class="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"
                ></span>
                <span class="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
              </span>
            </div>
          </RouterLink>
        </li>

        <!-- No Notifications -->
        <li v-if="notices.length === 0" class="md:col-span-2">
          <div class="rounded-2xl bg-white/80 p-6 text-center ring-1 ring-slate-200">
            <p class="text-slate-600">No notices found. You are all caught up.</p>
          </div>
        </li>
      </ul>
    </div>
  </section>
</template>
