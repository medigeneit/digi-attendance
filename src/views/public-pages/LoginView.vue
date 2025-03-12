<script setup>
import { useAuthStore } from '@/stores/auth'
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const email = ref('')
const password = ref('')
const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const error = ref('')

onMounted(() => {
  if (route.query.email) {
    email.value = route.query.email
  }
})

const login = async () => {
  try {
    await authStore.login(email.value, password.value)
    if (!authStore.error) {
      router.push('/dashboard')
    } else {
      error.value = authStore.error
    }
  } catch (err) {
    error.value = 'An unexpected error occurred. Please try again.'
  }
}
</script>

<template>
  <div class="my-container max-w-2xl">
    <div class="card-bg p-8 my-6 items-center">
      <h1 class="title-lg">Login Now</h1>
      <form class="space-y-4 w-full" @submit.prevent="login">
        <div>
          <label for="email" class="block font-medium text-gray-700">Email Address</label>
          <input
            v-model="email"
            type="email"
            id="email"
            name="email"
            class="input-1 w-full"
            placeholder="Enter your email number"
            required
          />
        </div>
        <div>
          <label for="password" class="block font-medium text-gray-700">Password</label>
          <input
            v-model="password"
            type="password"
            id="password"
            name="password"
            class="input-1 w-full"
            placeholder="Enter your password"
            required
            autofocus
          />
        </div>
        <div v-if="error" class="mt-4 text-sm text-red-500 text-center">{{ error }}</div>
        <div class="flex justify-center">
          <button class="btn-2" type="submit">Login</button>
        </div>
      </form>
    </div>
  </div>
</template>
