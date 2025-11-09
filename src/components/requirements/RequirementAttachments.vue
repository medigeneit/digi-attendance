<template>
  <div class="card-bg p-4 pt-2" v-if="attachments && attachments.length">
    <div v-if="attachments && attachments.length">
      <h4 class="text-gray-900 font-semibold mb-3 border-b font-e">Attachments</h4>

      <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 w-full">
        <div
          v-for="(file, index) in attachments"
          :key="index"
          class="border rounded aspect-square flex items-center justify-center bg-gray-50 relative"
          tabindex="0"
          @click.prevent="selectedFile = file"
        >
          <!-- Image preview -->
          <img
            v-if="isImage(file)"
            :src="fileUrl(file)"
            alt="attachment"
            class="object-cover w-full h-full rounded"
          />

          <!-- PDF preview -->
          <a
            v-else-if="isPDF(file)"
            :href="fileUrl(file)"
            target="_blank"
            class="text-xs text-blue-600 text-center break-words hover:underline"
          >
            <i class="fas fa-file-pdf fa-2x mb-1 text-amber-700"></i>
            <div class="whitespace-nowrap text-xs mt-1">Open PDF</div>
          </a>

          <!-- Unknown file type -->
          <span v-else class="text-xs text-gray-500 text-center">Unknown</span>
        </div>
      </div>
    </div>

    <OverlyModal v-if="selectedFile" class="*:max-w-4xl *:min-h-[60vh]">
      <div class="border-b flex items-center px-2 py-1">
        <h2 class="text-xl font-semibold">Attachment preview</h2>
        <a
          :href="fileUrl(selectedFile)"
          target="_blank"
          class="text-sky-600 hover:text-sky-400 hover:underline ml-2"
        >
          <i class="fas fa-external-link"></i> <span class="hidden md:inline">Open In New tab</span>
        </a>
        <button @click.prevent="selectedFile = null" class="btn-icon ml-auto">&times;</button>
      </div>
      <div class="mt-4 p-2">
        <!-- Image preview -->
        <img
          v-if="isImage(selectedFile)"
          :src="fileUrl(selectedFile)"
          alt="attachment"
          class="object-cover w-full h-full rounded"
        />

        <!-- PDF preview -->
        <iframe
          v-else-if="isPDF(selectedFile)"
          :src="fileUrl(selectedFile)"
          class="w-full h-[60vh] border rounded-md"
        />
      </div>
    </OverlyModal>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import OverlyModal from '../common/OverlyModal.vue'

// Props
const props = defineProps({
  requirement: {
    type: Array,
    default: () => [],
  },
})

const attachments = computed(() => {
  return props.requirement?.attachments || []
})

const selectedFile = ref(null)

// Helper functions
function isImage(file) {
  if (!file) return false
  const ext = fileExtension(file)
  return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'].includes(ext)
}

function isPDF(file) {
  return fileExtension(file) === 'pdf'
}

function fileExtension(file) {
  if (typeof file === 'string') {
    return file.split('.').pop().toLowerCase()
  }
  return ''
}

function fileUrl(file) {
  // If Laravel stores full URL, use directly; otherwise, prepend base path
  return file.startsWith('http')
    ? file
    : `${import.meta.env.VITE_API_BASE_URL || ''}/storage/${file}`
}
</script>
