<script setup>
import { useCompanyStore } from '@/stores/company'
import { useProjectStore } from '@/stores/useProjectStore'
import { storeToRefs } from 'pinia'
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

const store = useProjectStore()
const companyStore = useCompanyStore()
const router = useRouter()
const { companies } = storeToRefs(companyStore)
const name = ref('')
const company_id = ref('')
const loading = ref(false)

onMounted(() => {
  companyStore.fetchCompanies()
})

const submit = async () => {
  loading.value = true
  await store.createProject({ name: name.value })
  loading.value = false

  if (!store.error) {
    router.push({ name: 'ProjectList' })
  }
}
</script>

<template>
  <div class="container mx-auto p-6">
    <div class="max-w-lg mx-auto bg-white shadow-lg rounded-lg p-6">
      <h2 class="text-2xl font-semibold text-gray-800 mb-4">Add New Project</h2>

      <form @submit.prevent="submit" class="space-y-6">
        <div class="mb-4">
          <label class="block text-gray-700 font-medium mb-2">Project Name</label>
          <input
            v-model="name"
            type="text"
            required
            placeholder="Enter project name"
            class="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div class="mb-4">
          <label class="block text-gray-700 font-medium mb-2">Company</label>
          <select
            v-model="company_id"
            class="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select Company</option>
            <option v-for="company in companies" :key="company.id" :value="company.id">
              {{ company.name }}
            </option>
          </select>
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
            {{ loading ? 'Saving...' : 'Save Project' }}
          </button>

          <button
            type="button"
            @click="router.push({ name: 'ProjectList' })"
            class="bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold px-5 py-2 rounded transition"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
