<script setup>
import { useUserPermissionStore } from '@/stores/userPermissionStore'
import { storeToRefs } from 'pinia'
import { onMounted } from 'vue'
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
</script>

<template>
  <div class="p-6 max-w-5xl mx-auto">
    <div class="flex justify-between items-center mb-6">
      <h2 class="text-2xl font-semibold">Permissions List</h2>
      <RouterLink
        :to="{ name: 'PermissionsAdd' }"
        class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
      >
        + Add New
      </RouterLink>
    </div>

    <table class="w-full table-auto border">
      <thead class="bg-gray-100">
        <tr>
          <th class="text-left p-3 border">Company</th>
          <th class="text-left p-3 border">Departments</th>
          <th class="text-left p-3 border">Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="perm in permissions" :key="perm.id" class="hover:bg-gray-50">
          <td class="p-3 border">{{ perm.company.name }}</td>
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
      </tbody>
    </table>
  </div>
</template>
