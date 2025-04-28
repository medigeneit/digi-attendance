<script setup>
import MyNotifications from '@/components/MyNotifications.vue'
import { useNotificationStore } from '@/stores/notification'
import { storeToRefs } from 'pinia'
import { onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'

const props = defineProps({
  user: Object,
  userInitial: String,
})

const notificationStore = useNotificationStore()

const { grouped_counts, totalUnreadNotifications } = storeToRefs(notificationStore)

const showNotice = ref(false)
const showUserPhoto = ref(true)

const toggleNotice = () => {
  showNotice.value = !showNotice.value
}

onMounted(() => {
  notificationStore.fetchNotifications()
})

const markNotificationAndNavigate = async (notificationId, url) => {
  await notificationStore.markAsRead(notificationId)
  window.location.href = url
}
</script>

<template>
  <div class="bg-white py-2 shadow">
    <div class="mx-auto flex justify-between items-center px-4">
      <RouterLink to="/" class="logo">
        <img class="h-[50px]" src="/src/assets/logo.png" alt="Logo" />
      </RouterLink>
      <ul class="flex gap-4 items-center">
        <!-- Notification Bell -->
        <button class="btn-icon relative" @click="toggleNotice">
          <i class="fas fa-bell"></i>
          <div v-if="totalUnreadNotifications > 0" class="absolute top-0 right-0">
            <span class="relative flex h-3 w-3">
              <span
                class="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"
              ></span>
              <span
                class="relative items-center justify-center inline-flex text-xs text-white rounded-full h-3 w-3 bg-red-500"
              >
              </span>
            </span>
          </div>
        </button>

        <RouterLink
          to="/my-profile"
          class="menus font-bold bg-gray-100 hover:bg-teal-100 p-1 rounded-full border"
        >
          <div class="min-w-max rounded-full object-cover overflow-hidden border">
            <div
              class="flex rounded-full overflow-hidden h-full aspect-square max-h-8 bg-teal-600 items-center justify-center"
            >
              <img
                v-if="user && user.photo && showUserPhoto"
                @error="showUserPhoto = false"
                :src="user.photo"
                alt="User Photo"
              />
              <span v-else class="text-white font-bold text-xl pt-2 p-2">{{ userInitial }}</span>
            </div>
          </div>
          <h4 class="hidden md:flex overflow-hidden">
            <span class="line-clamp-1 break-all pr-2">{{ user ? user.name : '' }}</span>
          </h4>
        </RouterLink>
      </ul>

      <MyNotifications
        v-if="showNotice"
        :notifications="notificationStore.notifications"
        :markNotification="markNotificationAndNavigate"
        @close="showNotice = false"
      />
    </div>
  </div>
</template>
