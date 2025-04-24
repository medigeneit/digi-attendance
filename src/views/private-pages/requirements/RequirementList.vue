<script setup>
import { useRequirementStore } from '@/stores/useRequirementStore'
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'

const store = useRequirementStore()
const router = useRouter()

onMounted(() => {
  store.fetchRequirements()
})

const goToAdd = () => {
  router.push({ name: 'RequirementAdd' })
}

const goToEdit = (id) => {
  router.push({ name: 'RequirementEdit', params: { id } })
}

const priorityColor = (priority) => {
  switch (priority) {
    case 'CRITICAL':
      return 'border-red-700 text-red-700 font-semibold'
    case 'HIGH':
      return 'border-red-500 text-red-500'
    case 'MEDIUM':
      return 'border-yellow-500 text-yellow-500'
    default:
      return 'border-gray-300 text-gray-500'
  }
}
</script>

<template>
  <div class="container mx-auto p-6">
    <div class="flex justify-between items-center mb-6">
      <h2 class="text-2xl font-bold text-gray-800">Requirements</h2>
      <button @click="goToAdd" class="btn-1">Add Requirement</button>
    </div>

    <div v-if="store.loading" class="text-center py-4 text-gray-500">Loading requirements...</div>

    <div v-else-if="store.error" class="text-center py-4 text-red-500">
      {{ store.error }}
    </div>

    <table v-else class="min-w-full bg-white shadow rounded-lg overflow-hidden">
      <thead class="bg-gray-100">
        <tr>
          <th class="px-4 py-2 text-left">#</th>
          <th class="px-4 py-2 text-left">Title</th>
          <th class="px-4 py-2 text-left">Department</th>
          <th class="px-4 py-2 text-left">Priority</th>
          <th class="px-4 py-2 text-left">Description</th>
          <th class="px-4 py-2 text-left">Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="req in store.requirements" :key="req.id" class="border-t hover:bg-gray-50">
          <td class="px-4 py-2">{{ req.id }}</td>
          <td class="px-4 py-2 font-medium">{{ req?.title }}</td>
          <td class="px-4 py-2">{{ req?.department?.name }}</td>
          <td class="px-4 py-2">
            <span class="text-xs px-2 py-1 rounded border" :class="priorityColor(req.priority)">
              {{ req.priority }}
            </span>
          </td>
          <td class="px-4 py-2">
            <div v-if="req?.description.length">
              <div v-html="req?.description"></div>
            </div>
            <span v-else class="text-gray-400">No description</span>
          </td>
          <td class="px-4 py-2">
            <button @click="goToEdit(req.id)" class="btn-2">Edit</button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
