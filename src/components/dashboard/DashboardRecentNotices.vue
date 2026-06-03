<script setup>
import { useUserStore } from '@/stores/user'
import { storeToRefs } from 'pinia'
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import OverlyModal from '../common/OverlyModal.vue'

const userStore = useUserStore()
const { userDashboard } = storeToRefs(userStore)
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

const noticesRaw = computed(() => userDashboard.value?.notices ?? [])

const notices = computed(() => {
  const arr = [...noticesRaw.value]
  return arr.sort((a, b) => {
    const au = a?.user_feedback ? 1 : 0
    const bu = b?.user_feedback ? 1 : 0
    if (au !== bu) return au - bu

    const ad = new Date(a?.published_at || 0).getTime()
    const bd = new Date(b?.published_at || 0).getTime()
    return bd - ad
  })
})

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

      <div v-if="notices.length" class="text-[11px] text-gray-500">
        <span
          class="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-1 text-blue-700"
        >
          <span class="h-1.5 w-1.5 rounded-full bg-blue-500"></span>
          {{ unreadCount }} pending
        </span>
      </div>
    </div>

    <hr class="my-3 border-gray-200" />

    <div v-if="!notices.length" class="py-6 text-center text-xs italic text-gray-500">
      No pending notice found
    </div>

    <div v-else class="space-y-2.5">
      <article
        v-for="n in notices"
        :key="n.id"
        class="group flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3 transition hover:border-blue-200 hover:bg-white sm:flex-row sm:items-center sm:justify-between"
      >
        <div class="flex min-w-0 items-start gap-3">
          <span
            class="mt-0.5 inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium"
            :class="!n.user_feedback ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'"
          >
            <span
              class="h-2 w-2 rounded-full"
              :class="!n.user_feedback ? 'bg-rose-600 animate-pulse' : 'bg-emerald-600'"
            ></span>
          </span>

          <div class="min-w-0">
            <h3 class="truncate text-sm font-medium text-gray-900">
              {{ n.title || 'Untitled notice' }}
            </h3>
            <p class="mt-0.5 text-[11px] text-gray-500">
              <i class="fas fa-calendar-alt mr-1 text-gray-400"></i>
              {{ prettyDate(n.published_at) }}
            </p>
          </div>
        </div>

        <RouterLink
          :to="n.type === 1 ? `/notice-details/${n.id}` : `/policy-details/${n.id}`"
          class="inline-flex shrink-0 items-center gap-1 self-start rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-blue-600 ring-1 ring-blue-100 transition hover:bg-blue-50 hover:text-blue-700 sm:self-center"
        >
          View <i class="fas fa-arrow-right text-[10px]"></i>
        </RouterLink>
      </article>
    </div>

  </div>
</template>
