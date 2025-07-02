<script setup>
import HeaderPrivate from '@/components/layouts/HeaderPrivate.vue'
import SideBar from '@/components/layouts/SideBar.vue'
import { getUserInitials } from '@/libs/user.js'
import { useAuthStore } from '@/stores/auth'
import { computed, onMounted, ref } from 'vue'
import { RouterView } from 'vue-router'

const authStore = useAuthStore()
const sidebarVisible = ref(JSON.parse(localStorage.getItem('sidebarVisible')) ?? true)

const toggleSidebar = () => {
  sidebarVisible.value = !sidebarVisible.value
  localStorage.setItem('sidebarVisible', JSON.stringify(sidebarVisible.value))
}

const user = ref(null)

const userInitial = computed(() => (user?.value ? getUserInitials(user?.value) : ''))

onMounted(async () => {
  if (!authStore.user) {
    await authStore.fetchUser()
  }
  user.value = authStore.user
})
</script>

<template>
  <div class="md:flex relative">
    <div
      :class="{ 'hidden md:block': !sidebarVisible }"
      class="bg-white md:shadow-md shadow-2xl absolute md:static transition-transform duration-300 print:hidden z-[999]"
    >
      <div class="sticky top-0 print:hidden">
        <div class="relative">
          <SideBar :visible="sidebarVisible" :user="user" />
          <button
            class="md:hidden absolute -right-10 top-1/2 transform -translate-y-1/2 bg-red-500 text-white px-2 py-1 pt-2 rounded-full"
            @click="toggleSidebar"
          >
            <i class="fas fa-times-circle text-xl"></i>
          </button>
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

      <main class="flex-grow py-4 pb-20 md:pb-10">
        <RouterView />
      </main>

      <footer class="hidden md:block print:hidden bg-blue-700 text-white py-2 text-center">
        <div class="my-container">
          {{ new Date().getFullYear() }} Copyright © Digitgate IT. All rights reserved.
        </div>
      </footer>
    </div>
  </div>
</template>
