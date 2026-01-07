<script setup>
import LoaderView from '@/components/common/LoaderView.vue'
import { useAuthStore } from '@/stores/auth'
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const email = ref('')
const password = ref('')
const successMessage = ref('')
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
    error.value = ''
    await authStore.login(email.value, password.value)
    if (!authStore.error) {
      successMessage.value = 'Login Successful. Redirecting...'
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
  <div
    class="relative flex min-h-[calc(100vh-16rem)] flex-col items-center justify-center overflow-hidden bg-slate-50 text-slate-900"
  >
    <div
      class="pointer-events-none absolute -top-24 left-6 h-48 w-48 rounded-full bg-sky-200 blur-[120px]"
    ></div>
    <div
      class="pointer-events-none absolute -right-12 top-1/4 h-72 w-72 rounded-full bg-amber-200 blur-[140px]"
    ></div>
    <div class="relative z-10 flex w-full flex-1 items-center justify-center px-4 py-10">
      <div class="w-full max-w-6xl">
        <div
          class="relative overflow-hidden rounded-[32px] border border-slate-200 bg-gradient-to-br from-white to-slate-50 shadow-[0_35px_70px_rgba(15,23,42,0.15)]"
        >
          <div class="grid gap-0 lg:grid-cols-[1.3fr_1fr]">
            <div
              class="relative flex flex-col gap-4 border-b border-slate-100 px-8 py-10 lg:border-b-0 lg:border-r lg:px-12 lg:py-16"
            >
              <div>
                <p class="text-sm uppercase tracking-[0.3em] text-sky-500">Digi Attendance</p>
                <h1 class="mt-3 text-3xl font-semibold leading-tight text-slate-900">
                  Secure staff login
                </h1>
              </div>
              <p class="text-slate-700">
                Access real-time attendance, intuitive reporting, and smart approvals all from one
                secure dashboard. Built for teams that demand clarity, speed, and reliability.
              </p>
              <ul class="space-y-3 text-sm text-slate-400">
                <li class="flex items-center gap-2">
                  <span class="h-2.5 w-2.5 rounded-full bg-sky-400"></span>
                  Single sign-on ready with role-based access.
                </li>
                <li class="flex items-center gap-2">
                  <span class="h-2.5 w-2.5 rounded-full bg-sky-400"></span>
                  Audit-friendly logs and compliance-ready workflows.
                </li>
                <li class="flex items-center gap-2">
                  <span class="h-2.5 w-2.5 rounded-full bg-sky-400"></span>
                  Mobile-first experience with adaptive layouts.
                </li>
              </ul>
            </div>
            <div class="relative bg-white px-8 py-10 text-slate-900 lg:px-12 lg:py-16">
              <div class="flex items-center justify-between">
                <h2 class="text-xl font-semibold text-slate-900">Login</h2>
                <span class="text-xs uppercase tracking-widest text-slate-500">Secure</span>
              </div>
              <form class="mt-6 space-y-5" @submit.prevent="login">
                <div class="space-y-1 text-sm font-medium text-slate-700">
                  <label for="email" class="flex items-center gap-2">
                    <span class="fad fa-at text-sky-700"></span>Email address
                  </label>
                  <input
                    v-model="email"
                    type="email"
                    id="email"
                    name="email"
                    class="input-1 border-slate-300 focus:border-sky-500 focus:ring-sky-200"
                    placeholder="name@company.com"
                    required
                    autofocus
                  />
                </div>
                <div class="space-y-1 text-sm font-medium text-slate-700">
                  <label for="password" class="flex items-center gap-2">
                    <span class="fad fa-lock text-slate-900"></span>Password
                  </label>
                  <input
                    v-model="password"
                    type="password"
                    id="password"
                    name="password"
                    class="input-1 border-slate-300 focus:border-sky-500 focus:ring-sky-200"
                    placeholder="••••••••"
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
                <div class="flex justify-center">
                  <button class="btn-2 w-full justify-center text-sm" type="submit">
                    Login securely
                  </button>
                </div>
              </form>
              <p class="mt-6 text-center text-xs text-slate-500">
                Need support? Contact your administrator for account assistance.
              </p>
              <LoaderView
                v-if="state == 'loading'"
                class="absolute inset-0 flex items-center justify-center bg-white/90 text-slate-900"
              >
                Logging In
              </LoaderView>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
