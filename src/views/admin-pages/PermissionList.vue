<script setup>
import UserChip from '@/components/user/UserChip.vue'
import { useUserPermissionStore } from '@/stores/userPermissionStore'
import { storeToRefs } from 'pinia'
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const userPermissionStore = useUserPermissionStore()
const router = useRouter()

const { userPermissions: permissions } = storeToRefs(userPermissionStore)

const editPermission = (id) => {
  router.push({ name: 'PermissionEdit', params: { id } })
}
const deletePermission = (id) => {
  userPermissionStore.deletePermission(id)
}

onMounted(() => {
  userPermissionStore.fetchUserPermissions()
})

const permissionUsers = computed(() => {
  return permissions.value.reduce((users, permission) => {
    const foundUser = users.find((user) => user.id === permission.user.id)
    if (foundUser) {
      foundUser.permissions = [...foundUser.permissions, permission]
      return users
    }

    return [
      ...users,
      {
        ...permission.user,
        permissions: [permission],
      },
    ]
  }, [])
})
</script>

<template>
  <div class="space-y-2 px-4">
    <div class="flex items-center justify-between gap-2">
      <button class="btn-3" @click="goBack">
        <i class="far fa-arrow-left"></i>
        <span class="hidden md:flex">Back</span>
      </button>

      <h1 class="title-md md:title-lg flex-wrap text-center">Permissions List</h1>
      <RouterLink :to="{ name: 'PermissionsAdd' }" class="btn-2"> + Add New </RouterLink>
    </div>

    <table class="min-w-full table-auto bg-white shadow-md rounded-lg overflow-hidden">
      <thead class="bg-gray-100">
        <tr class="bg-gray-200">
          <th class="text-left p-3 border">#</th>
          <th class="text-left p-3 border">User</th>
          <th class="text-left p-3 border">Company</th>
          <th class="text-left p-3 border">Departments</th>
          <th class="text-left p-3 border">Actions</th>
        </tr>
      </thead>
      <tbody>
        <template v-for="permissionUser in permissionUsers" :key="permissionUser.id">
          <template v-for="(perm, permIndex) in permissionUser.permissions || []" :key="perm.id">
            <tr class="hover:bg-gray-50">
              <td class="p-3 border">{{ permIndex + 1 }}</td>

              <!-- Only show user name in the first row, with rowspan -->
              <td
                v-if="permIndex === 0"
                class="p-3 border align-top"
                :rowspan="permissionUser.permissions?.length || 1"
              >
                <UserChip :user="permissionUser" />
              </td>

              <td class="p-3 border">{{ perm.company?.name }}</td>

              <td class="p-3 border">
                <span v-if="perm.department_ids.includes('*')">All</span>
                <span v-else>{{ perm.departments.join(', ') }}</span>
              </td>

              <td class="p-3 border flex justify-center md:gap-4">
                <button @click="editPermission(perm.id)" class="btn-1">
                  <i class="fas fa-edit"></i>
                </button>
                <button @click="deletePermission(perm.id)" class="btn-1 text-red-600">
                  <i class="fas fa-trash"></i>
                </button>
              </td>
            </tr>
          </template>
        </template>
      </tbody>
    </table>
  </div>
</template>
