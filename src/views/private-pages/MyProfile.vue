<script setup>
import LoaderView from '@/components/common/LoaderView.vue'
import ChangePasswordModal from '@/components/user/ChangePasswordModal.vue'
import { useAuthStore } from '@/stores/auth'
import { computed, ref } from 'vue'

const authStore = useAuthStore()
const isLoading = ref(false)
const changePasswordModal = ref(false)

// লগইন করা ইউজারের তথ্য
const user = computed(() => authStore.user)

// ফরম্যাট করা তারিখের জন্য হেল্পার ফাংশন
const formatDate = (date) => {
  return date ? new Date(date).toLocaleDateString('en-GB') : 'N/A'
}
</script>

<template>
  <ChangePasswordModal
    v-if="changePasswordModal"
    @close="
      () => {
        changePasswordModal = false
      }
    "
    :user="user"
  />
  <div class="my-container space-y-6">
    <div class="card-bg p-6">
      <div class="flex justify-between gap-4">
        <h2 class="title-lg text-center">Profile</h2>
        <button
          type="button"
          @click="changePasswordModal = !changePasswordModal"
          class="ml-auto bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
        >
          Change Password
        </button>
        <RouterLink to="/profile/edit" class="btn-2"> <i class="far fa-edit"></i> Edit </RouterLink>
      </div>
      <LoaderView v-if="isLoading" class="shadow-none" />
      <div v-else class="grid gap-2">
        <div class="bg-gray-100 p-4 rounded-lg">
          <p class="title-md">Personal Info</p>
          <hr class="mb-2" />
          <div class="grid md:grid-cols-2 gap-4">
            <div>
              <p class="text-sm font-bold text-gray-600">Name:</p>
              <p class="text-lg text-gray-800">{{ user?.name }}</p>
            </div>
            <div>
              <p class="text-sm font-bold text-gray-600">Phone:</p>
              <p class="text-lg text-gray-800">{{ user?.phone }}</p>
            </div>
            <div>
              <p class="text-sm font-bold text-gray-600">Email:</p>
              <p class="text-lg text-gray-800">{{ user?.email || 'N/A' }}</p>
            </div>
            <div>
              <p class="text-sm font-bold text-gray-600">Blood Group:</p>
              <p class="text-lg text-gray-800">{{ user?.blood || 'N/A' }}</p>
            </div>
            <div>
              <p class="text-sm font-bold text-gray-600">Address:</p>
              <p class="text-lg text-gray-800">{{ user?.address || 'N/A' }}</p>
            </div>
            <div>
              <p class="text-sm font-bold text-gray-600">Employee ID:</p>
              <p class="text-lg text-gray-800">{{ user?.employee_id || 'N/A' }}</p>
            </div>
          </div>
        </div>
        <div class="bg-gray-100 p-4 rounded-lg">
          <p class="title-md">Professional Info</p>
          <hr class="mb-2" />
          <div class="grid md:grid-cols-2 gap-4">
            <div>
              <p class="text-sm font-bold text-gray-600">Company:</p>
              <p class="text-lg text-gray-800">{{ user?.company?.name || 'N/A' }}</p>
            </div>
            <div>
              <p class="text-sm font-bold text-gray-600">Department:</p>
              <p class="text-lg text-gray-800">{{ user?.department?.name || 'N/A' }}</p>
            </div>
            <div>
              <p class="text-sm font-bold text-gray-600">Designation:</p>
              <p class="text-lg text-gray-800">{{ user?.designation?.title || 'N/A' }}</p>
            </div>
            <div>
              <p class="text-sm font-bold text-gray-600">Joining Date:</p>
              <p class="text-lg text-gray-800">{{ formatDate(user?.joining_date) }}</p>
            </div>
          </div>
        </div>
        <div class="flex mt-4 gap-4">
          <RouterLink
            to="/tasks"
            class="flex items-center gap-2 hover:bg-sky-500 hover:text-white border border-sky-400 text-sky-600 px-4 rounded-lg"
            v-if="authStore.isAdminMood"
          >
            <i class="fas fa-tasks py-2"></i>
            <h4>Task Management</h4>
          </RouterLink>
          <RouterLink
            to="/my-tasks"
            class="flex items-center gap-2 hover:bg-sky-500 hover:text-white border border-sky-400 text-sky-600 px-4 rounded-lg"
          >
            <i class="fas fa-tasks py-2"></i>
            <h4>My Task List</h4>
          </RouterLink>
        </div>
      </div>
    </div>
  </div>
</template>
