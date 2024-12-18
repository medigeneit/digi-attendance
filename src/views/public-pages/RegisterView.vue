<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const name = ref('')
const phone = ref('')
const password = ref('')
const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

onMounted(() => {
  if (route.query.phone) {
    phone.value = route.query.phone
  }
})

const register = async () => {
  await authStore.register(name.value, phone.value, password.value)
  if (!authStore.error) {
    router.push('/dashboard')
  }
}
</script>

<template>
  <div class="my-container max-w-2xl">
    <div class="card-bg p-8 my-6">
      <h1 class="title-lg text-center">Register</h1>
      <form class="flex flex-col gap-4" @submit.prevent="register">
        <input class="input-1" v-model="name" type="text" placeholder="Full Name" />
        <input class="input-1" v-model="phone" type="text" placeholder="Phone Number" />
        <input class="input-1" v-model="password" type="password" placeholder="Password" />
        <button class="btn-2" type="submit">Register</button>
      </form>
      <div v-if="authStore.error" class="error-message">{{ authStore.error }}</div>
    </div>
  </div>
</template>
