<!-- src/components/ScreenshotCapture.vue -->
<script setup>
import html2canvas from 'html2canvas'
import { defineProps } from 'vue'

// Props to accept target section ID
const props = defineProps({
  targetId: String,
  platform: String,
})

// Function to capture screenshot
const captureSectionScreenshot = async () => {
  const element = document.getElementById(props.targetId) // Capture specific section
  if (!element) return

  html2canvas(element, { useCORS: true }).then(async (canvas) => {
    const image = canvas.toDataURL('image/png')

    // Create a Blob from the image data
    const blob = await fetch(image).then((res) => res.blob())
    const file = new File([blob], 'screenshot.png', { type: 'image/png' })

    // Check if Web Share API is available (for direct sharing on mobile)
    if (navigator.share) {
      try {
        await navigator.share({
          files: [file],
          title: 'Screenshot',
          text: 'Check out this screenshot!',
        })
      } catch (error) {
        console.error('Sharing failed:', error)
      }
    } else {
      // Upload image to a temporary image hosting service (Replace API key)
      const formData = new FormData()
      formData.append('image', file)

      const response = await fetch('https://api.imgbb.com/1/upload?key=YOUR_IMGBB_API_KEY', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()
      const imageUrl = data.data.url

      // Generate share link
      let shareUrl = ''
      if (props.platform === 'whatsapp') {
        shareUrl = `https://wa.me/?text=${encodeURIComponent('Check out this screenshot: ' + imageUrl)}`
      } else if (props.platform === 'telegram') {
        shareUrl = `https://t.me/share/url?url=${encodeURIComponent(imageUrl)}`
      }

      window.open(shareUrl, '_blank')
    }
  })
}
</script>

<template>
    <button v-if="platform === 'whatsapp'" @click="captureSectionScreenshot" class="btn-icon">
      <i class="far fa-camera-alt text-xl text-green-500"></i>
    </button>
</template>
