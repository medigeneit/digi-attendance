<script setup>
import { useChatStore } from '@/stores/chat';

const chatStore = useChatStore()
</script>

<template>
  <label for="search" class="grow shrink relative block">
    <i class="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-[#24A1DE]"></i>
    <input
      id="search"
      placeholder="Search Conversations..."
      type="search"
      class="input-1 pl-10 pr-2 rounded-b-none border-none outline-[#24a0deb0] py-[15px] rounded-none rounded-tl-lg"
      v-model="chatStore.searchText"
    />
  </label>
</template>
