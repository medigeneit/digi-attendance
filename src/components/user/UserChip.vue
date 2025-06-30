<script setup>
import UserAvatar from '@/components/UserAvatar.vue'
defineProps({ user: Object, hideEmployeeId: { type: Boolean, default: false } })
</script>
<template>
  <div
    class="inline-flex items-center gap-2 border rounded-full px-1 py-0.5 bg-slate-100 shadow-sm"
    :title="user?.name"
  >
    <UserAvatar :user="user" class="w-6 h-6 !text-xs" />
    <span class="text-xs text-gray-700 mr-2 flex items-center gap-1">
      <span
        class="text-gray-900 font-semibold w-full"
        :class="{ '  ': user.employee_id && !hideEmployeeId }"
        >{{ user?.name }}</span
      >
      <span v-if="user.employee_id && !hideEmployeeId" class="text-gray-500">
        {{ user.employee_id }}</span
      >
    </span>
    <slot name="after" :user="user"></slot>
  </div>
</template>
