<script setup>
import MyNotifications from '@/components/MyNotifications.vue'
import UserAvatar from '@/components/UserAvatar.vue'
import { useNotificationStore } from '@/stores/notification'
import { useTaskNotificationStore } from '@/stores/task-notification'
import { storeToRefs } from 'pinia'
import { onBeforeMount, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import MyTaskNotifications from '../task-notifications/MyTaskNotifications.vue'

const props = defineProps({ user: Object, userInitial: String })

const notificationStore = useNotificationStore()
const taskNotificationStore = useTaskNotificationStore()

const { total_notifications } = storeToRefs(notificationStore)
const { total_task_notifications } = storeToRefs(taskNotificationStore)

const noticeDropdown = ref(null) //task or general

const notificationListRef = ref(null)

const toggleNoticeDropdown = (type) => {
  noticeDropdown.value = noticeDropdown.value == type ? null : type
}

function handleOutsideClick(event) {
  if (notificationListRef.value && !notificationListRef.value.contains(event.target)) {
    noticeDropdown.value = null
  }
}

onMounted(async () => {
  await Promise.all([
    notificationStore.fetchCountNotifications(),
    taskNotificationStore.fetchTaskNotificationCount(),
  ])

  document.addEventListener('click', handleOutsideClick)
})

onBeforeMount(() => {
  document.removeEventListener('click', handleOutsideClick)
})
</script>

<template>
  <div class="bg-white shadow">
    <div class="mx-auto flex justify-between items-center px-4">
      <RouterLink to="/" class="logo ml-7 md:ml-0 pr-2 flex-shrink-0 my-1">
        <img class="h-[25px] md:h-[50px]" src="/src/assets/logo.png" alt="Logo" />
      </RouterLink>

      <div class="flex gap-1.5 md:gap-3 items-center relative my-1" ref="notificationListRef">
        <!-- Notification Bell -->

        <RouterLink to="/chatting" class="btn-icon relative" @click="noticeDropdown = null">
          <!-- <i class="fas fa-comment-alt text-xl"></i> -->
          <i class="fad fa-comment-alt-lines text-2xl text-blue-600"></i>
          <div v-if="true" class="absolute -translate-x-1/2 -translate-y-1/2 -right-3 top-2.5">
            <span class="flex size-6 relative">
              <span
                class="flex justify-center items-center size-6 text-xs text-white rounded-full bg-blue-600"
              >
                0
              </span>
              <!-- <span class="absolute animate-ping size-6 rounded-full bg-blue-500 opacity-75"></span> -->
            </span>
          </div>
        </RouterLink>

        <button class="btn-icon relative" @click="() => toggleNoticeDropdown('task')">
          <i class="fad fa-tasks text-xl text-pink-500"></i>
          <div
            v-if="total_task_notifications > 0"
            class="absolute -translate-x-1/2 -translate-y-1/2 -right-3 top-2.5"
          >
            <span class="flex size-6 relative">
              <span
                class="flex justify-center items-center size-6 text-xs text-white rounded-full bg-pink-500"
              >
                {{ total_task_notifications }}
              </span>
              <!-- <span class="absolute animate-ping size-6 rounded-full bg-pink-400 opacity-75"></span> -->
            </span>
          </div>
        </button>

        <button class="btn-icon relative" @click="() => toggleNoticeDropdown('general')">
          <i class="fad fa-bell text-xl text-red-600"></i>
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
              <!-- <span class="absolute animate-ping size-6 rounded-full bg-red-400 opacity-75"></span> -->
            </span>
          </div>
        </button>

        <RouterLink
          v-if="user"
          to="/profile"
          class="menus font-bold bg-gray-100 hover:bg-teal-100 p-1 rounded-full border"
        >
          <UserAvatar :user="user" size="medium" />
          <h4 class="hidden md:flex flex-col overflow-hidden">
            <span class="line-clamp-1 break-all pr-2 text-sm text-gray-900">{{ user.name }}</span>
            <span class="line-clamp-1 break-all pr-2 text-xs font-normal text-gray-700">
              {{ user.email }}
            </span>
          </h4>
        </RouterLink>

        <MyNotifications v-if="noticeDropdown == 'general'" @close="noticeDropdown = null" />
        <MyTaskNotifications v-if="noticeDropdown == 'task'" @close="noticeDropdown = null" />
      </div>
    </div>
  </div>
</template>
