<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { useToast } from 'vue-toastification'

const userStore = useUserStore()
const toast = useToast()
const route = useRoute()

const user = ref(null)
const isLoading = ref(true)
const error = ref(null)

const formatDate = (date) => {
  return date ? new Date(date).toLocaleDateString() : 'N/A'
}

const fetchUser = async () => {
  try {
    isLoading.value = true
    error.value = null
    const userId = route.params.id
    user.value = await userStore.fetchUser(userId)
  } catch (err) {
    error.value = err.response?.data?.message || 'Failed to load user details'
    toast.error(error.value)
  } finally {
    isLoading.value = false
  }
}

onMounted(async () => {
  await fetchUser()
})
</script>

<template>
  <div class="my-container space-y-4">

    <div v-if="isLoading" class="flex justify-center items-center h-64">
      <p>Loading user details...</p>
    </div>

    <div v-else-if="error" class="text-center text-red-500">
      <p>{{ error }}</p>
    </div>

    <div v-else class="card-bg p-8">
      <h2 class="title-lg text-center mb-4">User Details</h2>

      <div class="grid gap-4">
        <div class="grid md:grid-cols-2 gap-4">
          <div>
            <p class="font-bold">Name:</p>
            <p>{{ user?.name }}</p>
          </div>
          <div>
            <p class="font-bold">Phone:</p>
            <p>{{ user?.phone }}</p>
          </div>
          <div>
            <p class="font-bold">Email:</p>
            <p>{{ user?.email || 'N/A' }}</p>
          </div>
          <div>
            <p class="font-bold">Address:</p>
            <p>{{ user?.address || 'N/A' }}</p>
          </div>
          <div>
            <p class="font-bold">NID:</p>
            <p>{{ user?.nid || 'N/A' }}</p>
          </div>
          <div>
            <p class="font-bold">Date of Birth:</p>
            <p>{{ formatDate(user?.date_of_birth) }}</p>
          </div>
        </div>

        <div class="grid md:grid-cols-2 gap-4">
          <div>
            <p class="font-bold">Company:</p>
            <p>{{ user?.company?.name || 'N/A' }}</p>
          </div>
          <div>
            <p class="font-bold">Department:</p>
            <p>{{ user?.department?.name || 'N/A' }}</p>
          </div>
          <div>
            <p class="font-bold">Designation:</p>
            <p>{{ user?.designation?.title || 'N/A' }}</p>
          </div>
          <div>
            <p class="font-bold">Shift:</p>
            <p>{{ user?.shift?.name || 'N/A' }}</p>
          </div>
          <div>
            <p class="font-bold">Joining Date:</p>
            <p>{{ formatDate(user?.joining_date) }}</p>
          </div>
          <div>
            <p class="font-bold">Employment Type:</p>
            <p>{{ user?.employment_type }}</p>
          </div>
        </div>

        <div>
          <p class="font-bold">Role:</p>
          <p>{{ user?.role }}</p>
        </div>
        <div>
          <p class="font-bold">Status:</p>
          <p>{{ user?.is_active ? 'Active' : 'Inactive' }}</p>
        </div>
      </div>

      <div class="flex justify-center mt-6">
        <RouterLink
          :to="{ name: 'UserEdit', params: { id: user?.id } }"
          class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Edit
        </RouterLink>
      </div>
    </div>
  </div>
</template>
