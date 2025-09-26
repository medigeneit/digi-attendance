<script setup>
import { useChatStore } from '@/stores/chat'
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import ChatMessageCard from './ChatMessageCard.vue'
import ConversationLoader from './ConversationLoader.vue'

const chatStore = useChatStore()

const isLoading = ref(false)

/* ====== refs & state ====== */
const scrollEl = ref(null)
const atBottom = ref(true) // ইউজার বটমে আছে কিনা
const loadingOlder = ref(false) // টপে গিয়ে পুরনো লোড হচ্ছে কিনা

/* ====== utils ====== */
const nearBottom = (el, threshold = 80) =>
  el.scrollHeight - el.scrollTop - el.clientHeight < threshold

const scrollToBottom = async (behavior = 'auto') => {
  await nextTick()
  const el = scrollEl.value
  if (!el) return
  el.scrollTo({ top: el.scrollHeight, behavior })
  atBottom.value = true
}

const handleScroll = async () => {
  const el = scrollEl.value
  if (!el) return

  // বটমে আছি কিনা ট্র্যাক করা
  atBottom.value = nearBottom(el)

  // টপে পৌছালে পুরোনো মেসেজ লোড
  if (el.scrollTop <= 0 && chatStore.hasMore && !loadingOlder.value) {
    loadingOlder.value = true
    // স্ক্রল পজিশন ধরে রাখার ট্রিক:
    const prevHeight = el.scrollHeight
    const prevTop = el.scrollTop
    try {
      // তোমার স্টোরের মেথড অনুযায়ী বদলাও (before/after প্যারাম লাগলে দাও)
      await chatStore.fetchOlderMessages(chatStore.activeConversationId)
      await nextTick()
      const newHeight = el.scrollHeight
      // নতুন কন্টেন্ট উপরে যুক্ত হয়েছে—পজিশন এডজাস্ট
      el.scrollTop = newHeight - (prevHeight - prevTop)
    } catch (_) {
      // ignore / toast দিতে পারো
    } finally {
      loadingOlder.value = false
    }
  }
}

/* ====== data fetch ====== */
const fetchData = async () => {
  isLoading.value = true
  try {
    if (chatStore.activeConversationId) {
      await chatStore.fetchConversationMessages(chatStore.activeConversationId)
      await scrollToBottom('auto') // ওপেন করলে একবারে নিচে নামাও
    }
  } catch (e) {
    // store থেকেই error সেট হচ্ছে; চাইলে এখানে toast দিতে পারো
  } finally {
    isLoading.value = false
  }
}

/* ====== lifecycle ====== */
onMounted(() => {
  fetchData()
})

watch(
  () => chatStore.activeConversationId,
  async (newVal, oldVal) => {
    if (newVal && newVal !== oldVal) {
      await fetchData()
    }
  },
)

/* নতুন মেসেজ এলে (length বাড়ে) এবং ইউজার বটমের কাছে থাকলে → বটমে স্ক্রল */
watch(
  () => chatStore.messages.length,
  async (n, o) => {
    const el = scrollEl.value
    if (!el) return
    // শুধু add হলে আর ইউজার বটমের কাছে থাকলে স্ক্রল করবে
    if (n > o && nearBottom(el, 120)) {
      await scrollToBottom('smooth')
    }
  },
)

const showJumpButton = computed(() => !atBottom.value && !!chatStore.activeConversationId)
</script>

<template>
  <div
    ref="scrollEl"
    @scroll="handleScroll"
    class="w-full overflow-y-auto h-[calc(100dvh-150px)] scrollbar-hide relative flex flex-col"
    :class="{
      'items-center justify-center':
        !chatStore.activeConversationId || chatStore.error || isLoading,
    }"
  >
    <ConversationLoader v-if="isLoading" />

    <div v-if="chatStore.error" class="text-red-500 text-center my-4">
      {{ chatStore.error }}
    </div>

    <div v-else-if="!chatStore.activeConversationId" class="text-center text-gray-500 my-4">
      Please select a conversation to view messages.
    </div>

    <template v-else>
      <!-- টপ সেন্টিনেল: এখানে একটা ছোট লোডার দিতে পারো -->
      <div v-if="loadingOlder" class="text-xs text-gray-400 text-center py-2">Loading older…</div>

      <ChatMessageCard
        v-for="(message, index) in chatStore.messages"
        :key="message.id"
        :message="message"
        class="w-full my-4"
        :index="index"
      />
    </template>

    <slot></slot>
  </div>
</template>
