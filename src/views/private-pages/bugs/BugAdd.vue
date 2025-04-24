<script setup>
import { useBugStore } from '@/stores/useBugStore'
import { useProjectStore } from '@/stores/useProjectStore'
import { storeToRefs } from 'pinia'
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
const storeProject = useProjectStore()
const store = useBugStore()
const router = useRouter()
const title = ref('')
const project_id = ref('')
const status = ref('OPEN')
const description = ref('')
const loading = ref(false)
const { projects } = storeToRefs(storeProject)

onMounted(() => {
  storeProject.fetchProjects()
})

const submit = async () => {
  loading.value = true
  await store.createBug({
    project_id: project_id.value,
    title: title.value,
    status: status.value,
    description: description.value,
  })
  loading.value = false

  if (!store.error) {
    router.push({ name: 'BugList' })
  }
}
</script>

<template>
  <div class="container mx-auto p-6">
    <div class="max-w-xl mx-auto bg-white shadow-lg rounded-lg p-6">
      <h2 class="text-2xl font-semibold text-gray-800 mb-4">Add New Bug</h2>

      <form @submit.prevent="submit" class="space-y-6">
        <div class="mb-4">
          <label class="block text-gray-700 font-medium mb-2">Project</label>
          <select
            v-model="project_id"
            class="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select Project</option>
            <option v-for="project in projects" :key="project.id" :value="project.id">
              {{ project.name }}
            </option>
          </select>
        </div>
        <div class="mb-4">
          <label class="block text-gray-700 font-medium mb-2">Bug Title</label>
          <input
            v-model="title"
            required
            placeholder="Enter bug title"
            class="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-red-500"
          />
        </div>

    

        <div>
          <label class="block text-gray-700 font-medium mb-2">Status</label>
          <select
            v-model="status"
            class="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
          >
            <option value="OPEN">OPEN</option>
            <option value="SOLVED">SOLVED</option>
            <option value="CLOSED">CLOSED</option>
          </select>
        </div>

        <div class="mb-4">
          <label class="block text-gray-700 font-medium mb-2">Description (Optional)</label>
          <textarea
            v-model="description"
            rows="4"
            placeholder="Enter bug description"
            class="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-red-500"
          ></textarea>
        </div>

        <div v-if="store.error" class="mb-4 text-red-500 font-medium">
          {{ store.error }}
        </div>

        <div class="flex items-center gap-4">
          <button
            :disabled="loading"
            type="submit"
            class="bg-red-500 hover:bg-red-600 text-white font-semibold px-5 py-2 rounded transition"
          >
            {{ loading ? 'Saving...' : 'Save Bug' }}
          </button>

          <button
            type="button"
            @click="router.push({ name: 'BugList' })"
            class="bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold px-5 py-2 rounded transition"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
