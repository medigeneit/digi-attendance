<script setup>
import { onMounted, ref } from 'vue'
import { useUserStore } from '@/stores/user'
import PhotoModal from '@/components/common/PhotoModal.vue';

const userStore = useUserStore()

const user = ref({})
const isEditing = ref(false)
const name = ref('')
const phone = ref('')
const date_of_birth = ref('')
const address = ref('')

const isPhotoModalOpen = ref(false)
const selectedPhoto = ref(null)
const selectedFile = ref(null)
const isUploading = ref(false)
const isUploadComplete = ref(false)

const openPhotoModal = () => {
  selectedPhoto.value = user.value.photo
  isPhotoModalOpen.value = true
}

const closePhotoModal = () => {
  isPhotoModalOpen.value = false
  selectedFile.value = null
}

const startEditing = () => {
  isEditing.value = true
  name.value = user.value.name
  phone.value = user.value.phone
  date_of_birth.value = user.value.date_of_birth
  address.value = user.value.address
}

const cancelEditing = () => {
  isEditing.value = false
}

const updateProfile = async () => {
  const payload = {
    name: name.value,
    phone: phone.value,
    date_of_birth: date_of_birth.value,
    address: address.value
  }

  await userStore.updateProfile(payload)

  isEditing.value = false

  await fetchUserData()
}

const fetchUserData = async () => {
  await userStore.fetchUser()

  user.value = userStore.user
}

onMounted(async () => {
  await fetchUserData()
})

const handleFileSelected = (file) => {
  selectedFile.value = file
}

const uploadPhoto = async () => {
  if (!selectedFile.value) {
    return
  }

  const formData = new FormData()
  formData.append('photo', selectedFile.value)
  formData.append('user_id', user.value.id)

  try {
    isUploading.value = true
    await userStore.uploadPhoto(formData)
    await fetchUserData()

    isUploadComplete.value = true
    setTimeout(() => {
      closePhotoModal()
      isUploading.value = false
      isUploadComplete.value = false
    }, 1500)
  } catch (error) {
    console.error('Failed to upload photo:', error)
  } finally {
    isUploading.value = false
  }
}
</script>

<template>
  <div class="my-container max-w-xl">
    <div class="card-bg p-4 md:p-8 flex flex-col items-center relative">
      <h1 class="title-lg">My Profile</h1>
      <div
        @click="openPhotoModal"
        class="bg-gray-200 size-40 rounded-full overflow-hidden relative"
      >
      <div class="flex justify-center w-full">
        <img class="object-cover" :src="user.photo" alt="Profile Photo" />

      </div>
      </div>
      <div v-if="!isEditing" class="space-y-4">
        <p class="title-md text-center">{{ user.name }}</p>
        <p><strong>Phone:</strong> {{ user.phone }}</p>
        <p><strong>Date of Birth:</strong> {{ user.date_of_birth }}</p>
        <p><strong>Address:</strong> {{ user.address }}</p>
        <button class="btn-2 absolute top-4 right-4" @click="startEditing">
          <i class="far fa-edit"></i>Edit
        </button>
        <RouterLink class="btn-2" to="/profile/change-password"> Change Password </RouterLink>
      </div>

      <div v-else>
        <h1 class="text-center title-md">Edit Profile</h1>
        <form @submit.prevent="updateProfile" class="space-y-2">
          <div class="flex gap-2 items-center">
            <label for="name">Name:</label>
            <input id="name" v-model="name" type="text" class="input-1" />
          </div>
          <div class="flex gap-2 items-center">
            <label for="phone">Phone:</label>
            <input id="phone" v-model="phone" type="text" class="input-1" />
          </div>
          <div class="flex gap-2 items-center">
            <label for="date_of_birth">Date of Birth:</label>
            <input id="date_of_birth" v-model="date_of_birth" type="date" class="input-1" />
          </div>
          <div class="flex gap-2 items-center">
            <label for="address">Address:</label>
            <input id="address" v-model="address" type="text" class="input-1" />
          </div>
          <div class="flex justify-center gap-4">
            <button class="btn-3" @click="cancelEditing">Cancel</button>
            <button class="btn-2" type="submit">Update</button>
          </div>
        </form>
      </div>
    </div>
  </div>
  <PhotoModal
    :imageSrc="selectedPhoto"
    :isOpen="isPhotoModalOpen"
    @close="closePhotoModal"
    @fileSelected="handleFileSelected"
    @uploadPhoto="uploadPhoto"
  />
</template>
