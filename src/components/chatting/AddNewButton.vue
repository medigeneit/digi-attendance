<script setup>
import { useChatStore } from '@/stores/chat'

const chatStore = useChatStore()

const openModal = () => {
  chatStore.openAddModal = true
}
</script>

<template>
  <div
    @click="openModal"
    title="Add New Conversation"
    class="size-9 shrink-0 grow-0 flex justify-center items-center"
  >
    <i class="fas fa-comment-alt-plus text-3xl cursor-pointer text-[#24A1DE]"></i>
  </div>
</template>
