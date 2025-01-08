<script setup>
import { computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()

const isAuthenticated = computed(() => !!authStore.token || !!localStorage.getItem('auth_token'))

const buttonText = computed(() => (isAuthenticated.value ? 'Dashboard' : 'Login'))

const buttonLink = computed(() => (isAuthenticated.value ? '/dashboard' : '/login'))

onMounted(async () => {
  if (isAuthenticated.value) {
    await authStore.fetchUser()
  }
})
</script>

<template>
  <main class="my-container p-4">
    <div class="card-bg p-4 md:p-8">
      <h4 class="title-xl">Welcome to Digit Gate HR Management</h4>
      <p>Here we can manage our HR activities.</p>
      <div class="flex">
        <RouterLink :to="buttonLink" class="btn-2">
          {{ buttonText }}
        </RouterLink>
      </div>
    </div>
  </main>
</template>
