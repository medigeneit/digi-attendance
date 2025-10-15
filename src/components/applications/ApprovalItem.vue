<script setup>
import { useNotificationStore } from '@/stores/notification'
import { computed } from 'vue'
import AcceptAndRejectHandler from './AcceptAndRejectHandler.vue'

const { application, type, item, onAction } = defineProps({
  application: Object,
  type: String,
  item: String,
  date: String,
  onAction: {
    type: Function,
    default: () => {},
  },
})

const notificationStore = useNotificationStore()

const title = computed(() => {
  if (!item) return ''
  return item
    .replace(/[_-]/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
})

const approvalKey = computed(() => {
  let key = ''

  switch (type) {
    case 'overtime_applications':
      key = 'overtime_approval'
      break
    case 'leave_applications':
      key = 'leave_approval'
      break
    default:
      key = 'other_approval'
      break
  }

  return key
})

const itemUser = computed(() => application?.[`${item}_user`])
const itemUserId = computed(() => application?.[`${item}_user_id`])
const itemNote = computed(() => application?.[`${item}_note`] || '')

const approvalUser = computed(() => application?.user?.[approvalKey.value]?.[`${item}_user`] || {})

const hasPermission = computed(() => notificationStore.approvalPermissions?.[`allow_${item}`])

const isApproved = computed(() => {
  if (!application.status || !itemUserId.value) {
    return false
  }

  if (item === 'handover') {
    const isNotRejectedOrRejectedByOther =
      application.status !== 'Rejected' ||
      application.rejected_by_user_id !== application.handover_user_id

    return isNotRejectedOrRejectedByOther
  }

  return true
})

const isPending = computed(
  () =>
    (item === 'handover' && application?.handover_user_id) ||
    application?.user?.[approvalKey.value]?.[`${item}_user_id`],
)
</script>

<template>
  <div class="flex flex-col justify-center items-center text-sm md:text-base text-center">
    <div v-if="itemUserId" class="text-center">
      <p class="text-center">{{ itemUser?.name || '' }}</p>

      <div class="text-xs text-gray-400 text-center">
        <i v-if="date" class="far fa-clock"></i> {{ date }}
        <span v-if="itemNote"> — {{ itemNote }}</span>
      </div>
    </div>
    <p v-else class="text-center">
      {{ approvalUser?.name || 'N/A' }}
    </p>

    <AcceptAndRejectHandler
      v-if="hasPermission"
      :notificationType="type"
      :applicationId="application.id"
      :onSuccess="onAction"
    />

    <hr class="w-36 md:w-44 border-black my-1 mx-auto" />

    <div class="font-bold">
      {{ title }}
      <span v-if="isApproved" class="text-green-600">(✔)</span>
      <span v-else-if="isPending" class="pl-2 text-yellow-700">
        <i class="fad fa-spinner"></i>
      </span>
    </div>
  </div>
</template>
