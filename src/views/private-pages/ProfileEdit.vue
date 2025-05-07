<script setup>
import LoaderView from '@/components/common/LoaderView.vue'
import PhotoModal from '@/components/common/PhotoModal.vue'
import ChangePasswordModal from '@/components/user/ChangePasswordModal.vue'
import { useAuthStore } from '@/stores/auth'
import { storeToRefs } from 'pinia'
import { onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'

const form = reactive({
  name: '',
  phone: '',
  email: '',
  nid: '',
  date_of_birth: '',
  address: '',
  blood: '',
})
const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
const authStore = useAuthStore()
const { user } = storeToRefs(authStore)
const toast = useToast()
const router = useRouter()
const isLoading = ref(false)
const changePasswordModal = ref(false)

const isPhotoModalOpen = ref(false)
const selectedPhoto = ref(null)
const selectedFile = ref(null)
const isUploading = ref(false)
const isUploadComplete = ref(false)

// Load user data when the component is mounted
onMounted(() => {
  if (user.value) {
    loadUser()
  }
})

// Watch for changes in the user value
watch(user, (newUser) => {
  if (newUser) {
    loadUser()
  }
})

const openPhotoModal = () => {
  selectedPhoto.value = user.value.photo
  isPhotoModalOpen.value = true
}

const closePhotoModal = () => {
  isPhotoModalOpen.value = false
  selectedFile.value = null
}
const CloseModal = () => {
  changePasswordModal.value = false
}

const handleFileSelected = (file) => {
  selectedFile.value = file
}

const loadUser = () => {
  form.name = user.value?.name || ''
  form.phone = user.value?.phone || ''
  form.email = user.value?.email || ''
  form.address = user.value?.address || ''
  form.nid = user.value?.nid || ''
  form.blood = user.value?.blood || ''
  form.date_of_birth = user.value?.date_of_birth || ''
}

const updateUser = async () => {
  try {
    await authStore.updateProfile(form)
    toast.success('Profile updated successfully!')
    router.push({ name: 'MyProfile' })
  } catch (error) {
    console.error('Failed to update profile:', error)
    toast.error(authStore.error || 'Failed to save profile!')
    return
  }
}

const uploadPhoto = async () => {
  console.log(selectedFile.value)

  if (!selectedFile.value) {
    return
  }

  const formData = new FormData()
  formData.append('photo', selectedFile.value)
  formData.append('user_id', user.value.id)
  console.log({ formData })

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
  <div class="my-container space-y-2">
    <div class="card-bg md:p-8 p-4 mx-4">
      <h2 class="title-lg text-center">Edit Profile</h2>
      <LoaderView v-if="isLoading" class="bg-gray-100 border shadow-none" />
      <form v-else @submit.prevent="updateUser" class="space-y-4">
        <div class="grid gap-4">
          <div class="border p-4 rounded-md bg-gray-100">
            <div class="flex justify-center w-full">
              <div
                @click="openPhotoModal"
                class="relative bg-gray-200 w-40 h-40 rounded-full overflow-hidden mx-auto flex items-center justify-center"
              >
                <img
                  class="object-cover w-full h-full"
                  :src="user?.photo || '/default-avatar.png'"
                  alt="Profile Photo"
                />

                <!-- Button overlay -->
                <div
                  class="absolute inset-0 flex items-end justify-center bg-black/30 opacity-0 hover:opacity-100 transition-opacity"
                >
                  <button type="button" class="btn-2 px-3 py-1 text-sm rounded-md mb-2">
                    Change
                  </button>
                </div>
              </div>
            </div>

            <p class="title-md">Personal Info</p>
            <hr class="my-2" />
            <div class="grid md:grid-cols-2 gap-4">
              <div>
                <label>Name</label>
                <input v-model="form.name" type="text" class="w-full p-2 border rounded" required />
              </div>

              <div>
                <label>Phone</label>
                <input
                  v-model="form.phone"
                  type="text"
                  class="w-full p-2 border rounded"
                  required
                />
              </div>

              <div>
                <label>Email</label>
                <input v-model="form.email" type="email" class="w-full p-2 border rounded" />
              </div>

              <div class="space-y-2">
                <label for="bloodGroup" class="text-gray-700 flex items-center gap-2">
                  Blood Group
                </label>
                <select
                  id="bloodGroup"
                  v-model="form.blood"
                  class="py-2 px-4 border rounded w-full"
                >
                  <option disabled value="">Select blood group</option>
                  <option v-for="group in bloodGroups" :key="group" :value="group">
                    {{ group }}
                  </option>
                </select>
              </div>
              <div>
                <label>NID</label>
                <input v-model="form.nid" type="text" class="w-full p-2 border rounded" />
              </div>

              <div>
                <label>Date of Birth</label>
                <input v-model="form.date_of_birth" type="date" class="w-full p-2 border rounded" />
              </div>
              <div>
                <label>Address</label>
                <textarea
                  v-model="form.address"
                  rows="2"
                  class="w-full p-2 border rounded"
                ></textarea>
              </div>
            </div>
          </div>
        </div>

        <div class="flex justify-center gap-4">
          <RouterLink
            :to="{ name: 'MyProfile' }"
            type="button"
            class="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
          >
            Cancel
          </RouterLink>
          <button type="submit" class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
            Save
          </button>
          <button
            type="button"
            @click="changePasswordModal = !changePasswordModal"
            class="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
          >
            Change Password
          </button>
        </div>
      </form>
    </div>
  </div>
  <ChangePasswordModal v-if="changePasswordModal" @close="CloseModal" :user="user" />
  <PhotoModal
    :imageSrc="selectedPhoto"
    :isOpen="isPhotoModalOpen"
    @close="closePhotoModal"
    @fileSelected="handleFileSelected"
    @uploadPhoto="uploadPhoto"
  />
</template>
