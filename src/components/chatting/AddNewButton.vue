<script setup>
import { useAuthStore } from '@/stores/auth'
import { useChatStore } from '@/stores/chat'

const chatStore = useChatStore()
const authStore = useAuthStore()

const openModal = () => {
  chatStore.openAddModal = true
}
</script>

<template>
  <div
    v-if="['super_admin', 'developer'].includes(authStore.user.role)"
    @click="openModal"
    title="Add New Conversation"
    class="size-10 shrink-0 grow-0 flex justify-center items-center"
  >
    <i class="fas fa-comment-alt-plus text-3xl cursor-pointer text-[#24A1DE]"></i>
  </div>
</template>
