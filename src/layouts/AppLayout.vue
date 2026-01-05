<script setup>
import HeaderPrivate from '@/components/layouts/HeaderPrivate.vue'
import SideBar from '@/components/layouts/SideBar.vue'
import { getUserInitials } from '@/libs/user.js'
import { useAuthStore } from '@/stores/auth'
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { RouterView, useRoute, useRouter } from 'vue-router'

const authStore = useAuthStore()
const router = useRouter()
const route = useRoute()
const sidebarVisible = ref(JSON.parse(localStorage.getItem('sidebarVisible')) ?? true)

const toggleSidebar = () => {
  sidebarVisible.value = !sidebarVisible.value
  localStorage.setItem('sidebarVisible', JSON.stringify(sidebarVisible.value))
}

const user = ref(null)

const userInitial = computed(() => (user?.value ? getUserInitials(user?.value) : ''))

onMounted(async () => {
  console.log('AppLayout Mounted')
  if (!authStore.user) {
    await authStore.fetchUser()
  }
  user.value = authStore.user
})

watch(
  () => authStore.isAdminMood,
  (isAdminMood, wasAdminMood) => {
    if (isAdminMood === wasAdminMood) return
    if (route.name !== 'Dashboard') {
      router.push({ name: 'Dashboard' })
    }
  },
)

onUnmounted(() => {
  user.value = null
})
</script>

<template>
  <div class="md:flex relative">
    <div
      :class="{
        'invisible md:visible opacity-0 md:opacity-100': !sidebarVisible,
        sidebarVisible: ' opacity-100',
      }"
      class="max-w-[240px] bg-white md:shadow-md shadow-2xl absolute md:static transition-transform duration-300 print:hidden z-[998]"
    >
      <div
        @click="toggleSidebar"
        class="md:hidden fixed inset-0 w-full h-full bg-gray-800/50 flex items-center justify-start p-2 transition duration-500"
        :class="{ 'opacity-100': sidebarVisible, 'opacity-0': !sidebarVisible }"
      >
        <button
          class="absolute md:hidden bg-red-500 text-white px-2 py-1 pt-2 rounded-full right-4 top-16 mt-4"
          @click.stop="toggleSidebar"
        >
          <i class="fas fa-times-circle text-xl"></i>
        </button>
      </div>

      <div
        class="fixed md:sticky top-0 bottom-0 transition duration-150 print:hidden"
        :class="{
          'translate-x-0 ': sidebarVisible,
          '-translate-x-20 md:translate-x-0': !sidebarVisible,
        }"
      >
        <div class="w-full">
          <SideBar :visible="sidebarVisible" :user="user" />
        </div>
      </div>
    </div>

    <!-- Main Content -->
    <div class="flex-1 flex min-h-screen flex-col justify-between">
      <header class="sticky top-0 print:hidden z-[999]">
        <div class="relative">
          <button
            type="button"
            class="absolute left-0 top-1/2 transform -translate-y-1/2 md:hidden px-3"
            @click="toggleSidebar"
          >
            <i class="fad fa-bars text-2xl"></i>
          </button>
          <HeaderPrivate class="w-full" :user="user" :userInitial="userInitial" />
        </div>
      </header>

      <main class="flex-grow py-4 print:py-0 flex-none">
        <RouterView />
      </main>

      <footer class="hidden print:hidden bg-blue-700 text-white py-2 text-center">
        <div class="my-container">
          {{ new Date().getFullYear() }} Copyright © Digitgate IT. All rights reserved.
        </div>
      </footer>
    </div>
  </div>
</template>
