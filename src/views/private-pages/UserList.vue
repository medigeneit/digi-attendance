<script setup>
import { ref, computed, onMounted } from 'vue'
import { useUserStore } from '@/stores/user'
import { useAuthStore } from '@/stores/auth'
import EditUserModal from '@/components/user/EditUserModal.vue'
import AddUserModal from '@/components/user/AddUserModal.vue'

const userStore = useUserStore()
const authStore = useAuthStore()

const showAddModal = ref(false)
const showEditModal = ref(false)
const selectedUser = ref(null)
const loading = ref(true)
const syncing = ref(false) // নতুন লোডার স্টেট

onMounted(async () => {
  await userStore.fetchUsers()
  loading.value = false
})

// Add Modal
const openAddModal = () => {
  showAddModal.value = true
}
const closeAddModal = () => {
  showAddModal.value = false
}

// Edit Modal
const editUser = (user) => {
  selectedUser.value = user
  showEditModal.value = true
}
const closeEditModal = () => {
  showEditModal.value = false
  selectedUser.value = null
}

// Sync Users
const syncUsers = async () => {
  syncing.value = true
  await userStore.syncUsers() // Pinia Store থেকে অ্যাকশন কল
  syncing.value = false
}

// Filter Users
const filteredUsers = computed(() => {
  if (authStore.user && authStore.user.role === 'developer') {
    return userStore.users
  }
  return userStore.users.filter((user) => user.role !== 'developer')
})
</script>

<template>
  <div class="px-4 space-y-2">
    <div class="flex items-center justify-between">
      <h1 class="title-lg">ইউজার তালিকা</h1>
      <div class="flex gap-2">
        <button class="btn-2" @click="openAddModal">Add New</button>
        <button class="btn-1 flex items-center" @click="syncUsers" :disabled="syncing">
          <span v-if="!syncing">Sync Users</span>
          <span v-else>
            <svg
              class="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
              fill="none"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle
                class="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                stroke-width="4"
              ></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
            </svg>
            Syncing...
          </span>
        </button>
      </div>
    </div>

    <!-- স্পিন লোডার -->
    <div v-if="loading" class="flex items-center justify-center py-10">
      <div
        class="loader ease-linear rounded-full border-4 border-t-4 border-gray-200 h-12 w-12"
      ></div>
    </div>

    <!-- ইউজার তালিকা -->
    <div v-else>
      <table
        class="min-w-full table-auto border-collapse border border-gray-200 bg-white rounded-md"
      >
        <thead>
          <tr class="bg-gray-200">
            <th class="border border-gray-300 px-4 py-2 text-left">#</th>
            <th class="border border-gray-300 px-4 py-2 text-left">নাম</th>
            <th class="border border-gray-300 px-4 py-2 text-left">রোল</th>
            <th class="border border-gray-300 px-4 py-2 text-left">মেশিন আইডি</th>
            <th class="border border-gray-300 px-4 py-2 text-left">ফোন</th>
            <th class="border border-gray-300 px-4 py-2 text-left">ইমেইল</th>
            <th class="border border-gray-300 px-4 py-2 text-left">স্ট্যাটাস</th>
            <th class="border border-gray-300 px-4 py-2 text-left">অ্যাকশন</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(user, index) in filteredUsers" :key="user.id">
            <td class="border border-gray-300 px-4 py-2">{{ index + 1 }}</td>
            <td class="border border-gray-300 px-4 py-2">{{ user.name }}</td>
            <td class="border border-gray-300 px-4 py-2">{{ user.role }}</td>
            <td class="border border-gray-300 px-4 py-2">{{ user.user_id || 'নেই' }}</td>
            <td class="border border-gray-300 px-4 py-2">{{ user.phone }}</td>
            <td class="border border-gray-300 px-4 py-2">{{ user.email || 'নেই' }}</td>
            <td class="border border-gray-300 px-4 py-2">
              <span v-if="user.is_active" class="text-green-500">Active</span>
              <span v-else class="text-red-500">Inactive</span>
            </td>
            <td class="border border-gray-300 px-4 py-2">
              <button class="btn-1" @click="editUser(user)">Edit</button>
            </td>
          </tr>
          <tr v-if="filteredUsers.length === 0">
            <td colspan="9" class="border border-gray-300 px-4 py-2 text-center text-gray-500">
              No users found.
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <AddUserModal v-if="showAddModal" @close="closeAddModal" class="z-50" />
    <EditUserModal v-if="showEditModal" :user="selectedUser" @close="closeEditModal" class="z-50" />
  </div>
</template>

<style>
/* টেইলউইন্ড স্পিন লোডারের স্টাইল */
.loader {
  border-top-color: #3490dc;
  animation: spin 1s ease-in-out infinite;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}
</style>
