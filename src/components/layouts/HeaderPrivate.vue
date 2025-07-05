<script setup>
import MyNotifications from '@/components/MyNotifications.vue'
import UserAvatar from '@/components/UserAvatar.vue'
import { useNotificationStore } from '@/stores/notification'
import { storeToRefs } from 'pinia'
import { onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'

const props = defineProps({ user: Object, userInitial: String })

const notificationStore = useNotificationStore()

const { total_notifications } = storeToRefs(notificationStore)

const showNotice = ref(false)

const toggleNotice = () => {
  showNotice.value = !showNotice.value
}

onMounted(() => {
  notificationStore.fetchCountNotifications()
})

const markNotificationAndNavigate = async (notificationId, url) => {
  await notificationStore.markAsRead(notificationId)
  window.location.href = url
}
</script>

<template>
  <div class="bg-white py-2 shadow">
    <div class="mx-auto flex justify-between items-center px-4">
      <RouterLink to="/" class="logo ml-7 md:ml-0">
        <img class="h-[50px]" src="/src/assets/logo.png" alt="Logo" />
      </RouterLink>
      <ul class="flex gap-4 items-center">
        <!-- Notification Bell -->
        <button class="btn-icon relative" @click="toggleNotice">
          <i class="fas fa-bell"></i>
          <div v-if="total_notifications > 0" class="absolute top-0 right-0">
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
          to="/profile"
          class="menus font-bold bg-gray-100 hover:bg-teal-100 p-1 rounded-full border"
        >
          <UserAvatar :user="user" />
          <h4 class="hidden md:flex overflow-hidden">
            <span class="line-clamp-1 break-all pr-2">{{ user ? user.name : '' }}</span>
          </h4>
        </RouterLink>
      </ul>

      <MyNotifications
        v-if="showNotice"
        :markNotification="markNotificationAndNavigate"
        @close="showNotice = false"
      />
    </div>
  </div>
</template>
