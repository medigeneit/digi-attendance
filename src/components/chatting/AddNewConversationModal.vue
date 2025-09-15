<script setup>
import { useChatStore } from '@/stores/chat';

const chatStore = useChatStore()

function submit() {
  console.log('Submitting...')
}

const closeModal = () => {
  chatStore.openAddModal = false
}
</script>

<template>
  <div
    v-if="chatStore.openAddModal"
    class="fixed inset-0 w-screen h-screen bg-black bg-opacity-50 flex justify-center items-center z-[9999]"
    @click.self="closeModal"
  >
    <div class="bg-white rounded-lg p-6 w-full max-w-xl">
      <h2 class="text-xl font-semibold text-center">Add New Conversation</h2>
      <hr class="my-3" />
      <form @submit.prevent="submit">
        <div class="mb-4">
          <label class="block text-gray-700 mb-2" for="title">Title</label>
          <input
            id="title"
            type="text"
            class="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter conversation title"
          />
        </div>
        <div class="mb-4">
          <label class="block text-gray-700 mb-2" for="participants">Participants</label>
          <input
            id="participants"
            type="text"
            class="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter participant usernames"
          />
        </div>
        <hr class="my-3" />
        <div class="flex justify-between">
          <button
            type="button"
            class="mr-2 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
            @click.self="closeModal"
          >
            Cancel
          </button>
          <button
            type="submit"
            class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Create
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
