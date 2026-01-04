<script setup>
import UserAvatar from '@/components/UserAvatar.vue'
import UserHoverBubble from './UserHoverBubble.vue'
defineProps({
  user: Object,
  hideEmployeeId: { type: Boolean, default: false },
  avatarClass: { type: [String, Object], default: '' },
  avatarSize: { type: String, default: 'small' },
  titleClass: { type: [String, Object], default: '' },
  showDetailsOnAvatarHover: { type: Boolean, default: false },
})
</script>
<template>
  <div
    class="inline-flex items-center border rounded-full px-1 py-0.5 bg-slate-100 shadow-sm gap-1"
    :title="`${user?.id ? user?.id + ' - ' : ''} ${user?.employee_id ? user?.employee_id + ' - ' : ''} ${user?.name}`"
  >
    <UserHoverBubble :user="user" v-if="showDetailsOnAvatarHover">
      <template #trigger>
        <UserAvatar :user="user" class="avatar !text-xs" :class="avatarClass" :size="avatarSize" />
      </template>
    </UserHoverBubble>
    <UserAvatar
      v-else
      :user="user"
      class="avatar !text-xs"
      :class="avatarClass"
      :size="avatarSize"
    />

    <div class="text-xs">
      <div class="flex items-center" :class="titleClass">
        <span
          class="text-gray-400 mr-1 whitespace-nowrap"
          v-if="user?.employee_id && !hideEmployeeId"
        >
          {{ user?.employee_id }} -
        </span>
        <div>
          <span
            class="text-gray-800 font-semibold w-full line-clamp-1"
            :class="{ '  ': user?.employee_id && !hideEmployeeId }"
          >
            {{ user?.name }}
          </span>
          <slot name="name-bottom"></slot>
        </div>
      </div>
      <slot name="title-bottom"></slot>
    </div>
    <slot name="after" :user="user"></slot>
  </div>
</template>
