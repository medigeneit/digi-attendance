<script setup>
import { useUserStore } from '@/stores/user'
import { storeToRefs } from 'pinia'
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import OverlyModal from '../common/OverlyModal.vue'

const userStore = useUserStore()
const { userDashboard } = storeToRefs(userStore)
const router = useRouter()

/* ---------- date helpers (no extra libs) ---------- */
const fmtDate = (iso) => {
  if (!iso) return '—'
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
  const diff = (Date.now() - d.getTime()) / 1000 // sec
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
  return rel ? `${d} · ${rel}` : d
}

/* ---------- data shaping ---------- */
const noticesRaw = computed(() => userDashboard.value?.notices ?? [])

/* unread first, then latest publish date */
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

/* first unread for modal */
const firstUnreadNotice = computed(() => notices.value.find(n => !n?.user_feedback) || null)
const showUnreadModal = ref(!!firstUnreadNotice.value)

/* keep modal in sync if dashboard changes */
watch(firstUnreadNotice, (nv) => { showUnreadModal.value = !!nv })

const goToDetails = (n) => {
  const notice = n || firstUnreadNotice.value
  if (!notice) return
  const path = notice.type === 1
    ? `/notice-details/${notice.id}`
    : `/policy-details/${notice.id}`
  router.push(path)
}
</script>

<template>
  <div class="bg-white shadow-sm rounded-xl p-3">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-1.5">
        <i class="fas fa-bell"></i>
        <h2 class="text-base font-semibold">Notices</h2>
      </div>

      <div v-if="notices.length" class="text-[11px] text-gray-500">
        <span
          class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-700"
        >
          <span class="h-1.5 w-1.5 rounded-full bg-blue-500"></span>
          {{ notices.filter(n => !n.user_feedback).length }} pending
        </span>
      </div>
    </div>

    <hr class="my-2 border-gray-200" />

    <div v-if="!notices.length" class="text-xs italic text-center py-6 text-gray-500">
      No pending notice found
    </div>

    <div v-else class="space-y-2">
      <article
        v-for="n in notices"
        :key="n.id"
        class="group flex items-center justify-between gap-2 p-3 border border-gray-100 rounded-lg hover:border-blue-200 transition"
      >
        <!-- Left -->
        <div class="flex items-start gap-3 min-w-0">
          <span
            class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium mt-0.5"
            :class="!n.user_feedback ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'"
          >
            <span
              class="h-2 w-2 rounded-full"
              :class="!n.user_feedback ? 'bg-rose-600 animate-pulse' : 'bg-emerald-600'"
            ></span>
          </span>

          <div class="min-w-0">
            <h3 class="text-sm font-medium text-gray-900 truncate">
              {{ n.title || 'Untitled notice' }}
            </h3>
            <p class="text-[11px] text-gray-500 mt-0.5">
              <i class="fas fa-calendar-alt text-gray-400 mr-1"></i>
              {{ prettyDate(n.published_at) }}
            </p>
          </div>
        </div>

        <!-- Right -->
        <RouterLink
          :to="n.type === 1 ? `/notice-details/${n.id}` : `/policy-details/${n.id}`"
          class="shrink-0 inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 text-xs font-semibold"
        >
          View <i class="fas fa-arrow-right text-[10px]"></i>
        </RouterLink>
      </article>
    </div>

    <!-- Modal -->
    <OverlyModal
      v-if="firstUnreadNotice"
      :show="showUnreadModal"
      @close="showUnreadModal = false"
    >
      <template #default>
        <div class="text-base font-semibold text-gray-800 flex items-center gap-2 p-3">
          <i class="fas fa-bell text-blue-600"></i>
          {{ firstUnreadNotice.title || 'New notice' }}
        </div>

        <div class="space-y-4 px-3 pb-4">
          <p class="text-xs text-gray-500 flex items-center gap-2">
            <i class="fas fa-calendar-alt text-gray-400"></i>
            Published: {{ prettyDate(firstUnreadNotice.published_at) }}
          </p>

          <p class="text-sm text-gray-700">
            You must read this notice before proceeding.
          </p>

          <div class="flex justify-end gap-2 mt-2">
            <button
              @click="showUnreadModal = false"
              class="bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium px-3 py-1.5 rounded-md transition text-sm"
            >
              Later
            </button>
            <button
              @click="goToDetails(firstUnreadNotice)"
              class="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-1.5 rounded-md transition text-sm"
            >
              Read
            </button>
          </div>
        </div>
      </template>
    </OverlyModal>
  </div>
</template>

