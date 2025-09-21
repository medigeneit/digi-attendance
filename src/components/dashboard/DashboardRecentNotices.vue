<script setup>
import { useUserStore } from '@/stores/user'
import { storeToRefs } from 'pinia'
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import OverlyModal from '../common/OverlyModal.vue'

const userStore = useUserStore()
const { userDashboard } = storeToRefs(userStore)
const router = useRouter()

const unreadNotice = computed(() => {
  if (userDashboard.value && userDashboard.value.notices) {
    const firstUnread = userDashboard.value?.notices?.find((n) => !n.user_feedback)
    if (firstUnread) {
      return firstUnread
    }
  }
  return null
})

const goToDetails = () => {
  if (!unreadNotice.value) return

  const path =
    unreadNotice.value.type === 1
      ? `/notice-details/${unreadNotice.value.id}`
      : `/policy-details/${unreadNotice.value.id}`

  router.push(path)
}
</script>

<template>
  <div class="bg-white shadow-md rounded-lg p-4">
    <div class="flex justify-between items-start mb-1">
      <div class="flex items-center">
        <i class="fas fa-file mr-2 h-5 w-5"></i>
        <h2 class="text-xl font-semibold">Notices</h2>
      </div>
    </div>
    <hr class="mb-3" />

    <div class="space-y-3">
      <div
        v-if="userDashboard.notices?.length === 0"
        class="text-xs italic text-center py-4 text-gray-500"
      >
        No pending notice found
      </div>
      <template v-else>
        <div
          v-for="(notice, index) in userDashboard.notices"
          :key="index"
          class="flex items-center justify-between p-4 border rounded-lg shadow-sm hover:shadow transition-all bg-white"
        >
          <!-- Left Section: Status + Title -->
          <div class="flex items-center space-x-4">
            <!-- Status Circle with Tooltip -->
            <div
              :class="['rounded-full', !notice.user_feedback ? 'bg-red-100' : 'bg-green-100']"
              class="h-8 w-8 flex items-center justify-center rounded-full flex-shrink-0"
            >
              <span
                v-if="!notice.user_feedback"
                class="h-3 w-3 bg-red-600 rounded-full inline-block"
              ></span>

              <span v-else class="inline-block">
                <i class="far fa-check text-green-600"></i>
              </span>

              <div
                class="absolute top-10 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs rounded py-1 px-2 opacity-0 group-hover:opacity-100 transition pointer-events-none z-10 whitespace-nowrap"
              >
                {{ !notice.user_feedback ? 'Feedback Pending' : 'Feedback Submitted' }}
              </div>
            </div>

            <!-- Notice Details -->
            <div>
              <p class="text-sm font-medium text-gray-900">{{ notice.title }}</p>
              <p class="text-xs text-gray-500 mt-0.5">{{ notice.published_at }}</p>
            </div>
          </div>

          <!-- Right Section: View Button -->
          <RouterLink
            :to="
              notice.type === 1 ? `/notice-details/${notice.id}` : `/policy-details/${notice.id}`
            "
            class="text-blue-600 hover:text-blue-800 font-semibold text-sm"
          >
            View
          </RouterLink>
        </div>
      </template>

      <OverlyModal v-if="unreadNotice" :show="true" @close="unreadNotice = null">
        <template #default>
          <div class="text-xl font-bold text-gray-800 flex items-center gap-2 p-4">
            <i class="fas fa-bell text-blue-500"></i>
            {{ unreadNotice.title }}
          </div>

          <div class="space-y-5 px-4 md:px-6 py-4">
            <!-- Published Info -->
            <p class="text-sm text-gray-500 flex items-center gap-2">
              <i class="fas fa-calendar-alt text-gray-400"></i>
              Published: {{ unreadNotice.published_at }}
            </p>

            <!-- Instruction -->
            <p class="text-base text-gray-700 leading-relaxed">
              You must read this notice before proceeding.
            </p>

            <!-- Actions -->
            <div class="flex justify-end gap-3 mt-6">
              <button
                @click="unreadNotice = null"
                class="bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium px-5 py-2 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                @click="goToDetails"
                class="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2.5 rounded-lg shadow transition"
              >
                Read Details
              </button>
            </div>
          </div>
        </template>
      </OverlyModal>
    </div>
  </div>
</template>
