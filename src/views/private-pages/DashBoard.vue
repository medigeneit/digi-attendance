<template>
  <DashboardAdminView v-if="isAdmin && authStore.isAdminMood" />
  <DashboardEmployeeView v-else />

  <OverlyModal
    v-if="showPendingNoticeModal"
    :close-on-backdrop="false"
    @close="closePendingNoticeModal"
  >
    <div class="overflow-hidden rounded-2xl bg-white">
      <header class="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
        <div>
          <p class="text-[11px] font-bold uppercase tracking-[0.22em] text-blue-600">Pending Notices</p>
          <h2 class="mt-1 text-lg font-semibold text-slate-900">Please review your unread notices</h2>
        </div>
        <button
          type="button"
          class="inline-flex h-8 w-8 flex-none items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          aria-label="Close pending notices"
          @click="closePendingNoticeModal"
        >
          <i class="far fa-times"></i>
        </button>
      </header>

      <div class="max-h-[60vh] divide-y divide-slate-100 overflow-y-auto">
        <article v-for="notice in unreadNotices" :key="notice.id" class="flex gap-3 px-5 py-4">
          <span class="inline-flex h-10 w-10 flex-none items-center justify-center rounded-lg bg-blue-50 text-blue-600">
            <i class="far fa-bell"></i>
          </span>
          <div class="min-w-0 flex-1">
            <RouterLink
              :to="notice.type === 1 ? `/notice-details/${notice.id}` : `/policy-details/${notice.id}`"
              class="block text-sm font-semibold text-slate-900 hover:text-blue-700"
              @click="closePendingNoticeModal"
            >
              {{ notice.title || 'Untitled notice' }}
            </RouterLink>
            <p class="mt-1 text-[11px] text-slate-500">{{ formatNoticeTime(notice.published_at) }}</p>
          </div>
        </article>
      </div>

      <footer class="flex flex-wrap items-center justify-end gap-2 border-t border-slate-200 px-5 py-4">
        <button
          type="button"
          class="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
          @click="closePendingNoticeModal"
        >
          Later
        </button>
        <RouterLink
          :to="{ name: 'NoticeView' }"
          class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
          @click="closePendingNoticeModal"
        >
          View All
        </RouterLink>
      </footer>
    </div>
  </OverlyModal>
</template>

<script setup>
import OverlyModal from '@/components/common/OverlyModal.vue'
import DashboardAdminView from '@/components/dashboard/DashboardAdminView.vue'
import DashboardEmployeeView from '@/components/dashboard/DashboardEmployeeView.vue'
import { useAuthStore } from '@/stores/auth'
import { useNoticeStore } from '@/stores/notice'
import { useUserStore } from '@/stores/user'
import { storeToRefs } from 'pinia'
import { computed, onMounted, ref, watch } from 'vue'

const authStore = useAuthStore()
const noticeStore = useNoticeStore()
const userStore = useUserStore()
const { user } = storeToRefs(authStore)
const { notices } = storeToRefs(noticeStore)
const showPendingNoticeModal = ref(false)
const dismissedPendingNoticeKeys = ref([])

const isAdmin = computed(() => ['admin', 'super_admin', 'developer'].includes(user?.value?.role))
const unreadNotices = computed(() =>
  (notices.value || []).filter((notice) => !notice?.user_feedback).slice(0, 5),
)
const pendingNoticeModalKey = computed(() => {
  const ids = unreadNotices.value.map((notice) => notice.id).filter(Boolean).join(',')
  return ids ? `dashboard-pending-notices:${ids}` : ''
})

function formatNoticeTime(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(date)
}

function openPendingNoticeModal() {
  const key = pendingNoticeModalKey.value
  if (!unreadNotices.value.length || !key) return
  if (dismissedPendingNoticeKeys.value.includes(key)) return
  showPendingNoticeModal.value = true
}

function closePendingNoticeModal() {
  const key = pendingNoticeModalKey.value
  if (key && !dismissedPendingNoticeKeys.value.includes(key)) {
    dismissedPendingNoticeKeys.value = [...dismissedPendingNoticeKeys.value, key]
  }
  showPendingNoticeModal.value = false
}

onMounted(async () => {
  if (!user.value) {
    await authStore.fetchUser()
  }
  await noticeStore.fetchUserNotices()
  openPendingNoticeModal()
  await userStore.fetchUserDashboardData()
})

watch(unreadNotices, openPendingNoticeModal)
</script>
