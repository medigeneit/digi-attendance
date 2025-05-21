<script setup>
import LoaderView from '@/components/common/LoaderView.vue'
import { useAuthStore } from '@/stores/auth'
import { computed, ref } from 'vue'

const authStore = useAuthStore()
const isLoading = ref(false)

// লগইন করা ইউজারের তথ্য
const user = computed(() => authStore.user)

// ফরম্যাট করা তারিখের জন্য হেল্পার ফাংশন
const formatDate = (date) => {
  return date ? new Date(date).toLocaleDateString('en-GB') : 'N/A'
}
</script>

<template>
  <div class="my-container space-y-6">
    <div class="card-bg p-6">
      <div class="flex justify-between">
        <div></div>

        <h2 class="title-lg text-center">My Profile</h2>

        <RouterLink to="/my-profile/edit" class="btn-2">
          <i class="far fa-edit"></i> Edit
        </RouterLink>
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
      </div>
    </div>
  </div>
</template>
