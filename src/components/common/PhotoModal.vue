<script setup>
import { ref, watch } from 'vue'

const emit = defineEmits(['close', 'fileSelected', 'uploadPhoto'])

const fileInput = ref(null)
const isFileSelected = ref(false)
const isUploading = ref(false)
const isUploadComplete = ref(false)

const props = defineProps({
  imageSrc: {
    type: String,
    default: '',
  },
  isOpen: {
    type: Boolean,
    default: false,
  },
})

const isVisible = ref(props.isOpen)
const previewImage = ref(props.imageSrc)

const closeModal = () => {
  isVisible.value = false
  emit('close')
  resetState()
}

const handlePhotoUpload = (event) => {
  const file = event.target.files[0]
  if (file) {
    const reader = new FileReader()
    reader.onload = (e) => {
      previewImage.value = e.target.result
      isFileSelected.value = true
    }
    reader.readAsDataURL(file)
    emit('fileSelected', file)
  }
}

const triggerFileInput = () => {
  fileInput.value.click()
}

const handleAction = () => {
  if (!isFileSelected.value) {
    triggerFileInput()
  } else {
    isUploading.value = true
    emit('uploadPhoto', fileInput.value.files[0])
    setTimeout(() => {
      isUploading.value = false
      isUploadComplete.value = true
    }, 2000)
  }
}

const resetState = () => {
  isFileSelected.value = false
  isUploading.value = false
  isUploadComplete.value = false
}

watch(
  () => props.isOpen,
  (newVal) => {
    isVisible.value = newVal
    if (newVal) {
      previewImage.value = props.imageSrc
      resetState()
    }
  },
)
</script>

<template>
  <div v-if="isVisible" class="modal-bg z-50">
    <div class="modal-card relative">
      <div
        v-if="isUploading"
        class="absolute inset-0 flex items-center justify-center bg-gray-200 bg-opacity-75 z-10"
      >
        <div
          class="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-blue-500"
        ></div>
      </div>
      <img
        v-if="previewImage"
        :src="previewImage"
        alt="Modal Image"
        class="aspect-[3/4] object-cover rounded-md"
      />

      <div class="flex justify-center mt-4">
        <button class="btn-2" @click="handleAction" :disabled="isUploading">
          {{ isFileSelected ? 'Upload Photo' : 'Change Photo' }}
        </button>
      </div>

      <input type="file" ref="fileInput" class="hidden" @change="handlePhotoUpload" />

      <button @click="closeModal" class="absolute top-2 right-2 text-red-500 text-xl">
        <i class="far fa-times-circle"></i>
      </button>
    </div>
  </div>
</template>
