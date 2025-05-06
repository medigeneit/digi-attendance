<script setup>
import MultiselectDropdown from '@/components/MultiselectDropdown.vue'
import TextEditor from '@/components/TextEditor.vue'
import { useDepartmentStore } from '@/stores/department'
import { useProjectStore } from '@/stores/useProjectStore'
import { useRequirementStore } from '@/stores/useRequirementStore'

import { storeToRefs } from 'pinia'
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
const store = useRequirementStore()
const router = useRouter()

const projectStore = useProjectStore()

const project_id = ref('')
const title = ref('')
const description = ref('')
const priority = ref('MEDIUM')
const loading = ref(false)
const departmentStore = useDepartmentStore()
const { departments } = storeToRefs(departmentStore)
const { projects } = storeToRefs(projectStore)
const selectedDepartment = ref('')
const department_id = computed(() => selectedDepartment.value?.id)

onMounted(() => {
  departmentStore.fetchDepartments()
  projectStore.fetchProjects()
})

const submit = async () => {
  loading.value = true
  await store.createRequirement({
    project_id: project_id.value,
    title: title.value,
    department_id: department_id.value,
    description: [description.value],
    priority: priority.value,
  })
  loading.value = false

  if (!store.error) {
    router.push({ name: 'RequirementList' })
  }
}
</script>

<template>
  <div class="container mx-auto p-6">
    <div class="max-w-xl mx-auto bg-white shadow-lg rounded-lg p-6">
      <h2 class="text-2xl font-semibold text-gray-800 mb-4">Add New Requirement</h2>

      <form @submit.prevent="submit">
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
          <label class="block text-gray-700 font-medium mb-2"> Requirement Title </label>
          <input
            v-model="title"
            type="text"
            required
            placeholder="Enter requirement title"
            class="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div class="mb-4">
          <label class="block text-gray-700 font-medium mb-2"> Department </label>
          <MultiselectDropdown
            v-model="selectedDepartment"
            :options="departments"
            :multiple="false"
            track-by="id"
            label="name"
            placeholder="Select department"
            required
          />
        </div>

        <div class="mb-4">
          <label class="block text-gray-700 font-medium mb-2">Priority</label>
          <select
            v-model="priority"
            class="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
          >
            <option value="LOW">LOW</option>
            <option value="MEDIUM">MEDIUM</option>
            <option value="HIGH">HIGH</option>
            <option value="CRITICAL">CRITICAL</option>
          </select>
        </div>

        <div class="mb-4">
          <label class="block text-gray-700 font-medium mb-2"> Description </label>
          <TextEditor
            v-model="description"
            placeholder="Enter requirement description"
            class="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          ></TextEditor>
        </div>

        <div v-if="store.error" class="mb-4 text-red-500 font-medium">
          {{ store.error }}
        </div>

        <div class="flex items-center gap-4">
          <button
            :disabled="loading"
            type="submit"
            class="bg-blue-500 hover:bg-blue-600 text-white font-semibold px-5 py-2 rounded transition"
          >
            {{ loading ? 'Saving...' : 'Save Requirement' }}
          </button>

          <button
            type="button"
            @click="router.push({ name: 'RequirementList' })"
            class="bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold px-5 py-2 rounded transition"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
