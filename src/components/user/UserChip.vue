<script setup>
import UserAvatar from '@/components/UserAvatar.vue'
defineProps({ user: Object })
</script>
<template>
  <div
    class="inline-flex items-center gap-2 border rounded-full px-1 py-0.5 bg-slate-100 shadow-sm"
    :title="user?.name"
  >
    <UserAvatar :user="user" class="w-6 h-6 !text-xs" />
    <span class="text-xs text-gray-700 mr-2 flex items-center gap-1">
      <span>{{ user.id }}</span> -
      <span class="line-clamp-1">{{ user?.name }} </span>
    </span>
  </div>
</template>
