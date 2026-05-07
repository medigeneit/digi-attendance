<script setup>
import apiClient from '@/axios'
import LoaderView from '@/components/common/LoaderView.vue'
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const identifier = ref('')
const otp = ref('')
const password = ref('')
const passwordConfirmation = ref('')
const maskedPhone = ref('')
const step = ref('request')
const state = ref('')
const error = ref('')
const successMessage = ref('')

const getApiMessage = (err, fallback) => {
  const validationErrors = err?.response?.data?.errors
  if (validationErrors) {
    return Object.values(validationErrors)?.[0]?.[0] || fallback
  }

  return err?.response?.data?.message || fallback
}

const sendOtp = async () => {
  try {
    state.value = 'loading'
    error.value = ''
    successMessage.value = ''

    const { data } = await apiClient.post('/forgot-password/send-otp', {
      identifier: identifier.value,
    })

    successMessage.value = data.message
    maskedPhone.value = data.masked_phone || ''
    step.value = 'reset'
  } catch (err) {
    error.value = getApiMessage(err, 'Failed to send OTP. Please try again.')
  } finally {
    state.value = ''
  }
}

const resetPassword = async () => {
  try {
    state.value = 'loading'
    error.value = ''
    successMessage.value = ''

    const { data } = await apiClient.post('/forgot-password/reset', {
      identifier: identifier.value,
      otp: otp.value,
      password: password.value,
      password_confirmation: passwordConfirmation.value,
    })

    successMessage.value = data.message
    setTimeout(() => {
      router.push({ name: 'login', query: { identifier: identifier.value } })
    }, 1200)
  } catch (err) {
    error.value = getApiMessage(err, 'Failed to reset password. Please try again.')
  } finally {
    state.value = ''
  }
}
</script>

<template>
  <div
    class="relative flex min-h-[calc(100vh-16rem)] flex-col items-center justify-center overflow-hidden bg-slate-50 text-slate-900"
  >
    <div class="relative z-10 flex w-full flex-1 items-center justify-center px-4 py-10">
      <div class="w-full max-w-xl">
        <div
          class="relative overflow-hidden rounded-[28px] border border-slate-200 bg-white px-8 py-10 shadow-[0_30px_60px_rgba(15,23,42,0.12)]"
        >
          <div class="flex items-center justify-between gap-4">
            <div>
              <p class="text-sm uppercase tracking-[0.25em] text-sky-500">Digi Attendance</p>
              <h1 class="mt-2 text-2xl font-semibold text-slate-900">Reset password</h1>
            </div>
            <RouterLink class="text-sm font-medium text-sky-700 hover:text-sky-900" to="/login">
              Back to login
            </RouterLink>
          </div>

          <form v-if="step === 'request'" class="mt-8 space-y-5" @submit.prevent="sendOtp">
            <div class="space-y-1 text-sm font-medium text-slate-700">
              <label for="identifier" class="flex items-center gap-2">
                <span class="fad fa-user-lock text-sky-700"></span>Phone or email
              </label>
              <input
                v-model.trim="identifier"
                type="text"
                id="identifier"
                name="identifier"
                class="input-1 border-slate-300 focus:border-sky-500 focus:ring-sky-200"
                placeholder="017xxxxxxxx or name@company.com"
                required
                autofocus
              />
            </div>

            <div
              v-if="error"
              class="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700"
            >
              <span class="fad fa-exclamation-circle mr-2"></span>{{ error }}
            </div>
            <div
              v-if="successMessage"
              class="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700"
            >
              <span class="fad fa-check-circle mr-2"></span>{{ successMessage }}
            </div>

            <button class="btn-2 w-full justify-center text-sm" type="submit">
              Send OTP
            </button>
          </form>

          <form v-else class="mt-8 space-y-5" @submit.prevent="resetPassword">
            <div
              v-if="maskedPhone"
              class="rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800"
            >
              <span class="fad fa-mobile-alt mr-2"></span>
              OTP sent to {{ maskedPhone }}
            </div>

            <div class="space-y-1 text-sm font-medium text-slate-700">
              <label for="otp" class="flex items-center gap-2">
                <span class="fad fa-key text-sky-700"></span>OTP
              </label>
              <input
                v-model.trim="otp"
                type="text"
                inputmode="numeric"
                pattern="[0-9]{6}"
                maxlength="6"
                id="otp"
                name="otp"
                class="input-1 border-slate-300 focus:border-sky-500 focus:ring-sky-200"
                placeholder="6 digit OTP"
                required
              />
            </div>

            <div class="space-y-1 text-sm font-medium text-slate-700">
              <label for="password" class="flex items-center gap-2">
                <span class="fad fa-lock text-slate-900"></span>New password
              </label>
              <input
                v-model="password"
                type="password"
                id="password"
                name="password"
                class="input-1 border-slate-300 focus:border-sky-500 focus:ring-sky-200"
                placeholder="Minimum 6 characters"
                required
              />
            </div>

            <div class="space-y-1 text-sm font-medium text-slate-700">
              <label for="password_confirmation" class="flex items-center gap-2">
                <span class="fad fa-lock text-slate-900"></span>Confirm password
              </label>
              <input
                v-model="passwordConfirmation"
                type="password"
                id="password_confirmation"
                name="password_confirmation"
                class="input-1 border-slate-300 focus:border-sky-500 focus:ring-sky-200"
                placeholder="Retype new password"
                required
              />
            </div>

            <div
              v-if="error"
              class="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700"
            >
              <span class="fad fa-exclamation-circle mr-2"></span>{{ error }}
            </div>
            <div
              v-if="successMessage"
              class="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700"
            >
              <span class="fad fa-check-circle mr-2"></span>{{ successMessage }}
            </div>

            <div class="flex flex-col gap-3 sm:flex-row">
              <button class="btn-2 flex-1 justify-center text-sm" type="submit">
                Reset password
              </button>
              <button
                class="btn-1 flex-1 justify-center text-sm"
                type="button"
                @click="step = 'request'"
              >
                Change identifier
              </button>
            </div>
          </form>

          <LoaderView
            v-if="state === 'loading'"
            class="absolute inset-0 flex items-center justify-center bg-white/90 text-slate-900"
          >
            Processing
          </LoaderView>
        </div>
      </div>
    </div>
  </div>
</template>
