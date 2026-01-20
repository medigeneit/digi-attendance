<script setup>
import { useNotificationStore } from '@/stores/notification'
import { computed } from 'vue'
import AcceptAndRejectHandler from './AcceptAndRejectHandler.vue'

const props = defineProps({
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

const approvalKey = computed(() => {
  switch (props.type) {
    case 'overtime_applications':
      return 'overtime_approval'
    case 'leave_applications':
      return 'leave_approval'
    default:
      return 'other_approval'
  }
})

/**
 * ✅ RULE:
 * - If application has actor user (ex: application.approved_by_user) use it
 * - Else fallback to configured approver user from application.user.leave_approval.approved_by_user
 * - Exception:
 *    - handover_user -> application.handover_user
 *    - rejected_by_user -> application.rejected_by_user
 */
const displayUser = computed(() => {
  const a = props.application || {}
  const u = a.user || {}
  const approval = u?.[approvalKey.value] || {}

  if (props.item === 'handover') return a.handover_user || null
  if (props.item === 'rejected_by') return a.rejected_by_user || null // (if you ever pass item="rejected_by")

  // general case: ex item="approved_by" => key "approved_by_user"
  const actorKey = `${props.item}_user`
  return a?.[actorKey] || approval?.[actorKey] || null
})

const displayUserId = computed(() => {
  const a = props.application || {}
  const u = a.user || {}
  const approval = u?.[approvalKey.value] || {}

  // handover/rejected id live on application
  if (props.item === 'handover') return a.handover_user_id || null
  if (props.item === 'rejected_by') return a.rejected_by_user_id || null

  const idKey = `${props.item}_user_id`
  // If the actor is set it will be on application.*_user_id
  // fallback to approval chain user_id
  return a?.[idKey] || approval?.[idKey] || null
})

const displayNote = computed(() => {
  const a = props.application || {}
  const noteKey = `${props.item}_note`
  return a?.[noteKey] || ''
})

const hasPermission = computed(() => notificationStore.approvalPermissions?.[`allow_${props.item}`])

const isApproved = computed(() => {
  const a = props.application || {}

  if (!a.status || !displayUserId.value) return false

  // special: handover can be invalid if rejected by same handover user
  if (props.item === 'handover') {
    const isNotRejectedOrRejectedByOther =
      a.status !== 'Rejected' || a.rejected_by_user_id !== a.handover_user_id
    return isNotRejectedOrRejectedByOther
  }

  return true
})

const isPending = computed(() => {
  const a = props.application || {}
  const u = a.user || {}
  const approval = u?.[approvalKey.value] || {}

  if (props.item === 'handover') return !!a.handover_user_id

  return !!approval?.[`${props.item}_user_id`]
})
</script>

<template>
  <div class="flex flex-col justify-center items-center text-sm md:text-base text-center">
    <!-- ✅ Show actor/assigned user -->
    <div v-if="displayUser" class="text-center">
      <p class="text-center">{{ displayUser?.name || '' }}</p>

      <div
        v-if="displayNote"
        class="text-xs text-gray-400 text-center max-w-[250px] md:max-w-[350px] mx-auto"
      >
        {{ displayNote }}
      </div>
    </div>

    <p v-else class="text-center">N/A</p>

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
