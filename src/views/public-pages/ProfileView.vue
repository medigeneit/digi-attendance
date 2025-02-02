<script setup>
import PhotoModal from '@/components/common/PhotoModal.vue'
import TextSkeleton from '@/components/TextSkeleton.vue'
import { useAuthStore } from '@/stores/auth'
import { useUserStore } from '@/stores/user'
import { storeToRefs } from 'pinia'
import { ref } from 'vue'
import { useToast } from 'vue-toastification'

const userStore = useUserStore()
const authStore = useAuthStore()
const { user } = storeToRefs(authStore)
const toast = useToast()

// const user = ref({})
const isEditing = ref(false)
const name = ref('')
const phone = ref('')
const email = ref('')
const nid = ref('')
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
  email.value = user.value.email
  nid.value = user.value.nid
  date_of_birth.value = user.value.date_of_birth
  address.value = user.value.address
}

const cancelEditing = () => {
  isEditing.value = false
}

const updateProfile = async () => {
  try {
    const payload = {
      name: name.value,
      phone: phone.value,
      email: email.value,
      nid: nid.value,
      date_of_birth: date_of_birth.value,
      address: address.value,
    }

    await authStore.updateProfile(payload)

    isEditing.value = false
    toast.success('Profile updated successfully!')
    return
  } catch (error) {
    console.error('Failed to update profile:', error)
    toast.error(authStore.error || 'Failed to save profile!')
    return
  }
}

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
    await authStore.uploadProfilePhoto(formData)
    // await fetchUserData()

    isUploadComplete.value = true
    setTimeout(() => {
      closePhotoModal()
      isUploading.value = false
      isUploadComplete.value = false
    }, 1500)
    toast.success('Image updated successfully!')
  } catch (error) {
    console.error('Failed to upload photo:', error)
    toast.error(authStore.error || 'Failed to save profile!')
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
          <img
            class="object-cover"
            :src="user?.photo || '/default-avatar.png'"
            alt="Profile Photo"
          />
        </div>
      </div>
      <div v-if="!isEditing" class="space-y-4">
        <p class="title-md text-center">{{ user?.name }}</p>

        <div class="grid grid-cols-2 items-center gap-4">
          <div><strong>Phone:</strong></div>
          <div>
            <TextSkeleton v-if="!user" />
            <span v-else>{{ user?.phone }}</span>
          </div>

          <div><strong>Email:</strong></div>
          <div>
            <TextSkeleton v-if="!user" />
            <span v-else>{{ user?.email }}</span>
          </div>

          <div><strong>NID:</strong></div>
          <div>
            <TextSkeleton v-if="!user" />
            <span v-else>{{ user?.nid }}</span>
          </div>

          <div><strong>Date of Birth:</strong></div>
          <div>
            <TextSkeleton v-if="!user" />
            <span v-else>{{ user?.date_of_birth }}</span>
          </div>

          <div class=""><strong>Address:</strong></div>
          <div class="text-wrap">
            <TextSkeleton v-if="!user" />
            <span v-else>{{ user?.phone }}</span>
          </div>
        </div>

        <button class="btn-2 absolute top-4 right-4" @click="startEditing">
          <i class="far fa-edit"></i> Edit
        </button>

        <RouterLink class="btn-2" to="/profile/change-password"> Change Password </RouterLink>
      </div>

      <div v-else>
        <h1 class="text-center title-md">Edit Profile</h1>
        <form @submit.prevent="updateProfile" class="space-y-2">
          <div class="grid grid-cols-4 items-center">
            <label for="name">Name:</label>
            <input id="name" v-model="name" type="text" class="input-1 col-span-3" />
          </div>
          <div class="grid grid-cols-4 items-center">
            <label for="phone">Phone:</label>
            <input id="phone" v-model="phone" type="text" class="input-1 col-span-3" />
          </div>
          <div class="grid grid-cols-4 items-center">
            <label for="email">Email:</label>
            <input id="email" v-model="email" type="text" class="input-1 col-span-3" />
          </div>
          <div class="grid grid-cols-4 items-center">
            <label for="nid">NID:</label>
            <input id="nid" v-model="nid" type="text" class="input-1 col-span-3" />
          </div>
          <div class="grid grid-cols-4 items-center">
            <label for="date_of_birth">Date of Birth:</label>
            <input id="date_of_birth" v-model="date_of_birth" type="date" class="input-1 col-span-3" />
          </div>
          <div class="grid grid-cols-4 items-center">
            <label for="address">Address:</label>
            <textarea id="address" rows="3" v-model="address" type="text" class="input-1 col-span-3" ></textarea>
          </div>
          <div class="flex justify-center gap-4 pt-4">
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
