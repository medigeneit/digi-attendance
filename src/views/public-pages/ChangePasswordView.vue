<script setup>
import { ref } from 'vue'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()

const currentPassword = ref('')
const newPassword = ref('')
const newPasswordConfirmation = ref('')
const message = ref('')
const PasswordVisible = ref(false)

const changePassword = async () => {
  const responseMessage = await authStore.changePassword(
    currentPassword.value,
    newPassword.value,
    newPasswordConfirmation.value
  )
  message.value = responseMessage
}

const PasswordVisibility = () => {
  PasswordVisible.value = !PasswordVisible.value
}
</script>

<template>
  <div class="my-container max-w-xl">
    <div class="card-bg p-4 md:p-8 flex flex-col items-center relative">
      <h1 class="title-lg">Change Password</h1>
      <form @submit.prevent="changePassword" class="space-y-2">
        <div class="flex gap-2 items-center">
          <label for="current-password">Current Password:</label>
          <input
            id="current-password"
            v-model="currentPassword"
            :type="PasswordVisible ? 'text' : 'password'"
            class="input-1"
          />
        </div>
        <div class="flex gap-2 items-center">
          <label for="new-password">New Password:</label>
          <input
            id="new-password"
            v-model="newPassword"
            :type="PasswordVisible ? 'text' : 'password'"
            class="input-1"
          />
        </div>
        <div class="flex gap-2 items-center">
          <label for="new-password-confirmation">Confirm New Password:</label>
          <input
            id="new-password-confirmation"
            v-model="newPasswordConfirmation"
            :type="PasswordVisible ? 'text' : 'password'"
            class="input-1"
          />
        </div>
        <div class="flex justify-center">
          <button @click="PasswordVisibility" type="button" class="space-x-2">
            <i v-if="PasswordVisible" class="far fa-eye-slash"></i>
            <i v-else class="far fa-eye"></i>
            <span>{{ PasswordVisible ? 'Hide Password' : 'Show Password' }}</span>
          </button>
        </div>
        <div class="flex justify-center gap-4">
          <button class="btn-2" type="submit">Change Password</button>
        </div>
      </form>
      <p v-if="message" class="message">{{ message }}</p>
    </div>
  </div>
</template>
