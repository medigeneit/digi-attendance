<script setup>
import { useNoticeStore } from '@/stores/notice'
import { storeToRefs } from 'pinia'
import { computed, onMounted } from 'vue'

const noticeStore = useNoticeStore()

const { policies } = storeToRefs(noticeStore)

onMounted(() => {
  noticeStore.fetchPolices()
})

const loading = computed(() => noticeStore.isLoading)
const error = computed(() => noticeStore.error)
</script>

<template>
  <div class="my-container">
    <!-- Loading State -->
    <p v-if="loading" class="text-center text-gray-500">Loading notifications...</p>

    <!-- Error State -->
    <p v-if="error" class="text-center text-red-500">{{ error }}</p>

    <!-- Notifications List -->
    <ul v-if="!loading && !error" class="divide-y divide-gray-200">
      <li
        v-for="notification in policies"
        :key="notification.id"
        :class="{
          'p-4 bg-white': notification.user_feedback,
          'p-4 bg-teal-100': !notification.user_feedback,
        }"
        class="cursor-pointer relative"
      >
        <RouterLink :to="{ name: 'PolicyDetails', params: { id: notification.id } }">
          <p>{{ notification?.title }}</p>
          <span class="text-sm text-gray-500">{{
            new Date(notification.created_at).toLocaleString('en-US')
          }}</span>

          <!-- Unread Indicator -->
          <div v-if="!notification.user_feedback" class="absolute top-2 right-2">
            <span class="relative flex h-3 w-3">
              <span
                class="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"
              ></span>
              <span class="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
            </span>
          </div>
        </RouterLink>
      </li>

      <!-- No Notifications -->
      <li v-if="policies.length === 0" class="p-4 text-center">
        <p class="text-gray-500">No notifications found.</p>
      </li>
    </ul>
  </div>
</template>
