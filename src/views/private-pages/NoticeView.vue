<script setup>
import { useNoticeStore } from '@/stores/notice'
import { storeToRefs } from 'pinia'
import { computed, onMounted } from 'vue'
const noticeStore = useNoticeStore()

const { notices } = storeToRefs(noticeStore)
const { policies } = storeToRefs(noticeStore)

onMounted(() => {
  noticeStore.fetchUserNotices()
  noticeStore.fetchPolices()
})

// Feedback না দেওয়া notice এবং policy গুলো গুনবো
const noticeCount = computed(() => notices.value.filter((n) => n.user_feedback === null).length)

const policyCount = computed(() => policies.value.filter((p) => p.user_feedback === null).length)
</script>
<template>
  <section class="relative overflow-hidden px-4 py-6 md:px-6">
    <div
      class="pointer-events-none absolute -top-24 -right-20 h-64 w-64 rounded-full bg-gradient-to-br from-amber-200 via-rose-200 to-transparent blur-3xl"
    ></div>
    <div
      class="pointer-events-none absolute -bottom-28 -left-16 h-72 w-72 rounded-full bg-gradient-to-tr from-sky-200 via-emerald-200 to-transparent blur-3xl"
    ></div>

    <div class="relative mx-auto max-w-5xl">
      <div class="mb-6 flex flex-col gap-2 md:mb-8">
        <p class="text-xs uppercase tracking-[0.3em] text-slate-500 font-semibold">
          Notice Center
        </p>
        <h1 class="text-2xl md:text-3xl font-serif font-semibold text-slate-900">
          Stay updated with company announcements
        </h1>
        <p class="text-sm md:text-base text-slate-600 max-w-2xl">
          Review general notices and office policies. Unread items are highlighted so you can act
          fast.
        </p>
      </div>

      <div class="grid gap-4 md:grid-cols-2">
        <RouterLink
          :to="{ name: 'MyNoticeList' }"
          class="group relative overflow-hidden rounded-2xl bg-white/80 p-5 shadow-lg ring-1 ring-slate-200 transition duration-300 hover:-translate-y-1 hover:shadow-xl"
        >
          <div class="flex items-start justify-between">
            <div class="flex items-center gap-3">
              <div
                class="h-11 w-11 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center"
              >
                <i class="far fa-exclamation text-xl"></i>
              </div>
              <div>
                <h3 class="text-lg font-semibold text-slate-900">General Notice</h3>
                <p class="text-sm text-slate-500">Updates, events, and announcements</p>
              </div>
            </div>
            <span class="text-xs font-semibold text-slate-500">Open</span>
          </div>
          <div class="mt-4 flex items-center gap-3">
            <div
              class="rounded-full bg-slate-900/90 px-3 py-1 text-xs font-semibold text-white"
            >
              {{ noticeCount }} Unread
            </div>
            <div v-if="noticeCount > 0" class="flex items-center gap-2 text-emerald-600 text-xs">
              <span class="relative flex h-2 w-2">
                <span
                  class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"
                ></span>
                <span class="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              New updates available
            </div>
          </div>
        </RouterLink>

        <RouterLink
          :to="{ name: 'PolicyList' }"
          class="group relative overflow-hidden rounded-2xl bg-white/80 p-5 shadow-lg ring-1 ring-slate-200 transition duration-300 hover:-translate-y-1 hover:shadow-xl"
        >
          <div class="flex items-start justify-between">
            <div class="flex items-center gap-3">
              <div
                class="h-11 w-11 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center"
              >
                <i class="far fa-file-chart-line text-xl"></i>
              </div>
              <div>
                <h3 class="text-lg font-semibold text-slate-900">Office Policy</h3>
                <p class="text-sm text-slate-500">Guidelines and compliance notes</p>
              </div>
            </div>
            <span class="text-xs font-semibold text-slate-500">Open</span>
          </div>
          <div class="mt-4 flex items-center gap-3">
            <div
              class="rounded-full bg-slate-900/90 px-3 py-1 text-xs font-semibold text-white"
            >
              {{ policyCount }} Unread
            </div>
            <div v-if="policyCount > 0" class="flex items-center gap-2 text-rose-600 text-xs">
              <span class="relative flex h-2 w-2">
                <span
                  class="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"
                ></span>
                <span class="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
              </span>
              New policies available
            </div>
          </div>
        </RouterLink>
      </div>
    </div>
  </section>
</template>
