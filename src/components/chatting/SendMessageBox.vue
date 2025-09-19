<script setup>
import { useChatStore } from '@/stores/chat'
import { nextTick, onMounted, ref } from 'vue'

const chatStore = useChatStore()
const text = ref('')
const taRef = ref(null)

function autoResize() {
  const ta = taRef.value
  if (!ta) return
  ta.style.height = 'auto'
  ta.style.height = ta.scrollHeight + 'px'
}

async function submit() {
  const body = text.value
    .replace(/\u00a0/g, ' ')
    .replace(/\r\n?/g, '\n')
    .trim()
  if (!chatStore.activeConversationId || !body) return

  const msg = await chatStore.createConversationMessage(chatStore.activeConversationId, {
    type: 'text',
    body, // ✅ plain text save
    format: 'plain', // (ঐচ্ছিক) সার্ভারে বোঝাতে
  })

  // ইনপুট ক্লিয়ার + রিসাইজ
  text.value = ''
  await nextTick()
  autoResize()

  // (ঐচ্ছিক) কনভারসেশনকে টপে নিন
  chatStore?.bumpConversationToTop?.(chatStore.activeConversationId, msg)
}

function onKeydown(e) {
  if (e.isComposing) return // Bangla/IME নিরাপদ
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    submit()
  }
  // Shift+Enter => newline (ডিফল্ট বিহেভিয়র রাখছি)
}

onMounted(() => nextTick(autoResize))
</script>

<template>
  <div class="flex items-start gap-2">
    <!-- Attach button (ঐচ্ছিক) -->
    <label
      class="hidden bg-gray-100 text-gray-600 rounded-full px-3 py-2 hover:bg-gray-500 hover:text-white cursor-pointer"
    >
      <input
        type="file"
        class="hidden"
        accept="image/jpg,image/jpeg,image/png,image/gif,application/pdf"
      />
      <i class="far fa-paperclip text-xl"></i>
    </label>

    <!-- Textarea input -->
    <div class="w-full border-2 border-blue-100 rounded-3xl bg-gray-100 px-4 py-2">
      <textarea
        ref="taRef"
        v-model="text"
        @input="autoResize"
        @keydown="onKeydown"
        rows="1"
        placeholder="Write a message…"
        class="w-full resize-none overflow-hidden bg-transparent outline-none leading-6 max-h-32"
      ></textarea>
    </div>

    <!-- Send -->
    <button
      type="button"
      @click="submit"
      class="bg-blue-100 text-blue-600 rounded-full px-3 py-2 hover:bg-blue-600 hover:text-white"
    >
      <i class="far fa-paper-plane text-xl"></i>
    </button>
  </div>
</template>
