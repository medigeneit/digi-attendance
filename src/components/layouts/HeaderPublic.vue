<script setup>
import { computed, ref, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { RouterLink } from 'vue-router'

const authStore = useAuthStore()

const isAuthenticated = computed(() => !!authStore.token || !!localStorage.getItem('auth_token'))

const showDashboardButton = computed(
  () => isAuthenticated.value && authStore.user?.role !== 'customer',
)

const buttonText = computed(() => (showDashboardButton.value ? 'Dashboard' : 'Login'))

const buttonLink = computed(() => (showDashboardButton.value ? '/dashboard' : '/login'))

const isDrawerOpen = ref(false)
const searchOpen = ref(false)
const searchInput = ref('')

const toggleDrawer = () => {
  isDrawerOpen.value = !isDrawerOpen.value
}

const toggleSearch = () => {
  if (!searchInput.value) {
    searchOpen.value = !searchOpen.value
  }
}

onMounted(async () => {
  await authStore.fetchUser()
})
</script>

<template>
  <div>
    <div class="my-container flex justify-between items-center py-3">
      <RouterLink to="/">
        <img src="/src/assets/logo.png" alt="logo" class="h-[40px]" />
      </RouterLink>
      <div class="flex gap-4 items-center">
        <div class="flex gap-4">
          <div class="hidden md:flex items-center gap-8">
            <RouterLink to="/home" class="font-medium hover:text-blue-600">Home</RouterLink>
            <RouterLink to="/careers" class="font-medium hover:text-blue-600">Careers</RouterLink>
            <RouterLink to="/about" class="font-medium hover:text-blue-600">About</RouterLink>
            <RouterLink to="/contact" class="font-medium hover:text-blue-600">Contact</RouterLink>
          </div>
          <div class="hidden md:flex gap-4 items-center">
            <RouterLink v-if="!isAuthenticated" :to="buttonLink" class="btn-2">
              {{ buttonText }}
            </RouterLink>

            <RouterLink v-if="showDashboardButton" :to="buttonLink" class="btn-2">
              {{ buttonText }}
            </RouterLink>
          </div>
        </div>
        <div class="md:hidden">
          <button @click="toggleDrawer">
            <i class="fas fa-bars text-xl"></i>
          </button>
        </div>
      </div>
    </div>

    <transition name="slide">
      <div v-if="isDrawerOpen" class="fixed inset-0 bg-gray-800 bg-opacity-50 z-50">
        <div class="fixed inset-y-0 right-0 w-64 bg-white shadow-lg p-4 z-50">
          <button @click="toggleDrawer" class="flex justify-end mb-4">
            <i class="fas fa-times text-xl"></i>
          </button>
          <nav class="flex flex-col gap-4">
            <RouterLink @click="toggleDrawer" :to="{ name: 'Home' }" class=""> হোম </RouterLink>

            <RouterLink @click="toggleDrawer" :to="{ name: 'About' }" class="">
              আমাদের সম্পর্কে
            </RouterLink>
            <RouterLink @click="toggleDrawer" :to="buttonLink" class="btn-2">
              {{ buttonText }}
            </RouterLink>
          </nav>
        </div>
      </div>
    </transition>
  </div>
</template>
