<script setup>
import { useNotificationStore } from '@/stores/notification'
import { computed } from 'vue'
import AcceptAndRejectHandler from './AcceptAndRejectHandler.vue'

const props = defineProps({
  application: Object,
  type: String,
  item: String,
  onAction: {
    type: Function,
    default: () => {},
  },
})

const notificationStore = useNotificationStore()

const title = computed(() => {
  if (!props.item) return ''
  return props.item
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
  <div class="flex flex-col justify-center items-center">
    <div v-if="application?.[`${item}_user_id`]">
      <p>
        {{ application?.[`${item}_user`]?.name || '' }}
      </p>
      <p class="text-xs text-gray-400 text-center">
        {{ application?.[`${item}_note`] }}
      </p>
    </div>
    <p v-else class="text-center">
      {{ application?.user?.leave_approval?.[`${item}_user`]?.name || 'N/A' }}
    </p>

    <AcceptAndRejectHandler
      v-if="notificationStore.approvalPermissions?.[`allow_${item}`]"
      :notificationType="type"
      :applicationId="application.id"
      :onSuccess="onAction"
    />

    <hr class="w-44 border-black my-1" />

    <div class="font-bold">
      {{ title }}
      <span v-if="application?.[`${item}_user_id`]" class="text-green-600">(✔)</span>
      <span
        v-else-if="application?.user?.leave_approval?.[`${item}_user_id`]"
        class="pl-2 text-yellow-700"
      >
        <i class="fad fa-spinner"></i>
      </span>
    </div>
  </div>
</template>
