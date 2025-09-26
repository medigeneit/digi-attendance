<script setup>
import { useChatStore } from '@/stores/chat'
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'

const chatStore = useChatStore()

const isLoading = ref(false)
const calledConvs = new Set()
const bannerRef = ref(null)
let io = null

async function readAllMessage() {
  console.log('read calling...')
  isLoading.value = true
  try {
    if (chatStore.activeConversationId) {
      await chatStore.readAllForActiveConversation(chatStore.activeConversationId)
    }
  } catch (_) {
    // ignore / toast দিতে পারো
  } finally {
    isLoading.value = false
  }
}

const convId = computed(() => chatStore.activeConversation?.id ?? null)
const bannerVisible = computed(() => (chatStore.activeConversation?.unread?.count ?? 0) > 0)
const isFirstTime = computed(
  () => (chatStore.activeConversation?.unread?.last_read_message_id ?? 0) === 0,
)

/* ---- ব্যানার ভিউপোর্টে ঢুকলে একবার কল ---- */
function setupObserver() {
  if (!bannerRef.value || io) return
  // নিজের স্ক্রল কনটেইনার হলে সেটার সিলেক্টর দিন; না হলে null রাখুন (window)
  const root = document.querySelector('#chatScroll') || null
  io = new IntersectionObserver(
    (entries) => {
      const e = entries[0]
      if (e.isIntersecting && e.intersectionRatio > 0.6) {
        const id = convId.value
        if (id && !calledConvs.has(id)) {
          calledConvs.add(id)
          readAllMessage()
        }
        teardownObserver()
      }
    },
    { root, threshold: [0, 0.6, 1] },
  )
  io.observe(bannerRef.value)
}

function teardownObserver() {
  if (io) {
    io.disconnect()
    io = null
  }
}

watch(
  [bannerVisible, convId],
  async ([visible, id]) => {
    // কনভার্সেশন বদলালে/ব্যানার শো-হাইড হলে পুরোনো অবজারভার বন্ধ করে নতুন সেটআপ
    teardownObserver()
    if (!visible || !id || calledConvs.has(id)) return
    await nextTick() // এলিমেন্ট DOM-এ এলে তবেই observe
    setupObserver()
  },
  { immediate: true },
)

onBeforeUnmount(teardownObserver)
</script>

<template>
  <div
    v-if="bannerVisible"
    ref="bannerRef"
    class="relative flex justify-center items-center"
    :class="isFirstTime ? 'order-1' : 'order-3'"
  >
    <p
      class="py-px text-xs md:text-sm bg-gray-300 text-black italic font-thin rounded-lg px-4 z-10"
    >
      {{ chatStore.activeConversation?.unread?.count }} unread message
    </p>
    <span
      class="absolute h-2 bg-gray-300 left-0 right-0 top-1/2 -translate-y-1/2 w-full rounded-lg"
    ></span>
  </div>
</template>
