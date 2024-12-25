<template>
  <div class="my-container">
    <div class="card-bg p-4 md:p-8">
      <div v-if="user">
        <p>Hello <span class="title-md">{{ user.name }}!</span></p>
      <h1 class="title-xl">Welcome back</h1>
        <p>Your phone number is <span class="title-md">{{ user.phone }}</span></p>
      </div>
      <div v-else>
        <p>Loading...</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
const user = ref(authStore.user)

onMounted(async () => {
  if (!user.value) {
    await authStore.fetchUser()
    user.value = authStore.user
  }
})

</script>
