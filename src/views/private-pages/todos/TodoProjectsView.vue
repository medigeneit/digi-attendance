<script setup>
import LoaderView from '@/components/common/LoaderView.vue'
import { useTodoProjectStore } from '@/stores/useTodoProjectStore'
import { onMounted, ref } from 'vue'

const store = useTodoProjectStore()
const isEditing = ref(false)
const editId = ref(null)
const formTitle = ref('')

onMounted(() => {
  store.fetchProjects()
})

const startEdit = (project) => {
  isEditing.value = true
  editId.value = project.id
  formTitle.value = project.title
}

const cancelEdit = () => {
  isEditing.value = false
  editId.value = null
  formTitle.value = ''
  store.error = null
}

const saveProject = async () => {
  if (!formTitle.value.trim()) return

  try {
    if (isEditing.value) {
      await store.updateProject(editId.value, { title: formTitle.value })
    } else {
      await store.createProject({ title: formTitle.value })
    }
    cancelEdit()
  } catch (e) {
    // handled in store
  }
}

const deleteProject = async (id) => {
  if (confirm('Are you sure you want to delete this project?')) {
    await store.deleteProject(id)
  }
}
</script>

<template>
  <div class="p-6 max-w-4xl mx-auto">
    <h1 class="text-2xl font-bold mb-4">Manage Todo Projects</h1>

    <div v-if="store.error" class="mb-4 text-red-600 bg-red-100 p-3 rounded">
      {{ store.error }}
    </div>

    <div class="mb-6 flex gap-2 items-center bg-white p-4 rounded shadow-sm border">
      <input
        v-model="formTitle"
        class="border px-4 py-2 rounded flex-grow focus:outline-blue-500"
        placeholder="Enter Project Title"
        @keyup.enter="saveProject"
      />
      <button
        @click="saveProject"
        class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        :disabled="store.loading || !formTitle.trim()"
      >
        {{ isEditing ? 'Update' : 'Create' }}
      </button>
      <button
        v-if="isEditing"
        @click="cancelEdit"
        class="bg-gray-300 px-4 py-2 rounded hover:bg-gray-400"
      >
        Cancel
      </button>
    </div>

    <div class="relative min-h-[100px]">
      <LoaderView
        v-if="store.loading"
        class="absolute inset-0 bg-white/50 flex items-center justify-center z-10"
      />

      <div class="bg-white rounded shadow overflow-hidden border">
        <table class="w-full text-left">
          <thead>
            <tr class="border-b bg-gray-50 text-gray-700 uppercase text-xs font-semibold">
              <th class="px-6 py-3">Title</th>
              <th class="px-6 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y">
            <tr v-for="p in store.projects" :key="p.id" class="hover:bg-gray-50 transition-colors">
              <td class="px-6 py-3">{{ p.title }}</td>
              <td class="px-6 py-3 text-right space-x-2">
                <button
                  @click="startEdit(p)"
                  class="text-blue-600 hover:text-blue-800 font-medium text-sm"
                >
                  Edit
                </button>
                <button
                  @click="deleteProject(p.id)"
                  class="text-red-600 hover:text-red-800 font-medium text-sm"
                >
                  Delete
                </button>
              </td>
            </tr>
            <tr v-if="store.projects.length === 0 && !store.loading">
              <td colspan="2" class="px-6 py-8 text-center text-gray-500">
                No projects found. Create one above!
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
