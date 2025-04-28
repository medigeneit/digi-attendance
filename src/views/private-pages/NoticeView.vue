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
  <div class="grid gap-4 md:grid-cols-3 px-4">
    <RouterLink :to="{ name: 'MyNoticeList' }" class="main-button relative">
      <i class="far fa-exclamation text-3xl"></i>
      General Notice
      <div v-if="noticeCount > 0" class="absolute top-2 right-2">
        <span class="relative flex h-4 w-4">
          <span
            class="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"
          ></span>
          <span class="relative inline-flex rounded-full h-4 w-4 bg-green-500"></span>
        </span>
      </div>
    </RouterLink>
    <RouterLink :to="{ name: 'PolicyList' }" class="main-button relative">
      <i class="far fa-file-chart-line text-3xl"></i>
      Office Policy
      <div v-if="policyCount > 0" class="absolute top-2 right-2">
        <span class="relative flex h-3 w-3">
          <span
            class="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"
          ></span>
          <span class="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
        </span>
      </div>
    </RouterLink>
  </div>
</template>
