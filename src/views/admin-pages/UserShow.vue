<script setup>
import LoaderView from '@/components/common/LoaderView.vue'
import { useUserStore } from '@/stores/user'
import dayjs from 'dayjs'
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useToast } from 'vue-toastification'

const userStore = useUserStore()
const toast = useToast()
const route = useRoute()

const user = ref(null)
const isLoading = ref(true)
const error = ref(null)

const formatDate = (date) => {
  return date ? new Date(date).toLocaleDateString('en-GB') : 'N/A'
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

const formattedMonth = computed(() => {
  const rawDate = user.value?.assign_weekend?.start_month
  return rawDate ? dayjs(rawDate).format('YYYY-MM') : ''
})

onMounted(async () => {
  await fetchUser()
})
</script>

<template>
  <div class="my-container space-y-6">
    <div class="card-bg p-6">
      <h2 class="title-lg text-center">User Details</h2>
      <LoaderView v-if="isLoading" class="shadow-none" />
      <div v-else-if="error" class="text-center text-red-500">
        <p>{{ error }}</p>
      </div>
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
              <p class="text-sm font-bold text-gray-600">Address:</p>
              <p class="text-lg text-gray-800">{{ user?.address || 'N/A' }}</p>
            </div>
            <div>
              <p class="text-sm font-bold text-gray-600">NID:</p>
              <p class="text-lg text-gray-800">{{ user?.nid || 'N/A' }}</p>
            </div>
            <div>
              <p class="text-sm font-bold text-gray-600">Date of Birth:</p>
              <p class="text-lg text-gray-800">{{ formatDate(user?.date_of_birth) }}</p>
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
              <p class="text-sm font-bold text-gray-600">Shift:</p>
              <p class="text-lg text-gray-800">{{ user?.current_shift?.shift?.name || 'N/A' }}</p>
            </div>
            <div>
              <p class="text-sm font-bold text-gray-600">Joining Date:</p>
              <p class="text-lg text-gray-800">{{ formatDate(user?.joining_date) }}</p>
            </div>
            <div>
              <p class="text-sm font-bold text-gray-600">Weekends:</p>
              <!-- <p class="text-lg text-gray-800">{{ user?.weekends.join(', ') }}</p> -->
              <p class="text-lg text-gray-800">{{ user?.assign_weekend?.weekends.join(', ') }}</p>
              <p class="text-sm text-gray-800">Start Month : {{ formattedMonth }}</p>
            </div>
            <div>
              <p class="text-sm font-bold text-gray-600">Leave Approval Group:</p>
              <p class="text-lg text-gray-800">{{ user?.leave_approval.name }}</p>
            </div>
            <div>
              <p class="text-sm font-bold text-gray-600">Other Approval Group:</p>
              <p class="text-lg text-gray-800">{{ user?.other_approval.name }}</p>
            </div>
            <div>
              <p class="text-sm font-bold text-gray-600">Employment Type:</p>
              <p class="text-lg text-gray-800">{{ user?.employment_type }}</p>
            </div>
            <div>
              <p class="text-sm font-bold text-gray-600">Status:</p>
              <p class="text-lg text-gray-800">{{ user?.is_active ? 'Active' : 'Inactive' }}</p>
            </div>
          </div>
        </div>
        <div class="bg-gray-100 p-4 rounded-lg">
          <p class="title-md">Technical Info</p>
          <hr class="mb-2" />
          <div class="grid md:grid-cols-2 gap-4">
            <div>
              <p class="text-sm font-bold text-gray-600">Role:</p>
              <p class="text-lg text-gray-800">{{ user?.role }}</p>
            </div>
            <div>
              <p class="text-sm font-bold text-gray-600">Biometric Device ID:</p>
              <p class="text-lg text-gray-800">{{ user?.device_user_id }}</p>
            </div>
          </div>
        </div>
        <div class="flex justify-center mt-8 gap-4">
          <RouterLink
            :to="{ name: 'UserList', query: { company: route.query.company } }"
            type="button"
            class="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
          >
            Back to List
          </RouterLink>
          <RouterLink
            :to="{ name: 'UserEdit', params: { id: user?.id } }"
            class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Edit
          </RouterLink>
        </div>
      </div>
    </div>
  </div>
</template>
