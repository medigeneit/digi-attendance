<script setup>
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()

const isAuthed = computed(() => !!auth.token || !!localStorage.getItem('auth_token'))
const missingPath = computed(() => route.query.from || route.fullPath || '/')

function goHome() {
  router.push({ name: 'Home' })
}
function goDashboard() {
  router.push({ name: 'Dashboard' })
}
function goBack() {
  if (window.history.length > 1) router.back()
  else goHome()
}
</script>

<template>
  <main class="min-h-[70vh] flex items-center justify-center px-4">
    <div class="max-w-xl text-center">
      <p class="text-sm tracking-widest text-slate-500">ERROR 404</p>
      <h1 class="mt-2 text-3xl md:text-4xl font-semibold">Page not found</h1>

      <p class="mt-3 text-slate-600">
        We couldn't find anything at
        <span class="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">
          {{ missingPath }}
        </span>
      </p>

      <p class="mt-1 text-sm text-slate-500">
        মনে হচ্ছে লিংকটি ভুল বা মুছে ফেলা হয়েছে।
      </p>

      <div class="mt-6 flex flex-wrap items-center justify-center gap-2">
        <button
          @click="goBack"
          class="px-4 py-2 rounded-xl border hover:bg-slate-50"
          title="Go back"
        >
          ← Back
        </button>

        <button
          v-if="isAuthed"
          @click="goDashboard"
          class="px-4 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700"
        >
          Go to Dashboard
        </button>

        <button
          v-else
          @click="goHome"
          class="px-4 py-2 rounded-xl bg-slate-900 text-white hover:bg-slate-800"
        >
          Go to Home
        </button>
      </div>

      <div class="mt-8 text-xs text-slate-500">
        If this keeps happening, please contact support with the URL above.
      </div>
    </div>
  </main>
</template>
