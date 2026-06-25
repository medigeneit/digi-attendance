<script setup>
import { useNoticeStore } from '@/stores/notice'
import { useUserStore } from '@/stores/user'
import { storeToRefs } from 'pinia'
import { computed } from 'vue'
import { useRouter } from 'vue-router'

const userStore = useUserStore()
const noticeStore = useNoticeStore()
const { userDashboard } = storeToRefs(userStore)
const { notices: noticeStoreNotices } = storeToRefs(noticeStore)
const router = useRouter()

const fmtDate = (iso) => {
  if (!iso) return '--'
  const d = new Date(iso)
  if (isNaN(+d)) return iso
  return new Intl.DateTimeFormat(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(d)
}

const timeAgo = (iso) => {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(+d)) return ''

  const diff = (Date.now() - d.getTime()) / 1000
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' })
  const map = [
    ['year', 60 * 60 * 24 * 365],
    ['month', 60 * 60 * 24 * 30],
    ['week', 60 * 60 * 24 * 7],
    ['day', 60 * 60 * 24],
    ['hour', 60 * 60],
    ['minute', 60],
    ['second', 1],
  ]

  for (const [unit, sec] of map) {
    const val = Math.round(diff / sec)
    if (Math.abs(val) >= 1) return rtf.format(-val, unit)
  }

  return rtf.format(0, 'second')
}

const prettyDate = (iso) => {
  const d = fmtDate(iso)
  const rel = timeAgo(iso)
  return rel ? `${d} - ${rel}` : d
}

// Prefer notice store (fetched via /user/notices), fall back to dashboard payload
const noticesRaw = computed(() =>
  noticeStoreNotices.value?.length ? noticeStoreNotices.value : userDashboard.value?.notices ?? [],
)

const notices = computed(() =>
  [...noticesRaw.value]
    .sort((a, b) => {
      const au = a?.user_feedback ? 1 : 0
      const bu = b?.user_feedback ? 1 : 0
      if (au !== bu) return au - bu
      return new Date(b?.published_at || 0).getTime() - new Date(a?.published_at || 0).getTime()
    })
    .slice(0, 5),
)

const unreadCount = computed(() => notices.value.filter((n) => !n?.user_feedback).length)
const goToDetails = (notice) => {
  if (!notice) return
  const path = notice.type === 1 ? `/notice-details/${notice.id}` : `/policy-details/${notice.id}`
  router.push(path)
}
</script>

<template>
  <div class="h-full rounded-[inherit] bg-white p-3 sm:p-4">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <div class="flex items-center gap-2">
        <span class="inline-flex size-8 items-center justify-center rounded-full bg-blue-50 text-blue-600">
          <i class="fas fa-bell text-sm"></i>
        </span>
        <div>
          <h2 class="text-base font-semibold text-slate-900">Notices</h2>
          <p class="text-[11px] text-slate-500">Recent announcements and policies</p>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <RouterLink
          :to="{ name: 'NoticeView' }"
          class="text-[11px] font-semibold text-blue-600 hover:text-blue-700"
        >
          View All
        </RouterLink>
        <span
          v-if="unreadCount"
          class="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-600"
        >
          <span class="h-1.5 w-1.5 animate-pulse rounded-full bg-rose-500"></span>
          {{ unreadCount }} pending
        </span>
      </div>
    </div>

    <hr class="my-3 border-slate-100" />

    <div v-if="!notices.length" class="flex flex-col items-center justify-center py-10 text-center">
      <span class="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
        <i class="far fa-bell-slash text-xl"></i>
      </span>
      <p class="text-sm font-semibold text-slate-600">No notices yet</p>
      <p class="mt-1 text-xs text-slate-400">You'll be notified when new notices are published.</p>
    </div>

    <div v-else class="space-y-2">
      <article
        v-for="n in notices"
        :key="n.id"
        class="group flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3 transition hover:border-blue-200 hover:bg-white"
      >
        <span
          class="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs"
          :class="!n.user_feedback ? 'bg-rose-50 text-rose-600' : 'bg-slate-100 text-slate-400'"
        >
          <i class="far fa-bell"></i>
        </span>

        <div class="min-w-0 flex-1">
          <RouterLink
            :to="n.type === 1 ? `/notice-details/${n.id}` : `/policy-details/${n.id}`"
            class="block truncate text-sm font-medium text-gray-900 hover:text-blue-700"
          >
            {{ n.title || 'Untitled notice' }}
          </RouterLink>
          <div class="mt-1 flex flex-wrap items-center gap-2">
            <p class="text-[11px] text-gray-400">{{ prettyDate(n.published_at) }}</p>
            <span
              v-if="!n.user_feedback"
              class="inline-flex items-center gap-1 rounded-full bg-rose-50 px-1.5 py-0.5 text-[10px] font-semibold text-rose-600"
            >
              <span class="h-1.5 w-1.5 animate-pulse rounded-full bg-rose-500"></span>
              Pending
            </span>
            <span
              v-else
              class="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-600"
            >
              <span class="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
              Read
            </span>
          </div>
        </div>

        <RouterLink
          :to="n.type === 1 ? `/notice-details/${n.id}` : `/policy-details/${n.id}`"
          class="shrink-0 self-center text-[11px] font-semibold text-blue-600 hover:text-blue-700"
        >
          View <i class="fas fa-arrow-right text-[10px]"></i>
        </RouterLink>
      </article>
    </div>

  </div>
</template>
