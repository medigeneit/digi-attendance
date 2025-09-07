<script setup>
import MyNotifications from '@/components/MyNotifications.vue'
import UserAvatar from '@/components/UserAvatar.vue'
import { useNotificationStore } from '@/stores/notification'
import { storeToRefs } from 'pinia'
import { onBeforeMount, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'

const props = defineProps({ user: Object, userInitial: String })

const notificationStore = useNotificationStore()

const { total_notifications } = storeToRefs(notificationStore)

const showNotice = ref(false)
const notificationListRef = ref(null)

const toggleNotice = () => {
  showNotice.value = !showNotice.value
}

function handleOutsideClick(event) {
  if (notificationListRef.value && !notificationListRef.value.contains(event.target)) {
    showNotice.value = false
  }
}

onMounted(() => {
  notificationStore.fetchCountNotifications()
  document.addEventListener('click', handleOutsideClick)
})

const markNotificationAndNavigate = async (notificationId, url) => {
  await notificationStore.markAsRead(notificationId)
  window.location.href = url
}
onBeforeMount(() => {
  document.removeEventListener('click', handleOutsideClick)
})
</script>

<template>
  <div class="bg-white py-2 shadow">
    <div class="mx-auto flex justify-between items-center px-4">
      <RouterLink to="/" class="logo ml-7 md:ml-0">
        <img class="h-[50px]" src="/src/assets/logo.png" alt="Logo" />
      </RouterLink>
      <ul class="flex gap-4 items-center" ref="notificationListRef">
        <!-- Notification Bell -->

        <button class="btn-icon relative" @click="toggleNotice">
          <i class="fas fa-bell text-xl"></i>
          <div
            v-if="total_notifications > 0"
            class="absolute -translate-x-1/2 -translate-y-1/2 -right-3 top-2.5"
          >
            <span class="flex size-6 relative">
              <span
                class="flex justify-center items-center size-6 text-xs text-white rounded-full bg-red-500"
              >
                {{ total_notifications }}
              </span>
              <span class="absolute animate-ping size-6 rounded-full bg-red-400 opacity-75"></span>
            </span>
          </div>
        </button>

        <RouterLink
          v-if="user"
          to="/profile"
          class="menus font-bold bg-gray-100 hover:bg-teal-100 p-1 rounded-full border"
        >
          <UserAvatar :user="user" />
          <h4 class="hidden md:flex flex-col overflow-hidden">
            <span class="line-clamp-1 break-all pr-2 text-sm">{{ user.name }}</span>
            <span class="line-clamp-1 break-all pr-2 text-xs font-normal">{{ user.email }}</span>
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
