<script setup>
import { ref, computed, onMounted } from 'vue';
import { RouterLink } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useNotificationStore } from '@/stores/notification';
import MyNotifications from '@/components/MyNotifications.vue'; 

const authStore = useAuthStore();
const notificationStore = useNotificationStore();

const showNotice = ref(false);

const toggleNotice = () => {
  showNotice.value = !showNotice.value;
};

const userInitial = computed(() => {
  return authStore.user && authStore.user.name ? authStore.user.name.charAt(0).toUpperCase() : '';
});

onMounted(() => {
  notificationStore.fetchNotifications();
});

const markNotificationAndNavigate = async (notificationId, url) => {
  await notificationStore.markAsRead(notificationId);
  window.location.href = url;
};
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

          <div
            v-if="notificationStore.unreadCount > 0"
            class="absolute top-0 right-0"
          >
            <span class="relative flex h-3 w-3">
              <span
                class="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"
              ></span>
              <span class="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
            </span>
          </div>
        </button>

        <RouterLink
          to="/profile"
          class="menus font-bold bg-gray-100 hover:bg-teal-100 p-1 rounded-full border"
        >
          <div class="min-w-max rounded-full object-cover overflow-hidden border">
            <div
              class="flex rounded-full overflow-hidden h-full aspect-square max-h-8 bg-teal-600 items-center justify-center"
            >
              <img
                v-if="authStore.user && authStore.user.photo"
                :src="authStore.user.photo"
                alt="User Photo"
              />
              <span v-else class="text-white font-bold text-xl pt-3 p-2">{{ userInitial }}</span>
            </div>
          </div>
          <h4 class="hidden md:flex overflow-hidden">
            <span class="line-clamp-1 break-all pr-2">{{
              authStore.user ? authStore.user.name : ''
            }}</span>
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
