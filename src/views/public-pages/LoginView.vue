<script setup>
import LoaderView from '@/components/common/LoaderView.vue'
import { useAuthStore } from '@/stores/auth'
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const email = ref('')
const password = ref('')
const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const error = ref('')
const state = ref('')

onMounted(() => {
  if (route.query.email) {
    email.value = route.query.email
  }
})

const login = async () => {
  try {
    state.value = 'loading'
    await authStore.login(email.value, password.value)
    if (!authStore.error) {
      router.push('/dashboard')
    } else {
      error.value = authStore.error
    }
  } catch (err) {
    error.value = 'An unexpected error occurred. Please try again.'
  } finally {
    state.value = ''
  }
}
</script>

<template>
  <div class="py-16 mx-4 sm:mx-0">
    <div class="my-container lg:my-16 max-w-2xl">
      <div class="card-bg p-8 items-center relative">
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
              autofocus
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
            />
          </div>
          <div v-if="error" class="mt-4 text-sm text-red-500 text-center">{{ error }}</div>
          <div class="flex justify-center">
            <button class="btn-2" type="submit">Login</button>
          </div>
        </form>
        <LoaderView
          v-if="state == 'loading'"
          class="absolute inset-0 flex items-center justify-center bg-opacity-90"
        >
          Logging In
        </LoaderView>
      </div>
    </div>
  </div>
</template>
