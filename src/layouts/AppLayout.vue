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

const setSidebarVisible = (value) => {
  sidebarVisible.value = value
  localStorage.setItem('sidebarVisible', JSON.stringify(value))
}

const toggleSidebar = () => {
  setSidebarVisible(!sidebarVisible.value)
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
    const isPrivateRoute = route.matched.some((record) => record.meta?.requiresAuth)
    if (!isPrivateRoute) return
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
  <div class="relative min-h-screen min-w-0 max-w-full overflow-x-hidden md:flex">
    <div
      :class="{
        'invisible md:visible opacity-0 md:opacity-100': !sidebarVisible,
        sidebarVisible: ' opacity-100',
        'md:w-[240px]': sidebarVisible,
        'md:w-[70px]': !sidebarVisible,
      }"
      class="absolute z-[998] bg-white shadow-2xl transition-all duration-300 print:hidden md:relative md:shrink-0 md:shadow-md"
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
        class="fixed bottom-0 top-0 transition duration-150 print:hidden md:left-0"
        :class="{
          'translate-x-0 ': sidebarVisible,
          '-translate-x-20 md:translate-x-0': !sidebarVisible,
        }"
      >
        <div class="w-full">
          <SideBar
            :visible="sidebarVisible"
            :user="user"
            @update:visible="setSidebarVisible"
          />
        </div>
      </div>
    </div>

    <!-- Main Content -->
    <div class="flex min-h-screen min-w-0 flex-1 flex-col justify-between overflow-x-hidden">
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

      <main class="flex-grow min-w-0 w-full max-w-full overflow-x-hidden p-4 print:py-0">
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
