<script setup>
import LoaderView from '@/components/common/LoaderView.vue'
import ApproveAndReject from '@/components/task-notifications/ApproveAndReject.vue'
import { useTaskNotificationStore } from '@/stores/task-notification'
import { storeToRefs } from 'pinia'
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const notificationStore = useTaskNotificationStore()
const { notifications, notification_count } = storeToRefs(notificationStore)
const loading = ref(false)

onMounted(async () => {
  if (route.params.type) {
    loading.value = true
    notificationStore.fetchTaskNotification(route.params.type)
    loading.value = false
  }
})

watch(
  () => route.params.type,
  async (newType, oldType) => {
    if (newType && newType !== oldType) {
      loading.value = true
      notificationStore.fetchTaskNotification(newType)
      loading.value = false
    }
  },
)

const showRoute = (notification) => {
  if (route.params.type == 'pending-requirements') {
    return {
      name: 'RequirementShow',
      params: { id: notification.application_id },
    }
  }
}

const formattedType = computed(() => {
  if (!route.params.type) return ''
  return route.params.type
    .replace(/[_-]/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
})
</script>

<template>
  <div class="my-container space-y-6 px-4 py-4">
    <h2 class="md:text-2xl font-semibold capitalize text-gray-700">
      {{ formattedType || 'Notifications' }}
      <span
        v-if="notification_count[route.params.type]"
        class="ml-auto text-xs bg-red-500 text-white rounded-full px-2 py-0.5 font-semibold"
      >
        {{ notification_count[route.params.type] }}
      </span>
    </h2>
    <div v-if="loading" class="text-center text-red-500 py-10 text-xl italic">
      <LoaderView />
    </div>
    <div v-else-if="notifications.length" class="space-y-4">
      <div
        v-for="notification in notifications"
        :key="notification.application_id"
        class="bg-white p-3 md:p-4 rounded-xl shadow border grid gap-2"
      >
        <div class="flex gap-2 md:gap-3 items-center">
          <!-- <div class="shrink-0 grow-0 btn-1 size-8 p-0">{{ icons[route.params.type] }}</div> -->
          <div class="shrink grow font-semibold text-sm md:text-base">
            <div
              class="flex items-center text-green-600 text-xs md:text-sm lg:text-base"
              v-html="notification.title"
            ></div>
            <div>
              {{ notification.user_name }}
            </div>
          </div>
          <div class="ml-auto shrink-0 grow-0 flex gap-2 md:gap-3 items-center">
            <!-- {{ showRoute(notification) }} -->
            <RouterLink :to="showRoute(notification)" class="btn-1 px-3">
              <i class="far fa-eye"></i>
            </RouterLink>
          </div>
        </div>

        <div
          class="flex items-center text-red-600 text-xs md:text-sm lg:text-base"
          v-html="notification.description"
        ></div>

        <div
          v-if="notification.type"
          class="flex flex-wrap gap-y-1 gap-x-3 items-center text-xs md:text-sm lg:text-base"
        >
          <div v-if="notification.type">
            <span class="text-gray-400">Type:</span>
            {{ notification.type }}
          </div>
        </div>

        <div class="flex gap-3 items-center">
          <div class="flex items-center gap-8">
            <p
              v-if="notification.messages?.length"
              class="flex flex-wrap flex-col md:flex-row gap-x-1 text-xs md:text-sm text-left"
            >
              <template v-for="(message, index) in notification.messages" :key="index">
                <span v-if="index" class="hidden md:inline font-bold">|</span>
                <span v-html="message" class="text-black"></span>
              </template>
            </p>
          </div>

          <ApproveAndReject
            class="ml-auto"
            :notificationType="route.params.type"
            :applicationId="notification?.application_id"
            :onSuccess="onSuccess"
            :variant="2"
          />
        </div>
      </div>
    </div>
  </div>
</template>
