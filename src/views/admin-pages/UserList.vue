<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import LoaderView from '@/components/common/LoaderView.vue'

const router = useRouter()

const userStore = useUserStore()

const users = userStore.users

const loading = ref(true)

onMounted(async () => {
  await userStore.fetchUsers()
  loading.value = false
})

const goBack = () => {
  router.go(-1)
}
</script>

<template>
  <div class="my-container space-y-2">
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

    <div>
      <table
        class="min-w-full table-auto border-collapse border border-gray-200 bg-white rounded-md"
      >
        <thead>
          <tr class="bg-gray-200">
            <th class="border border-gray-300 px-4 py-2 text-left">#</th>
            <th class="border border-gray-300 px-4 py-2 text-left">Name</th>
            <th class="border border-gray-300 px-4 py-2 text-left">Role</th>
            <th class="border border-gray-300 px-4 py-2 text-left">Device ID</th>
            <th class="border border-gray-300 px-4 py-2 text-left">Phone</th>
            <th class="border border-gray-300 px-4 py-2 text-left">Email</th>
            <th class="border border-gray-300 px-4 py-2 text-left">Status</th>
            <th class="border border-gray-300 px-4 py-2 text-left">Action</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="9" class="border border-gray-300 px-4 py-2 text-center">
              <LoaderView class="shadow-none" />
            </td>
          </tr>
          <template v-else-if="users && users.length">
            <tr v-for="(user, index) in users" :key="user?.id">
              <td class="border border-gray-300 px-4 py-2">{{ index + 1 }}</td>
              <td class="border border-gray-300 px-4 py-2">{{ user?.name }}</td>
              <td class="border border-gray-300 px-4 py-2">{{ user?.role }}</td>
              <td class="border border-gray-300 px-4 py-2">{{ user?.device_user_id || 'নেই' }}</td>
              <td class="border border-gray-300 px-4 py-2">{{ user?.phone }}</td>
              <td class="border border-gray-300 px-4 py-2">{{ user?.email || 'নেই' }}</td>
              <td class="border border-gray-300 px-4 py-2">
                <span v-if="user?.is_active" class="text-green-500">Active</span>
                <span v-else class="text-red-500">Inactive</span>
              </td>
              <td class="border border-gray-300 px-4 py-2">
                <div class="flex gap-2">
                  <RouterLink :to="{ name: 'UserShow', params: { id: user?.id } }" class="btn-icon">
                    <i class="far fa-eye"></i>
                  </RouterLink>
                  <RouterLink :to="{ name: 'UserEdit', params: { id: user?.id } }" class="btn-icon">
                    <i class="far fa-edit"></i>
                  </RouterLink>
                </div>
              </td>
            </tr>
          </template>
          <tr v-else>
            <td colspan="9" class="border border-gray-300 px-4 py-2 text-center text-gray-500">
              No users found.
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
