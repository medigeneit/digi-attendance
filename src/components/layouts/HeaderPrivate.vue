<script setup>
import { ref, computed } from 'vue'
import { RouterLink } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()

const showNotice = ref(false)
const toggleNotice = () => {
  showNotice.value = !showNotice.value
}

const notices = ref([
  {
    notice_id: '1',
    notice_title: 'Notice Title',
    notice_details:
      'Brief description of the notice goes here. This is a summary. Brief description of the notice goes here. This is a summary',
    date: '01-05-2024',
    url: '/dashboard/notice/noticeId/notice-show',
  },
  {
    notice_id: '2',
    notice_title: 'Notice Title',
    notice_details:
      'Brief description of the notice goes here. This is a summary. Brief description of the notice goes here. This is a summary',
    date: '01-05-2024',
    url: '/dashboard/notice/noticeId/notice-show',
  },
  {
    notice_id: '3',
    notice_title: 'Notice Title',
    notice_details:
      'Brief description of the notice goes here. This is a summary. Brief description of the notice goes here. This is a summary',
    date: '01-05-2024',
    url: '/dashboard/notice/noticeId/notice-show',
  },
])

const userInitial = computed(() => {
  return authStore.user && authStore.user.name ? authStore.user.name.charAt(0).toUpperCase() : ''
})
</script>

<template>
  <div class="bg-white py-2 shadow">
    <div class="mx-auto flex justify-between items-center px-4">
      <RouterLink to="/" class="">
        <img class="h-[50px]" src="/src/assets/logo.png" alt="" />
      </RouterLink>
      <ul class="flex gap-4 items-center">
        <button class="btn-icon" @click="toggleNotice">
          <i class="fas fa-bell"></i>
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
      <div
        v-if="showNotice"
        class="bg-teal-50 shadow-xl rounded-lg absolute md:right-10 md:top-24 top-16 w-80"
      >
        <ul class="divide-y divide-gray-200">
          <li v-for="notice in notices" :key="notice.notice_id" class="p-4">
            <RouterLink :to="notice.url">
              <h4 class="font-bold">{{ notice.notice_title }}</h4>
              <p>{{ notice.notice_details }}</p>
              <span class="text-sm text-gray-500">{{ notice.date }}</span>
            </RouterLink>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>
