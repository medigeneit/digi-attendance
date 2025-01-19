<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const currentRoute = window.location.origin + router.currentRoute.value.fullPath

const copyStatus = ref('')

const shareWhatsApp = () => {
  const url = `https://wa.me/?text=${encodeURIComponent(currentRoute)}`
  window.open(url, '_blank')
}

const shareMessenger = () => {
  const url = `fb-messenger://share?link=${encodeURIComponent(currentRoute)}`
  window.open(url, '_blank')
}

const shareTelegram = () => {
  const url = `https://t.me/share/url?url=${encodeURIComponent(currentRoute)}`
  window.open(url, '_blank')
}

const copyLink = () => {
  navigator.clipboard.writeText(currentRoute).then(() => {
    copyStatus.value = 'fad fa-copy text-gray-700 text-xl'
    setTimeout(() => {
      copyStatus.value = ''
    }, 3000)
  })
}
</script>

<template>
  <div class="card-bg flex-row justify-center gap-4 items-center p-4 print:hidden">
    <h4 class="title-md">Share Link:</h4>
    <button @click="shareWhatsApp" class="btn-icon" title="Share on WhatsApp">
      <i class="fab fa-whatsapp text-green-500 text-xl"></i>
    </button>
    <button @click="shareTelegram" class="btn-icon" title="Share on Telegram">
      <i class="fab fa-telegram text-blue-500 text-xl"></i>
    </button>
    <button @click="shareMessenger" class="btn-icon" title="Share on Messenger (Mobile Only)">
      <i class="fab fa-facebook-messenger text-blue-600 text-xl"></i>
    </button>
    <button @click="copyLink" class="btn-icon" title="Copy Link">
      <i v-if="!copyStatus" class="fas fa-link text-gray-700 text-xl"></i>
      <i v-if="copyStatus" :class="copyStatus"></i>
    </button>
  </div>
</template>
