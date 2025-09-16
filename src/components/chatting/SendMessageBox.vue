<script setup>
import { useChatStore } from '@/stores/chat'

const chatStore = useChatStore()
</script>

<template>
  <div>
    <div class="flex gap-2 items-start">
      <div class="flex gap-2">
        <label
          class="bg-gray-100 text-gray-600 rounded-full px-3 py-2 hover:bg-gray-500 hover:text-white cursor-pointer"
          ><input
            type="file"
            class="hidden"
            accept="image/jpg, image/jpeg, image/png, image/gif, application/pdf" /><i
            class="far fa-paperclip text-xl"
          ></i
        ></label>
      </div>
      <div class="overflow-hidden rounded-3xl w-full border-2 border-blue-100">
        <div
          :contenteditable="true"
          class="p-2 px-4 rounded-3xl bg-gray-100 break-all max-h-32 min-h-10 overflow-auto scrollbar"
        ></div>
      </div>
      <button
        class="bg-blue-100 text-blue-600 rounded-full px-3 py-2 hover:bg-blue-600 hover:text-white"
      >
        <i class="far fa-paper-plane text-xl"></i>
      </button>
    </div>
  </div>
</template>
