<script setup>
import { useProjectStore } from '@/stores/useProjectStore'
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'

const store = useProjectStore()
const router = useRouter()

onMounted(() => {
  store.fetchProjects()
})

const goToAdd = () => {
  router.push({ name: 'ProjectAdd' })
}

const goToEdit = (id) => {
  router.push({ name: 'ProjectEdit', params: { id } })
}
</script>

<template>
  <div class="container mx-auto p-6">
    <div class="flex justify-between items-center mb-6">
      <h2 class="text-2xl font-bold text-gray-800">Projects</h2>
      <button @click="goToAdd" class="btn-1">Add Project</button>
    </div>

    <div v-if="store.loading" class="text-center py-4 text-gray-500">Loading projects...</div>

    <div v-else-if="store.error" class="text-center py-4 text-red-500">
      {{ store.error }}
    </div>

    <table v-else class="min-w-full bg-white shadow rounded-lg overflow-hidden">
      <thead class="bg-gray-100">
        <tr>
          <th class="px-4 py-2 text-left">#</th>
          <th class="px-4 py-2 text-left">Project Name</th>
          <th class="px-4 py-2 text-left">Company</th>
          <th class="px-4 py-2 text-left">Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="(project, index) in store.projects"
          :key="project.id"
          class="border-t hover:bg-gray-50"
        >
          <td class="px-4 py-2">{{ index + 1 }}</td>
          <td class="px-4 py-2 font-medium text-gray-700">
            {{ project.name }}
          </td>
          <td class="px-4 py-2 font-medium text-gray-700">
            {{ project?.company?.name }}
          </td>
          <td class="px-4 py-2">
            <RouterLink
              :to="{ name: 'ProjectEdit', params: { id: project?.id } }"
              class="bg-indigo-500 hover:bg-indigo-600 text-white font-semibold px-3 py-1 rounded-full transition"
            >
              Edit
            </RouterLink>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
