<script setup>
import { onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import LoaderView from '@/components/common/LoaderView.vue'

const router = useRouter()
const userStore = useUserStore()

onMounted(() => {
  userStore.fetchUsers()
})

const goBack = () => {
  router.go(-1)
}

const groupedUsers = computed(() => {
  const grouped = {}
  userStore.users.forEach((user) => {
    const companyName = user.company?.name || 'Unknown Company'
    if (!grouped[companyName]) {
      grouped[companyName] = []
    }
    grouped[companyName].push(user)
  })
  return grouped
})
</script>

<template>
  <div class="space-y-2 px-4">
    <div class="flex items-center justify-between gap-2">
      <button class="btn-3" @click="goBack">
        <i class="far fa-arrow-left"></i>
        <span class="hidden md:flex">Back</span>
      </button>

      <h1 class="title-md md:title-lg flex-wrap text-center">Employee List</h1>

      <RouterLink :to="{ name: 'UserAdd' }" class="btn-2">
        <span class="hidden md:flex">Add New</span>
        <i class="far fa-plus"></i>
      </RouterLink>
    </div>

    <div v-if="userStore.isLoading" class="text-center py-4">
      <LoaderView />
    </div>

    <div v-else class="space-y-4">
      <div v-for="(users, companyName) in groupedUsers" :key="companyName">
        <h2 class="title-md">{{ companyName }}</h2>
        <div class="overflow-x-auto">
          <table class="min-w-full table-auto bg-white shadow-md rounded-lg overflow-hidden">
            <thead>
              <tr class="bg-gray-200">
                <th class="border border-gray-300 px-2 text-left">#</th>
                <th class="border border-gray-300 px-2 text-left">Name</th>
                <th class="border border-gray-300 px-2 text-left">Designation</th>
                <th class="border border-gray-300 px-2 text-left">Role</th>
                <th class="border border-gray-300 px-2 text-left">Device ID</th>
                <th class="border border-gray-300 px-2 text-left">Phone</th>
                <th class="border border-gray-300 px-2 text-left">Email</th>
                <th class="border border-gray-300 px-2 text-left">Status</th>
                <th class="border border-gray-300 px-2 text-left">Action</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(user, index) in users"
                :key="user.id"
                class="border-b border-gray-200 hover:bg-gray-100"
              >
                <td class="border border-gray-300 px-2">{{ index + 1 }}</td>
                <td class="border border-gray-300 px-2">{{ user.name }}</td>
                <td class="border border-gray-300 px-2">{{ user.designation.title }}</td>
                <td class="border border-gray-300 px-2">{{ user.role }}</td>
                <td class="border border-gray-300 px-2">{{ user.device_user_id || 'নেই' }}</td>
                <td class="border border-gray-300 px-2">{{ user.phone }}</td>
                <td class="border border-gray-300 px-2">{{ user.email || 'নেই' }}</td>
                <td class="border border-gray-300 px-2">
                  <span v-if="user.is_active" class="text-green-500">Active</span>
                  <span v-else class="text-red-500">Inactive</span>
                </td>
                <td class="border border-gray-300 px-2">
                  <div class="flex gap-2">
                    <RouterLink
                      :to="{ name: 'UserShow', params: { id: user.id } }"
                      class="btn-icon"
                    >
                      <i class="far fa-eye"></i>
                    </RouterLink>
                    <RouterLink
                      :to="{ name: 'UserEdit', params: { id: user.id } }"
                      class="btn-icon"
                    >
                      <i class="far fa-edit"></i>
                    </RouterLink>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>
