<script setup>
import { reactive, ref, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
const emit = defineEmits(['close', 'updated'])

const props = defineProps({
  user: Object,
})
const authStore = useAuthStore()
// Reactive form state
const form = reactive({
  old_password: '',
  new_password: '',
  confirm_password: '',
})

// Show/Hide Password state
const showOldPassword = ref(false)
const showNewPassword = ref(false)
const showConfirmPassword = ref(false)

// Toggle password visibility
const toggleOldPassword = () => (showOldPassword.value = !showOldPassword.value)
const toggleNewPassword = () => (showNewPassword.value = !showNewPassword.value)
const toggleConfirmPassword = () => (showConfirmPassword.value = !showConfirmPassword.value)

// Validate if new password and confirm password match
const passwordsMatch = computed(() => {
  if (form.confirm_password) {
    return form.new_password === form.confirm_password
  }
  return true
})

const updateUser = async () => {
  if (!passwordsMatch.value) {
    alert('New Password and Confirm Password do not match!')
    return
  }

  const dataToSend = {
    old_password: form.old_password,
    new_password: form.new_password,
    confirm_password: form.confirm_password,
  }
  await authStore.changePassword(dataToSend)
  emit('updated')
  emit('close')
}
</script>

<template>
  <div class="modal-bg">
    <div class="modal-card">
      <h2 class="text-xl font-bold text-center">Change Password</h2>
      <form @submit.prevent="updateUser" class="space-y-4">
        <div class="grid gap-2 space-y-3">
          <!-- Old Password Field -->
          <div class="relative">
            <label class="">Old Password</label>
            <input
              v-model="form.old_password"
              :type="showOldPassword ? 'text' : 'password'"
              class="w-full p-2 border rounded pr-10"
              required
            />
            <button
              type="button"
              @click="toggleOldPassword"
              class="absolute inset-y-0 right-2 mt-6 flex items-center px-2 text-gray-600"
            >
              <i class="far fa-eye" v-if="showOldPassword"></i>
              <i class="far fa-eye-slash" v-else></i>
            </button>
          </div>

          <!-- New Password Field -->
          <div class="relative">
            <label class="">New Password</label>
            <input
              v-model="form.new_password"
              :type="showNewPassword ? 'text' : 'password'"
              class="w-full p-2 border rounded pr-10"
              required
            />
            <button
              type="button"
              @click="toggleNewPassword"
              class="absolute inset-y-0 right-2 mt-6 flex items-center px-2 text-gray-600"
            >
              <i class="far fa-eye" v-if="showNewPassword"></i>
              <i class="far fa-eye-slash" v-else></i>
            </button>
          </div>

          <!-- Confirm Password Field -->
          <div class="relative">
            <label class="">Confirm Password</label>
            <input
              v-model="form.confirm_password"
              :type="showConfirmPassword ? 'text' : 'password'"
              class="w-full p-2 border rounded pr-10"
              required
            />
            <button
              type="button"
              @click="toggleConfirmPassword"
              class="absolute inset-y-0 right-2 mt-6 flex items-center px-2 text-gray-600"
            >
              <i class="far fa-eye" v-if="showConfirmPassword"></i>
              <i class="far fa-eye-slash" v-else></i>
            </button>
          </div>

          <p v-if="!passwordsMatch" class="text-red-500">Passwords do not match!</p>
        </div>

        <div class="flex justify-center gap-4">
          <button
            type="submit"
            class="btn-2"
            :class="{ 'pointer-events-none bg-blue-300': !passwordsMatch }"
          >
            Set password
          </button>
          <button type="button" @click="emit('close')" class="btn-3">Cancel</button>
        </div>
      </form>
    </div>
  </div>
</template>
